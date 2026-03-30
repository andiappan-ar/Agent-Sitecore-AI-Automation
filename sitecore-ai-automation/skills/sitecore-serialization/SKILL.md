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

**Key editing mode rules:**

1. **Fixed/absolute headers → `static` in editing mode.** A `fixed` header covers the main placeholder and prevents editors from clicking on it.
   ```tsx
   className={isPageEditing ? 'static' : 'fixed top-0 left-0 right-0 z-50'}
   ```

2. **Always use Sitecore field components** (`<Text>`, `<ContentSdkImage>`, `<Link>`) — never raw `{String(field.value)}`. Only field components create the inline-editing chrome in the Page Editor.
   ```tsx
   // ❌ NOT editable
   <h1>{String(title?.value || '')}</h1>

   // ✅ Editable in Page Editor
   <Text tag="h1" field={title} className="..." />
   ```

3. **Guard pattern for conditional rendering:**
   ```tsx
   {(title?.value || isPageEditing) && (
     <Text tag="h1" field={title} className="..." />
   )}
   ```

4. **Editable CTAs** — use `CTALinkBase` with `labelField` prop:
   ```tsx
   <CTALinkBase
     label={String(ctaLabel?.value || '')}
     href={String(ctaLink?.value?.href || '')}
     variant="dark"
     labelField={ctaLabel}
     isPageEditing={isPageEditing}
   />
   ```

5. **Disable `pointer-events-none`** on content wrappers in editing mode so editors can click:
   ```tsx
   className={`absolute inset-0 ${isPageEditing ? '' : 'pointer-events-none'}`}
   ```

6. **Disable click/touch/keyboard handlers** on carousels/sliders in editing mode:
   ```tsx
   onClick={isPageEditing ? undefined : handleSlideClick}
   onTouchStart={isPageEditing ? undefined : handleTouchStart}
   ```

7. **Disable auto-animation** in editing mode:
   ```tsx
   if (isPageEditing || prefersReducedMotion) return; // skip autoplay
   ```

8. **Disable scroll listeners** in editing mode:
   ```tsx
   useEffect(() => {
     if (isPageEditing) return;
     // scroll logic...
   }, [isPageEditing]);
   ```

9. **`pointerEvents` layering** — apply `pointerEvents: 'none'` on outer wrapper and `pointerEvents: 'auto'` on interactive children so the Experience Editor can click through to placeholders beneath.

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
| CBRE brand (product-listing) | `Components/CBRE/` | CBREHeroSection, CBREHeader, CBREFooter, CTALink, CBRELogo |

This prevents sub-brand components from polluting the main brand editor toolbar and vice versa.

### CBRE naming convention

**Always use uppercase `CBRE`** — never `Cbre` or `cbre` in:
- Folder names: `CBRE-hero-section/`, `CBRE-header/`
- File names: `CBREHeroSection.tsx`, `CBREHeader.tsx`
- Component names: `CBREHeroSection`, `CBREHeader`, `CBREFooter`
- Interface/type names: `CBREHeroSectionFields`, `CBREHeaderProps`
- YAML paths: `Components/CBRE/CBREHeroSection`
- Sitecore item names: `CBREHeroSection`, `CBREHeader`
- `data-component` attributes: `data-component="CBRE"`

The only exception is CSS class names from Figma designs (e.g. `cbre-c-zonedHomepage`) — leave those as-is.

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
| `Droplink` | Reference to another item (stores GUID) |
| `Droplist` | Dropdown of item names (stores the item's `key` string, NOT GUID). Use for page-level settings like headerMode |
| `Multilist` | Multi-select references to other items (resolved automatically in layout response) |
| `Treelist` | Tree-based multi-select (shows full tree, use Multilist with Source query instead) |

### Droplist Field Pattern (for page-level settings)

Droplist fields store a **string value** (the item's key), not a GUID. They're ideal for page-level configuration dropdowns.

**Template field YAML:**
```yaml
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: Droplist
- ID: "1eb8ae32-e190-44a6-968d-ed904c794ebf"
  Hint: Source
  Value: "/sitecore/content/cbre/cbre-global/Data/CBREHeader/HeaderMode"
- ID: "be351a73-fcb0-4213-93fa-c302d8ab4f51"
  Hint: Shared
  Value: "1"
```

**Data items (dropdown values):**
Each value is a separate Sitecore item with `key` and `value` fields:
```yaml
# Template: HeaderModeItem (fd4de61b-6256-46be-93ea-b04fd11b459e)
SharedFields:
- ID: "342a1948-100a-4ef0-a6fb-69bada8f0ca4"
  Hint: key
  Value: transparent-light
- ID: "e4f1204f-9c6f-4ab9-939b-aa1b0964eaec"
  Hint: value
  Value: Transparent Light
```

**Reading in React component:**
```tsx
function useHeaderMode(): HeaderMode {
  const { page } = useSitecore();
  const route = page?.layout?.sitecore?.route;
  const raw = (route?.fields?.headerMode as { value?: string } | undefined)?.value || '';
  const valid: HeaderMode[] = ['dark', 'light', 'transparent-dark', 'transparent-light'];
  return valid.includes(raw as HeaderMode) ? (raw as HeaderMode) : 'transparent-dark';
}
```

**Setting default value on __Standard Values:**
```yaml
# Page template __Standard Values.yml
SharedFields:
- ID: "160bc458-9b25-4246-b179-0726c0f78c3d"
  Hint: headerMode
  Value: dark
```

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
Path: "/sitecore/layout/Renderings/Project/[Namespace]/[Category]/[ComponentName]"
SharedFields:
- ID: "037fe404-dd19-4bf7-8e30-4dadf68b27b0"
  Hint: componentName
  Value: [ComponentName]
- ID: "06d5295c-ed2f-4a54-9bf2-26228d113318"
  Hint: __Icon
  Value: Office/32x32/painting_landscape.png
- ID: "1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f"
  Hint: Datasource Template
  Value: "/sitecore/templates/Project/[Namespace]/Components/[Category]/[ComponentName]"
- ID: "7d8ae35f-9ed1-43b5-96a2-0a5f040d4e4e"
  Hint: Open Properties after Add
  Value: 0
- ID: "a2f5d9df-8cba-4a1d-99eb-51acb94cb057"
  Hint: Page Editor Buttons
  Value: "{BD84B7C3-6DFD-406D-B637-FD9BC0F2E1A8}"
- ID: "a3411ff6-c978-40aa-b059-a49b9ca2209b"
  Hint: Can select Page as a data source
  Value: 1
- ID: "b5b27af1-25ef-405c-87ce-369b3a004016"
  Hint: Datasource Location
  Value: "query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/[ComponentName]"
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100
- ID: "dbbbeca1-21c7-4906-9dd2-493c1efa59a2"
  Hint: __Shared revision
  Value: "<new-guid>"
- ID: "e829c217-5e94-4306-9c48-2634b094fdc2"
  Hint: OtherProperties
  Value: IsRenderingsWithDynamicPlaceholders=true
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

### Rendering SharedField GUIDs

| Hint | GUID | Notes |
|------|------|-------|
| `componentName` | `037fe404-dd19-4bf7-8e30-4dadf68b27b0` | Must match React component map registration name exactly |
| `__Icon` | `06d5295c-ed2f-4a54-9bf2-26228d113318` | Icon shown in Experience Editor toolbar |
| `Datasource Template` | `1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f` | Path to the component's template (not GUID) |
| `Open Properties after Add` | `7d8ae35f-9ed1-43b5-96a2-0a5f040d4e4e` | Set to `0` to skip properties dialog |
| `Page Editor Buttons` | `a2f5d9df-8cba-4a1d-99eb-51acb94cb057` | `{BD84B7C3-...}` = standard edit buttons |
| `Can select Page as a data source` | `a3411ff6-c978-40aa-b059-a49b9ca2209b` | Set to `1` to allow page-level datasource |
| `Datasource Location` | `b5b27af1-25ef-405c-87ce-369b3a004016` | Query for datasource folder location |
| `__Sortorder` | `ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e` | Order in the rendering toolbar |
| `__Shared revision` | `dbbbeca1-21c7-4906-9dd2-493c1efa59a2` | Fresh GUID per rendering |
| `OtherProperties` | `e829c217-5e94-4306-9c48-2634b094fdc2` | `IsRenderingsWithDynamicPlaceholders=true` |
| `Parameters Template` | `a77e8568-1ab3-44f1-a664-b7c37ec7810d` | Optional — GUID of parameters template |
| `ComponentQuery` | `17bb046a-a32a-41b3-8315-81217947611b` | Optional — GraphQL component query |

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

In this project, global components (headers, footers, logos) use the **same per-component datasource pattern** as page-level components:

```
query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CBREHeader
query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CBREFooter
```

This keeps all datasource patterns consistent. Alternatively, for truly shared content across pages, you can use:

```
/sitecore/content/[SiteName]/Data/SiteHeader
```

---

## Pushing Serialization to Sitecore

```bash
# From inside the authoring/ folder (where .sitecore/ config lives)
dotnet tool restore               # first time only — installs Sitecore CLI (.NET 8.0 required)
dotnet sitecore ser push -n dev   # pushes all templates + renderings to the 'dev' endpoint

# Validate serialization files before pushing (local-only, no -n flag)
dotnet sitecore ser validate --fix

# After push, regenerate component map (from the Next.js app folder)
npx sitecore-tools project component generate-map

# Or just restart the workflow — it runs generate-map on startup
```

**Endpoint configuration:** The `-n dev` flag targets the endpoint defined in `.sitecore/user.json` with `allowWrite: true`. The `xmCloud` endpoint has `allowWrite: false` and cannot be used for pushing. Always use `-n dev`.

**Important:** New fields added in YAML files will NOT appear in the Sitecore Experience Editor until you run `dotnet sitecore ser push -n dev`. The rendering host can render a component with new fields before the push, but the editor won't show the fields.

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

### 11. Windows case-insensitive filesystem requires two-step rename
To rename `Cbre-header/` → `CBRE-header/` on Windows, you must do a two-step rename through a temporary name:
```bash
mv Cbre-header Cbre-header-tmp && mv Cbre-header-tmp CBRE-header
```
Direct case-only renames are silently ignored on Windows (NTFS is case-insensitive).

### 12. Sitecore CLI requires .NET 8.0 SDK
The Sitecore CLI (`dotnet sitecore`) version 6.0.23 requires .NET 8.0. If `dotnet tool restore` fails with NU1202, install the .NET 8.0 SDK.

### 13. `dotnet sitecore ser validate` does NOT accept `-n` flag
The `validate` command is a local file operation — it doesn't connect to Sitecore. Do NOT pass `-n dev` to it. Only `ser push` and `ser pull` need the endpoint flag.

### 14. Always use `-n dev` for `ser push` — the default endpoint doesn't exist
The `.sitecore/user.json` has `defaultEndpoint: "default"` but no endpoint named `default`. Always specify `-n dev` explicitly when pushing.

### 15. `__Masters` field GUID is `1172f251-dad4-4efb-a329-0c63500e4f1e`
The correct GUID for the `__Masters` (insert options) field is `1172f251-dad4-4efb-a329-0c63500e4f1e`. Do NOT use `1172f251-dad4-4efb-a329-a36dbfd24d08` (which is a different field). Verified by pulling from live Sitecore instance.

### 16. Multilist fields do NOT need GraphQL ComponentQuery
Multilist fields are fully resolved by the layout service (all nested levels). Do NOT create edge services, GraphQL queries, or ComponentQuery fields on the rendering YAML for Multilist data. Just access `fields.primaryLinks` directly as a resolved array.

### 17. SVG images in ContentSdkImage require explicit width/height
`ContentSdkImage` (uses Next.js Image) throws `"Image with src ...svg is missing required width property"`. Always pass `width` and `height` in the value spread for SVG images (logos, flags, icons).

---

## CBRE Component Registry

All CBRE components live in `kit-nextjs-product-listing` and are grouped under `Components/CBRE/` in Sitecore.

### Parent folder GUIDs

| Item | GUID | Purpose |
|------|------|---------|
| CBRE templates folder | `2d419efe-6977-47f5-8e25-d7c992e9faa6` | Parent for all CBRE template roots |
| CBRE renderings folder | `4883220a-c3a6-48c4-baf5-fb6a6151a14e` | Parent for all CBRE rendering definitions |
| Components folder | `aca8d4ff-30c9-4d84-8778-f609664ed4d1` | Top-level Components folder |
| Renderings root | `9dbe8119-926f-400a-a738-6f3a43f86f75` | Top-level Renderings folder |
| Folder template | `0437fee2-44c9-46a6-abe9-28858d9fee8c` | Template for Sitecore folders |
| Rendering folder template | `7ee0975b-0698-493e-b3a2-0b2ef33d0522` | Template for rendering category folders |

### Component GUIDs

| Component | Template Root | Field Section | Standard Values | Rendering |
|-----------|--------------|--------------|-----------------|-----------|
| CBREHeroSection | `cfb0c00c-3af6-4c86-a20e-4219e1952964` | `4d203102-332b-4115-9b84-1f38fcaa5fbe` | `9d39e5ed` | `0bb614ef-377b-47e2-9dde-3bb50a869dc4` |
| CBREHeader | `242f3954-b9af-49f3-8f62-9cb57c9c84fb` | `94716738-67ef-496e-9513-7ea60f74cf6b` | `9771afdb` | `71a91774-5f4d-4568-aae1-2ceee0aeecad` |
| HeaderLink | `b1f06bd6-f5e3-40ee-b8e2-85a0cc6a00b5` | `8908aeeb-9a0b-488f-9a67-77e2260b0ef9` | — | — (no rendering, content-only template) |
| CBREFooter | `837ecf99-815f-4367-95d6-3ffee19171ab` | `9eb735fc-a346-42a3-85f8-ccdba4abcb99` | `bc0358e6` | `aa6ae116-fee7-4f0a-904c-7e0ca5dd0dc4` |
| CTALink | `db4855bd` | `a9c12839` | `fe55521b` | `36b04144-c06b-4413-9890-466aeea53970` |
| CBRELogo | `d969628a` | `db0ec8df` | `2743ce6a` | `67afb692-d1e8-4b70-ae5f-29f2a60f7162` |
| FooterLink | `7b4336fa-01e2-42d2-b9f2-a93be9a58c47` | — | — | — (content-only template) |
| CBREAboutSection | `2c3d55be-4659-4cad-bf70-1d0e338f60e2` | — | — | `f2d882fe-9f9f-434c-b408-eaac1cbb20fd` |
| CBREOurCommitmentSection | `8cdd20a6-b618-48b1-99c0-6d92185cbece` | — | — | `064593f1-512c-4354-926f-f12b979afdc9` |
| CBRELatestInsightsSection | `2092ba4e-f5ed-4ad6-9d80-270b488a69e4` | — | — | — |
| CBREServicesHeroSection | `eb0d1698-aba1-48b8-aa44-bfffaf9dc4f2` | `7bbece5b` | `ccc3ff3f` | `7feede78-f3ca-4141-a6a7-484674d95370` |
| CBREHeroSlideSection | — | — | — | — |
| CBREHeroSlide (child template) | `4188302b-42c7-487a-a055-97049e52d21a` | — | — | — (no rendering, child item) |
| HeaderModeItem (dropdown values) | `fd4de61b-6256-46be-93ea-b04fd11b459e` | — | — | — (data item template) |
| CBREWhatWeDoSection | — | — | — | — |
| CBRENewsletterSection | — | — | — | — |
| CBREBannerStrip | — | — | — | — |
| CBREFeaturedArticles | — | — | — | — |

### Component file locations

```
examples/kit-nextjs-product-listing/src/components/
  CBRE-hero-section/CBREHeroSection.tsx              ← 6 fields: eyebrow, title, description, ctaLabel, ctaLink, image
  CBRE-header/CBREHeader.tsx                         ← layout: logoDark, logoLight, flagImage, primaryLinks (Multilist→HeaderLink)
  CBRE-footer/CBREFooter.tsx                         ← Multilist: primaryLinks, secondaryLinks (→FooterLink), copyrightText
  CBRE-about-section/CBREAboutSection.tsx             ← fields: bodyText, highlightText, ctaLabel, ctaLink
  CBRE-our-commitment-section/CBREOurCommitmentSection.tsx ← sectionTitle + 4 cards (title, description, ctaLabel, ctaLink each)
  CBRE-latest-insights-section/CBRELatestInsightsSection.tsx ← sectionTitle + 3 cards × 8 fields each (25 total)
  CBRE-insight-card/CBREInsightCard.tsx               ← inline card: categoryType, categoryRegion, title, date, description, ctaLabel, ctaLink, image
  CBRE-hero-slide-section/CBREHeroSlideSection.tsx       ← slides (Multilist→CBREHeroSlide: title, description, ctaLabel, ctaLink, image), 3-phase carousel animation
  CBRE-services-hero-section/CBREServicesHeroSection.tsx ← title, description, ctaLabel, ctaLink, image (inner page hero)
  CBRE-what-we-do-section/CBREWhatWeDoSection.tsx     ← category tiles
  CBRE-newsletter-section/CBRENewsletterSection.tsx   ← newsletter signup
  CBRE-banner-strip/CBREBannerStrip.tsx               ← floating banner
  CBRE-featured-articles/CBREFeaturedArticles.tsx     ← horizontal article bar
  cta-link/CTALink.tsx                                ← 2 fields: ctaLabel, ctaLink
  CBRE-logo/CBRELogo.tsx                              ← 1 field: logoLink
```

### Datasource locations (all use ancestor-or-self pattern)

| Component | Datasource Location |
|-----------|-------------------|
| CBREHeroSection | `query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CBREHeroSection` |
| CBREHeader | `query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CBREHeader` |
| CBREFooter | `query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CBREFooter` |
| CTALink | `query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CTALink` |
| CBRELogo | `query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/CBRELogo` |

---

## Multilist Fields & Recursive Templates

### Multilist auto-resolution in layout response

**Critical discovery:** Sitecore Multilist fields are **fully resolved** in the layout service response — the API returns the complete item tree (all nested levels) as arrays of resolved items. **No GraphQL ComponentQuery or edge service is needed.**

When a component has a Multilist field (e.g. `primaryLinks` on CBREHeader), the layout response includes:
```json
{
  "primaryLinks": [
    {
      "id": "f5c2e802-...",
      "name": "Services",
      "displayName": "Services",
      "fields": {
        "title": { "value": "Services" },
        "link": { "value": { "href": "/services" } },
        "description": { "value": "..." },
        "innerLinks": [
          {
            "id": "436566e4-...",
            "fields": {
              "title": { "value": "Needs" },
              "innerLinks": [
                { "fields": { "title": { "value": "Advisory & Transaction Services" }, "link": { "value": { "href": "/services/advisory" } } } }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

This resolves **3 levels deep** automatically. Transform in the component with a function like `transformPrimaryLinks()` — no additional API calls needed.

### Insert options (__Masters field)

To allow editors to create child items under a template in the Content Editor, set the `__Masters` field on the `__Standard Values` YAML.

**CORRECT `__Masters` field ID:** `1172f251-dad4-4efb-a329-0c63500e4f1e`

```yaml
# __Standard Values.yml
SharedFields:
- ID: "1172f251-dad4-4efb-a329-0c63500e4f1e"
  Hint: __Masters
  Value: "{B1F06BD6-F5E3-40EE-B8E2-85A0CC6A00B5}"
```

**Self-referencing insert options** — for recursive templates (e.g. HeaderLink can contain child HeaderLinks):
```yaml
# HeaderLink/__Standard Values.yml
SharedFields:
- ID: "1172f251-dad4-4efb-a329-0c63500e4f1e"
  Hint: __Masters
  Value: "{B1F06BD6-F5E3-40EE-B8E2-85A0CC6A00B5}"   # points to HeaderLink template itself
```

### Multilist Source filtering

To filter what items appear in a Multilist field, use a Sitecore query in the `Source` field YAML:

```yaml
# Show only direct children of the specific template
Source: "query:./child::*[@@templateid='{B1F06BD6-F5E3-40EE-B8E2-85A0CC6A00B5}']"

# Show all items (default)
Source: "./"
```

Use `child::*` (not descendants) to prevent nested items from appearing in the selection list.

### Recursive template pattern — HeaderLink

HeaderLink is a recursive template used for multi-level navigation:

| Field | Type | Sortorder | Field ID |
|-------|------|-----------|----------|
| title | Single-Line Text | 100 | `08335fa1-9d0f-41e9-86b6-06f10f12865c` |
| link | General Link | 200 | `000a7927-943d-4524-a3be-07c0ac51645e` |
| description | Multi-Line Text | 300 | `a9b02c24-a6e2-4288-b0ec-516c7fadfeae` |
| innerLinks | Multilist | 400 | `c7128d48-1428-47f8-a1bd-8c1a66e9f7a6` |
| ctaLabel | Single-Line Text | 500 | `1957c249-1d91-47fd-a232-7a2995234e1b` |
| ctaLink | General Link | 600 | `80c0c618-d8f8-4df8-8175-b1b9e0ed4988` |
| featuredImage | Image | 700 | `2bfefaed-fbb8-43fa-a39e-c2c265c4b03c` |
| featuredLabel | Single-Line Text | 800 | `a1c35480-d838-42e4-9282-cd8907a51bc9` |
| featuredLink | General Link | 900 | `9cf8b5a7-0574-4e53-9463-83bf560a2bbb` |

**Template ID:** `b1f06bd6-f5e3-40ee-b8e2-85a0cc6a00b5`
**Field Section ID:** `8908aeeb-9a0b-488f-9a67-77e2260b0ef9`

**3-level hierarchy:**
- Level 1: Primary nav items (Services, Insights, Properties, etc.) — uses title, link, description, ctaLabel, ctaLink, featuredImage, featuredLabel, featuredLink, innerLinks→columns
- Level 2: Column headings (Needs, Property Types, Industries) — uses title, ctaLabel, ctaLink (for "View All"), innerLinks→link items
- Level 3: Individual link items (Advisory & Transaction Services, etc.) — uses title, link

---

## Content Serialization

### Adding content paths to module.json

To serialize content items (not just templates/renderings), add `includes` entries to `ccl.module.json`:

```json
{
    "name": "ccl.content.cbre.home",
    "path": "/sitecore/content/cbre/cbre-global/Home",
    "allowedPushOperations": "CreateUpdateAndDelete"
},
{
    "name": "ccl.content.cbre.data",
    "path": "/sitecore/content/cbre/cbre-global/Data",
    "allowedPushOperations": "CreateUpdateAndDelete"
},
{
    "name": "ccl.content.cbre.renderings",
    "path": "/sitecore/content/cbre/cbre-global/Presentation/Available Renderings/CBRE",
    "allowedPushOperations": "CreateUpdateAndDelete"
}
```

### Bulk content YAML generation

For creating many content items (e.g. 60+ navigation links), use a Node.js script:

```js
const fs = require('fs');
const crypto = require('crypto');

function generateItemYaml({ id, parent, template, path, fields }) {
  let yaml = `---\nID: "${id}"\nParent: "${parent}"\nTemplate: "${template}"\nPath: "${path}"\n`;
  yaml += `Languages:\n- Language: en\n  Versions:\n  - Version: 1\n    Fields:\n`;
  for (const [hint, value] of Object.entries(fields)) {
    yaml += `    - ID: "${crypto.randomUUID()}"\n      Hint: ${hint}\n      Value: ${value}\n`;
  }
  return yaml;
}
```

### General Link field format in content YAMLs

```yaml
Value: |
  <link text="See Overview" linktype="external" url="/services" target="" />
```

---

## Header Mode System (4 Modes)

The header uses a **page-level `headerMode` Droplist field** with 4 modes:

```typescript
type HeaderMode = 'dark' | 'light' | 'transparent-dark' | 'transparent-light';
```

| Mode | Background | Position | Text/Logo | Use Case |
|---|---|---|---|---|
| `dark` | Solid `#003f2d` | Fixed | White | Dark-branded bars |
| `light` | White + shadow | Relative | Dark green | Inner pages |
| `transparent-dark` | Transparent → white | Absolute | **Dark** elements | Light hero images |
| `transparent-light` | Transparent → white | Absolute | **White** elements | Dark hero photos |

**CRITICAL semantics:** `transparent-dark` = dark colored elements; `transparent-light` = white/light elements.

**Style resolution:**
```tsx
function resolveHeaderStyle(mode: HeaderMode, hasMegaMenu: boolean, isScrolled: boolean) {
  const isTransparent = mode === 'transparent-dark' || mode === 'transparent-light';
  const isDarkText = mode === 'light' || mode === 'transparent-dark';
  const forceWhiteBg = isTransparent && (hasMegaMenu || isScrolled);
  const useDarkText = isDarkText || forceWhiteBg;
  // Returns: bgClass, position, logoVariant, navTextClass, iconColor, borderClass
}
```

## Header Scroll Behavior — Hide on Scroll Down, Show on Scroll Up

The header hides when the user scrolls down, reappears when scrolling up. In editing mode, it switches to `static` to avoid blocking the main placeholder.

```tsx
const [isScrolled, setIsScrolled] = useState(false);
const [isHeaderVisible, setIsHeaderVisible] = useState(true);
const lastScrollY = useRef(0);

useEffect(() => {
  if (isPageEditing) return; // Don't add scroll listener in editing mode
  const onScroll = () => {
    const currentY = window.scrollY;
    setIsScrolled(currentY > 10);

    if (currentY <= 10) {
      setIsHeaderVisible(true);
    } else if (currentY > lastScrollY.current + 5) {
      setIsHeaderVisible(false); // scrolling down — hide
    } else if (currentY < lastScrollY.current - 5) {
      setIsHeaderVisible(true); // scrolling up — show
    }
    lastScrollY.current = currentY;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, [isPageEditing]);
```

Header className pattern:
```tsx
className={`${isPageEditing
  ? 'static'  // editing mode: no fixed positioning, flows in document
  : `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isHeaderVisible || hasMegaMenu || mobileOpen ? 'translate-y-0' : '-translate-y-full'
    }`
} ${style.bgClass} ${style.borderClass}`}
```

**Key rules:**
- `static` in editing mode — prevents header from covering the main placeholder
- `translate-y-0` / `-translate-y-full` for smooth show/hide animation
- Always keep visible when mega menu or mobile drawer is open
- 5px scroll threshold prevents jitter on tiny scroll movements
- Transparent modes force white bg when scrolled or mega-menu open

---

## Mega Menu Animation Pattern

### Slide-down animation with Tailwind keyframes

Add to `tailwind.config.js`:
```js
keyframes: {
  slideDown: {
    '0%': { maxHeight: '0', opacity: '0' },
    '100%': { maxHeight: '800px', opacity: '1' },
  },
},
animation: {
  slideDown: 'slideDown 450ms ease-out forwards',
},
```

### Re-trigger animation on each hover

Use `key={activeMenu}` to force React to re-mount the panel, replaying the animation each time the user hovers a different nav item:

```tsx
<div
  key={activeMenu ?? 'closed'}
  className={activeMegaMenu ? 'animate-slideDown overflow-hidden' : 'max-h-0 opacity-0'}
>
  {displayMenu && <MegaMenuPanel menu={displayMenu} />}
</div>
```

Use a `lastMenuRef` to keep content visible during exit animation:
```tsx
const lastMenuRef = useRef<MegaMenu | null>(null);
useEffect(() => {
  if (activeMegaMenu) lastMenuRef.current = activeMegaMenu;
}, [activeMegaMenu]);
const displayMenu = activeMegaMenu ?? lastMenuRef.current;
```

---

## Logo Swap Pattern (Dark/Light)

When a header switches between transparent (light logo) and white bg (dark logo), ContentSdkImage may not re-render because React reuses the DOM element. Force a re-mount with a `key` prop:

```tsx
const logoVariant = isWhite ? 'dark' : 'light';
const activeLogo = isWhite ? fields?.logoDark : fields?.logoLight;

<a key={logoVariant} href="/">
  <ContentSdkImage
    field={{
      ...activeLogo,
      value: { ...activeLogo?.value, width: 150, height: 25, style: { height: '25px', width: 'auto' } },
    }}
  />
</a>
```

### SVG images require explicit width/height

ContentSdkImage (which uses Next.js Image internally) throws an error for SVGs without dimensions:

```tsx
// WRONG — "Image with src ...svg is missing required width property"
<ContentSdkImage field={fields.logo} />

// CORRECT — always add width + height for SVGs
<ContentSdkImage
  field={{
    ...fields.logo,
    value: { ...fields.logo.value, width: 150, height: 25, style: { height: '25px', width: 'auto' } },
  }}
/>
```

### Editing mode: show both logos

In editing mode, render both dark and light logos side by side with labels so editors can update both:

```tsx
{isPageEditing ? (
  <div className="flex items-center gap-4">
    <div className="flex flex-col items-start">
      <span className="text-[10px] text-gray-400 mb-1">Dark Logo:</span>
      <ContentSdkImage field={{ ...fields?.logoDark, value: { ...fields?.logoDark?.value, width: 150, height: 25 } }} />
    </div>
    <div className="flex flex-col items-start">
      <span className="text-[10px] text-gray-400 mb-1">Light Logo:</span>
      <ContentSdkImage field={{ ...fields?.logoLight, value: { ...fields?.logoLight?.value, width: 150, height: 25 } }} />
    </div>
  </div>
) : (
  // Normal logo rendering with variant swap
)}
```

---

## XM Cloud Login & Authentication

### CM Instance
- **URL:** `https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io/`
- **Content Editor:** Append `/sitecore` to CM URL

### Authentication Flow
All CLI commands must be run from the **repo root** (where `.sitecore/` folder exists).

**Step 1 — Cloud login (refreshes OAuth token):**
```bash
dotnet sitecore cloud login
```
Opens a browser for interactive OAuth. Required when tokens expire ("Forbidden" or 401 errors).

**Step 2 — CM login (connects CLI to the CM instance):**
```bash
dotnet sitecore login --authority https://auth.sitecorecloud.io --cm https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io --allow-write true
```

**Step 3 — Push/Pull serialization:**
```bash
dotnet sitecore ser push -n dev   # local YAML → Sitecore
dotnet sitecore ser pull -n dev   # Sitecore → local YAML
```

### Common Authentication Issues
| Symptom | Fix |
|---|---|
| "Forbidden" or 401 on ser push | Run `dotnet sitecore cloud login` first, then retry |
| "0 changes" on ser push | YAML matches Sitecore state; no action needed |
| Token expired mid-session | `dotnet sitecore cloud login` → `dotnet sitecore login ...` → retry |
| Wrong directory error | Must run from repo root where `.sitecore/` folder exists |

---

## Multilist Parent-Child Pattern & Two-Step Push

### Template Structure for Parent-Child Multilist
```
ParentTemplate (e.g. CBREHeroSlideSection)
  └── SectionFolder/
        └── slides (Multilist field)
              Source: "query:./child::*[@@templateid='{CHILD_TEMPLATE_ID}']"

ChildTemplate (e.g. CBREHeroSlide)
  └── SectionFolder/
        ├── title (Single-Line Text)
        ├── description (Multi-Line Text)
        └── image (Image)
```

### Datasource Item Structure
```
/sitecore/content/.../Data/ParentSection     ← parent (template: ParentTemplate)
  ├── Child 1                                 ← child item (template: ChildTemplate)
  ├── Child 2
  └── Child 3
```

### CRITICAL: Two-Step Push for New Multilist Structures

When creating parent + child items in the same session via `dotnet sitecore ser push`, the batch processing may set the parent's multilist value before child items exist. This causes **"[Not in the selection List]"** in Content Editor.

**Fix — always use a two-step push:**

1. **Step 1**: Set multilist value to `""` (empty) in parent YAML → push. Creates parent + children without references.
2. **Step 2**: Restore multilist value with child GUIDs → push again. Children now exist, references resolve.

```yaml
# Step 1 — empty value, push first
- ID: "field-id"
  Hint: slides
  Value: ""

# Step 2 — restore GUIDs, push again
- ID: "field-id"
  Hint: slides
  Value: |
    {CHILD-1-GUID}
    {CHILD-2-GUID}
    {CHILD-3-GUID}
```

### Multilist GUID Format
- Always use **braces format**: `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`
- One GUID per line in YAML `|` (literal block) format
- Uppercase GUIDs in braces

### Multilist Source Query
```
query:./child::*[@@templateid='{TEMPLATE_ID}']
```
`./` = relative to current datasource item. Child items must be direct children in the content tree.

---

## Useful Commands

```bash
# Regenerate component client map
npx sitecore-tools project component generate-map

# Push serialization to Sitecore (templates + renderings)
dotnet sitecore ser push -n dev

# Pull from Sitecore to local YAML
dotnet sitecore ser pull -n dev

# Validate serialization files locally (no -n flag)
dotnet sitecore ser validate --fix

# Rebuild Sitecore config files from live instance
npx sitecore-tools project build

# Run dev server
npx next dev -H 0.0.0.0 -p 5000

# Generate fresh GUIDs in Node.js (for YAML files)
node -e "const c=require('crypto');for(let i=0;i<10;i++)console.log(c.randomUUID())"

# Windows case-insensitive folder rename (two-step trick)
# git mv old-name old-name-tmp && git mv old-name-tmp NEW-NAME

# Cloud login (when tokens expire)
dotnet sitecore cloud login

# CM login
dotnet sitecore login --authority https://auth.sitecorecloud.io --cm https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io --allow-write true
```

---

## Editing Mode — Header Position Pattern

The header position in editing mode must match normal mode visually, but without scroll behavior:

```tsx
// Editing mode header position:
// - Transparent modes (transparent-dark, transparent-light): absolute + same bgClass
// - Solid modes (dark, light): relative + same bgClass
if (isPageEditing) {
  return (
    <header className={`${style.isTransparent ? 'absolute top-0 left-0 right-0 z-50' : 'relative'} ${style.bgClass}`}>
      {/* Same layout as normal mode, just no scroll/hover behaviors */}
    </header>
  );
}
```

**Key rules:**
- NEVER use `static` for transparent modes in editing — it breaks the header-over-hero overlay look
- NEVER hardcode `bg-[#003f2d]` for transparent modes — use `style.bgClass` so it stays `bg-transparent`
- `absolute` (not `fixed`) avoids scroll issues in the Sitecore editor iframe
- No scroll listener, no mega-menu hover, no hide/show animation in editing mode

---

## Editing Mode — ContentSdkImage CSS Override Pattern

Sitecore wraps `ContentSdkImage` in `<span>` elements with inline styles. Use CSS selector overrides to force images to fill their container:

```tsx
<div className="relative overflow-hidden [&_img]:!absolute [&_img]:!inset-0 [&_img]:!w-full [&_img]:!h-full [&_img]:!object-cover [&_span]:!block [&_span]:!absolute [&_span]:!inset-0 [&_span]:!w-full [&_span]:!h-full">
  <ContentSdkImage field={image} />
</div>
```

- Use `[&_span]` (all descendants) NOT `[&>span]` (direct child only)
- Use `!` (important) prefix to beat Sitecore's inline styles

---

## Editing Mode — Carousel Dot Navigation

In editing mode, carousels show all dots as clickable buttons. Clicking a dot switches to that slide instantly (no animation):

```tsx
if (isPageEditing) {
  const editSlide = validSlides[activeIndex] || validSlides[0];
  // ... render single slide with editable fields
  // Dots are <button> with onClick={() => setActiveIndex(i)}
}
```

---

## Responsive Design — Overflow Prevention at 1024px

At the `lg:` breakpoint (1024px), fixed-width columns often overflow. Use flexible widths at `lg:` and fixed at `xl:` (1280px+):

```tsx
// ❌ Overflows at 1024px
<div className="lg:w-[689px] lg:pl-16">

// ✅ Percentage at lg, fixed at xl
<div className="lg:w-[50%] xl:w-[689px] lg:pl-8 xl:pl-16">
```

---

## Figma API Access (When MCP Unavailable)

The Figma PAT is stored in `~/.claude/settings.json` under `mcpServers.figma.env.FIGMA_PERSONAL_ACCESS_TOKEN`.

```bash
# Test token
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/me"

# Get node measurements
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID&depth=3"

# Get screenshot URL
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_ID&format=png&scale=1"
```

If 404 on file access: token expired. Ask user for new PAT, update settings.json.

**Figma file key:** `vgON6FcDj6vhMXQgiGol2i` (CBRE Sitecore AI Project)

---

## Multi-Site Setup — Available Renderings

When adding a new CBRE site to XM Cloud, components won't appear in the Experience Editor unless the site has the correct **Available Renderings** groups.

**Two groups are required** under `[Site]/Presentation/Available Renderings/`:

1. **`click-click-launch`** — Project namespace renderings (CCL starter components). Auto-created by SXA scaffolding. This is the **trigger** that makes project-level renderings available — without it, no CBRE components show up.
2. **`CBRE`** — Custom CBRE component renderings. Must be manually created with the same rendering GUIDs as the global site.

**Template for rendering groups:** `76da0a8d-fc7e-42b2-af1e-205b49e43f98`

### Serialization for New Sites

Add three includes to `ccl.module.json` per site:

```json
{ "name": "ccl.content.[region].home", "path": "/sitecore/content/[collection]/[site]/Home", "allowedPushOperations": "CreateUpdateAndDelete" },
{ "name": "ccl.content.[region].data", "path": "/sitecore/content/[collection]/[site]/Data", "allowedPushOperations": "CreateUpdateAndDelete" },
{ "name": "ccl.content.[region].renderings", "path": "/sitecore/content/[collection]/[site]/Presentation/Available Renderings", "allowedPushOperations": "CreateUpdateAndDelete" }
```

### Registered Sites

| Site | Content Path | Serialization Prefix |
|---|---|---|
| CBRE Global | `/sitecore/content/cbre/cbre-global` | `ccl.content.cbre` |
| CBRE UAE | `/sitecore/content/middle-east-and-africa/cbre-uae` | `ccl.content.uae` |
| CBRE Thailand | `/sitecore/content/asia-pacific/cbre-thailand` | `ccl.content.thailand` |

Templates and renderings are **shared** across all sites — defined once under `/sitecore/templates/Project/click-click-launch` and `/sitecore/Layout/Renderings/Project/click-click-launch`. No separate template/rendering definitions per site.

### New Site Checklist (Full Setup)

When creating a new CBRE site, these items must be set up:

1. **Available Renderings** — `click-click-launch` (auto by SXA) + `CBRE` (manual, template `76da0a8d`)
2. **Partial Designs** — `Global/` folder (template `fcd9dd5e` Partial Design Folder) containing:
   - `CBREHeader` (template `fd2059fd`, signature `cbreheader`, rendering in `headless-header`)
   - `CBREFooter` (template `fd2059fd`, signature `cbrefooter`, rendering in `headless-footer`)
3. **Page Design** — `Default` (template `1105b8f8`) with `PartialDesigns` field pointing to CBREHeader + CBREFooter partial GUIDs
4. **Placeholder Settings** — Under `Partial Design/`:
   - `CBREHeader` (template `d2a6884c`, key `sxa-cbreheader`)
   - `CBREFooter` (template `d2a6884c`, key `sxa-cbrefooter`)
5. **Datasource Items** — `Home/Data/CBREHeader` + `Home/Data/CBREFooter` with all child nav link items
6. **Home Page** — `Page Design` field (ID `24171bf1-c0e1-480e-be76-4c0a1876f916`) set to Default page design GUID
7. **Rendering Host** — `[Site]/Settings/Site Grouping/[site-name]` → set `RenderingHost` (ID `f57099a3-526a-49f2-aebd-635453e48875`) to `kit-nextjs-product-starter`. Default SXA scaffolding sets it to `Default` which won't use our rendering host.

### Serialization per site (8 includes in module.json)
```
ccl.content.[region].home           → [Site]/Home
ccl.content.[region].data           → [Site]/Data
ccl.content.[region].renderings     → [Site]/Presentation/Available Renderings
ccl.content.[region].partialdesigns → [Site]/Presentation/Partial Designs
ccl.content.[region].pagedesigns    → [Site]/Presentation/Page Designs
ccl.content.[region].placeholders   → [Site]/Presentation/Placeholder Settings
ccl.content.[region].settings       → [Site]/Settings
ccl.templates.[region]              → /sitecore/templates/Project/[region-collection]
```
