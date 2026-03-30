# Discovery Queries — Reference

## Purpose
The exact GraphQL queries used during environment discovery. These are the **verified working queries** against the Sitecore Authoring API. Use these to audit any environment (local or cloud).

---

## Auth Header (required for all queries)

```
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Token source: `.sitecore/user.json` → `endpoints.xmCloud.accessToken`

---

## 1. Current User (verify access)

```graphql
{
  currentUser {
    name
    domain
    isAdministrator
  }
}
```

---

## 2. Content Tree (tenants, sites, pages)

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
  }
}
```

---

## 3. Site Definition

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

> Note: `siteName` is required. Use site names found in content tree or Edge API `{ site { siteInfoCollection { name } } }` to discover available names.

---

## 4. Site Collections

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

> Returns a LIST (not connection with nodes). May return null on fresh instances.

---

## 5. Languages

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

---

## 6. Workflows

```graphql
{
  workflows {
    nodes {
      displayName
      workflowId
      states {
        nodes {
          displayName
        }
      }
    }
  }
}
```

---

## 7. Project Templates

```graphql
{
  item(where: { path: "/sitecore/templates/Project" }) {
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

---

## 8. Template Field Details

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

---

## 9. Project Renderings

```graphql
{
  item(where: { path: "/sitecore/layout/Renderings/Project" }) {
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

---

## 10. Project Media Library

```graphql
{
  item(where: { path: "/sitecore/media library/Project" }) {
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
```

---

## 11. Rendering Hosts

```graphql
{
  item(where: { path: "/sitecore/system/Settings/Services/Rendering Hosts" }) {
    children {
      nodes {
        itemId
        name
      }
    }
  }
}
```

---

## 12. API Keys

```graphql
{
  item(where: { path: "/sitecore/system/Settings/Services/API Keys" }) {
    children {
      nodes {
        itemId
        name
      }
    }
  }
}
```

---

## 13. Edge API — Site Info (no auth token needed, uses API key)

```graphql
{
  site {
    siteInfoCollection {
      name
      hostname
      language
    }
  }
}
```

Header: `sc_apikey: <API-KEY-GUID>`

---

## 14. Deep Item with Fields

```graphql
{
  item(where: { path: "/sitecore/content/{path}", language: "en" }) {
    itemId
    name
    path
    template { name }
    fields(ownFields: false) {
      nodes {
        name
        value
        jsonValue
      }
    }
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
```

---

## Query Syntax Rules (Verified)

| Rule | Correct | Wrong |
|---|---|---|
| Item lookup | `item(where: { path: "..." })` | `item(path: "...")` |
| Item ID field | `itemId` | `id` |
| Children access | `children { nodes { ... } }` | `children { results { ... } }` |
| Site lookup | `site(siteName: "...")` | `site(name: "...")` |
| Site collections | `siteCollections { name }` (LIST) | `siteCollections { nodes { name } }` |
| Workflows | `workflows { nodes { displayName workflowId } }` | `workflows { nodes { name } }` |
| Template fields | `itemTemplate(where: { path: "..." })` | Direct path arg |

---

## Running Discovery as a Script

### Bash (one-shot)

```bash
#!/bin/bash
# Usage: ./discover.sh <repo-root> <output-dir>

REPO=$1
OUTDIR=$2
TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('$REPO/.sitecore/user.json','utf8'));console.log(j.endpoints.xmCloud.accessToken)")
API="https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1"

query() {
  curl -k -s -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$1\"}" > "$OUTDIR/$2"
}

mkdir -p "$OUTDIR"

query '{ currentUser { name isAdministrator } }' 'user.json'
query '{ item(where: { path: \"/sitecore/content\" }) { itemId name path hasChildren children { nodes { itemId name path template { name } hasChildren children { nodes { itemId name path template { name } hasChildren } } } } } }' 'content-tree.json'
query '{ site(siteName: \"website\") { name hostName rootPath language domain startPath } }' 'sites.json'
query '{ languages { nodes { name displayName } } }' 'languages.json'
query '{ workflows { nodes { displayName workflowId states { nodes { displayName } } } } }' 'workflows.json'
query '{ item(where: { path: \"/sitecore/templates/Project\" }) { itemId name hasChildren children { nodes { itemId name path hasChildren children { nodes { itemId name path hasChildren } } } } } }' 'templates-project.json'
query '{ item(where: { path: \"/sitecore/layout/Renderings/Project\" }) { itemId name hasChildren children { nodes { itemId name path hasChildren } } } }' 'renderings.json'
query '{ item(where: { path: \"/sitecore/media library/Project\" }) { itemId name hasChildren children { nodes { itemId name path hasChildren } } } }' 'media.json'
query '{ item(where: { path: \"/sitecore/system/Settings/Services/Rendering Hosts\" }) { children { nodes { itemId name } } } }' 'rendering-hosts.json'
query '{ item(where: { path: \"/sitecore/system/Settings/Services/API Keys\" }) { children { nodes { itemId name } } } }' 'api-keys.json'

echo "Discovery complete → $OUTDIR"
```

### For XM Cloud (direct)
Same queries, change:
- `API` to `https://authoring-api.sitecorecloud.io/api/graphql/v1`
- Remove `-k` flag (valid SSL)
- Token via OAuth client credentials instead of `user.json`
