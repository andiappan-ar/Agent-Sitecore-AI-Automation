"""
Validator Node
Validates step output before allowing progression to next step.
Acts as the gate between steps — blocks if output doesn't match requirements.
"""

import yaml
import re
from pathlib import Path


class ValidationResult:
    """Result of a validation check."""

    def __init__(self, passed: bool, errors: list[str] = None):
        self.passed = passed
        self.errors = errors or []

    def __bool__(self):
        return self.passed

    def __repr__(self):
        if self.passed:
            return "ValidationResult(PASS)"
        return f"ValidationResult(FAIL: {self.errors})"


def validate_yaml_structure(content: str, required_fields: list[str] = None, must_contain: list[str] = None) -> ValidationResult:
    """
    Validate that content is valid YAML with required fields.

    Args:
        content: Raw YAML string
        required_fields: Top-level keys that must exist (e.g., ["ID", "Parent", "Template", "Path"])
        must_contain: Substrings that must appear in the content (e.g., GUIDs)
    """
    errors = []

    # Parse YAML
    try:
        parsed = yaml.safe_load(content)
    except yaml.YAMLError as e:
        return ValidationResult(False, [f"Invalid YAML: {str(e)}"])

    if not isinstance(parsed, dict):
        return ValidationResult(False, ["YAML root must be a mapping/dict"])

    # Check required fields
    if required_fields:
        for field in required_fields:
            if field not in parsed:
                errors.append(f"Missing required field: {field}")

    # Check must-contain strings
    if must_contain:
        for substring in must_contain:
            if substring.lower() not in content.lower():
                errors.append(f"Must contain: {substring}")

    return ValidationResult(len(errors) == 0, errors)


def validate_sitecore_yaml(content: str) -> ValidationResult:
    """
    Validate a Sitecore serialization YAML file.
    Checks for standard Sitecore item fields.
    """
    return validate_yaml_structure(
        content,
        required_fields=["ID", "Parent", "Template", "Path"],
    )


def validate_template_root(content: str) -> ValidationResult:
    """
    Validate a template root YAML.
    Must have base templates including _PerSiteStandardValues.
    """
    base_result = validate_sitecore_yaml(content)
    if not base_result:
        return base_result

    errors = []

    # Must contain the template item template GUID
    if "ab86861a-6030-46c5-b394-e8f99e8b87db" not in content.lower():
        errors.append("Template field must reference template item template (ab86861a-6030-46c5-b394-e8f99e8b87db)")

    # Must contain _PerSiteStandardValues in __Base template
    if "44a022db-56d3-419a-b43b-e27e4d8e9c41" not in content.lower():
        errors.append("__Base template MUST include _PerSiteStandardValues ({44A022DB-56D3-419A-B43B-E27E4D8E9C41})")

    # Must contain Standard template in __Base template
    if "1930bbeb-7805-471a-a3be-4858ac7cf696" not in content.lower():
        errors.append("__Base template MUST include Standard template ({1930BBEB-7805-471A-A3BE-4858AC7CF696})")

    return ValidationResult(len(errors) == 0, errors)


def validate_field_item(content: str) -> ValidationResult:
    """
    Validate a template field item YAML.
    Must have Type field (Single-Line Text, Rich Text, etc.)
    """
    base_result = validate_sitecore_yaml(content)
    if not base_result:
        return base_result

    errors = []

    # Must reference field item template
    if "455a3e98-a627-4b40-8035-e683a0331ac7" not in content.lower():
        errors.append("Template must be field item template (455a3e98-a627-4b40-8035-e683a0331ac7)")

    # Must have a Type in SharedFields
    valid_types = [
        "Single-Line Text", "Rich Text", "Image", "General Link",
        "Multilist", "Droplink", "Checkbox", "Integer", "Number",
        "Date", "Datetime", "Multilist with Search",
    ]
    has_type = any(t.lower() in content.lower() for t in valid_types)
    if not has_type:
        errors.append(f"Must contain a valid field Type. Valid types: {', '.join(valid_types)}")

    return ValidationResult(len(errors) == 0, errors)


def validate_rendering(content: str) -> ValidationResult:
    """
    Validate a rendering definition YAML.
    Must reference the rendering template.
    """
    base_result = validate_sitecore_yaml(content)
    if not base_result:
        return base_result

    errors = []

    # Must reference rendering template
    if "04646a89-996f-4ee7-878a-ffdbf1f0ef0d" not in content.lower():
        errors.append("Template must be View Rendering (04646a89-996f-4ee7-878a-ffdbf1f0ef0d)")

    return ValidationResult(len(errors) == 0, errors)


def validate_cross_files(files: dict[str, str]) -> ValidationResult:
    """
    Cross-file validation for a complete component set.

    Args:
        files: Dict of { "template_root": content, "field_section": content, ... }
    """
    errors = []
    all_ids = []

    for name, content in files.items():
        try:
            parsed = yaml.safe_load(content)
            if parsed and isinstance(parsed, dict) and "ID" in parsed:
                item_id = parsed["ID"].strip('"').strip("'").strip("{").strip("}")
                if item_id in all_ids:
                    errors.append(f"Duplicate ID found: {item_id} in {name}")
                all_ids.append(item_id)
        except yaml.YAMLError:
            errors.append(f"Invalid YAML in {name}")

    return ValidationResult(len(errors) == 0, errors)


def validate_step_output(state: dict) -> dict:
    """
    Graph node: Validate the latest step output.
    Routes to 'pass' or 'fix' based on validation result.
    """
    step = state.get("current_step", "")
    messages = state.get("messages", [])

    if not messages:
        return {
            "validation_errors": ["No output to validate"],
            "current_step": f"{step}:failed",
        }

    # Get the last assistant message content
    last_msg = messages[-1]
    content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

    # Choose validator based on step
    if "template-root" in step or "template_root" in step:
        result = validate_template_root(content)
    elif "field-item" in step or "field_item" in step:
        result = validate_field_item(content)
    elif "rendering" in step:
        result = validate_rendering(content)
    else:
        result = validate_sitecore_yaml(content)

    if result:
        return {
            "validation_errors": [],
            "current_step": f"{step}:passed",
        }
    else:
        return {
            "validation_errors": result.errors,
            "fix_attempts": state.get("fix_attempts", 0) + 1,
            "current_step": f"{step}:failed",
        }
