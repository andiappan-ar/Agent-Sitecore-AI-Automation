# Adaptive Agent Orchestrator

A reliable orchestrator that makes Claude follow skills step by step, every time, without skipping.

Built with **LangGraph + Claude Code OAuth** — uses your existing Claude Code subscription, no separate API key or billing.

## The Problem

When **you** orchestrate Claude Code (feed the right skill, the right sample, the right step), output is perfect. When Claude Code self-manages, it skips skills, improvises, and forgets samples.

**This orchestrator replaces you.** It loads skill files as system prompts, executes steps via a LangGraph state machine, validates output between steps, handles fix-loops intelligently, and tracks state per website.

## How It Works

```
You (today):     "Read this skill" → "Now do step 1" → "Here's a sample" → "Do step 2" → "That failed, fix it"
Orchestrator:     Loads skill → Step 1 → Loads sample → Step 2 → Validates → Fix loop → Pass → Next
```

## Why LangGraph

| Capability | Why it matters for this project |
|---|---|
| **Graph enforces step order** | Claude literally cannot skip a step — the graph won't allow it |
| **Cycles / fix loops** | Validation fails → analyze why → fix → re-validate (not just blind retry) |
| **Checkpointing** | Crash at step 5? Resume exactly from step 5 — no re-running 1-4 |
| **Built-in memory** | Patterns learned from website 1 automatically apply to website 2 |
| **Parallel execution** | Generate 10 component YAMLs simultaneously |
| **Human-in-the-loop** | Stuck after 3 attempts? Pause and ask you, then continue |
| **LangGraph Studio** | Visual debugger — see which node is running, inspect state, replay |

## Cost

**Zero extra cost.** Uses `langchain-claude-code` with your Claude Code OAuth token from `~/.claude/.credentials.json`. Runs on your existing subscription.

```python
from langchain_claude_code import ClaudeCodeChatModel

model = ClaudeCodeChatModel(oauth_token=OAUTH_TOKEN)  # subscription, not API
```

## Architecture (Built)

```
adaptive-agent-orchestrator/
├── pyproject.toml                        # Python deps: langchain-claude-code, langgraph, pyyaml
├── langgraph.json                        # LangGraph Studio config (all 6 graphs registered)
├── .env                                  # Environment vars
├── .gitignore                            # Ignores __pycache__, state files, .venv
├── cli.py                                # CLI entry point (run, resume, status, websites, list, reset)
├── visualize.py                          # Generate ASCII + Mermaid + PNG diagrams of all graphs
├── config/
│   ├── skill-map.yaml                    # Maps graph nodes → skill files + samples
│   └── websites.yaml                     # Registered websites (adnocgas configured)
├── graphs/
│   ├── __init__.py
│   ├── preflight.py                      # Environment check graph (config → connectivity → token → graphql → report)
│   ├── create_component.py               # 5-file YAML generation with fix loop
│   ├── create_page.py                    # Page + data folder + datasources with fix loop
│   ├── deploy.py                         # Push via CLI + verify items via GraphQL
│   ├── full_pipeline.py                  # Master graph (preflight → scrape → components → pages → deploy)
│   └── fix_agent.py                      # Intelligent analyze → fix → validate loop
├── nodes/
│   ├── __init__.py
│   ├── skill_loader.py                   # Reads skill .md → system prompt (THE enforcer)
│   ├── sample_loader.py                  # Reads example YAMLs → context
│   ├── generator.py                      # LLM calls via ClaudeCodeChatModel (OAuth)
│   ├── validator.py                      # YAML structure + cross-file + Sitecore-specific checks
│   ├── shell_executor.py                 # Runs dotnet sitecore CLI, scrapper scripts, curl
│   ├── memory_manager.py                 # Cross-website learned patterns (read/write/learn)
│   └── website_tracker.py                # Per-website state, workflow progress, generated ID tracking
├── state/
│   ├── __init__.py
│   ├── schemas.py                        # Typed state definitions (OrchestratorState, ComponentState, etc.)
│   ├── memory.json                       # Pre-seeded with 5 known patterns from CLAUDE.md
│   ├── checkpoints/                      # LangGraph checkpoint storage
│   └── websites/                         # Per-website state files
└── docs/
    ├── create_component.png              # Graph diagram
    ├── create_page.png                   # Graph diagram
    └── full_pipeline.png                 # Graph diagram
```

## How Skills Connect (No Changes Needed)

```
sitecore-ai-automation/
├── skills/                    ← Orchestrator READS these (system prompts)
├── examples/                  ← Orchestrator READS these (reference samples)
├── config/environments.json   ← Orchestrator READS this (connection config)
├── generated/                 ← Orchestrator WRITES here (output YAMLs)
├── exports/                   ← Orchestrator WRITES here (discovery snapshots)
├── scrapper/                  ← Orchestrator INVOKES this (website extraction)
└── adaptive-agent-orchestrator/  ← THIS FOLDER (the runner)
```

**Zero changes** to existing skills, samples, scrapper, config, or generated output. The orchestrator references them by path.

## Skill-to-Context Mapping

The only new "glue" — `config/skill-map.yaml`:

```yaml
create-component:
  load-skills:
    skills:
      - skills/sitecore-serialization/SKILL.md
      - skills/knowledge/field-formats.md
      - skills/knowledge/path-conventions.md
    samples:
      - examples/template-yaml/Accordions/
      - examples/rendering-yaml/Accordions.yml

create-page:
  load-skills:
    skills:
      - skills/content-authoring/SKILL.md
      - skills/knowledge/path-conventions.md
    samples:
      - examples/page-yaml/

deploy:
  load-skills:
    skills:
      - skills/access/cli-commands.md
      - skills/access/authoring-graphql.md

preflight:
  load-skills:
    skills:
      - skills/workflows/preflight.md
      - skills/access/authoring-graphql.md
```

## Graph Example: Create Component

```
                    ┌──────────────┐
                    │ Load Skills   │  ← reads sitecore-serialization/SKILL.md
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Generate YAML │  ← Claude generates with skill as system prompt
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Validate    │  ← check YAML structure, required fields
                    └──────┬───────┘
                           │
                     ┌─────▼─────┐
                     │  Pass?    │
                     └─────┬─────┘
                      YES  │  NO
                    ┌──────┘  └──────┐
                    │                │
             ┌──────▼───────┐ ┌─────▼────────┐
             │ Save + Next   │ │ Fix Agent    │ ← analyzes WHY, not just retries
             └──────────────┘ │ (with skill  │
                              │  context)    │
                              └──────┬───────┘
                                     │
                                     └──► back to Validate
```

The **Fix Agent** node is the key difference from a simple retry loop. It reads the validation error, analyzes the output against the skill/sample, and makes a targeted fix — just like you would manually.

## CLI Interface

```bash
# Run a workflow
python cli.py run preflight --website adnocgas
python cli.py run create-component --website adnocgas --component HeroCentered
python cli.py run full-pipeline --website newsite --url https://www.example.com

# Resume interrupted work
python cli.py resume --website adnocgas

# Check progress
python cli.py status --website adnocgas

# List all websites
python cli.py websites

# Visual debugger
langgraph dev
```

## Supported Workflows

| Workflow | What it does |
|---|---|
| `preflight` | Test environment connectivity, token, GraphQL |
| `environment-discovery` | Audit templates, renderings, sites → snapshot to exports/ |
| `create-component` | Generate 5-file YAML set (template + fields + standard values + rendering) |
| `create-page` | Generate page + data folder + datasources + __Renderings XML |
| `deploy` | Push to Sitecore via CLI + verify items exist |
| `full-pipeline` | Scrape website → generate all components → create pages → deploy |
| `fix-agent` | Diagnose + fix failed outputs intelligently |

## Key Design Decisions

### 1. Skills = System Prompt (not optional)
The `skill_loader.py` reads skill .md files and injects their FULL content as the system message. Claude cannot skip them because they ARE the context.

### 2. Graph Enforces Step Order
Claude cannot skip step 3 because the graph edge from step 2 goes to step 3. No shortcuts, no improvisation.

### 3. Fix Loops (not blind retries)
When validation fails, the Fix Agent node receives:
- The failed output
- The validation errors
- The original skill + sample
- Memory of past fixes

It reasons about *what went wrong* and makes a targeted fix — not just "try again."

### 4. Memory Across Websites
LangGraph Store persists learned patterns:
- "Always include _PerSiteStandardValues GUID" (learned from website 1)
- "Use YAML serialization, not GraphQL for templates" (learned from website 2)

Discovered once → applied to all future websites.

### 5. Pre-generated UUIDs
Template/rendering/field GUIDs are generated BEFORE the LLM call, injected as state variables. Eliminates hallucinated GUIDs.

### 6. Claude Code Subscription (no extra cost)
Uses `langchain-claude-code` with OAuth token. No separate API key. No per-token billing. Runs on your existing Claude Max subscription.

## Dependencies

```
langchain-claude-code     # Claude Code OAuth integration
langgraph                 # Graph orchestration + checkpointing + memory
pyyaml                    # YAML validation
```

## Build Status

All 5 phases complete. 22 files, 6 graphs, all loading in LangGraph Studio.

| Phase | Status |
|---|---|
| **1. Foundation** — pyproject.toml, CLI, utils, state, config | Done |
| **2. Core Graph** — generator, validator, preflight graph | Done |
| **3. Components** — create_component with fix loop, cross-file validation | Done |
| **4. Pages + Deploy** — create_page, deploy, shell executor | Done |
| **5. Full Pipeline** — full_pipeline, fix_agent, memory manager | Done |

## LangGraph Studio

```bash
cd adaptive-agent-orchestrator
pip install -U "langgraph-cli[inmem]"
python -m langgraph_cli dev --no-browser
```

- Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
- API Docs: http://127.0.0.1:2024/docs
- All 6 graphs load and are visually inspectable

## Portability

To ship to another machine:
1. Copy `sitecore-ai-automation/` folder
2. `cd adaptive-agent-orchestrator && pip install -e .`
3. Login to Claude Code (`claude login`) — OAuth token auto-generated
4. Update `config/environments.json` with local connection details
5. `python cli.py run preflight --website yoursite`

All skills, samples, workflows, and state travel with the folder.
