"""
Shell Executor Node
Runs CLI commands — dotnet sitecore, node scripts, etc.
Used for preflight checks, serialization push, scrapper invocation.
"""

import subprocess
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def run_command(command: str, cwd: str = None, timeout: int = 120) -> dict:
    """
    Run a shell command and return result.

    Args:
        command: Shell command to execute
        cwd: Working directory (defaults to PROJECT_ROOT)
        timeout: Timeout in seconds

    Returns:
        Dict with stdout, stderr, returncode, success
    """
    work_dir = cwd or str(PROJECT_ROOT)

    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "success": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Command timed out after {timeout}s",
            "returncode": -1,
            "success": False,
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "returncode": -1,
            "success": False,
        }


def sitecore_cli(subcommand: str, cwd: str = None) -> dict:
    """
    Run a dotnet sitecore CLI command.

    Args:
        subcommand: e.g., "ser push", "cloud login", "connect --ref xmcloud"
    """
    return run_command(f"dotnet sitecore {subcommand}", cwd=cwd)


def run_scrapper(script: str, args: str = "", cwd: str = None) -> dict:
    """
    Run a scrapper helper script.

    Args:
        script: Script name (e.g., "orchestrate.js", "export-manifest.js")
        args: Additional arguments
    """
    scrapper_dir = str(PROJECT_ROOT / "scrapper")
    return run_command(f"node helpers/{script} {args}", cwd=cwd or scrapper_dir, timeout=300)


def check_connectivity(url: str) -> dict:
    """Check if a URL is reachable."""
    # Use curl with -k to accept self-signed certs (local Docker)
    return run_command(f'curl -sk --connect-timeout 5 -o /dev/null -w "%{{http_code}}" {url}', timeout=10)


def get_traefik_ip() -> str:
    """Get the Traefik container IP for HNS workaround."""
    result = run_command(
        'docker inspect -f "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}" xmcloud-starter-js-traefik-1',
        timeout=5,
    )
    return result.get("stdout", "").strip() if result["success"] else ""


def check_connectivity_via_traefik(host_header: str = "xmcloudcm.localhost") -> dict:
    """Check connectivity via Traefik IP directly (HNS workaround)."""
    traefik_ip = get_traefik_ip()
    if not traefik_ip:
        return {"success": False, "stdout": "", "stderr": "Could not get Traefik IP"}
    return run_command(
        f'curl -sk --connect-timeout 5 -o /dev/null -w "%{{http_code}}" https://{traefik_ip}:443 -H "Host: {host_header}"',
        timeout=10,
    )


def execute_shell_step(state: dict) -> dict:
    """
    Graph node: Execute a shell command from state.

    Expects state to contain:
        - shell_command: The command to run
        - shell_cwd: Optional working directory
    """
    command = state.get("shell_command", "")
    cwd = state.get("shell_cwd")

    if not command:
        return {
            "step_outputs": {
                **state.get("step_outputs", {}),
                state.get("current_step", "shell"): "No command specified",
            }
        }

    result = run_command(command, cwd=cwd)

    return {
        "step_outputs": {
            **state.get("step_outputs", {}),
            state.get("current_step", "shell"): result,
        }
    }
