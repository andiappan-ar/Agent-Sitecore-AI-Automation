# Web-To-SitecoreStructure

Autonomous web scraper that takes any website URL and produces pixel-perfect responsive Tailwind HTML with CMS-ready content structure. Claude Code IS the scraper and generator — it drives Puppeteer, extracts, classifies, generates, and validates everything.

---

## MANDATORY WORKFLOW GATES

**Never combine phases. Never skip verification. Never auto-proceed.**

### Gate Rules

1. **STOP after each phase** — present output and ask "Ready to proceed to Phase X?"
2. **Never extract and generate in the same step** — extraction and generation are separate phases
3. **Never assume output is correct** — after every generation, Playwright-validate before proceeding
4. **One component at a time during generation** — read the FULL prompt.md + JSON before generating. Never skim.
5. **One site at a time** — complete a site fully before starting another. Quality degrades when batching.

---

## PHASE 1: EXTRACT (STOP GATE)

```bash
node helpers/orchestrate.js https://example.com output/example.com --paths /en
```

**What happens:**
- examine-site.js → site-profile.json (libraries, patterns, source framework)
- extract-layout.js → layout.json (containers, fonts, type scale at 3 viewports)
- extract-components.js at 3 viewports (1440, 768, 375)
  - Smart wrapper unwrapping (handles deeply nested div wrappers)
  - Force-split oversized components (>4000 tokens)
  - Component TYPE classification (22 types from component-info-sheet.md)
  - Variant detection (hero-video, hero-split, card-vertical, etc.)
  - Alignment classification (full-bleed, contained, full-bleed-contained)
- extract-interactions.js → hover rules, focus states, @keyframes, transitions
- Lazy content loader (forces Swiper init, lazy images, AOS completion)
- Cross-viewport merge → page-{name}-merged.json
- Screenshots at all 3 viewports

**Component types detected:**
```
header, hero, feature-grid, split-content, stats, logo-cloud,
cta-banner, card-grid, testimonials, pricing, form, tabs,
accordion, carousel, footer, table, timeline, breadcrumb,
sidebar, gallery, video-section, content-section (fallback)
```

**If Cloudflare blocks:** Use MCP Puppeteer directly (headed mode bypasses bot detection).

---

## PHASE 2: TOKEN AUDIT (STOP GATE)

```bash
node helpers/token-miner.js output/example.com
node helpers/transform-tokens.js output/example.com
```

---

## PHASE 3: PREPARE PROMPTS (STOP GATE)

```bash
node helpers/generate-with-claude.js output/example.com --prepare
```

**Each component prompt includes:**
- Component type + variant + type-specific generation hints
- Layout context (container system, fonts, type scale)
- Alignment classification
- Desktop + tablet + mobile DOM trees
- Responsive blueprint table (mobile values as base)
- Hover/focus interactions
- Collection items rule (render ALL items)
- Alpine.js interaction patterns
- Typography rule (ALWAYS from `s` computed styles, never rely on `cls` alone)

---

## PHASE 4: GENERATE (PER-COMPONENT LOOP — DO NOT RUSH)

For each component in manifest.json:
1. **Read the screenshot** (.screenshot.png) — see the visual target
2. **Read the FULL .prompt.md** — every line, including `tw` pre-computed classes
3. **Read the FULL .json** — all viewport data with `tw` Tailwind classes per node
4. **Use `tw` classes as starting point** — they are deterministic pixel-perfect values
5. **Generate responsive code** — base from 375px, md: for 768px diffs, lg: for desktop diffs
6. **Validate this component** — screenshot + compare before moving to next
7. **Fix if needed** — iterate until this component passes, THEN move to next

### ABSOLUTE GENERATION RULES

- **EXACT VALUES ONLY** — never approximate. 14px → `text-[14px]`
- **FONTS ALWAYS from `s` object** — text-[Xpx] font-[X] leading-[Xpx] font-['FontName',sans-serif]
- **MOBILE-FIRST** — base classes from 375px extraction. md: for 768px diffs. lg: for desktop diffs.
- **COLLECTION ITEMS** — render EVERY item in carousels/cards/timelines. Count must match extraction.
- **ALPINE.JS** — x-data for hamburger menus, carousels (prev/next/dots), tabs, accordions
- **Preserve all** image src, link href, SVG outerHTML from extraction
- **Hover effects** from interactions data — hover:text-[#color], hover:bg-[#color]
- **Skip**: word-break, -webkit-* vendor prefixes

### Component Spacing (AUTOMATED in generate-react.js)
- **generate-react.js auto-calculates gaps** from extraction `box.y`/`box.h` when building App.jsx
- Formula: `gap[i] = component[i].y - (component[i-1].y + component[i-1].h)`
- Renders as `<div style={{ marginTop: 'Xpx' }} />` spacers between components
- Gaps <5px are ignored (rounding noise). Negative gaps = overlap (fixed header over hero)
- Logs: `✓ Component gaps calculated from extraction (N gaps)`

### Mega-Menu & Hidden Nav (MANDATORY — HOVER-EXTRACT)
- **Extraction MUST hover each nav item** to capture the expanded dropdown DOM — see component-info-sheet.md section 4.5
- **Sitemap reconstruction is NOT enough** — mega-menus have section headings, descriptions, featured cards, column groupings that flat URLs don't capture
- **Storage format**: `megaMenuData: [{ navItem, sections: [{ heading, links: [{ text, href, description }], featured: { image, title, cta } }] }]`
- **generate-react.js** uses `megaMenuData` (if available) or falls back to `navStructure` (flat links from sitemap)
- **Agents must**: render the FULL dropdown structure — headings, grouped links, featured cards. Never "Sub-navigation for..." placeholder.
- **Desktop**: `onMouseEnter`/`onMouseLeave` dropdowns. **Mobile**: accordion expand/collapse
- **Footer sub-links** — extraction captures all footer text. Render ALL links, not just column headings

### Content JSON Population (generate-react.js)
- Scaffold content JSONs now extract REAL text/images/links from `.claude-gen/` extraction data
- Previously they were empty placeholders that overrode component defaults with null values
- Rule: Components should use content JSON, not hardcode content in JSX

### Nested Section Tag Rule
- NEVER nest `<section>` inside another component — causes phantom entries in validator
- Only the ROOT element should be `<section>`/`<header>`/`<footer>`. Use `<div>` for internals.

### Parallax Background + Overlay Split (CRITICAL)
- Extraction captures `position: fixed` backgrounds and overlay text as SEPARATE components
- In React they stack vertically — parallax effect is lost
- **Rule**: When generating an overlay component, check screenshot. If text appears on a background image, give the component its OWN background image. Never leave it transparent expecting a previous component's background to show through.
- Added to GENERATION_RULES so agents always check for this pattern.

### Swiper Lazy-Load Extraction (AUTOMATED in orchestrate.js)
- `orchestrate.js` now advances through ALL Swiper slides (not just slide 0) to trigger lazy loading on each
- Also extracts `background-image` URLs from Swiper slides and creates hidden `<img>` elements so extraction captures them as `src`
- Wait time increased to 3s after slide advancement for images to load

### Video/Image Fallback (AUTOMATED in generation rules)
- Always add `backgroundColor` fallback alongside `backgroundImage` or `<video>` backgrounds
- External URLs may fail (CORS, hotlink protection). Text must remain visible regardless.
- Heroes with video backgrounds need a dark fallback div behind the video element.

### Pseudo-Element Overlays (AUTOMATED in generation rules)
- **Extraction DOES capture `::before`/`::after`** — stored in `node.pseudos[]` array with full computed styles
- **GENERATION_RULES now includes global Pseudo-Element section** — instructs agents to check `pseudos` array and render overlays as absolute `<div>`
- **Card-grid hints** now specifically mention checking `pseudos` for dark overlays on background images
- **If card/image scores <30% despite this** — likely a pseudo-element the extractor missed (rare edge cases)

### Alpine.js Patterns

| Component | Pattern |
|-----------|---------|
| Hamburger | `x-data="{ menuOpen: false }"` + `@click="menuOpen = !menuOpen"` + `x-show="menuOpen"` |
| Carousel | `x-data="{ current: 0, total: N }"` + translateX + dots |
| Tabs | `x-data="{ activeTab: 0 }"` + `x-show="activeTab === N"` |
| Accordion | `x-data="{ open: false }"` + `x-show="open" x-collapse` |
| Dropdown | `x-data="{ open: false }" @mouseenter="open = true" @mouseleave="open = false"` |

---

## PHASE 5: ASSEMBLE + ASSETS + CMS

```bash
# Assembles static HTML + downloads assets + extracts CMS content
node helpers/generate-with-claude.js output/example.com --assemble --download

# Static only (skip CMS extraction)
node helpers/generate-with-claude.js output/example.com --assemble --download --static-only
```

**Outputs:**
```
output/{domain}/
├── tailwind/pages/en.html              ← STATIC output (open in browser)
├── content/                            ← CMS content (editable JSON)
│   ├── pages/en.json                   ← Page assembly (component order + meta)
│   └── components/en/*.json            ← Per-component content fields
├── templates/components/en/*.template.html  ← Templates with {{placeholders}}
└── extracted/                          ← Raw extraction data
```

### CMS Content Structure

Each component content JSON has typed fields:

| Type | Fields |
|------|--------|
| header | logo, navigationItems[], ctaButton, languageToggle |
| hero | heading, subheading, description, backgroundImage, video, cta[], stats[] |
| card-grid | sectionTitle, viewAllLink, cards[{image, heading, description, date, link}] |
| split-content | heading, description[], image, cta[], backgroundImage |
| stats | sectionTitle, items[{value, label, suffix}] |
| footer | logo, copyright, links[], socialLinks[] |
| carousel | sectionTitle, slides[{image, heading, description}] |

### CMS Render

```bash
# Renders pages from static HTML + injects data-cms-* attributes
node helpers/render-page.js output/example.com
```

Output: `rendered/en.html` — pixel-identical to static with CMS metadata.

### Templatize

```bash
# Creates {{placeholder}} templates from HTML + content JSON
node helpers/templatize.js output/example.com
```

Output: `templates/components/en/*.template.html` with `{{fields.heading}}`, `{{#each fields.cards}}`, etc.

---

## PHASE 6: VALIDATE (MANDATORY — NEVER SKIP)

```bash
# Per-component pixel comparison using Playwright — all 3 viewports
node helpers/validate-components.js output/example.com --viewport 1440 --threshold 85
```

**What it does:**
- Full-page screenshots of original site + generated HTML at desktop/tablet/mobile
- Crops each component region from full-page images
- pixelmatch comparison → exact match % per component
- Marks state-dependent components (carousel, hero, tabs, sidebar)
- Diff images saved as `validation/{viewport}/diff-*.png`
- JSON report with per-component scores
- Exit code 0 if above threshold, 1 if below
- **AOS neutralization** — removes `data-aos` attributes, forces `opacity:1 !important` on original site to prevent animation-hidden content from causing false failures

**Quality signals to watch:**
- If full-page score is >15% below per-component average → **component spacing/gaps are wrong**
- If a card/image component scores <30% → check for **missing `::before`/`::after` dark overlays**
- If header shows `hasMegaMenu: true` → **dropdown sub-nav must use navStructure from content JSON**

**Output:**
```
validation/
├── desktop/
│   ├── original-00-header.png
│   ├── generated-00-header.png
│   ├── diff-00-header.png
│   └── ...
├── tablet/
├── mobile/
└── report.json
```

---

## PHASE 6b: VISUAL VERIFICATION (MANDATORY — NEVER SKIP)

**Pixel scores alone are NOT enough.** After validation scores, MUST visually verify:

1. **Screenshot the React app** using Puppeteer MCP at `http://localhost:5174`
2. **Screenshot the original site** for side-by-side comparison
3. **Check EVERY component visually** — confirm:
   - Images actually load (not blank white space)
   - Text content is real (not placeholder/component-name)
   - Layout matches (alignment, spacing, visual hierarchy)
   - Colors and fonts match the original
4. **Flag parallax/fixed-position components** — these break pixel comparison but must still render real content
5. **NEVER fake a component** to match validator scores — if parallax breaks the crop, generate the REAL component and accept the lower score

**Anti-gaming rules:**
- A blank `<section>` matching a blank validator crop is NOT a pass — it's cheating
- A component scoring 100% with wrong text content is NOT a pass
- Every component must have visually correct content regardless of pixel score

---

## PHASE 7: FIX LOOP (ONE CATEGORY AT A TIME)

```
FOR EACH category (layout → spacing → typography → colors → images):
  1. Identify deltas visually (Puppeteer screenshot) AND from pixel scores
  2. Fix ONLY those deltas
  3. Re-validate + re-screenshot
  4. Verify BOTH pixel score improved AND visual match is correct
  5. Next category after verified
```

---

## GENERATION MODES

### Mode A: Single Page
Phases 1-7 for one page.

### Mode B: Full Website
1. DISCOVER — robots.txt → sitemap.xml → unique templates
2. Phases 1-7 for all pages

### Mode C: New Website
Skip extraction. Generate from design specs. Still validate.

---

## SOURCE FRAMEWORK DETECTION

| Mode | When | Behavior |
|------|------|----------|
| **Tailwind passthrough** | Source is Tailwind | Reuse `cls` directly. BUT always use font-size/weight/family from `s`. |
| **Convert to Tailwind** | Bootstrap/SASS/vanilla | Generate Tailwind from computed styles `s`. |
| **Preserve original** | `--preserve-classes` flag | Keep source framework classes as-is. |

---

## ALIGNMENT SYSTEM

| Type | Tailwind Pattern |
|------|------------------|
| `full-bleed` | `w-full` (no max-width) |
| `contained` | `w-full max-w-[Xpx] mx-auto px-[Xpx]` |
| `full-bleed-contained` | Outer: `w-full`, Inner: `max-w-[Xpx] mx-auto px-[Xpx]` |

---

## HELPER SCRIPTS

```
helpers/
├── discover-pages.js         ← NEW: Smart page discovery (sitemap → ~15 unique templates, multilingual)
├── orchestrate.js            ← Main orchestrator (--headed for Cloudflare, --pages for discovery)
├── examine-site.js           ← Site profiler (mega-menu detection, framework, libraries)
├── extract-layout.js         ← Layout system at 3 viewports
├── extract-design-system.js  ← Design tokens + fonts
├── extract-components.js     ← Component detection + SEO/favicon/hreflang extraction
├── extract-interactions.js   ← Hover/focus/transition extraction
├── extract-content.js        ← CMS content extraction (structured JSON per component)
├── token-miner.js            ← CIELAB color clustering
├── transform-tokens.js       ← Tokens → Tailwind config
├── generate-with-claude.js   ← --prepare (tw + screenshots + info-sheet) + --assemble + --download
├── generate-react.js         ← Scaffold (auto gaps + parallax merge + font fix + navStructure)
├── download-assets.js        ← Download fonts/images + rewrite URLs
├── validate-components.js    ← Playwright per-component pixel comparison (static HTML)
├── validate-react.js         ← Playwright React vs original (fixed port 5174, AOS neutralize)
├── export-manifest.js        ← NEW: CMS migration manifest (page manifests + component schemas)
├── render-page.js            ← CMS render (static HTML + data-cms-* attributes)
├── templatize.js             ← Creates {{placeholder}} templates from HTML + content
└── adapters/tailwind.js      ← CSS-to-Tailwind deterministic mapper (tw field)
```

## DATA FORMAT CONTRACT

```
node = {
  tag, s (kebab-case CSS), t (text), c (children),
  componentName, componentType, componentVariant, typeConfidence,
  box (x,y,w,h), pseudos, slideState,
  alignment, containerMaxWidth, contentPadding,
  cls (original classes),
  src/alt (img), href (a), svg (svg), vsrc/poster (video),
  _megaMenu (bool), _headerMeta, _footerMeta, tw (pre-computed Tailwind)
}

meta = {
  url, title, lang, dir, pageHeight, viewportWidth, viewportHeight,
  componentCount, componentNames, componentTypes,
  seo: { description, keywords, robots, canonical,
         ogTitle, ogDescription, ogImage, ogUrl, ogType, ogSiteName,
         twitterCard, twitterTitle, twitterDescription, twitterImage,
         themeColor, viewport },
  favicon, appleTouchIcon, manifest,
  hreflang: [{ lang, href }],
  jsonLd: [{ @type, ... }]
}
```

## CLI REFERENCE

```bash
# ── Discovery (NEW) ──
# Smart page discovery from sitemap — LLM picks ~15 unique templates
node helpers/discover-pages.js <url> <output-dir> [--max 15] [--lang en,ar]

# ── Extract ──
node helpers/orchestrate.js <url> <output-dir> [--paths /,/about] [--viewport 1920] [--headed]
node helpers/orchestrate.js <url> <output-dir> --pages <output-dir>/pages.json  # from discover-pages.js

# ── Tokens ──
node helpers/token-miner.js <output-dir>
node helpers/transform-tokens.js <output-dir>

# ── Prepare prompts ──
node helpers/generate-with-claude.js <output-dir> --prepare
node helpers/generate-with-claude.js <output-dir> --prepare --react

# ── Assemble + download + CMS content ──
node helpers/generate-with-claude.js <output-dir> --assemble --download

# ── Validate ──
node helpers/validate-components.js <output-dir> [--viewport 1440] [--threshold 85]
node helpers/validate-react.js <output-dir> [--threshold 75] [--page en]

# ── React output ──
node helpers/generate-react.js <output-dir> [--install] [--multi-page]
cd <output-dir>/react-app && npm run dev -- --port 5174

# ── CMS Migration (NEW) ──
# Export structured page manifests + component schemas for CMS import
node helpers/export-manifest.js <output-dir> [--lang en,ar]

# ── CMS render ──
node helpers/render-page.js <output-dir>

# ── Templatize ──
node helpers/templatize.js <output-dir>
```

## Full Pipeline — Rich Multi-Page Site

```
Phase 0: DISCOVER   → discover-pages.js (sitemap → ~15 unique templates, multilingual)
Phase 1: EXTRACT    → orchestrate.js --pages pages.json [--headed for Cloudflare]
Phase 2: TOKENS     → token-miner.js + transform-tokens.js
Phase 3: PREPARE    → generate-with-claude.js --prepare --react (tw + screenshots + info-sheet)
Phase 4: SCAFFOLD   → generate-react.js (auto gaps + parallax merge + font fix + navStructure)
Phase 5: GENERATE   → Per-component: read screenshot + prompt → generate .jsx → validate → fix
Phase 5b: ASSETS    → download-react-assets.js (download images locally, rewrite URLs in content JSONs)
Phase 6: START DEV  → npm run dev -- --port 5174
Phase 7: VALIDATE   → validate-react.js (pixel scores + visual check with Puppeteer)
Phase 8: FIX LOOP   → Fix failing components, HMR refreshes, re-validate
Phase 9: MANIFEST   → export-manifest.js (CMS-ready page manifests + component schemas)
```

## REACT OUTPUT RULES

### validate-react.js — Critical settings
- **Fixed port 5174** — validate-react.js expects Vite dev server already running on port 5174. Never starts or stops it.
- **Start Vite separately** — `cd react-app && npm run dev -- --port 5174` before running validation. Stays running with HMR.
- **Just connects** — validation only takes screenshots + pixelmatch. Fix code → HMR refreshes → re-validate instantly.
- **pixelmatch threshold: 0.30** (not 0.15) — 0.15 falsely fails font anti-aliasing differences
- **Loads viewport-specific extraction**: `page-en.json` / `page-en-768.json` / `page-en-375.json` — each used for its matching viewport's crop coordinates
- **Exact page filter**: `--page en` matches only `page-en.json` / `page-en-768.json` / `page-en-375.json` — never `page-en-contact-us.json`
- **Section detection**: uses `document.querySelectorAll('header, section, footer')` on React DOM

### React component generation rules
- Root element **MUST be `<section>`, `<header>`, or `<footer>`** — never `<div>` — or the validator cannot detect the component
- **Component identification (MANDATORY)**: Root element must have `data-component="ComponentName"` attribute + semantic CSS class (e.g. `hero-section`, `stats-section`). Never flat unnamed `<section className="w-full">`.
- CSS var opacity: **NEVER** `bg-[var(--color-x)]/40` — use `style={{ backgroundColor: 'rgba(R,G,B,A)' }}`
- Fonts: `font-['ADNOC_Sans',sans-serif]` (loaded locally via @font-face in index.css, not from CDN)
- **App.jsx comments**: `generate-react.js` auto-generates descriptive comments per component: `{/* ── ComponentName [index] type: componentType ── */}`

## TESTED SITES

| Site | Source | Components | Desktop Static Match |
|------|--------|------------|---------------------|
| taziz.com | Tailwind | 13 | 87%+ (static content) |
| adnocls.ae | Bootstrap | 13 | 87%+ (static content) |
| aldhannah.ae | Bootstrap | 9 | 87%+ (static content) |
| ppa.adnoc.ae | Vanilla CSS | 17 | 90%+ (static content) |

## QUALITY PRINCIPLES

- Exact values only — never approximate
- One phase at a time — never combine
- One site at a time — never batch
- Read fully — never skim data
- Mobile-first — base classes from 375px
- Fonts always from `s` — never rely on `cls` alone
- All collection items rendered — never show just 1
- Alpine.js for all interactions — hamburger, carousel, tabs, accordion
- Playwright validation — per-component pixel comparison
- CMS-ready — content JSON + templates + rendered HTML
