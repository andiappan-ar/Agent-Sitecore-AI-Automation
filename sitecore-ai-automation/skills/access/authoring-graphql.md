# Authoring GraphQL API — Access Skill

## Purpose
Live read/write operations against Sitecore CM via the Authoring GraphQL API. Enables the **read-first pattern** — query state before making changes.

---

## Two Environments

This skill covers two environments. Steps differ by environment.

| | Local Docker | XM Cloud (Direct) |
|---|---|---|
| **CM Host** | `https://xmcloudcm.localhost` | `https://<env-id>.sitecorecloud.io` |
| **Authoring Endpoint** | `https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1` | `https://authoring-api.sitecorecloud.io/api/graphql/v1` |
| **Edge Endpoint** | `https://xmcloudcm.localhost/sitecore/api/graph/edge` | `https://edge.sitecorecloud.io/api/graphql/v1` |
| **Authoring IDE** | `https://xmcloudcm.localhost/sitecore/api/authoring/graphql/ide/` | N/A (use Postman/Insomnia) |
| **Auth method** | Bearer token from `.sitecore/user.json` | OAuth client credentials |
| **Edge auth** | `sc_apikey` header (GUID from CM) | `sc_apikey` header (from Edge Admin) |

---

## Local Docker Setup

### Prerequisites
1. CM container running and healthy: `docker ps` → cm healthy
2. CLI connected: `dotnet sitecore ser info` returns data
3. Cloud login done: `dotnet sitecore cloud login`

### Enable GraphQL Playground (one-time)
Add to `local-containers/docker-compose.override.yml` under `cm: environment:`:
```yaml
Sitecore_GraphQL_ExposePlayground: "true"
```
Then restart: `docker compose down && docker compose up -d`

### Get Bearer Token
The token lives in `.sitecore/user.json` after a successful `dotnet sitecore cloud login`:

```powershell
# Extract token (PowerShell)
$userJson = Get-Content ".sitecore/user.json" | ConvertFrom-Json
$token = $userJson.endpoints.xmCloud.accessToken
```

```bash
# Extract token (bash)
TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('.sitecore/user.json','utf8'));console.log(j.endpoints.xmCloud.accessToken)")
```

Token expires after ~24 hours. Refresh with `dotnet sitecore cloud login`.

### Test Connection
```bash
curl -k -s -X POST "https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ item(where: { path: \"/sitecore/content\" }) { itemId name } }"}'
```

### Edge API (read-only, no bearer needed)
```bash
curl -k -s -X POST "https://xmcloudcm.localhost/sitecore/api/graph/edge" \
  -H "Content-Type: application/json" \
  -H "sc_apikey: <API-KEY-GUID>" \
  -d '{"query": "{ site { siteInfoCollection { name hostname language } } }"}'
```

API key is in `.env` as `SITECORE_API_KEY_APP_STARTER`.

---

## XM Cloud (Direct) Setup

### Prerequisites
1. SitecoreAI Deploy Portal access with org account
2. Client credentials created (Client ID + Client Secret)
3. OAuth scopes: `sitecore.authoring`, `sitecore.management`

### Get Client Credentials
1. Go to **SitecoreAI Deploy Portal** → **Credentials** → **Create credentials**
2. Select scopes: `sitecore.authoring`, `sitecore.management`
3. Save the **Client ID** and **Client Secret**

### Get Bearer Token
```bash
curl -X POST "https://auth.sitecorecloud.io/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "audience=https://api.sitecorecloud.io" \
  -d "grant_type=client_credentials"

# Response: { "access_token": "eyJ...", "expires_in": 86400 }
```

### Test Connection
```bash
curl -X POST "https://authoring-api.sitecorecloud.io/api/graphql/v1" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ item(where: { path: \"/sitecore/content\" }) { itemId name } }"}'
```

### Edge API (read-only)
```bash
curl -X POST "https://edge.sitecorecloud.io/api/graphql/v1" \
  -H "sc_apikey: <EDGE-API-KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ site { siteInfoCollection { name } } }"}'
```

Edge API key from: **Deploy Portal → Environment → Developer Settings → Edge Token**

---

## Query Syntax (VERIFIED — same for both environments)

**IMPORTANT:** The authoring API uses `where` input objects, NOT direct arguments.

### Get item by path
```graphql
{
  item(where: { path: "/sitecore/content", language: "en" }) {
    itemId
    name
    path
    hasChildren
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

### Get item by ID
```graphql
{
  item(where: { itemId: "110d559fdea542ea9c1c8a5df7e70ef9" }) {
    itemId
    name
    path
    template { name }
  }
}
```

### item(where: ...) — Input Fields
| Argument | Type | Purpose |
|---|---|---|
| `path` | String | Item path (e.g. `/sitecore/content`) |
| `itemId` | ID | Item GUID (no braces) |
| `language` | String | Language code (e.g. `en`) |
| `version` | Int | Version number |
| `database` | String | Database name (default: `master`) |

### Get site by name
```graphql
{
  site(siteName: "website") {
    name
    hostName
    rootPath
    language
    domain
    startPath
    contentStartPath
    dictionaryDomain
  }
}
```
> Note: `siteName` is required (not `name`).

### List site collections
```graphql
{
  siteCollections {
    name
    collectionName
    itemPath
    sharedSites { name }
  }
}
```
> Returns a LIST directly (not `nodes`). May return null on fresh instances.

### List solution templates (available site templates)
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

### List languages
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

### Get template definition
```graphql
{
  itemTemplate(where: { path: "/sitecore/templates/Project" }) {
    name
    templateId
  }
}
```

### Search items
```graphql
{
  search(where: { query: "_path:110d559fdea542ea9c1c8a5df7e70ef9 AND _templatename:Page" }) {
    results {
      innerItem {
        itemId
        name
        path
      }
    }
    totalCount
  }
}
```

### Get item with field values
```graphql
{
  item(where: { path: "/sitecore/content/Home" }) {
    itemId
    name
    fields(ownFields: false) {
      nodes {
        name
        value
        jsonValue
      }
    }
  }
}
```

---

## Mutation Syntax (Authoring API only)

### Create item
```graphql
mutation {
  createItem(input: {
    name: "new-page"
    templateId: "{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}"
    parent: "{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}"
    language: "en"
    fields: [
      { name: "Title", value: "New Page" }
    ]
  }) {
    item {
      itemId
      name
      path
    }
  }
}
```

### Update item
```graphql
mutation {
  updateItem(input: {
    itemId: "{ITEM-GUID}"
    language: "en"
    version: 1
    fields: [
      { name: "Title", value: "Updated Title" }
    ]
  }) {
    item {
      itemId
    }
  }
}
```

### Delete item
```graphql
mutation {
  deleteItem(input: {
    itemId: "{ITEM-GUID}"
  }) {
    successful
  }
}
```

### Create site collection (VERIFIED)
```graphql
mutation {
  createSiteCollection(input: {
    name: "MyTenant"
    displayName: "My Tenant"
    description: "Tenant description"
  }) {
    job { isDone }
  }
}
```
Input fields: `name` (String), `displayName` (String), `description` (String), `database` (String)
Returns: `job` (async — poll for completion)

### Create site (VERIFIED)
```graphql
mutation {
  createSite(input: {
    siteName: "my-site"
    siteDisplayName: "My Site"
    siteDescription: "Site description"
    siteCollectionName: "MyTenant"
    language: "en"
    templateId: "{5AAE1EEA-EA24-40BF-96F1-1F43DA82C77B}"
  }) {
    job { isDone }
  }
}
```
Input fields:
| Field | Type | Purpose |
|---|---|---|
| `siteName` | String | URL-safe site name |
| `siteDisplayName` | String | Display name |
| `siteDescription` | String | Description |
| `siteCollectionName` | String | Parent collection name |
| `collectionId` | ID | Alternative to siteCollectionName |
| `language` | String | Default language |
| `languages` | String | Additional languages |
| `templateId` | String | Solution template GUID |
| `hostName` | String | Site hostname |

Available solution templates (from discovery):
| Template | ID |
|---|---|
| Empty | `{2867D289-8951-458A-AF19-CE93A67BB494}` |
| Basic | `{5AAE1EEA-EA24-40BF-96F1-1F43DA82C77B}` |

Returns: `job` (async — poll for completion)

### Remove site
```graphql
mutation {
  removeSite(input: { siteName: "my-site" }) {
    job { isDone }
  }
}
```

### Remove site collection
```graphql
mutation {
  removeSiteCollection(input: { name: "MyTenant" }) {
    job { isDone }
  }
}
```

---

## Available Queries (54 total)

Key queries for automation:

| Query | Purpose |
|---|---|
| `item` | Get single item by path or ID |
| `search` | Search items by criteria |
| `sites` | List all sites |
| `siteCollections` | List site collections |
| `itemTemplate` / `itemTemplates` | Template definitions |
| `languages` | Installed languages |
| `workflows` | Workflow definitions |
| `databases` | Available databases |
| `currentUser` | Current authenticated user |
| `indexes` | Search indexes |
| `mediaItem` | Get media item |
| `availableRenderings` | Renderings for a placeholder |
| `pageDesigns` / `partialDesigns` | Layout designs |
| `publishingStatus` | Publishing state |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `AUTH_NOT_AUTHENTICATED` | No/invalid bearer token | Refresh: `dotnet sitecore cloud login`, extract new token from `user.json` |
| `argument 'path' does not exist` | Wrong syntax — using direct args | Use `where: { path: "..." }` syntax |
| `field 'id' does not exist` | Wrong field name | Use `itemId` not `id` |
| `children.results` fails | Wrong child access | Use `children { nodes { ... } }` |
| Connection refused | CM not running | Check `docker ps`, restart if needed |
| `sc_apikey` rejected on authoring | API key only works for Edge | Use Bearer token for authoring API |

---

## Related Skills
- [CLI Commands](cli-commands.md) — Alternative access via serialization
- [Field Formats](../knowledge/field-formats.md) — How to format field values in mutations
- [Environment Discovery](../workflows/environment-discovery.md) — Uses these queries to map the environment
