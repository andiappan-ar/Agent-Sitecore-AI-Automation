---
name: figma-to-react
description: Convert a Figma design node into a pixel-perfect React + Tailwind component. Use when the user provides a Figma node ID or URL and wants to build or fix a component to match the design.
argument-hint: figma-node-id or URL
---

# Figma → React Pixel-Perfect Skill

You are converting a Figma design into a production-quality React + TypeScript + Tailwind CSS component for a Sitecore-backed project. Follow every step below exactly.

---

## Step 1 — Extract the Figma Node ID

If the user provides a URL like `https://figma.com/design/:fileKey/:fileName?node-id=1-2`, extract the node ID as `1:2` (replace `-` with `:`).

If the user provides a bare node ID like `1:698`, use it directly.

---

## Step 2 — Fetch Figma Design Data

### Option A: Figma MCP Tools (if available)

If the Figma desktop MCP server is connected, call **both** tools:

```
1. mcp__figma-desktop__get_design_context  (nodeId: "<id>", clientFrameworks: "react,tailwindcss", clientLanguages: "typescript", artifactType: "COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN")
2. mcp__figma-desktop__get_screenshot      (nodeId: "<id>")
```

### Option B: Figma REST API (when MCP is not available)

Use the Figma REST API with the personal access token from `~/.claude/settings.json`:

```bash
# Extract file key from URL: https://figma.com/design/:fileKey/:fileName?node-id=X-Y
# Token is in ~/.claude/settings.json → mcpServers.figma.env.FIGMA_PERSONAL_ACCESS_TOKEN

# 1. Get node structure and measurements
curl -s -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID&depth=3"

# 2. Get screenshot
curl -s -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_ID&format=png&scale=1"
# Returns JSON with image URL → download and view with Read tool

# 3. Test token validity
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/me"
```

**If API returns 404:** Token may be expired or lack file access. Ask user for a new PAT and update `~/.claude/settings.json`.

### Responsive Breakpoint Extraction

The Figma file contains **multiple breakpoint frames** for each page. The page canvas typically has a section named like:
```
[url] - [site]_1920w_1440w_1024w_768w_390w_default_light_dark.h2d
```

Inside this section, find frames named `1920w default`, `1440w default`, `768w default`, `390w default`, etc.

**Workflow to extract all breakpoints for a component:**

```bash
# 1. List breakpoint frames in the page section
curl -s -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$SECTION_ID&depth=1" \
  | python3 -c "import sys,json; [print(f\"ID: {c['id']}, Name: {c['name']}, Size: {c.get('absoluteBoundingBox',{}).get('width','?')}x{c.get('absoluteBoundingBox',{}).get('height','?')}\") for c in json.load(sys.stdin)['nodes']['$SECTION_ID']['document']['children']]"

# 2. For each breakpoint frame, drill into the component to get measurements
# Use depth=4-7 to get child elements with absoluteBoundingBox (width, height, x, y)
# and style (fontFamily, fontSize, fontWeight, lineHeightPx)

# 3. Get screenshots for mobile and tablet to visually verify
curl -s -H "X-Figma-Token: $TOKEN" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$MOBILE_FRAME_ID,$TABLET_FRAME_ID&format=png&scale=1"
```

**Always extract measurements for ALL breakpoints before writing responsive CSS.** Create a table:

```
| Breakpoint | Container | Image | Content | Layout |
|---|---|---|---|---|
| 390w | 390x473 | 342x205 | 342x212 | Column |
| 768w | 768x480 | 336x448 | 368x448 | Row |
| 1024w | 1024x627 | 428x571 | 484x571 | Row |
| 1440w | 1440x439 | 639x383 | 689x383 | Row |
| 1920w | 1920x598 | 904x542 | 689x542 | Row |
```

Study both outputs carefully before writing any code. The screenshot is truth — code must match it visually.

---

## Step 3 — Extract Design Tokens from Figma Output

Map every Figma variable to a project token:

### Colors
| Figma token | Hex | Usage |
|---|---|---|
| color/spring-green/12 | `#003f2d` | Primary dark green — headings, borders, CTA text |
| color/cyan/9 | `#012a2d` | Darkest teal — dark backgrounds, banner bg |
| color/cyan/30 | `#435254` | Mid grey-teal — body text, descriptions, section bgs |
| color/spring-green/50 | `#17e88f` | CBRE accent green — CTA lines, arrows, hover accents |
| color/grey/89 | `#e3e3e3` | Light grey — featured articles bg |
| color/grey/81 | `#cad1d3` | Border grey — card top rules, dividers |
| color/Nobel | `#b3b3b3` | Footer divider |
| color/white | `#ffffff` | |
| color/Limed Spruce (muted teal) | `#538184` | About section highlight text |

### Typography
| Figma font token | Tailwind class | Notes |
|---|---|---|
| font-family/Font 2 (Financier Display) | `font-financier` | Headings, large display text |
| font-family/Font 1 (Calibre) | `font-calibre` | Body, UI, CTAs |
| Calibre Regular | `style={{ fontWeight: 400 }}` | |
| Calibre Medium | `style={{ fontWeight: 500 }}` | CTAs, nav links, body medium |
| Calibre 450 (between reg/med) | `style={{ fontWeight: 450 }}` | Eyebrow/label text (subtle) |

### Font Size Map
| Figma token | px value |
|---|---|
| font-size/76 | 76px |
| font-size/64 | 64px |
| font-size/60 | 60px |
| font-size/32 | 32px |
| font-size/20 | 20px |
| font-size/19.5 | 19.5px |
| font-size/18 | 18px |
| font-size/15.6 | 15.6px |
| font-size/13.6 | 13.6px |
| font-size/11.6 | 11.6px |

### Spacing Map
| Figma token | Value |
|---|---|
| item-spacing/s+ | 24px (gap-6) |
| item-spacing/40 | 40px (gap-10) |
| item-spacing/64 | 64px |
| px-14 | 56px page gutter |

---

## Step 4 — Component Structure Rules

### Page Layout
- Max content width: `max-w-[1440px] px-14 mx-auto`
- Page gutter: `px-14` (56px each side) — use `px-4 md:px-14` for responsive
- Full-width sections use `w-full flex justify-center` wrapping an inner `max-w-[1440px]`

### Sitecore Field Pattern
Every component receives typed Sitecore fields with defaults:
```tsx
interface MyFields {
  title: TextField;       // { value: string }
  link: LinkField;        // { value: { href: string } }
  image: ImageField;      // { value: { src: string; alt: string } }
}
const defaultFields: MyFields = { ... };
interface MyProps { fields?: MyFields; }
export default function MyComponent({ fields = defaultFields }: MyProps) { ... }
```

Import types from `../../types/sitecore`.

### Font Registration
Fonts are registered in `index.css`:
- `Calibre` at weight range 400–449 (regular file)
- `Calibre` at weight range 450–600 (medium file)
- `Financier Display` at weight 400
- Use `font-financier` and `font-calibre` Tailwind utilities

---

## Step 5 — Hover Effect Patterns

All hover transitions must be **subtle and slow** (`duration-500 ease-in-out`). Never use instant toggles.

### Underline fade (text links)
```tsx
// Always starts transparent, fades in on hover
className="underline decoration-transparent hover:decoration-[#003f2d] transition-[text-decoration-color] duration-500 ease-in-out"

// Group hover (parent is the hover target):
className="underline decoration-transparent group-hover:decoration-[#003f2d] transition-[text-decoration-color] duration-500 ease-in-out"

// Underline COLOR change (was already underlined):
className="underline decoration-[#538184] hover:decoration-[#17e88f] transition-[text-decoration-color] duration-500 ease-in-out"
```

### CTALink (line → arrow animation)
Atoms/CTALink.tsx handles the CBRE standard CTA:
- Default: green line `────` + gap + label text
- Hover: line collapses left → label shifts left → gap + arrow `→` expands right
- Implementation: `max-w-[52px] group-hover:max-w-0 transition-[max-width] duration-500 ease-in-out`
- Always use `<CTALink label="..." href="..." variant="dark|light" />`

### Image overlay slide (InsightCard pattern)
```tsx
// Parent needs overflow-hidden
<div className="relative overflow-hidden">
  <div className="...image...">
  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out">
    {/* overlay content */}
  </div>
</div>
```

### Button fill invert
```tsx
className="bg-white text-[#012a2d] hover:bg-[#012a2d] hover:text-white transition-colors duration-400"
```

### Social / icon color
```tsx
className="text-[#003f2d] hover:text-[#17e88f] transition-colors duration-500"
```

---

## Step 6 — Common Mistakes to Avoid

| Mistake | Correct approach |
|---|---|
| Using `font-semibold` for titles | Use `font-financier` at 32px or 64px |
| Using `hover:underline` toggle | Use `decoration-transparent → hover:decoration-[color]` |
| Inline padding eating into fixed-width content div | Put padding on the outer flex container, not the content div |
| `flex-1` making description column too wide | Use `width: 300px` or `maxWidth` to constrain description column |
| Section title with forced `<br/>` per word | Set `maxWidth` on the h2 and let text wrap naturally |
| CTA using wrong component (e.g. plain `<a>` instead of CTALink) | Always use `<CTALink>` for line→arrow CTAs; use plain `<a>` only for large display text links |
| BannerStrip going full-width when it should be inset | Use `mx-14` + `-my-[42px]` + `relative z-10` for the floating overlap effect |
| Box-sizing eating into fixed width | All padding on outer container, content div gets clean width |
| Instant color/bg transition | Always add `transition-* duration-500 ease-in-out` |
| Title underlined by default when Figma shows hover-only | Use `decoration-transparent hover:decoration-[#003f2d]`, never `decoration-[#003f2d]` as default unless Figma confirms |
| Fixed pixel heights breaking on mobile | Remove fixed heights on mobile; only set them at `lg:` e.g. `lg:h-[560px]` |
| BannerStrip negative margin overlapping on mobile | `md:-my-[42px] md:relative md:z-10` — overlap effect desktop only |
| Multi-up grid clipping on mobile (looks like carousel) | Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` or implement a proper scroll-snap carousel |
| Nav taking up too much space with `flex-1` | Use `ml-auto` on `<nav>` — never `flex-1` — so it stays compact and right-aligned |
| Adding dropdown chevron arrows to nav items | CBRE nav has NO dropdown indicators; the hover trigger alone opens the mega-menu |
| Column heading border using dark green | Column headings in mega-menu use `border-b border-[#cad1d3]` (light gray), not `#003f2d` |
| "View All" links as plain `<a>` in mega-menu | Use `<CTALink label="..." href="..." variant="dark" />` for the green dash → arrow animation |
| Active nav indicator inset from button edges | Use `left-0 right-0` (full-width), not `left-4 right-4` — the green bar spans the whole button |
| Header using `absolute` or always-visible `fixed` | Use `fixed` with scroll-direction hide/show (`translate-y-0` / `-translate-y-full`); in editing mode: `absolute` for transparent modes (same bgClass), `relative` for solid modes |
| Header border always visible on inner pages | Border should only appear when mega-menu is open: `hasMegaMenu ? 'border-b border-[#e3e3e3]' : ''` |
| `max-w-[1440px] mx-auto` on inner page hero text | At viewports > 1440px the centered container misaligns with the full-width header logo. Use `w-full px-4 md:px-14` (no max-width) instead |
| `<h3>` wrapper inside flex-col card | Block elements inside `flex-col items-start` cause sibling indentation. Flatten to direct flex children — use plain `<a>` for the title link, no `<h3>` wrapper |
| Inner page image full padding (both sides) | Inner page hero images use left padding only: `pl-4 md:pl-14`. Right edge is full bleed to viewport edge |
| Gray fallback background on image container | Do not add `bg-[#cad1d3]` to image containers. Download the real asset from Figma MCP (localhost:3845) instead |

---

## Step 7 — Z-Index / Stacking Rules

Sections that overlap neighboring sections:
```tsx
// BannerStrip floats between FeaturedArticles and AboutSection — DESKTOP ONLY
<section className="mx-4 md:mx-14 bg-[#012a2d] md:relative md:z-10 md:-my-[42px]">
// Note: negative margin is md: prefixed so it doesn't overlap on mobile

// Sections that BannerStrip overlaps need z-0:
<section className="... relative z-0">
```

---

## Step 8 — Responsive Design Patterns

Use a **mobile-first** approach with these breakpoints:
- Default: mobile (< 768px)
- `md:` — tablet (768px+)
- `lg:` — desktop (1024px+)

### Page gutter
```tsx
// Always responsive
className="px-4 md:px-14"
```

### Section vertical spacing
```tsx
// HomePage wrapper sections — scale down on mobile
className="py-14 md:py-20 lg:py-28"
```

### Hero — stacked on mobile
```tsx
<div className="flex flex-col lg:flex-row ...">
  <div className="w-full aspect-video lg:aspect-auto lg:flex-1 ...">  {/* image */}
  <div className="pt-8 lg:pt-0 lg:pl-16 lg:w-[689px]">              {/* content */}
```

### Horizontal bar sections (FeaturedArticles)
```tsx
// Stack vertically on mobile, horizontal on desktop
<div className="flex flex-col lg:flex-row items-stretch lg:h-[240px]">
  {/* Dividers: hidden on mobile, shown on desktop */}
  <div className="hidden lg:flex absolute left-0 ...">
  {/* Border between stacked items on mobile */}
  <div className="... border-b border-[#cad1d3] last:border-b-0 lg:border-b-0">
```

### Split layout (NewsletterSection)
```tsx
// Stack on mobile, side-by-side on desktop. Fixed height DESKTOP ONLY.
<section className="w-full flex flex-col lg:flex-row lg:h-[560px]">
  <div className="... py-12 lg:py-0 w-full lg:w-[62.5%]">    {/* content */}
  <div className="... h-[280px] md:h-[360px] lg:h-auto lg:flex-1"> {/* image */}
```

### Multi-column grids
```tsx
// 3-up: 1 → 2 → 3
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-6 lg:gap-0"

// 4-up: 1 → 2 → 4
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 lg:gap-4"
```

### 3-column tile layout (WhatWeDoSection)
```tsx
// Section title: full-width on mobile, fixed sidebar on desktop
<div className="flex flex-col lg:flex-row ...">
  <div className="... lg:shrink-0 lg:w-[276px]">  {/* sidebar title */}
  <div className="flex flex-col flex-1 ...">        {/* tiles */}
    {/* Each tile: stacked on mobile, 3-col row on desktop */}
    <div className="flex flex-col lg:flex-row ...">
      {/* Category: horizontal text on mobile, rotated vertical on desktop */}
      <p className="lg:hidden ...">                 {/* mobile */}
      <div className="hidden lg:block ..." style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}> {/* desktop */}
```

### Responsive font sizes
```tsx
// Display headings
className="text-[28px] md:text-[36px] lg:text-[48px]"   // 48px desktop
className="text-[40px] md:text-[52px] lg:text-[64px]"   // 64px desktop
className="text-[44px] md:text-[60px] lg:text-[76px]"   // 76px desktop

// Always use lineHeight: '1' with responsive Tailwind font size classes
style={{ lineHeight: '1' }}
```

### Mobile carousel (for multi-up sections like Our Commitment)
When Figma shows a carousel with dot-indicators on mobile, implement with scroll-snap + React state:
```tsx
import { useState, useRef } from 'react';

const [activeIndex, setActiveIndex] = useState(0);
const scrollRef = useRef<HTMLDivElement>(null);

const scrollTo = (index: number) => {
  const container = scrollRef.current;
  if (!container) return;
  const card = container.children[index] as HTMLElement;
  container.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
  setActiveIndex(index);
};

const handleScroll = () => {
  const container = scrollRef.current;
  if (!container) return;
  const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth ?? container.clientWidth;
  setActiveIndex(Math.min(Math.round(container.scrollLeft / cardWidth), cards.length - 1));
};

// JSX
{/* Mobile carousel — hidden at md+ */}
<div className="md:hidden">
  <div
    ref={scrollRef}
    onScroll={handleScroll}
    className="flex overflow-x-auto snap-x snap-mandatory -mx-4 px-4 gap-4 pb-2"
    style={{ scrollbarWidth: 'none' }}
  >
    {cards.map((card, i) => (
      <div key={i} className="snap-start shrink-0 w-[85vw]">
        <Card card={card} />
      </div>
    ))}
  </div>
  {/* Bar dots — equal-width bars, active = #003f2d, inactive = #cad1d3 */}
  <div className="flex gap-2 mt-6">
    {cards.map((_, i) => (
      <button key={i} onClick={() => scrollTo(i)}
        className={`h-1 flex-1 transition-colors duration-300 ${i === activeIndex ? 'bg-[#003f2d]' : 'bg-[#cad1d3]'}`}
      />
    ))}
  </div>
</div>
{/* Desktop grid — hidden below md */}
<div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 lg:gap-4">
  {cards.map((card, i) => <Card key={i} card={card} />)}
</div>
```

### Footer responsive
```tsx
// Top row: logo + nav stack on mobile
<div className="flex flex-col md:flex-row gap-8 md:gap-16 mb-8">

// Bottom row: links + social stack on mobile
<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">

// Font sizes
className="text-[16px] md:text-[20px]"   // primary links
className="text-[13px] md:text-[16px]"   // secondary links
```

---

## Step 9 — Header / Navigation Patterns

### Header variant prop (lightmode vs darkmode)
The Header accepts a `variant` prop to control appearance on different page types:
```tsx
// On inner pages (white background): variant="lightmode"
// On home/hero pages (dark photo bg): variant="darkmode" (default)
<Header variant="lightmode" />
<Header variant="darkmode" />

// Inside Header.tsx:
interface HeaderProps { variant?: 'lightmode' | 'darkmode'; }

// isWhite = true when lightmode OR when mega-menu is open (any variant)
const isWhite = variant === 'lightmode' || hasMegaMenu;

// Border: only show when mega-menu open (hover state), not always
const borderClass = hasMegaMenu ? 'border-b border-[#e3e3e3]' : '';
```

### Header scroll behavior — hide on scroll down, show on scroll up
The header hides when the user scrolls down and reappears when scrolling up. This is done with `translate-y` transitions:
```tsx
const [isHeaderVisible, setIsHeaderVisible] = useState(true);
const lastScrollY = useRef(0);

useEffect(() => {
  if (isPageEditing) return; // never hide in editing mode
  const onScroll = () => {
    const currentY = window.scrollY;
    if (currentY <= 10) {
      setIsHeaderVisible(true);
    } else if (currentY > lastScrollY.current + 5) {
      setIsHeaderVisible(false); // scrolling down → hide
    } else if (currentY < lastScrollY.current - 5) {
      setIsHeaderVisible(true); // scrolling up → show
    }
    lastScrollY.current = currentY;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, [isPageEditing]);

// Apply to header element:
<header className={`
  ${isPageEditing
    ? 'static'  // CRITICAL: static in editing mode so it doesn't cover the main placeholder
    : `fixed top-0 left-0 right-0 z-50 transition-all duration-300
       ${isHeaderVisible || hasMegaMenu || mobileOpen ? 'translate-y-0' : '-translate-y-full'}`}
  ${isWhite ? 'bg-white shadow-sm' : 'bg-transparent'}
  ${borderClass}
`}>
```

**Key rules:**
- `fixed` position (not `absolute`) so it stays visible during scroll
- `translate-y-0` / `-translate-y-full` for smooth show/hide animation
- Header stays visible when mega-menu or mobile drawer is open
- **In Sitecore editing mode**: transparent modes use `absolute` (same visual as normal, overlays hero) with same `style.bgClass`; non-transparent modes use `relative`. No scroll behavior in editing mode. This keeps the header looking identical to normal mode while allowing editor clicks.
- 5px scroll threshold prevents jitter from small scroll events

**Lightmode colors:**
- Logo: `variant="dark"` (dark green CBRE logo)
- Nav text: `text-[#003f2d]`
- Search/icons: dark green
- Hamburger: `#003f2d`

**Darkmode colors:**
- Logo: `variant="light"` (white logo)
- Nav text: `text-white`
- Search/icons: white
- Hamburger: `white`

**HamburgerIcon with color prop:**
```tsx
function HamburgerIcon({ color = 'white' }: { color?: string }) {
  return (
    <svg ...>
      <rect fill={color} ... />
      <rect fill={color} ... />
      <rect fill={color} ... />
    </svg>
  );
}
// Usage:
<HamburgerIcon color={isWhite ? '#003f2d' : 'white'} />
```

### Header structure
```tsx
// Header uses fixed positioning with scroll-aware hide/show
// In editing mode, switches to static to avoid blocking Sitecore chrome
<header className={`
  ${isPageEditing
    ? 'static'
    : `fixed top-0 left-0 right-0 z-50 transition-all duration-300
       ${isHeaderVisible || hasMegaMenu || mobileOpen ? 'translate-y-0' : '-translate-y-full'}`}
  ${isWhite ? 'bg-white shadow-sm' : 'bg-transparent'}
  ${hasMegaMenu ? 'border-b border-[#e3e3e3]' : ''}
`}>
  <div className="w-full h-20 px-4 md:px-14 flex items-center justify-between">
    <CBRELogo variant={isWhite ? 'dark' : 'light'} />
    {/* Desktop nav — ml-auto, NOT flex-1 */}
    <nav className="hidden lg:flex items-center h-full ml-auto">
      {NAV_ITEMS.map(item => (
        <button onMouseEnter={() => handleNavEnter(item.label)} className="h-full px-4 relative ...">
          {item.label}
          {/* Active indicator: full-width green bar at bottom */}
          {isActive && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#17e88f]" />}
        </button>
      ))}
    </nav>
    {/* Right: flag + search + hamburger (mobile only) */}
  </div>
  {/* Mega-menu panel — only when activeMenu !== null */}
  {activeMegaMenu && <MegaMenuPanel menu={activeMegaMenu} />}
</header>
```

### Desktop mega-menu hover management
```tsx
// Delay close by 150ms so mouse can move from nav to panel without closing
const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleNavEnter = (label: string) => {
  if (closeTimer.current) clearTimeout(closeTimer.current);
  if (NAV_ITEMS.find(n => n.label === label)?.megaMenu) setActiveMenu(label);
};
const handleNavLeave = () => {
  closeTimer.current = setTimeout(() => setActiveMenu(null), 150);
};
// Apply onMouseLeave on <header>, onMouseEnter on panel to cancel close timer
```

### Mega-menu panel layout
```tsx
// Left info panel + vertical divider + right 3-col grid
<div className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-[#e3e3e3]">
  <div className="max-w-[1440px] mx-auto px-14 py-10 flex gap-12">
    {/* Left: title (Financier 40px) + description + "See Overview" CTA + featured article */}
    <div className="flex flex-col gap-6 w-[260px] shrink-0">
      <h2 className="font-financier text-[#003f2d]" style={{ fontSize: '40px', lineHeight: '1' }}>...</h2>
      <a className="inline-flex bg-[#003f2d] text-white font-calibre ...">See Overview</a>
      {/* Featured article uses CTALink for "Learn More" */}
    </div>
    <div className="w-px bg-[#cad1d3] self-stretch" />
    {/* Right: 3-col grid of NavColumns */}
    <div className="flex-1 grid grid-cols-3 gap-8">
      {columns.map(col => (
        <div className="flex flex-col gap-4">
          {/* Column heading: gray border, uppercase, muted color */}
          <h3 className="font-calibre text-[#435254] pb-3 border-b border-[#cad1d3]"
              style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {/* Items: border-b separator, chevron right, hover color change */}
          <li className="border-b border-[#e3e3e3]">
            <a className="flex items-center justify-between py-3 font-calibre text-[#435254] hover:text-[#003f2d]">
              {item.label} <ChevronRightIcon />
            </a>
          </li>
          {/* "View All" — always use CTALink, not plain <a> */}
          <CTALink label="View All" href="..." variant="dark" />
        </div>
      ))}
    </div>
  </div>
</div>
```

### Mobile drawer pattern
```tsx
// Full-screen overlay drawer from left
<div className={`fixed inset-0 z-[100] bg-white flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
  {/* Header row: logo + flag + search + × close */}
  <div className="flex items-center justify-between px-4 h-20">...</div>
  {/* Green separator */}
  <div className="h-[3px] bg-[#17e88f]" />
  {/* Scrollable nav list */}
  <nav className="flex-1 overflow-y-auto">
    {/* Accordion: tap to expand, ChevronDown rotates */}
    <button onClick={() => toggle(item.label)} className="w-full flex items-center justify-between px-4 py-5">
      {item.label}
      <ChevronDownIcon open={expanded === item.label} />
    </button>
    {expanded === item.label && (
      <div className="bg-[#f5f5f5] px-4 pb-6">
        {/* Section title with green underline */}
        <h2 className="font-financier text-[#003f2d] border-b-2 border-[#17e88f]">...</h2>
        {/* Columns stacked, items with border-b + ChevronRight */}
      </div>
    )}
  </nav>
</div>
```

---

## Step 9b — Inner Page Hero Layout Patterns

For inner pages (e.g. /services, /about), the hero has a **different structure** from the home page hero:

### Inner page hero: 50/50 text row + full-width image
```tsx
<section className="w-full bg-white">
  {/* Text row — NO max-w-[1440px], use full-width px-4 md:px-14 to align with header logo */}
  <div className="w-full px-4 md:px-14 pt-10 pb-8 md:pt-12 md:pb-10">
    <div className="flex flex-col lg:flex-row lg:items-start">
      {/* Left: title — flex-1 so it shares space equally */}
      <h1 className="font-financier text-[#003f2d] text-[40px] md:text-[54px] lg:text-[64px] flex-1 lg:pr-20"
          style={{ lineHeight: '72px' }}>
        {fields.title.value}
      </h1>
      {/* Right: description — flex-1, no max-w constraint */}
      <p className="font-calibre text-[#435254] mt-4 lg:mt-4 flex-1"
         style={{ fontSize: '24px', lineHeight: '34px', fontWeight: 600 }}>
        {fields.description.value}
      </p>
    </div>
  </div>

  {/* Image: left padding only, right edge is full bleed to viewport */}
  <div className="w-full pl-4 md:pl-14 aspect-video lg:aspect-auto lg:h-[460px] overflow-hidden">
    <img src={fields.image.value.src} alt={fields.image.value.alt}
         className="w-full h-full object-cover"
         fetchPriority="high" loading="eager" decoding="sync" />
  </div>
</section>
```

**Key rules:**
- Text wrapper: `w-full px-4 md:px-14` (NO `max-w-[1440px] mx-auto`) — prevents misalignment at wide viewports
- Both title and description get `flex-1` — equal 50/50 split
- Image uses `pl-4 md:pl-14` (left padding only) — right edge is full bleed
- No background color on image container (transparent/white)
- No `onError` handlers on images — download the asset correctly instead

### Figma asset extraction workflow
When a Figma design references image assets that need to be included in the project:

1. Call `mcp__figma-desktop__get_design_context` on the node — look for image URLs in the response (format: `http://localhost:3845/assets/<hash>.png`)
2. Download with curl: `curl -o "public/assets/filename.png" "http://localhost:3845/assets/<hash>.png"`
3. Reference in component as `/assets/filename.png` (Vite serves `public/` at root)

---

## Step 9c — Image Performance Patterns

Always apply these attributes to ALL `<img>` tags:

### LCP image (hero / first visible image)
```tsx
<img
  src={...}
  alt={...}
  fetchPriority="high"   // tells browser to load this first
  loading="eager"        // do not defer
  decoding="sync"        // decode synchronously — unblocks LCP
/>
```

### Below-the-fold images (insight cards, newsletter, featured articles)
```tsx
<img
  src={...}
  alt={...}
  loading="lazy"         // browser defers until near viewport
  decoding="async"       // decode off main thread
/>
```

### Rules
- Hero image = `fetchPriority="high" loading="eager" decoding="sync"`
- Everything else = `loading="lazy" decoding="async"`
- A Lighthouse score of 86 on dev mode is expected — JS is unminified in `npm run dev`. Run `npm run build && npm run preview` for real scores (typically 90–95+)

---

## Step 9d — Component Reuse Patterns

### Reusable section with prop variants (e.g. OurCommitmentSection)
When a section needs to serve multiple pages with different grid sizes or optional headings:

```tsx
// Add a gridCols prop for layout flexibility
interface OurCommitmentSectionProps {
  fields?: OurCommitmentFields;
  gridCols?: 3 | 4;  // 4 for home page, 3 for services page
}

export default function OurCommitmentSection({ fields = defaultFields, gridCols = 4 }: OurCommitmentSectionProps) {
  const desktopColClass = gridCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <section className="w-full flex justify-center">
      <div className="w-full max-w-[1440px] px-4 md:px-14">
        {/* Conditional section heading — only rendered when value is non-empty */}
        {fields.sectionTitle.value && (
          <div className="mb-8 md:mb-10">
            <h2 className="font-financier text-[#003f2d] text-[40px] md:text-[52px] lg:text-[64px]"
                style={{ lineHeight: '1' }}>
              {fields.sectionTitle.value}
            </h2>
          </div>
        )}
        {/* Desktop grid — gridCols controls column count */}
        <div className={`hidden md:grid md:grid-cols-2 ${desktopColClass} gap-8 md:gap-6 lg:gap-4`}>
          ...
        </div>
      </div>
    </section>
  );
}
```

**Usage:**
```tsx
// Home page — 4 columns, heading shown
<OurCommitmentSection />  // uses defaults (4-col, "Our Commitment" heading)

// Services page — 3 columns, no heading, different card data
const serviceCardsFields = {
  sectionTitle: { value: '' },  // empty string = heading not rendered
  cards: [ ... ],
};
<OurCommitmentSection fields={serviceCardsFields} gridCols={3} />
```

### CommitmentCard flat structure (no h3 wrapper)
**CRITICAL**: Do NOT wrap the title in an `<h3>` or any block wrapper inside a `flex-col` card. Block elements cause unwanted indentation for sibling flex children.

```tsx
// WRONG — h3 as block element causes sibling indentation
function CommitmentCard({ card }) {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="h-px bg-[#cad1d3] w-full" />
      <h3>  {/* ← block element breaks flex alignment */}
        <a href={...}>{card.title.value}</a>
      </h3>
      <p className="pl-8">...</p>  {/* appears indented from h3 */}
    </div>
  );
}

// CORRECT — flat direct children in flex-col items-start
function CommitmentCard({ card }) {
  return (
    <div className="flex flex-col items-start gap-5 pb-8">
      <div className="h-px bg-[#cad1d3] w-full" />
      <a href={card.ctaLink.value.href}
         className="font-financier text-[#003f2d] underline decoration-transparent hover:decoration-[#003f2d] transition-[text-decoration-color] duration-500 ease-in-out"
         style={{ fontSize: '32px', lineHeight: '36px' }}>
        {card.title.value}
      </a>
      <p className="font-calibre text-[#435254] pl-8"
         style={{ fontSize: '22px', lineHeight: '30px', fontWeight: 400 }}>
        {card.description.value}
      </p>
      <div className="pl-8">
        <CTALink label={card.ctaLabel.value} href={card.ctaLink.value.href} variant="dark" />
      </div>
    </div>
  );
}
```

**Card layout rules:**
- `flex-col items-start gap-5 pb-8` on the card container
- `w-full` on the top border div (ensures full width)
- `pl-8` on description `<p>` and CTA wrapper `<div>` for indented alignment
- Title is a plain `<a>` (not h3) — the link IS the semantic title

---

## Step 10 — Write the Component

After extracting all values:

1. Match **exact** px values from Figma (font-size, line-height, spacing, widths)
2. Use `style={{ fontSize: '32px', lineHeight: '36px' }}` for Figma-specific sizes not in Tailwind scale
3. Use Tailwind utilities for colors, flex, grid, gap
4. Keep Sitecore field structure with typed `defaultFields`
5. **Always build responsive** — mobile-first with `md:` and `lg:` overrides
6. **Optional field type safety:** Any field typed as `LinkField | undefined` (i.e. declared with `?:`) cannot be passed directly to `<Link field={...}>` — the prop requires a non-nullable type. Always guard: `{field && <Link field={field} ... />}`. Same rule applies to any optional Sitecore field component. Missing this causes a `Type 'X | undefined' is not assignable` TypeScript build error on the hosted deployment even though `npm run dev` passes.
6. Add JSDoc comment at top:
```tsx
/**
 * ComponentName — Section/Atom/Layout Component
 * Sitecore fields: FieldsInterface (field1, field2, ...)
 * Figma node: 1:XXX — element.class-name
 * Brief description of the component
 */
```

---

## Step 11 — Verify Against Screenshot

After writing the code, visually compare against the Figma screenshot:
- [ ] Background color matches
- [ ] Font family correct (Financier vs Calibre)
- [ ] Font size and line-height correct
- [ ] Font weight correct (400 vs 450 vs 500)
- [ ] Colors match exactly (use hex from token table)
- [ ] Spacing/padding/gaps match
- [ ] Hover states are smooth (duration-500)
- [ ] CTA uses correct atom (CTALink vs plain link vs Button)
- [ ] Top border/rule color correct (`#cad1d3` grey, NOT `#003f2d` green, for card rules)
- [ ] Title underlines are hover-only (`decoration-transparent` by default) unless Figma shows always-underlined
- [ ] Fixed heights are `lg:` only — not applied on mobile
- [ ] BannerStrip negative margin is `md:` only — no overlap on mobile
- [ ] Multi-up grids collapse to 1-col on mobile (or carousel if Figma shows it)
- [ ] Page gutter is `px-4 md:px-14` — not `px-14` alone
- [ ] Header: nav uses `ml-auto` not `flex-1`; no chevron arrows on nav items
- [ ] Header: active nav indicator is `left-0 right-0` full-width green bar
- [ ] Header: mega-menu "View All" uses `<CTALink>`, not plain `<a>`
- [ ] Header: column headings use `border-[#cad1d3]` (gray), not dark green border
- [ ] Header: uses `headerMode` from page-level Sitecore field (dark, light, transparent-dark, transparent-light)
- [ ] Header: `transparent-dark` = dark text/logo on transparent bg; `transparent-light` = white text/logo on transparent bg
- [ ] Header: transparent modes switch to white bg on scroll or mega-menu open
- [ ] Header: uses `fixed` with scroll-direction hide/show (`translate-y-0` / `-translate-y-full`)
- [ ] Header: editing mode — transparent modes use `absolute` (not fixed, no scroll), same bgClass as normal
- [ ] Header: editing mode — non-transparent modes use `relative`
- [ ] Header: stays visible when mega-menu or mobile drawer is open
- [ ] Header: bottom border only on `hasMegaMenu`, not always visible
- [ ] Hero image has `fetchPriority="high" loading="eager" decoding="sync"`
- [ ] All below-fold images have `loading="lazy" decoding="async"`
- [ ] Inner page hero text wrapper uses `w-full px-4 md:px-14` (no `max-w-[1440px] mx-auto`)
- [ ] Inner page hero image uses `pl-4 md:pl-14` (left padding only, right edge full bleed)
- [ ] Card flex containers use `flex-col items-start` with flat direct children (no block wrappers like `<h3>`)
- [ ] Reusable sections use `gridCols` prop and conditional heading when serving multiple pages
- [ ] Image assets downloaded from Figma MCP localhost:3845 to `public/assets/`, referenced as `/assets/`

- [ ] Editing mode: ContentSdkImage wrapper spans forced to fill container with `[&_span]` CSS overrides
- [ ] Editing mode: carousel shows dots as clickable buttons to switch slides (no auto-animation)
- [ ] Editing mode: header transparent modes use `absolute` with same `style.bgClass` (not solid green override)
- [ ] Responsive: fixed column widths that total > 1024px use `lg:flex-1` instead of fixed `lg:w-[Xpx]`
- [ ] Responsive: use `xl:` breakpoint for widths only valid at 1280px+ (e.g. `lg:w-[50%] xl:w-[689px]`)
- [ ] Responsive: `lg:min-h-[Xpx]` instead of `lg:h-[Xpx]` for containers with variable text content

- [ ] **TypeScript optional field guards:** Every `field?:` prop passed to a Sitecore field component (`<Link>`, `<Text>`, `<RichText>`, `<ContentSdkImage>`) is wrapped in a null guard — `{field && <Link field={field} />}` — never passed as `LinkField | undefined` directly

If anything differs, fix it before finishing.

---

## Step 11b — ContentSdkImage CSS Override Pattern for Editing Mode

Sitecore wraps `ContentSdkImage` output in `<span>` elements with inline styles. These break absolute-positioned image fills. Use CSS selector overrides on the parent container:

```tsx
<div className="relative overflow-hidden [&_img]:!absolute [&_img]:!inset-0 [&_img]:!w-full [&_img]:!h-full [&_img]:!object-cover [&_span]:!block [&_span]:!absolute [&_span]:!inset-0 [&_span]:!w-full [&_span]:!h-full">
  <ContentSdkImage field={image} />
</div>
```

**Key rules:**
- Use `[&_span]` (all descendants) NOT `[&>span]` (direct child only) — Sitecore nests multiple span wrappers
- Use `!` (important) prefix to beat Sitecore's inline styles
- Parent needs `relative` for absolute positioning

---

## Step 11c — Responsive Width Overflow Prevention

At 1024px (`lg:`), fixed-width columns totalling > ~900px overflow. Use flexible widths at `lg:` and fixed at `xl:`:

```tsx
// ❌ Overflows at 1024px
<div className="lg:w-[168px]"> + <div className="lg:w-[422px]"> + <div className="lg:w-[300px]">

// ✅ Flexible at 1024px, fixed at 1280px+
<div className="lg:w-[60px] xl:w-[168px]">
<div className="lg:flex-1">
<div className="lg:flex-1">
```

---

## Step 11d — Figma API Fallback (When MCP is Unavailable)

When the Figma MCP tools aren't loaded, use the REST API directly:

```bash
TOKEN=$(cat ~/.claude/settings.json | python3 -c "import sys,json; print(json.load(sys.stdin)['mcpServers']['figma']['env']['FIGMA_PERSONAL_ACCESS_TOKEN'])")
FILE_KEY="vgON6FcDj6vhMXQgiGol2i"  # from Figma URL

# Get node structure
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=51-427&depth=3"

# Get screenshot URL
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/images/$FILE_KEY?ids=51-427&format=png&scale=1"
# Download the URL, save to temp, view with Read tool

# Test token: curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/me"
# If 404 on file: token expired → ask user for new PAT → update ~/.claude/settings.json
```

---

## Step 12 — Sitecore Serialization: Multilist Parent-Child Pattern

When creating components that use a **Multilist field pointing to child items** (e.g. hero carousel slides, navigation links), follow this pattern for Sitecore YAML artifacts and serialization push.

### Template Structure
```
CBREParentSection (template)
  └── CBREParentSection (section folder)
        └── slides (Multilist field)
              Source: "query:./child::*[@@templateid='{CHILD_TEMPLATE_ID}']"

CBREChildItem (template)
  └── CBREChildItem (section folder)
        ├── title (Single-Line Text)
        ├── description (Multi-Line Text)
        ├── image (Image)
        └── ctaLink (General Link)
```

### Datasource Item Structure
```
/sitecore/content/.../Data/CBREParentSection     ← parent datasource (template: CBREParentSection)
  ├── Slide 1                                     ← child item (template: CBREChildItem)
  ├── Slide 2                                     ← child item
  └── Slide 3                                     ← child item
```

The parent's `slides` Multilist field value references child GUIDs:
```yaml
- ID: "field-id-here"
  Hint: slides
  Value: |
    {CHILD-1-GUID}
    {CHILD-2-GUID}
    {CHILD-3-GUID}
```

### CRITICAL: Two-Step Push for New Multilist Structures

When creating parent + child items in the same session via `dotnet sitecore ser push`, Sitecore processes them in batch. If the parent's multilist value references child GUIDs that don't yet exist, Sitecore shows **"[Not in the selection List]"** error in Content Editor.

**Fix — always use a two-step push:**

1. **Step 1**: Set multilist value to `""` (empty string) in the parent YAML, then push. This creates the parent and all child items without references.
2. **Step 2**: Restore the multilist value with child GUIDs (braces format), then push again. Now child items exist, so references resolve correctly.

```yaml
# Step 1 — push with empty value first
- ID: "3835536b-ea0d-469f-bb16-46eb6d31ce11"
  Hint: slides
  Value: ""

# Step 2 — restore and push again
- ID: "3835536b-ea0d-469f-bb16-46eb6d31ce11"
  Hint: slides
  Value: |
    {6B6A2B36-A4CB-4FC6-A9D1-CFACDAFCB494}
    {397195E9-9215-4235-AF63-EA4D3DB27677}
    {020F9A9B-5C0D-46EB-A23F-6F5C769134B3}
```

### Multilist GUID Format
- Always use **braces format**: `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`
- One GUID per line in YAML `|` (literal block) format
- Uppercase GUIDs in braces (Sitecore normalizes case, but braces are required)

### Multilist Source Query
For child-item multilists, use relative XPath:
```
query:./child::*[@@templateid='{TEMPLATE_ID}']
```
This queries children of the current datasource item matching the specified template. The `./` prefix means "relative to the current item" — so the child items must be direct children of the datasource item in the content tree.

---

## Step 13 — Sitecore XM Cloud Login & Serialization Commands

### CM Instance
- **URL:** `https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io/`
- **Content Editor:** Append `/sitecore` to CM URL to access Content Editor

### Authentication
All commands must be run from the **repo root** (`Sitecore AI/`).

**Step 1 — Cloud login (refreshes OAuth token):**
```bash
dotnet sitecore cloud login
```
This opens a browser for interactive OAuth. Required when tokens expire (you'll see "Forbidden" or 401 errors).

**Step 2 — CM login (connects CLI to CM instance):**
```bash
dotnet sitecore login --authority https://auth.sitecorecloud.io --cm https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io --allow-write true
```

### Serialization Push/Pull
- **Environment name:** `dev`
- **Push local YAML → Sitecore:** `dotnet sitecore ser push -n dev`
- **Pull Sitecore → local YAML:** `dotnet sitecore ser pull -n dev`

### Common Issues
| Symptom | Fix |
|---|---|
| "Forbidden" or 401 on ser push | Run `dotnet sitecore cloud login` first, then retry |
| "0 changes" on ser push | YAML matches Sitecore state; no action needed |
| Token expired mid-session | Run `dotnet sitecore cloud login` → `dotnet sitecore login ...` → retry push |
| Wrong directory error | Must run from repo root where `.sitecore/` folder exists |

### Serialization Module Config
Serialization paths are defined in `authoring/items/items/templates/ccl.module.json`. Key includes:
- `ccl.templates` — Template definitions
- `ccl.renderings` — Rendering definitions
- `ccl.content.cbre.home` — Home page content/datasource items
- `ccl.content.cbre.renderings` — Available Renderings configuration
