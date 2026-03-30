"""
Generate visual diagrams of all workflow graphs.
Run: python visualize.py

Outputs:
  - Mermaid diagrams (paste into https://mermaid.live)
  - ASCII art in terminal
  - PNG files (if mermaid-cli available)
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))


def visualize_graph(name, build_fn):
    """Visualize a single graph."""
    print(f"\n{'=' * 60}")
    print(f"  {name}")
    print(f"{'=' * 60}")

    try:
        graph = build_fn()
        app = graph.compile()
        drawable = app.get_graph()

        # ASCII art
        print("\n--- ASCII ---")
        print(drawable.draw_ascii())

        # Mermaid
        print("\n--- Mermaid (paste into https://mermaid.live) ---")
        print(drawable.draw_mermaid())

        # Try PNG export
        try:
            png_dir = Path(__file__).parent / "docs"
            png_dir.mkdir(exist_ok=True)
            png_path = png_dir / f"{name}.png"
            png_bytes = drawable.draw_mermaid_png()
            with open(png_path, "wb") as f:
                f.write(png_bytes)
            print(f"\n--- PNG saved: {png_path} ---")
        except Exception as e:
            print(f"\n--- PNG export skipped: {e} ---")

        return True
    except Exception as e:
        print(f"\n  ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("Generating workflow visualizations...\n")

    graphs = []

    # Import all graph builders
    try:
        from graphs.preflight import build_preflight_graph
        graphs.append(("preflight", build_preflight_graph))
    except Exception as e:
        print(f"Skipping preflight: {e}")

    try:
        from graphs.create_component import build_create_component_graph
        graphs.append(("create_component", build_create_component_graph))
    except Exception as e:
        print(f"Skipping create_component: {e}")

    try:
        from graphs.create_page import build_create_page_graph
        graphs.append(("create_page", build_create_page_graph))
    except Exception as e:
        print(f"Skipping create_page: {e}")

    try:
        from graphs.deploy import build_deploy_graph
        graphs.append(("deploy", build_deploy_graph))
    except Exception as e:
        print(f"Skipping deploy: {e}")

    try:
        from graphs.fix_agent import build_fix_agent_graph
        graphs.append(("fix_agent", build_fix_agent_graph))
    except Exception as e:
        print(f"Skipping fix_agent: {e}")

    try:
        from graphs.full_pipeline import build_full_pipeline_graph
        graphs.append(("full_pipeline", build_full_pipeline_graph))
    except Exception as e:
        print(f"Skipping full_pipeline: {e}")

    success = 0
    for name, build_fn in graphs:
        if visualize_graph(name, build_fn):
            success += 1

    print(f"\n{'=' * 60}")
    print(f"  Visualized {success}/{len(graphs)} graphs")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
