"""
Preflight Graph
Tests environment connectivity, token validity, and GraphQL access.
Must pass before any Sitecore operations.

Graph:
    load_config → check_connectivity → validate_token → test_graphql → report
                       ↓ (fail)              ↓ (fail)         ↓ (fail)
                     report_fail           report_fail       report_fail
"""

import json
from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages
from langchain_core.messages import HumanMessage

from nodes.skill_loader import load_skills_for_workflow, PROJECT_ROOT
from nodes.generator import generate_with_prompt
from nodes.shell_executor import check_connectivity, check_connectivity_via_traefik, get_traefik_ip, run_command
from nodes.website_tracker import start_workflow, complete_step, complete_workflow, fail_step


class PreflightState(TypedDict):
    website_name: str
    skill_context: str
    env_config: dict
    learned_patterns: list[str]
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict

    # Preflight-specific
    cm_host: str
    api_url: str
    api_key: str
    token: str
    connectivity_ok: bool
    token_valid: bool
    graphql_ok: bool
    preflight_passed: bool


def load_config(state: PreflightState) -> dict:
    """Load environment config and skill context."""
    # Load skills
    skill_state = {"workflow_name": "preflight", "current_step": ""}
    skill_result = load_skills_for_workflow(skill_state)

    # Extract connection details from env config
    env_config = skill_result.get("env_config", {})
    active_env = env_config.get("activeEnvironment", "local-docker")
    env = env_config.get("environments", {}).get(active_env, {})

    cm_host = env.get("cmHost", "")
    api_url = env.get("authoringApi", "")
    api_key = env.get("apiKey", "")

    # Try to read token from .sitecore/user.json — search multiple known locations
    token = ""
    token_candidates = [
        PROJECT_ROOT.parent / "xmcloud" / ".sitecore" / "user.json",
        PROJECT_ROOT.parent / ".sitecore" / "user.json",
        PROJECT_ROOT / ".sitecore" / "user.json",
        Path.home() / ".sitecore" / "user.json",
    ]
    # Also try tokenSource from config if specified
    token_source = env.get("tokenSource", "")
    if token_source:
        token_candidates.insert(0, PROJECT_ROOT.parent / token_source)

    for token_path in token_candidates:
        if token_path.exists():
            try:
                with open(token_path, "r") as f:
                    user_data = json.load(f)
                # Try common endpoint key names (xmCloud, xmcloud, default)
                for key in ["xmCloud", "xmcloud", "xmc", "default"]:
                    t = user_data.get("endpoints", {}).get(key, {}).get("accessToken", "")
                    if t:
                        token = t
                        break
                if not token:
                    # Try any endpoint with a token
                    for ep in user_data.get("endpoints", {}).values():
                        if isinstance(ep, dict) and ep.get("accessToken"):
                            token = ep["accessToken"]
                            break
                if token:
                    break
            except Exception:
                continue

    return {
        "skill_context": skill_result["skill_context"],
        "env_config": env_config,
        "learned_patterns": skill_result.get("learned_patterns", []),
        "cm_host": cm_host,
        "api_url": api_url,
        "api_key": api_key,
        "token": token,
        "current_step": "config-loaded",
        "step_outputs": {"load_config": f"CM: {cm_host}, API: {api_url}"},
    }


def check_cm_connectivity(state: PreflightState) -> dict:
    """Check if the CM host is reachable. For local Docker, checks IIS is stopped first."""
    cm_host = state.get("cm_host", "")
    if not cm_host:
        return {
            "connectivity_ok": False,
            "current_step": "connectivity-failed",
            "step_outputs": {**state.get("step_outputs", {}), "connectivity": "No CM host configured"},
        }

    # For local Docker: check IIS is stopped (it blocks port 443)
    if "localhost" in cm_host:
        iis_check = run_command('powershell -Command "(Get-Service W3SVC -ErrorAction SilentlyContinue).Status"', timeout=5)
        iis_status = iis_check.get("stdout", "").strip()
        if iis_status == "Running":
            print("  WARNING: IIS is running — it blocks port 443. Attempting to stop...")
            run_command('powershell -Command "Stop-Service W3SVC,WAS -Force -ErrorAction SilentlyContinue"', timeout=10)
            print("  IIS stopped.")

        # Check Docker is running
        docker_check = run_command("docker ps --format '{{.Names}}' 2>&1 | head -5", timeout=10)
        if not docker_check["success"] or "error" in docker_check.get("stderr", "").lower():
            return {
                "connectivity_ok": False,
                "current_step": "connectivity-failed",
                "step_outputs": {**state.get("step_outputs", {}), "connectivity": "Docker Desktop is not running. Start it first."},
            }

    # Try direct connection first
    valid_codes = ["200", "302", "401", "403"]
    result = check_connectivity(cm_host)
    ok = result["stdout"].strip() in valid_codes

    # Windows 11 HNS bug workaround: if localhost fails, try via Traefik IP directly
    if not ok and "localhost" in cm_host:
        print("  Direct connection failed. Trying via Traefik IP (HNS workaround)...")
        result = check_connectivity_via_traefik("xmcloudcm.localhost")
        ok = result["stdout"].strip() in valid_codes
        if ok:
            traefik_ip = get_traefik_ip()
            print(f"  Connected via Traefik IP: {traefik_ip}")

    return {
        "connectivity_ok": ok,
        "current_step": "connectivity-checked",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "connectivity": f"HTTP {result['stdout'].strip()}" if ok else f"FAILED: {result.get('stderr', 'timeout')}",
        },
    }


def validate_token(state: PreflightState) -> dict:
    """Validate the auth token."""
    token = state.get("token", "")
    if not token:
        return {
            "token_valid": False,
            "current_step": "token-invalid",
            "step_outputs": {**state.get("step_outputs", {}), "token": "No token found. Run: dotnet sitecore cloud login"},
        }

    # Token exists — basic validation (not expired check, just presence)
    return {
        "token_valid": True,
        "current_step": "token-validated",
        "step_outputs": {**state.get("step_outputs", {}), "token": f"Token present ({len(token)} chars)"},
    }


def test_graphql(state: PreflightState) -> dict:
    """Test GraphQL API with a simple query."""
    api_url = state.get("api_url", "")
    token = state.get("token", "")
    api_key = state.get("api_key", "")

    if not api_url or not token:
        return {
            "graphql_ok": False,
            "current_step": "graphql-failed",
            "step_outputs": {**state.get("step_outputs", {}), "graphql": "Missing API URL or token"},
        }

    # Build GraphQL test using Python urllib instead of curl (avoids Windows quoting issues)
    import urllib.request
    import ssl

    def _test_graphql(url, token_str, host_header=None):
        """Test GraphQL endpoint with Python urllib."""
        query_body = json.dumps({"query": '{ item(where: { path: "/sitecore/content" }) { itemId name } }'}).encode("utf-8")
        headers_dict = {
            "Authorization": f"Bearer {token_str}",
            "Content-Type": "application/json",
        }
        if api_key:
            headers_dict["sc_apikey"] = api_key
        if host_header:
            headers_dict["Host"] = host_header
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, data=query_body, headers=headers_dict, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
                body = resp.read().decode("utf-8")
                return body
        except Exception as e:
            return str(e)

    gql_response = _test_graphql(api_url, token)
    ok = "itemId" in gql_response

    # HNS workaround: if localhost URL fails, try via Traefik IP
    if not ok and "localhost" in api_url:
        traefik_ip = get_traefik_ip()
        if traefik_ip:
            alt_url = api_url.replace("xmcloudcm.localhost", traefik_ip)
            gql_response = _test_graphql(alt_url, token, host_header="xmcloudcm.localhost")
            ok = "itemId" in gql_response
            if ok:
                print(f"  GraphQL connected via Traefik IP: {traefik_ip}")

    return {
        "graphql_ok": ok,
        "current_step": "graphql-tested",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "graphql": "Connected successfully" if ok else f"FAILED: {gql_response[:200]}",
        },
    }


def report(state: PreflightState) -> dict:
    """Generate preflight report."""
    conn = state.get("connectivity_ok", False)
    token = state.get("token_valid", False)
    gql = state.get("graphql_ok", False)
    passed = conn and token and gql

    outputs = state.get("step_outputs", {})

    report_lines = [
        "\n========== PREFLIGHT REPORT ==========",
        f"  Website:      {state.get('website_name', 'unknown')}",
        f"  CM Host:      {state.get('cm_host', 'not set')}",
        f"  API URL:      {state.get('api_url', 'not set')}",
        "",
        f"  [{'PASS' if conn else 'FAIL'}] Connectivity: {outputs.get('connectivity', 'not checked')}",
        f"  [{'PASS' if token else 'FAIL'}] Token:        {outputs.get('token', 'not checked')}",
        f"  [{'PASS' if gql else 'FAIL'}] GraphQL:      {outputs.get('graphql', 'not checked')}",
        "",
        f"  Result: {'ALL CHECKS PASSED' if passed else 'PREFLIGHT FAILED'}",
        "======================================\n",
    ]

    report_text = "\n".join(report_lines)
    print(report_text)

    return {
        "preflight_passed": passed,
        "current_step": "preflight-complete",
        "step_outputs": {**outputs, "report": report_text},
    }


def route_after_connectivity(state: PreflightState) -> str:
    """Route based on connectivity check."""
    if state.get("connectivity_ok"):
        return "validate_token"
    return "report"


def route_after_token(state: PreflightState) -> str:
    """Route based on token validation."""
    if state.get("token_valid"):
        return "test_graphql"
    return "report"


def route_after_graphql(state: PreflightState) -> str:
    """Always go to report after GraphQL test."""
    return "report"


# Build the graph
def build_preflight_graph() -> StateGraph:
    graph = StateGraph(PreflightState)

    # Add nodes
    graph.add_node("load_config", load_config)
    graph.add_node("check_connectivity", check_cm_connectivity)
    graph.add_node("validate_token", validate_token)
    graph.add_node("test_graphql", test_graphql)
    graph.add_node("report", report)

    # Add edges
    graph.add_edge(START, "load_config")
    graph.add_edge("load_config", "check_connectivity")
    graph.add_conditional_edges("check_connectivity", route_after_connectivity, ["validate_token", "report"])
    graph.add_conditional_edges("validate_token", route_after_token, ["test_graphql", "report"])
    graph.add_edge("test_graphql", "report")
    graph.add_edge("report", END)

    return graph


def run_preflight(website_name: str, inputs: dict = None):
    """Execute the preflight workflow."""
    inputs = inputs or {}

    # Track workflow
    start_workflow(website_name, "preflight", inputs)
    workflow_key = "preflight:default"

    # Build and run graph
    graph = build_preflight_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "skill_context": "",
        "env_config": {},
        "learned_patterns": [],
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "cm_host": "",
        "api_url": "",
        "api_key": "",
        "token": "",
        "connectivity_ok": False,
        "token_valid": False,
        "graphql_ok": False,
        "preflight_passed": False,
    }

    result = app.invoke(initial_state)

    # Update tracking
    if result.get("preflight_passed"):
        complete_workflow(website_name, workflow_key)
        print("Preflight PASSED.")
    else:
        fail_step(website_name, workflow_key, "preflight", "One or more checks failed")
        print("Preflight FAILED. Check the report above.")

    return result
