---
name: sitecore-xm-cloud-content-sdk
description: Complete reference for building components in Sitecore XM Cloud (SitecoreAI) using the Next.js Content SDK. Use when creating, editing, or serializing Sitecore components, working with templates/renderings, datasource location/templates, handling editing mode, locale/language routing, managing component maps, grouping components under sites, or mapping Figma designs to Sitecore renderings.
---

# Sitecore XM Cloud — Next.js Content SDK Development

A comprehensive guide for building, serializing, and deploying components in Sitecore XM Cloud using the Next.js Content SDK. This document covers everything from code to Sitecore serialization to Figma integration. It is project-agnostic and applies to any multi-site XM Cloud setup.

---

## Architecture Overview

```
/examples/[site-name]/              ← Next.js rendering host (one per site/brand)
  src/
    components/                     ← React components
    app/                            ← Next.js App Router pages
    i18n/                           ← locale routing
  .env.local                        ← edge context ID, site name, secrets
/authoring/items/                   ← Sitecore serialization YAMLs
  items/templates/items/
    [module-name]/                  ← namespace folder
      [module].module.json          ← serialization module manifest
      ccl.templates/                ← template + field definitions
      ccl.renderings/               ← rendering definitions
```

### Multiple Sites in One Repo

Each brand/site is a separate Next.js app under `/examples/`. Each has its own:
- `.env.local` with its own `SITECORE_EDGE_CONTEXT_ID` and site name
- `src/components/` folder with brand-specific components
- Serialization namespace grouping under the Sitecore tree

**Example structure used in this project:**
- `kit-nextjs-skate-park` → main brand site (e.g. ADNOC group homepage)
- `kit-nextjs-product-listing` → sub-brand site (e.g. XRG brand homepage)

Each site's components live in separate Sitecore template/rendering folders, grouped by site, so editors never see components from the wrong brand.

---

## Environment Variables

```env
SITECORE_EDGE_CONTEXT_ID=...              # server-side GraphQL requests
NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=...  # client-side (browser) requests
NEXT_PUBLIC_DEFAULT_SITE_NAME=[site]      # Sitecore site name
SITECORE_EDITING_SECRET=...               # shared secret for editing endpoint
NEXT_PUBLIC_DEFAULT_LANGUAGE=en           # default locale
```

---

## Component Development — kit-nextjs-skate-park Pattern

### File structure

```
src/components/[kebab-name]/[PascalName].tsx
```

One file per component. No separate `.props.ts` or `.dev.tsx` files.

### Rules

1. Always add `'use client';` at the very top — the component client map is **auto-generated** from files with this directive. Without it, the component won't be registered.
2. Export the component as `Default` (named export, not default export).
3. Always guard against `!fields` and render an empty hint for Sitecore editing scaffolding.
4. Import `ComponentProps` from `lib/component-props` — this provides `params` and other Sitecore-injected props.

### Full component template

```tsx
'use client';

import React, { JSX, useState, useEffect } from 'react';
import {
  NextImage as ContentSdkImage,
  ImageField,
  Link,
  LinkField,
  TextField,
  Text,
  RichTextField,
  RichText,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

interface Fields {
  Headline: TextField;
  Paragraph: RichTextField;
  CTALink: LinkField;
  CTAText: TextField;
  BackgroundImage: ImageField;
}

type MyComponentProps = ComponentProps & { fields: Fields };

export const Default = (props: MyComponentProps): JSX.Element => {
  const { fields, params } = props;
  const containerStyles = params?.styles ?? '';
  const styles = `${params?.GridParameters ?? ''} ${containerStyles}`.trimEnd();
  const id = params?.RenderingIdentifier;
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;

  if (!fields) {
    return (
      <div className={`component my-component ${styles}`} id={id}>
        <div className="component-content">
          <span className="is-empty-hint">My Component</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`component my-component ${styles}`} id={id}>
      <Text field={fields.Headline} tag="h2" />
      <RichText field={fields.Paragraph} />
      <ContentSdkImage
        field={{
          ...fields.BackgroundImage,
          value: { ...fields.BackgroundImage.value, style: { width: '100%', height: 'auto' } },
        }}
      />
      <Link field={fields.CTALink}>
        <Text field={fields.CTAText} />
      </Link>
    </div>
  );
};
```

### Image rendering — always use the spread pattern

```tsx
// WRONG — loses Sitecore editing attributes and media resizing
<img src={fields.Image.value?.src} />

// CORRECT
<ContentSdkImage
  field={{
    ...fields.Image,
    value: { ...fields.Image.value, style: { width: '100%', height: 'auto' } },
  }}
/>
```

### Editing mode

```tsx
const { page } = useSitecore();
const isEditing = page?.mode?.isEditing ?? false;
```

- Fixed/absolute positioned headers must use `pointerEvents: 'none'` on the outer wrapper and `pointerEvents: 'auto'` on interactive children so the Sitecore Experience Editor can click through to place components in placeholders beneath.
- Never render `position: fixed` overlays unconditionally — they block Sitecore chrome interactions. Guard with `isEditing`.

---

## Component Development — kit-nextjs-product-listing Pattern

Three files per component:

```
src/components/[name]/[name].props.ts         ← TypeScript interface + type alias
src/components/[name]/[Name]Default.dev.tsx   ← preview/dev component ('use client')
src/components/[name]/[Name].tsx              ← entry ('use client'), exports Default
```

The entry file checks `page.mode.isEditing` and passes it to the dev component. The dev component uses `NoDataFallback` from `@/utils/NoDataFallback` when `fields` is absent.

---

## Component Map

### kit-nextjs-skate-park

The component map **is auto-generated** — do NOT edit it manually.

```bash
npx sitecore-tools project component generate-map
```

This scans all `*.tsx` files with `'use client'` and builds:
- `src/temp/component-map.ts` — server-side map
- `src/temp/component-map.client.ts` — client-side map

The workflow startup command runs this automatically:
```bash
npx sitecore-tools project component generate-map 2>/dev/null; npx next dev ...
```

**If a new component isn't showing up in the editor:** Confirm `'use client'` is present and restart the workflow to regenerate the maps.

### kit-nextjs-product-listing

Both maps must be updated **manually**:
- `src/temp/component-map.ts`
- `src/temp/component-map.client.ts`

**CRITICAL:** These files have Windows `\r\n` line endings. NEVER edit them with `sed` — it strips line endings and breaks the files silently. Use Node.js scripts or the `write` tool to rewrite the entire file.

Pattern to add an entry:
```ts
// component-map.ts
import { MyComponent } from 'components/my-component/MyComponent';
// add to the map object:
MyComponent: MyComponent,
```

---

## Grouping Components Under Sites

In Sitecore, components (templates + renderings) are organized by site/brand so that editors only see relevant components in the Experience Editor toolbar.

### Template tree grouping

```
/sitecore/templates/Project/[namespace]/Components/
  [SiteA]/
    Banners/
      HeroBanner         ← site A components
    Page Content/
      InfoSection
  [SiteB]/
    Banners/
      CampaignBanner     ← site B components
    Page Content/
      ProductCard
```

### Rendering tree grouping

```
/sitecore/Layout/Renderings/Project/[namespace]/
  [SiteA]/
    Banners/
      HeroBanner.yml
  [SiteB]/
    Banners/
      CampaignBanner.yml
```

### In serialization YAMLs

The `Parent` GUID in each YAML must point to the correct site-specific category folder. Look up the parent GUID by reading existing YAMLs in that folder.

### Practical example from this project

| Site | Sitecore folder | Components |
|------|----------------|------------|
| Main brand (skate-park) | `Components/Navigation/`, `Components/Banners/`, `Components/Page Content/` | SiteHeader, SuperHeroBanner, GlobalImpact, etc. |
| Sub-brand (product-listing) | `Components/[SubBrand]/` | XRGHeader, XRGHeroSection, Bookshelf, etc. |

This prevents sub-brand components from polluting the main brand editor toolbar and vice versa.

---

## Sitecore Serialization — Full Reference

### Serialization module manifest

```json
// authoring/items/items/templates/items/[module].module.json
{
  "namespace": "Project.[YourNamespace]",
  "references": []
}
```

### File tree for one component (5 files minimum)

```
ccl.templates/[namespace]/Components/[Category]/
  ComponentName.yml                        ← 1. Template root
  ComponentName/
    ComponentName.yml                      ← 2. Field section
    ComponentName/__Standard Values.yml   ← 3. Standard values
    ComponentName/
      FieldOne.yml                         ← 4. Field (one file per field)
      FieldTwo.yml

ccl.renderings/[namespace]/[Category]/
  ComponentName.yml                        ← 5. Rendering definition
```

### Key system GUIDs (fixed — never change)

| Purpose | GUID |
|---------|------|
| Template item template | `ab86861a-6030-46c5-b394-e8f99e8b87db` |
| Field section template | `e269fbb5-3750-427a-9149-7aa950b49301` |
| Field item template | `455a3e98-a627-4b40-8035-e683a0331ac7` |
| Rendering item template | `04646a89-996f-4ee7-878a-ffdbf1f0ef0d` |
| Rendering base template | `0A98E368-CDB9-4E1E-927C-8E0C24A003FB` |
| Page template ID (for datasource query) | `2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE` |

### System field GUIDs (fixed — used in Languages section)

| Hint | GUID |
|------|------|
| `__Created` | `25bed78c-4957-4165-998a-ca1b52f67497` |
| `__Created by` | `5dd74568-4d4b-44c1-b513-0af5f4cda34f` |
| `__Revision` | `8cdc337e-a112-42fb-bbb4-4143751e123f` |
| `__Updated by` | `badd9cf9-53e0-4d0c-bcc0-2d784c282f6a` |
| `__Updated` | `d9cf14b1-fa16-4ba6-9288-e8a174d4d522` |
| `__Icon` | `06d5295c-ed2f-4a54-9bf2-26228d113318` |
| `__Base template` | `12c33f3f-86c5-43a5-aeb4-5598cec45116` |
| `__Standard values` | `f7d48a55-2158-4f02-9356-756654404f73` |
| `__Sortorder` | `ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e` |

### Field type GUIDs

| Hint | GUID |
|------|------|
| `Type` (field type string) | `ab162cc0-dc80-4abf-8871-998ee5d7ba32` |
| `Title` (field display name) | `19a69332-a23e-4e70-8d16-b2640cb24cc8` |
| `__Display name` | `b5e02ad9-d56f-4c41-a065-a133db87bdeb` |
| `Source` (image media source) | `1eb8ae32-e190-44a6-968d-ed904c794ebf` |

### Field type values

| Sitecore type | Use for |
|--------------|---------|
| `Single-Line Text` | Short labels, headings, kickers |
| `Multi-Line Text` | Medium text, descriptions |
| `Rich Text` | HTML paragraphs, formatted content |
| `Image` | Images (always add `Source: query:$siteMedia`) |
| `General Link` | Links (internal, external, media) |
| `Integer` | Numbers |
| `Checkbox` | Boolean toggle |
| `Droplink` | Reference to another item |

---

### YAML patterns

#### 1. Template root

```yaml
---
ID: "<new-guid>"
Parent: "<category-folder-guid>"
Template: "ab86861a-6030-46c5-b394-e8f99e8b87db"
Path: "/sitecore/templates/Project/[Namespace]/Components/[Category]/[ComponentName]"
SharedFields:
- ID: "06d5295c-ed2f-4a54-9bf2-26228d113318"
  Hint: __Icon
  Value: office/32x32/form_blue.png
- ID: "12c33f3f-86c5-43a5-aeb4-5598cec45116"
  Hint: __Base template
  Value: |
    {1930BBEB-7805-471A-A3BE-4858AC7CF696}
    {44A022DB-56D3-419A-B43B-E27E4D8E9C41}
- ID: "f7d48a55-2158-4f02-9356-756654404f73"
  Hint: __Standard values
  Value: "{<standard-values-guid>}"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20260101T120000Z
    - ID: "5dd74568-4d4b-44c1-b513-0af5f4cda34f"
      Hint: __Created by
      Value: |
        sitecore\Admin
    - ID: "8cdc337e-a112-42fb-bbb4-4143751e123f"
      Hint: __Revision
      Value: "<new-guid>"
    - ID: "badd9cf9-53e0-4d0c-bcc0-2d784c282f6a"
      Hint: __Updated by
      Value: |
        sitecore\Admin
    - ID: "d9cf14b1-fa16-4ba6-9288-e8a174d4d522"
      Hint: __Updated
      Value: 20260101T120000Z
```

#### 2. Field section

```yaml
---
ID: "<new-guid>"
Parent: "<template-root-guid>"
Template: "e269fbb5-3750-427a-9149-7aa950b49301"
Path: "/sitecore/templates/Project/[Namespace]/Components/[Category]/[ComponentName]/[ComponentName]"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20260101T120000Z
    - ID: "5dd74568-4d4b-44c1-b513-0af5f4cda34f"
      Hint: __Created by
      Value: |
        sitecore\Admin
    - ID: "8cdc337e-a112-42fb-bbb4-4143751e123f"
      Hint: __Revision
      Value: "<new-guid>"
    - ID: "badd9cf9-53e0-4d0c-bcc0-2d784c282f6a"
      Hint: __Updated by
      Value: |
        sitecore\Admin
    - ID: "d9cf14b1-fa16-4ba6-9288-e8a174d4d522"
      Hint: __Updated
      Value: 20260101T120000Z
```

#### 3. Field item

```yaml
---
ID: "<new-guid>"
Parent: "<field-section-guid>"
Template: "455a3e98-a627-4b40-8035-e683a0331ac7"
Path: "/sitecore/templates/Project/[Namespace]/Components/[Category]/[ComponentName]/[ComponentName]/[FieldName]"
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: Single-Line Text
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100                    # increment by 100 per field
Languages:
- Language: en
  Fields:
  - ID: "19a69332-a23e-4e70-8d16-b2640cb24cc8"
    Hint: Title
    Value: FieldName
  - ID: "b5e02ad9-d56f-4c41-a065-a133db87bdeb"
    Hint: __Display name
    Value: Field Name
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20260101T120000Z
    - ID: "5dd74568-4d4b-44c1-b513-0af5f4cda34f"
      Hint: __Created by
      Value: |
        sitecore\Admin
    - ID: "8cdc337e-a112-42fb-bbb4-4143751e123f"
      Hint: __Revision
      Value: "<new-guid>"
    - ID: "badd9cf9-53e0-4d0c-bcc0-2d784c282f6a"
      Hint: __Updated by
      Value: |
        sitecore\Admin
    - ID: "d9cf14b1-fa16-4ba6-9288-e8a174d4d522"
      Hint: __Updated
      Value: 20260101T120000Z
```

**For Image fields, add the Source shared field:**

```yaml
SharedFields:
- ID: "1eb8ae32-e190-44a6-968d-ed904c794ebf"
  Hint: Source
  Value: "query:$siteMedia"
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: Image
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100
```

#### 4. Standard Values

```yaml
---
ID: "<standard-values-guid>"
Parent: "<template-root-guid>"
Template: "<template-root-guid>"
Path: "/sitecore/templates/Project/[Namespace]/Components/[Category]/[ComponentName]/__Standard Values"
SharedFields:
- ID: "b036823e-397a-4fbb-a09d-6d9e1a4149bd"
  Hint: __Renderings
  Value: ""
- ID: "f1a1fe9e-a60c-4ddb-a3a0-bb5b89b5e37c"
  Hint: __Final Renderings
  Value: ""
```

#### 5. Rendering definition

```yaml
---
ID: "<new-guid>"
Parent: "<renderings-category-folder-guid>"
Template: "04646a89-996f-4ee7-878a-ffdbf1f0ef0d"
Path: "/sitecore/Layout/Renderings/Project/[Namespace]/[Category]/[ComponentName]"
SharedFields:
- ID: "12c33f3f-86c5-43a5-aeb4-5598cec45116"
  Hint: __Base template
  Value: "{0A98E368-CDB9-4E1E-927C-8E0C24A003FB}"
- ID: "b5978376-f6e0-4060-8d51-07338ec3ad2c"
  Hint: Datasource Location
  Value: "query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/[FolderName]"
- ID: "1a7c631d-d6dc-4478-9c0c-4e5bff2c6e4c"
  Hint: Datasource Template
  Value: "<template-root-guid>"
- ID: "e0f1e0a3-e05d-4674-8b0a-2dc8ff25e6d9"
  Hint: Component Name
  Value: [ComponentName]
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20260101T120000Z
    - ID: "5dd74568-4d4b-44c1-b513-0af5f4cda34f"
      Hint: __Created by
      Value: |
        sitecore\Admin
    - ID: "8cdc337e-a112-42fb-bbb4-4143751e123f"
      Hint: __Revision
      Value: "<new-guid>"
    - ID: "badd9cf9-53e0-4d0c-bcc0-2d784c282f6a"
      Hint: __Updated by
      Value: |
        sitecore\Admin
    - ID: "d9cf14b1-fa16-4ba6-9288-e8a174d4d522"
      Hint: __Updated
      Value: 20260101T120000Z
```

---

## Datasource Location, Template, and Query

### What datasource location does

The **Datasource Location** on a rendering tells the Sitecore Experience Editor where to look when an editor clicks "Create datasource" for that component. It defines the folder path where the component's data item will be created and stored.

### The datasource query pattern

```
query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/[FolderName]
```

**Breaking this down:**
- `query:` — tells Sitecore to evaluate this as a Sitecore query rather than a literal path
- `./ancestor-or-self::*` — start from the current page item and walk up the tree
- `[@@templateid='{2DC3AF7B...}']` — stop at the item that matches the Page template ID (the site root or page root)
- `/Data/[FolderName]` — navigate to the `Data` subfolder, then the named folder for this component type

**Result:** Datasource items for `HeroBanner` go to `[PageRoot]/Data/HeroBanner/`, keeping content well-organized under each page.

### What datasource template does

The **Datasource Template** on a rendering is the GUID of the component's template. When an editor creates a new datasource from the Experience Editor, Sitecore uses this template to create the new data item, so it has all the right fields ready to fill in.

```yaml
- ID: "1a7c631d-d6dc-4478-9c0c-4e5bff2c6e4c"
  Hint: Datasource Template
  Value: "<template-root-guid>"    # GUID of your component's template
```

### For global/shared components (headers, footers)

Global components like headers and footers should use a shared global data folder rather than a per-page folder:

```
query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/Global
```

Or a site-root-relative path if the component always comes from the same item:

```
/sitecore/content/[SiteName]/Data/SiteHeader
```

---

## Pushing Serialization to Sitecore

```bash
# From inside the Next.js app folder
dotnet tool restore          # first time only — installs Sitecore CLI
dotnet sitecore ser push     # pushes all templates + renderings

# After push, regenerate component map
npx sitecore-tools project component generate-map

# Or just restart the workflow — it runs generate-map on startup
```

**Important:** New fields added in YAML files will NOT appear in the Sitecore Experience Editor until you run `dotnet sitecore ser push`. The rendering host can render a component with new fields before the push, but the editor won't show the fields.

---

## Figma to Sitecore — Complete Workflow

### Phase 1: Analyse the Figma design

Use the Figma MCP tool (`mcpFigma_getDesignContext`, `mcpFigma_getScreenshot`) to inspect the design file.

For each component frame in Figma:
1. **Identify the visual zones** — what are the distinct content areas? (headline, image, CTA, stats, etc.)
2. **Map each content zone to a Sitecore field type:**
   - Short labels → `Single-Line Text`
   - Long descriptive text → `Multi-Line Text`
   - HTML-formatted content → `Rich Text`
   - Photos, background images → `Image`
   - Buttons/links → `General Link`
   - Repeating groups (e.g. 4 stat cards) → numbered fields (`Stat1Value`, `Stat1Label`, `Stat2Value`, `Stat2Label`, ...)
3. **Identify what is content vs. what is design** — hardcoded colours, spacing, typography are design decisions, not Sitecore fields. Only things an editor would want to change become fields.

### Phase 2: Map Figma → Sitecore fields

| Figma element | Sitecore field type | Notes |
|--------------|-------------------|-------|
| Short text label | `Single-Line Text` | Titles, kickers, stat values |
| Long paragraph | `Multi-Line Text` or `Rich Text` | Use Rich Text if formatting (bold, links) needed |
| Image / photo | `Image` | Always add `Source: query:$siteMedia` |
| Button / link | `General Link` | Stores href, link text, target |
| Repeated card set | Numbered fields × N | e.g. `Card1Image`, `Card1Title`, `Card1Link` |
| Icon | `Image` | Editors upload SVG/PNG icons |
| Video | `General Link` or custom | Link to video URL |
| Date | `Single-Line Text` or `DateTime` | Use DateTime for sortable dates |

### Phase 3: Define the component name and category

- Component name: PascalCase, descriptive (e.g. `HeroBanner`, `StatsCarousel`, `LeadershipQuote`)
- Category: matches the rendering toolbar grouping in Sitecore (`Banners`, `Page Content`, `Navigation`, `Media`)
- Naming convention: `[DescriptiveFunction][ComponentType]` — never generic names like `Section1` or `Block`

### Phase 4: Build the React component

1. Write the `Fields` interface based on the field mapping above
2. Build the JSX matching the Figma visual design — pixel-accurate spacing, font sizes, colours
3. Use `clamp()` for responsive sizing: `clamp(minPx, preferredVw, maxPx)`
4. Test in the rendering host preview before writing any YAML

### Phase 5: Write serialization YAMLs

Follow the YAML patterns above. Generate all GUIDs fresh with `crypto.randomUUID()`.

For a typical Figma component with 8 fields, you need:
- 1 template root YAML
- 1 field section YAML
- 8 field YAMLs
- 1 standard values YAML
- 1 rendering YAML
= **12 files total**

### Phase 6: Push to Sitecore

```bash
dotnet sitecore ser push
```

### Phase 7: Map the rendering in the Sitecore Experience Editor

After pushing, go to the Experience Editor for your page:
1. Open a page for editing
2. In the component toolbar, find your new component under its category
3. Drag it onto the correct placeholder
4. Click "Create datasource" to create a new data item using your datasource template
5. Fill in the fields
6. The component renders with live data

### Figma component → Sitecore rendering name mapping

The `Component Name` field in the rendering YAML must **exactly match** the React component export name. This is how the rendering host maps a Sitecore layout response to a React component.

```yaml
# Rendering YAML
- ID: "e0f1e0a3-e05d-4674-8b0a-2dc8ff25e6d9"
  Hint: Component Name
  Value: HeroBanner           # must match export name in TSX
```

```tsx
// HeroBanner.tsx
export const Default = (props: HeroBannerProps) => { ... }
// Component Name registered in the map as "HeroBanner"
```

The component map auto-generated by `sitecore-tools` links the `Component Name` string to the `Default` export from the TSX file. If the name doesn't match, the component renders as a blank or shows an "unknown component" error.

---

## Locale / Language Routing

- URL uses short locale code: `/ar/page`, `/fr/page`
- Sitecore API uses full locale: `ar-AE`, `fr-FR`
- Map them in `src/i18n/routing.ts`:

```ts
export function toSitecoreLocale(locale: string): string {
  const map: Record<string, string> = {
    ar: 'ar-AE',
    fr: 'fr-FR',
  };
  return map[locale] ?? locale;
}
```

- RTL support in layout:
```tsx
<html lang={locale} dir={context?.language === 'ar-AE' ? 'rtl' : 'ltr'}>
```

- Language switcher URL builder (handles `as-needed` localePrefix where `/en/` is omitted):

```ts
function buildLangSwitchUrl(pathname: string, currentLang: string, targetLang: string): string {
  // Remove current locale prefix, then inject target
  const withoutLocale = pathname.replace(new RegExp(`\\/${currentLang}(\\/|$)`), '$1') || '/';
  if (targetLang === 'en') return withoutLocale; // en uses no prefix
  return withoutLocale === '/'
    ? `/${targetLang}`
    : withoutLocale.replace(/^(\/[^/]+)/, `$1/${targetLang}`);
}
```

---

## Favicon — Dual Domain Problem

XM Cloud editing runs on a different subdomain than the rendering host. Relative paths don't work for the favicon in the editing environment.

**Solution: two-pronged approach**

```tsx
// layout.tsx — for the rendering host (Replit, Vercel, etc.)
<link rel="icon" href="/favicon.png" type="image/png" />

// SiteHeader component useEffect — for XM Cloud editing domain
useEffect(() => {
  const isSitecoreDomain = window.location.hostname.includes('sitecorecloud.io');
  if (isEditing || isSitecoreDomain) {
    const logoSrc = (fields?.Logo?.value?.src as string) || '';
    const match = logoSrc.match(/(https?:\/\/[^/]+\.sitecorecloud\.io)/);
    if (match) {
      const cmHost = match[1]; // extract CM host from logo URL
      const link = document.querySelector('link[rel="icon"]') || document.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('href', `${cmHost}/-/jssmedia/[path-to-favicon]`);
      if (!link.parentNode) document.head.appendChild(link);
    }
  }
}, [isEditing, fields]);
```

The logo's `src` URL contains the CM host — use a regex to extract it rather than hardcoding a domain.

---

## Full-Width Breakout Pattern

For components that must span 100vw inside a constrained-width layout:

```tsx
const ref = useRef<HTMLDivElement>(null);
const [breakout, setBreakout] = useState({ marginLeft: 0, width: '100vw' });

useEffect(() => {
  const update = () => {
    if (ref.current) {
      const left = ref.current.getBoundingClientRect().left;
      setBreakout({ marginLeft: -left, width: `${window.innerWidth}px` });
    }
  };
  update();
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
}, []);

return (
  <div ref={ref}>
    <div style={{ marginLeft: breakout.marginLeft, width: breakout.width }}>
      {/* full-width content */}
    </div>
  </div>
);
```

---

## Common Mistakes — Never Repeat These

### 1. NEVER use `sed` on component-map files
Windows `\r\n` line endings are silently corrupted by `sed`. Use Node.js or the `write` tool to rewrite the entire file.

### 2. NEVER copy-paste GUIDs between YAML items
Every ID and Revision must be a fresh UUID. Use `crypto.randomUUID()` in the code execution sandbox to generate them in bulk.

### 3. Git conflict resolution requires `git add` after writing the file
Writing a clean file without conflict markers is not enough. Git still considers the file conflicted until you run:
```bash
git add path/to/file.tsx
```
Then click "Complete merge and commit" in the Git panel.

### 4. Never run destructive git commands from the agent
`git reset`, `git checkout --`, `git merge --abort`, `rm .git/index.lock` are all blocked. Tell the user to run them in the Shell tab.

### 5. Editing domain ≠ CM media domain
The XM Cloud editing environment (`*-eh.sitecorecloud.io`) is different from the CM/media host (`*-dev*.sitecorecloud.io`). Extract the CM host dynamically from media field URLs rather than hardcoding.

### 6. New fields need `dotnet sitecore ser push` before appearing in the editor
Adding field YAMLs and pushing code to the rendering host is not enough. The template changes must be pushed to Sitecore separately. Editors won't see new fields until after the push.

### 7. Rendering host code changes need deploy to appear in XM Cloud editing
The Experience Editor iframes the rendering host. Local Replit changes only show in the Replit preview. Push to GitHub and redeploy the rendering host for XM Cloud editors to see the update.

### 8. `'use client'` is mandatory in kit-nextjs-skate-park
Without `'use client'` at the top of the component file, `sitecore-tools generate-map` won't pick it up, and the component will not appear in the Sitecore component list.

### 9. Component Name in rendering YAML must match the React component registration name exactly
Case-sensitive. A mismatch causes blank rendering or "component not found" in the editor.

### 10. Never render fixed overlays without `isEditing` guards
A `position: fixed` overlay that covers the page in editing mode blocks all Sitecore chrome interactions. Always conditionally hide or use `pointerEvents: none` in editing mode.

---

## Useful Commands

```bash
# Regenerate component client map
npx sitecore-tools project component generate-map

# Push serialization to Sitecore (templates + renderings)
dotnet tool restore && dotnet sitecore ser push

# Rebuild Sitecore config files from live instance
npx sitecore-tools project build

# Run dev server
npx next dev -H 0.0.0.0 -p 5000

# Generate fresh GUIDs in Node.js (for YAML files)
node -e "const c=require('crypto');for(let i=0;i<10;i++)console.log(c.randomUUID())"
```
