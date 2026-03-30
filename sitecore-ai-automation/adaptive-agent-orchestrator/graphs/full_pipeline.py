"""
Full Pipeline Graph
Master workflow: Scrape → Create Components → Create Pages → Deploy → Verify

This graph composes the individual workflow graphs into one end-to-end pipeline.

Graph:
    preflight → scrape_website → parse_manifest → create_components (parallel)
             → create_pages (parallel) → deploy → verify → report
"""

import json
from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages

from nodes.skill_loader import PROJECT_ROOT
from nodes.shell_executor import run_scrapper, run_command
from nodes.website_tracker import start_workflow, complete_workflow, fail_step, load_state

from graphs.preflight import run_preflight
from graphs.create_component import run_create_component
from graphs.create_page import run_create_page
from graphs.deploy import run_deploy


class PipelineState(TypedDict):
    website_name: str
    collection: str
    site: str
    source_url: str
    languages: list[str]
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict

    # Manifest from scrapper
    component_manifest: list[dict]
    page_manifest: list[dict]

    # Progress
    preflight_passed: bool
    scrape_completed: bool
    components_created: list[str]
    pages_created: list[str]
    deploy_completed: bool
    pipeline_success: bool


def run_preflight_step(state: PipelineState) -> dict:
    """Run preflight check."""
    print("\n[1/6] Running preflight...")
    result = run_preflight(state["website_name"])

    passed = result.get("preflight_passed", False)
    return {
        "preflight_passed": passed,
        "current_step": "preflight-done",
        "step_outputs": {**state.get("step_outputs", {}), "preflight": "PASSED" if passed else "FAILED"},
    }


def scrape_website(state: PipelineState) -> dict:
    """Run the scrapper pipeline on the source URL."""
    url = state.get("source_url", "")
    if not url:
        return {
            "scrape_completed": False,
            "current_step": "scrape-skipped",
            "step_outputs": {**state.get("step_outputs", {}), "scrape": "No source URL provided — skipping scrape"},
        }

    print(f"\n[2/6] Scraping website: {url}")

    # Check if scrapper output already exists
    domain = url.replace("https://", "").replace("http://", "").rstrip("/")
    output_dir = PROJECT_ROOT / "scrapper" / "output" / domain
    if output_dir.exists():
        print(f"  Scrapper output already exists at: {output_dir}")
        return {
            "scrape_completed": True,
            "current_step": "scrape-exists",
            "step_outputs": {**state.get("step_outputs", {}), "scrape": f"Using existing output: {output_dir}"},
        }

    # Run scrapper
    result = run_scrapper("orchestrate.js", f'--url {url}')

    return {
        "scrape_completed": result["success"],
        "current_step": "scrape-done",
        "step_outputs": {**state.get("step_outputs", {}), "scrape": "Completed" if result["success"] else result["stderr"][:200]},
    }


def parse_manifest(state: PipelineState) -> dict:
    """Parse the scrapper output manifest to get component and page lists."""
    website = state["website_name"]

    print("\n[3/6] Parsing manifest...")

    # Check for generation-report.json (already generated)
    report_path = PROJECT_ROOT / "generated" / website / "generation-report.json"
    if report_path.exists():
        with open(report_path) as f:
            components = json.load(f)
        print(f"  Found {len(components)} components in generation report")
        return {
            "component_manifest": components,
            "page_manifest": [],  # Pages from scrapper manifest
            "current_step": "manifest-parsed",
        }

    # Check scrapper output for manifest
    url = state.get("source_url", "")
    domain = url.replace("https://", "").replace("http://", "").rstrip("/") if url else ""
    manifest_dir = PROJECT_ROOT / "scrapper" / "output" / domain / "manifest"

    if manifest_dir.exists():
        components = []
        pages = []
        for f in manifest_dir.glob("*.json"):
            with open(f) as fh:
                data = json.load(fh)
            if isinstance(data, list):
                components.extend(data)
            elif isinstance(data, dict):
                if "components" in data:
                    components.extend(data["components"])
                if "pages" in data:
                    pages.extend(data["pages"])

        print(f"  Found {len(components)} components, {len(pages)} pages")
        return {
            "component_manifest": components,
            "page_manifest": pages,
            "current_step": "manifest-parsed",
        }

    print("  No manifest found — using empty lists")
    return {
        "component_manifest": [],
        "page_manifest": [],
        "current_step": "manifest-empty",
    }


def create_components(state: PipelineState) -> dict:
    """Create all components from the manifest."""
    components = state.get("component_manifest", [])
    website = state["website_name"]
    created = []

    print(f"\n[4/6] Creating {len(components)} components...")

    for i, comp in enumerate(components):
        name = comp.get("name", comp.get("componentName", f"Component{i}"))
        comp_type = comp.get("type", comp.get("componentType", ""))
        fields = comp.get("fields", [])

        # Convert field count to field list if needed
        if isinstance(fields, int):
            fields = [{"name": f"field{j+1}", "type": "Single-Line Text"} for j in range(fields)]
        elif isinstance(fields, list) and fields and isinstance(fields[0], str):
            fields = [{"name": f, "type": "Single-Line Text"} for f in fields]

        print(f"\n  [{i+1}/{len(components)}] {name}")

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
        "step_outputs": {**state.get("step_outputs", {}), "components": f"{len(created)}/{len(components)} created"},
    }


def create_pages(state: PipelineState) -> dict:
    """Create all pages from the manifest."""
    pages = state.get("page_manifest", [])
    website = state["website_name"]
    created = []

    if not pages:
        print("\n[5/6] No pages in manifest — skipping")
        return {
            "pages_created": [],
            "current_step": "pages-skipped",
        }

    print(f"\n[5/6] Creating {len(pages)} pages...")

    for i, page in enumerate(pages):
        name = page.get("name", page.get("pageName", f"Page{i}"))
        components = page.get("components", [])

        print(f"\n  [{i+1}/{len(pages)}] {name}")

        try:
            run_create_page(website, {
                "pageName": name,
                "pageUrl": page.get("url", f"/{name.lower()}"),
                "components": components,
            })
            created.append(name)
        except Exception as e:
            print(f"    FAILED: {e}")

    return {
        "pages_created": created,
        "current_step": "pages-done",
        "step_outputs": {**state.get("step_outputs", {}), "pages": f"{len(created)}/{len(pages)} created"},
    }


def deploy_all(state: PipelineState) -> dict:
    """Deploy everything to Sitecore."""
    print("\n[6/6] Deploying to Sitecore...")

    result = run_deploy(state["website_name"])

    return {
        "deploy_completed": result.get("deploy_success", False),
        "current_step": "deploy-done",
    }


def final_report(state: PipelineState) -> dict:
    """Generate final pipeline report."""
    outputs = state.get("step_outputs", {})
    components = state.get("components_created", [])
    pages = state.get("pages_created", [])

    success = (
        state.get("preflight_passed", False)
        and len(components) > 0
    )

    print(f"\n{'=' * 50}")
    print(f"  FULL PIPELINE REPORT — {state.get('website_name', 'unknown')}")
    print(f"{'=' * 50}")
    print(f"  Source URL:  {state.get('source_url', 'none')}")
    print(f"  Preflight:   {outputs.get('preflight', 'not run')}")
    print(f"  Scrape:      {outputs.get('scrape', 'not run')}")
    print(f"  Components:  {outputs.get('components', 'not run')}")
    print(f"  Pages:       {outputs.get('pages', 'not run')}")
    print(f"  Deploy:      {'SUCCESS' if state.get('deploy_completed') else 'not run / failed'}")
    print(f"")
    print(f"  Result:      {'PIPELINE COMPLETE' if success else 'PIPELINE INCOMPLETE'}")
    print(f"{'=' * 50}\n")

    return {"pipeline_success": success}


def route_after_preflight(state: PipelineState) -> str:
    if state.get("preflight_passed"):
        return "scrape"
    return "report"


def build_full_pipeline_graph() -> StateGraph:
    graph = StateGraph(PipelineState)

    graph.add_node("preflight", run_preflight_step)
    graph.add_node("scrape", scrape_website)
    graph.add_node("parse_manifest", parse_manifest)
    graph.add_node("create_components", create_components)
    graph.add_node("create_pages", create_pages)
    graph.add_node("deploy", deploy_all)
    graph.add_node("report", final_report)

    graph.add_edge(START, "preflight")
    graph.add_conditional_edges("preflight", route_after_preflight, ["scrape", "report"])
    graph.add_edge("scrape", "parse_manifest")
    graph.add_edge("parse_manifest", "create_components")
    graph.add_edge("create_components", "create_pages")
    graph.add_edge("create_pages", "deploy")
    graph.add_edge("deploy", "report")
    graph.add_edge("report", END)

    return graph


def run_full_pipeline(website_name: str, inputs: dict):
    """Execute the full pipeline."""
    import yaml as _yaml

    config_path = Path(__file__).parent.parent / "config" / "websites.yaml"
    collection = "Adnoc"
    site = website_name
    languages = ["en"]
    if config_path.exists():
        with open(config_path) as f:
            wc = _yaml.safe_load(f)
        ws = wc.get("websites", {}).get(website_name, {})
        collection = ws.get("collection", collection)
        site = ws.get("site", site)
        languages = ws.get("languages", languages)

    start_workflow(website_name, "full-pipeline", inputs)

    print(f"\n{'=' * 50}")
    print(f"  FULL PIPELINE: {website_name}")
    print(f"  URL: {inputs.get('sourceUrl', inputs.get('source_url', 'none'))}")
    print(f"{'=' * 50}")

    graph = build_full_pipeline_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "collection": collection,
        "site": site,
        "source_url": inputs.get("sourceUrl", inputs.get("source_url", "")),
        "languages": languages,
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "component_manifest": [],
        "page_manifest": [],
        "preflight_passed": False,
        "scrape_completed": False,
        "components_created": [],
        "pages_created": [],
        "deploy_completed": False,
        "pipeline_success": False,
    }

    result = app.invoke(initial_state)

    if result.get("pipeline_success"):
        complete_workflow(website_name, "full-pipeline:default")
    else:
        fail_step(website_name, "full-pipeline:default", "pipeline", "Pipeline incomplete")

    return result
