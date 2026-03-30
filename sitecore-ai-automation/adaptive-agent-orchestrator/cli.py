"""
CLI Entry Point
Routes commands to the appropriate workflow graph.

Usage:
    python cli.py run <workflow> --website <name> [--input key=value ...]
    python cli.py resume --website <name>
    python cli.py status [--website <name>]
    python cli.py websites
    python cli.py list
    python cli.py reset --website <name> [--step <stepId>]
"""

import sys
import argparse
import yaml
from pathlib import Path

from nodes.website_tracker import list_websites, load_state


def cmd_list(args):
    """List all available workflows."""
    graphs_dir = Path(__file__).parent / "graphs"
    print("\nAvailable workflows:")
    print("-" * 40)
    for py_file in sorted(graphs_dir.glob("*.py")):
        if py_file.name.startswith("_"):
            continue
        name = py_file.stem
        print(f"  {name}")
    print()


def cmd_websites(args):
    """List all tracked websites."""
    websites = list_websites()
    if not websites:
        print("\nNo websites tracked yet.")
        print("Run: python cli.py run preflight --website <name>")
        return

    print("\nTracked websites:")
    print("-" * 60)
    print(f"  {'Name':<20} {'Workflows':<15} {'Running':<10} {'Updated'}")
    print("-" * 60)
    for w in websites:
        print(f"  {w['name']:<20} {w['workflows_completed']}/{w['workflows_total']:<11} {w['workflows_running']:<10} {w['updated_at'][:19] if w['updated_at'] else 'never'}")
    print()


def cmd_status(args):
    """Show status for a specific website."""
    if not args.website:
        # Show all websites
        cmd_websites(args)
        return

    state = load_state(args.website)
    workflows = state.get("workflows", {})

    print(f"\nWebsite: {args.website}")
    print(f"Updated: {state.get('updated_at', 'never')}")
    print("-" * 60)

    if not workflows:
        print("  No workflow runs yet.")
        return

    for key, wf in workflows.items():
        status_icon = {"completed": "[DONE]", "running": "[....]", "failed": "[FAIL]"}.get(wf.get("status", ""), "[????]")
        print(f"\n  {status_icon} {key}")
        print(f"    Started: {wf.get('started_at', 'unknown')[:19]}")

        steps = wf.get("steps", {})
        for step_id, step_data in steps.items():
            s_icon = {"completed": "+", "failed": "X"}.get(step_data.get("status", ""), "?")
            print(f"      [{s_icon}] {step_id}")
            if step_data.get("error"):
                print(f"          Error: {step_data['error'][:80]}")

        errors = wf.get("errors", [])
        if errors:
            print(f"    Errors: {len(errors)}")

    # Show generated IDs
    gen_ids = state.get("generated_ids", {})
    templates = gen_ids.get("templates", {})
    renderings = gen_ids.get("renderings", {})
    if templates or renderings:
        print(f"\n  Generated IDs:")
        for name, guid in templates.items():
            print(f"    Template: {name} -> {guid}")
        for name, guid in renderings.items():
            print(f"    Rendering: {name} -> {guid}")

    print()


def cmd_run(args):
    """Run a workflow."""
    workflow = args.workflow
    website = args.website

    if not website:
        print("Error: --website is required")
        sys.exit(1)

    # Parse inputs
    inputs = {}
    if args.input:
        for inp in args.input:
            if "=" in inp:
                k, v = inp.split("=", 1)
                inputs[k] = v
            else:
                print(f"Warning: Ignoring malformed input: {inp} (expected key=value)")

    inputs["website_name"] = website

    print(f"\nRunning workflow: {workflow}")
    print(f"Website: {website}")
    if inputs:
        print(f"Inputs: {inputs}")
    print("-" * 40)

    # Import and run the workflow graph
    try:
        if workflow == "preflight":
            from graphs.preflight import run_preflight
            run_preflight(website, inputs)
        elif workflow == "create-component":
            from graphs.create_component import run_create_component
            run_create_component(website, inputs)
        elif workflow == "create-page":
            from graphs.create_page import run_create_page
            run_create_page(website, inputs)
        elif workflow == "deploy":
            from graphs.deploy import run_deploy
            run_deploy(website, inputs)
        elif workflow == "full-pipeline":
            from graphs.full_pipeline import run_full_pipeline
            run_full_pipeline(website, inputs)
        elif workflow == "environment-discovery":
            from graphs.environment_discovery import run_discovery
            run_discovery(website, inputs)
        elif workflow == "analyze":
            from graphs.smart_router import run_smart_router
            run_smart_router(website, inputs)
        else:
            print(f"Error: Unknown workflow '{workflow}'")
            print("Run 'python cli.py list' to see available workflows.")
            sys.exit(1)
    except ImportError as e:
        print(f"Error: Workflow '{workflow}' not yet implemented. ({e})")
        sys.exit(1)
    except Exception as e:
        print(f"\nError running workflow: {e}")
        if "--debug" in sys.argv:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def cmd_resume(args):
    """Resume an interrupted workflow."""
    if not args.website:
        print("Error: --website is required")
        sys.exit(1)

    state = load_state(args.website)
    workflows = state.get("workflows", {})

    # Find running workflows
    running = {k: v for k, v in workflows.items() if v.get("status") == "running"}

    if not running:
        print(f"No interrupted workflows for {args.website}")
        return

    print(f"\nResumable workflows for {args.website}:")
    for key, wf in running.items():
        completed_steps = sum(1 for s in wf.get("steps", {}).values() if s.get("status") == "completed")
        total_steps = len(wf.get("steps", {}))
        print(f"  {key} — {completed_steps} steps completed")

    # Resume the first running workflow
    first_key = list(running.keys())[0]
    workflow_id = running[first_key]["workflow_id"]
    inputs = running[first_key].get("inputs", {})

    print(f"\nResuming: {first_key}")
    args.workflow = workflow_id
    args.input = [f"{k}={v}" for k, v in inputs.items()]
    cmd_run(args)


def cmd_reset(args):
    """Reset a website's state."""
    if not args.website:
        print("Error: --website is required")
        sys.exit(1)

    state_path = Path(__file__).parent / "state" / "websites" / f"{args.website}.state.json"
    if state_path.exists():
        state_path.unlink()
        print(f"Reset state for {args.website}")
    else:
        print(f"No state found for {args.website}")


def main():
    parser = argparse.ArgumentParser(
        description="Adaptive Agent Orchestrator — Sitecore AI Automation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # run
    run_parser = subparsers.add_parser("run", help="Run a workflow")
    run_parser.add_argument("workflow", help="Workflow name (e.g., preflight, create-component)")
    run_parser.add_argument("--website", "-w", required=True, help="Website name")
    run_parser.add_argument("--input", "-i", action="append", help="Input key=value pairs")
    run_parser.add_argument("--debug", action="store_true", help="Show full stack traces")

    # resume
    resume_parser = subparsers.add_parser("resume", help="Resume interrupted workflow")
    resume_parser.add_argument("--website", "-w", required=True, help="Website name")

    # status
    status_parser = subparsers.add_parser("status", help="Show website status")
    status_parser.add_argument("--website", "-w", help="Website name (optional — shows all if omitted)")

    # websites
    subparsers.add_parser("websites", help="List all tracked websites")

    # list
    subparsers.add_parser("list", help="List available workflows")

    # reset
    reset_parser = subparsers.add_parser("reset", help="Reset website state")
    reset_parser.add_argument("--website", "-w", required=True, help="Website name")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "run": cmd_run,
        "resume": cmd_resume,
        "status": cmd_status,
        "websites": cmd_websites,
        "list": cmd_list,
        "reset": cmd_reset,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
