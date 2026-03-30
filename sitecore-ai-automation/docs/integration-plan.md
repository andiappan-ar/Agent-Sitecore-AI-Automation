# Integration Plan — URL to Sitecore Website Pipeline

## The Vision

Give a website URL → get a working Sitecore website with pixel-perfect components, templates, renderings, content, and pages.

```
"Create a Sitecore website that looks like adnoc.com"
    │
    ▼
Phase 1: SCRAPE ──────── Agent-Scrapper
Phase 2: MAP ─────────── CBRE Sitecore Skills
Phase 3: DEPLOY ──────── Sitecore AI Automation (this project)
    │
    ▼
Working website in Sitecore Page Builder
```

---

## Three Projects, One Pipeline

### Project A: Agent-Scrapper
**Location:** `Reference projects/Agent-Scrapper-main/`
**Role:** Extract any website into structured components

| What it does | How |
|---|---|
| Discovers all pages | `discover-pages.js` (sitemap + crawl) |
| Extracts components at 3 viewports | `orchestrate.js` (Playwright, 375/768/1440px) |
| Classifies 22 component types | Auto-detection (hero, cards, footer, nav, etc.) |
| Extracts design tokens | `token-miner.js` (colors, fonts, spacing) |
| Generates React+Tailwind components | `generate-react.js` + Claude Code |
| Validates pixel accuracy | `validate-react.js` (pixelmatch, 85%+ threshold) |
| Exports CMS manifest | `export-manifest.js` (page structure + component schemas) |

**Input:** URL (e.g. `https://adnoc.com`)
**Output:**
```
output/{domain}/
├── extracted/          ← Raw component trees, design tokens, SEO
├── react-app/          ← Working React+Vite+Tailwind app
│   ├── src/components/ ← JSX components (data-driven, zero hardcoded content)
│   ├── src/content/    ← Content JSONs per page
│   └── src/pages/      ← Page assemblies
├── manifest/           ← CMS migration data
│   ├── site.json       ← Site config (languages, fonts, component types)
│   ├── pages/{lang}/   ← Page manifests (component order + content)
│   └── components/     ← Component field schemas
└── content/            ← Editable content JSONs
```

### Project B: CBRE.POC-SitecoreAI
**Location:** `Reference projects/CBRE.POC-SitecoreAI-main/`
**Role:** Create Sitecore items (templates, renderings, datasources, pages)

**Key Skills:**
| Skill | What it does |
|---|---|
| `figma-to-react` | Figma design → React component (pixel-perfect) |
| `chrome-to-react` | Live website → React component (reverse-engineer) |
| `sitecore-xm-cloud-content-sdk` | Full serialization reference (5-file YAML per component) |
| `cbre-content-author` | Create pages, datasources, rendering entries in YAML |

**Critical Knowledge — 5-File YAML Pattern per Component:**
```
For each component, create:
1. Template Root       ← /sitecore/templates/Project/{tenant}/Components/{Category}/{Name}
2. Field Section       ← Template Root/Content (section grouping)
3. Field Items         ← One YAML per field (Title, Description, Image, etc.)
4. Standard Values     ← Template Root/__Standard Values (defaults + rendering assignment)
5. Rendering Item      ← /sitecore/layout/Renderings/Project/{tenant}/{Category}/{Name}
```

**System GUIDs (fixed, never change):**
| Purpose | GUID |
|---|---|
| Template item template | `{AB86861A-6030-46C5-B394-E8F99E8B87DB}` |
| Template section template | `{E269FBB5-3750-427A-9149-7AA950B49301}` |
| Template field template | `{455A3E98-A627-4B40-8035-E683A20185C}` |
| Rendering parameters template | `{3A3A838C-3B87-4F13-A0A4-9E32F6CFA498}` |

**Page Creation Pattern:**
1. Page YAML (under Home/)
2. Data folder YAML (under page/)
3. Datasource items (component content)
4. `__Renderings` XML (component placement on page)

### Project C: Sitecore AI Automation (this project)
**Location:** `sitecore-ai-automation/`
**Role:** Environment management, deployment, verification

**What it does:**
- Preflight → connect → verify environment
- Create site collections, sites via GraphQL mutations
- Configure rendering hosts
- Manage environment config
- Run discovery audits

---

## The Integration Pipeline

### Phase 1: SCRAPE (Agent-Scrapper)

**Input:** Website URL + language preferences
**Steps:**
```bash
# 1. Discover pages
node helpers/discover-pages.js https://adnoc.com output/adnoc.com --max 15 --lang en,ar

# 2. Extract all pages at 3 viewports
node helpers/orchestrate.js https://adnoc.com output/adnoc.com --pages output/adnoc.com/pages.json

# 3. Extract design tokens
node helpers/token-miner.js output/adnoc.com
node helpers/transform-tokens.js output/adnoc.com

# 4. Scaffold React project
node helpers/generate-react.js output/adnoc.com --multi-page --install

# 5. Prepare generation prompts
node helpers/generate-with-claude.js output/adnoc.com --prepare --react

# 6. Generate components (Claude Code reads prompts, creates JSX)
# Per-component: read screenshot + prompt → generate .jsx

# 7. Download assets
node helpers/download-react-assets.js output/adnoc.com

# 8. Validate
cd output/adnoc.com/react-app && npm run dev -- --port 5174
node helpers/validate-react.js output/adnoc.com --threshold 75

# 9. Export CMS manifest
node helpers/export-manifest.js output/adnoc.com --lang en,ar
```

**Output:** `output/adnoc.com/manifest/` with:
- `site.json` — site config, languages, fonts
- `components/*.schema.json` — field schemas per component type
- `pages/{lang}/*.json` — page manifests with component order + content

---

### Phase 2: MAP TO SITECORE (CBRE Skills)

**Input:** Manifest from Phase 1 + React components
**Steps:**

#### 2A: Map Component Schemas → Sitecore Templates
For each `components/*.schema.json`:
```
Component schema (from scraper):
{
  "type": "hero-centered",
  "fields": {
    "heading": { "type": "text", "value": "Welcome" },
    "description": { "type": "richtext", "value": "<p>...</p>" },
    "backgroundImage": { "type": "image", "src": "/assets/hero.jpg" },
    "ctaLabel": { "type": "text", "value": "Learn More" },
    "ctaLink": { "type": "link", "href": "/about" }
  }
}

→ Sitecore Template (5 YAML files):
  1. Template Root: HeroCentered
  2. Field Section: Content
  3. Fields: Heading (Single-Line Text), Description (Rich Text),
             BackgroundImage (Image), CtaLabel (Single-Line Text),
             CtaLink (General Link)
  4. Standard Values: default rendering assignment
  5. Rendering: /Renderings/Project/{tenant}/Heroes/HeroCentered
```

**Field Type Mapping:**
| Scraper Type | Sitecore Field Type |
|---|---|
| `text` | Single-Line Text |
| `richtext` | Rich Text |
| `image` | Image |
| `link` | General Link |
| `multiline` | Multi-Line Text |
| `list` (of items) | Multilist / Treelist |
| `number` | Number |
| `boolean` | Checkbox |

#### 2B: Generate YAML Files
Using the CBRE 5-file pattern, generate YAMLs for each component:
- Template + fields under `/sitecore/templates/Project/{tenant}/Components/`
- Rendering under `/sitecore/layout/Renderings/Project/{tenant}/`
- Standard Values with rendering assignment

#### 2C: Map Pages → Sitecore Pages
For each `pages/{lang}/*.json`:
```
Page manifest (from scraper):
{
  "page": { "slug": "home", "template": "homepage", "language": "en" },
  "seo": { "title": "Adnoc - Welcome", "description": "..." },
  "components": [
    { "type": "hero-centered", "props": { "heading": "Welcome", ... } },
    { "type": "card-grid", "props": { "cards": [...] } },
    { "type": "footer", "props": { "links": [...] } }
  ]
}

→ Sitecore Items:
  1. Page item (template: Page)
  2. Data folder under page
  3. Datasource items per component (with field values from props)
  4. __Renderings XML (component placement order)
```

#### 2D: Copy React Components to Rendering Host
- Copy generated JSX from `react-app/src/components/` to `xmcloud/examples/{starter}/src/components/`
- Adapt imports to use Sitecore Content SDK (`Text`, `Image`, `RichText` field components)
- Register in component map
- Update Tailwind config with extracted design tokens

---

### Phase 3: DEPLOY (Our Automation)

**Input:** Generated YAMLs + adapted components
**Steps:**

#### 3A: Preflight
```
Read config/environments.json → connect → verify
```

#### 3B: Create Site Structure (if new)
```
createSiteCollection → createSite → configure rendering host
```

#### 3C: Push Templates & Renderings
```bash
# Via CLI serialization
dotnet sitecore ser push

# Or via GraphQL mutations (createItemTemplate, createItem)
```

#### 3D: Push Content
```bash
# Datasource items + pages
dotnet sitecore ser push

# Or via GraphQL (createItem with field values)
```

#### 3E: Configure & Verify
```
- Rebuild indexes
- Assign rendering host
- Set up portproxy
- Verify in Page Builder
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                   USER INPUT                         │
│  "Create Sitecore website like https://adnoc.com"   │
│  Languages: en, ar-AE                               │
│  Collection: Adnoc, Site: adnocgas                   │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   PHASE 1: SCRAPE          │
         │   (Agent-Scrapper)         │
         │                            │
         │   URL → Playwright         │
         │   → 22 component types     │
         │   → React+Tailwind JSX     │
         │   → Content JSONs          │
         │   → CMS Manifest           │
         └─────────────┬──────────────┘
                       │
         manifest/     │    react-app/src/
         ├─site.json   │    ├─components/*.jsx
         ├─components/  │    ├─content/*.json
         └─pages/      │    └─pages/*.jsx
                       │
         ┌─────────────▼──────────────┐
         │   PHASE 2: MAP             │
         │   (CBRE Sitecore Skills)   │
         │                            │
         │   Component schemas        │
         │   → Sitecore templates     │
         │   → Rendering items        │
         │   → Datasource items       │
         │   → Page items             │
         │   → __Renderings XML       │
         │                            │
         │   React JSX                │
         │   → Sitecore SDK adapt     │
         │   → Component registration │
         └─────────────┬──────────────┘
                       │
         authoring/    │    examples/{starter}/
         ├─templates/  │    └─src/components/
         ├─renderings/ │
         ├─content/    │
         └─pages/      │
                       │
         ┌─────────────▼──────────────┐
         │   PHASE 3: DEPLOY          │
         │   (Sitecore AI Automation) │
         │                            │
         │   Preflight → Connect      │
         │   → Create collection/site │
         │   → Push templates         │
         │   → Push renderings        │
         │   → Push content/pages     │
         │   → Configure rendering    │
         │   → Verify in Page Builder │
         └─────────────┬──────────────┘
                       │
                       ▼
              Working Sitecore Website
              in Page Builder
```

---

## What Needs to Be Built

### Already Done (from existing projects)
| Capability | Source |
|---|---|
| Website extraction (22 types, 3 viewports) | Agent-Scrapper |
| React+Tailwind generation with pixel validation | Agent-Scrapper |
| CMS manifest export | Agent-Scrapper (`export-manifest.js`) |
| Sitecore 5-file YAML pattern | CBRE Skills (`sitecore-xm-cloud-content-sdk`) |
| Template/rendering YAML generation | CBRE Skills |
| Datasource + page creation | CBRE Skills (`cbre-content-author`) |
| Image upload pipeline | CBRE Skills (GraphQL uploadMedia) |
| Environment connect + preflight | Our automation |
| Site collection/site creation | Our automation |
| GraphQL verified queries/mutations | Our automation |
| Rendering host configuration | Our automation |

### Needs to Be Built (the glue)

| Gap | What's needed | Effort |
|---|---|---|
| **Manifest → Template mapper** | Read `components/*.schema.json`, generate 5-file YAMLs per component type | Medium |
| **Manifest → Page mapper** | Read `pages/{lang}/*.json`, generate page + datasource YAMLs | Medium |
| **React → Sitecore SDK adapter** | Transform pure React JSX to use `Text`, `Image`, `RichText` field components | Medium |
| **Component map registration** | Auto-register adapted components in the rendering host's component map | Small |
| **Design token → Tailwind config** | Merge extracted tokens into the rendering host's `tailwind.config.js` | Small |
| **Orchestrator workflow** | Single workflow that chains Phase 1 → 2 → 3 | Medium |
| **Field type mapping rules** | Scraper schema types → Sitecore field type GUIDs | Small |
| **Media upload integration** | Upload extracted images to Sitecore Media Library | Medium |
| **__Renderings XML builder** | Generate the rendering placement XML from page manifest | Medium |

---

## Build Sequence

### Sprint 1: Manifest → Sitecore Mapper
1. Build `manifest-to-templates.md` workflow skill
   - Read component schemas from manifest
   - Generate 5-file YAML per component (using CBRE pattern)
   - Field type mapping (scraper types → Sitecore field types)
2. Build `manifest-to-pages.md` workflow skill
   - Read page manifests
   - Generate page + datasource YAMLs
   - Build `__Renderings` XML

### Sprint 2: React → Sitecore Adapter
3. Build `react-to-sitecore-component.md` workflow skill
   - Transform JSX props to Sitecore field patterns
   - Replace `<img>` with `<Image field={...} />`
   - Replace text with `<Text field={...} />`
   - Add editing mode support
4. Auto-register components in component map

### Sprint 3: End-to-End Orchestrator
5. Build `url-to-sitecore.md` master workflow
   - Chains all phases
   - Handles errors, retries
   - Reports progress
6. Test with real URLs (adnoc.com, taziz.com)

### Sprint 4: Polish
7. Media upload integration (images → Media Library → field references)
8. Multi-language content (en + ar page variants)
9. Design token merge (extracted colors/fonts → Tailwind config)

---

## Example: Full Pipeline Run

```
User: "Create a Sitecore website that looks like taziz.com"

Step 1: Preflight
  → Read config/environments.json
  → Connected to local-docker, token valid

Step 2: Create site structure
  → createSiteCollection("Taziz")
  → createSite("taziz-website", template: "Empty", languages: "en,ar")

Step 3: Scrape website
  → discover-pages.js https://taziz.com → 13 pages found
  → orchestrate.js → 13 components extracted per page
  → generate-react.js → React app scaffolded
  → Claude generates 13 JSX components
  → validate-react.js → 87%+ pixel match
  → export-manifest.js → manifest/site.json + 13 schemas + page manifests

Step 4: Map to Sitecore
  → 13 component schemas → 13 × 5 = 65 YAML files (templates + renderings)
  → Page manifests → page items + datasource YAMLs
  → React JSX → adapted with Sitecore SDK field components
  → Components registered in component map

Step 5: Deploy
  → dotnet sitecore ser push (templates, renderings, content)
  → Rebuild indexes
  → Configure rendering host
  → Verify in Page Builder

Result: Working taziz.com clone in Sitecore, editable in Page Builder
```

---

## Key Decisions to Make

1. **YML serialization vs GraphQL mutations for deployment?**
   - YML: Better for bulk, version-controlled, can review before push
   - GraphQL: Real-time, no file management, but no version control
   - **Recommendation:** YML for templates/renderings (structural), GraphQL for content (dynamic)

2. **Which rendering host starter to use?**
   - `basic-nextjs` — cleanest, least opinionated
   - `kit-nextjs-product-listing` — most mature, CBRE patterns built-in
   - **Recommendation:** `basic-nextjs` as base, copy adapted components in

3. **Component naming convention?**
   - Match scraper names (hero-centered) or PascalCase Sitecore convention (HeroCentered)?
   - **Recommendation:** PascalCase for Sitecore items, kebab-case mapping in component map

4. **Where to store generated YAMLs?**
   - In the `xmcloud/authoring/` folder (integrated with repo)?
   - In `sitecore-ai-automation/generated/` (separate)?
   - **Recommendation:** Generate in `sitecore-ai-automation/generated/`, copy to `xmcloud/authoring/` before push
