# Skill: React Sitecore Content SDK Component Patterns

Exact patterns for building React components that work with Sitecore XM Cloud.
Based on the working adnocgas components in `xmcloud/examples/basic-nextjs/src/components/adnocgas/`.

## Two Field Access Patterns

Sitecore XM Cloud has two valid field access patterns depending on how the component is configured:

### Pattern A: Flat Fields (our adnocgas components use this)
Fields are passed directly on `props.fields`. Used when components receive fields from the layout service without a GraphQL datasource query.

```typescript
interface HeroFields {
  Heading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
}
// Access: fields.Heading, fields.Description
```

### Pattern B: Datasource Fields (kit starters like product-listing use this)
Fields come through `fields.data.datasource` when using component-level GraphQL queries.

```typescript
interface AccordionFields {
  fields: {
    data: {
      datasource?: {
        heading: { jsonValue: Field<string> };
        description?: { jsonValue: Field<string> };
      };
    };
  };
}
// Access: fields.data.datasource.heading.jsonValue
```

**Our project uses Pattern A.** The kit starters use Pattern B. Match the pattern to the component query configuration.

---

## Imports

```typescript
'use client';  // MANDATORY — required for component map auto-generation

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,           // Render text fields (editable in Experience Editor)
  RichText,       // Render HTML content fields
  NextImage as ContentSdkImage, // Render image fields (supports editing + next/image)
  TextField,      // Type for text fields
  RichTextField,  // Type for rich text fields
  LinkField,      // Type for link fields
  ImageField,     // Type for image fields
  useSitecore,    // Hook to get page context (editing mode, etc.)
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';
```

**CRITICAL**: Import from `'lib/component-props'` (NOT `'@/lib/component-props'`). Our basic-nextjs uses the `lib/` path alias without `@`.

## Component Structure (Pattern A — Our Standard)

```typescript
'use client';

import type React from 'react';
import { type JSX } from 'react';
import {
  NextImage as ContentSdkImage, ImageField,
  Text, TextField, RichText, RichTextField,
  LinkField, useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface MyComponentParams {
  [key: string]: string;
}

export interface MyComponentFields {
  Heading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
}

export interface MyComponentProps extends ComponentProps {
  params: MyComponentParams;
  fields: MyComponentFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const MyComponentDefault = (
  props: MyComponentProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  // Guard: no data fallback
  if (!fields) {
    return (
      <section className="component my-component" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">MyComponent</span>
        </div>
      </section>
    );
  }

  const { Heading, Description, BackgroundImage, CtaLabel, CtaLink } = fields || {};

  return (
    <section data-component="MyComponent" id={id ? id : undefined} className="w-full">
      {(Heading?.value || isPageEditing) && (
        <Text field={Heading} tag="h2" className="text-[32px] font-[700]" />
      )}
      {(Description?.value || isPageEditing) && (
        <RichText field={Description} className="text-[16px]" />
      )}
      {(BackgroundImage?.value?.src || isPageEditing) && (
        <ContentSdkImage
          field={{
            ...BackgroundImage,
            value: {
              ...BackgroundImage?.value,
              style: { width: '100%', height: 'auto', objectFit: 'cover' },
            },
          }}
        />
      )}
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<MyComponentProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <MyComponentDefault {...props} isPageEditing={isEditing} />;
};
```

## Critical Rules

### 1. Always `'use client'`
First line of every component file. Without it, component map generation skips the file.

### 2. Named `Default` export (NEVER default export)
```typescript
// CORRECT — named export with useSitecore wrapper
export const Default: React.FC<Props> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <InnerComponent {...props} isPageEditing={isEditing} />;
};

// WRONG — default export
export default function MyComponent(props) { ... };
```

### 3. Inner component + exported variant pattern
The actual rendering goes in an inner component (e.g., `HeroDefault`). The exported `Default` just wraps it with `useSitecore()`. This separates editing mode detection from rendering logic.

### 4. Safe Destructuring
```typescript
// CORRECT — won't crash if fields is null
const { Heading, Description } = fields || {};

// WRONG — crashes if fields is null
const { Heading } = fields;
```

### 5. Edit Mode Guards
Always show fields in editing mode, even if empty:
```typescript
{(Heading?.value || isPageEditing) && <Text field={Heading} tag="h1" />}
```

### 6. Field Components for Editability
```typescript
// CORRECT — editable in Experience Editor
<Text field={Heading} tag="h1" />

// WRONG — not editable
<h1>{Heading?.value}</h1>
```

### 7. Image Spread Pattern
Always spread image field with style to control dimensions:
```typescript
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

### 8. CTA/Link Pattern
For links, use separate Label + Link fields (not the Link component wrapper):
```typescript
// Our pattern — CTA as separate label + link fields
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

### 9. Overlay pointer-events in Edit Mode
```typescript
<div
  className={`absolute inset-0 z-10 ${isPageEditing ? 'pointer-events-none opacity-30' : ''}`}
  style={{ backgroundColor: 'rgba(0,26,112,0.55)' }}
/>
```

### 10. Stats / Numbered Fields Pattern
For fixed-count repeated items (e.g., 4 stats), use numbered flat fields:
```typescript
const stats = [
  { title: fields.stat1Title, subtitle: fields.stat1Subtitle },
  { title: fields.stat2Title, subtitle: fields.stat2Subtitle },
  { title: fields.stat3Title, subtitle: fields.stat3Subtitle },
  { title: fields.stat4Title, subtitle: fields.stat4Subtitle },
];

{stats.map((stat, i) => (
  <div key={i}>
    {(stat.title?.value || isPageEditing) && (
      <Text field={stat.title} tag="div" className="text-[80px] font-[700] text-white" />
    )}
  </div>
))}
```

## Component Map Registration

Components are auto-registered via:
```bash
npm run sitecore-tools:generate-map
```

This generates two files:
- `.sitecore/component-map.ts` — server map with `componentType: 'client'`
- `.sitecore/component-map.client.ts` — client map

**Registration format:**
```typescript
import * as Hero from 'src/components/adnocgas/Hero';
// ...
export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['Hero', { ...Hero, componentType: 'client' }],
]);
```

**The map key MUST match the Sitecore rendering Component Name field exactly.**

## File Placement

All adnocgas components go in:
```
xmcloud/examples/basic-nextjs/src/components/adnocgas/
├── Hero.tsx
├── HeroHomepage.tsx
├── Header.tsx
├── Footer.tsx
├── Accordion.tsx
├── ... (one file per component)
```

## Component Header Comment Convention

Every component file starts with a JSDoc comment:
```typescript
/**
 * ComponentName — Short description
 * Sitecore fields: Field1, Field2, Field3
 * Template: TemplateName ({templateGuid})
 * Rendering: RenderingName ({renderingGuid})
 */
```

## Reference: Working adnocgas HeroHomepage

See `xmcloud/examples/basic-nextjs/src/components/adnocgas/HeroHomepage.tsx` for the canonical example of our component pattern.
