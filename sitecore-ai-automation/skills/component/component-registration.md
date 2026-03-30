# Skill: Component Registration in Rendering Host

How to register new Sitecore components in the XM Cloud rendering host so they render in Page Builder and the live site.

## Overview

After creating a React component TSX file, it must be:
1. Placed in the correct directory
2. Registered in the component map
3. Its Sitecore rendering name must match the map key

## File Placement

All adnocgas components go here:
```
xmcloud/examples/basic-nextjs/src/components/adnocgas/{ComponentName}.tsx
```

## Component Map Files

Two map files exist (auto-generated):
- `.sitecore/component-map.ts` — server map (includes `componentType: 'client'`)
- `.sitecore/component-map.client.ts` — client map

### Auto-Generation (Preferred)

```bash
cd xmcloud/examples/basic-nextjs
npm run sitecore-tools:generate-map
```

This scans all components with `'use client'` directive and generates both maps.

### Manual Registration (When auto-gen isn't available)

Add to `.sitecore/component-map.ts`:
```typescript
import * as MyComponent from 'src/components/adnocgas/MyComponent';

// In the componentMap:
['MyComponent', { ...MyComponent, componentType: 'client' }],
```

Add to `.sitecore/component-map.client.ts`:
```typescript
import * as MyComponent from 'src/components/adnocgas/MyComponent';

// In the componentMap:
['MyComponent', { ...MyComponent }],
```

## Critical Rules

1. **Map key = Sitecore rendering Component Name** — `['Hero', ...]` must match the `Component Name` field on the rendering item in Sitecore
2. **All interactive components use `componentType: 'client'`** in the server map
3. **Client map does NOT include `componentType`** — all entries are client by default
4. **Import uses `import * as Name`** — star import to capture all named exports (Default, ThreeUp, etc.)
5. **Built-in components** (BYOCWrapper, FEaaSWrapper, Form) are always at the top — don't remove them

## Verification

After registration, verify:
```bash
# Build to check for import errors
npm run build

# Or just dev server — component should appear
npm run dev
```

If the component shows "Unknown component" in Page Builder:
- Check map key matches rendering Component Name exactly (case-sensitive)
- Check the TSX file has `'use client'` as first line
- Check the TSX file has `export const Default` (named export, not default export)
- Run `npm run sitecore-tools:generate-map` to regenerate

## Related Skills
- [React Sitecore Patterns](react-sitecore-patterns.md) — Component code patterns
- [Rendering Definition](../serialization/rendering-definition.md) — Sitecore rendering YAML
