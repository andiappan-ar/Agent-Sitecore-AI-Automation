# React → Sitecore Component — Conversion Checklist

Step-by-step checklist for converting a scrapper React component to a Sitecore Content SDK TSX component. Learned from real Header + Hero conversions on adnocgas project.

---

## Pre-Conversion

- [ ] Read the scrapper `.jsx` file — this is the source of truth for visual structure
- [ ] Read the scrapper `.json` content file — understand all data fields
- [ ] Read the extraction `.screenshot.png` — know the visual target
- [ ] Check if Sitecore template already exists in `xmcloud/authoring/items/adnocgas/adnocgas.templates/`

## Step 1: Design Sitecore Template Fields

**Rule: Every visually distinct piece of editable content = separate Sitecore field.**

| React Pattern | Sitecore Field Design |
|---|---|
| `{heading}` text | Single `TextField` (e.g. `Heading`) |
| `{description}` HTML | Single `RichTextField` (e.g. `Description`) |
| Large number `+10` + small unit `bscfd` on same line | **TWO fields**: `stat1Value` (Single-Line) + `stat1Unit` (Single-Line) |
| CTA button with text + link | **TWO fields**: `CtaLabel` (Single-Line) + `CtaLink` (General Link) |
| Logo image | Single `ImageField` (e.g. `Logo`) |
| Nav items × 7 | Numbered flat fields: `nav1Label`, `nav1Link`, `nav2Label`, `nav2Link`, etc. |
| `backgroundImage` CSS | `ImageField` (but see Image field rules below) |

**DON'T combine visually different elements into one field.** If number is 80px and unit is 23px, they MUST be separate fields or one of them won't be editable at the correct size.

## Step 2: Create/Update Template YAML

For each new field, create `{FieldName}.yml` under the template's `Content/` folder:
```yaml
---
ID: "{unique-guid}"
Parent: "{content-section-guid}"
Template: "455a3e98-a627-4b40-8035-e683a0331ac7"
Path: /sitecore/templates/Project/Adnoc/Components/adnocgas/{TemplateName}/Content/{FieldName}
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: {Single-Line Text | Rich Text | Image | General Link}
```

## Step 3: Update Rendering YAML (CRITICAL)

The rendering MUST have these SharedFields or datasource linking will fail:
```yaml
SharedFields:
- ID: "037fe404-dd19-4bf7-8e30-4dadf68b27b0"
  Hint: componentName
  Value: {ComponentName}
- ID: "1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f"
  Hint: Datasource Template
  Value: "/sitecore/templates/Project/Adnoc/Components/adnocgas/{TemplateName}"
- ID: "b5b27af1-25ef-405c-87ce-369b3a004016"
  Hint: Datasource Location
  Value: "./Data"
- ID: "7d8ae35f-9ed1-43b5-96a2-0a5f040d4e4e"
  Hint: Open Properties after Add
  Value: 0
- ID: "a3411ff6-c978-40aa-b059-a49b9ca2209b"
  Hint: Can select Page as a data source
  Value: 1
- ID: "e829c217-5e94-4306-9c48-2634b094fdc2"
  Hint: OtherProperties
  Value: IsRenderingsWithDynamicPlaceholders=true
```

**Without `Datasource Template` and `Datasource Location`, the layout service returns 500 when a datasource is linked.**

## Step 4: Convert JSX → TSX

**Rule: Take the EXACT scrapper .jsx. Only replace content references with Sitecore fields. Keep ALL CSS classes, structure, sub-components identical.**

### What to replace:

| Scrapper JSX | Sitecore TSX |
|---|---|
| `{heading}` | `<Text field={fields.Heading} tag="h1" className="..." />` |
| `{description}` | `<RichText field={fields.Description} className="..." />` |
| `<img src={logoSrc}>` | `<ContentSdkImage field={{ ...fields.Logo, value: { ...fields.Logo?.value, src: logoSrc, style: {...} } }} />` |
| `{stat.value}` (big) + `{stat.unit}` (small) | `<Text field={stat.value} tag="span" />` + `<Text field={stat.unit} tag="span" className="text-[23px]" />` |
| `<a href={cta.href}>{cta.text}</a>` | In edit mode: `<Text field={CtaLabel} tag="span">`. Normal: `<a href={ctaHref}>{ctaLabel}</a>` |

### What to keep exactly the same:
- All Tailwind classes
- Component structure / DOM hierarchy
- Sub-components (StockTicker, MobileNavItem, etc.)
- Responsive breakpoints
- Animations, transitions, hover effects
- SVG icons, scroll indicators

### File structure:
```typescript
'use client';
// JSDoc with template/rendering GUIDs
import { Text, RichText, ContentSdkImage, TextField, ... } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

interface Fields { ... }   // All Sitecore fields with ?
interface Props extends ComponentProps { params; fields; isPageEditing? }

const InnerComponent = (props) => { ... }  // Actual rendering

export const Default = (props) => {        // Exported variant with useSitecore()
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <InnerComponent {...props} isPageEditing={isEditing} />;
};
```

## Step 5: Create Datasource Content

### Field value rules:

| Field Type | Correct Value | WRONG Value (causes 500) |
|---|---|---|
| Single-Line Text | `"Company"` | — |
| Rich Text | `"<p>Text here</p>"` | — |
| Image (with media item) | `<image mediaid="{GUID}" alt="..." />` | `<image mediaid="" src="https://..." />` ← empty mediaid crashes |
| Image (no media item yet) | `""` (empty string) | `<image mediaid="" ...>` |
| General Link (URL path) | `<link linktype="external" url="/en/about" text="About" />` | `<link linktype="internal" url="/en/about" ...>` ← needs item GUID, not path |
| General Link (item ref) | `<link linktype="internal" id="{ITEM-GUID}" text="..." />` | — |

### Datasource placement:
- Lives at `/sitecore/content/Adnoc/adnocgas/Home/Data/{component-name}`
- Referenced in `__Renderings` XML as `s:ds="local:/Data/{component-name}"`

## Step 6: Place on Page

Add rendering to Home page `__Renderings` field:
```xml
<r
  uid="{UNIQUE-UID}"
  p:before="*"
  s:ds="local:/Data/{datasource-name}"
  s:id="{RENDERING-GUID}"
  s:ph="headless-main" />
```

## Step 7: Push & Verify

```bash
dotnet sitecore ser push -i adnocgas
# Verify layout service returns 200 with fields
curl -sk "https://xmcloudcm.localhost/sitecore/api/layout/render/jss?item=/&sc_apikey=...&sc_site=adnocgas&sc_lang=en"
```

If 500: check datasource for empty `mediaid=""` or `linktype="internal"` without item GUID.

## Step 8: Register in Component Map

Run `npm run sitecore-tools:generate-map` or manually add to `.sitecore/component-map.ts`:
```typescript
import * as ComponentName from 'src/components/adnocgas/ComponentName';
['ComponentName', { ...ComponentName, componentType: 'client' }],
```

---

## Common Pitfalls (from real conversions)

1. **Don't redesign the JSX** — take scrapper output exactly, only swap content for fields
2. **Every `<Text>` must have correct tag** — `tag="h1"`, `tag="span"`, `tag="div"` matching the original element
3. **Split fields when sizes differ** — `stat1Value` (80px) + `stat1Unit` (23px), not one combined field
4. **Image hostname rewrite** — Sitecore returns `adnocgas.localhost` URLs, rewrite to `xmcloudcm.localhost` for local dev
5. **`Date.now()` causes hydration errors** — use static placeholder instead
6. **Rendering needs Datasource Template field** — without it, layout service can't resolve datasource
7. **`linktype="internal"` needs Sitecore item GUID** — use `linktype="external"` for URL paths
