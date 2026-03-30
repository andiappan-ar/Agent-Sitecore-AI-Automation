"""
Smart Router Graph
The main entry point that replaces human orchestration.
Decides what to do based on the current state of the website in Sitecore.

Graph:
    preflight → discover → analyze → decide_branch
        ├── NEW WEBSITE → full_pipeline
        ├── EXISTING + ISSUES → suggest_fixes → (human approval) → execute_fixes
        ├── EXISTING + CLEAN → suggest_enhancements → (human approval) → execute
        └── ERROR → report + ask human

This graph is the ORCHESTRATOR — it does what the human used to do manually.
"""

import json
import ssl
import urllib.request
from typing import TypedDict, Annotated
from pathlib import Path
from datetime import datetime

from langgraph.graph import StateGraph, START, END, add_messages
from langchain_core.messages import HumanMessage, SystemMessage

from nodes.skill_loader import load_skills_for_workflow, PROJECT_ROOT
from nodes.generator import generate_with_prompt
from nodes.shell_executor import get_traefik_ip
from nodes.website_tracker import start_workflow, complete_workflow, save_state, load_state
from nodes.memory_manager import get_patterns

from graphs.environment_discovery import _graphql_query


class RouterState(TypedDict):
    website_name: str
    source_url: str
    skill_context: str
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict

    # Connection
    api_url: str
    token: str
    api_key: str
    traefik_ip: str

    # Preflight
    preflight_passed: bool

    # Discovery
    existing_templates: list
    existing_renderings: list
    content_tree: list
    site_exists: bool

    # Analysis
    issues: list          # [{ "type": "orphaned_rendering", "name": "...", "fix": "..." }]
    suggestions: list     # [{ "action": "create_template", "component": "...", "priority": "high" }]
    branch: str           # "new_website", "fix_issues", "enhance", "error"

    # Human decision
    approved_actions: list
    human_input: str


def _load_connection():
    """Load API connection details."""
    env_config_path = PROJECT_ROOT / "config" / "environments.json"
    env_config = {}
    if env_config_path.exists():
        with open(env_config_path) as f:
            env_config = json.load(f)

    active = env_config.get("activeEnvironment", "local-docker")
    env = env_config.get("environments", {}).get(active, {})
    api_url = env.get("authoringApi", "")
    api_key = env.get("apiKey", "")

    token = ""
    for tp in [
        PROJECT_ROOT.parent / "xmcloud" / ".sitecore" / "user.json",
        PROJECT_ROOT.parent / ".sitecore" / "user.json",
    ]:
        if tp.exists():
            try:
                with open(tp) as f:
                    ud = json.load(f)
                for key in ["xmCloud", "xmcloud", "default"]:
                    t = ud.get("endpoints", {}).get(key, {}).get("accessToken", "")
                    if t:
                        token = t
                        break
                if token:
                    break
            except Exception:
                continue

    traefik_ip = get_traefik_ip() if "localhost" in api_url else ""
    return api_url, token, api_key, traefik_ip


def preflight_check(state: RouterState) -> dict:
    """Quick preflight — verify connectivity."""
    print("\n[1/5] Preflight check...")
    api_url, token, api_key, traefik_ip = _load_connection()

    if not api_url or not token:
        print("  FAILED: Missing API URL or token")
        return {
            "preflight_passed": False,
            "api_url": api_url, "token": token, "api_key": api_key, "traefik_ip": traefik_ip,
            "current_step": "preflight-failed",
        }

    # Test GraphQL
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = api_url.replace("xmcloudcm.localhost", traefik_ip) if traefik_ip else api_url
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if traefik_ip:
        headers["Host"] = "xmcloudcm.localhost"

    body = json.dumps({"query": '{ item(where: { path: "/sitecore/content" }) { itemId } }'}).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            ok = "itemId" in json.dumps(data)
    except Exception as e:
        ok = False
        print(f"  Connection error: {e}")

    if ok:
        print("  PASSED — connected to Sitecore")
    else:
        print("  FAILED — cannot reach Sitecore")

    return {
        "preflight_passed": ok,
        "api_url": api_url, "token": token, "api_key": api_key, "traefik_ip": traefik_ip,
        "current_step": "preflight-done",
    }


def discover(state: RouterState) -> dict:
    """Discover what currently exists in Sitecore for this website."""
    print("\n[2/5] Discovering current state...")
    api_url = state["api_url"]
    token = state["token"]
    api_key = state.get("api_key", "")
    tip = state.get("traefik_ip", "")
    website = state["website_name"]

    # Load website config for collection/site names
    import yaml
    config_path = Path(__file__).parent.parent / "config" / "websites.yaml"
    collection = "Adnoc"
    site = website
    if config_path.exists():
        with open(config_path) as f:
            wc = yaml.safe_load(f)
        ws = wc.get("websites", {}).get(website, {})
        collection = ws.get("collection", collection)
        site = ws.get("site", site)

    # Query templates
    tmpl_result = _graphql_query(api_url, token,
        f'{{ item(where: {{ path: "/sitecore/templates/Project/{collection}/Components/{site}" }}) {{ children(first: 100) {{ nodes {{ name itemId path template {{ name }} hasChildren }} }} }} }}',
        api_key, tip)
    templates = tmpl_result.get("data", {}).get("item", {}).get("children", {}).get("nodes", []) if tmpl_result.get("data", {}).get("item") else []

    # Query renderings
    rend_result = _graphql_query(api_url, token,
        f'{{ item(where: {{ path: "/sitecore/layout/Renderings/Project/{collection}/{site}" }}) {{ children(first: 100) {{ nodes {{ name itemId path template {{ name }} }} }} }} }}',
        api_key, tip)
    renderings = rend_result.get("data", {}).get("item", {}).get("children", {}).get("nodes", []) if rend_result.get("data", {}).get("item") else []

    # Query content tree
    content_result = _graphql_query(api_url, token,
        f'{{ item(where: {{ path: "/sitecore/content/{collection}/{site}" }}) {{ itemId name children(first: 50) {{ nodes {{ name itemId path template {{ name }} hasChildren }} }} }} }}',
        api_key, tip)
    content = content_result.get("data", {}).get("item", {}).get("children", {}).get("nodes", []) if content_result.get("data", {}).get("item") else []

    site_exists = len(templates) > 0 or len(renderings) > 0 or len(content) > 0

    print(f"  Templates:  {len(templates)}")
    print(f"  Renderings: {len(renderings)}")
    print(f"  Content:    {len(content)} items")
    print(f"  Site exists: {'YES' if site_exists else 'NO (new website)'}")

    return {
        "existing_templates": templates,
        "existing_renderings": renderings,
        "content_tree": content,
        "site_exists": site_exists,
        "current_step": "discovery-done",
    }


def analyze(state: RouterState) -> dict:
    """
    Analyze the gap between current state and desired state.
    Classifies issues into priority tiers:
      - CRITICAL: blocks pages from rendering (components used in content but missing template)
      - HIGH: structural mismatch (orphaned renderings/templates)
      - MEDIUM: incomplete items (empty templates, missing fields)
      - LOW: cosmetic / optimization
    """
    print("\n[3/5] Analyzing...")
    templates = state.get("existing_templates", [])
    renderings = state.get("existing_renderings", [])
    content = state.get("content_tree", [])
    site_exists = state.get("site_exists", False)

    issues = []
    suggestions = []

    if not site_exists:
        branch = "new_website"
        suggestions.append({
            "action": "full_pipeline",
            "description": "Create new website from scratch (scrape → generate → deploy)",
            "priority": "high",
        })
        print("  Branch: NEW WEBSITE")
    else:
        template_names = {t["name"] for t in templates}
        rendering_names = {r["name"] for r in renderings if r.get("template", {}).get("name") != "Rendering Folder"}

        # Detect which components are likely used in pages (have content references)
        # Components used on pages are CRITICAL — without their template, pages break
        content_child_names = set()
        for item in content:
            for child in item.get("children", {}).get("nodes", []):
                content_child_names.add(child.get("name", ""))

        # Common page-level components (always critical if broken)
        core_components = {"Header", "Footer", "HeroHomepage", "HeroInner", "Breadcrumb", "ContentBlock", "ContentSection"}

        # Orphaned renderings (rendering exists but no matching template)
        orphaned_renderings = sorted(rendering_names - template_names)
        for name in orphaned_renderings:
            # Classify priority
            if name in core_components or name in content_child_names:
                priority = "critical"
            else:
                priority = "high"
            issues.append({
                "type": "orphaned_rendering",
                "name": name,
                "priority": priority,
                "description": f"Rendering '{name}' has no matching template",
                "fix": f"Create template for '{name}'",
            })

        # Orphaned templates (template exists but no matching rendering)
        orphaned_templates = sorted(template_names - rendering_names)
        for name in orphaned_templates:
            issues.append({
                "type": "orphaned_template",
                "name": name,
                "priority": "medium",
                "description": f"Template '{name}' has no matching rendering",
                "fix": f"Create rendering for '{name}'",
            })

        # Empty templates (no field sections)
        for t in templates:
            if t.get("template", {}).get("name") == "Template" and not t.get("hasChildren"):
                issues.append({
                    "type": "empty_template",
                    "name": t["name"],
                    "priority": "medium",
                    "description": f"Template '{t['name']}' has no field sections — incomplete",
                    "fix": f"Add field section and fields to '{t['name']}'",
                })

        if issues:
            branch = "fix_issues"
        else:
            branch = "enhance"

        # Build tiered suggestions
        critical = [i for i in issues if i["priority"] == "critical"]
        high = [i for i in issues if i["priority"] == "high"]
        medium = [i for i in issues if i["priority"] == "medium"]
        low = [i for i in issues if i["priority"] == "low"]

        if critical:
            suggestions.append({
                "tier": 1,
                "label": "CRITICAL FIX",
                "action": "fix_critical",
                "count": len(critical),
                "items": [i["name"] for i in critical],
                "description": f"Fix {len(critical)} components that likely block pages from rendering",
            })
        if critical or high:
            suggestions.append({
                "tier": 2,
                "label": "HIGH PRIORITY FIX",
                "action": "fix_high",
                "count": len(critical) + len(high),
                "items": [i["name"] for i in critical + high],
                "description": f"Fix all {len(critical) + len(high)} orphaned renderings (create missing templates)",
            })
        if issues:
            suggestions.append({
                "tier": 3,
                "label": "FULL FIX",
                "action": "fix_all",
                "count": len(issues),
                "items": [i["name"] for i in issues],
                "description": f"Fix all {len(issues)} issues (orphaned renderings + templates + empty templates)",
            })
        suggestions.append({
            "tier": 4,
            "label": "CUSTOM",
            "action": "custom",
            "count": 0,
            "items": [],
            "description": "Pick specific components to fix",
        })
        suggestions.append({
            "tier": 5,
            "label": "SKIP",
            "action": "skip",
            "count": 0,
            "items": [],
            "description": "Just show the report, don't fix anything",
        })

        counts = f"{len(critical)} critical, {len(high)} high, {len(medium)} medium"
        print(f"  Branch: FIX ISSUES ({len(issues)} issues: {counts})")

    return {
        "issues": issues,
        "suggestions": suggestions,
        "branch": branch,
        "current_step": "analysis-done",
    }


def present_suggestions(state: RouterState) -> dict:
    """Present tiered fix options and let the user choose."""
    issues = state.get("issues", [])
    suggestions = state.get("suggestions", [])
    branch = state.get("branch", "error")
    website = state.get("website_name", "unknown")

    print(f"\n{'=' * 60}")
    print(f"  ANALYSIS: {website}")
    print(f"{'=' * 60}")

    if branch == "new_website":
        print(f"""
  Status: NEW WEBSITE — no existing data in Sitecore

  Choose an action:

  [1] FULL PIPELINE
      Scrape source website -> generate components -> create pages -> deploy
      {"Source: " + state['source_url'] if state.get('source_url') else "Need source URL"}

  [2] MANUAL SETUP
      Create components and pages one at a time

  Run:
    python cli.py run full-pipeline -w {website} -i sourceUrl=https://...
""")

    elif branch == "fix_issues":
        # Count by priority
        critical = [i for i in issues if i.get("priority") == "critical"]
        high = [i for i in issues if i.get("priority") == "high"]
        medium = [i for i in issues if i.get("priority") == "medium"]

        print(f"""
  Status: EXISTING WEBSITE — {len(issues)} issues found
  Current: {len(state.get('existing_templates', []))} templates, {len(state.get('existing_renderings', []))} renderings

  Choose a fix strategy:
""")

        tier_num = 1
        for s in suggestions:
            if s.get("action") == "skip":
                continue
            if s.get("action") == "custom":
                continue

            tier = s.get("tier", 0)
            label = s.get("label", "")
            count = s.get("count", 0)
            desc = s.get("description", "")
            items = s.get("items", [])

            print(f"  [{tier}] {label} ({count} items)")
            print(f"      {desc}")

            # Show items for critical tier
            if tier == 1 and items:
                for item in items:
                    print(f"        - {item}")
            elif tier == 2 and items:
                # Show first few + count
                shown = items[:5]
                for item in shown:
                    print(f"        - {item}")
                if len(items) > 5:
                    print(f"        ... and {len(items) - 5} more")
            elif tier == 3 and items:
                print(f"        Includes all of above + {len(medium)} medium priority items")

            print()

        print(f"  [4] CUSTOM — pick specific components to fix")
        print(f"  [5] SKIP — just show report, don't fix anything")

        print(f"""
  Run with your choice:
    python cli.py run fix -w {website} -i tier=1          # critical only
    python cli.py run fix -w {website} -i tier=2          # high priority
    python cli.py run fix -w {website} -i tier=3          # full fix
    python cli.py run fix -w {website} -i components=AccordionFAQ,ContentBlock  # custom
""")

    elif branch == "enhance":
        templates_count = len(state.get("existing_templates", []))
        renderings_count = len(state.get("existing_renderings", []))
        print(f"""
  Status: CLEAN — no issues found
  Current: {templates_count} templates, {renderings_count} renderings

  Choose what to do next:

  [1] ADD COMPONENTS — create new component templates + renderings
  [2] CREATE PAGES — build page items with datasources
  [3] DEPLOY — push current serialization to Sitecore
  [4] DONE — nothing to do

  Run:
    python cli.py run create-component -w {website} -i componentName=<name>
    python cli.py run create-page -w {website} -i pageName=<name>
    python cli.py run deploy -w {website}
""")

    else:
        print(f"\n  Preflight FAILED — cannot connect to Sitecore.")
        print(f"  Check Docker, IIS, and token. Then retry:")
        print(f"    python cli.py run analyze -w {website}")

    print(f"{'=' * 60}")

    # Save analysis to website state
    ws_state = load_state(website)
    ws_state["last_analysis"] = {
        "date": datetime.now().isoformat(),
        "branch": branch,
        "issues_count": len(issues),
        "templates": len(state.get("existing_templates", [])),
        "renderings": len(state.get("existing_renderings", [])),
        "issues": issues,
        "suggestions": suggestions,
    }
    save_state(website, ws_state)

    return {
        "current_step": "suggestions-presented",
    }


def route_after_preflight(state: RouterState) -> str:
    if state.get("preflight_passed"):
        return "discover"
    return "present"  # Show error


def route_after_analysis(state: RouterState) -> str:
    """Always present suggestions — let the human decide next steps."""
    return "present"


def build_smart_router_graph() -> StateGraph:
    graph = StateGraph(RouterState)

    graph.add_node("preflight", preflight_check)
    graph.add_node("discover", discover)
    graph.add_node("analyze", analyze)
    graph.add_node("present", present_suggestions)

    graph.add_edge(START, "preflight")
    graph.add_conditional_edges("preflight", route_after_preflight, ["discover", "present"])
    graph.add_edge("discover", "analyze")
    graph.add_edge("analyze", "present")
    graph.add_edge("present", END)

    return graph


def run_smart_router(website_name: str, inputs: dict = None):
    """Execute the smart router — discovers, analyzes, suggests."""
    inputs = inputs or {}
    start_workflow(website_name, "smart-router", inputs)

    graph = build_smart_router_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "source_url": inputs.get("sourceUrl", inputs.get("source_url", "")),
        "skill_context": "",
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "api_url": "", "token": "", "api_key": "", "traefik_ip": "",
        "preflight_passed": False,
        "existing_templates": [], "existing_renderings": [], "content_tree": [],
        "site_exists": False,
        "issues": [], "suggestions": [], "branch": "",
        "approved_actions": [], "human_input": "",
    }

    result = app.invoke(initial_state)
    complete_workflow(website_name, "smart-router:default")
    return result
