# Environment Discovery — Workflow Skill

## Purpose
Connect to a Sitecore environment, verify access, and map everything that exists — tenants, sites, templates, renderings, content structure. This is **Step 0** before any other automation.

---

## When to Use
- First time connecting to a new Sitecore environment
- Setting up automation on a new machine
- After a deployment or migration
- When you need to understand "what do we have?"

---

## Environment Selection

This workflow works for both environments. Set your target first:

| Variable | Local Docker | XM Cloud (Direct) |
|---|---|---|
| `CM_HOST` | `https://xmcloudcm.localhost` | `https://<env-id>.sitecorecloud.io` |
| `AUTHORING_URL` | `$CM_HOST/sitecore/api/authoring/graphql/v1` | `https://authoring-api.sitecorecloud.io/api/graphql/v1` |
| `EDGE_URL` | `$CM_HOST/sitecore/api/graph/edge` | `https://edge.sitecorecloud.io/api/graphql/v1` |
| `AUTH_METHOD` | Bearer from `user.json` | OAuth client credentials |

See [CLI Commands](../access/cli-commands.md) and [Authoring GraphQL](../access/authoring-graphql.md) for detailed setup per environment.

---

## Phase 1: Connect & Verify Access

### Step 1.1 — Verify CM is reachable

**Local Docker:**
```powershell
docker ps -a --format "table {{.Names}}\t{{.Status}}" | Select-String "cm"
# Expected: cm container is "healthy"

curl -k -s -o /dev/null -w "%{http_code}" https://xmcloudcm.localhost/sitecore
# Expected: 302
```

**XM Cloud:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://<env-id>.sitecorecloud.io/sitecore
# Expected: 302
```

### Step 1.2 — Authenticate CLI
```powershell
cd <repo-root>
dotnet tool restore
dotnet sitecore cloud login
# → Browser auth → enter code → authorize with ORG account
```

### Step 1.3 — Connect CLI to CM

**Local Docker:**
```powershell
dotnet sitecore connect --ref xmcloud --cm https://xmcloudcm.localhost --allow-write true -n default
```

**XM Cloud:**
```powershell
dotnet sitecore connect --ref xmcloud --cm https://<env-id>.sitecorecloud.io --allow-write true -n default
```

Verify: `dotnet sitecore ser info` should return module info.

### Step 1.4 — Get Bearer Token

```bash
# Extract from user.json (works for both environments)
TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('.sitecore/user.json','utf8'));console.log(j.endpoints.xmCloud.accessToken)")
```

### Step 1.5 — Test Authoring GraphQL

```bash
curl -k -s -X POST "$AUTHORING_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ item(where: { path: \"/sitecore/content\" }) { itemId name hasChildren } }"}'
```

Expected: JSON with `itemId`, `name: "content"`, `hasChildren: true`

### Step 1.6 — Test Edge GraphQL

```bash
curl -k -s -X POST "$EDGE_URL" \
  -H "Content-Type: application/json" \
  -H "sc_apikey: <API-KEY-GUID>" \
  -d '{"query": "{ site { siteInfoCollection { name hostname language } } }"}'
```

**Checkpoint:** All 6 steps pass → full access confirmed. Save results to `exports/discovery/connect-report.md`.

---

## Phase 2: Discover Content Structure

### Step 2.1 — List all content under /sitecore/content
```graphql
{
  item(where: { path: "/sitecore/content" }) {
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
  }
}
```

**Output:** Map of all tenants → sites → top-level items.

### Step 2.2 — For each site, get full structure
```graphql
{
  item(where: { path: "/sitecore/content/{Tenant}/{Site}" }) {
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
  }
}
```

Capture: Home page, Data folder, Dictionary, Settings, Media references.

### Step 2.3 — List all sites (dedicated query)
```graphql
{
  sites {
    nodes {
      name
      rootPath
      language
      hostName
    }
  }
}
```

### Step 2.4 — List site collections
```graphql
{
  siteCollections {
    nodes {
      name
      sitesRootPath
    }
  }
}
```

### Step 2.5 — List rendering hosts
```graphql
{
  item(where: { path: "/sitecore/system/Settings/Services/Rendering Hosts" }) {
    children {
      nodes {
        itemId
        name
        fields(ownFields: false) {
          nodes {
            name
            value
          }
        }
      }
    }
  }
}
```

### Step 2.6 — List API keys
```graphql
{
  item(where: { path: "/sitecore/system/Settings/Services/API Keys" }) {
    children {
      nodes {
        itemId
        name
        fields(ownFields: false) {
          nodes {
            name
            value
          }
        }
      }
    }
  }
}
```

Save all to: `exports/discovery/content-structure.json`

---

## Phase 3: Discover Templates

### Step 3.1 — List project templates
```graphql
{
  item(where: { path: "/sitecore/templates/Project" }) {
    children {
      nodes {
        itemId
        name
        path
        children {
          nodes {
            itemId
            name
            path
            children {
              nodes {
                itemId
                name
                path
                template { name }
              }
            }
          }
        }
      }
    }
  }
}
```

### Step 3.2 — Get template fields (per template)
```graphql
{
  itemTemplate(where: { path: "/sitecore/templates/Project/{Tenant}/{Template}" }) {
    name
    templateId
    fields {
      nodes {
        name
        type
        sectionName
      }
    }
    baseTemplates {
      nodes {
        name
        templateId
      }
    }
  }
}
```

### Step 3.3 — List all templates (bulk)
```graphql
{
  itemTemplates(where: { path: "/sitecore/templates/Project" }) {
    nodes {
      name
      templateId
      fields {
        nodes {
          name
          type
        }
      }
    }
  }
}
```

### Step 3.4 — Alternative: Full serialization export
```powershell
dotnet sitecore ser pull
# Exports everything to YML files in authoring/ directory
# Copy to our exports:
Copy-Item -Recurse "<repo>/authoring" "sitecore-ai-automation/exports/serialized"
```

Save to: `exports/discovery/templates.json`

---

## Phase 4: Discover Renderings & Layout

### Step 4.1 — List project renderings
```graphql
{
  item(where: { path: "/sitecore/layout/Renderings/Project" }) {
    children {
      nodes {
        itemId
        name
        children {
          nodes {
            itemId
            name
            children {
              nodes {
                itemId
                name
                path
                template { name }
              }
            }
          }
        }
      }
    }
  }
}
```

### Step 4.2 — List placeholder settings
```graphql
{
  item(where: { path: "/sitecore/layout/Placeholder Settings" }) {
    children {
      nodes {
        itemId
        name
        path
        hasChildren
      }
    }
  }
}
```

Save to: `exports/discovery/renderings.json`

---

## Phase 5: Discover Media

```graphql
{
  item(where: { path: "/sitecore/media library/Project" }) {
    children {
      nodes {
        itemId
        name
        path
        hasChildren
        children {
          nodes {
            itemId
            name
            path
            hasChildren
          }
        }
      }
    }
  }
}
```

Save to: `exports/discovery/media-structure.json`

---

## Phase 6: Discover Languages & Workflows

### Languages
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

### Workflows
```graphql
{
  workflows {
    nodes {
      name
      workflowId
    }
  }
}
```

### Current user (verify permissions)
```graphql
{
  currentUser {
    name
    domain
    isAdministrator
  }
}
```

Save to: `exports/discovery/system.json`

---

## Output: Environment Report

After all phases, generate `exports/discovery/ENVIRONMENT-REPORT.md`:

```markdown
# Environment Report — {date}

## Connection
- Environment: Local Docker / XM Cloud
- CM: {CM_HOST}
- CLI: Connected
- Authoring API: Working
- Edge API: Working

## Tenants & Sites
| Tenant | Site | Home Path | Language |
|---|---|---|---|

## Templates
| Category | Count | Path |
|---|---|---|

## Renderings
| Category | Count |
|---|---|

## System
| Languages | ... |
| Workflows | ... |
| API Keys | ... |
| Rendering Hosts | ... |
```

---

## Debugging Queries

### Check template base templates (useful for layout service issues)

When the layout service returns empty `rendered: {}` for datasource items, check if the template has the required base templates:

```graphql
{
  item(where: { path: "/sitecore/templates/Project/..." }) {
    fields(ownFields: false) { nodes { name value } }
  }
}
# Look for __Base template field — must include:
# {1930BBEB-7805-471A-A3BE-4858AC7CF696} (Standard template)
# {44A022DB-56D3-419A-B43B-E27E4D8E9C41} (_PerSiteStandardValues)
```

Also useful via `itemTemplate` query:
```graphql
{
  itemTemplate(where: { path: "/sitecore/templates/Project/{Tenant}/{Template}" }) {
    name
    templateId
    baseTemplates { nodes { name templateId } }
  }
}
```

---

## Next Steps After Discovery
1. Update `knowledge/template-reference.md` with actual IDs and fields
2. Build targeted workflow skills using real GUIDs
3. Test mutations against known items
4. Start automation workflows

---

## Related Skills
- [CLI Commands](../access/cli-commands.md) — Authentication per environment
- [Authoring GraphQL](../access/authoring-graphql.md) — Query syntax and auth
- [SXA Architecture](../knowledge/sxa-architecture.md) — What to expect
- [Path Conventions](../knowledge/path-conventions.md) — Where to look
