"""
Sitecore Workflow Graph (Stage 2)
Reads scrapper manifest → creates Sitecore templates/renderings/pages → deploys → registers components.

This is the MAIN workflow users run after the scrapper has finished (Stage 1).
It does NOT invoke the scrapper — it only reads from scrapper/output/{domain}/manifest/.

Flow:
    preflight → load_manifest → create_components → create_react_tsx
             → create_pages → deploy → register_components → report

Usage:
    python cli.py run sitecore-workflow --website adnocgas
"""

import json
from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages

from nodes.skill_loader import PROJECT_ROOT
from nodes.shell_executor import run_command, sitecore_cli
from nodes.website_tracker import start_workflow, complete_workflow, fail_step

from graphs.preflight import run_preflight
from graphs.create_component import run_create_component
from graphs.create_page import run_create_page
from graphs.deploy import run_deploy


class SitecoreWorkflowState(TypedDict):
    website_name: str
    collection: str
    site: str
    source_url: str
    languages: list[str]
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict

    # Manifest (loaded from scrapper output)
    manifest_path: str
    component_manifest: list[dict]
    page_manifest: list[dict]

    # Progress
    preflight_passed: bool
    components_created: list[str]
    react_components_created: list[str]
    pages_created: list[str]
    deploy_completed: bool
    components_registered: bool
    workflow_success: bool


def run_preflight_step(state: SitecoreWorkflowState) -> dict:
    """Run preflight — verify Sitecore connectivity before doing anything."""
    print("\n[1/7] Running preflight...")
    result = run_preflight(state["website_name"])
    passed = result.get("preflight_passed", False)
    return {
        "preflight_passed": passed,
        "current_step": "preflight-done",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "preflight": "PASSED" if passed else "FAILED",
        },
    }


def load_manifest(state: SitecoreWorkflowState) -> dict:
    """
    Load the scrapper manifest. Looks in order:
    1. scrapper/output/{domain}/manifest/ (scrapper output)
    2. generated/{website}/generation-report.json (pre-existing generation)
    """
    website = state["website_name"]
    url = state.get("source_url", "")

    print("\n[2/7] Loading manifest from scrapper output...")

    # Try scrapper manifest first
    if url:
        domain = url.replace("https://", "").replace("http://", "").rstrip("/")
        manifest_dir = PROJECT_ROOT / "scrapper" / "output" / domain / "manifest"

        if manifest_dir.exists():
            components = []
            pages = []

            # Read site manifest
            site_json = manifest_dir / "site.json"
            if site_json.exists():
                with open(site_json) as f:
                    site_data = json.load(f)
                print(f"  Site: {site_data.get('name', domain)}")

            # Read page manifests
            pages_dir = manifest_dir / "pages"
            if pages_dir.exists():
                for lang_dir in pages_dir.iterdir():
                    if lang_dir.is_dir():
                        for page_file in lang_dir.glob("*.json"):
                            with open(page_file) as f:
                                page_data = json.load(f)
                            if "components" in page_data:
                                for comp in page_data["components"]:
                                    comp["_source_page"] = page_data.get("page", {}).get("name", page_file.stem)
                                    comp["_language"] = lang_dir.name
                                components.extend(page_data["components"])
                            pages.append({
                                "name": page_data.get("page", {}).get("name", page_file.stem),
                                "language": lang_dir.name,
                                "url": page_data.get("page", {}).get("url", ""),
                                "title": page_data.get("page", {}).get("title", ""),
                                "component_count": len(page_data.get("components", [])),
                                "components": page_data.get("components", []),
                            })

            # Read component schemas
            schemas_dir = manifest_dir / "components"
            if schemas_dir.exists():
                for schema_file in schemas_dir.glob("*.schema.json"):
                    with open(schema_file) as f:
                        schema = json.load(f)
                    # Merge schema info into matching components
                    comp_type = schema_file.stem.replace(".schema", "")
                    for comp in components:
                        if comp.get("type") == comp_type:
                            comp["schema"] = schema

            # Deduplicate components by type+variant
            seen = set()
            unique_components = []
            for comp in components:
                key = f"{comp.get('type', '')}:{comp.get('variant', '')}"
                if key not in seen:
                    seen.add(key)
                    unique_components.append(comp)

            print(f"  Found {len(unique_components)} unique components, {len(pages)} pages")
            return {
                "manifest_path": str(manifest_dir),
                "component_manifest": unique_components,
                "page_manifest": pages,
                "current_step": "manifest-loaded",
                "step_outputs": {
                    **state.get("step_outputs", {}),
                    "manifest": f"{len(unique_components)} components, {len(pages)} pages from {domain}",
                },
            }

    # Fallback: check generation-report.json
    report_path = PROJECT_ROOT / "generated" / website / "generation-report.json"
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
        components = report if isinstance(report, list) else report.get("components", [])
        print(f"  Found {len(components)} components in generation report")
        return {
            "manifest_path": str(report_path),
            "component_manifest": components,
            "page_manifest": [],
            "current_step": "manifest-loaded",
            "step_outputs": {
                **state.get("step_outputs", {}),
                "manifest": f"{len(components)} components from generation report",
            },
        }

    print("  WARNING: No manifest found. Run the scrapper first (Stage 1).")
    return {
        "manifest_path": "",
        "component_manifest": [],
        "page_manifest": [],
        "current_step": "manifest-empty",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "manifest": "EMPTY — run scrapper first",
        },
    }


def create_sitecore_components(state: SitecoreWorkflowState) -> dict:
    """Create Sitecore templates + renderings from manifest."""
    components = state.get("component_manifest", [])
    website = state["website_name"]
    created = []

    if not components:
        print("\n[3/7] No components in manifest — skipping")
        return {"components_created": [], "current_step": "components-skipped"}

    print(f"\n[3/7] Creating {len(components)} Sitecore components...")

    for i, comp in enumerate(components):
        name = comp.get("name", comp.get("componentName", f"Component{i}"))
        comp_type = comp.get("type", comp.get("componentType", ""))
        fields = comp.get("fields", [])

        # Normalize fields
        if isinstance(fields, int):
            fields = [{"name": f"field{j+1}", "type": "Single-Line Text"} for j in range(fields)]
        elif isinstance(fields, list) and fields and isinstance(fields[0], str):
            fields = [{"name": f, "type": "Single-Line Text"} for f in fields]

        print(f"  [{i+1}/{len(components)}] {name} ({comp_type})")

        try:
            run_create_component(website, {
                "componentName": name,
                "componentType": comp_type,
                "fields": fields,
            })
            created.append(name)
        except Exception as e:
            print(f"    FAILED: {e}")

    return {
        "components_created": created,
        "current_step": "components-done",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "sitecore_components": f"{len(created)}/{len(components)} created",
        },
    }


def create_react_components(state: SitecoreWorkflowState) -> dict:
    """
    Create React Content SDK TSX components from scrapper React output.
    Places them in xmcloud/examples/basic-nextjs/src/components/adnocgas/.
    """
    components = state.get("components_created", [])
    website = state["website_name"]
    created = []

    if not components:
        print("\n[4/7] No components to convert — skipping React TSX generation")
        return {"react_components_created": [], "current_step": "react-skipped"}

    print(f"\n[4/7] Creating React Content SDK TSX for {len(components)} components...")
    print("  (This step uses Claude Code to transform scraped React → Sitecore TSX)")
    print("  Target: xmcloud/examples/basic-nextjs/src/components/adnocgas/")

    # React TSX generation is done by the generator node with react-component skills
    # For now, track what needs to be created
    for name in components:
        tsx_path = PROJECT_ROOT.parent / "xmcloud" / "examples" / "basic-nextjs" / "src" / "components" / "adnocgas" / f"{name}.tsx"
        if tsx_path.exists():
            print(f"  {name}.tsx — already exists")
            created.append(name)
        else:
            print(f"  {name}.tsx — needs creation")

    return {
        "react_components_created": created,
        "current_step": "react-done",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "react_tsx": f"{len(created)}/{len(components)} exist, {len(components) - len(created)} need creation",
        },
    }


def create_sitecore_pages(state: SitecoreWorkflowState) -> dict:
    """Create Sitecore pages from manifest."""
    pages = state.get("page_manifest", [])
    website = state["website_name"]
    created = []

    if not pages:
        print("\n[5/7] No pages in manifest — skipping")
        return {"pages_created": [], "current_step": "pages-skipped"}

    print(f"\n[5/7] Creating {len(pages)} pages...")

    for i, page in enumerate(pages):
        name = page.get("name", f"Page{i}")
        print(f"  [{i+1}/{len(pages)}] {name} ({page.get('language', 'en')})")

        try:
            run_create_page(website, {
                "pageName": name,
                "pageUrl": page.get("url", f"/{name.lower()}"),
                "language": page.get("language", "en"),
                "components": page.get("components", []),
            })
            created.append(name)
        except Exception as e:
            print(f"    FAILED: {e}")

    return {
        "pages_created": created,
        "current_step": "pages-done",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "pages": f"{len(created)}/{len(pages)} created",
        },
    }


def deploy_to_sitecore(state: SitecoreWorkflowState) -> dict:
    """Push serialized items to Sitecore via CLI."""
    print("\n[6/7] Deploying to Sitecore...")
    result = run_deploy(state["website_name"])
    success = result.get("deploy_success", False)
    return {
        "deploy_completed": success,
        "current_step": "deploy-done",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "deploy": "SUCCESS" if success else "FAILED",
        },
    }


def register_components(state: SitecoreWorkflowState) -> dict:
    """Regenerate component map in the rendering host."""
    print("\n[7/7] Registering components in rendering host...")

    rendering_host = PROJECT_ROOT.parent / "xmcloud" / "examples" / "basic-nextjs"

    if not rendering_host.exists():
        print("  WARNING: Rendering host not found — skipping registration")
        return {"components_registered": False, "current_step": "register-skipped"}

    result = run_command(
        "npm run sitecore-tools:generate-map",
        cwd=str(rendering_host),
        timeout=60,
    )

    if result["success"]:
        print("  Component map regenerated successfully")
    else:
        print(f"  WARNING: Map generation failed: {result.get('stderr', '')[:200]}")

    return {
        "components_registered": result["success"],
        "current_step": "register-done",
        "step_outputs": {
            **state.get("step_outputs", {}),
            "register": "Map regenerated" if result["success"] else "FAILED",
        },
    }


def final_report(state: SitecoreWorkflowState) -> dict:
    """Generate final workflow report."""
    outputs = state.get("step_outputs", {})
    components = state.get("components_created", [])
    react = state.get("react_components_created", [])
    pages = state.get("pages_created", [])

    success = (
        state.get("preflight_passed", False)
        and len(components) > 0
    )

    print(f"\n{'=' * 60}")
    print(f"  SITECORE WORKFLOW REPORT — {state.get('website_name', 'unknown')}")
    print(f"{'=' * 60}")
    print(f"  Preflight:       {outputs.get('preflight', 'not run')}")
    print(f"  Manifest:        {outputs.get('manifest', 'not loaded')}")
    print(f"  SC Components:   {outputs.get('sitecore_components', 'not run')}")
    print(f"  React TSX:       {outputs.get('react_tsx', 'not run')}")
    print(f"  Pages:           {outputs.get('pages', 'not run')}")
    print(f"  Deploy:          {outputs.get('deploy', 'not run')}")
    print(f"  Component Map:   {outputs.get('register', 'not run')}")
    print(f"")
    print(f"  Result:          {'WORKFLOW COMPLETE' if success else 'WORKFLOW INCOMPLETE'}")
    print(f"{'=' * 60}\n")

    return {"workflow_success": success}


def route_after_preflight(state: SitecoreWorkflowState) -> str:
    if state.get("preflight_passed"):
        return "load_manifest"
    return "report"


def route_after_manifest(state: SitecoreWorkflowState) -> str:
    if state.get("component_manifest") or state.get("page_manifest"):
        return "create_components"
    return "report"


def build_sitecore_workflow_graph() -> StateGraph:
    graph = StateGraph(SitecoreWorkflowState)

    graph.add_node("preflight", run_preflight_step)
    graph.add_node("load_manifest", load_manifest)
    graph.add_node("create_components", create_sitecore_components)
    graph.add_node("create_react", create_react_components)
    graph.add_node("create_pages", create_sitecore_pages)
    graph.add_node("deploy", deploy_to_sitecore)
    graph.add_node("register", register_components)
    graph.add_node("report", final_report)

    graph.add_edge(START, "preflight")
    graph.add_conditional_edges("preflight", route_after_preflight, ["load_manifest", "report"])
    graph.add_conditional_edges("load_manifest", route_after_manifest, ["create_components", "report"])
    graph.add_edge("create_components", "create_react")
    graph.add_edge("create_react", "create_pages")
    graph.add_edge("create_pages", "deploy")
    graph.add_edge("deploy", "register")
    graph.add_edge("register", "report")
    graph.add_edge("report", END)

    return graph


def run_sitecore_workflow(website_name: str, inputs: dict):
    """Execute the Sitecore workflow (Stage 2 — after scrapper)."""
    import yaml as _yaml

    config_path = Path(__file__).parent.parent / "config" / "websites.yaml"
    collection = "Adnoc"
    site = website_name
    languages = ["en"]
    source_url = ""

    if config_path.exists():
        with open(config_path) as f:
            wc = _yaml.safe_load(f)
        ws = wc.get("websites", {}).get(website_name, {})
        collection = ws.get("collection", collection)
        site = ws.get("site", site)
        languages = ws.get("languages", languages)
        source_url = ws.get("url", "")

    # Input overrides
    source_url = inputs.get("sourceUrl", inputs.get("source_url", source_url))

    start_workflow(website_name, "sitecore-workflow", inputs)

    print(f"\n{'=' * 60}")
    print(f"  SITECORE WORKFLOW (Stage 2): {website_name}")
    print(f"  Reads manifest from scrapper output, converts & pushes.")
    print(f"{'=' * 60}")

    graph = build_sitecore_workflow_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "collection": collection,
        "site": site,
        "source_url": source_url,
        "languages": languages,
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "manifest_path": "",
        "component_manifest": [],
        "page_manifest": [],
        "preflight_passed": False,
        "components_created": [],
        "react_components_created": [],
        "pages_created": [],
        "deploy_completed": False,
        "components_registered": False,
        "workflow_success": False,
    }

    result = app.invoke(initial_state)

    if result.get("workflow_success"):
        complete_workflow(website_name, "sitecore-workflow:default")
    else:
        fail_step(website_name, "sitecore-workflow:default", "workflow", "Workflow incomplete")

    return result
