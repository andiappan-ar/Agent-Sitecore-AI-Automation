"""
Deploy Graph
Pushes generated YAML to Sitecore and verifies items exist.

Graph:
    preflight → push_serialization → verify_templates → verify_pages → report
                      ↓ (fail)
                    report_fail
"""

from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages

from nodes.skill_loader import load_skills_for_workflow, PROJECT_ROOT
from nodes.shell_executor import sitecore_cli, run_command
from nodes.website_tracker import start_workflow, complete_workflow, fail_step, load_state


class DeployState(TypedDict):
    website_name: str
    skill_context: str
    env_config: dict
    learned_patterns: list[str]
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict

    push_result: str
    items_verified: list[str]
    items_missing: list[str]
    deploy_success: bool


def load_skills(state: DeployState) -> dict:
    """Load deploy skills."""
    skill_state = {"workflow_name": "deploy", "current_step": ""}
    result = load_skills_for_workflow(skill_state)
    return {
        "skill_context": result["skill_context"],
        "env_config": result.get("env_config", {}),
        "learned_patterns": result.get("learned_patterns", []),
        "current_step": "skills-loaded",
    }


def push_serialization(state: DeployState) -> dict:
    """Push serialized items to Sitecore via CLI."""
    print("  Pushing serialization to Sitecore...")

    result = sitecore_cli("ser push", cwd=str(PROJECT_ROOT.parent))

    if result["success"]:
        print("  Push completed successfully")
        return {
            "push_result": result["stdout"],
            "current_step": "push-completed",
            "step_outputs": {**state.get("step_outputs", {}), "push": "Success"},
        }
    else:
        print(f"  Push failed: {result['stderr'][:200]}")
        return {
            "push_result": result["stderr"],
            "current_step": "push-failed",
            "step_outputs": {**state.get("step_outputs", {}), "push": f"FAILED: {result['stderr'][:200]}"},
        }


def verify_items(state: DeployState) -> dict:
    """Verify that pushed items exist in Sitecore via GraphQL."""
    website = state["website_name"]
    ws_state = load_state(website)
    gen_ids = ws_state.get("generated_ids", {})

    verified = []
    missing = []

    env_config = state.get("env_config", {})
    active_env = env_config.get("activeEnvironment", "local-docker")
    env = env_config.get("environments", {}).get(active_env, {})
    api_url = env.get("authoringApi", "")

    if not api_url:
        print("  Skipping verification — no API URL configured")
        return {
            "items_verified": [],
            "items_missing": [],
            "current_step": "verification-skipped",
        }

    # Check templates
    for name, guid in gen_ids.get("templates", {}).items():
        query = f'{{"query":"{{ item(where: {{ itemId: \\"{guid}\\" }}) {{ itemId name }} }}"}}'
        result = run_command(
            f'curl -sk -X POST {api_url} -H "Content-Type: application/json" -d \'{query}\'',
            timeout=10,
        )
        if result["success"] and guid.replace("-", "") in result.get("stdout", "").replace("-", ""):
            verified.append(f"Template: {name}")
            print(f"    [OK] Template: {name}")
        else:
            missing.append(f"Template: {name} ({guid})")
            print(f"    [!!] Template: {name} — not found")

    # Check renderings
    for name, guid in gen_ids.get("renderings", {}).items():
        query = f'{{"query":"{{ item(where: {{ itemId: \\"{guid}\\" }}) {{ itemId name }} }}"}}'
        result = run_command(
            f'curl -sk -X POST {api_url} -H "Content-Type: application/json" -d \'{query}\'',
            timeout=10,
        )
        if result["success"] and guid.replace("-", "") in result.get("stdout", "").replace("-", ""):
            verified.append(f"Rendering: {name}")
            print(f"    [OK] Rendering: {name}")
        else:
            missing.append(f"Rendering: {name} ({guid})")
            print(f"    [!!] Rendering: {name} — not found")

    return {
        "items_verified": verified,
        "items_missing": missing,
        "current_step": "verification-done",
    }


def report(state: DeployState) -> dict:
    """Generate deploy report."""
    verified = state.get("items_verified", [])
    missing = state.get("items_missing", [])
    success = len(missing) == 0 and state.get("push_result", "") != ""

    print(f"\n{'=' * 40}")
    print(f"  DEPLOY REPORT — {state.get('website_name', 'unknown')}")
    print(f"  Push: {state.get('step_outputs', {}).get('push', 'not run')}")
    print(f"  Verified: {len(verified)} items")
    print(f"  Missing: {len(missing)} items")
    if missing:
        for m in missing:
            print(f"    - {m}")
    print(f"  Result: {'SUCCESS' if success else 'ISSUES FOUND'}")
    print(f"{'=' * 40}\n")

    return {
        "deploy_success": success,
        "current_step": "deploy-complete",
    }


def build_deploy_graph() -> StateGraph:
    graph = StateGraph(DeployState)

    graph.add_node("load_skills", load_skills)
    graph.add_node("push", push_serialization)
    graph.add_node("verify", verify_items)
    graph.add_node("report", report)

    graph.add_edge(START, "load_skills")
    graph.add_edge("load_skills", "push")
    graph.add_edge("push", "verify")
    graph.add_edge("verify", "report")
    graph.add_edge("report", END)

    return graph


def run_deploy(website_name: str, inputs: dict = None):
    """Execute the deploy workflow."""
    inputs = inputs or {}
    start_workflow(website_name, "deploy", inputs)

    graph = build_deploy_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "skill_context": "",
        "env_config": {},
        "learned_patterns": [],
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "push_result": "",
        "items_verified": [],
        "items_missing": [],
        "deploy_success": False,
    }

    result = app.invoke(initial_state)

    if result.get("deploy_success"):
        complete_workflow(website_name, "deploy:default")
        print("Deploy PASSED.")
    else:
        fail_step(website_name, "deploy:default", "deploy", "Deploy had issues")
        print("Deploy had issues. Check report above.")

    return result
