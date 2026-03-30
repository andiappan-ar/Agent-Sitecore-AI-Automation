"""
Create Component Graph
Generates the 5-file YAML set for a Sitecore component:
  1. Template root
  2. Field section
  3. Field items (per field)
  4. Standard values
  5. Rendering definition

Graph with fix loop:
    load_skills → generate_template → validate → pass? → save → next_file ...
                                                  ↓ no
                                              fix_agent → validate (loop, max 3)
"""

import os
import uuid
from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages
from langchain_core.messages import HumanMessage, SystemMessage

from nodes.skill_loader import load_skills_for_workflow, PROJECT_ROOT
from nodes.generator import generate_yaml, _get_model
from nodes.validator import (
    validate_template_root,
    validate_field_item,
    validate_rendering,
    validate_sitecore_yaml,
    validate_cross_files,
)
from nodes.memory_manager import learn_from_fix, get_patterns
from nodes.website_tracker import (
    start_workflow,
    complete_step,
    complete_workflow,
    fail_step,
    register_generated_id,
    generate_component_ids,
)


class ComponentState(TypedDict):
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

    # Component-specific
    component_name: str
    component_type: str
    fields: list[dict]
    ids: dict  # Pre-generated UUIDs
    output_files: dict  # { file_key: { path, content } }
    current_file: str  # Which file we're generating now
    all_files_generated: bool


def load_skills(state: ComponentState) -> dict:
    """Load serialization skills + samples."""
    skill_state = {"workflow_name": "create-component", "current_step": ""}
    result = load_skills_for_workflow(skill_state)

    # Load website config for collection/site info
    env_config = result.get("env_config", {})

    return {
        "skill_context": result["skill_context"],
        "env_config": env_config,
        "learned_patterns": result.get("learned_patterns", []),
        "current_step": "skills-loaded",
    }


def prepare_ids(state: ComponentState) -> dict:
    """Pre-generate all UUIDs before any LLM calls."""
    fields = state.get("fields", [])
    ids = generate_component_ids(state["component_name"], fields)

    return {
        "ids": ids,
        "current_step": "ids-prepared",
        "step_outputs": {**state.get("step_outputs", {}), "ids": ids},
    }


def _build_template_prompt(state: ComponentState) -> str:
    """Build the prompt for template root generation."""
    ids = state["ids"]
    name = state["component_name"]
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")

    return f"""Generate the template root YAML file for the '{name}' component.

Use these pre-generated IDs (do NOT generate your own):
- Template ID: {ids['template_id']}
- Standard Values ID: {ids['standard_values_id']}

Path: /sitecore/templates/Project/{collection}/Components/{site}/{name}
Template: ab86861a-6030-46c5-b394-e8f99e8b87db

CRITICAL requirements:
- __Base template MUST include BOTH:
  - {{1930BBEB-7805-471A-A3BE-4858AC7CF696}} (Standard)
  - {{44A022DB-56D3-419A-B43B-E27E4D8E9C41}} (_PerSiteStandardValues)
- __Standard values field must reference: {{{ids['standard_values_id']}}}
- Match the SAMPLE YAML format exactly

Output ONLY the YAML content, no explanations."""


def _build_field_section_prompt(state: ComponentState) -> str:
    ids = state["ids"]
    name = state["component_name"]
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")

    return f"""Generate the field section YAML for the '{name}' component.

Use these pre-generated IDs:
- Field Section ID: {ids['field_section_id']}
- Parent (template root): {ids['template_id']}

Path: /sitecore/templates/Project/{collection}/Components/{site}/{name}/Content
Template: e269fbb5-3750-427a-9149-7aa950b49301

The section name should be 'Content'.

Output ONLY the YAML content, no explanations."""


def _build_field_item_prompt(state: ComponentState, field: dict, field_id: str) -> str:
    ids = state["ids"]
    name = state["component_name"]
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")
    field_name = field["name"]
    field_type = field["type"]
    sort_order = field.get("sort_order", 100)

    return f"""Generate the field item YAML for field '{field_name}' of component '{name}'.

Use these pre-generated IDs:
- Field ID: {field_id}
- Parent (field section): {ids['field_section_id']}

Path: /sitecore/templates/Project/{collection}/Components/{site}/{name}/Content/{field_name}
Template: 455a3e98-a627-4b40-8035-e683a0331ac7

Field Type: {field_type}
Sort Order: {sort_order}
Title: {field_name.replace('_', ' ').title()}

Output ONLY the YAML content, no explanations."""


def _build_standard_values_prompt(state: ComponentState) -> str:
    ids = state["ids"]
    name = state["component_name"]
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")

    return f"""Generate the __Standard Values YAML for the '{name}' component.

Use these pre-generated IDs:
- Standard Values ID: {ids['standard_values_id']}
- Parent (template root): {ids['template_id']}
- Template: {ids['template_id']}

Path: /sitecore/templates/Project/{collection}/Components/{site}/{name}/__Standard Values

The Standard Values item uses the SAME template as its parent (the component template itself).
Include empty __Renderings and __Final Renderings fields.

Output ONLY the YAML content, no explanations."""


def _build_rendering_prompt(state: ComponentState) -> str:
    ids = state["ids"]
    name = state["component_name"]
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")

    return f"""Generate the rendering definition YAML for the '{name}' component.

Use these pre-generated IDs:
- Rendering ID: {ids['rendering_id']}

Path: /sitecore/layout/Renderings/Project/{collection}/{site}/{name}
Template: 04646a89-996f-4ee7-878a-ffdbf1f0ef0d

Required SharedFields:
- Component Name: {name}
- Datasource Location: query:./ancestor-or-self::*[@@templateid='{{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}}']/Data/{name}
- Datasource Template: {ids['template_id']}
- Rendering CSS Class (can be empty)

Output ONLY the YAML content, no explanations."""


def generate_all_files(state: ComponentState) -> dict:
    """Generate all 5+ YAML files for the component."""
    name = state["component_name"]
    fields = state.get("fields", [])
    ids = state["ids"]
    output_files = {}
    collection = state.get("collection", "Adnoc")
    site = state.get("site", "adnocgas")
    website = state["website_name"]

    base_dir = PROJECT_ROOT / "generated" / website

    print(f"  Generating template root...")
    template_content = generate_yaml(state, _build_template_prompt(state))
    template_path = base_dir / "templates" / name / f"{name}.yml"
    output_files["template_root"] = {"path": str(template_path), "content": template_content}

    print(f"  Generating field section...")
    section_content = generate_yaml(state, _build_field_section_prompt(state))
    section_path = base_dir / "templates" / name / "Content" / "Content.yml"
    output_files["field_section"] = {"path": str(section_path), "content": section_content}

    print(f"  Generating field items...")
    for i, field in enumerate(fields):
        field_name = field["name"]
        field_id = ids["field_ids"].get(field_name, str(uuid.uuid4()))
        field_with_order = {**field, "sort_order": (i + 1) * 100}
        content = generate_yaml(state, _build_field_item_prompt(state, field_with_order, field_id))
        path = base_dir / "templates" / name / "Content" / f"{field_name}.yml"
        output_files[f"field_{field_name}"] = {"path": str(path), "content": content}

    print(f"  Generating standard values...")
    sv_content = generate_yaml(state, _build_standard_values_prompt(state))
    sv_path = base_dir / "templates" / name / "__Standard Values.yml"
    output_files["standard_values"] = {"path": str(sv_path), "content": sv_content}

    print(f"  Generating rendering...")
    rendering_content = generate_yaml(state, _build_rendering_prompt(state))
    rendering_path = base_dir / "renderings" / f"{name}.yml"
    output_files["rendering"] = {"path": str(rendering_path), "content": rendering_content}

    return {
        "output_files": output_files,
        "current_step": "files-generated",
    }


def validate_all(state: ComponentState) -> dict:
    """Validate all generated files."""
    output_files = state.get("output_files", {})
    all_errors = []

    for key, file_data in output_files.items():
        content = file_data["content"]

        if key == "template_root":
            result = validate_template_root(content)
        elif key.startswith("field_"):
            result = validate_field_item(content)
        elif key == "rendering":
            result = validate_rendering(content)
        else:
            result = validate_sitecore_yaml(content)

        if not result:
            for err in result.errors:
                all_errors.append(f"[{key}] {err}")

    # Cross-file validation
    file_contents = {k: v["content"] for k, v in output_files.items()}
    cross_result = validate_cross_files(file_contents)
    if not cross_result:
        all_errors.extend(cross_result.errors)

    if all_errors:
        print(f"  Validation FAILED ({len(all_errors)} errors):")
        for err in all_errors[:5]:
            print(f"    - {err}")
        return {
            "validation_errors": all_errors,
            "fix_attempts": state.get("fix_attempts", 0) + 1,
            "current_step": "validation-failed",
        }

    print("  Validation PASSED")
    return {
        "validation_errors": [],
        "current_step": "validation-passed",
    }


def fix_files(state: ComponentState) -> dict:
    """
    Fix Agent: Analyze validation errors and regenerate broken files.
    This is NOT a blind retry — it tells Claude exactly what went wrong.
    """
    errors = state.get("validation_errors", [])
    output_files = state.get("output_files", {})

    print(f"  Fix Agent: Analyzing {len(errors)} errors (attempt {state.get('fix_attempts', 0)})...")

    # Build fix prompt with error context
    error_summary = "\n".join(f"- {e}" for e in errors)

    for key, file_data in output_files.items():
        # Check if this file has errors
        file_errors = [e for e in errors if key in e or key.replace("_", "-") in e]
        if not file_errors:
            continue

        fix_prompt = f"""The following YAML file has validation errors. Fix them.

FILE: {key}
ERRORS:
{chr(10).join(f'- {e}' for e in file_errors)}

CURRENT CONTENT:
```yaml
{file_data['content']}
```

Fix the errors while keeping the structure intact. Output ONLY the corrected YAML, no explanations."""

        fixed_content = generate_yaml(state, fix_prompt)
        output_files[key]["content"] = fixed_content

    # Learn from the fix
    learn_from_fix(state)

    return {
        "output_files": output_files,
        "current_step": "files-fixed",
    }


def save_files(state: ComponentState) -> dict:
    """Save all validated YAML files to disk."""
    output_files = state.get("output_files", {})
    website = state["website_name"]
    name = state["component_name"]
    ids = state["ids"]

    for key, file_data in output_files.items():
        path = Path(file_data["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(file_data["content"], encoding="utf-8")
        print(f"  Saved: {path.relative_to(PROJECT_ROOT)}")

    # Register generated IDs
    register_generated_id(website, "templates", name, ids["template_id"])
    register_generated_id(website, "renderings", name, ids["rendering_id"])

    return {
        "current_step": "files-saved",
        "all_files_generated": True,
    }


def route_after_validation(state: ComponentState) -> str:
    """Route based on validation result."""
    if not state.get("validation_errors"):
        return "save_files"
    if state.get("fix_attempts", 0) >= 3:
        return "save_files"  # Save anyway after 3 attempts, with warnings
    return "fix_files"


# Build the graph
def build_create_component_graph() -> StateGraph:
    graph = StateGraph(ComponentState)

    # Nodes
    graph.add_node("load_skills", load_skills)
    graph.add_node("prepare_ids", prepare_ids)
    graph.add_node("generate_files", generate_all_files)
    graph.add_node("validate", validate_all)
    graph.add_node("fix_files", fix_files)
    graph.add_node("save_files", save_files)

    # Edges — enforced step order
    graph.add_edge(START, "load_skills")
    graph.add_edge("load_skills", "prepare_ids")
    graph.add_edge("prepare_ids", "generate_files")
    graph.add_edge("generate_files", "validate")

    # Fix loop
    graph.add_conditional_edges("validate", route_after_validation, ["save_files", "fix_files"])
    graph.add_edge("fix_files", "validate")  # Loop back to validate after fix

    graph.add_edge("save_files", END)

    return graph


def run_create_component(website_name: str, inputs: dict):
    """Execute the create-component workflow."""
    component_name = inputs.get("componentName", inputs.get("component_name", ""))
    component_type = inputs.get("componentType", inputs.get("component_type", ""))

    if not component_name:
        print("Error: componentName is required")
        return

    # Parse fields if provided as string
    fields = inputs.get("fields", [])
    if isinstance(fields, str):
        import json
        fields = json.loads(fields)

    # Default fields if none provided
    if not fields:
        fields = [
            {"name": "heading", "type": "Single-Line Text"},
            {"name": "description", "type": "Rich Text"},
        ]
        print(f"  No fields specified, using defaults: {[f['name'] for f in fields]}")

    # Load website config for collection/site
    import yaml as _yaml
    config_path = Path(__file__).parent.parent / "config" / "websites.yaml"
    collection = "Adnoc"
    site = website_name
    if config_path.exists():
        with open(config_path) as f:
            websites_config = _yaml.safe_load(f)
        ws = websites_config.get("websites", {}).get(website_name, {})
        collection = ws.get("collection", collection)
        site = ws.get("site", site)

    # Track workflow
    start_workflow(website_name, "create-component", inputs)
    workflow_key = f"create-component:{component_name}"

    print(f"\nCreating component: {component_name}")
    print(f"  Collection: {collection}, Site: {site}")
    print(f"  Fields: {[f['name'] for f in fields]}")
    print("-" * 40)

    # Build and run graph
    graph = build_create_component_graph()
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
        "component_name": component_name,
        "component_type": component_type,
        "fields": fields,
        "ids": {},
        "output_files": {},
        "current_file": "",
        "all_files_generated": False,
    }

    result = app.invoke(initial_state)

    # Update tracking
    if result.get("all_files_generated"):
        complete_workflow(website_name, workflow_key)
        print(f"\nComponent '{component_name}' created successfully!")
        if result.get("validation_errors"):
            print(f"  (with {len(result['validation_errors'])} unresolved warnings)")
    else:
        fail_step(website_name, workflow_key, "create-component", "Generation failed")
        print(f"\nComponent '{component_name}' creation FAILED.")

    return result
