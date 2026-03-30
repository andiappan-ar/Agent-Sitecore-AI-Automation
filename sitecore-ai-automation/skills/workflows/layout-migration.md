# Layout Migration — Workflow Skill

## Purpose
Migrate layout-level configuration from the scraped React project to the Sitecore rendering host BEFORE converting individual components. This is the foundation that components sit on.

---

## When to Use
**ALWAYS before component conversion.** The layout must be set up first because:
- Components depend on fonts, CSS variables, Tailwind config
- The Sitecore Layout.tsx defines header/main/footer placeholder structure
- Design tokens need to be in the rendering host's globals.css
- Fonts need to be loaded at the layout level

---

## What to Migrate (from React project → Rendering Host)

### 1. Fonts (@font-face declarations)

**Source:** React project `src/index.css` — extracted font-face declarations
**Target:** Rendering host `src/assets/styles/globals.css` or `src/app/globals.css`

Copy:
- @font-face declarations (font-family, src, weight, style)
- Font files to `src/assets/fonts/` or `public/fonts/`
- OR register via `next/font/local` in Layout.tsx (CBRE pattern)

**CBRE reference:** `Layout.tsx` lines 16-43 — uses `next/font/local` and `next/font/google`

### 2. CSS Variables (design tokens)

**Source:** Extracted `design-system/tokens.css` — color, font, spacing variables
**Target:** Rendering host globals.css `:root` block

Merge:
- `--color-primary`, `--color-accent`, `--color-surface`
- `--font-primary`
- Brand-specific color tokens

### 3. Tailwind Config

**Source:** Extracted `design-system/tailwind.config.js` — brand colors, fonts
**Target:** Rendering host `tailwind.config.js`

Merge into `theme.extend`:
- colors (brand palette)
- fontFamily (primary, heading, body)
- Container max-width if different

### 4. Global Styles (base resets)

**Source:** React project `src/index.css` — base resets, global styles
**Target:** Rendering host globals.css

Copy applicable:
- `img { max-width: 100%; height: auto; }` (if not already there)
- `a { text-decoration: none; color: inherit; }` (if not already there)
- Any brand-specific global overrides

### 5. Layout.tsx Configuration

**Source:** CBRE reference `Layout.tsx` — header/main/footer placeholder structure
**Target:** Rendering host `src/Layout.tsx`

Verify/update:
- `headless-header` placeholder → wraps Header component
- `headless-main` placeholder → wraps page body components
- `headless-footer` placeholder → wraps Footer component
- Editing mode class handling (`isEditing ? 'editing-mode' : 'prod-mode'`)
- Fixed header handling (`isEditing ? 'relative' : 'fixed'` — CBRE pattern line 121)
- Font variable classes on root container
- `min-h-screen flex flex-col` on root div

### 6. Sitecore Placeholders Setup

In Sitecore CM, verify these placeholders exist:
- `headless-header` — for Header partial design
- `headless-main` — for page body components
- `headless-footer` — for Footer partial design

These come from the SXA site scaffolding (Basic template) but may need placeholder settings configured.

---

## Migration Steps

### Step 1: Copy font files
```
FROM: scrapper/output/{domain}/react-app/src/assets/fonts/
  OR: scrapper/output/{domain}/extracted/ (font URLs in design-system.json)
TO:   xmcloud/examples/{rendering-host}/src/assets/fonts/
```

### Step 2: Add @font-face to globals.css
```css
/* In rendering host globals.css */
@font-face {
  font-family: 'ADNOC Sans';
  src: url('../assets/fonts/ADNOC_Sans_Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}
/* ... repeat for each weight */
```

OR use `next/font/local` in Layout.tsx (CBRE preferred pattern):
```tsx
import localFont from 'next/font/local';

const primaryFont = localFont({
  src: [
    { path: './assets/fonts/ADNOC_Sans_Regular.ttf', weight: '400', style: 'normal' },
    { path: './assets/fonts/ADNOC_Sans_Medium.ttf', weight: '600', style: 'normal' },
    { path: './assets/fonts/ADNOC_Sans_Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-primary',
  display: 'swap',
});
```

### Step 3: Merge CSS variables into globals.css
```css
:root {
  --color-primary: #001a70;
  --color-accent: #00bfb2;
  --color-surface: #ffffff;
  --font-primary: 'ADNOC Sans', sans-serif;
}
```

### Step 4: Update Tailwind config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#001a70',
        accent: '#00bfb2',
        surface: '#ffffff',
      },
      fontFamily: {
        primary: ['var(--font-primary)', 'sans-serif'],
      },
    },
  },
};
```

### Step 5: Update Layout.tsx
Verify the three-placeholder structure matches CBRE:
- `headless-header` (fixed on desktop, relative in editing)
- `headless-main` (page body)
- `headless-footer`
- Add font variable classes to root div
- Add editing mode class handling

### Step 6: Verify Sitecore placeholders
```graphql
{
  item(where: { path: "/sitecore/content/Adnoc/adnocgas/Presentation/Placeholder Settings" }) {
    children { nodes { name } }
  }
}
```

---

## Order of Operations

```
1. Layout migration (THIS SKILL) ← fonts, tokens, tailwind, Layout.tsx
2. Component conversion (react-to-sitecore-component.md) ← JSX → TSX
3. Content authoring (content-authoring SKILL) ← datasources, pages, __Renderings
4. Available Renderings + Partial Designs ← editor setup
5. Push + verify
```

**Never start component conversion before layout is set up.**

---

## Execution Log — adnocgas.ae (2026-03-28)

### What was done:
1. **Fonts**: Downloaded 5 ADNOC Sans weights (300/400/600/700/900) from `adnocgas.ae/assets/fonts/` → `xmcloud/examples/basic-nextjs/src/assets/fonts/`
2. **@font-face**: Added 5 declarations to `src/app/globals.css` with `font-display: swap`
3. **CSS Variables**: Added `:root` block with `--color-primary (#001a70)`, `--color-accent (#00bfb2)`, `--color-surface`, `--color-dark`, `--color-text`, `--color-link`, `--color-border`, `--color-bg-light`, `--font-primary`
4. **Global styles**: Added `img { max-width: 100%; }` and `a { text-decoration: none; }`
5. **Tailwind config**: Extended `colors` (primary, accent, dark, text-body, link, border, bg-light), `fontFamily` (primary, adnoc-sans), `maxWidth` (container: 1400px)
6. **Layout.tsx**: Updated following CBRE pattern:
   - `next/font/local` for ADNOC Sans with `--font-primary` CSS variable
   - Fixed header on live, relative in editing (`isEditing ? 'relative' : 'fixed'`)
   - Three placeholders: `headless-header`, `headless-main`, `headless-footer`
   - `min-h-screen flex flex-col` root
   - Editing mode + partial design mode class handling
   - DesignLibraryApp support
7. **Placeholders**: Verified `headless-header` and `headless-footer` partial design placeholders exist in Sitecore

### Files changed:
- `xmcloud/examples/basic-nextjs/src/assets/fonts/ADNOC_Sans_*.ttf` (5 files created)
- `xmcloud/examples/basic-nextjs/src/app/globals.css` (fonts + variables + globals added)
- `xmcloud/examples/basic-nextjs/tailwind.config.js` (brand tokens added)
- `xmcloud/examples/basic-nextjs/src/Layout.tsx` (CBRE pattern applied)

### Font source:
`https://www.adnocgas.ae/assets/fonts/ADNOC_Sans_{Regular,Medium,Bold,XBold,Light}.ttf`

### Key CBRE reference followed:
`Reference projects/CBRE.POC-SitecoreAI-main/.../kit-nextjs-product-listing/src/Layout.tsx`
- `localFont` from `next/font/local` (lines 16-27)
- Font variable on root class (line 85)
- Fixed header with editing override (line 121)
- Three-placeholder structure (lines 122-157)

---

---

## WARNINGS — Learned the Hard Way

### Do NOT create `.env.local` when using Docker rendering host

**Never create `.env.local` in the rendering host directory (`xmcloud/examples/basic-nextjs/`) when the rendering host runs inside Docker.** It overrides Docker env vars and breaks the container (causes ENOTFOUND on `xmcloudcm.localhost` because the container should use `http://cm` internally).

- Docker env vars come from `docker-compose.override.yml` — the container uses `SITECORE_API_HOST: "http://cm"` internally.
- `.env.local` overrides these, causing the container to try resolving `xmcloudcm.localhost` which doesn't exist inside the Docker network.

### Running the rendering host locally (outside Docker)

Running locally requires `NEXT_PUBLIC_SITECORE_API_HOST` and `NEXT_PUBLIC_SITECORE_API_KEY` env vars. However, the layout service route resolution may fail for custom sites — the Docker approach is more reliable for now.

---

## Related Skills
- [React → Sitecore Component](react-to-sitecore-component.md) — depends on layout being ready
- [Content Authoring](../content-authoring/SKILL.md) — CBRE page creation pattern
- [Create Site](create-site.md) — site already created, but rendering host needs layout config
