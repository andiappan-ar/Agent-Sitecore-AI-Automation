# SXA Architecture — Knowledge Skill

## Purpose
Mental model of SitecoreAI / XM Cloud SXA architecture. Understanding this structure is required before any automation workflow.

---

## Hierarchy

```
Sitecore Content Tree
├── /sitecore/content/
│   └── {Tenant} (Site Collection)
│       └── {Site}
│           ├── Home                    ← Root page
│           │   ├── About
│           │   ├── Products
│           │   └── Contact
│           ├── Data                    ← Shared datasource items
│           │   ├── Navigation
│           │   ├── Footer
│           │   └── Shared Content
│           ├── Dictionary              ← Localization labels
│           ├── Media                   ← Site-specific media
│           ├── Settings               ← Site settings
│           └── Presentation           ← Page designs, partial designs
│
├── /sitecore/templates/
│   ├── Foundation/                    ← Base/abstract templates
│   ├── Feature/                       ← Module-specific templates
│   └── Project/                       ← Site-specific templates
│       └── {Tenant}/
│           └── {Site}/
│               ├── Page Types/        ← Page templates
│               ├── Components/        ← Component data templates
│               └── Settings/          ← Configuration templates
│
├── /sitecore/layout/
│   └── Renderings/
│       ├── Foundation/                ← Base renderings
│       ├── Feature/                   ← Module renderings (SXA)
│       └── Project/                   ← Custom renderings
│           └── {Tenant}/
│               └── {Site}/
│
├── /sitecore/media library/
│   └── Project/
│       └── {Tenant}/
│           └── {Site}/
│
└── /sitecore/system/
    ├── Settings/
    │   └── Services/
    │       ├── API Keys/              ← GraphQL/Edge API keys
    │       └── Rendering Hosts/       ← Rendering host configs
    └── Languages/
```

---

## Key Concepts

### Site Collection → Site → Home
- **Site Collection** (Tenant): Groups related sites, shares settings
- **Site**: Individual website with its own content tree, settings, theme
- **Home**: Root page item, all page items are descendants

### Templates
- **Base Templates**: Inherited, provide common fields (e.g. `_Navigation`, `_SEO`)
- **Page Templates**: Define page types (e.g. `Article Page`, `Product Page`)
- **Component Templates**: Define datasource structures for renderings
- **Standard Values**: Default field values set on the template's `__Standard Values` item

### Renderings & Layout
- **Rendering**: A registered component that maps to a front-end React component
- **Placeholder**: Named slots where renderings can be placed
- **Rendering Parameters**: Additional configuration for a rendering instance
- **Layout**: The overall page structure (usually one per site)
- **Partial Design**: Reusable layout fragments (header, footer)
- **Page Design**: Combines layout + partial designs for a page type

### Content Architecture
- **Datasource**: Content items that feed data to renderings
- **Local Datasource**: Stored under the page item (page-specific content)
- **Shared Datasource**: Stored in `/Data` folder (reused across pages)

---

## XM Cloud Starter Kit Structure (from repo)

Based on `xmcloud-starter-js` repository:

```
xmcloud/
├── examples/                          ← Front-end starters
│   ├── basic-nextjs/                  ← Simple starter
│   ├── kit-nextjs-article-starter/    ← Solterra & Co. (editorial)
│   ├── kit-nextjs-location-finder/    ← Alaris (car brand)
│   ├── kit-nextjs-product-listing/    ← SYNC (audio gear)
│   ├── kit-nextjs-skate-park/         ← Demo site
│   └── basic-spa/                     ← Angular SPA
├── authoring/                         ← Sitecore items & templates
├── local-containers/                  ← Docker setup
└── xmcloud.build.json                 ← Deployment config
```

### Front-end Stack
- **Next.js 14+** with App Router and Pages Router
- **Sitecore Content SDK** (replaces JSS)
- **Tailwind CSS** + **Shadcn/ui** components
- **TypeScript** strict mode

### Component Pattern
```typescript
// Components receive Sitecore field data as props
// Must handle: editing mode, missing data, safe destructuring

import { Text, Image, useSitecore } from '@sitecore-content-sdk/nextjs';

interface HeroProps {
  fields: {
    data?: {
      datasource?: {
        title?: { jsonValue?: Field };
        backgroundImage?: { jsonValue?: Field };
      };
    };
  };
}

export default function Hero({ fields }: HeroProps) {
  const { page } = useSitecore();
  const { isEditing } = page.mode;
  const { data } = fields || {};
  const { datasource } = data || {};

  return (
    <section>
      {(datasource?.title?.jsonValue?.value || isEditing) &&
        <Text field={datasource?.title?.jsonValue} tag="h1" />}
    </section>
  );
}
```

### Component Registration
- Components must be registered in the **component map** (server or client)
- Map name must match the rendering name in Sitecore
- Server components and client components have separate maps

---

## SXA Modules

SXA provides pre-built modules that add templates, renderings, and functionality:

| Module | Provides |
|---|---|
| SXA | Core site structure, page types, navigation |
| Headless Services | GraphQL endpoints, layout service |
| Content Search | Solr integration, search components |
| Forms | Form builder and rendering |

---

## Important IDs (Standard)

These are well-known Sitecore template/item IDs:

| Item | GUID |
|---|---|
| Template folder | `{3C1715FE-6A13-4FCF-845F-DE308BA9741D}` |
| Standard template | `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` |
| _PerSiteStandardValues | `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` |
| Folder template | `{A87A00B1-E6DB-45AB-8B54-636FEC3B5523}` |
| Media folder | `{FE5DD826-48C6-436D-B87A-7C4210C7413B}` |
| Template Folder | `{0437FEE2-44C9-46A6-ABE9-28858D9FEE8C}` |
| Rendering Folder | `{840D4A46-5503-49EC-BF9D-BD090946C63D}` |
| Template Field | `{455A3E98-A627-4B40-8035-E683A0331AC7}` |

> **Note:** Project-specific template IDs must be discovered by querying the CM or pulling serialized content. Use `dotnet sitecore ser pull` to export and inspect.

### _PerSiteStandardValues — REQUIRED for Custom Datasource Templates

The `_PerSiteStandardValues` base template (`{44A022DB-56D3-419A-B43B-E27E4D8E9C41}`) is **REQUIRED** on ALL custom datasource templates for SXA. Without it, the layout service cannot serialize datasource items — the Edge GraphQL layout query returns `rendered: {}` (empty).

Every custom template must inherit from BOTH:
- `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` (Standard template)
- `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` (_PerSiteStandardValues)

Set via `__Base template` field: `{1930BBEB-7805-471A-A3BE-4858AC7CF696}|{44A022DB-56D3-419A-B43B-E27E4D8E9C41}`

---

## Related Skills
- [CLI Commands](../access/cli-commands.md) — How to serialize/push content
- [Authoring GraphQL](../access/authoring-graphql.md) — How to query/mutate live
- [Path Conventions](path-conventions.md) — Where items live
- [Field Formats](field-formats.md) — How field values are structured
