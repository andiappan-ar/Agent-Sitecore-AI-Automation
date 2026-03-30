"""
Fix Agent Graph
Intelligent fix/debug loop for failed outputs.
Not a blind retry — analyzes what went wrong, reasons about the fix,
and applies a targeted correction.

Graph:
    analyze_error → decide_fix_strategy → apply_fix → validate → pass? → done
                                                         ↓ no
                                                    analyze_error (loop, max 3)
"""

from typing import TypedDict, Annotated
from pathlib import Path

from langgraph.graph import StateGraph, START, END, add_messages
from langchain_core.messages import HumanMessage

from nodes.skill_loader import load_skills_for_node
from nodes.generator import generate_yaml, generate_with_prompt
from nodes.validator import validate_sitecore_yaml, validate_template_root, validate_rendering
from nodes.memory_manager import learn_from_fix, add_pattern


class FixState(TypedDict):
    website_name: str
    skill_context: str
    messages: Annotated[list, add_messages]

    # What we're fixing
    file_path: str
    file_content: str
    file_type: str  # "template_root", "field_item", "rendering", "page", etc.
    original_errors: list[str]

    # Fix tracking
    current_errors: list[str]
    fix_attempts: int
    fix_strategy: str
    fixed_content: str
    is_fixed: bool


def analyze_error(state: FixState) -> dict:
    """Analyze the validation errors to understand root cause."""
    errors = state.get("current_errors") or state.get("original_errors", [])
    content = state.get("file_content", "")

    print(f"  Analyzing {len(errors)} errors (attempt {state.get('fix_attempts', 0) + 1})...")

    analysis_prompt = f"""Analyze these validation errors in a Sitecore YAML file and explain the root cause.

ERRORS:
{chr(10).join(f'- {e}' for e in errors)}

FILE CONTENT:
```yaml
{content[:3000]}
```

Respond with:
1. ROOT CAUSE: (one sentence)
2. FIX STRATEGY: (specific steps to fix)"""

    result = generate_with_prompt(state, analysis_prompt)
    strategy = result["messages"][-1].content if result.get("messages") else "Retry with corrections"

    print(f"  Strategy: {strategy[:100]}...")

    return {
        "fix_strategy": strategy,
        "fix_attempts": state.get("fix_attempts", 0) + 1,
        "messages": result.get("messages", []),
    }


def apply_fix(state: FixState) -> dict:
    """Apply the fix based on the analysis."""
    errors = state.get("current_errors") or state.get("original_errors", [])
    content = state.get("file_content", "")
    strategy = state.get("fix_strategy", "")

    fix_prompt = f"""Fix this Sitecore YAML file based on the analysis below.

ERRORS:
{chr(10).join(f'- {e}' for e in errors)}

ANALYSIS & STRATEGY:
{strategy}

CURRENT CONTENT:
```yaml
{content}
```

Apply the fix. Output ONLY the corrected YAML, no explanations."""

    fixed = generate_yaml(state, fix_prompt)

    return {
        "fixed_content": fixed,
        "file_content": fixed,  # Update for next iteration
    }


def validate_fix(state: FixState) -> dict:
    """Validate the fixed content."""
    content = state.get("fixed_content", "")
    file_type = state.get("file_type", "")

    if file_type == "template_root":
        result = validate_template_root(content)
    elif file_type == "rendering":
        result = validate_rendering(content)
    else:
        result = validate_sitecore_yaml(content)

    if result:
        print("  Fix validated successfully!")

        # Learn from this fix
        learn_from_fix({
            "website_name": state.get("website_name", "unknown"),
            "validation_errors": state.get("original_errors", []),
            "current_step": f"fix-{file_type}",
        })

        return {
            "current_errors": [],
            "is_fixed": True,
        }
    else:
        print(f"  Fix still has {len(result.errors)} errors")
        return {
            "current_errors": result.errors,
            "is_fixed": False,
        }


def route_after_validation(state: FixState) -> str:
    """Route based on fix validation."""
    if state.get("is_fixed"):
        return END
    if state.get("fix_attempts", 0) >= 3:
        return END  # Give up after 3 attempts
    return "analyze"


def save_fix(state: FixState) -> dict:
    """Save the fixed file."""
    file_path = state.get("file_path", "")
    content = state.get("fixed_content", "")

    if file_path and content and state.get("is_fixed"):
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        print(f"  Saved fix: {file_path}")

    return {}


def build_fix_agent_graph() -> StateGraph:
    graph = StateGraph(FixState)

    graph.add_node("analyze", analyze_error)
    graph.add_node("fix", apply_fix)
    graph.add_node("validate", validate_fix)

    graph.add_edge(START, "analyze")
    graph.add_edge("analyze", "fix")
    graph.add_edge("fix", "validate")
    graph.add_conditional_edges("validate", route_after_validation, ["analyze", END])

    return graph


def fix_file(website_name: str, file_path: str, file_type: str, errors: list[str], skill_context: str = "") -> dict:
    """
    Run the fix agent on a single file.

    Args:
        website_name: Website context
        file_path: Path to the file to fix
        file_type: Type of file ("template_root", "rendering", etc.)
        errors: List of validation errors
        skill_context: Pre-loaded skill context (optional — loads from skill-map if empty)

    Returns:
        Dict with is_fixed, fixed_content
    """
    if not skill_context:
        skill_context = load_skills_for_node("create-component")

    content = Path(file_path).read_text(encoding="utf-8") if Path(file_path).exists() else ""

    graph = build_fix_agent_graph()
    app = graph.compile()

    result = app.invoke({
        "website_name": website_name,
        "skill_context": skill_context,
        "messages": [],
        "file_path": file_path,
        "file_content": content,
        "file_type": file_type,
        "original_errors": errors,
        "current_errors": errors,
        "fix_attempts": 0,
        "fix_strategy": "",
        "fixed_content": "",
        "is_fixed": False,
    })

    return {
        "is_fixed": result.get("is_fixed", False),
        "fixed_content": result.get("fixed_content", ""),
        "attempts": result.get("fix_attempts", 0),
    }
