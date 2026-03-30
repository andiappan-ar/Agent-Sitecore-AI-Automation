"""
Create Page Graph
Generates page YAML + data folder + datasource items + __Renderings XML.

Graph:
    load_skills → generate_page → generate_datasources → generate_renderings_xml
              → validate → fix_loop → save
"""

import uuid
from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages
from langchain_core.messages import HumanMessage

from nodes.skill_loader import load_skills_for_workflow, PROJECT_ROOT
from nodes.generator import generate_yaml
from nodes.validator import validate_sitecore_yaml
from nodes.memory_manager import learn_from_fix
from nodes.website_tracker import (
    start_workflow,
    complete_workflow,
    fail_step,
    load_state as load_website_state,
)


class PageState(TypedDict):
    website_name: str
    collection: str
    site: str
    skill_context: str
    env_config: dict
    learned_patterns: list[str]
    messages: Annotated[list, add_messages]
    current_step: str
    step_outputs: dict
    validation_errors: list[str]
    fix_attempts: int
    generated_ids: dict

    # Page-specific
    page_name: str
    page_url: str
    page_template: str
    components: list[dict]  # [{ "name": "HeroCentered", "template_id": "...", "rendering_id": "..." }]
    page_id: str
    data_folder_id: str
    output_files: dict


def load_skills(state: PageState) -> dict:
    """Load content-authoring skills."""
    skill_state = {"workflow_name": "create-page", "current_step": ""}
    result = load_skills_for_workflow(skill_state)

    # Load existing generated IDs for this website
    ws_state = load_website_state(state["website_name"])
    gen_ids = ws_state.get("generated_ids", {})

    return {
        "skill_context": result["skill_context"],
        "env_config": result.get("env_config", {}),
        "learned_patterns": result.get("learned_patterns", []),
        "generated_ids": gen_ids,
        "current_step": "skills-loaded",
    }


def prepare_page(state: PageState) -> dict:
    """Prepare page IDs and resolve component references."""
    page_id = str(uuid.uuid4())
    data_folder_id = str(uuid.uuid4())

    # Resolve component IDs from website state
    gen_ids = state.get("generated_ids", {})
    components = state.get("components", [])
    resolved = []
    for comp in components:
        name = comp.get("name", "")
        resolved.append({
            **comp,
            "template_id": gen_ids.get("templates", {}).get(name, comp.get("template_id", "")),
            "rendering_id": gen_ids.get("renderings", {}).get(name, comp.get("rendering_id", "")),
            "datasource_id": str(uuid.uuid4()),
        })

    return {
        "page_id": page_id,
        "data_folder_id": data_folder_id,
        "components": resolved,
        "current_step": "page-prepared",
    }


def generate_page_files(state: PageState) -> dict:
    """Generate page YAML, data folder, and datasource items."""
    page_name = state["page_name"]
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")
    website = state["website_name"]
    page_id = state["page_id"]
    data_folder_id = state["data_folder_id"]
    components = state.get("components", [])

    base_dir = PROJECT_ROOT / "generated" / website / "pages"
    output_files = {}

    # Generate page YAML
    page_prompt = f"""Generate a Sitecore page YAML for '{page_name}'.

Page ID: {page_id}
Path: /sitecore/content/{collection}/{site}/Home/{page_name}
Page URL: {state.get('page_url', f'/{page_name.lower()}')}

Include fields: Title, NavigationTitle
Language: en, Version: 1

Output ONLY the YAML content."""

    print(f"  Generating page YAML...")
    page_content = generate_yaml(state, page_prompt)
    output_files["page"] = {
        "path": str(base_dir / "en" / page_name / f"{page_name}.yml"),
        "content": page_content,
    }

    # Generate data folder
    if components:
        folder_prompt = f"""Generate a Sitecore Data folder YAML.

Folder ID: {data_folder_id}
Parent: {page_id}
Path: /sitecore/content/{collection}/{site}/Home/{page_name}/Data
Template: fe5dd826-48c6-436d-b87a-7c4210c7413b (Folder)

Output ONLY the YAML content."""

        print(f"  Generating data folder...")
        folder_content = generate_yaml(state, folder_prompt)
        output_files["data_folder"] = {
            "path": str(base_dir / "en" / page_name / "Data.yml"),
            "content": folder_content,
        }

    # Generate datasource items
    for comp in components:
        ds_prompt = f"""Generate a Sitecore datasource item YAML for component '{comp['name']}'.

Datasource ID: {comp['datasource_id']}
Parent: {data_folder_id}
Path: /sitecore/content/{collection}/{site}/Home/{page_name}/Data/{comp['name']}
Template: {comp.get('template_id', 'MISSING')}

Include placeholder field values for all fields in this component template.
Language: en, Version: 1

Output ONLY the YAML content."""

        print(f"  Generating datasource: {comp['name']}...")
        ds_content = generate_yaml(state, ds_prompt)
        output_files[f"datasource_{comp['name']}"] = {
            "path": str(base_dir / "en" / page_name / "Data" / f"{comp['name']}.yml"),
            "content": ds_content,
        }

    return {
        "output_files": output_files,
        "current_step": "page-files-generated",
    }


def validate_page(state: PageState) -> dict:
    """Validate page files."""
    output_files = state.get("output_files", {})
    errors = []

    for key, file_data in output_files.items():
        result = validate_sitecore_yaml(file_data["content"])
        if not result:
            for err in result.errors:
                errors.append(f"[{key}] {err}")

    if errors:
        print(f"  Validation FAILED ({len(errors)} errors)")
        return {
            "validation_errors": errors,
            "fix_attempts": state.get("fix_attempts", 0) + 1,
            "current_step": "page-validation-failed",
        }

    print("  Validation PASSED")
    return {
        "validation_errors": [],
        "current_step": "page-validation-passed",
    }


def fix_page_files(state: PageState) -> dict:
    """Fix validation errors in page files."""
    errors = state.get("validation_errors", [])
    output_files = state.get("output_files", {})

    print(f"  Fix Agent: Fixing {len(errors)} errors...")

    for key, file_data in output_files.items():
        file_errors = [e for e in errors if key in e]
        if not file_errors:
            continue

        fix_prompt = f"""Fix the following YAML file. Errors:
{chr(10).join(f'- {e}' for e in file_errors)}

Current content:
```yaml
{file_data['content']}
```

Output ONLY the corrected YAML."""

        fixed = generate_yaml(state, fix_prompt)
        output_files[key]["content"] = fixed

    learn_from_fix(state)
    return {"output_files": output_files, "current_step": "page-files-fixed"}


def save_page_files(state: PageState) -> dict:
    """Save page files to disk."""
    output_files = state.get("output_files", {})

    for key, file_data in output_files.items():
        path = Path(file_data["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(file_data["content"], encoding="utf-8")
        print(f"  Saved: {path.relative_to(PROJECT_ROOT)}")

    return {"current_step": "page-saved"}


def route_after_validation(state: PageState) -> str:
    if not state.get("validation_errors"):
        return "save"
    if state.get("fix_attempts", 0) >= 3:
        return "save"
    return "fix"


def build_create_page_graph() -> StateGraph:
    graph = StateGraph(PageState)

    graph.add_node("load_skills", load_skills)
    graph.add_node("prepare", prepare_page)
    graph.add_node("generate", generate_page_files)
    graph.add_node("validate", validate_page)
    graph.add_node("fix", fix_page_files)
    graph.add_node("save", save_page_files)

    graph.add_edge(START, "load_skills")
    graph.add_edge("load_skills", "prepare")
    graph.add_edge("prepare", "generate")
    graph.add_edge("generate", "validate")
    graph.add_conditional_edges("validate", route_after_validation, ["save", "fix"])
    graph.add_edge("fix", "validate")
    graph.add_edge("save", END)

    return graph


def run_create_page(website_name: str, inputs: dict):
    """Execute the create-page workflow."""
    page_name = inputs.get("pageName", inputs.get("page_name", ""))
    if not page_name:
        print("Error: pageName is required")
        return

    import yaml as _yaml
    config_path = Path(__file__).parent.parent / "config" / "websites.yaml"
    collection = "Adnoc"
    site = website_name
    if config_path.exists():
        with open(config_path) as f:
            wc = _yaml.safe_load(f)
        ws = wc.get("websites", {}).get(website_name, {})
        collection = ws.get("collection", collection)
        site = ws.get("site", site)

    components = inputs.get("components", [])
    if isinstance(components, str):
        import json
        components = json.loads(components)

    start_workflow(website_name, "create-page", inputs)

    print(f"\nCreating page: {page_name}")
    print(f"  Components: {[c.get('name', '?') for c in components] if components else 'none'}")
    print("-" * 40)

    graph = build_create_page_graph()
    app = graph.compile()

    initial_state = {
        "website_name": website_name,
        "collection": collection,
        "site": site,
        "skill_context": "",
        "env_config": {},
        "learned_patterns": [],
        "messages": [],
        "current_step": "starting",
        "step_outputs": {},
        "validation_errors": [],
        "fix_attempts": 0,
        "generated_ids": {},
        "page_name": page_name,
        "page_url": inputs.get("pageUrl", inputs.get("page_url", f"/{page_name.lower()}")),
        "page_template": inputs.get("pageTemplate", ""),
        "components": components,
        "page_id": "",
        "data_folder_id": "",
        "output_files": {},
    }

    result = app.invoke(initial_state)

    if not result.get("validation_errors"):
        complete_workflow(website_name, f"create-page:{page_name}")
        print(f"\nPage '{page_name}' created successfully!")
    else:
        fail_step(website_name, f"create-page:{page_name}", "create-page", "Validation issues")

    return result
