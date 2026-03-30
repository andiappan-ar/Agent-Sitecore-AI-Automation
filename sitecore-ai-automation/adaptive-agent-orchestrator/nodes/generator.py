"""
Generator Node
Makes LLM calls with skill context as system prompt.
Claude receives the full skill content — it cannot skip or ignore it.
"""

import json
import os
from pathlib import Path
from langchain_claude_code import ClaudeCodeChatModel
from langchain_core.messages import SystemMessage, HumanMessage


def _get_oauth_token() -> str:
    """
    Read OAuth token from Claude Code credentials.
    Looks in ~/.claude/.credentials.json (standard location).
    Falls back to CLAUDE_OAUTH_TOKEN env var.
    """
    # Try env var first
    token = os.environ.get("CLAUDE_OAUTH_TOKEN")
    if token:
        return token

    # Try credentials file (~/.claude/.credentials.json)
    creds_path = Path.home() / ".claude" / ".credentials.json"
    if creds_path.exists():
        with open(creds_path, "r", encoding="utf-8") as f:
            creds = json.load(f)

        # Standard Claude Code format: { "claudeAiOauth": { "accessToken": "sk-ant-oat01-..." } }
        oauth = creds.get("claudeAiOauth", {})
        if isinstance(oauth, dict) and oauth.get("accessToken"):
            return oauth["accessToken"]

        # Alternative formats
        for key in ["oauthToken", "oauth_token", "token", "accessToken"]:
            if key in creds and isinstance(creds[key], str):
                return creds[key]

    raise RuntimeError(
        "No Claude OAuth token found.\n"
        "Either set CLAUDE_OAUTH_TOKEN env var or login via: claude login"
    )


def _get_model() -> ClaudeCodeChatModel:
    """Initialize Claude Code model with OAuth token."""
    token = _get_oauth_token()

    # Set Claude Code path for Windows if not already set
    if not os.environ.get("CLAUDE_CODE_PATH"):
        # Common Windows locations
        npm_path = Path.home() / "AppData" / "Roaming" / "npm" / "claude.cmd"
        if npm_path.exists():
            os.environ["CLAUDE_CODE_PATH"] = str(npm_path)

    return ClaudeCodeChatModel(oauth_token=token)


def generate(state: dict) -> dict:
    """
    Graph node: Generate content using Claude with skill context as system prompt.

    Expects state to contain:
        - skill_context: The accumulated system prompt (from skill_loader)
        - messages: The conversation messages (with user prompt)

    Returns updated state with Claude's response appended to messages.
    """
    model = _get_model()

    # Build messages: system context + conversation
    system_msg = SystemMessage(content=state["skill_context"])
    messages = [system_msg] + state["messages"]

    response = model.invoke(messages)

    return {
        "messages": [response],
    }


def generate_with_prompt(state: dict, prompt: str, max_context_chars: int = 20000) -> dict:
    """
    Generate content with a specific prompt added to the conversation.

    Args:
        state: Current graph state
        prompt: The specific instruction for this step
        max_context_chars: Max chars for system context (Windows CLI has limits)

    Returns updated state with user prompt + Claude response.
    """
    model = _get_model()

    # Trim skill context if too large (Windows subprocess command line limit)
    context = state.get("skill_context", "")
    if len(context) > max_context_chars:
        context = context[:max_context_chars] + "\n\n[... context trimmed for size ...]"

    system_msg = SystemMessage(content=context)
    user_msg = HumanMessage(content=prompt)

    all_messages = [system_msg] + [user_msg]  # Don't carry prior messages — fresh per step
    response = model.invoke(all_messages)

    return {
        "messages": [user_msg, response],
    }


def generate_yaml(state: dict, prompt: str) -> str:
    """
    Utility: Generate YAML content and extract it from the response.
    Strips markdown code fences if present.

    Returns the raw YAML string.
    """
    result = generate_with_prompt(state, prompt)
    response_text = result["messages"][-1].content

    # Strip markdown code fences if present
    text = response_text.strip()
    if text.startswith("```yaml"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]

    return text.strip()
