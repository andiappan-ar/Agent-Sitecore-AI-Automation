# Generated Output — adnocgas.ae

Generated: 2026-03-28
Source: https://www.adnocgas.ae
Collection: Adnoc
Site: adnocgas
Languages: en, ar-AE

## What's Here

### templates/ (13 components × ~6 files = 78 YAMLs)
Sitecore template definitions following the 5-file pattern:
- Template root (under /sitecore/templates/Project/Adnoc/Components/)
- Content section
- Field items (mapped from scraper schema types → Sitecore field types)
- __Standard Values
- Ready for: `dotnet sitecore ser push`

### renderings/ (13 YAMLs)
Sitecore rendering definitions (under /sitecore/layout/Renderings/Project/Adnoc/)

### pages/ (15 YAMLs — 10 en + 5 ar)
Page items under /sitecore/content/Adnoc/adnocgas/Home/

### Component Summary

| Component | Type | Variant | Fields |
|---|---|---|---|
| Accordion | accordion | default | heading, description |
| Breadcrumb | breadcrumb | default | heading |
| CardTextOnly | card-grid | card-text-only | heading, description, cta |
| Carousel | carousel | default | heading, description, cta |
| ContentSection | content-section | default | heading |
| HeroCentered | hero | hero-centered | heading, backgroundImage, backgroundVideo, overlay |
| HeroVideo | hero | hero-video | heading, description, backgroundImage, backgroundVideo, overlay |
| MultiColumn (footer) | footer | multi-column | heading, description, logo, copyright |
| Sidebar | sidebar | default | (none) |
| SplitContent | split-content | default | heading, description |
| Stats | stats | default | heading, description |
| StickyTransparentMega (header) | header | sticky-transparent-mega | heading, description, logo |
| VideoSection | video-section | default | (none) |

## Next Steps
1. Copy templates/ and renderings/ to xmcloud/authoring/items/
2. Create module.json for serialization
3. `dotnet sitecore ser push` to deploy to CM
4. Create datasource items with content
5. Add __Renderings XML to pages
