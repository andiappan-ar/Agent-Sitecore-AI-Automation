# Sitecore AI Automation — Skill Build Plan

## The Vision: Sitecore AI Automation Skill System

Three layers of capability, each building on the previous:

- **Layer 1 — Knowledge Layer**: SXA mental model, template hierarchies, item structures
- **Layer 2 — Access Layer**: How to read/write via CLI, GraphQL, APIs
- **Layer 3 — Workflow Layer**: Orchestrated multi-step operations like "create a site with 5 page types"

---

## Phase 1: Sitecore Knowledge Corpus (the "brain")

This is the foundation — Claude needs deep structural knowledge of SXA before it can automate anything. You need to capture and encode:

### SXA Architecture Knowledge

- Site Collection → Site → Home hierarchy and what each level controls
- SXA module system (which modules add which templates/renderings)
- Rendering variants vs component structure
- Shared vs local datasource strategy
- SXA theme architecture (pre-optimized CSS, grid settings)
- Page/partial/metadata item design patterns

### Template & Field Taxonomy

- All standard SXA templates (with IDs, field names, field types)
- Base templates and inheritance chains
- Standard Values and their role
- Rendering parameters templates

### Item Path Conventions

- `/sitecore/content/{tenant}/{site}` structure
- `/sitecore/layout/Renderings/Feature/` patterns
- Media Library folder conventions
- Dictionary and shared content paths

### How to Build This

Export your working Sitecore instance's full template tree and item structure via serialization, then distill it into a reference document. This becomes the core SKILL.md knowledge.

---

## Phase 2: Access Methods (the "hands")

Four access channels, each with different strengths.

### 2A — Sitecore Content Serialization (CLI)

This is the current approach but formalized.

**Setup:** `dotnet sitecore` CLI with `sitecore.json` and module configs.

**Key commands:**

| Command | Purpose |
|---|---|
| `dotnet sitecore ser pull` | Pull items from Sitecore to local YML |
| `dotnet sitecore ser push` | Push local YML to Sitecore |
| `dotnet sitecore ser diff` | Compare local vs remote |
| `dotnet sitecore ser info` | Inspect serialization state |
| `dotnet sitecore login` | Authenticate (interactive or `--client-credentials`) |

**Skill should know:**

- How to structure `*.module.json` files (include/exclude rules, item paths)
- YML item format (ID, Parent, Template, SharedFields, Language versions)
- How to generate valid Sitecore GUIDs
- Field value formats (TreeList, Multilist, DropLink, RichText, Image field XML)

**Best for:** Bulk content structure creation, template definitions, rendering registrations, anything version-controlled.

### 2B — Authoring & Management GraphQL API

This is the game-changer — **live read/write** without serialization roundtrips.

**Endpoint:** `https://{cm-hostname}/sitecore/api/authoring/graphql/v1`

**Authentication:** OAuth client credentials → Bearer token

```
POST https://auth.sitecorecloud.io/oauth/token
{
  "client_id": "...",
  "client_secret": "...",
  "audience": "https://api.sitecorecloud.io",
  "grant_type": "client_credentials"
}
```

#### READ Operations

```graphql
# Search items by path/template
query {
  search(
    where: {
      AND: [
        { name: "path", value: "/sitecore/content/Tenant/Site" }
        { name: "templateName", value: "Page" }
      ]
    }
  ) {
    results {
      id
      name
      path
      fields { name value }
    }
  }
}

# Get single item with all fields
query {
  item(path: "/sitecore/content/Tenant/Site/Home") {
    id
    name
    template { id name }
    children { results { name id } }
    fields { name value }
  }
}
```

#### WRITE Operations

```graphql
# Create item
mutation {
  createItem(input: {
    name: "New-Page"
    templateId: "{...guid...}"
    parent: "{...parent-guid...}"
    language: "en"
    fields: [
      { name: "Title", value: "New Page" }
      { name: "Content", value: "<p>Hello</p>" }
    ]
  }) {
    item { id path }
  }
}

# Update item fields
mutation {
  updateItem(input: {
    itemId: "{...guid...}"
    language: "en"
    version: 1
    fields: [
      { name: "Title", value: "Updated Title" }
    ]
  }) {
    item { id }
  }
}

# Delete item
mutation {
  deleteItem(input: { itemId: "{...guid...}" }) {
    successful
  }
}
```

**Best for:** Content CRUD, reading current state before making changes, validating what exists, interactive content management.

### 2C — XM Cloud Management API (REST)

**Base URL:** `https://xmcloud-cm.sitecorecloud.io/api/`

**Covers:**

- Project and environment management
- Deployment triggers
- Environment variable management
- Site collection/site creation at the XM Cloud level

**Best for:** Infrastructure-level operations, not content-level.

### 2D — Media Upload

Two approaches:

1. **Via Authoring GraphQL** — `createMediaItem` mutation with base64-encoded content
2. **Via direct upload API** — multipart form POST to the CM upload endpoint

The skill needs to know Media Library path conventions and how to reference uploaded media in Image fields (the XML format: `<image mediaid="{guid}" />`).

---

## Phase 3: Workflow Orchestration (the "playbook")

Multi-step recipes the skill encodes. Each one chains multiple API calls.

### Create SXA Site from Scratch

1. Read existing Site Collection (GraphQL) → confirm it exists
2. Create Site item under collection (GraphQL or CLI)
3. Enable required SXA modules on the site
4. Create Home page with standard components
5. Create shared content folders (Data, Dictionary, Settings)
6. Set up placeholder settings
7. Publish

### Add New Page Type with Components

1. Create page template with required base templates
2. Create Standard Values with default layout/renderings
3. Register rendering items under the site
4. Create rendering parameters template if needed
5. Create sample page instance
6. Verify via GraphQL read

### Bulk Content Update

1. Query all items matching criteria (GraphQL search)
2. Read current field values
3. Apply transformation
4. Update each item via mutation
5. Verify updates

### Upload and Assign Media

1. Upload media file to correct Media Library folder
2. Get returned media item ID
3. Update target content items' image fields with new media reference

---

## Phase 4: Skill File Structure

```
/mnt/skills/user/sitecore-xmcloud/
├── SKILL.md                    # Router — decides which sub-skill to invoke
├── knowledge/
│   ├── sxa-architecture.md     # SXA mental model, hierarchies
│   ├── template-reference.md   # Standard templates, IDs, fields
│   ├── field-formats.md        # How to format each field type
│   └── path-conventions.md     # Item path patterns
├── access/
│   ├── cli-commands.md         # SCS CLI reference + auth setup
│   ├── authoring-graphql.md    # Full query/mutation catalog
│   ├── management-api.md       # REST API reference
│   └── media-upload.md         # Media handling patterns
├── workflows/
│   ├── create-site.md          # Multi-step site creation
│   ├── create-page-type.md     # Template + rendering setup
│   ├── bulk-content-update.md  # Query → transform → update
│   ├── component-registration.md
│   └── media-management.md
└── examples/
    ├── sample-queries.graphql
    ├── sample-mutations.graphql
    └── sample-item.yml
```

---

## Phase 5: Build Sequence (Action Plan)

### Week 1 — Foundation

1. Export current Sitecore instance's template tree (full serialization pull)
2. Document the SXA templates, fields, and IDs into `template-reference.md`
3. Set up OAuth client credentials for Authoring GraphQL
4. Test basic GraphQL queries manually (Postman or Insomnia) against your CM
5. Capture working queries into `sample-queries.graphql`

### Week 2 — Access Layer

6. Build `authoring-graphql.md` with authenticated query patterns
7. Build `cli-commands.md` with your project's specific module configs
8. Test create/update/delete via GraphQL mutations
9. Test media upload flow
10. Document all field format patterns (`field-formats.md`)

### Week 3 — Knowledge Encoding

11. Write `sxa-architecture.md` from your working knowledge
12. Write `path-conventions.md` from your actual project structures
13. Write the router `SKILL.md` that ties everything together

### Week 4 — Workflow Layer

14. Build and test each workflow document with real operations
15. Create the skill-creator eval to verify Claude follows the workflows correctly
16. Iterate on the skill descriptions for accurate triggering

---

## Key Architecture Decision: Read-First Pattern

The most important principle for this skill: **always read before write.**

Every workflow should follow this pattern:

1. **Query** current state via Authoring GraphQL
2. **Validate** preconditions (parent exists, template exists, no duplicate names)
3. **Execute** the create/update operation
4. **Verify** the result by reading back

This is what makes it solid vs. the blind YML push approach. Claude can confirm what exists, catch errors, and self-correct.

---

## Next Steps

The highest-impact starting point is the **Authoring GraphQL access layer** — it's the new capability that unlocks the read-first pattern making everything else reliable.
