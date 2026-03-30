# Connect Phase Report — 2026-03-28

## Access Verified

| Channel | Endpoint | Auth Method | Status |
|---|---|---|---|
| CM HTTP | `https://xmcloudcm.localhost/sitecore` | — | Working (302) |
| Sitecore CLI | `dotnet sitecore ser info` | Cloud login + connect | Working |
| Edge GraphQL | `https://xmcloudcm.localhost/sitecore/api/graph/edge` | `sc_apikey` header | Working |
| Authoring GraphQL | `https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1` | Bearer token | Working |
| Authoring IDE | `https://xmcloudcm.localhost/sitecore/api/authoring/graphql/ide/` | Bearer token | Enabled |

## Authoring GraphQL — Correct Syntax

The authoring API uses `where` input objects, NOT direct arguments:

```graphql
# CORRECT
{ item(where: { path: "/sitecore/content", language: "en" }) { itemId name path } }

# WRONG (will fail)
{ item(path: "/sitecore/content") { id name } }
```

### Key differences from documentation examples:
- Field is `itemId` not `id`
- Uses `where: { path: "..." }` not `path: "..."`
- Children accessed via `children { nodes { ... } }` not `children { results { ... } }`
- Templates via `template { name }` (same)

## Authentication Details

### Edge API (read-only)
```
Header: sc_apikey: c81b907a-1d16-45d4-9d80-0219de9ec9ee
```

### Authoring API (read/write)
```
Header: Authorization: Bearer <token-from-user.json>
Token location: xmcloud/.sitecore/user.json → endpoints.xmCloud.accessToken
Refresh: dotnet sitecore cloud login
```

## Available Authoring API Queries (54 total)

Key queries for automation:
- `item` — Get item by path or ID
- `search` — Search items
- `sites` — List sites
- `siteCollections` — List site collections
- `itemTemplate` / `itemTemplates` — Template definitions
- `languages` — Installed languages
- `workflows` — Workflow definitions
- `databases` — Available databases
- `currentUser` — Current auth user
- `indexes` — Search indexes

## Docker Config Change
Added to `local-containers/docker-compose.override.yml` under `cm: environment:`:
```yaml
Sitecore_GraphQL_ExposePlayground: "true"
```

## Initial Content Tree
```
/sitecore/content/
└── Home (itemId: 110d559fdea542ea9c1c8a5df7e70ef9)
```
