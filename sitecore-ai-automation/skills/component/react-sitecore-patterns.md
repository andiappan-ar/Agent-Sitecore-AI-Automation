# Skill: React Sitecore Content SDK Component Patterns

Exact patterns for building React components that work with Sitecore XM Cloud.
Based on the working CBRE project.

## Imports

```typescript
'use client';  // MANDATORY — required for component map auto-generation

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,           // Render text fields (editable in Experience Editor)
  RichText,       // Render HTML content fields
  Link as ContentSdkLink,     // Render link fields
  NextImage as ContentSdkImage, // Render image fields
  TextField,      // Type for text fields
  LinkField,      // Type for link fields
  ImageField,     // Type for image fields
  Field,          // Generic field type
  useSitecore,    // Hook to get page context (editing mode, etc.)
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from '@/lib/component-props';
```

## Component Structure

```typescript
// 1. Define field interfaces
interface MyComponentFields {
  heading?: TextField;
  bodyText?: TextField;
  backgroundImage?: ImageField;
  ctaLink?: LinkField;
  ctaLabel?: TextField;
}

// 2. Define props (extends ComponentProps)
interface MyComponentProps extends ComponentProps {
  params: { [key: string]: any };
  fields: MyComponentFields;
}

// 3. Export as named `Default` (NEVER default export)
export const Default: React.FC<MyComponentProps> = (props) => {
  const { fields, params } = props;
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const id = params?.RenderingIdentifier;

  // 4. Guard: no data fallback
  if (!fields) {
    return <div className="is-empty-hint">MyComponent</div>;
  }

  // 5. Safe destructuring
  const { heading, bodyText, backgroundImage, ctaLink, ctaLabel } = fields || {};

  return (
    <section data-component="MyComponent" id={id} className="w-full">
      {/* 6. Conditional rendering with edit mode */}
      {(heading?.value || isEditing) && (
        <Text tag="h2" field={heading} />
      )}

      {(bodyText?.value || isEditing) && (
        <RichText field={bodyText} />
      )}

      {/* 7. Image with spread pattern */}
      {backgroundImage?.value?.src && (
        <ContentSdkImage
          field={{
            ...backgroundImage,
            value: {
              ...backgroundImage.value,
              style: { width: '100%', height: 'auto' },
            },
          }}
        />
      )}

      {/* 8. Link with guard */}
      {(ctaLink?.value?.href || isEditing) && (
        <ContentSdkLink field={ctaLink}>
          <Text tag="span" field={ctaLabel} />
        </ContentSdkLink>
      )}
    </section>
  );
};
```

## Critical Rules

### 1. Always `'use client'`
First line of every component file. Without it, component map generation skips the file.

### 2. Export as `Default` (named export)
```typescript
// CORRECT
export const Default: React.FC<Props> = (props) => { ... };

// WRONG
export default function MyComponent(props) { ... };
```

### 3. Safe Destructuring
```typescript
// CORRECT — won't crash if fields is null
const { heading, bodyText } = fields || {};

// WRONG — crashes if fields.data is null
const { heading } = fields.data.datasource;
```

### 4. Edit Mode Guards
Always show fields in editing mode, even if empty:
```typescript
{(heading?.value || isEditing) && <Text tag="h1" field={heading} />}
```

### 5. Field Components for Editability
```typescript
// CORRECT — editable in Experience Editor
<Text tag="h1" field={heading} />

// WRONG — not editable
<h1>{heading?.value}</h1>
```

### 6. Image Spread Pattern
Never pass image field directly — always spread with style:
```typescript
<ContentSdkImage
  field={{
    ...fields.Image,
    value: {
      ...fields.Image.value,
      style: { objectFit: 'cover', width: '100%', height: '100%' },
    },
  }}
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

### 7. Link Guards
Optional links must be guarded:
```typescript
{ctaLink?.value?.href && !isEditing && (
  <ContentSdkLink field={ctaLink}>Link Text</ContentSdkLink>
)}
```

In edit mode, render without the link wrapper:
```typescript
const Wrapper = isEditing ? 'div' : 'a';
const wrapperProps = isEditing ? {} : { href: ctaLink?.value?.href || '#' };
```

### 8. Fixed Overlays in Edit Mode
```typescript
className={isEditing ? 'static' : 'fixed top-0 z-50'}
style={isEditing ? {} : { pointerEvents: 'none' }}
```

## Component Map Registration

Components are auto-registered via:
```bash
npx sitecore-tools project component generate-map
```

This scans for files with `'use client'` and generates:
- `src/temp/component-map.ts` (server)
- `src/temp/component-map.client.ts` (client)

## CBRE Example: CBREAboutSection

```typescript
'use client';

import type React from 'react';
import { Text, TextField, LinkField, useSitecore } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from '@/lib/component-props';

interface CBREAboutSectionFields {
  bodyText?: TextField;
  highlightText?: TextField;
  ctaLabel?: TextField;
  ctaLink?: LinkField;
}

interface CBREAboutSectionProps extends ComponentProps {
  params: { [key: string]: any };
  fields: CBREAboutSectionFields;
}

export const Default: React.FC<CBREAboutSectionProps> = (props) => {
  const { fields, params } = props;
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return <div className="is-empty-hint">CBREAboutSection</div>;
  }

  const { bodyText, highlightText, ctaLabel, ctaLink } = fields || {};

  return (
    <section data-component="CBREAboutSection" id={id} className="w-full flex justify-center py-14 md:py-20">
      <div className="w-full max-w-[1440px] px-4 md:px-14">
        {(bodyText?.value || isEditing) && (
          <Text tag="span" field={bodyText} className="text-[#003f2d]" />
        )}
        {(highlightText?.value || isEditing) && (
          <Text tag="span" field={highlightText} className="text-[#538184]" />
        )}
        {(ctaLabel?.value || isEditing) && (
          <Text tag="span" field={ctaLabel} />
        )}
      </div>
    </section>
  );
};
```
