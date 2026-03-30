# Sitecore Scrapper — Workspace Root

This is the parent workspace. Sub-projects live in their own directories.

## Sub-Projects
- `Web-To-SitecoreStructure/` — Autonomous website-to-Sitecore structure converter

## MCP Setup
Puppeteer MCP is configured in `.mcp.json` at this root. All sub-projects share it.

## Quick Start — Single Prompt

```
Extract and generate https://example.com home page — follow the 7-phase gated workflow
```

Full website:
```
Extract and generate full website https://example.com — discover pages from sitemap, follow gated phases
```

## MANDATORY WORKFLOW RULES

1. **STOP after each phase** — present output, ask to proceed. Never auto-advance.
2. **One site at a time** — complete fully before starting another.
3. **One component at a time** — read FULL data, never skim.
4. **Exact values only** — never approximate, never round.
5. **Never combine phases** — extraction and generation are ALWAYS separate.
6. **Playwright validation is MANDATORY** — per-component pixel comparison.
7. **Fix one category at a time** — layout → spacing → typography → colors.
8. **Never assume a fix worked** — always re-validate.
9. **All 3 viewports** (375, 768, desktop) for responsive generation.
10. **Mobile-first** — base classes from 375px extraction, md:/lg: for diffs only.
11. **Fonts from computed styles** — never rely on `cls` classes for typography.
12. **All collection items** — render EVERY card/slide/item, never just 1.
13. **Alpine.js for interactions** — hamburger, carousel, tabs, accordion.
14. **CMS content extraction** — structured JSON per component, auto-runs during assemble.

## Full Pipeline — Static HTML

```
Phase 1: EXTRACT    → orchestrate.js (components + types + 3 viewports)
Phase 2: TOKENS     → token-miner.js + transform-tokens.js
Phase 3: PREPARE    → generate-with-claude.js --prepare (type-aware prompts)
Phase 4: GENERATE   → Claude Code reads prompts, generates .html
Phase 5: ASSEMBLE   → generate-with-claude.js --assemble --download (static + CMS)
Phase 6: VALIDATE   → validate-components.js (Playwright pixel comparison)
Phase 7: FIX LOOP   → One category at a time, re-validate each fix
```

## React Pipeline (alternative output)

```
Phase 1: EXTRACT    → orchestrate.js (same as above)
Phase 2: SCAFFOLD   → generate-react.js output/{domain}  (Vite+React+Tailwind project)
Phase 3: PREPARE    → generate-with-claude.js output/{domain} --prepare --react
Phase 0: DISCOVER   → discover-pages.js (sitemap → ~15 unique templates, EN+AR pairs)
Phase 1: EXTRACT    → orchestrate.js --pages pages.json [--headed for Cloudflare]
Phase 2: SCAFFOLD   → generate-react.js (auto gaps + parallax merge + font fix + navStructure)
Phase 3: PREPARE    → generate-with-claude.js --prepare --react (tw + screenshots + info-sheet)
Phase 4: GENERATE   → Per-component: read screenshot + prompt → generate .jsx → validate → fix
Phase 5b: ASSETS    → download-react-assets.js (download images → public/assets/images/, rewrite URLs in content JSONs)
Phase 6: START DEV  → cd react-app && npm run dev -- --port 5174 (keep running)
Phase 6: VALIDATE   → validate-react.js (pixel scores) + Puppeteer visual check (MANDATORY)
Phase 7: FIX LOOP   → Fix failing components, HMR refreshes, re-validate + visual verify
Phase 8: MANIFEST   → export-manifest.js (CMS-ready page manifests + component schemas)
```

## Output Structure

```
output/{domain}/
├── pages.json                          ← Discovered pages (from discover-pages.js)
├── extracted/                          ← Raw extraction data + SEO + screenshots
│   ├── page-en.json                    ← Components + meta.seo + meta.favicon + meta.hreflang
│   ├── page-en-768.json                ← Tablet viewport
│   ├── page-en-375.json                ← Mobile viewport
│   ├── screenshot-en.png               ← Full-page screenshots (3 viewports)
│   ├── design-system.json              ← Colors, fonts, tokens
│   ├── layout.json                     ← Container, typography, type scale
│   └── site-profile.json              ← Libraries, framework, navigation
├── .claude-gen/                        ← Generation prompts + data
│   └── en/*.prompt.md + *.json + *.screenshot.png
├── react-app/                          ← React+Vite+Tailwind project
│   ├── src/components/*.jsx            ← JSX components (data-component + semantic class)
│   ├── src/pages/*.jsx                 ← Page assemblies (multi-page)
│   ├── src/content/*.json              ← Per-page content (real extracted data)
│   └── src/App.jsx                     ← BrowserRouter + routes
├── react-validation/                   ← Pixel comparison results
├── manifest/                           ← CMS migration data (from export-manifest.js)
│   ├── site.json                       ← Site config (languages, fonts, component types)
│   ├── pages/en/home.json             ← Page manifest (component order + typed content)
│   ├── pages/ar/home.json             ← Arabic mirror
│   └── components/*.schema.json        ← Component field schemas (for CMS setup)
├── tailwind/pages/en.html              ← Static HTML output
├── content/                            ← CMS content (editable JSON)
└── templates/                          ← {{placeholder}} templates
```

## React Component Rules (critical)
- Root element MUST be `<section>`, `<header>`, or `<footer>` — never `<div>` — so validate-react.js can detect it
- **Component identification (MANDATORY)**: Root element must have `data-component="ComponentName"` + semantic class (e.g. `hero-section`, `stats-section`, `card-grid-section`). Never flat unnamed `<section>`.
- CSS var opacity: NEVER `bg-[var(--color-x)]/40` → use `style={{ backgroundColor: 'rgba(R,G,B,A)' }}`
- Fonts: `font-['ADNOC_Sans',sans-serif]` (loaded locally from index.css)
- **App.jsx comments**: Each component has a descriptive comment: `{/* ── ComponentName [index] type: componentType ── */}`

## React Project Structure Rules
- **Pages in `src/pages/`** — page assembly components go in pages/, display components in components/. Never mix.
- **Descriptive component names** — never ContentSection1/2/3. Use names matching purpose: `StockTicker`, `BoardMembersGrid`, `NewsGrid`.
- **Rich page coverage** — analyze sitemap for ALL unique template types. Include representative from each section.
- **Multilingual** — always include at least home page in secondary language (e.g. `/ar`). Add `dir="rtl"` wrapper for Arabic.
- **Content separation** — all content in `src/content/*.json`, pages import and pass as props.

## Header/Footer Variant Detection (AUTOMATED in extraction)
- **extract-components.js** auto-detects header variants: `sticky-transparent`, `sticky-transparent-mega`, `sticky-opaque`, `sticky-opaque-mega`, `static`
- **extract-components.js** auto-detects footer variants: `multi-column`, `minimal`, `standard`
- **Metadata stored in extraction**: `_headerMeta` (isSticky, isTransparent, backgroundColor, hasMegaMenu, hasLanguageToggle, hasCTA) and `_footerMeta` (columnCount, hasNewsletter, hasSocialLinks)
- **generate-react.js** passes variant data to content JSON as `_headerVariant`, `_headerMeta`, `_footerVariant`, `_footerMeta`
- **Generation hints** tell agents to check `_headerMeta` for variant-specific styling

## Parallax Background + Overlay (AUTOMATED — merged in scaffold)
- `generate-react.js` now auto-detects `position: fixed` components at `box.y: 0` (parallax backgrounds)
- **Parallax bg components are SKIPPED** in App.jsx — their background is passed to the next component
- **No more separate empty sections** — parallax bg and overlay are effectively merged
- **Video/Image fallback**: Always add `backgroundColor` alongside `backgroundImage`/`<video>`.

## Type-Aware Content Extraction (CRITICAL — generate-react.js)
- `extractContent()` is now component-type-aware — extracts different fields per type
- **Hero**: heading, subheading, description, stats array (value/unit/label), CTA, videoSrc, backgroundImage, height
- **Split-content**: heading, description, backgroundImage (from CSS), backgroundColor, height, CTA
- **Card-grid**: cards array with title/description/image/backgroundImage/href (walks child nodes to find card patterns)
- **Stats**: items array (value/unit/label), backgroundImage
- **Footer**: allLinks, copyright, backgroundImage, linkColumns
- **Carousel**: slides array (title/description/image)
- **Video-section**: videoSrc, poster, backgroundImage
- **Form**: formFields array (type/name/placeholder), submitLabel
- **Breadcrumb**: items with text + href
- **Also captures CSS `background-image`** URLs (was previously missed — only `<img>` src was captured)
- **Fallback**: heading + description + backgroundImage + CTA for unknown types

## SVG Logos & Icons (NEVER recreate — download as files)
- **NEVER draw SVG paths manually in JSX** — they never match the original
- Inline SVGs from extraction (`node.svg`) are auto-saved as `.svg` files in `public/assets/images/`
- Reference as: `<img src="/assets/images/svg-{hash}.svg" alt="Logo" />`
- `download-react-assets.js` also downloads external SVG URLs
- **Exception:** Simple UI icons (chevrons, arrows, X, hamburger) can be inline SVG (3-4 simple paths)

## ZERO Hardcoded Content (MANDATORY for all components)
- Components are PURE UI — ALL content via props. ZERO hardcoded strings in JSX.
- ALL text → props. ALL images → props. ALL links → props. ALL data arrays → props.
- Content lives in `content/pages/{lang}/{slug}.json`, flows through DynamicPage → component props.
- Only allowed hardcoded values: Tailwind classes, color hex codes, SVG icon paths, structural HTML.
- Added to GENERATION_RULES so agents see it before generating any component.

## DynamicPage Pattern (AUTOMATED in generate-react.js)
- **Page-level JSONs auto-generated** during scaffold at `content/pages/{lang}/{slug}.json`
- Each JSON has: `page` (slug, template, language), `seo` (title, description, OG), `components` array
- Each component entry: `{ type: "hero-centered", props: { title: "...", ... } }`
- **DynamicPage.jsx** renders any page from its JSON — maps `type` to React components via `COMPONENT_MAP`
- **Page files are thin wrappers**: `import DynamicPage + import pageData → <DynamicPage pageData={pageData} />`
- **Content fully separated from components** — components are pure UI, zero content knowledge
- **CMS migration ready** — page JSONs can be imported directly into any CMS

## Internal Link Rewriting (AUTOMATED in generate-react.js)
- Content JSON links are rewritten: `https://adnoc.ae/en/our-story` → `/en/our-story` when the page exists in our React app
- Each link gets `_internal: true/false` flag — components use `<Link>` for internal, `<a>` for external
- navStructure links are also rewritten (mega-menu sub-links)
- Site origin auto-detected from extraction data

## Font System (FIXED in generate-react.js)
- **Icon fonts skipped** — Font Awesome, Material Icons, icomoon are excluded from primaryFamily selection
- **Font families unified** — "ADNOC Sans Regular/Bold/Medium" → single "ADNOC Sans" with different weights
- **Correct format detection** — `.ttf` → `format('truetype')`, `.woff2` → `format('woff2')`
- **Primary font from layout.json** — uses `baselines.bodyFontFamily` as the most accurate source

## Component Spacing Rule (AUTOMATED)
- **generate-react.js auto-calculates gaps** — reads `box.y`/`box.h` from extraction, inserts `<div style={{ marginTop: Xpx }} />` spacers in App.jsx
- **No manual spacing needed** — the scaffold handles this automatically for all sites
- **Detection** — if full-page validation score is >15% lower than per-component average, spacing is still wrong

## Mega-Menu & Hidden Nav (HOVER-EXTRACT — MANDATORY)
- **Extraction MUST hover each nav item** to capture expanded dropdown DOM (see component-info-sheet.md section 4.5)
- **Sitemap reconstruction is NOT enough** — mega-menus have section headings, descriptions, featured cards, column layouts
- **Storage**: `megaMenuData: [{ navItem, sections: [{ heading, links: [{ text, href, description }], featured }] }]`
- **Fallback**: `navStructure` from sitemap URLs (flat links) — used only if hover-extraction fails
- **Generation**: render FULL dropdown structure — headings, grouped links, featured cards. NEVER placeholder text.
- **validate-react.js** warns about mega-menu hover states (can't pixel-test default screenshots)
- **Footer secondary nav** — render ALL extracted text items, not just column headings

## Validation Port Rule
- **Always port 5174** — validate-react.js expects Vite dev server on port 5174. Never starts or stops it.
- **Start Vite separately** — run `cd react-app && npm run dev -- --port 5174` before validating. Keep it running.
- **validate-react.js just connects** — takes screenshots + pixelmatch. If port 5174 is not reachable, it exits with a helpful error message.
- **HMR flow** — fix code → Vite hot-refreshes → re-run validate → just screenshots, no restart, no rebuild.

## Content JSON Population (CRITICAL — generate-react.js)
- **generate-react.js now extracts REAL content** from `.claude-gen/` extraction JSONs when scaffold content doesn't exist
- Previously: content JSONs had `{ heading: "component-name", description: null }` — empty placeholders
- Now: walks the desktop DOM tree and extracts all `texts[]`, `images[]`, `links[]`, `videos[]` into the content JSON
- **Why this matters**: App.jsx passes content JSON as props → overrides component defaults. Empty content = empty component even if the JSX has hardcoded defaults.
- **Agent rule**: Components should use content JSON values, NOT hardcode content in JSX. If content JSON is empty, the component renders empty.

## Nested Section Tag Rule (CRITICAL for validation)
- **Never nest `<section>` inside another component's root `<section>`** — the validator uses `querySelectorAll('header, section, footer')` and nested sections create phantom entries that shift ALL subsequent index mappings
- Use `<div>` for internal structure, only the ROOT element should be `<section>`/`<header>`/`<footer>`

## Validation Quality Checks (automated in validate-react.js)
- **AOS neutralization** — removes `data-aos` attributes and forces `opacity:1` on original site screenshots
- **Spacing gap warning** — if full-page score is >15% below per-component average, prints warning: "likely SPACING/GAP issue between components"
- **Mega-menu reminder** — if site-profile.json shows `hasMegaMenu: true`, prints: "pixel validation only tests default state. Manually verify hover dropdowns work."
- **Pseudo-element overlays** — extraction doesn't capture `::before`/`::after` overlays. If a card/image component scores <30%, check for missing dark overlays on background images

## Visual Verification (MANDATORY — never skip)
- **Pixel scores alone are NOT enough** — a component can score 100% by being blank if the validator crop is also blank (parallax/fixed-position edge case)
- **After every validation run**: use Puppeteer MCP to screenshot the React output at `http://localhost:5174` and VISUALLY INSPECT it
- **Compare side-by-side** with the original site — check that every component has real content, images load, text is correct
- **NEVER fake a component** to match the validator — if parallax breaks the crop, flag it as a known limitation and generate the real component anyway
- **Components must render real content** even if the validator can't score them accurately
- **Flag parallax/fixed-position components** in the report as "visual-only verification needed"

## Reference Documents
- `Web-To-SitecoreStructure/CLAUDE.md` — Full 7-phase gated pipeline
- `Web-To-SitecoreStructure/component-info-sheet.md` — Component taxonomy (32 sections, 1811 lines) — **AUTO-INJECTED into generation prompts per componentType**
- `Web-To-SitecoreStructure/pixel-perfect-workflow/` — Pixel-perfect conversion principles

## SEO & Meta Extraction (AUTOMATED in extract-components.js)
- **Extracted per page:** title, meta description, keywords, robots, canonical URL
- **Open Graph:** og:title, og:description, og:image, og:url, og:type, og:site_name
- **Twitter Card:** twitter:card, twitter:title, twitter:description, twitter:image
- **Favicon:** link[rel=icon], apple-touch-icon, manifest.json
- **Multilingual:** all hreflang alternate links (lang + href pairs)
- **Structured data:** all JSON-LD scripts parsed as objects
- **Theme:** theme-color, viewport meta
- **Stored in:** `page-{name}.json` → `meta.seo`, `meta.favicon`, `meta.hreflang`, `meta.jsonLd`

## Component Info Sheet (AUTOMATED — cannot be forgotten)
- `generate-with-claude.js` loads `component-info-sheet.md` at startup, parses 32 sections
- Each component's `.prompt.md` gets the matching section injected (e.g., header gets "Header / Navigation", cards get "Cards")
- Mapping: `COMPONENT_TYPE_TO_SHEET` maps all 22 componentTypes to sheet sections
- **If a componentType has no matching section** — update `component-info-sheet.md` with the new type's specification
- This is code-level automation — no human memory required

## Key Technologies
- **Playwright** — Primary tool: extraction (orchestrate.js), validation, mega-menu capture, viewport-specific screenshots
- **Puppeteer MCP** — Interactive tool: visual inspection during dev, Cloudflare bypass (headed mode), quick mid-conversation screenshots
- **pixelmatch** — Per-component pixel comparison (threshold: 0.30)
- **Alpine.js** — Interactive behaviors in static HTML (hamburger, carousel, tabs)
- **React + Vite** — React output mode (JSX components + content JSON)
- **Tailwind CDN** — Styling in static HTML; PostCSS in React output
