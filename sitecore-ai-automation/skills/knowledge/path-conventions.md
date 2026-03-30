# Path Conventions — Knowledge Skill

## Purpose
Standard Sitecore item paths and naming conventions. Know where things live before creating or querying.

---

## Content Paths

| Path | Purpose |
|---|---|
| `/sitecore/content/{Tenant}` | Site Collection (tenant root) |
| `/sitecore/content/{Tenant}/{Site}` | Individual site |
| `/sitecore/content/{Tenant}/{Site}/Home` | Site home page |
| `/sitecore/content/{Tenant}/{Site}/Home/{page}` | Child pages |
| `/sitecore/content/{Tenant}/{Site}/Data` | Shared datasource items |
| `/sitecore/content/{Tenant}/{Site}/Dictionary` | Localization labels |
| `/sitecore/content/{Tenant}/{Site}/Settings` | Site settings |
| `/sitecore/content/{Tenant}/{Site}/Media` | Site-specific media references |

---

## Template Paths (SXA Pattern — grouped by site name)

| Path | Purpose |
|---|---|
| `/sitecore/templates/Foundation` | Base/abstract templates |
| `/sitecore/templates/Feature` | Module templates (SXA etc.) |
| `/sitecore/templates/Project/{Tenant}` | Project Folder (tenant-level) |
| `/sitecore/templates/Project/{Tenant}/Components/` | Template Folder root |
| `/sitecore/templates/Project/{Tenant}/Components/{SiteName}/` | **Site-level folder — all site templates here (flat)** |
| `/sitecore/templates/System` | Sitecore system templates |

Example: `/sitecore/templates/Project/Adnoc/Components/adnocgas/HeroCentered`

**Site folder uses `Template Folder` template (`0437FEE2-44C9-46A6-ABE9-28858D9FEE8C`).**
**Grouping is by site name, NOT by component category.** Each site gets one folder with all its templates flat inside.

---

## Layout & Rendering Paths (SXA Pattern — grouped by site name)

| Path | Purpose |
|---|---|
| `/sitecore/layout/Renderings/Foundation` | Base renderings |
| `/sitecore/layout/Renderings/Feature` | SXA module renderings |
| `/sitecore/layout/Renderings/Project/{Tenant}/` | Rendering Folder root |
| `/sitecore/layout/Renderings/Project/{Tenant}/{SiteName}/` | **Site-level folder — all site renderings here (flat)** |
| `/sitecore/layout/Placeholder Settings` | Placeholder configuration |
| `/sitecore/layout/Layouts` | Layout definitions |

Example: `/sitecore/layout/Renderings/Project/Adnoc/adnocgas/HeroVideo`

**Site folder uses `Rendering Folder` template (`840D4A46-5503-49EC-BF9D-BD090946C63D`).**
**Grouping mirrors template structure — same site name.**

---

## Media Library Paths

| Path | Purpose |
|---|---|
| `/sitecore/media library/Project/{Tenant}/{Site}` | Site media |
| `/sitecore/media library/Project/{Tenant}/{Site}/Images` | Images |
| `/sitecore/media library/Project/{Tenant}/{Site}/Documents` | PDFs, docs |
| `/sitecore/media library/Default Website` | Legacy/default media |

---

## System Paths

| Path | Purpose |
|---|---|
| `/sitecore/system/Settings/Services/API Keys` | GraphQL/Edge API keys |
| `/sitecore/system/Settings/Services/Rendering Hosts` | Rendering host configs |
| `/sitecore/system/Languages` | Installed languages |
| `/sitecore/system/Workflows` | Workflow definitions |

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Item names | Lowercase with hyphens | `about-us`, `product-listing` |
| Template names | PascalCase | `ArticlePage`, `HeroComponent` |
| Rendering names | PascalCase | `HeroBanner`, `NavigationMenu` |
| Field names | PascalCase | `Title`, `BackgroundImage`, `NavigationTitle` |
| Placeholder keys | lowercase with hyphens | `main-content`, `sidebar`, `header` |
| Media filenames | lowercase with hyphens | `hero-image.jpg`, `logo.png` |

---

## URL → Item Path Mapping

The rendering host maps URLs to Sitecore items:

| URL | Sitecore Path |
|---|---|
| `/` | `/sitecore/content/{Tenant}/{Site}/Home` |
| `/about` | `/sitecore/content/{Tenant}/{Site}/Home/about` |
| `/products/widget` | `/sitecore/content/{Tenant}/{Site}/Home/products/widget` |

---

## Related Skills
- [SXA Architecture](sxa-architecture.md) — Full hierarchy explanation
- [Template Reference](template-reference.md) — Template details and IDs
