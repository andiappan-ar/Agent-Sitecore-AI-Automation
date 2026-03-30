# Sitecore AI Automation — Instructions

## How to Work in This Project

### Rule 1: Follow Skills First — Never Use Basic Knowledge
Every task has skill files and reference samples. **Read them BEFORE writing any code.**

1. **Before writing code:** Read the relevant skill .md + at least one reference sample
2. **While writing code:** Match the reference pattern exactly — imports, types, exports, field handling
3. **After writing code:** Compare with reference — does it match? Remove old files.

**Skills location:** `sitecore-ai-automation/skills/`
**Reference samples:** `Reference projects/CBRE.POC-SitecoreAI-main/` and `examples/`

### Rule 2: Preflight Before Any Sitecore Operation
Read `config/environments.json` → run preflight → verify connection → then work.
See: `skills/SKILL.md` for the full flow.

### Rule 3: Auto-Update After Every Task
After any work, automatically update:
- `skills/*.md` — if we learned something new
- `config/environments.json` — if environment state changed
- `exports/` — if new discovery data
- This `CLAUDE.md` — if new rules or patterns established

Never ask "should I update?" — just do it.

### Rule 4: Work Autonomously
- Don't ask unnecessary confirmation questions
- If something fails 3 times, switch strategy
- Run pre-flight checks automatically before operations

### Rule 5: Keep Everything Local
All project knowledge lives in `sitecore-ai-automation/` — not just in Claude memory.
- Skills, configs, exports, examples — all in this folder
- This folder is the source of truth across any machine
- Claude memory is a convenience layer on top — if it's missing, the skills still work

---

## Project Structure

```
sitecore-ai-automation/
├── CLAUDE.md                            ← THIS FILE (instructions)
├── config/environments.json             ← Connection details (machine-specific)
├── skills/
│   ├── SKILL.md                         ← Master router
│   ├── knowledge/                       ← SXA architecture, fields, paths
│   ├── access/                          ← CLI, GraphQL (verified syntax)
│   ├── workflows/                       ← Preflight, discovery, create-site, react-to-sitecore
│   ├── sitecore-serialization/          ← 5-file YAML pattern, Content SDK reference
│   ├── figma-to-react/                  ← Figma → React skill
│   ├── chrome-to-react/                 ← Live site → React skill
│   └── content-authoring/               ← Pages, datasources, rendering XML
├── scrapper/                            ← Website extraction tool (Node.js)
├── examples/                            ← Sample Sitecore YAMLs
├── exports/                             ← Environment discovery snapshots
├── generated/                           ← Output (YAMLs, adapted components)
├── docs/                                ← Plans, guides
└── Reference projects/                  ← CBRE + Scrapper source (reference)
```

---

## Key Reference Files for Component Development

When creating Sitecore Content SDK components, ALWAYS read these first:

1. **Skill:** `skills/sitecore-serialization/SKILL.md` — component template, field types, exports
2. **Reference:** `Reference projects/CBRE.POC-SitecoreAI-main/.../kit-nextjs-product-listing/src/components/` — real working components
3. **Pattern:** `skills/workflows/react-to-sitecore-component.md` — transformation rules

Key patterns from CBRE reference:
- `'use client'` at top
- `import { NextImage as ContentSdkImage, Text, RichText, Link, useSitecore } from '@sitecore-content-sdk/nextjs'`
- `import { ComponentProps } from 'lib/component-props'`
- `export const Default = (props): JSX.Element => { ... }`
- `ContentSdkImage` with spread pattern for images (never raw `<img>` or CSS `backgroundImage`)
- `(field?.value || isEditing) && <Text field={...} />` guards
- `!fields` → empty hint for editor scaffolding

### Critical Gotchas (learned 2026-03-28)

- **Base templates for custom datasource templates**: Every custom template MUST inherit `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` (Standard) + `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` (_PerSiteStandardValues) — without these, the layout service returns empty `rendered: {}` and components render blank.
- **Never create `.env.local` when Docker rendering host is running** — it overrides Docker env vars (`SITECORE_API_HOST: "http://cm"`) and causes ENOTFOUND errors inside the container.
- **Template creation: prefer YAML serialization over GraphQL mutations** — `createItemTemplate` via GraphQL does NOT set `__Base template`, so templates are missing required base templates. Use `dotnet sitecore ser push` instead, or manually fix via `updateItem` on `__Base template` field.

---

## Environment Details

Read from `config/environments.json` — contains:
- CM host, API endpoints, API keys
- Token source (`.sitecore/user.json`)
- Site collections, sites, rendering hosts
- Template and rendering IDs

---

## Pipeline: URL → Sitecore Website

See `docs/integration-plan.md` for full details.

```
Phase 1: SCRAPE (scrapper/) → React components + CMS manifest
Phase 2: MAP (skills/) → Sitecore templates + renderings via GraphQL
Phase 3: ADAPT (skills/) → React JSX → Sitecore Content SDK TSX
Phase 4: DEPLOY (skills/) → Push to CM, configure rendering host
```
