# Skill: Website Extraction (Phase 1)

Extract a website into structured JSON using the Agent-Scrapper pipeline.

## Command

```bash
node helpers/orchestrate.js <url> output/<domain> --paths /
```

## What It Produces

```
output/{domain}/extracted/
├── page-{name}.json          ← Desktop (1440px) full extraction
├── page-{name}-768.json      ← Tablet viewport
├── page-{name}-375.json      ← Mobile viewport
├── screenshot-{name}.png     ← Full-page screenshots
├── design-system.json        ← Colors, fonts, sizes, shadows
├── layout.json               ← Typography scale, container system
├── site-profile.json         ← Libraries, frameworks, navigation
└── interactions.json         ← Hover rules, focus states, @keyframes
```

## 3-Viewport Extraction

Every page is extracted at 3 viewports:
- **1440px** — Desktop (primary)
- **768px** — Tablet
- **375px** — Mobile

Mobile-first generation: base classes from 375px, `md:` for 768px diffs, `lg:` for 1440px diffs.

## Component Node Format

```javascript
{
  tag: "div",
  s: { "display": "flex", "padding": "24px", "color": "rgb(0,63,45)" },
  t: "Direct text content",
  c: [children],
  componentName: "HeroSection",
  componentType: "hero",           // 22 types
  componentVariant: "hero-centered",
  typeConfidence: 0.95,
  box: { x: 0, y: 100, w: 1440, h: 500 },
  pseudos: [{ pseudo: "::before", content: "...", s: {...} }],
  src: "image.jpg",
  alt: "alt text",
  href: "https://example.com",
  svg: "<svg>...</svg>",
  tw: ["flex", "flex-col", "gap-[16px]"]  // Pre-computed Tailwind
}
```

## 22 Component Types

```
header, hero, feature-grid, split-content, stats, logo-cloud,
cta-banner, card-grid, testimonials, pricing, form, tabs,
accordion, carousel, footer, table, timeline, breadcrumb,
sidebar, gallery, video-section, content-section
```

## Critical Extraction Features

- **Lazy loading forced** — scrolls page to trigger Swiper, AOS, lazy images
- **Mega-menu hover extraction** — captures expanded dropdown DOM
- **Pseudo-element capture** — `::before`/`::after` via getComputedStyle
- **Animation neutralization** — disables transitions, forces AOS opacity
- **CDN bypass** — Chrome download for blocked images
- **Size limit** — 4000 tokens per component → auto-split if larger
- **DPR normalization** — bounding boxes account for device pixel ratio

## Rules

1. NEVER combine extraction and generation into one phase
2. STOP after extraction — verify output before proceeding
3. One site at a time — complete fully before starting another
4. Use `--headed` flag for Cloudflare-protected sites (Puppeteer bypass)
