# React → Sitecore Component — Workflow Skill

## Purpose
Transform pure React+Tailwind components (from scrapper) into Sitecore rendering host components that work with the Content SDK, Page Builder editing, and datasource items.

**PREREQUISITE:** Layout migration must be completed first (see [layout-migration.md](layout-migration.md)). Components depend on fonts, CSS variables, and Tailwind config being in the rendering host.

## CRITICAL RULE: Proper Sitecore Data Modeling

**Before creating any TSX component, analyze the React source and design the Sitecore template with proper structured data — not 1:1 prop-to-field mapping.**

### Step 1: Analyze the React component visually

Look at what the component renders and identify the **content structure**:
- What are the main editable fields? (heading, description, image, CTA)
- Are there repeating items? (cards, stats, slides, links)
- What does each repeating item contain?

### Step 2: Design the Sitecore template(s)

**Main fields** go on the component template directly:
- Heading → Single-Line Text
- Subheading → Single-Line Text
- Description → Rich Text
- BackgroundImage → Image
- VideoUrl → Single-Line Text
- CtaLabel → Single-Line Text
- CtaLink → General Link

**Repeating items** get their own child template + Treelist/Multilist:
- Stats (4 items, each with Title + Subtitle) → separate `Stat` template with 2 fields, referenced via Treelist
- Cards (3 items, each with Title + Description + Image + Link) → separate `Card` template, referenced via Treelist
- Slides (N items) → separate `Slide` template, referenced via Treelist

**Use child items via Treelist/Multilist ONLY when items are dynamic** (carousel slides, variable cards, user-managed lists). For fixed small collections (4 stats, 3 fixed cards), numbered flat fields are fine and simpler for editors.

**When to use child items (Treelist/Multilist):**
- Editors can add/remove/reorder items
- Each item is independently editable
- Content is structured, not flat

### Step 3: Example — HeroHomepage

**React props:**
```
heading, subheading, description, backgroundImage, videoSrc, cta, stats[4]
```

**Right:** Main fields + numbered stat fields (fixed 4 items, simple structure)
```
HeroHomepage template (15 fields):
  ├── Heading          → Single-Line Text
  ├── Subheading       → Single-Line Text
  ├── Description      → Rich Text
  ├── BackgroundImage  → Image
  ├── VideoUrl         → Single-Line Text
  ├── CtaLabel         → Single-Line Text
  ├── CtaLink          → General Link
  ├── stat1Title       → Single-Line Text  (e.g. "+3,260 km")
  ├── stat1Subtitle    → Single-Line Text  (e.g. "Gas pipelines across the UAE")
  ├── stat2Title       → Single-Line Text
  ├── stat2Subtitle    → Single-Line Text
  ├── stat3Title       → Single-Line Text
  ├── stat3Subtitle    → Single-Line Text
  ├── stat4Title       → Single-Line Text
  └── stat4Subtitle    → Single-Line Text
```

Stats are fixed (always 4), each with only 2 fields — flat numbered fields are simpler than child items here.

**Wrong:** Using Treelist + child template for 4 fixed simple stats (over-engineered).
**Also wrong:** 23 fields with prefix/value/suffix/label per stat (over-detailed — combine into Title).
```

### Step 4: CBRE reference patterns

**Flat fields** — when items are always fixed count and simple:
- CBRELatestInsightsSection: `card1Title`, `card2Title`, `card3Title` (always exactly 3)
- Use when: fixed count, few fields per item

**Child items via Multilist** — when items are variable or complex:
- CBREHeroSlideSection: `slides` Multilist → CBREHeroSlide children
- CBREHeader: `primaryLinks` Multilist → HeaderLink children
- Use when: variable count, many fields per item, editors need to add/remove

### Step 5: During component conversion

For each component:
1. Read the React `.jsx` — list all visible content areas
2. Identify main fields vs repeating collections
3. Design templates: main + child templates if needed
4. Create/update Sitecore templates with ALL fields
5. Create TSX with `(field?.value || isPageEditing)` guards on EVERY field
6. Every visible text = editable `<Text>` field
7. Every visible image = editable `<ContentSdkImage>` field
8. If overlay divs sit on top of background images, add `pointer-events-none` in editing mode so editors can click through to select the image:
   ```tsx
   <div className={`absolute inset-0 ${isPageEditing ? 'pointer-events-none opacity-30' : ''}`}
     style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
   ```
8. Every link = `<Link>` or CTA pattern

### Step 6: Populate datasource content

**NEVER leave datasource items empty.** After creating the template and TSX, populate every field on the datasource item with real content from the scraped data.

Source: `scrapper/output/{domain}/react-app/src/content/en/{component}.json`

For each field on the datasource:
1. Read the extracted content JSON
2. Map React prop values to Sitecore field formats:
   - Plain text → set directly as string value
   - Rich text / HTML → wrap in `<p>` tags if needed
   - Image → `<image mediaid="" src="https://..." />`
   - Link → `<link linktype="internal" text="..." url="/path" />`
   - Stat titles → combine prefix + value + suffix into one readable string (e.g. "+3,260 km")
3. Update via GraphQL mutation or YAML serialization

```graphql
mutation {
  updateItem(input: {
    itemId: "<datasource-id>"
    language: "en"
    version: 1
    fields: [
      { name: "Heading", value: "ADNOC Gas" }
      { name: "Description", value: "<p>Company description here.</p>" }
      { name: "BackgroundImage", value: "<image mediaid=\"\" src=\"https://...\" />" }
      { name: "CtaLabel", value: "Learn More" }
      { name: "CtaLink", value: "<link linktype=\"internal\" text=\"Learn More\" url=\"/about\" />" }
    ]
  }) { item { itemId } }
}
```

**This step is part of the component conversion — not separate. Every component conversion includes:**
1. Analyze React source → design template fields
2. Create/update Sitecore template
3. Create TSX component
4. **Populate datasource with content** ← don't skip this
5. Verify in rendering host / Page Builder

---

### Known Issue: Datasource references break layout service

When `s:ds="local:/Data/..."` references a datasource item with a **custom template**, the Edge GraphQL layout query returns `rendered: {}` (empty), breaking the rendering host.

**What works:**
- `s:ds=""` (no datasource) — layout resolves, components render with empty fields
- `s:ds="local:/Data/Text 1"` (built-in Text template) — works
- No `s:ds` attribute at all — works

**What breaks:**
- `s:ds="local:/Data/my-custom-item"` (custom template like HeroVideo) — layout returns empty
- `s:ds="{GUID}"` (absolute GUID to custom template item) — layout returns empty

**Workaround:** Deploy renderings without datasource references first. Components render with empty fields but are editable in Page Builder. Authors assign datasources manually via the editor.

**Root cause (partially identified):**
- Base templates (`_PerSiteStandardValues`) are required but NOT sufficient alone.
- Templates with **only text fields** (Single-Line Text, Rich Text) work as datasources — confirmed with SplitContent (2 text fields).
- Templates with **Image or General Link fields** break the layout service — confirmed with HeroVideo (15 fields including Image + General Link) which causes `rendered: {}` even with correct base templates.
- **Likely cause:** Image fields with empty `mediaid` or General Link fields with `<link>` XML values crash the Edge GraphQL layout serializer.
- **Next step:** Test by creating a stripped-down version of HeroVideo with only text fields to isolate which field type breaks it.

**Solution — use YAML serialization:** Use `dotnet sitecore ser push` for template creation instead of GraphQL mutations — it sets up all base templates correctly. Alternatively, manually set `__Base template` on every custom template to include BOTH:
- `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` (Standard template)
- `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` (_PerSiteStandardValues)

Pipe-delimited: `{1930BBEB-7805-471A-A3BE-4858AC7CF696}|{44A022DB-56D3-419A-B43B-E27E4D8E9C41}`

**Rendering items:** Every rendering item MUST have `Datasource Template` and `Datasource Location` fields set for datasource resolution to work.

---

### Template field template ID:
`{455A3E98-A627-4B40-8035-E683A0331AC7}` (Template field)
**Note:** This ID varies between Sitecore versions. Always verify by checking an existing field's template ID on your CM.

---

## What Changes

### 1. Imports
```
BEFORE: import { useState } from 'react';
AFTER:  import { Text, NextImage as ContentSdkImage, RichText, TextField, ImageField, LinkField, useSitecore } from '@sitecore-content-sdk/nextjs';
```

### 2. Props Structure
Our adnocgas components use **flat fields** (not datasource nested):
```
BEFORE (flat props from JSON):
  function Hero({ heading, description, backgroundImage, cta })

AFTER (Sitecore flat field structure):
  function Hero({ fields }: HeroProps)
  // fields.Heading is a TextField, access value via fields.Heading?.value
```

### 3. Field Rendering
| Before (pure React) | After (Sitecore Content SDK) |
|---|---|
| `<h1>{heading}</h1>` | `<Text field={Heading} tag="h1" />` |
| `<p>{description}</p>` | `<RichText field={Description} />` |
| `<img src={img} alt={alt} />` | `<ContentSdkImage field={{ ...BackgroundImage, value: { ...BackgroundImage?.value, style: {...} } }} />` |
| `<a href={cta.href}>{cta.text}</a>` | CTA Label + Link pattern (see below) |
| `{condition && <div>...</div>}` | `{(Heading?.value \|\| isPageEditing) && <Text ... />}` |

### 4. Language (JSX → TSX)
```
BEFORE: Component.jsx (JavaScript)
AFTER:  Component.tsx (TypeScript with interface)
```

### 5. Editing Mode Support
```tsx
// Exported variant wraps with useSitecore
export const Default: React.FC<HeroProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeroDefault {...props} isPageEditing={isEditing} />;
};

// Inner component uses isPageEditing prop
{(Heading?.value || isPageEditing) && (
  <Text field={Heading} tag="h1" />
)}
```

### 6. Safe Destructuring
```tsx
// Flat fields — always safe with || {}
const { Heading, Description, BackgroundImage, CtaLabel, CtaLink } = fields || {};
```

---

## Transformation Rules (per field type)

### Single-Line Text → `<Text>`
```tsx
// Before
<h1>{heading}</h1>
<span>{date}</span>

// After (flat fields)
<Text field={Heading} tag="h1" className="..." />
<Text field={Date} tag="span" className="..." />
```

### Rich Text → `<RichText>`
```tsx
// Before
<div dangerouslySetInnerHTML={{ __html: description }} />
<p>{description}</p>  // if plain text, still use RichText for editing

// After
<RichText field={Description} className="..." />
```

### Image → `<ContentSdkImage>` (with spread pattern)
```tsx
// Before
<img src={backgroundImage} alt="..." className="w-full h-full object-cover" />

// After — ALWAYS use spread pattern for image fields
<ContentSdkImage
  field={{
    ...BackgroundImage,
    value: {
      ...BackgroundImage?.value,
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
    },
  }}
/>
```

For background images (CSS — when image is used as CSS background):
```tsx
// Before
<div style={{ backgroundImage: `url("${bgImage}")` }} />

// After — extract src for CSS usage
const bgUrl = BackgroundImage?.value?.src;
<div style={{ backgroundImage: bgUrl ? `url("${bgUrl}")` : 'none' }} />
```

### CTA (Label + Link separate fields)
```tsx
// Before
<a href={cta.href} className="...">{cta.text}</a>

// After — our pattern uses separate Label + Link fields
{(CtaLabel?.value || isPageEditing) && (
  isPageEditing ? (
    <Text field={CtaLabel} tag="span" className="..." />
  ) : (
    <a href={String(CtaLink?.value?.href || '#')} className="...">
      {String(CtaLabel?.value || '')}
    </a>
  )
)}
```

### Checkbox → boolean
```tsx
// Before
{overlay && <div className="overlay" />}

// After
{Overlay?.value && <div className="overlay" />}
```

### Numbered repeated items (fixed count)
```tsx
// Before
{stats.map((stat, i) => <div key={i}>{stat.value} {stat.label}</div>)}

// After — flat numbered fields
const stats = [
  { title: fields.stat1Title, subtitle: fields.stat1Subtitle },
  { title: fields.stat2Title, subtitle: fields.stat2Subtitle },
  { title: fields.stat3Title, subtitle: fields.stat3Subtitle },
  { title: fields.stat4Title, subtitle: fields.stat4Subtitle },
];
{stats.map((stat, i) => (
  <div key={i}>
    {(stat.title?.value || isPageEditing) && <Text field={stat.title} tag="div" />}
    {(stat.subtitle?.value || isPageEditing) && <Text field={stat.subtitle} tag="span" />}
  </div>
))}
```

---

## Reference: Working adnocgas Pattern

The canonical pattern comes from `xmcloud/examples/basic-nextjs/src/components/adnocgas/`.

Key pattern points:
- `'use client'` at top
- JSDoc comment with template/rendering GUIDs
- `import { ComponentProps } from 'lib/component-props'` (NOT `@/lib/`)
- Interface: `export interface XxxFields { Heading?: TextField; ... }` (fields optional with `?`)
- Props: `export interface XxxProps extends ComponentProps { params: XxxParams; fields: XxxFields; isPageEditing?: boolean; }`
- Inner component: `const XxxDefault = (props: XxxProps & { isPageEditing?: boolean }): JSX.Element => { ... }`
- Export: `export const Default: React.FC<XxxProps> = (props) => { const { page } = useSitecore(); const isEditing = page?.mode?.isEditing ?? false; return <XxxDefault {...props} isPageEditing={isEditing} />; }`
- Empty guard: `if (!fields) { return <section className="component xxx" id={id}><div className="component-content"><span className="is-empty-hint">Xxx</span></div></section>; }`
- Field rendering: `{(Heading?.value || isPageEditing) && <Text field={Heading} tag="h1" className="..." />}`
- Images: ContentSdkImage with spread pattern (never raw `<img>`)
- `data-component="ComponentName"` on root element
- `id={id ? id : undefined}` on root element (where `id = params?.RenderingIdentifier`)

### Key Reference Files
- `xmcloud/examples/basic-nextjs/src/components/adnocgas/HeroHomepage.tsx` — hero with stats
- `xmcloud/examples/basic-nextjs/src/components/adnocgas/Hero.tsx` — hero with video + CTAs
- `xmcloud/examples/basic-nextjs/src/components/adnocgas/Footer.tsx` — complex numbered fields
- `xmcloud/examples/basic-nextjs/src/components/adnocgas/Accordion.tsx` — simple content section

### Tailwind Values
Keep arbitrary values (`px-[16px]`, `max-w-[1400px]`) from extraction — they match the original site pixel-perfectly. Canonical Tailwind warnings can be ignored for now.

### Component Map
The `basic-nextjs` rendering host auto-generates `.sitecore/component-map.ts` from `'use client'` components via `npm run sitecore-tools:generate-map`. See `skills/component/component-registration.md` for details.

---

## Full Component Transformation Example

### BEFORE (Pure React — from scrapper)
```jsx
export default function HeroCentered({
  heading = '',
  subheading = '',
  description = '',
  backgroundImage = '',
  cta = null,
  stats = []
}) {
  return (
    <section className="w-full relative min-h-[1158px]"
      style={{ backgroundImage: backgroundImage ? `url("${backgroundImage}")` : 'none', backgroundColor: '#001a70', backgroundSize: 'cover' }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,26,112,0.55)' }} />
      <div className="relative z-20 max-w-[1400px] mx-auto px-[20px] pt-[300px] pb-[48px]">
        <h1 className="text-[100px] font-[700] text-white">{heading}</h1>
        <h2 className="text-[40px] font-[700] text-white">{subheading}</h2>
        <div className="text-[16px] text-white/90">{description}</div>
        {cta && (
          <a href={cta.href} className="inline-block bg-[#00bfb2] text-[#001a70] font-[700] rounded-full px-[24px] py-[12px]">
            {cta.text}
          </a>
        )}
      </div>
    </section>
  );
}
```

### AFTER (Sitecore Rendering Host Component — flat fields pattern)
```tsx
'use client';

import type React from 'react';
import { type JSX } from 'react';
import {
  NextImage as ContentSdkImage, ImageField,
  Text, TextField, RichText, RichTextField,
  LinkField, useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

interface HeroCenteredParams { [key: string]: string; }

export interface HeroCenteredFields {
  Heading?: TextField;
  Subheading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
}

export interface HeroCenteredProps extends ComponentProps {
  params: HeroCenteredParams;
  fields: HeroCenteredFields;
  isPageEditing?: boolean;
}

const HeroCenteredDefault = (
  props: HeroCenteredProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component hero-centered" id={id}>
        <div className="component-content"><span className="is-empty-hint">HeroCentered</span></div>
      </section>
    );
  }

  const { Heading, Subheading, Description, BackgroundImage, CtaLabel, CtaLink } = fields || {};

  return (
    <section
      data-component="HeroCentered"
      id={id ? id : undefined}
      className="w-full relative min-h-[600px] lg:min-h-[1158px] font-['ADNOC_Sans',sans-serif]"
      style={{ backgroundColor: '#001a70' }}
    >
      {(BackgroundImage?.value?.src || isPageEditing) && (
        <ContentSdkImage field={{
          ...BackgroundImage,
          value: { ...BackgroundImage?.value, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } },
        }} />
      )}
      <div className={`absolute inset-0 z-10 ${isPageEditing ? 'pointer-events-none opacity-30' : ''}`}
        style={{ backgroundColor: 'rgba(0,26,112,0.55)' }} />
      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-[16px] lg:px-[20px] pt-[120px] lg:pt-[300px] pb-[40px] lg:pb-[48px] flex flex-col justify-end min-h-[600px] lg:min-h-[1158px]">
        <div className="max-w-[900px]">
          {(Heading?.value || isPageEditing) && (
            <Text field={Heading} tag="h1" className="text-[40px] lg:text-[100px] font-[700] leading-[1.1] text-white mb-[24px]" />
          )}
          {(Subheading?.value || isPageEditing) && (
            <Text field={Subheading} tag="h2" className="text-[20px] lg:text-[40px] font-[700] leading-[1.2] text-white mb-[24px]" />
          )}
          {(Description?.value || isPageEditing) && (
            <RichText field={Description} className="text-[14px] lg:text-[16px] text-white/90 mb-[24px] max-w-[800px]" />
          )}
          {(CtaLabel?.value || isPageEditing) && (
            isPageEditing ? (
              <Text field={CtaLabel} tag="span" className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] font-[700] rounded-full px-[24px] py-[12px]" />
            ) : (
              <a href={String(CtaLink?.value?.href || '#')} className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] font-[700] rounded-full px-[24px] py-[12px] hover:bg-white transition-all duration-300">
                {String(CtaLabel?.value || '')}
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export const Default: React.FC<HeroCenteredProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeroCenteredDefault {...props} isPageEditing={isEditing} />;
};
```

---

## Transformation Steps (per component)

### Step 1: Read the component schema
From `generated/adnocgas/sitecore-ids.json` — know the template fields.

### Step 2: Create TypeScript interface
Map each field to the Sitecore datasource structure:
```
Template field "Heading" (Single-Line Text) → datasource.Heading.jsonValue: Field<string>
Template field "BackgroundImage" (Image) → datasource.BackgroundImage.jsonValue: ImageField
Template field "Cta" (General Link) → datasource.Cta.jsonValue: LinkField
```

### Step 3: Replace props with Sitecore fields
- Remove flat prop destructuring
- Add `useSitecore()` for editing mode
- Safe-destructure from `fields.data.datasource`

### Step 4: Replace HTML elements with SDK field components
- `<h1>{text}</h1>` → `<Text field={...} tag="h1" />`
- `<img src={...} />` → `<Image field={...} />`
- Keep all Tailwind classes exactly as-is

### Step 5: Add editing mode guards
Every field render wrapped with `(value || isEditing)` check

### Step 6: Register in component map
Add to the rendering host's component map so Sitecore layout can resolve it.

### Step 7: File placement
```
xmcloud/examples/basic-nextjs/src/components/adnocgas/
├── HeroCentered.tsx       ← Sitecore Content SDK version
├── HeroVideo.tsx
├── Header.tsx
├── Footer.tsx
├── NewsCards.tsx
├── StockTicker.tsx
├── ColumnsGrid.tsx
├── TwoColumnDark.tsx
├── ...
└── index.ts               ← Component map exports
```

---

## What Stays the Same
- All Tailwind classes (pixel-perfect styling unchanged)
- Component structure/hierarchy
- Responsive breakpoints (md:/lg: prefixes)
- Animations, transitions, hover effects
- Container widths, spacing, typography

## What Changes
- JSX → TSX
- Flat props → Sitecore datasource structure
- HTML elements → SDK field components (for editable fields)
- Content from JSON → Content from Sitecore items
- Static rendering → Editing mode aware

---

## Automation Approach

This transformation can be automated because:
1. We have the component schemas (which fields exist, what types)
2. We have the template IDs (from `sitecore-ids.json`)
3. The Tailwind styling stays identical
4. The mapping is deterministic:
   - `{prop}` → `<Text field={datasource?.Prop?.jsonValue} />`
   - `<img src={prop}>` → `<Image field={datasource?.Prop?.jsonValue} />`

A script can read each `.jsx`, parse the props, and generate the `.tsx` with Sitecore Content SDK patterns.

---

## Related Skills
- [Sitecore Serialization](../sitecore-serialization/SKILL.md) — Template/field structure
- [Content Authoring](../content-authoring/SKILL.md) — Datasource creation
- [Authoring GraphQL](../access/authoring-graphql.md) — Push content via API
- [Create Site](create-site.md) — Rendering host configuration
