"""
Website Tracker
Manages per-website state — progress, generated IDs, workflow runs.
State persists in state/websites/{name}.state.json
"""

import json
import uuid
from datetime import datetime
from pathlib import Path

STATE_DIR = Path(__file__).resolve().parent.parent / "state" / "websites"


def _state_path(website_name: str) -> Path:
    return STATE_DIR / f"{website_name}.state.json"


def load_state(website_name: str) -> dict:
    """Load website state from disk. Returns empty state if not found."""
    path = _state_path(website_name)
    if not path.exists():
        return {
            "website_name": website_name,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "workflows": {},
            "generated_ids": {"templates": {}, "renderings": {}, "fields": {}},
        }
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(website_name: str, state: dict):
    """Save website state to disk."""
    state["updated_at"] = datetime.now().isoformat()
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(_state_path(website_name), "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def start_workflow(website_name: str, workflow_id: str, inputs: dict) -> dict:
    """Record the start of a workflow run."""
    state = load_state(website_name)
    key = f"{workflow_id}:{inputs.get('componentName', inputs.get('pageName', 'default'))}"

    state["workflows"][key] = {
        "workflow_id": workflow_id,
        "inputs": inputs,
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "steps": {},
        "errors": [],
    }

    save_state(website_name, state)
    return state


def complete_step(website_name: str, workflow_key: str, step_id: str, output: str = None):
    """Mark a workflow step as completed."""
    state = load_state(website_name)
    wf = state["workflows"].get(workflow_key, {})
    wf.setdefault("steps", {})[step_id] = {
        "status": "completed",
        "completed_at": datetime.now().isoformat(),
        "output_preview": (output[:200] + "...") if output and len(output) > 200 else output,
    }
    save_state(website_name, state)


def fail_step(website_name: str, workflow_key: str, step_id: str, error: str):
    """Mark a workflow step as failed."""
    state = load_state(website_name)
    wf = state["workflows"].get(workflow_key, {})
    wf.setdefault("steps", {})[step_id] = {
        "status": "failed",
        "failed_at": datetime.now().isoformat(),
        "error": error,
    }
    wf.setdefault("errors", []).append({"step": step_id, "error": error})
    save_state(website_name, state)


def complete_workflow(website_name: str, workflow_key: str):
    """Mark a workflow as completed."""
    state = load_state(website_name)
    wf = state["workflows"].get(workflow_key, {})
    wf["status"] = "completed"
    wf["completed_at"] = datetime.now().isoformat()
    save_state(website_name, state)


def get_resume_point(website_name: str, workflow_key: str) -> str | None:
    """Find the last completed step to resume from."""
    state = load_state(website_name)
    wf = state["workflows"].get(workflow_key, {})
    steps = wf.get("steps", {})

    last_completed = None
    for step_id, step_data in steps.items():
        if step_data.get("status") == "completed":
            last_completed = step_id

    return last_completed


def register_generated_id(website_name: str, category: str, name: str, guid: str):
    """
    Register a generated GUID for tracking.

    Args:
        website_name: e.g., "adnocgas"
        category: "templates", "renderings", or "fields"
        name: Item name (e.g., "HeroCentered")
        guid: The generated UUID
    """
    state = load_state(website_name)
    state["generated_ids"].setdefault(category, {})[name] = guid
    save_state(website_name, state)


def generate_component_ids(component_name: str, fields: list[dict]) -> dict:
    """
    Pre-generate all UUIDs for a component.
    Called BEFORE any LLM calls to ensure consistent IDs.

    Returns:
        Dict with all pre-generated IDs
    """
    ids = {
        "template_id": str(uuid.uuid4()),
        "field_section_id": str(uuid.uuid4()),
        "standard_values_id": str(uuid.uuid4()),
        "rendering_id": str(uuid.uuid4()),
        "field_ids": {},
    }

    for field in fields:
        ids["field_ids"][field["name"]] = str(uuid.uuid4())

    return ids


def list_websites() -> list[dict]:
    """List all tracked websites with summary status."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    websites = []

    for state_file in sorted(STATE_DIR.glob("*.state.json")):
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
        workflows = state.get("workflows", {})
        completed = sum(1 for w in workflows.values() if w.get("status") == "completed")
        running = sum(1 for w in workflows.values() if w.get("status") == "running")

        websites.append({
            "name": state.get("website_name", state_file.stem.replace(".state", "")),
            "workflows_total": len(workflows),
            "workflows_completed": completed,
            "workflows_running": running,
            "updated_at": state.get("updated_at", ""),
        })

    return websites
