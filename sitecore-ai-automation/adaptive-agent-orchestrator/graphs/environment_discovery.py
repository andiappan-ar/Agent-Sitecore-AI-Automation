"""
Environment Discovery Graph
Queries Sitecore for existing templates, renderings, sites, languages, media.
Saves a snapshot to exports/{env}/{date}/

Graph:
    load_config → query_sites → query_templates → query_renderings → save_snapshot → report
"""

import json
import ssl
import urllib.request
from datetime import datetime
from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages

from nodes.skill_loader import PROJECT_ROOT
from nodes.shell_executor import get_traefik_ip, run_command
from nodes.website_tracker import start_workflow, complete_workflow, save_state, load_state


class DiscoveryState(TypedDict):
    website_name: str
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict

    # Connection
    api_url: str
    token: str
    api_key: str
    traefik_ip: str

    # Discovered data
    sites: list
    templates: list
    renderings: list
    languages: list
    content_tree: list

    # Output
    snapshot_dir: str
    discovery_complete: bool


def _graphql_query(api_url: str, token: str, query: str, api_key: str = "", traefik_ip: str = "") -> dict:
    """Execute a GraphQL query against Sitecore authoring API."""
    body = json.dumps({"query": query}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if api_key:
        headers["sc_apikey"] = api_key

    url = api_url
    # HNS workaround
    if traefik_ip and "localhost" in api_url:
        url = api_url.replace("xmcloudcm.localhost", traefik_ip)
        headers["Host"] = "xmcloudcm.localhost"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"errors": [{"message": str(e)}]}


def load_config(state: DiscoveryState) -> dict:
    """Load environment config and connection details."""
    env_config_path = PROJECT_ROOT / "config" / "environments.json"
    env_config = {}
    if env_config_path.exists():
        with open(env_config_path) as f:
            env_config = json.load(f)

    active = env_config.get("activeEnvironment", "local-docker")
    env = env_config.get("environments", {}).get(active, {})

    api_url = env.get("authoringApi", "")
    api_key = env.get("apiKey", "")

    # Read token
    token = ""
    token_candidates = [
        PROJECT_ROOT.parent / "xmcloud" / ".sitecore" / "user.json",
        PROJECT_ROOT.parent / ".sitecore" / "user.json",
    ]
    for tp in token_candidates:
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

    print(f"  API: {api_url}")
    print(f"  Token: {'present' if token else 'MISSING'}")
    if traefik_ip:
        print(f"  Using Traefik IP: {traefik_ip}")

    return {
        "api_url": api_url,
        "token": token,
        "api_key": api_key,
        "traefik_ip": traefik_ip,
        "current_step": "config-loaded",
    }


def query_sites(state: DiscoveryState) -> dict:
    """Query existing sites and site collections."""
    print("  Querying sites...")
    result = _graphql_query(
        state["api_url"], state["token"],
        """{
          sites {
            nodes { name rootPath hostName language { name } }
          }
        }""",
        state.get("api_key", ""),
        state.get("traefik_ip", ""),
    )

    sites = []
    if "data" in result and result["data"].get("sites"):
        sites = result["data"]["sites"].get("nodes", [])

    # Also try site collections
    collections_result = _graphql_query(
        state["api_url"], state["token"],
        """{
          siteCollections {
            nodes { name path { value } }
          }
        }""",
        state.get("api_key", ""),
        state.get("traefik_ip", ""),
    )

    collections = []
    if "data" in collections_result and collections_result["data"].get("siteCollections"):
        collections = collections_result["data"]["siteCollections"].get("nodes", [])

    print(f"  Found {len(sites)} sites, {len(collections)} collections")

    return {
        "sites": sites,
        "current_step": "sites-queried",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "sites": sites,
            "site_collections": collections,
        },
    }


def query_templates(state: DiscoveryState) -> dict:
    """Query project templates."""
    print("  Querying templates...")

    # Query templates under /sitecore/templates/Project
    result = _graphql_query(
        state["api_url"], state["token"],
        """{
          item(where: { path: "/sitecore/templates/Project" }) {
            itemId name
            children(hasLayout: false, first: 100) {
              nodes {
                itemId name path
                children(first: 100) {
                  nodes {
                    itemId name path
                    template { name }
                    children(first: 50) {
                      nodes {
                        itemId name path
                        template { name }
                      }
                    }
                  }
                }
              }
            }
          }
        }""",
        state.get("api_key", ""),
        state.get("traefik_ip", ""),
    )

    templates = []
    if "data" in result and result["data"].get("item"):
        item = result["data"]["item"]
        for tenant in item.get("children", {}).get("nodes", []):
            for component_group in tenant.get("children", {}).get("nodes", []):
                for tmpl in component_group.get("children", {}).get("nodes", []):
                    templates.append({
                        "name": tmpl.get("name"),
                        "path": tmpl.get("path"),
                        "itemId": tmpl.get("itemId"),
                        "template": tmpl.get("template", {}).get("name", ""),
                        "parent": component_group.get("name"),
                    })

    print(f"  Found {len(templates)} templates")

    return {
        "templates": templates,
        "current_step": "templates-queried",
        "step_outputs": {**state.get("step_outputs", {}), "templates": templates},
    }


def query_renderings(state: DiscoveryState) -> dict:
    """Query project renderings."""
    print("  Querying renderings...")

    result = _graphql_query(
        state["api_url"], state["token"],
        """{
          item(where: { path: "/sitecore/layout/Renderings/Project" }) {
            itemId name
            children(first: 100) {
              nodes {
                itemId name path
                children(first: 100) {
                  nodes {
                    itemId name path
                    template { name }
                    children(first: 50) {
                      nodes { itemId name path template { name } }
                    }
                  }
                }
              }
            }
          }
        }""",
        state.get("api_key", ""),
        state.get("traefik_ip", ""),
    )

    renderings = []
    if "data" in result and result["data"].get("item"):
        item = result["data"]["item"]
        for tenant in item.get("children", {}).get("nodes", []):
            for group in tenant.get("children", {}).get("nodes", []):
                # Could be a rendering or a folder
                renderings.append({
                    "name": group.get("name"),
                    "path": group.get("path"),
                    "itemId": group.get("itemId"),
                    "template": group.get("template", {}).get("name", ""),
                })
                for child in group.get("children", {}).get("nodes", []):
                    renderings.append({
                        "name": child.get("name"),
                        "path": child.get("path"),
                        "itemId": child.get("itemId"),
                        "template": child.get("template", {}).get("name", ""),
                    })

    print(f"  Found {len(renderings)} renderings")

    return {
        "renderings": renderings,
        "current_step": "renderings-queried",
        "step_outputs": {**state.get("step_outputs", {}), "renderings": renderings},
    }


def query_content_tree(state: DiscoveryState) -> dict:
    """Query the content tree structure."""
    print("  Querying content tree...")

    result = _graphql_query(
        state["api_url"], state["token"],
        """{
          item(where: { path: "/sitecore/content" }) {
            itemId name
            children(first: 50) {
              nodes {
                itemId name path
                template { name }
                children(first: 50) {
                  nodes {
                    itemId name path
                    template { name }
                    hasChildren
                  }
                }
              }
            }
          }
        }""",
        state.get("api_key", ""),
        state.get("traefik_ip", ""),
    )

    tree = []
    if "data" in result and result["data"].get("item"):
        tree = result["data"]["item"].get("children", {}).get("nodes", [])

    total_items = sum(1 + len(n.get("children", {}).get("nodes", [])) for n in tree)
    print(f"  Found {len(tree)} top-level items, {total_items} total")

    return {
        "content_tree": tree,
        "current_step": "content-queried",
        "step_outputs": {**state.get("step_outputs", {}), "content_tree": tree},
    }


def save_snapshot(state: DiscoveryState) -> dict:
    """Save discovery results to exports/."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    env_name = "local-docker"
    snapshot_dir = PROJECT_ROOT / "exports" / env_name / date_str
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    outputs = state.get("step_outputs", {})

    # Save each discovery result
    files_saved = []
    for key in ["sites", "site_collections", "templates", "renderings", "content_tree"]:
        data = outputs.get(key, [])
        if data:
            path = snapshot_dir / f"{key.replace('_', '-')}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            files_saved.append(str(path.relative_to(PROJECT_ROOT)))

    # Save summary report
    report = {
        "discovered_at": datetime.now().isoformat(),
        "environment": env_name,
        "website": state.get("website_name", ""),
        "counts": {
            "sites": len(outputs.get("sites", [])),
            "site_collections": len(outputs.get("site_collections", [])),
            "templates": len(outputs.get("templates", [])),
            "renderings": len(outputs.get("renderings", [])),
            "content_items": len(outputs.get("content_tree", [])),
        },
    }
    report_path = snapshot_dir / "ENVIRONMENT-REPORT.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    files_saved.append(str(report_path.relative_to(PROJECT_ROOT)))

    print(f"\n  Snapshot saved to: {snapshot_dir.relative_to(PROJECT_ROOT)}")
    for f in files_saved:
        print(f"    {f}")

    return {
        "snapshot_dir": str(snapshot_dir),
        "current_step": "snapshot-saved",
    }


def report(state: DiscoveryState) -> dict:
    """Print discovery summary."""
    outputs = state.get("step_outputs", {})
    sites = outputs.get("sites", [])
    templates = outputs.get("templates", [])
    renderings = outputs.get("renderings", [])
    tree = outputs.get("content_tree", [])

    print(f"\n{'=' * 50}")
    print(f"  ENVIRONMENT DISCOVERY — {state.get('website_name', 'unknown')}")
    print(f"{'=' * 50}")
    print(f"  Sites:      {len(sites)}")
    for s in sites[:10]:
        print(f"    - {s.get('name', '?')} ({s.get('rootPath', '?')})")
    print(f"  Templates:  {len(templates)}")
    for t in templates[:10]:
        print(f"    - {t.get('name', '?')} [{t.get('template', '?')}]")
    if len(templates) > 10:
        print(f"    ... and {len(templates) - 10} more")
    print(f"  Renderings: {len(renderings)}")
    for r in renderings[:10]:
        print(f"    - {r.get('name', '?')}")
    if len(renderings) > 10:
        print(f"    ... and {len(renderings) - 10} more")
    print(f"  Content:    {len(tree)} top-level collections")
    for c in tree[:10]:
        children = c.get("children", {}).get("nodes", [])
        print(f"    - {c.get('name', '?')} ({len(children)} children)")
    print(f"{'=' * 50}\n")

    return {
        "discovery_complete": True,
        "current_step": "discovery-complete",
    }


def build_discovery_graph() -> StateGraph:
    graph = StateGraph(DiscoveryState)

    graph.add_node("load_config", load_config)
    graph.add_node("query_sites", query_sites)
    graph.add_node("query_templates", query_templates)
    graph.add_node("query_renderings", query_renderings)
    graph.add_node("query_content", query_content_tree)
    graph.add_node("save_snapshot", save_snapshot)
    graph.add_node("report", report)

    graph.add_edge(START, "load_config")
    graph.add_edge("load_config", "query_sites")
    graph.add_edge("query_sites", "query_templates")
    graph.add_edge("query_templates", "query_renderings")
    graph.add_edge("query_renderings", "query_content")
    graph.add_edge("query_content", "save_snapshot")
    graph.add_edge("save_snapshot", "report")
    graph.add_edge("report", END)

    return graph


def run_discovery(website_name: str, inputs: dict = None):
    """Execute environment discovery."""
    inputs = inputs or {}
    start_workflow(website_name, "environment-discovery", inputs)

    print(f"\nDiscovering environment for: {website_name}")
    print("-" * 40)

    graph = build_discovery_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "api_url": "",
        "token": "",
        "api_key": "",
        "traefik_ip": "",
        "sites": [],
        "templates": [],
        "renderings": [],
        "languages": [],
        "content_tree": [],
        "snapshot_dir": "",
        "discovery_complete": False,
    }

    result = app.invoke(initial_state)

    if result.get("discovery_complete"):
        complete_workflow(website_name, "environment-discovery:default")
        print("Discovery complete.")
    else:
        print("Discovery had issues.")

    return result
