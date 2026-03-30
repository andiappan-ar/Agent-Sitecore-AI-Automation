# Skills Router

Entry point for all skills. Each skill is focused on ONE task, designed for the orchestrator to load per graph node.

## Skills Map

### Knowledge (reference data — load as context for any task)
| Skill | File | Use when |
|---|---|---|
| System GUIDs | `knowledge/system-guids.md` | Any YAML generation — all fixed GUIDs |
| Field Formats | `knowledge/field-formats.md` | Working with field types and values |
| Path Conventions | `knowledge/path-conventions.md` | Building Sitecore item paths |
| SXA Architecture | `knowledge/sxa-architecture.md` | Understanding site/template hierarchy |
| Common Mistakes | `common-mistakes.md` | Avoiding known gotchas (ALWAYS load) |

### Serialization (5-file component YAML generation)
| Skill | File | Produces |
|---|---|---|
| Template Root | `serialization/template-root.md` | File 1: Template definition YAML |
| Field Section | `serialization/field-section.md` | File 2: Content section YAML |
| Field Item | `serialization/field-item.md` | File 3: Individual field YAML (per field) |
| Standard Values | `serialization/standard-values.md` | File 4: Default values YAML |
| Rendering Definition | `serialization/rendering-definition.md` | File 5: Rendering registration YAML |
| Cross-File Rules | `serialization/cross-file-rules.md` | Validation rules across all 5 files |

### Content Authoring (page + datasource creation)
| Skill | File | Produces |
|---|---|---|
| Page Creation | `content/page-creation.md` | Page item YAML |
| Datasource Creation | `content/datasource-creation.md` | Component datasource item YAML |
| Renderings XML | `content/renderings-xml.md` | __Renderings field for component placement |

### Component Development (React + Sitecore)
| Skill | File | Use when |
|---|---|---|
| React Sitecore Patterns | `component/react-sitecore-patterns.md` | Building React components for XM Cloud |
| Figma to React | `component/figma-to-react.md` | Converting Figma designs to React |
| Chrome to React | `component/chrome-to-react.md` | Extracting live site design to React |

### Scrapper (website extraction pipeline)
| Skill | File | Phase |
|---|---|---|
| Extraction | `scrapper/extraction.md` | Phase 1: Website → structured JSON |
| Generation Rules | `scrapper/generation-rules.md` | Phase 4: JSON → Tailwind HTML/React |
| Validation | `scrapper/validation.md` | Phase 6: Pixel comparison |
| Fix Loop | `scrapper/fix-loop.md` | Phase 7: Iterative fixes |

### Access (Sitecore connectivity)
| Skill | File | Use when |
|---|---|---|
| Authoring GraphQL | `access/authoring-graphql.md` | Querying/mutating Sitecore via GraphQL |
| CLI Commands | `access/cli-commands.md` | Using dotnet sitecore CLI |

### Workflows (multi-step operations)
| Skill | File | Use when |
|---|---|---|
| Preflight | `workflows/preflight.md` | Before any Sitecore operation |
| Environment Discovery | `workflows/environment-discovery.md` | Auditing what's in Sitecore |

### Legacy (full reference — use only when specific skills are insufficient)
| Skill | File | Note |
|---|---|---|
| Complete Serialization Reference | `sitecore-serialization/SKILL.md` | 1700 lines — full SDK reference |
| Complete Content Authoring | `content-authoring/SKILL.md` | 1144 lines — full content reference |

## Orchestrator Usage

The adaptive-agent-orchestrator loads skills via `config/skill-map.yaml`. Each graph node gets ONLY the skills it needs — not the entire knowledge base.

## Workflow: Create Component (5-file YAML)

```
1. Load: serialization/template-root.md + knowledge/system-guids.md + common-mistakes.md
2. Generate template root YAML
3. Load: serialization/field-section.md
4. Generate field section YAML
5. Load: serialization/field-item.md
6. Generate field items (one per field)
7. Load: serialization/standard-values.md
8. Generate standard values YAML
9. Load: serialization/rendering-definition.md
10. Generate rendering YAML
11. Load: serialization/cross-file-rules.md
12. Validate all files
```

## Workflow: Create Page

```
1. Load: content/page-creation.md + knowledge/system-guids.md
2. Generate page YAML
3. Load: content/datasource-creation.md
4. Generate Data folder + datasource items
5. Load: content/renderings-xml.md
6. Generate __Renderings XML
7. Validate
```

## Workflow: Full Pipeline

```
1. scrapper/extraction.md → Extract website
2. scrapper/generation-rules.md → Generate HTML/React
3. scrapper/validation.md → Pixel validate
4. scrapper/fix-loop.md → Fix until passing
5. serialization/*.md → Generate Sitecore templates
6. content/*.md → Generate pages + datasources
7. Deploy → Push to Sitecore
```
