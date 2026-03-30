"""
Sample Loader Node
Reads reference YAML samples from the examples/ folder.
Provides sample content as context so Claude matches the exact pattern.
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def load_samples(sample_paths: list[str]) -> str:
    """
    Load sample files and return formatted context string.

    Args:
        sample_paths: List of paths relative to PROJECT_ROOT
                      Can be files or directories (directories load all .yml files)

    Returns:
        Formatted string with all sample content
    """
    parts = []

    for ref in sample_paths:
        full_path = PROJECT_ROOT / ref
        if not full_path.exists():
            parts.append(f"## WARNING: Sample not found: {ref}")
            continue

        if full_path.is_dir():
            yml_files = sorted(full_path.rglob("*.yml"))
            if not yml_files:
                parts.append(f"## WARNING: No YAML files in: {ref}")
                continue
            for yml_file in yml_files:
                rel = yml_file.relative_to(PROJECT_ROOT)
                content = yml_file.read_text(encoding="utf-8")
                parts.append(f"## SAMPLE: {rel}\n```yaml\n{content}\n```")
        else:
            content = full_path.read_text(encoding="utf-8")
            parts.append(f"## SAMPLE: {ref}\n```yaml\n{content}\n```")

    return "\n\n".join(parts)


def load_generated_samples(website_name: str, category: str = None) -> str:
    """
    Load previously generated YAML files for a website.
    Useful for cross-referencing IDs when generating related items.

    Args:
        website_name: Name of the website (e.g., "adnocgas")
        category: Optional filter — "templates", "renderings", "pages"

    Returns:
        Formatted string with generated file content
    """
    generated_dir = PROJECT_ROOT / "generated" / website_name
    if not generated_dir.exists():
        return ""

    parts = []
    search_dirs = []

    if category:
        target = generated_dir / category
        if target.exists():
            search_dirs.append(target)
    else:
        search_dirs.append(generated_dir)

    for search_dir in search_dirs:
        for yml_file in sorted(search_dir.rglob("*.yml")):
            rel = yml_file.relative_to(PROJECT_ROOT)
            content = yml_file.read_text(encoding="utf-8")
            parts.append(f"## GENERATED: {rel}\n```yaml\n{content}\n```")

    return "\n\n".join(parts)
