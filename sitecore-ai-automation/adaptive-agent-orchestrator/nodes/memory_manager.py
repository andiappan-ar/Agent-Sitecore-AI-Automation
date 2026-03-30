"""
Memory Manager Node
Persists learned patterns across websites.
Patterns discovered from one website are automatically applied to future websites.
"""

import json
from datetime import datetime
from pathlib import Path

MEMORY_PATH = Path(__file__).resolve().parent.parent / "state" / "memory.json"


def _load_memory() -> dict:
    """Load memory from disk."""
    if not MEMORY_PATH.exists():
        return {"patterns": [], "validation_rules": [], "updated_at": None}
    with open(MEMORY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_memory(memory: dict):
    """Save memory to disk."""
    memory["updated_at"] = datetime.now().isoformat()
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MEMORY_PATH, "w", encoding="utf-8") as f:
        json.dump(memory, f, indent=2)


def get_patterns() -> list[str]:
    """Get all learned patterns as strings for system prompt injection."""
    memory = _load_memory()
    result = []
    for p in memory.get("patterns", []):
        if isinstance(p, dict):
            result.append(p.get("pattern", str(p)))
        else:
            result.append(str(p))
    return result


def add_pattern(pattern: str, category: str, learned_from: str):
    """
    Add a new learned pattern to memory.

    Args:
        pattern: The pattern description (e.g., "Always include _PerSiteStandardValues GUID")
        category: Category (e.g., "template-generation", "gotcha", "validation")
        learned_from: Which website this was learned from
    """
    memory = _load_memory()

    # Check for duplicates
    existing = [p.get("pattern", "") if isinstance(p, dict) else str(p) for p in memory["patterns"]]
    if pattern in existing:
        return

    memory["patterns"].append({
        "pattern": pattern,
        "category": category,
        "learned_from": learned_from,
        "date_added": datetime.now().strftime("%Y-%m-%d"),
    })

    _save_memory(memory)


def add_validation_rule(rule: str, severity: str = "error", added_after_failure: str = None):
    """
    Add a validation rule learned from a failure.

    Args:
        rule: The validation rule
        severity: "error" or "warning"
        added_after_failure: Context about which failure triggered this rule
    """
    memory = _load_memory()

    existing = [r.get("rule", "") if isinstance(r, dict) else str(r) for r in memory.get("validation_rules", [])]
    if rule in existing:
        return

    if "validation_rules" not in memory:
        memory["validation_rules"] = []

    memory["validation_rules"].append({
        "rule": rule,
        "severity": severity,
        "added_after_failure": added_after_failure,
        "date_added": datetime.now().strftime("%Y-%m-%d"),
    })

    _save_memory(memory)


def learn_from_fix(state: dict) -> dict:
    """
    Graph node: After a successful fix, extract and save the pattern.
    This is called when a validation failure was fixed — we save what we learned.
    """
    website = state.get("website_name", "unknown")
    errors = state.get("validation_errors", [])
    step = state.get("current_step", "")

    for error in errors:
        # Convert validation errors to learned patterns
        if "PerSiteStandardValues" in error:
            add_pattern(
                "Every custom datasource template MUST inherit _PerSiteStandardValues ({44A022DB-56D3-419A-B43B-E27E4D8E9C41})",
                category="template-generation",
                learned_from=website,
            )
        elif "__Base template" in error:
            add_pattern(
                "Template root __Base template must include Standard ({1930BBEB...}) and _PerSiteStandardValues ({44A022DB...})",
                category="template-generation",
                learned_from=website,
            )
        elif "field Type" in error.lower():
            add_pattern(
                f"Field items must have a valid Type value in SharedFields",
                category="field-generation",
                learned_from=website,
            )

        # Also save as validation rule
        add_validation_rule(
            rule=error,
            severity="error",
            added_after_failure=f"{website}/{step}",
        )

    return {"learned_patterns": get_patterns()}
