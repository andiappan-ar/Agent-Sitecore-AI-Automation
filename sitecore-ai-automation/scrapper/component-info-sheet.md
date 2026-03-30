# Web Component Taxonomy & Extraction Specification

> **Purpose:** Universal reference for scraping, classifying, and reconstructing any website into design tokens, Tailwind utility classes, and pixel-perfect component structures.
>
> **Version:** 1.0.0
> **Scope:** All semantic HTML patterns, visual variations, responsive behaviors, and interactive states found across modern websites.

---

## Table of Contents

1. [Global Layout Primitives](#1-global-layout-primitives)
2. [Design Tokens (Extractable)](#2-design-tokens-extractable)
3. [Typography System](#3-typography-system)
4. [Header / Navigation](#4-header--navigation)
5. [Hero Section](#5-hero-section)
6. [Content Sections](#6-content-sections)
7. [Cards](#7-cards)
8. [Forms](#8-forms)
9. [Buttons & CTAs](#9-buttons--ctas)
10. [Media Components](#10-media-components)
11. [Lists & Data Display](#11-lists--data-display)
12. [Tables](#12-tables)
13. [Modals & Overlays](#13-modals--overlays)
14. [Accordions & Collapsibles](#14-accordions--collapsibles)
15. [Tabs](#15-tabs)
16. [Carousels & Sliders](#16-carousels--sliders)
17. [Footer](#17-footer)
18. [Sidebar & Drawer Navigation](#18-sidebar--drawer-navigation)
19. [Breadcrumbs & Pagination](#19-breadcrumbs--pagination)
20. [Testimonials & Reviews](#20-testimonials--reviews)
21. [Pricing Tables](#21-pricing-tables)
22. [Timeline & Stepper](#22-timeline--stepper)
23. [Notification & Alert Components](#23-notification--alert-components)
24. [Tooltips & Popovers](#24-tooltips--popovers)
25. [Badges, Tags & Chips](#25-badges-tags--chips)
26. [Avatar & User Indicators](#26-avatar--user-indicators)
27. [Progress & Loading Indicators](#27-progress--loading-indicators)
28. [Dividers & Decorative Elements](#28-dividers--decorative-elements)
29. [Sticky / Fixed / Floating Elements](#29-sticky--fixed--floating-elements)
30. [Animation & Transition Metadata](#30-animation--transition-metadata)
31. [Accessibility Metadata](#31-accessibility-metadata)
32. [Responsive Behavior Matrix](#32-responsive-behavior-matrix)

---

## 1. Global Layout Primitives

### 1.1 Container

The outermost horizontal constraint wrapper. Every page uses one or more container strategies.

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `type` | `fixed` · `fluid` · `breakpoint-fluid` (fluid until max-width, then centered) | `container` · `w-full` · `container mx-auto` |
| `max-width` | Exact `px` value per breakpoint | `max-w-screen-sm` / `max-w-screen-md` / `max-w-screen-lg` / `max-w-screen-xl` / `max-w-screen-2xl` / `max-w-[custom]` |
| `padding-x` | Per-breakpoint horizontal padding | `px-4` / `px-6` / `px-8` / `sm:px-6` / `lg:px-8` |
| `padding-y` | Per-breakpoint vertical padding | `py-4` / `py-8` / `lg:py-12` |
| `centering` | `margin: 0 auto` · `flexbox` · `grid` | `mx-auto` |
| `nesting` | Can a container appear inside another container? | Boolean flag |

**Variations:**
- **Full-bleed container:** `width: 100vw; margin-left: calc(-50vw + 50%);` — content breaks out of parent container
- **Narrow container:** A content-width constraint inside a wider container (e.g., blog post body `max-w-prose` / `max-w-2xl` inside a `max-w-7xl` page container)
- **Asymmetric container:** Left-aligned with right bleed, or vice versa — common in modern editorial layouts

### 1.2 Grid System

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `type` | `css-grid` · `flexbox` · `float` (legacy) · `table` (legacy) | `grid` · `flex` · `float-left` |
| `columns` | Number of columns per breakpoint | `grid-cols-1` / `sm:grid-cols-2` / `md:grid-cols-3` / `lg:grid-cols-4` |
| `gap` | Row gap and column gap (can differ) | `gap-4` / `gap-x-6 gap-y-4` |
| `column-span` | Individual item spanning | `col-span-2` / `col-span-full` |
| `row-span` | Individual item spanning | `row-span-2` |
| `template-rows` | Explicit row sizing | `grid-rows-[auto_1fr_auto]` |
| `template-columns` | Explicit column sizing | `grid-cols-[1fr_2fr]` / `grid-cols-[250px_1fr]` |
| `auto-flow` | `row` · `column` · `dense` | `grid-flow-row` / `grid-flow-col` / `grid-flow-dense` |
| `align-items` | `start` · `center` · `end` · `stretch` · `baseline` | `items-start` / `items-center` / `items-end` / `items-stretch` |
| `justify-items` | Same as align-items | `justify-items-start` / `justify-items-center` |
| `place-items` | Shorthand for both | `place-items-center` |

### 1.3 Flexbox Layout

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `direction` | `row` · `row-reverse` · `column` · `column-reverse` | `flex-row` / `flex-row-reverse` / `flex-col` / `flex-col-reverse` |
| `wrap` | `nowrap` · `wrap` · `wrap-reverse` | `flex-nowrap` / `flex-wrap` / `flex-wrap-reverse` |
| `justify-content` | `start` · `end` · `center` · `between` · `around` · `evenly` | `justify-start` / `justify-center` / `justify-between` / `justify-around` / `justify-evenly` |
| `align-items` | `start` · `end` · `center` · `stretch` · `baseline` | `items-start` / `items-center` / `items-end` / `items-stretch` / `items-baseline` |
| `align-content` | Multi-line alignment | `content-start` / `content-center` / `content-between` |
| `gap` | Flex gap (modern) | `gap-4` / `gap-x-6 gap-y-4` |
| `flex-grow` | Per-child growth factor | `grow` / `grow-0` |
| `flex-shrink` | Per-child shrink factor | `shrink` / `shrink-0` |
| `flex-basis` | Per-child initial size | `basis-1/2` / `basis-full` / `basis-[200px]` |
| `order` | Visual reordering | `order-1` / `order-first` / `order-last` / `order-none` |

### 1.4 Section / Block Wrapper

Sections are the vertical rhythm units of a page. Every distinct content block is wrapped in a section.

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `semantic-tag` | `<section>` · `<article>` · `<aside>` · `<main>` · `<div>` | Metadata only |
| `padding-y` | Top and bottom padding per breakpoint | `py-12` / `lg:py-24` |
| `padding-x` | Horizontal padding (if section itself has it vs inner container) | `px-4` / `lg:px-0` |
| `background-color` | Solid fill | `bg-white` / `bg-gray-50` / `bg-[#hex]` |
| `background-gradient` | Direction + stops | `bg-gradient-to-r from-blue-500 to-purple-600` |
| `background-image` | URL, size, position, repeat, attachment | `bg-[url('...')]` / `bg-cover` / `bg-center` / `bg-fixed` |
| `background-overlay` | Semi-transparent overlay on top of bg image | `relative` + `absolute inset-0 bg-black/50` |
| `border-top` | Separator line from previous section | `border-t border-gray-200` |
| `border-bottom` | Separator line from next section | `border-b border-gray-200` |
| `overflow` | `visible` · `hidden` · `clip` · `auto` | `overflow-hidden` / `overflow-visible` |
| `position` | `static` · `relative` (for child absolute positioning) | `relative` |
| `z-index` | Stacking context | `z-10` / `z-[value]` |
| `min-height` | Section minimum height | `min-h-screen` / `min-h-[500px]` |

---

## 2. Design Tokens (Extractable)

### 2.1 Color Palette

Extract every unique color used across the site and classify:

| Token Category | What to Extract | Example Values |
|---|---|---|
| `color.primary` | Main brand color + shades (50-950) | `#2563EB` → `blue-600` |
| `color.secondary` | Secondary brand color + shades | `#7C3AED` → `violet-600` |
| `color.accent` | Accent / highlight color | `#F59E0B` → `amber-500` |
| `color.neutral` | Gray scale used for text, borders, bg | Full 50-950 ramp |
| `color.success` | Positive feedback color | `#10B981` → `emerald-500` |
| `color.warning` | Warning feedback color | `#F59E0B` → `amber-500` |
| `color.error` | Error / destructive feedback color | `#EF4444` → `red-500` |
| `color.info` | Informational feedback color | `#3B82F6` → `blue-500` |
| `color.background.page` | Page-level background | `#FFFFFF` / `#0F172A` (dark) |
| `color.background.surface` | Card/panel surface | `#F8FAFC` / `#1E293B` (dark) |
| `color.background.elevated` | Elevated surface (dropdown, modal) | `#FFFFFF` / `#334155` (dark) |
| `color.text.primary` | Main body text | `#1E293B` / `#F1F5F9` (dark) |
| `color.text.secondary` | Muted / supporting text | `#64748B` / `#94A3B8` (dark) |
| `color.text.disabled` | Disabled state text | `#CBD5E1` / `#475569` (dark) |
| `color.text.inverse` | Text on dark/colored backgrounds | `#FFFFFF` |
| `color.text.link` | Hyperlink color | `#2563EB` |
| `color.text.link-hover` | Hyperlink hover color | `#1D4ED8` |
| `color.border.default` | Default border color | `#E2E8F0` / `#334155` (dark) |
| `color.border.focus` | Focus ring / border | `#3B82F6` |

**Dark Mode Detection:**
- Check for `prefers-color-scheme` media query in CSS
- Check for `.dark` / `[data-theme="dark"]` class-based toggling
- Extract the full alternate palette if present

### 2.2 Spacing Scale

| Token | How to Identify | Example |
|---|---|---|
| `spacing.base` | Most frequently recurring small spacing value | `4px` / `0.25rem` |
| `spacing.scale` | All unique spacing values used, sorted | `[0, 1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]` in `px` |
| `spacing.section-gap` | Vertical spacing between page sections | `64px` / `96px` / `128px` |
| `spacing.component-gap` | Spacing between components within a section | `16px` / `24px` / `32px` |
| `spacing.element-gap` | Spacing between elements within a component | `4px` / `8px` / `12px` |

### 2.3 Border Radius

| Token | Values | Tailwind |
|---|---|---|
| `radius.none` | `0px` | `rounded-none` |
| `radius.sm` | `2px` | `rounded-sm` |
| `radius.default` | `4px` / `6px` | `rounded` / `rounded-md` |
| `radius.lg` | `8px` | `rounded-lg` |
| `radius.xl` | `12px` | `rounded-xl` |
| `radius.2xl` | `16px` | `rounded-2xl` |
| `radius.full` | `9999px` | `rounded-full` |
| `radius.card` | Most common card border radius | Computed from scan |
| `radius.button` | Most common button border radius | Computed from scan |
| `radius.input` | Most common input border radius | Computed from scan |
| `radius.badge` | Most common badge border radius | Computed from scan |

### 2.4 Shadow Scale

| Token | CSS Value | Tailwind |
|---|---|---|
| `shadow.sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | `shadow-sm` |
| `shadow.default` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | `shadow` |
| `shadow.md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), ...` | `shadow-md` |
| `shadow.lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), ...` | `shadow-lg` |
| `shadow.xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), ...` | `shadow-xl` |
| `shadow.2xl` | `0 25px 50px -12px rgb(0 0 0 / 0.25)` | `shadow-2xl` |
| `shadow.inner` | `inset 0 2px 4px 0 rgb(0 0 0 / 0.05)` | `shadow-inner` |
| `shadow.card` | Most common card shadow | Computed from scan |
| `shadow.dropdown` | Dropdown/popover shadow | Computed from scan |
| `shadow.modal` | Modal shadow | Computed from scan |

### 2.5 Z-Index Scale

| Token | Typical Value | Usage |
|---|---|---|
| `z.base` | `0` | Default stacking |
| `z.dropdown` | `10` | Dropdowns |
| `z.sticky` | `20` | Sticky headers |
| `z.drawer` | `30` | Side drawers |
| `z.overlay` | `40` | Backdrop overlays |
| `z.modal` | `50` | Modals |
| `z.popover` | `60` | Popovers, tooltips |
| `z.toast` | `70` | Toast notifications |
| `z.max` | `9999` | Absolute top layer |

### 2.6 Breakpoints

| Token | Default Value | Common Custom Values |
|---|---|---|
| `breakpoint.sm` | `640px` | `576px` (Bootstrap) |
| `breakpoint.md` | `768px` | `768px` |
| `breakpoint.lg` | `1024px` | `992px` (Bootstrap) |
| `breakpoint.xl` | `1280px` | `1200px` (Bootstrap) |
| `breakpoint.2xl` | `1536px` | `1400px` (Bootstrap) |

---

## 3. Typography System

### 3.1 Font Families

| Token | What to Extract | Example |
|---|---|---|
| `font.family.heading` | Font family for headings | `'Inter', sans-serif` |
| `font.family.body` | Font family for body text | `'Inter', sans-serif` |
| `font.family.mono` | Font family for code/mono | `'JetBrains Mono', monospace` |
| `font.family.display` | Display/hero font (if different from heading) | `'Playfair Display', serif` |
| `font.source` | `google-fonts` · `adobe-fonts` · `self-hosted` · `system` | Metadata |
| `font.weights-used` | All font weights loaded | `[300, 400, 500, 600, 700]` |
| `font.formats` | `woff2` · `woff` · `ttf` · `otf` | Metadata |

### 3.2 Type Scale

Extract every heading and body text style:

| Element | Properties to Extract | Tailwind Mapping |
|---|---|---|
| `h1` | `font-size`, `line-height`, `font-weight`, `letter-spacing`, `color`, `margin-bottom`, `text-transform` | `text-4xl` / `text-5xl` / `text-[custom]` + `font-bold` + `leading-tight` + `tracking-tight` |
| `h2` | Same | `text-3xl` / `text-4xl` + `font-bold` + `leading-tight` |
| `h3` | Same | `text-2xl` / `text-3xl` + `font-semibold` |
| `h4` | Same | `text-xl` / `text-2xl` + `font-semibold` |
| `h5` | Same | `text-lg` / `text-xl` + `font-medium` |
| `h6` | Same | `text-base` / `text-lg` + `font-medium` |
| `body-lg` | Large body text | `text-lg` + `leading-relaxed` |
| `body` | Default body text | `text-base` + `leading-normal` |
| `body-sm` | Small body text | `text-sm` + `leading-normal` |
| `caption` | Caption / helper text | `text-xs` + `leading-normal` |
| `overline` | Overline / kicker text | `text-xs` + `uppercase` + `tracking-widest` + `font-semibold` |
| `blockquote` | Pull quotes | `text-xl` + `italic` + `border-l-4` |

**Per-breakpoint overrides:** Every text style must be extracted per breakpoint. Headings commonly scale down significantly on mobile.

| Breakpoint | h1 Example | h2 Example |
|---|---|---|
| `mobile` (< 640px) | `text-3xl` / `text-2xl` | `text-2xl` / `text-xl` |
| `tablet` (640-1024px) | `text-4xl` / `text-3xl` | `text-3xl` / `text-2xl` |
| `desktop` (> 1024px) | `text-5xl` / `text-6xl` | `text-4xl` / `text-3xl` |

### 3.3 Text Decoration & Effects

| Property | Values | Tailwind |
|---|---|---|
| `text-decoration` | `none` · `underline` · `line-through` · `overline` | `no-underline` / `underline` / `line-through` |
| `underline-offset` | Offset from baseline | `underline-offset-2` / `underline-offset-4` |
| `decoration-style` | `solid` · `dashed` · `dotted` · `double` · `wavy` | `decoration-solid` / `decoration-wavy` |
| `decoration-thickness` | Thickness | `decoration-1` / `decoration-2` |
| `text-shadow` | Shadow values | Custom CSS |
| `text-gradient` | Gradient text fill | `bg-gradient-to-r from-X to-Y bg-clip-text text-transparent` |
| `text-truncation` | `ellipsis` · `clamp` (multi-line) | `truncate` / `line-clamp-2` / `line-clamp-3` |
| `text-wrap` | `balance` · `pretty` | `text-balance` / `text-pretty` |

---

## 4. Header / Navigation

### 4.1 Header Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Top Bar / Utility Nav]  (optional)                             │
├─────────────────────────────────────────────────────────────────┤
│ [Logo]  [Primary Nav Links]  [Search] [CTA] [Lang] [Auth]      │
│         ├── Link 1                                              │
│         ├── Link 2 → [Mega Menu / Dropdown]                     │
│         ├── Link 3 → [Dropdown]                                 │
│         └── Link 4                                              │
├─────────────────────────────────────────────────────────────────┤
│ [Secondary Nav / Breadcrumb]  (optional)                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Header Properties

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `position` | `static` · `sticky` · `fixed` · `absolute` (overlaying hero) | `static` / `sticky top-0` / `fixed top-0 inset-x-0` / `absolute top-0 inset-x-0` |
| `background` | `solid` · `transparent` (over hero) · `blur/glass` · `gradient` | `bg-white` / `bg-transparent` / `bg-white/80 backdrop-blur-md` |
| `background-on-scroll` | Background that changes after scroll threshold | Dynamic class toggle |
| `height` | Per breakpoint | `h-16` / `h-20` / `lg:h-24` |
| `height-scrolled` | Reduced height after scroll | `h-14` / `h-16` |
| `shadow` | `none` · on-scroll shadow | `shadow-none` → `shadow-md` (scroll) |
| `border-bottom` | Separator line | `border-b border-gray-200` |
| `z-index` | Stacking priority | `z-50` |
| `width` | `full-width` · `contained` | `w-full` / `max-w-7xl mx-auto` |
| `theme` | `light` · `dark` · `transparent-light` · `transparent-dark` | Color scheme metadata |
| `transition` | Transition for scroll-triggered changes | `transition-all duration-300` |

### 4.3 Logo

| Property | Values to Extract |
|---|---|
| `type` | `image` (png/svg) · `text` · `image+text` · `svg-inline` |
| `width` | Fixed width per breakpoint |
| `height` | Fixed height per breakpoint |
| `alt-version` | Different logo for scrolled state / dark mode / mobile |
| `link` | Always links to homepage (`/`) |
| `position` | `left` · `center` · `right` |
| `spacing` | Margin/padding around logo |

### 4.4 Primary Navigation Links

| Property | Values to Extract |
|---|---|
| `layout` | `horizontal` · `vertical` (mobile) |
| `alignment` | `left` · `center` · `right` · `space-between` |
| `item-spacing` | Gap between nav items |
| `font-size` | Nav link font size |
| `font-weight` | Nav link weight (normal → hover) |
| `text-transform` | `none` · `uppercase` · `capitalize` |
| `letter-spacing` | Tracking |
| `color.default` | Default link color |
| `color.hover` | Hover link color |
| `color.active` | Active/current page color |
| `hover-indicator` | `underline` · `background-fill` · `border-bottom` · `color-change` · `scale` · `dot-indicator` |
| `hover-indicator-style` | Indicator thickness, offset, color, animation |
| `active-indicator` | How the current page is marked |
| `transition` | Hover transition properties |

### 4.5 Dropdown / Mega Menu

**⚠️ MANDATORY EXTRACTION RULE:**
Mega-menu dropdown content is hidden by default (opacity:0, display:none). During extraction, you MUST:
1. **Hover each top-level nav item** to reveal the dropdown
2. **Capture the FULL expanded DOM tree** — not just links, but headings, descriptions, featured cards, images
3. **Store as structured data** per nav item: `{ navItem, sections: [{ heading, links: [{ text, href, description, icon }], featured: { image, title, cta } }] }`
4. **Screenshot each dropdown** in its open state for visual reference
5. **Never reconstruct from sitemap alone** — sitemap gives flat URLs, not the visual structure (column groupings, section headings, featured content)

**Content types commonly found in mega-menus:**
- Section headings (bold text grouping links)
- Sub-links with optional descriptions
- Featured card (image + title + CTA button)
- Icon + link combinations
- "View All" link at bottom of each group
- Promotional banner or highlight section

| Property | Values to Extract |
|---|---|
| `trigger` | `hover` · `click` · `hover-with-delay` |
| `type` | `simple-dropdown` · `mega-menu` · `flyout` (nested sideways) |
| `width` | `auto` · `match-parent` · `full-width` · `fixed-px` |
| `columns` | Number of columns in mega menu |
| `content-types` | `links-only` · `links+descriptions` · `links+icons` · `links+images` · `featured-card` · `mixed` |
| `background` | Dropdown background color |
| `shadow` | Dropdown shadow |
| `border-radius` | Dropdown corners |
| `border` | Dropdown border |
| `padding` | Internal padding |
| `offset-y` | Vertical gap from trigger |
| `animation-in` | `fade` · `slide-down` · `scale` · `none` |
| `animation-out` | Same as above |
| `animation-duration` | Duration in ms |
| `close-on` | `click-outside` · `escape` · `mouse-leave` · `mouse-leave-with-delay` |
| `separator` | Divider between groups |
| `group-heading` | Styled heading within dropdown |
| `nested-level` | Max nesting depth (1, 2, 3+) |
| `arrow/caret` | Visual indicator pointing to trigger |

**Mega Menu Sub-Structures:**

```
┌──────────────────────────────────────────────────────────┐
│  [Group 1 Heading]    [Group 2 Heading]    [Featured]    │
│  ├── Link             ├── Link             ┌──────────┐  │
│  ├── Link             ├── Link             │  Image   │  │
│  ├── Link             ├── Link             │  Card    │  │
│  └── Link             └── Link             │  CTA     │  │
│                                            └──────────┘  │
│  [View All →]                                            │
└──────────────────────────────────────────────────────────┘
```

### 4.6 Mobile Navigation

| Property | Values to Extract |
|---|---|
| `trigger-icon` | `hamburger` (3 lines) · `dots` · `custom` |
| `trigger-animation` | `none` · `morph-to-x` · `morph-to-arrow` · `rotate` |
| `type` | `drawer-left` · `drawer-right` · `fullscreen-overlay` · `dropdown-panel` · `bottom-sheet` |
| `background` | Mobile nav background |
| `overlay` | Backdrop overlay behind drawer |
| `width` | Drawer width (if drawer type) |
| `animation` | `slide-in` · `fade` · `push-content` |
| `close-button` | Position and style of close button |
| `nested-items` | `accordion` (expand inline) · `slide-panel` (push to next view) · `indent` |
| `item-height` | Tappable area height (min 44px for a11y) |
| `item-separator` | Dividers between items |
| `footer-content` | CTA buttons, social links, language selector at bottom |
| `body-scroll-lock` | Whether page scroll is locked when open |

### 4.7 Utility / Top Bar

| Property | Values to Extract |
|---|---|
| `visible` | Boolean — does the site have a top bar? |
| `height` | Height of top bar |
| `background` | Usually darker/contrasting |
| `content` | `phone` · `email` · `address` · `social-links` · `language-selector` · `login/register` · `promo-banner` |
| `dismiss` | Can the top bar be dismissed (close button)? |
| `hide-on-scroll` | Does it hide on scroll? |
| `hide-on-mobile` | Does it hide on mobile? |

### 4.8 Header Scroll Behaviors (State Machine)

```
State: INITIAL (top of page)
  ├── background: transparent / solid
  ├── height: full height
  ├── logo: full-size / light variant
  ├── nav-color: light / dark
  └── shadow: none

State: SCROLLED (past threshold, e.g., 100px)
  ├── background: solid / glass-blur
  ├── height: reduced
  ├── logo: compact / dark variant
  ├── nav-color: dark
  └── shadow: shadow-md

State: SCROLL-UP (scrolling up after being scrolled)
  ├── visibility: show (slide-down animation)
  └── Same as SCROLLED

State: SCROLL-DOWN (scrolling down past header)
  ├── visibility: hide (slide-up animation) — "auto-hide header"
  └── Only for some implementations
```

---

## 5. Hero Section

### 5.1 Hero Variations

| Variant ID | Description | Layout |
|---|---|---|
| `hero-fullscreen` | Full viewport height hero | `min-h-screen` |
| `hero-split` | Content on one side, image on other | `grid grid-cols-2` |
| `hero-centered` | Centered text over image/color/video | Text centered over full-width bg |
| `hero-carousel` | Multiple slides auto/manual rotating | Swiper/carousel wrapper |
| `hero-video` | Background video with content overlay | `<video>` bg + text overlay |
| `hero-parallax` | Background scrolls at different rate | `background-attachment: fixed` or JS |
| `hero-animated` | Animated elements (Lottie, GSAP, CSS) | Animation metadata |
| `hero-minimal` | Simple text + CTA, no image | Clean content block |
| `hero-asymmetric` | Image breaks grid, overlaps sections | Absolute positioned elements |
| `hero-stacked` | Image on top, content below (mobile-first) | `flex-col` → `lg:flex-row` |

### 5.2 Hero Properties

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `height` | `screen` · `75vh` · `50vh` · `auto` · `fixed-px` | `min-h-screen` / `min-h-[75vh]` / `min-h-[500px]` |
| `height-mobile` | Mobile height (often shorter) | `min-h-[60vh]` / `min-h-[400px]` |
| `background-type` | `color` · `gradient` · `image` · `video` · `pattern` · `none` | Varies |
| `background-image.src` | Image URL | `bg-[url('...')]` |
| `background-image.position` | `center` · `top` · `bottom` · `left` · `right` | `bg-center` / `bg-top` / `bg-right` |
| `background-image.size` | `cover` · `contain` · `auto` | `bg-cover` / `bg-contain` |
| `background-image.mobile-position` | May differ on mobile | `bg-center` → `sm:bg-right` |
| `background-image.mobile-visibility` | `visible` · `hidden` · `replaced-with-color` | `hidden sm:block` |
| `background-overlay` | Color overlay with opacity | `bg-black/40` / `bg-gradient-to-r from-black/60 to-transparent` |
| `background-overlay-direction` | Gradient overlay direction | `to-r` · `to-t` · `to-b` · `to-br` |
| `content-position` | `left` · `center` · `right` · `bottom-left` · `bottom-center` | Flex/grid alignment classes |
| `content-alignment` | `text-left` · `text-center` · `text-right` | `text-left` / `text-center` |
| `content-max-width` | Max width of text content | `max-w-xl` / `max-w-2xl` / `max-w-3xl` |
| `content-vertical-align` | `top` · `center` · `bottom` | `items-start` / `items-center` / `items-end` |
| `content-padding` | Padding around content area | `p-8` / `lg:p-16` |

### 5.3 Hero Content Elements

| Element | Properties to Extract |
|---|---|
| `kicker / overline` | Small text above heading — font-size, color, text-transform, letter-spacing, icon/badge |
| `heading` | Main heading — font-size per breakpoint, font-weight, color, line-height, max-width |
| `subheading` | Secondary heading — same as heading properties |
| `description` | Body text — font-size, color, max-width, line-height |
| `cta-primary` | Primary button — see Button component spec |
| `cta-secondary` | Secondary button — see Button component spec |
| `cta-layout` | `inline` (side by side) · `stacked` (vertical) · `inline-mobile-stacked` |
| `cta-alignment` | `left` · `center` · `right` — follows content-alignment |
| `image` | Hero image (if split layout) — aspect ratio, object-fit, object-position, border-radius |
| `image-position` | `left` · `right` — which side in split layout |
| `image-mobile-position` | `above` · `below` · `hidden` · `background` |
| `image-overlap` | Does image overlap section boundaries? Offset values |
| `badge / trust-indicators` | Rating stars, client logos, "As seen in" badges |
| `scroll-indicator` | Animated down-arrow / "Scroll" text at bottom |
| `breadcrumb` | Breadcrumb trail in hero (common on inner pages) |

### 5.4 Hero Carousel Specifics

| Property | Values to Extract |
|---|---|
| `slide-count` | Number of slides |
| `autoplay` | `true` · `false` |
| `autoplay-delay` | Duration per slide (ms) |
| `pause-on-hover` | Boolean |
| `transition-type` | `slide` · `fade` · `zoom` · `flip` · `creative` |
| `transition-duration` | Animation duration (ms) |
| `navigation` | `arrows` · `dots` · `thumbnails` · `fraction` · `progress-bar` · `none` |
| `arrow-style` | Size, color, position (inside/outside), shape |
| `dot-style` | Size, color, active style, position (bottom, side) |
| `loop` | `true` · `false` |
| `slides-per-view` | Usually `1` for hero, can be partial |
| `touch-enabled` | Swipe on mobile |
| `keyboard-enabled` | Arrow key navigation |

---

## 6. Content Sections

### 6.1 Feature Grid / Icon Block Section

```
┌─────────────────────────────────────────────────────────┐
│              Section Heading                            │
│              Section Subtext                            │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │  Icon   │  │  Icon   │  │  Icon   │  │  Icon   │   │
│  │ Heading │  │ Heading │  │ Heading │  │ Heading │   │
│  │  Text   │  │  Text   │  │  Text   │  │  Text   │   │
│  │ [Link]  │  │ [Link]  │  │ [Link]  │  │ [Link]  │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└─────────────────────────────────────────────────────────┘
```

| Property | Values to Extract |
|---|---|
| `layout` | `grid` · `flex-wrap` · `masonry` |
| `columns` | Per breakpoint: `1` / `2` / `3` / `4` |
| `gap` | Gap between items |
| `item-alignment` | `top-left` · `center` · `top-center` |
| `icon-type` | `svg-inline` · `icon-font` · `image` · `emoji` · `lottie` · `none` |
| `icon-size` | Width/height |
| `icon-color` | Single color / gradient / multi-color |
| `icon-background` | Circle/square bg behind icon |
| `icon-position` | `top` · `left` · `inline` |
| `heading` | Font properties |
| `text` | Font properties, line-clamp |
| `link` | `text-link` · `button` · `arrow-link` · `card-click` (entire card clickable) |
| `hover-effect` | `shadow-lift` · `scale` · `border-color` · `bg-change` · `icon-animate` |
| `border` | Card border style |
| `background` | Individual item background |
| `padding` | Internal padding |
| `section-heading-alignment` | `left` · `center` |
| `section-heading-max-width` | Max width of section intro text |

### 6.2 Content + Image Block (Split Section)

```
Variant A: Image Left, Content Right
┌────────────────┬────────────────────────┐
│                │  Overline              │
│    Image       │  Heading               │
│                │  Description           │
│                │  • Bullet points       │
│                │  [CTA Button]          │
└────────────────┴────────────────────────┘

Variant B: Image Right, Content Left  (mirror)
Variant C: Image Full Width, Content Overlaid
Variant D: Content Only (no image)
```

| Property | Values to Extract |
|---|---|
| `image-position` | `left` · `right` · `alternating` (zig-zag pattern in repeating sections) |
| `image-position-mobile` | `above` · `below` · `hidden` |
| `content-image-ratio` | `50:50` · `40:60` · `60:40` · `33:67` |
| `image-aspect-ratio` | `1:1` · `4:3` · `16:9` · `3:4` · `auto` |
| `image-fit` | `cover` · `contain` · `fill` |
| `image-border-radius` | Corner rounding |
| `image-shadow` | Shadow on image |
| `image-overlap` | Image overflows its column/section |
| `image-decoration` | Background shapes, dots, patterns behind image |
| `vertical-align` | `top` · `center` · `bottom` |
| `content-elements` | Ordered list: `overline`, `heading`, `description`, `bullets`, `stats`, `cta` |
| `bullet-style` | `checkmark` · `dot` · `numbered` · `icon` |

### 6.3 Stats / Numbers Section

```
┌──────────┬──────────┬──────────┬──────────┐
│   100+   │   50K    │   99%    │   24/7   │
│ Projects │  Users   │ Uptime   │ Support  │
└──────────┴──────────┴──────────┴──────────┘
```

| Property | Values to Extract |
|---|---|
| `layout` | `inline` · `grid` · `stacked` |
| `columns` | Per breakpoint |
| `number-font-size` | Usually very large |
| `number-font-weight` | Usually bold/black |
| `number-color` | Often brand color |
| `label-font-size` | Smaller than number |
| `label-color` | Usually muted |
| `prefix` | `$` · `#` · `€` before number |
| `suffix` | `+` · `%` · `K` · `M` after number |
| `separator` | `divider-line` · `none` between items |
| `counter-animation` | Count-up animation on scroll |
| `icon` | Icon above/beside number |
| `background` | Section background (often contrasting) |

### 6.4 Logo Cloud / Trust Bar

| Property | Values to Extract |
|---|---|
| `layout` | `static-grid` · `scrolling-marquee` · `fade-carousel` |
| `columns` | Number of logos per row |
| `logo-treatment` | `original-color` · `grayscale` · `grayscale-hover-color` · `monochrome` |
| `logo-opacity` | Default opacity (often `0.5` → `1.0` on hover) |
| `logo-max-height` | Uniform max height |
| `logo-spacing` | Gap between logos |
| `heading` | "Trusted by" / "As seen in" / "Our partners" |
| `marquee-speed` | If scrolling, animation duration |
| `marquee-direction` | `left` · `right` |
| `marquee-pause-on-hover` | Boolean |

### 6.5 CTA Banner / Call-to-Action Section

```
┌─────────────────────────────────────────────────────────┐
│   ┌───────────────────────────────────────────────────┐ │
│   │        Ready to get started?                      │ │
│   │   Join thousands of happy customers today.        │ │
│   │                                                   │ │
│   │   [Start Free Trial]    [Contact Sales]           │ │
│   └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

| Property | Values to Extract |
|---|---|
| `background` | `solid-color` · `gradient` · `image` · `pattern` |
| `alignment` | `centered` · `left-right-split` |
| `heading` | Text + font properties |
| `subtext` | Text + font properties |
| `cta-buttons` | Primary + secondary (see Button spec) |
| `shape` | `full-width` · `rounded-card` · `contained-card` |
| `padding` | Internal spacing |
| `decorative` | Background illustrations, shapes, confetti |

---

## 7. Cards

### 7.1 Card Variations

| Variant ID | Description |
|---|---|
| `card-vertical` | Image on top, content below |
| `card-horizontal` | Image on left/right, content beside |
| `card-text-only` | No image, text content only |
| `card-overlay` | Text overlaid on full-bleed image |
| `card-minimal` | Border or shadow only, no distinct background |
| `card-feature` | Icon + heading + text (feature grid item) |
| `card-profile` | Avatar + name + role (team cards) |
| `card-pricing` | Plan name + price + features + CTA |
| `card-testimonial` | Quote + author info |
| `card-product` | Product image + name + price + rating |
| `card-blog` | Image + category + title + excerpt + date + author |
| `card-event` | Date badge + title + location + time |
| `card-stat` | Number + label |

### 7.2 Card Properties

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `background` | Solid / gradient / transparent | `bg-white` / `bg-gray-50` |
| `border` | Width, style, color | `border border-gray-200` |
| `border-radius` | Corner rounding | `rounded-lg` / `rounded-2xl` |
| `shadow` | Card shadow | `shadow-md` / `shadow-lg` |
| `padding` | Internal padding | `p-4` / `p-6` |
| `hover-shadow` | Shadow on hover | `hover:shadow-xl` |
| `hover-translate-y` | Lift on hover | `hover:-translate-y-1` |
| `hover-border-color` | Border color on hover | `hover:border-blue-500` |
| `hover-scale` | Scale on hover | `hover:scale-[1.02]` |
| `transition` | Hover transition | `transition-all duration-300` |
| `clickable` | Is the entire card a link? | `group cursor-pointer` |
| `image-aspect-ratio` | Image container ratio | `aspect-video` / `aspect-[4/3]` / `aspect-square` |
| `image-fit` | Image fit within container | `object-cover` |
| `image-position` | `top` · `left` · `right` · `full-background` | Layout class |
| `image-hover` | Image hover effect | `group-hover:scale-110` / `group-hover:opacity-80` |
| `image-overlay` | Gradient overlay on image | `bg-gradient-to-t from-black/60` |
| `tag/category` | Badge on card (see Badge spec) | — |
| `tag-position` | `above-image` · `on-image-top-left` · `on-image-top-right` · `below-image` | Absolute positioning |
| `heading-clamp` | Line clamping | `line-clamp-2` |
| `text-clamp` | Body text line clamping | `line-clamp-3` |
| `footer` | Card footer content (link, author, date, etc.) | `border-t` + content |
| `equal-height` | Cards in grid match tallest card | `h-full` on card + flex-col + `grow` on middle content |
| `gap-between-elements` | Internal spacing between heading/text/cta | `space-y-2` / `space-y-4` |

---

## 8. Forms

### 8.1 Form Layout

| Property | Values to Extract |
|---|---|
| `layout` | `single-column` · `two-column` · `inline` · `multi-step` |
| `columns` | Grid columns per breakpoint |
| `column-gap` | Horizontal gap between fields |
| `row-gap` | Vertical gap between fields |
| `label-position` | `above` · `left` (side-aligned) · `floating` · `inside-placeholder` |
| `required-indicator` | `asterisk` · `text` · `color` · `none` |
| `required-indicator-position` | `after-label` · `before-label` |
| `max-width` | Form container max width |
| `alignment` | `left` · `center` |
| `background` | Form background (if in a card/panel) |
| `padding` | Form container padding |
| `border` | Form container border |
| `shadow` | Form container shadow |
| `border-radius` | Form container corners |

### 8.2 Text Input / Textarea

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `height` | Input height | `h-10` / `h-12` / `h-14` |
| `padding-x` | Horizontal padding | `px-3` / `px-4` |
| `padding-y` | Vertical padding | `py-2` / `py-3` |
| `font-size` | Input text size | `text-sm` / `text-base` |
| `font-color` | Input text color | `text-gray-900` |
| `placeholder-color` | Placeholder color | `placeholder:text-gray-400` |
| `background` | Input background | `bg-white` / `bg-gray-50` |
| `border-width` | Border width | `border` / `border-2` |
| `border-color` | Default border color | `border-gray-300` |
| `border-color-hover` | Hover border color | `hover:border-gray-400` |
| `border-color-focus` | Focus border color | `focus:border-blue-500` |
| `border-radius` | Corner rounding | `rounded-md` / `rounded-lg` |
| `focus-ring` | Focus ring style | `focus:ring-2 focus:ring-blue-500/20` |
| `focus-ring-offset` | Focus ring offset | `focus:ring-offset-0` / `focus:ring-offset-2` |
| `shadow` | Input shadow | `shadow-sm` |
| `transition` | State transition | `transition-colors duration-150` |
| `disabled-opacity` | Disabled state opacity | `disabled:opacity-50` |
| `disabled-bg` | Disabled state background | `disabled:bg-gray-100` |
| `disabled-cursor` | Disabled cursor | `disabled:cursor-not-allowed` |
| `icon-left` | Search icon, calendar icon, etc. | `pl-10` + absolute icon |
| `icon-right` | Clear button, dropdown arrow, etc. | `pr-10` + absolute icon |
| `prefix-text` | `$`, `https://`, etc. | Addon left |
| `suffix-text` | `.com`, `kg`, etc. | Addon right |

### 8.3 Input States

| State | Properties to Extract |
|---|---|
| `default` | Border, bg, text color |
| `hover` | Border color change |
| `focus` | Border color, ring, shadow, label animation (if floating) |
| `filled` | May differ from default (floating label stays up) |
| `error` | Border color (red), bg tint, ring color, icon |
| `success` | Border color (green), checkmark icon |
| `disabled` | Opacity, bg color, cursor |
| `readonly` | Similar to disabled but selectable |
| `loading` | Spinner inside input |

### 8.4 Floating Label Behavior

| Property | Values to Extract |
|---|---|
| `default-position` | Inside input, vertically centered |
| `float-trigger` | `focus` · `focus-or-filled` |
| `float-position` | Translated up to border / above input |
| `float-scale` | Usually `scale(0.75)` or `text-xs` |
| `float-color` | Color when floated (often brand color) |
| `background-patch` | White bg behind floated label to break border line |
| `transition` | Transform + font-size transition |

### 8.5 Select / Dropdown

| Property | Values to Extract |
|---|---|
| `type` | `native-select` · `custom-select` · `combobox` (searchable) · `multi-select` |
| `appearance` | Matches text input styling |
| `dropdown-arrow` | Custom chevron icon |
| `option-height` | Height per option |
| `option-hover` | Hover background color |
| `option-selected` | Selected indicator (checkmark, bg color) |
| `option-icon` | Icons beside options |
| `max-height` | Dropdown max height before scroll |
| `search` | Search/filter within dropdown |
| `multi-select-display` | `tags/chips` · `count` · `comma-separated` |
| `animation` | Open/close animation |
| `position` | `below` · `above` · `auto` |

### 8.6 Checkbox

| Property | Values to Extract |
|---|---|
| `size` | Width/height | 
| `shape` | `square` · `rounded-square` · `circle` |
| `border` | Border width, color |
| `checked-bg` | Background when checked |
| `checked-icon` | Checkmark style (tick, custom SVG) |
| `checked-animation` | Scale, fade, draw-in |
| `indeterminate` | Dash icon for partial selection |
| `label-position` | `right` · `left` |
| `label-gap` | Gap between checkbox and label |
| `group-layout` | `vertical` · `horizontal` · `grid` |
| `group-gap` | Gap between checkbox items |

### 8.7 Radio Button

Same as checkbox plus:

| Property | Values to Extract |
|---|---|
| `shape` | Always `circle` |
| `inner-dot-size` | Size of inner selected dot |
| `inner-dot-color` | Color of inner dot |
| `variant` | `standard-radio` · `button-group` (segmented control) · `card-radio` (selectable cards) |

### 8.8 Toggle / Switch

| Property | Values to Extract |
|---|---|
| `width` | Track width |
| `height` | Track height |
| `track-bg-off` | Background when off |
| `track-bg-on` | Background when on |
| `thumb-size` | Circle diameter |
| `thumb-color` | White usually |
| `thumb-shadow` | Thumb shadow |
| `transition` | Toggle animation |
| `label-position` | `left` · `right` |
| `size-variant` | `sm` · `md` · `lg` |
| `icon-inside` | Sun/moon, check/x icons inside track |

### 8.9 File Upload

| Property | Values to Extract |
|---|---|
| `type` | `button-trigger` · `dropzone` · `inline` |
| `dropzone-height` | Min height of drop area |
| `dropzone-border` | Dashed border style |
| `dropzone-icon` | Upload cloud icon |
| `dropzone-text` | "Drag & drop or click to upload" |
| `accepted-formats` | File type restrictions |
| `max-size` | File size limit display |
| `preview` | Image thumbnail / file name + size |
| `progress` | Upload progress bar |
| `multi-file` | Single or multiple |
| `remove-button` | Style of remove/delete per file |

### 8.10 Date / Time Picker

| Property | Values to Extract |
|---|---|
| `type` | `native` · `custom-calendar` · `inline-calendar` |
| `format` | `MM/DD/YYYY` · `DD/MM/YYYY` · `YYYY-MM-DD` |
| `range` | Single date or date range |
| `time` | Time picker included |
| `calendar-style` | Popup calendar visual style |
| `min-date` | Minimum selectable date |
| `max-date` | Maximum selectable date |
| `disabled-dates` | Specific disabled dates |
| `highlight-today` | Today indicator style |

### 8.11 Validation & Error Messages

| Property | Values to Extract |
|---|---|
| `timing` | `on-blur` · `on-change` · `on-submit` · `real-time` |
| `message-position` | `below-input` · `below-label` · `tooltip` · `inline-right` |
| `message-color` | Error text color (usually red) |
| `message-font-size` | Usually smaller than input |
| `message-icon` | Warning/error icon beside message |
| `input-border-color` | Red border on error |
| `input-bg-color` | Red tint background on error |
| `input-icon` | Error icon inside input (right side) |
| `success-message` | Green checkmark / success text on valid |
| `character-count` | Live character count (for textarea) |
| `strength-meter` | Password strength indicator |
| `summary-position` | Error summary at top of form / inline only |
| `animation` | Shake, highlight, fade-in for errors |
| `aria-live` | Announce errors to screen readers |

### 8.12 Multi-Step Form / Wizard

| Property | Values to Extract |
|---|---|
| `step-indicator-type` | `numbered-circles` · `progress-bar` · `breadcrumb` · `tabs` |
| `step-indicator-position` | `top` · `left-sidebar` |
| `step-labels` | Text labels per step |
| `step-states` | `completed` · `current` · `upcoming` · `error` |
| `step-connector` | Line between steps (solid, dashed, colored when complete) |
| `transition` | `slide-left` · `slide-right` · `fade` · `none` |
| `navigation` | `next/prev buttons` · `step-click` · `both` |
| `validation-per-step` | Validate current step before next |
| `summary-step` | Review/confirmation step at end |

---

## 9. Buttons & CTAs

### 9.1 Button Variations

| Variant | Description | Tailwind Example |
|---|---|---|
| `solid` | Filled background, white text | `bg-blue-600 text-white` |
| `outline` | Transparent bg, colored border + text | `border-2 border-blue-600 text-blue-600 bg-transparent` |
| `ghost` | No border, no bg, colored text | `text-blue-600 bg-transparent` |
| `soft` | Tinted background (light shade of color) | `bg-blue-50 text-blue-600` |
| `link` | Styled as a text link | `text-blue-600 underline p-0` |
| `icon-only` | Just an icon, no text | `p-2 rounded-full` |
| `icon+text` | Icon beside text | `gap-2` with icon element |
| `gradient` | Gradient background | `bg-gradient-to-r from-blue-500 to-purple-600` |

### 9.2 Button Sizes

| Size | Height | Padding | Font Size | Icon Size |
|---|---|---|---|---|
| `xs` | `h-7` / `h-8` | `px-2.5` | `text-xs` | `w-3.5 h-3.5` |
| `sm` | `h-8` / `h-9` | `px-3` | `text-sm` | `w-4 h-4` |
| `md` | `h-10` / `h-11` | `px-4` / `px-5` | `text-sm` / `text-base` | `w-5 h-5` |
| `lg` | `h-12` / `h-13` | `px-6` / `px-8` | `text-base` / `text-lg` | `w-5 h-5` |
| `xl` | `h-14` / `h-16` | `px-8` / `px-10` | `text-lg` / `text-xl` | `w-6 h-6` |

### 9.3 Button Properties

| Property | Values to Extract | Tailwind Mapping |
|---|---|---|
| `font-weight` | Weight | `font-medium` / `font-semibold` / `font-bold` |
| `text-transform` | `none` · `uppercase` | `uppercase` |
| `letter-spacing` | Tracking | `tracking-wide` / `tracking-wider` |
| `border-radius` | Corner rounding | `rounded-md` / `rounded-lg` / `rounded-full` |
| `border-width` | Border width | `border` / `border-2` |
| `shadow` | Button shadow | `shadow-sm` / `shadow-md` |
| `width` | `auto` · `full` | `w-auto` / `w-full` |
| `icon-position` | `left` · `right` · `only` | Flex order |
| `icon-gap` | Gap between icon and text | `gap-2` |
| `cursor` | Pointer type | `cursor-pointer` |
| `transition` | Transition properties | `transition-all duration-200` |
| `hover-bg` | Background on hover | `hover:bg-blue-700` |
| `hover-shadow` | Shadow on hover | `hover:shadow-lg` |
| `hover-translate` | Movement on hover | `hover:-translate-y-0.5` |
| `hover-scale` | Scale on hover | `hover:scale-105` |
| `active-scale` | Scale on click | `active:scale-95` |
| `active-bg` | Background on click | `active:bg-blue-800` |
| `focus-ring` | Focus indicator | `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` |
| `disabled-opacity` | Disabled state | `disabled:opacity-50 disabled:cursor-not-allowed` |
| `loading-state` | Spinner replaces text/icon | Spinner component + `pointer-events-none` |
| `loading-spinner-position` | `replace-icon` · `replace-text` · `beside-text` | Layout variant |

### 9.4 Button Group

| Property | Values to Extract |
|---|---|
| `layout` | `horizontal` · `vertical` · `horizontal-mobile-vertical` |
| `gap` | Space between buttons |
| `connected` | Buttons touch with shared border (segmented) |
| `connected-radius` | First/last have rounded corners, middle have none |
| `alignment` | `left` · `center` · `right` · `stretch` |
| `wrap` | Buttons wrap to next line |

---

## 10. Media Components

### 10.1 Image

| Property | Values to Extract |
|---|---|
| `aspect-ratio` | `1:1` · `4:3` · `3:2` · `16:9` · `21:9` · `3:4` · `auto` |
| `object-fit` | `cover` · `contain` · `fill` · `none` · `scale-down` |
| `object-position` | `center` · `top` · `bottom` · `left` · `right` |
| `border-radius` | Corner rounding |
| `shadow` | Image shadow |
| `border` | Image border |
| `hover-effect` | `zoom` · `darken` · `lighten` · `blur` · `grayscale-to-color` |
| `loading` | `lazy` · `eager` |
| `placeholder` | `blur` · `color` · `skeleton` · `none` |
| `caption` | Caption text below image |
| `responsive-src` | `srcset` / `<picture>` with different images per breakpoint |

### 10.2 Video

| Property | Values to Extract |
|---|---|
| `type` | `inline` · `background` · `modal` · `embed` (YouTube/Vimeo) |
| `poster` | Thumbnail image |
| `autoplay` | Boolean |
| `muted` | Boolean (required for autoplay) |
| `loop` | Boolean |
| `controls` | `native` · `custom` · `none` |
| `play-button` | Custom play button overlay style |
| `aspect-ratio` | `16:9` · `4:3` · `1:1` |
| `border-radius` | Corner rounding |
| `responsive` | Responsive container |

### 10.3 Icon

| Property | Values to Extract |
|---|---|
| `source` | `svg-inline` · `icon-font` (FontAwesome, Material, etc.) · `image` · `emoji` |
| `library` | FontAwesome · Material Icons · Heroicons · Lucide · Phosphor · Tabler · custom |
| `size` | Width/height in px or relative |
| `color` | `currentColor` · explicit color |
| `stroke-width` | For stroke-based icons |
| `animation` | `spin` · `pulse` · `bounce` · `none` |

---

## 11. Lists & Data Display

### 11.1 Unordered / Ordered Lists

| Property | Values to Extract |
|---|---|
| `list-style` | `disc` · `circle` · `square` · `none` · `custom-icon` · `checkmark` |
| `indent` | Left indentation |
| `spacing` | Gap between list items |
| `marker-color` | Bullet/number color |
| `marker-size` | Custom marker size |
| `nested-style` | Different style per nesting level |

### 11.2 Description / Definition List

| Property | Values to Extract |
|---|---|
| `layout` | `stacked` (dt above dd) · `horizontal` (dt beside dd) · `grid` |
| `dt-style` | Font weight, color of term |
| `dd-style` | Font weight, color of definition |
| `separator` | Divider between pairs |

### 11.3 List with Icons / Feature List

| Property | Values to Extract |
|---|---|
| `icon-type` | `checkmark` · `arrow` · `number` · `custom-svg` |
| `icon-color` | Green checkmark, brand color, etc. |
| `icon-bg` | Circle behind icon |
| `text-weight` | Whether text is bold or normal |
| `layout` | `single-column` · `two-column` · `inline` |

---

## 12. Tables

### 12.1 Table Properties

| Property | Values to Extract |
|---|---|
| `type` | `standard` · `striped` · `bordered` · `hoverable` · `compact` · `card-rows` |
| `header-bg` | Header row background |
| `header-color` | Header text color |
| `header-weight` | Header font weight |
| `header-border` | Header bottom border |
| `header-sticky` | Sticky header on scroll |
| `row-bg-even` | Even row background (striped) |
| `row-bg-odd` | Odd row background |
| `row-hover` | Row hover background |
| `row-border` | Border between rows |
| `cell-padding` | Padding within cells |
| `cell-alignment` | `left` · `center` · `right` per column |
| `cell-vertical-align` | `top` · `middle` · `bottom` |
| `responsive-strategy` | `horizontal-scroll` · `stack` (card-like on mobile) · `hide-columns` · `none` |
| `sortable` | Sort icons in header |
| `selectable` | Checkbox column |
| `expandable-row` | Accordion rows |
| `pagination` | Pagination component below |
| `empty-state` | No data message/illustration |
| `loading-state` | Skeleton rows |
| `column-dividers` | Vertical borders between columns |

---

## 13. Modals & Overlays

### 13.1 Modal

| Property | Values to Extract |
|---|---|
| `size` | `sm` (400px) · `md` (500px) · `lg` (640px) · `xl` (800px) · `full` (100vw) |
| `position` | `center` · `top-center` · `right-panel` (sheet) |
| `border-radius` | Corner rounding |
| `padding` | Internal padding |
| `background` | Modal background |
| `shadow` | Modal shadow |
| `header` | Title + close button + optional icon |
| `footer` | Action buttons (primary + secondary) alignment |
| `close-button` | Style and position of X button |
| `close-on-backdrop` | Click outside to close |
| `close-on-escape` | Escape key to close |
| `backdrop-color` | `bg-black/50` · `bg-black/75` |
| `backdrop-blur` | `backdrop-blur-sm` |
| `animation-in` | `fade` · `scale` · `slide-up` · `slide-down` |
| `animation-out` | Same options |
| `animation-duration` | Duration |
| `body-scroll-lock` | Lock body scroll when open |
| `mobile-behavior` | `bottom-sheet` · `fullscreen` · `same` on mobile |

### 13.2 Bottom Sheet (Mobile)

| Property | Values to Extract |
|---|---|
| `snap-points` | Heights the sheet snaps to (e.g., 25%, 50%, 90%) |
| `drag-indicator` | Handle bar at top |
| `dismiss-direction` | Swipe down to dismiss |
| `border-radius` | Top corners only |
| `max-height` | Maximum height |

### 13.3 Lightbox

| Property | Values to Extract |
|---|---|
| `type` | `image-only` · `gallery` · `video` |
| `navigation` | `arrows` · `thumbnails` · `swipe` |
| `counter` | "1 / 5" indicator |
| `caption` | Image caption display |
| `zoom` | Pinch-to-zoom support |
| `background` | Usually `bg-black/90` |
| `close-button` | Style and position |

---

## 14. Accordions & Collapsibles

| Property | Values to Extract |
|---|---|
| `variant` | `bordered` · `separated` · `flush` (no borders between) · `card` |
| `header-bg` | Collapsed/expanded background |
| `header-padding` | Header clickable area padding |
| `header-font` | Font size, weight, color |
| `header-hover` | Background/color on hover |
| `icon-type` | `chevron` · `plus-minus` · `arrow` · `caret` |
| `icon-position` | `left` · `right` |
| `icon-rotation` | Rotate on open (e.g., chevron 180°) |
| `content-padding` | Expanded content padding |
| `content-bg` | Expanded content background |
| `content-border` | Border between header and content |
| `animation` | `height-transition` · `fade` · `none` |
| `animation-duration` | Duration |
| `multiple-open` | Allow multiple items open simultaneously |
| `default-open` | First item open by default |
| `separator` | Divider between items |
| `nested` | Nested accordion support |
| `disabled-state` | Disabled item styling |

---

## 15. Tabs

| Property | Values to Extract |
|---|---|
| `variant` | `underline` · `pills` · `bordered-box` · `vertical` · `segmented-control` |
| `tab-bg` | Background (inactive tab) |
| `tab-bg-active` | Background (active tab) |
| `tab-color` | Text color (inactive) |
| `tab-color-active` | Text color (active) |
| `tab-font-size` | Tab label size |
| `tab-font-weight` | Weight (inactive/active) |
| `tab-padding` | Padding per tab |
| `tab-gap` | Gap between tabs |
| `indicator` | Underline / background fill / border |
| `indicator-color` | Active indicator color |
| `indicator-thickness` | Underline thickness |
| `indicator-animation` | Sliding indicator transition |
| `tab-icon` | Icons in tabs |
| `tab-badge` | Count badge on tabs |
| `scrollable` | Horizontally scrollable tabs on overflow |
| `scroll-arrows` | Navigation arrows for scrollable tabs |
| `content-padding` | Tab content area padding |
| `content-animation` | `fade` · `slide` · `none` |
| `mobile-behavior` | `scrollable` · `dropdown` · `stacked-accordion` |
| `full-width` | Tabs stretch to fill container |

---

## 16. Carousels & Sliders

| Property | Values to Extract |
|---|---|
| `type` | `hero-carousel` · `card-carousel` · `image-gallery` · `testimonial-slider` · `logo-marquee` |
| `slides-per-view` | Per breakpoint: `1` / `2` / `3` / `4` / `auto` |
| `slides-per-group` | How many slides advance per click |
| `gap` | Gap between slides |
| `loop` | Infinite loop |
| `autoplay` | Boolean |
| `autoplay-delay` | Delay in ms |
| `pause-on-hover` | Boolean |
| `speed` | Transition speed in ms |
| `effect` | `slide` · `fade` · `cube` · `coverflow` · `flip` · `creative` |
| `direction` | `horizontal` · `vertical` |
| `centered` | Active slide centered |
| `navigation-arrows` | Show prev/next arrows |
| `arrow-style` | Position, size, shape, color, bg |
| `arrow-position` | `inside` · `outside` · `bottom` |
| `arrow-visibility` | `always` · `hover` · `never` |
| `pagination-dots` | Dot indicators |
| `dot-style` | Size, color, active color, shape |
| `dot-position` | `below` · `overlaid-bottom` |
| `progress-bar` | Progress indicator |
| `fraction` | "1 / 5" fraction display |
| `scrollbar` | Custom scrollbar |
| `free-mode` | Free swiping (no snap) |
| `touch` | Touch/swipe enabled |
| `keyboard` | Arrow key navigation |
| `mousewheel` | Mousewheel navigation |
| `partial-visibility` | Show partial next/prev slides (peek) |
| `peek-amount` | How much of adjacent slides is visible |
| `breakpoints` | Different config per breakpoint |

---

## 17. Footer

### 17.1 Footer Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Main Footer]                                                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Logo +  │  │ Column 1 │  │ Column 2 │  │  Newsletter  │   │
│  │  About   │  │  Links   │  │  Links   │  │  Signup Form │   │
│  │  Social  │  │          │  │          │  │              │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Sub-Footer / Copyright Bar]                                    │
│  © 2024 Company  |  Privacy  |  Terms  |  Cookies  |  Sitemap  │
└─────────────────────────────────────────────────────────────────┘
```

### 17.2 Footer Properties

| Property | Values to Extract |
|---|---|
| `background` | Usually dark or contrasting |
| `text-color` | Light text on dark bg / muted |
| `padding-y` | Vertical padding (usually generous) |
| `columns` | Number of link columns per breakpoint |
| `column-gap` | Gap between columns |
| `logo` | Footer logo (may differ from header) |
| `about-text` | Short company description |
| `social-links` | Social media icons + links |
| `social-icon-style` | `outline` · `filled` · `rounded-square` · `circle` |
| `social-icon-size` | Icon size |
| `social-icon-color` | Color / hover color |
| `link-columns` | Grouped links with headings |
| `column-heading-style` | Font properties for column headings |
| `link-style` | Font properties, hover effect |
| `link-spacing` | Gap between links |
| `newsletter` | Email input + subscribe button |
| `contact-info` | Address, phone, email |
| `app-badges` | App Store / Google Play badges |
| `payment-methods` | Visa/MC/PayPal icons |
| `certifications` | Security badges, SSL, compliance logos |
| `separator` | Line between main footer and sub-footer |
| `sub-footer-bg` | Sub-footer background |
| `sub-footer-layout` | `left-right-split` · `centered` · `three-column` |
| `copyright-text` | © year + company |
| `legal-links` | Privacy, Terms, Cookie Policy, etc. |
| `language-selector` | Language/region switcher |
| `back-to-top` | Scroll-to-top button in/near footer |
| `mobile-layout` | Accordion columns, stacked, collapsed |

---

## 18. Sidebar & Drawer Navigation

| Property | Values to Extract |
|---|---|
| `position` | `left` · `right` |
| `width` | Fixed width (e.g., `w-64` / `w-80`) |
| `width-collapsed` | Collapsed state width (icon-only: `w-16` / `w-20`) |
| `type` | `persistent` (always visible) · `overlay` (slides over) · `push` (pushes content) · `collapsible` (icon-only state) |
| `background` | Sidebar background |
| `border` | Right/left border |
| `shadow` | Shadow when overlaying |
| `items` | Navigation items list |
| `item-height` | Item height (tappable area) |
| `item-padding` | Item horizontal padding |
| `item-icon` | Icon per item |
| `item-text` | Label text style |
| `item-hover` | Hover background / text color |
| `item-active` | Active background / text color / indicator |
| `active-indicator` | `left-bar` · `background-fill` · `border-left` · `font-weight` |
| `group-heading` | Section headings within sidebar |
| `group-separator` | Divider between groups |
| `nested-items` | Sub-items (indented, collapsible) |
| `collapse-trigger` | Button to collapse sidebar |
| `tooltip-on-collapse` | Show tooltip on hover in collapsed state |
| `mobile-behavior` | `drawer-overlay` · `hidden` · `bottom-nav` |
| `header-section` | Logo, user avatar, search at top |
| `footer-section` | Settings, logout, user info at bottom |

---

## 19. Breadcrumbs & Pagination

### 19.1 Breadcrumbs

| Property | Values to Extract |
|---|---|
| `separator` | `/` · `>` · `→` · `chevron-icon` · `·` |
| `separator-color` | Muted color |
| `link-color` | Breadcrumb link color |
| `current-color` | Current (last) item color |
| `current-weight` | Current item font weight |
| `font-size` | Usually smaller text |
| `truncation` | Show "..." for deep paths |
| `max-items` | Max visible items before collapsing |
| `mobile-behavior` | `hide` · `show-last-2` · `scrollable` |
| `schema` | JSON-LD breadcrumb schema |
| `icon-home` | Home icon for first item |

### 19.2 Pagination

| Property | Values to Extract |
|---|---|
| `variant` | `numbered` · `prev-next` · `load-more` · `infinite-scroll` · `cursor-based` |
| `button-style` | Border, bg, hover for page buttons |
| `active-style` | Active page button style |
| `disabled-style` | Disabled prev/next style |
| `shape` | `square` · `rounded` · `circle` |
| `size` | Button dimensions |
| `gap` | Gap between buttons |
| `ellipsis` | "..." for skipped pages |
| `first-last` | Show first/last page buttons |
| `total-info` | "Showing 1-10 of 100" text |
| `per-page-selector` | Items per page dropdown |
| `alignment` | `left` · `center` · `right` |
| `mobile-behavior` | Simplified (prev/next only) |

---

## 20. Testimonials & Reviews

| Property | Values to Extract |
|---|---|
| `layout` | `grid` · `carousel` · `masonry` · `single-featured` |
| `card-style` | Background, border, shadow, radius |
| `quote-mark` | Visual quotation marks (decorative) |
| `quote-text` | Font size, style (italic), color, line-clamp |
| `rating` | Star rating (1-5) |
| `star-style` | Filled/empty star colors, size |
| `avatar` | Author photo — size, shape (circle), border |
| `author-name` | Font weight, size |
| `author-title` | Role/company — font size, color |
| `company-logo` | Logo beside author |
| `source-icon` | Platform icon (Google, Trustpilot, G2) |
| `date` | Review date |
| `verified-badge` | "Verified" indicator |

---

## 21. Pricing Tables

| Property | Values to Extract |
|---|---|
| `layout` | `side-by-side-cards` · `comparison-table` · `tabbed` (monthly/annual) |
| `columns` | Number of plans (usually 2-4) |
| `highlighted-plan` | Which plan is "recommended" — `scale` · `border` · `badge` · `shadow` · `bg-color` |
| `toggle` | Monthly/Annual toggle switch |
| `toggle-savings` | "Save 20%" badge near toggle |
| `plan-name` | Font properties |
| `price` | Large font, weight, color |
| `price-period` | "/mo" · "/year" — smaller text |
| `price-original` | Strikethrough original price |
| `description` | Plan description text |
| `feature-list` | Features with checkmarks/x marks |
| `feature-check` | Check icon style + color |
| `feature-x` | X / dash icon for unavailable |
| `feature-tooltip` | Info icon with tooltip per feature |
| `cta-button` | Button per plan — primary for highlighted, outline for others |
| `guarantee` | "30-day money back" text below |
| `enterprise` | "Contact us" custom card |
| `mobile-behavior` | `horizontal-scroll` · `stacked` · `tabs` |
| `equal-height` | Cards match tallest |

---

## 22. Timeline & Stepper

### 22.1 Timeline

| Property | Values to Extract |
|---|---|
| `orientation` | `vertical` · `horizontal` |
| `line-style` | `solid` · `dashed` · `dotted` |
| `line-color` | Line color (completed vs upcoming) |
| `line-width` | Line thickness |
| `node-shape` | `circle` · `square` · `diamond` |
| `node-size` | Diameter/size |
| `node-style` | Color, border, fill (completed vs current vs upcoming) |
| `node-icon` | Icon/number inside node |
| `content-position` | `alternating` (left/right) · `single-side` |
| `content-card` | Card styling per event |
| `date-position` | Above node, beside node, inside content |
| `animation` | Scroll-triggered reveal |

### 22.2 Stepper / Progress Steps

| Property | Values to Extract |
|---|---|
| `orientation` | `horizontal` · `vertical` |
| `step-shape` | `circle-with-number` · `circle-with-icon` · `circle-with-check` |
| `step-size` | Circle/shape size |
| `connector` | Line between steps |
| `connector-completed` | Different color/style for completed |
| `state-colors` | Completed, current, upcoming colors |
| `label-position` | `below` · `right` · `inside` |
| `label-font` | Font properties |
| `description` | Optional description per step |
| `clickable` | Can you click to navigate to step |

---

## 23. Notification & Alert Components

### 23.1 Inline Alert / Banner

| Property | Values to Extract |
|---|---|
| `variant` | `info` · `success` · `warning` · `error` · `neutral` |
| `background` | Per-variant background color |
| `border` | Per-variant border color, `border-l-4` style |
| `icon` | Per-variant icon (info-circle, checkmark, warning-triangle, x-circle) |
| `text-color` | Per-variant text color |
| `title` | Optional bold title |
| `dismissible` | Close button |
| `action` | Button/link inside alert |
| `border-radius` | Corner rounding |
| `padding` | Internal padding |

### 23.2 Toast / Snackbar

| Property | Values to Extract |
|---|---|
| `position` | `top-right` · `top-center` · `top-left` · `bottom-right` · `bottom-center` · `bottom-left` |
| `offset` | Distance from viewport edge |
| `max-width` | Toast max width |
| `animation-in` | `slide-in` · `fade` · `pop` |
| `animation-out` | `slide-out` · `fade` |
| `auto-dismiss` | Duration before auto-close (ms) |
| `progress-bar` | Countdown progress bar |
| `stacking` | How multiple toasts stack |
| `icon` | Per-variant icon |
| `close-button` | Dismiss X |
| `action-button` | "Undo", "View", etc. |
| `swipe-to-dismiss` | Swipe gesture on mobile |
| `variant` | `info` · `success` · `warning` · `error` |
| `shadow` | Toast shadow |
| `border-radius` | Corner rounding |

---

## 24. Tooltips & Popovers

### 24.1 Tooltip

| Property | Values to Extract |
|---|---|
| `trigger` | `hover` · `focus` · `click` |
| `position` | `top` · `bottom` · `left` · `right` · `auto` |
| `background` | Usually dark (gray-900) |
| `text-color` | Usually white |
| `font-size` | Small text |
| `max-width` | Max tooltip width |
| `padding` | Internal padding |
| `border-radius` | Corner rounding |
| `arrow` | Pointing arrow to trigger element |
| `delay-show` | Delay before showing (ms) |
| `delay-hide` | Delay before hiding (ms) |
| `animation` | `fade` · `scale` · `none` |
| `shadow` | Tooltip shadow |

### 24.2 Popover

Same as tooltip plus:

| Property | Values to Extract |
|---|---|
| `header` | Optional title/header |
| `close-button` | X button |
| `content` | Rich content (text, images, buttons) |
| `close-on-outside` | Click outside to close |
| `width` | Usually wider than tooltip |

---

## 25. Badges, Tags & Chips

| Property | Values to Extract |
|---|---|
| `variant` | `solid` · `outline` · `soft` (light bg) · `dot` (status dot + text) |
| `size` | `xs` · `sm` · `md` |
| `shape` | `rounded` · `pill` · `square` |
| `color` | Per-category/status color |
| `font-size` | Text size |
| `font-weight` | Text weight |
| `padding` | Internal padding |
| `icon` | Icon inside badge |
| `dot` | Status dot before text |
| `removable` | X button to remove (chips) |
| `interactive` | Clickable, toggleable |
| `max-width` | Truncation with ellipsis |
| `counter` | Notification count badge |
| `counter-position` | `top-right` on avatar/icon |
| `counter-pulse` | Pulsing animation for new notifications |

---

## 26. Avatar & User Indicators

| Property | Values to Extract |
|---|---|
| `shape` | `circle` · `rounded-square` |
| `sizes` | `xs` (24px) · `sm` (32px) · `md` (40px) · `lg` (48px) · `xl` (64px) · `2xl` (96px) |
| `fallback` | Initials on colored bg when no image |
| `fallback-colors` | How colors are determined (hash of name, random, fixed) |
| `border` | Ring/border around avatar |
| `status-indicator` | Online/offline dot |
| `status-position` | `bottom-right` · `top-right` |
| `status-colors` | Green (online), gray (offline), yellow (away), red (busy) |
| `group` | Overlapping avatar stack |
| `group-overlap` | Overlap amount |
| `group-max` | Max displayed + "+3" overflow |
| `group-border` | White ring between overlapping avatars |

---

## 27. Progress & Loading Indicators

### 27.1 Progress Bar

| Property | Values to Extract |
|---|---|
| `height` | Bar height |
| `background` | Track background |
| `fill-color` | Progress fill color |
| `fill-gradient` | Gradient fill |
| `border-radius` | Bar roundness |
| `label` | Percentage text position (`inside` · `above` · `right` · `none`) |
| `animation` | Fill animation, striped pattern, shimmer |
| `segments` | Multi-segment progress bar |

### 27.2 Spinner / Loader

| Property | Values to Extract |
|---|---|
| `type` | `circular-spinner` · `dots` · `bars` · `pulse` · `skeleton` · `progress-ring` · `brand-animation` |
| `size` | Diameter |
| `color` | Spinner color |
| `track-color` | Background track (for circular) |
| `thickness` | Stroke width (for circular) |
| `speed` | Animation duration |

### 27.3 Skeleton Loading

| Property | Values to Extract |
|---|---|
| `base-color` | Skeleton element color |
| `shine-color` | Shimmer animation highlight |
| `animation` | `shimmer` · `pulse` · `wave` |
| `shapes` | `rectangle` · `circle` · `text-lines` |
| `border-radius` | Corner rounding on skeleton elements |
| `matches-component` | Skeleton shape matches the real component layout |

---

## 28. Dividers & Decorative Elements

### 28.1 Dividers

| Property | Values to Extract |
|---|---|
| `type` | `horizontal-line` · `vertical-line` · `with-text` · `with-icon` |
| `style` | `solid` · `dashed` · `dotted` · `double` · `gradient-fade` |
| `color` | Line color |
| `thickness` | Line width/height |
| `spacing` | Margin above and below |
| `length` | Full width, partial (centered), or specific px |
| `text-style` | "OR" / "Section Name" — font and color |

### 28.2 Decorative Elements

| Element | What to Extract |
|---|---|
| `background-shapes` | Blobs, circles, polygons — colors, positions, blur, opacity |
| `dot-patterns` | Grid of dots — color, spacing, size, opacity |
| `line-patterns` | Diagonal lines, grids — color, spacing, angle |
| `gradient-blurs` | Colored blurred circles — color, size, position, blur-radius |
| `svg-waves` | Wave dividers between sections — color, shape |
| `svg-angles` | Angled/diagonal section dividers |
| `grain-texture` | Noise/grain overlay — opacity, blend-mode |
| `grid-lines` | Visible grid background |
| `image-masks` | Non-rectangular image clipping |

---

## 29. Sticky / Fixed / Floating Elements

| Element | Properties to Extract |
|---|---|
| `sticky-header` | See Header section |
| `sticky-sidebar` | Sidebar that scrolls then sticks at top |
| `sticky-cta` | Fixed CTA bar at bottom of viewport (mobile) |
| `floating-action-button` | FAB — position, size, icon, shadow, color |
| `scroll-to-top` | Arrow button — position, show-after-scroll, animation |
| `cookie-banner` | Bottom bar — height, content, accept/reject buttons |
| `notification-bar` | Top bar — dismissible, background color, text |
| `chat-widget` | Floating chat bubble — position, size, expand behavior |
| `sticky-table-header` | Table header stays fixed while scrolling |
| `sticky-sidebar-toc` | Table of contents that follows scroll |

---

## 30. Animation & Transition Metadata

### 30.1 Scroll-Triggered Animations

| Property | Values to Extract |
|---|---|
| `trigger` | `scroll-into-view` · `intersection-observer` |
| `threshold` | When to trigger (e.g., 20% visible) |
| `effect` | `fade-in` · `fade-up` · `fade-down` · `fade-left` · `fade-right` · `zoom-in` · `zoom-out` · `flip` · `slide-up` |
| `duration` | Animation duration |
| `delay` | Per-element stagger delay |
| `easing` | `ease` · `ease-in-out` · `spring` · `cubic-bezier(...)` |
| `once` | Animate only first time in view, or every time |
| `distance` | Translation distance for slide/fade-up |
| `library` | `AOS` · `GSAP` · `Framer Motion` · `CSS-only` · `Lottie` |

### 30.2 Hover Transitions

| Property | Values to Extract |
|---|---|
| `property` | Which CSS property transitions |
| `duration` | Transition duration |
| `easing` | Timing function |
| `delay` | Transition delay |

### 30.3 Page Transitions

| Property | Values to Extract |
|---|---|
| `type` | `none` · `fade` · `slide` · `morph` |
| `library` | `Barba.js` · `Swup` · `Next.js transitions` · `View Transitions API` |
| `duration` | Transition duration |

---

## 31. Accessibility Metadata

| Property | Values to Extract |
|---|---|
| `landmark-roles` | `banner`, `navigation`, `main`, `contentinfo`, `complementary` |
| `heading-hierarchy` | Proper h1→h2→h3 nesting |
| `alt-text` | Image alt attributes (present/missing/decorative) |
| `aria-labels` | On interactive elements (buttons, links, inputs) |
| `aria-live` | Live regions for dynamic content |
| `focus-visible` | Visible focus indicators on keyboard navigation |
| `focus-order` | Tab order makes logical sense |
| `skip-link` | "Skip to main content" link |
| `color-contrast` | WCAG AA (4.5:1 text, 3:1 large text) / AAA compliance |
| `touch-targets` | Minimum 44x44px on mobile |
| `reduced-motion` | `prefers-reduced-motion` media query support |
| `screen-reader-only` | `.sr-only` / `visually-hidden` text |
| `form-labels` | Labels properly associated with inputs |
| `error-announcements` | Form errors announced to screen readers |
| `language-attr` | `lang` attribute on `<html>` |

---

## 32. Responsive Behavior Matrix

For every component, capture behavior changes at each breakpoint:

| Component | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|---|---|---|---|
| **Header** | Hamburger + drawer | Could be either | Full horizontal nav |
| **Hero** | Stacked, shorter | Split may stack | Full split/centered |
| **Grid** | 1 column | 2 columns | 3-4 columns |
| **Cards** | Full width, stacked | 2-up | 3-4 up |
| **Sidebar** | Hidden/drawer | May persist | Always visible |
| **Table** | Scroll/stack | Scroll | Full table |
| **Tabs** | Scrollable/dropdown | Scrollable | Full tabs |
| **Footer** | Accordion columns | 2-col grid | 4-col grid |
| **Modal** | Full screen or bottom sheet | Centered, wider | Centered, max-width |
| **Carousel** | 1 slide, dots | 2 slides | 3-4 slides |
| **Pricing** | Stacked or swipeable | 2-up | 3-4 side by side |
| **Nav items** | Larger touch targets | Medium | Standard |
| **Font sizes** | Scaled down 1-2 steps | Midpoint | Full size |
| **Spacing** | Reduced padding/margins | Medium | Full spacing |
| **Images** | May hide or reposition | Adjusted | Full visibility |
| **CTAs** | Full width buttons | Auto width | Auto width |
| **Hide/Show** | Some elements hidden | Some restored | All visible |

### Responsive Extraction Rules

For each component, extract:

1. **Visibility:** `block` / `hidden` per breakpoint
2. **Layout shift:** `flex-col` → `flex-row`, column count changes
3. **Size changes:** Font sizes, padding, margins, widths, heights
4. **Position changes:** Content reordering with `order`, position property changes
5. **Interaction changes:** Hover → tap, click → long-press
6. **Component swap:** Desktop component replaced by mobile-specific component (e.g., horizontal tabs → accordion)

---

## Appendix A: Component Detection Heuristics

When scraping a page, use these heuristics to identify components:

| Signal | Likely Component |
|---|---|
| `<header>` or top-of-page `<nav>` | Header/Navigation |
| First large section with h1 | Hero Section |
| `<footer>` or bottom semantic block | Footer |
| Repeated `.card`-like blocks in grid | Card Grid |
| `<form>` with `<input>` elements | Form |
| `<table>` with `<thead>` | Data Table |
| Swiper/Slick/Flickity container | Carousel |
| `role="dialog"` or `.modal` | Modal |
| `role="tablist"` | Tabs |
| Accordion-pattern (toggle + panel) | Accordion |
| Fixed/sticky element at bottom | Floating CTA / Cookie Bar |
| `<aside>` or sidebar-width element | Sidebar |
| Repeating quote + author pattern | Testimonials |
| Price + feature list pattern | Pricing |
| Large number + label pattern | Stats Section |
| Logo grid with grayscale filter | Logo Cloud |
| SVG icons + heading + text in grid | Feature Grid |
| Image + text in 2-column layout | Split Content |
| `<ol>` / `<ul>` with styled markers | Feature List |
| Floating circle at bottom-right | Chat Widget / FAB |
| Banner with dismiss button | Alert / Notification Bar |

---

## Appendix B: Extraction Output Schema (JSON)

```json
{
  "page": {
    "url": "string",
    "title": "string",
    "viewport": { "width": "number", "height": "number" },
    "breakpoints_detected": ["number"]
  },
  "design_tokens": {
    "colors": {},
    "typography": {},
    "spacing": {},
    "shadows": {},
    "radii": {},
    "z_indices": {},
    "breakpoints": {}
  },
  "components": [
    {
      "id": "string (unique)",
      "type": "header | hero | card | form | ...",
      "variant": "string (variant ID from this spec)",
      "selector": "CSS selector path",
      "bounding_box": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "html": "string (raw HTML)",
      "styles": {
        "computed": {},
        "tailwind_classes": "string",
        "custom_css": "string (non-mappable properties)"
      },
      "responsive": {
        "mobile": { "visibility": "boolean", "tailwind_overrides": "string" },
        "tablet": { "visibility": "boolean", "tailwind_overrides": "string" },
        "desktop": { "visibility": "boolean", "tailwind_overrides": "string" }
      },
      "interactions": {
        "hover": {},
        "focus": {},
        "active": {},
        "scroll_triggered": {}
      },
      "children": [],
      "accessibility": {
        "role": "string",
        "aria_attributes": {},
        "focus_order": "number"
      }
    }
  ]
}
```

---

## Appendix C: Tailwind Class Priority Mapping

When multiple CSS properties map to Tailwind, follow this precedence:

1. **Exact Tailwind class exists** → Use it (e.g., `p-4` for `padding: 1rem`)
2. **Near-match exists** → Use closest + document deviation (e.g., `p-[18px]` for `padding: 18px`)
3. **Arbitrary value** → Use bracket notation (e.g., `bg-[#1a2b3c]`)
4. **No mapping possible** → Output as inline `style` attribute or custom CSS class
5. **Responsive** → Always prefix with breakpoint (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
6. **State** → Always prefix with state (`hover:`, `focus:`, `active:`, `group-hover:`, `disabled:`)

---

*End of Component Info Sheet v1.0.0*
