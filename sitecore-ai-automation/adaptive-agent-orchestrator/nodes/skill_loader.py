"""
Skill Loader Node
Reads skill .md files and injects their FULL content as system context.
This is the enforcer — Claude cannot skip skills because they ARE the prompt.
"""

import os
import yaml
from pathlib import Path

# Root of sitecore-ai-automation (parent of adaptive-agent-orchestrator)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Path to skill-map config
SKILL_MAP_PATH = Path(__file__).resolve().parent.parent / "config" / "skill-map.yaml"


def _load_skill_map():
    """Load the skill-to-context mapping config."""
    with open(SKILL_MAP_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _read_file(relative_path: str) -> str:
    """Read a file relative to PROJECT_ROOT."""
    full_path = PROJECT_ROOT / relative_path
    if not full_path.exists():
        raise FileNotFoundError(f"Skill/sample file not found: {full_path}")
    with open(full_path, "r", encoding="utf-8") as f:
        return f.read()


def _load_env_config() -> dict:
    """Load environment config from config/environments.json."""
    import json
    config_path = PROJECT_ROOT / "config" / "environments.json"
    if not config_path.exists():
        return {}
    with open(config_path, "r", encoding="utf-8") as f:
        return json.safe_load(f) if hasattr(json, 'safe_load') else json.load(f)


def _load_memory_patterns() -> list[str]:
    """Load cross-website learned patterns from state/memory.json."""
    import json
    memory_path = Path(__file__).resolve().parent.parent / "state" / "memory.json"
    if not memory_path.exists():
        return []
    with open(memory_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("patterns", [])


def load_skills_for_workflow(state: dict) -> dict:
    """
    Graph node: Load skill files + samples for the current workflow.
    Builds the accumulated skill_context that becomes the system prompt.
    """
    workflow_name = state.get("current_step", "").split(":")[0] if ":" in state.get("current_step", "") else state.get("workflow_name", "")

    skill_map = _load_skill_map()
    workflow_config = skill_map.get(workflow_name, {})
    load_config = workflow_config.get("load-skills", {})

    parts = []

    # 1. Core identity
    parts.append(
        "You are a Sitecore XM Cloud automation agent.\n"
        "You generate YAML serialization files, GraphQL queries, and CLI commands for Sitecore items.\n"
        "You MUST follow the skill instructions and sample patterns EXACTLY.\n"
        "NEVER improvise. NEVER add fields not in the schema. NEVER skip base templates.\n"
        "Output ONLY what is asked — no explanations, no markdown fences unless specified."
    )

    # 2. Environment config
    env_config = _load_env_config()
    if env_config:
        parts.append(f"## Environment Config\n```json\n{yaml.dump(env_config, default_flow_style=False)}\n```")

    # 3. Learned patterns (cross-website memory)
    patterns = _load_memory_patterns()
    if patterns:
        parts.append("## CRITICAL: Learned Patterns (from previous projects)\nThese patterns were discovered from real failures. Follow them strictly.")
        for p in patterns:
            if isinstance(p, dict):
                parts.append(f"- {p.get('pattern', str(p))}")
            else:
                parts.append(f"- {p}")

    # 4. Skill files (the main context)
    skill_refs = load_config.get("skills", [])
    for ref in skill_refs:
        try:
            content = _read_file(ref)
            parts.append(f"## SKILL: {ref}\n\n{content}")
        except FileNotFoundError as e:
            parts.append(f"## WARNING: Skill file not found: {ref}\n{str(e)}")

    # 5. Sample files
    sample_refs = load_config.get("samples", [])
    for ref in sample_refs:
        try:
            full_path = PROJECT_ROOT / ref
            if full_path.is_dir():
                # Load all YAML files in directory
                for yml_file in sorted(full_path.rglob("*.yml")):
                    rel = yml_file.relative_to(PROJECT_ROOT)
                    content = yml_file.read_text(encoding="utf-8")
                    parts.append(f"## SAMPLE: {rel}\n```yaml\n{content}\n```")
            else:
                content = _read_file(ref)
                parts.append(f"## SAMPLE: {ref}\n```yaml\n{content}\n```")
        except FileNotFoundError as e:
            parts.append(f"## WARNING: Sample file not found: {ref}\n{str(e)}")

    skill_context = "\n\n---\n\n".join(parts)

    return {
        "skill_context": skill_context,
        "env_config": env_config,
        "learned_patterns": patterns,
        "current_step": "skills-loaded",
    }


def load_skills_for_node(workflow_name: str, extra_skills: list[str] = None, extra_samples: list[str] = None) -> str:
    """
    Utility function: Load skills for a specific workflow + optional extras.
    Returns the assembled context string.
    Use this when a graph node needs to load additional skills mid-workflow.
    """
    state = {"workflow_name": workflow_name, "current_step": ""}
    result = load_skills_for_workflow(state)
    context = result["skill_context"]

    # Append extra skills if provided
    if extra_skills:
        for ref in extra_skills:
            try:
                content = _read_file(ref)
                context += f"\n\n---\n\n## ADDITIONAL SKILL: {ref}\n\n{content}"
            except FileNotFoundError:
                pass

    if extra_samples:
        for ref in extra_samples:
            try:
                content = _read_file(ref)
                context += f"\n\n---\n\n## ADDITIONAL SAMPLE: {ref}\n```yaml\n{content}\n```"
            except FileNotFoundError:
                pass

    return context
