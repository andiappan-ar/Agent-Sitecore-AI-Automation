"""
Typed state definitions for LangGraph workflows.
Each graph uses a TypedDict as its state schema.
"""

from typing import TypedDict, Annotated, Optional
from langgraph.graph import add_messages


class OrchestratorState(TypedDict):
    """Base state shared across all workflow graphs."""

    # Website context
    website_name: str
    collection: str
    site: str
    languages: list[str]
    environment: str

    # Skill context (accumulated system prompt from skill files + samples)
    skill_context: str

    # Environment config (from config/environments.json)
    env_config: dict

    # Messages for LLM conversation
    messages: Annotated[list, add_messages]

    # Current step tracking
    current_step: str
    step_outputs: dict  # { step_id: output_content }

    # Validation
    validation_errors: list[str]
    fix_attempts: int

    # Memory (learned patterns from previous websites)
    learned_patterns: list[str]

    # Generated IDs (template GUIDs, rendering GUIDs)
    generated_ids: dict


class ComponentState(OrchestratorState):
    """State for create-component workflow."""

    component_name: str
    component_type: str
    fields: list[dict]  # [{ "name": "heading", "type": "Single-Line Text" }, ...]

    # Pre-generated UUIDs
    template_id: str
    field_section_id: str
    field_ids: dict       # { "heading": "uuid", "description": "uuid" }
    standard_values_id: str
    rendering_id: str

    # Output file paths
    output_files: dict    # { "template_root": "path", "field_section": "path", ... }


class PageState(OrchestratorState):
    """State for create-page workflow."""

    page_name: str
    page_url: str
    page_template: str
    components: list[dict]  # Components to place on this page

    # Pre-generated UUIDs
    page_id: str
    data_folder_id: str
    datasource_ids: dict  # { "HeroCentered": "uuid", ... }

    # Output file paths
    output_files: dict


class PreflightState(OrchestratorState):
    """State for preflight workflow."""

    cm_host: str
    api_url: str
    api_key: str
    token: str

    # Check results
    connectivity_ok: bool
    token_valid: bool
    graphql_ok: bool
    preflight_passed: bool


class DeployState(OrchestratorState):
    """State for deploy workflow."""

    push_result: str
    items_verified: list[str]
    items_missing: list[str]
    deploy_success: bool


class PipelineState(OrchestratorState):
    """State for full-pipeline workflow."""

    source_url: str
    scrape_output_dir: str
    component_manifest: list[dict]
    page_manifest: list[dict]

    # Progress tracking
    components_created: list[str]
    pages_created: list[str]
    deploy_status: str
