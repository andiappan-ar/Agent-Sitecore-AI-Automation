# Create Site — Workflow Skill

## Purpose
Create a Site Collection (tenant) and Site in Sitecore via the Authoring GraphQL API. This is the foundational workflow for setting up a new website.

---

## Prerequisites
- Preflight passed (config loaded, token valid, CM reachable)
- Environment config: `config/environments.json`

---

## Required Inputs

| Input | Description | Example |
|---|---|---|
| Collection name | Site Collection / Tenant name | `Adnoc` |
| Site name | URL-safe site name | `adnocgas` |
| Site display name | Human-readable name | `Adnoc Gas` |
| Languages | Primary + additional | `en`, `ar-AE` |
| Template | Empty or Basic | `Basic` |
| Hostname | Site hostname | `adnocgas.localhost` |

---

## Available Solution Templates

Query to discover:
```graphql
{
  solutionTemplates {
    id
    name
    description
    enabled
    builtInTemplate
  }
}
```

Known templates (verified 2026-03-28):
| Template | ID | Description |
|---|---|---|
| Empty | `{2867D289-8951-458A-AF19-CE93A67BB494}` | Blank — no header/footer |
| Basic | `{5AAE1EEA-EA24-40BF-96F1-1F43DA82C77B}` | Homepage, subpage, nav, footer |

---

## Workflow Steps

### Step 1: Check if language needs to be added

```graphql
{
  languages {
    nodes {
      name
      displayName
    }
  }
}
```

If a required language is missing, add it:
```graphql
mutation {
  addLanguage(input: {
    languageCode: "ar"
    regionCode: "AE"
  }) {
    successful
  }
}
```

**Important:**
- `languageCode` is required (not `name`)
- Generic codes like `ar` without `regionCode` will fail — use `ar` + `AE` = `ar-AE`
- Don't pass a custom `name` — let Sitecore auto-name it

### Step 2: Create Site Collection

```graphql
mutation {
  createSiteCollection(input: {
    name: "<collection-name>"
    displayName: "<collection-display-name>"
    description: "<description>"
  }) {
    job {
      name
      done
      handle
      status { jobState messages }
    }
  }
}
```

**Returns async job.** Poll until `done: true`:
```graphql
{
  isJobRunning(jobName: "Create site collection [<collection-name>]")
}
```

### Step 3: Verify collection created

```graphql
{
  item(where: { path: "/sitecore/content/<collection-name>" }) {
    itemId
    name
    path
    template { name }
  }
}
```

Expected template: `Headless Tenant`

Save `itemId` — needed for site creation.

### Step 4: Create Site

```graphql
mutation {
  createSite(input: {
    siteName: "<site-name>"
    siteDisplayName: "<display-name>"
    siteDescription: "<description>"
    collectionId: "<collection-itemId>"
    siteCollectionName: "<collection-name>"
    language: "en"
    languages: "ar-AE"
    hostName: "<site-name>.localhost"
    templateId: "{5AAE1EEA-EA24-40BF-96F1-1F43DA82C77B}"
  }) {
    job {
      name
      done
      handle
      status { jobState messages }
    }
  }
}
```

**Required fields** (will error without):
- `collectionId` — GUID from Step 3 (no braces, lowercase)
- `hostName` — site hostname
- `siteName`, `language`, `templateId`

**Returns async job.** Poll until done:
```graphql
{
  isJobRunning(jobName: "Create site [<site-name>][{<COLLECTION-GUID>}]")
}
```

### Step 5: Verify site structure

```graphql
{
  item(where: { path: "/sitecore/content/<collection>/<site>" }) {
    itemId
    name
    template { name }
    children {
      nodes {
        itemId
        name
        path
        template { name }
        hasChildren
      }
    }
  }
}
```

Expected structure (Basic template):
```
<collection> (Headless Tenant)
└── <site> (Headless Site)
    ├── Home (Page)
    ├── Media (MediaVirtualFolder)
    ├── Data (JSS Data)
    │   ├── Images, Link Lists, Navigation Filters
    │   ├── Promos, Tags, Texts
    ├── Dictionary (Dictionary Domain)
    ├── Presentation (Presentation)
    │   ├── Available Renderings, Headless Variants
    │   ├── Page Branches, Page Designs
    │   ├── Partial Designs, Placeholder Settings, Styles
    └── Settings (JSS Settings)
```

### Step 6: Configure rendering host

#### 6A: Set site name in Docker rendering host
Add to `docker-compose.override.yml` under `rendering-nextjs: environment:`:
```yaml
SITECORE_SITE_NAME: "<site-name>"
NEXT_PUBLIC_DEFAULT_SITE_NAME: "<site-name>"
```
Then restart: `cd local-containers && docker compose up -d rendering-nextjs`

#### 6B: Assign Localhost rendering host to the site

The `Localhost` rendering host item (`/sitecore/system/Settings/Services/Rendering Hosts/Localhost`) should point to the local rendering URL. The site's Site Grouping item should reference it.

```graphql
# 1. Update Localhost rendering host URLs
mutation {
  updateItem(input: {
    itemId: "<localhost-rendering-host-itemId>"
    language: "en"
    version: 1
    fields: [
      { name: "ServerSideRenderingEngineApplicationUrl", value: "http://localhost:3000" }
      { name: "ServerSideRenderingEngineEndpointUrl", value: "http://localhost:3000/api/editing/render" }
      { name: "ServerSideRenderingEngineConfigUrl", value: "http://localhost:3000/api/editing/config" }
    ]
  }) { item { itemId } }
}

# 2. Assign Localhost to the site (Site Grouping item)
mutation {
  updateItem(input: {
    itemId: "<site-grouping-item-id>"
    language: "en"
    version: 1
    fields: [
      { name: "RenderingHost", value: "Localhost" }
    ]
  }) { item { itemId } }
}
```

**How to find the Site Grouping item:**
Path: `/sitecore/content/<collection>/<site>/Settings/Site Grouping/<site>`

**Why Localhost instead of Default:**
- `Default` → keeps cloud/production rendering host URL (for deployed environments)
- `Localhost` → points to `http://localhost:3000` (for local dev)
- Site uses `Localhost` → Page Builder automatically uses local rendering
- No manual "Local host" toggle needed by the user

#### 6C: Set up portproxy for rendering host (if Docker ports not exposed)
```powershell
$renderIp = docker inspect xmcloud-starter-js-rendering-nextjs-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=127.0.0.1 connectport=3000 connectaddress=$renderIp
```

### Step 7: Configure Page Builder (if needed)

#### 7A: Connect Page Builder to local CM

Open **https://pages.sitecorecloud.io**, then browser console (F12 → Console):

```javascript
// Connect Page Builder to local CM
localStorage.setItem('Sitecore.Pages.LocalXmCloudUrl', 'https://xmcloudcm.localhost/');
console.log('✅ Page Builder connected to: ' + localStorage.getItem('Sitecore.Pages.LocalXmCloudUrl'));
location.reload();
```

To disconnect (revert to cloud CM):
```javascript
localStorage.removeItem('Sitecore.Pages.LocalXmCloudUrl');
console.log('✅ Page Builder disconnected from local — using cloud CM');
location.reload();
```

#### 7B: Set up local rendering host access

Page Builder needs to reach the rendering host from your browser. Since Docker ports may not be exposed (HNS bug), set up port forwarding:

```powershell
# Admin PowerShell — forward port 3000 to rendering container
$renderIp = docker inspect xmcloud-starter-js-rendering-nextjs-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=127.0.0.1 connectport=3000 connectaddress=$renderIp
```

#### Rendering Host Strategy

The automation handles all rendering host config automatically during site creation (Step 6B). The user only needs to set the Page Builder localStorage key once (Step 7A).

| Rendering Host | Points to | Purpose |
|---|---|---|
| `Default` | `http://rendering-nextjs:3000` | Internal Docker (CM → rendering). Used for cloud/production |
| `Localhost` | `http://localhost:3000` | Local dev. Assigned to sites by automation. Browser-accessible via portproxy |

| Config | Set by | When |
|---|---|---|
| `Localhost` rendering host URLs | Automation (Step 6B) | During site creation |
| Site → RenderingHost = `Localhost` | Automation (Step 6B) | During site creation |
| portproxy 3000 → container | Automation (Step 6C) | During site creation |
| Page Builder localStorage | User (Step 7A console script) | Once per browser |

**User does NOT need to:**
- Manually switch "Default editing host" / "Local host" in Page Builder
- Change any rendering host config in Sitecore
- Know container IPs or Docker internals

### Step 8: Update environment config

Add the new collection and site to `config/environments.json`:
- `siteCollections[]` — name, itemId, path
- `sites[]` — name, itemId, collectionName, languages, template, hostName, homeItemId
- `languages[]` — any new languages added

---

### Step 9: Set icons on templates and renderings

Every template and rendering needs an `__Icon` field for Content Editor and Page Builder visibility.

**IMPORTANT:** Icon paths vary between Sitecore versions. Never hardcode — always discover available icons from the target CM first.

**Step 9A: Discover available icons on the CM**

Query the SXA built-in renderings — they have icons that are guaranteed to exist:
```graphql
{ item(where: { path: "/sitecore/layout/Renderings/Feature/Experience Accelerator" }) {
  children { nodes { name children { nodes { name
    fields(ownFields:false) { nodes { name value } }
  } } } }
} }
```
Filter results for `__Icon` field values. This gives you the full icon catalog for the environment.

Also query system templates for additional icons:
```graphql
{ item(where: { path: "/sitecore/templates/Foundation/Experience Accelerator/Presentation/Page Design" }) {
  fields(ownFields:false) { nodes { name value } }
} }
```

**Step 9B: Choose relevant icons**

Match each component to the closest SXA equivalent by purpose:
- Hero/banner → find the Image or Video SXA rendering icon
- Navigation/header → find the Navigation SXA rendering icon
- Footer → find the Link List SXA rendering icon
- Breadcrumb → find the Breadcrumb SXA rendering icon
- Two-column/split → find the Column Splitter SXA rendering icon
- Content block → find the Page Content SXA rendering icon
- Cards/grid → find the Gallery SXA rendering icon
- Carousel/slider → find the Carousel SXA rendering icon
- Accordion → find the Accordion SXA rendering icon
- Video → find the Video SXA rendering icon
- Stats/chart → find a chart icon from Office/ icons
- Container/sidebar → find the Container SXA rendering icon

**Step 9C: Set icons on templates AND renderings**
```graphql
mutation {
  updateItem(input: {
    itemId: "<template-or-rendering-id>"
    language: "en"
    version: 1
    fields: [{ name: "__Icon", value: "<discovered-icon-path>" }]
  }) { item { itemId } }
}
```

Set the same icon on both the template and its corresponding rendering for consistency.

```graphql
mutation {
  updateItem(input: {
    itemId: "<template-or-rendering-id>"
    language: "en"
    version: 1
    fields: [{ name: "__Icon", value: "Office/32x32/painting_landscape.png" }]
  }) { item { itemId } }
}
```

---

## Post-Creation Checklist

| Check | How | Done by |
|---|---|---|
| Collection exists in content tree | Query `/sitecore/content/<collection>` | Automation |
| Site exists with correct template | Query site path, check `Headless Site` | Automation |
| Home page exists | Check children of site | Automation |
| Languages configured | Query `languages`, add if missing | Automation |
| `Localhost` rendering host → `http://localhost:3000` | Update rendering host item | Automation |
| Site → RenderingHost = `Localhost` | Update Site Grouping item | Automation |
| portproxy for port 3000 | `netsh interface portproxy` | Automation |
| docker-compose site name set | `SITECORE_SITE_NAME` env var | Automation |
| Rendering host restarted | `docker compose up -d rendering-nextjs` | Automation |
| `config/environments.json` updated | Add collection, site, IDs | Automation |
| Page Builder localStorage set | User runs console script once | **User (one-time)** |

---

---

## CRITICAL: Template Base Templates for Datasources

Every custom datasource template MUST inherit from:
- `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` — Standard template
- `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` — _PerSiteStandardValues

Without BOTH, the layout service returns empty `rendered: {}` when datasources reference these templates. Components will render blank even though content exists.

### `createItemTemplate` via GraphQL does NOT set base templates

The `createItemTemplate` mutation creates a template but does NOT set `__Base template`. You must do one of:
1. **Preferred:** Use YAML serialization (`dotnet sitecore ser push`) — it sets up all required base templates correctly.
2. **Manual fix via GraphQL:** After creating the template, update its `__Base template` field:
```graphql
mutation {
  updateItem(input: {
    itemId: "<template-item-id>"
    language: "en"
    version: 1
    fields: [
      { name: "__Base template", value: "{1930BBEB-7805-471A-A3BE-4858AC7CF696}|{44A022DB-56D3-419A-B43B-E27E4D8E9C41}" }
    ]
  }) { item { itemId } }
}
```

### Rendering items need datasource configuration

Every rendering item must have these fields set:
- **Datasource Template** — path or ID of the component's datasource template
- **Datasource Location** — where datasource items are stored (e.g. `local:/Data` or a site-relative path)

### Known template IDs

| Template | GUID |
|---|---|
| Template Field | `{455A3E98-A627-4B40-8035-E683A0331AC7}` |
| Template Folder | `{0437FEE2-44C9-46A6-ABE9-28858D9FEE8C}` |
| Rendering Folder | `{840D4A46-5503-49EC-BF9D-BD090946C63D}` |

> **Note:** These IDs were verified on local CM (2026-03-28) — may differ between Sitecore versions.

---

## Related Skills
- [Authoring GraphQL](../access/authoring-graphql.md) — Mutation syntax
- [Environment Config](environment-config.md) — Persist new site details
- [Preflight](preflight.md) — Must pass before running this
