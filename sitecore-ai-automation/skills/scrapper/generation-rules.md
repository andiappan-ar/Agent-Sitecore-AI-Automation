# Skill: HTML/React Generation Rules (Phase 4)

Rules for generating pixel-perfect Tailwind HTML/React from extraction data.

## Absolute Rules

1. **EXACT VALUES ONLY** — never approximate. `14px` → `text-[14px]`, not `text-sm`
2. **FONTS from computed styles** — use the `s` object's `font-family`, `font-size`, `font-weight`. Never guess from CSS class names.
3. **MOBILE-FIRST** — base classes from 375px extraction, `md:` for 768px diffs, `lg:` for 1440px diffs
4. **ALL COLLECTION ITEMS** — render EVERY card, slide, row. Never just one example.
5. **ALPINE.JS for interactions** — hamburger, carousel, tabs, accordion
6. **PRESERVE everything** — image src, link href, SVG outerHTML from extraction
7. **HOVER EFFECTS from interactions data** — never guess hover states
8. **ZERO HARDCODED CONTENT** — all text/images flow through props/attributes
9. **PSEUDO-ELEMENTS** — check `pseudos` array, render as absolute `<div>` overlays
10. **NO CSS var opacity** — NEVER `bg-[var(--color-x)]/40`, use `style={{ backgroundColor: 'rgba(R,G,B,A)' }}`

## Tailwind Mapping

| CSS Property | Tailwind |
|---|---|
| `display: flex` | `flex` |
| `flex-direction: column` | `flex-col` |
| `justify-content: center` | `justify-center` |
| `align-items: center` | `items-center` |
| `gap: 16px` | `gap-[16px]` |
| `width: 1440px` | `w-[1440px]` |
| `height: 500px` | `h-[500px]` |
| `padding: 24px` | `p-[24px]` |
| `background-color: #3B82F6` | `bg-[#3B82F6]` |
| `border-radius: 8px` | `rounded-[8px]` |
| `position: absolute` | `absolute` |

**Philosophy:** Pixel-perfect first (arbitrary values), Tailwind convenience second.

## Responsive Breakpoints

```
375px  → base classes (no prefix)
768px  → md: prefix (only for DIFFERENCES from 375px)
1440px → lg: prefix (only for DIFFERENCES from 768px)
```

Example:
```html
<div class="px-[16px] md:px-[24px] lg:px-[32px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

## Font Loading

```css
@font-face {
  font-family: 'ADNOC Sans';
  src: url('./assets/fonts/ADNOC_Sans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

In components: `className="font-['ADNOC Sans',sans-serif]"`

Always use LOCAL fonts (downloaded to assets/), never CDN links.

## React Component Identification (MANDATORY)

```jsx
// Each component MUST have:
<section data-component="Hero" className="hero-section w-full">
  {/* Semantic root: <section>, <header>, <footer> — NOT <div> */}
  {/* data-component attribute */}
  {/* Never nest <section> inside <section> — use <div> for internals */}
</section>
```

## SVG Icon Rules

- Pull SVGs directly from DOM extraction — never use Lucide or icon libraries
- Use `fill="currentColor"` for color inheritance on hover
- Inline SVGs, not `<img src="icon.svg">`

## Common Fix Categories (in order)

1. **Layout** — container width, grid columns, flex direction
2. **Spacing** — padding, margin, gap between components
3. **Typography** — font family, size, weight, line-height
4. **Colors** — background, text, border colors
5. **Images** — sizing, aspect ratio, object-fit
