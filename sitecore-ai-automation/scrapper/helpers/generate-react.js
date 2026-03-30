#!/usr/bin/env node
/**
 * generate-react.js — Generic React+Vite+Tailwind project generator
 *
 * Reads any site's extraction + content JSON and scaffolds a full React project:
 *   output/{domain}/react-app/
 *     ├── package.json
 *     ├── vite.config.js
 *     ├── tailwind.config.js
 *     ├── postcss.config.js
 *     ├── index.html
 *     └── src/
 *         ├── main.jsx
 *         ├── App.jsx
 *         ├── index.css
 *         ├── content/{lang}/*.json   ← one per component
 *         └── components/*.jsx        ← one per component type
 *
 * Usage:
 *   node helpers/generate-react.js output/www.example.com
 *   node helpers/generate-react.js output/www.example.com --lang ar
 *   node helpers/generate-react.js output/www.example.com --install   (runs npm install)
 *
 * Multi-page (from sitemap):
 *   node helpers/generate-react.js output/www.example.com --multi-page
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CLI args ──────────────────────────────────────────────────────────────────
const siteDir = process.argv[2];
if (!siteDir) {
  console.error('Usage: node helpers/generate-react.js <output-dir>');
  process.exit(1);
}

const lang = (() => {
  const i = process.argv.indexOf('--lang');
  return i >= 0 ? process.argv[i + 1] : 'en';
})();

const doInstall = process.argv.includes('--install');
const multiPage = process.argv.includes('--multi-page');

const reactDir = path.join(siteDir, 'react-app');
const contentSrcDir = path.join(siteDir, 'content', 'components', lang);
const pagesDir = path.join(siteDir, 'content', 'pages');
const designSystemFile = path.join(siteDir, 'extracted', 'design-system.json');
const layoutFile = path.join(siteDir, 'extracted', 'layout.json');

// ─── Load data ─────────────────────────────────────────────────────────────────
function loadJSON(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

const designSystem = loadJSON(designSystemFile, {});
const layout = loadJSON(layoutFile, {});
const siteProfileFile = path.join(siteDir, 'extracted', 'site-profile.json');
const siteProfile = loadJSON(siteProfileFile, {});

// ─── Extract font info from design system ─────────────────────────────────────
// Reads ds.fontFaces (array from examine-site.js) OR ds.fonts (legacy object format).
// Downloads each font locally → src/assets/fonts/. Returns local relative paths.
// FIXES: (1) skips icon fonts for primaryFamily, (2) unifies font family names,
// (3) detects correct format from file extension, (4) uses layout.json body font as primary.
function extractFonts(ds, outputDir) {
  const fontFacesArr = ds?.fontFaces || [];
  const faces = [];
  let primaryFamily = 'sans-serif';

  // Icon font families to SKIP when determining primary font
  const ICON_FONTS = new Set([
    'font awesome', 'fontawesome', 'material icons', 'material symbols',
    'icomoon', 'swiper-icons', 'glyphicons', 'ionicons', 'feather',
  ]);
  const isIconFont = (family) => {
    const lower = family?.toLowerCase() || '';
    return ICON_FONTS.has(lower) || lower.includes('awesome') || lower.includes('icon') || lower.includes('material') || lower.includes('icomoon');
  };

  // Detect format from URL extension
  const detectFormat = (url) => {
    if (!url) return 'woff2';
    if (url.includes('.woff2')) return 'woff2';
    if (url.includes('.woff') && !url.includes('.woff2')) return 'woff';
    if (url.includes('.ttf')) return 'truetype';
    if (url.includes('.otf')) return 'opentype';
    if (url.includes('.eot')) return 'embedded-opentype';
    return 'woff2';
  };

  // Unify font family name: "ADNOC Sans Regular", "ADNOC Sans Bold" → "ADNOC Sans"
  // Strips weight keywords from family name so all weights share one @font-face family
  const unifyFamily = (family) => {
    if (!family) return family;
    return family
      .replace(/\s*(Regular|Medium|Bold|XBold|ExtraBold|SemiBold|Light|Thin|Heavy|Black|Italic|Book)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parseUrl = (srcStr) => {
    const m = srcStr && srcStr.match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : null;
  };

  const downloadFont = (url, family, weight) => {
    if (!url || !url.startsWith('http')) return url;
    const fontsDir = path.join(outputDir, 'react-app', 'src', 'assets', 'fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    const ext = url.includes('.ttf') ? '.ttf' : url.includes('.otf') ? '.otf' : '.woff2';
    const safeName = `${family.replace(/\s+/g, '-')}-${weight}${ext}`;
    const localPath = path.join(fontsDir, safeName);
    if (!fs.existsSync(localPath) || fs.statSync(localPath).size < 10000) {
      try {
        const { execSync } = require('child_process');
        execSync(`curl -k -sL --max-time 15 --referer "${new URL(url).origin}/" -o "${localPath}" "${url}"`, { stdio: 'pipe' });
        if (!fs.existsSync(localPath) || fs.statSync(localPath).size < 10000) {
          fs.existsSync(localPath) && fs.unlinkSync(localPath);
          return url; // fallback to remote URL
        }
        console.log(`  ✓ font downloaded: ${safeName}`);
      } catch { return url; }
    }
    return `./assets/fonts/${safeName}`;
  };

  // Process array format (from examine-site.js fontFaces)
  for (const face of fontFacesArr) {
    if (!face.family || face.family === 'swiper-icons') continue;
    if (isIconFont(face.family)) continue; // Skip icon fonts entirely for font-face
    const url = parseUrl(face.src);
    if (!url) continue;
    const unified = unifyFamily(face.family);
    if (!primaryFamily || primaryFamily === 'sans-serif') primaryFamily = unified;
    const localSrc = outputDir ? downloadFont(url, unified, face.weight) : url;
    const srcAttr = localSrc.startsWith('./') ? localSrc : url;
    const format = detectFormat(srcAttr);
    faces.push({ family: unified, weight: face.weight || '400', src: srcAttr, format });
  }

  // Fallback: legacy ds.fonts object format
  if (!faces.length) {
    const fonts = ds?.fonts || {};
    primaryFamily = Object.keys(fonts)[0] || 'sans-serif';
    for (const [family, weights] of Object.entries(fonts)) {
      if (isIconFont(family)) continue;
      const unified = unifyFamily(family);
      if (primaryFamily === 'sans-serif') primaryFamily = unified;
      for (const [weight, data] of Object.entries(weights)) {
        if (data?.src) faces.push({ family: unified, weight, src: data.src, format: detectFormat(data.src) });
      }
    }
  }

  // Override primaryFamily from layout.json body font if available (most accurate)
  try {
    const layoutPath = path.join(outputDir, 'extracted', 'layout.json');
    if (fs.existsSync(layoutPath)) {
      const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf-8'));
      const bodyFont = layout?.baselines?.bodyFontFamily;
      if (bodyFont) {
        // Extract first font family from the CSS font-family string
        const firstFamily = bodyFont.split(',')[0].replace(/["']/g, '').trim();
        if (firstFamily && !isIconFont(firstFamily) && firstFamily !== 'sans-serif') {
          primaryFamily = firstFamily;
          console.log(`  ✓ Primary font from layout: "${primaryFamily}"`);
        }
      }
    }
  } catch {}

  return { primaryFamily, faces };
}

// ─── Extract brand colors ──────────────────────────────────────────────────────
function extractColors(ds) {
  const colors = ds?.colors || {};
  const palette = {};
  for (const [name, value] of Object.entries(colors)) {
    // Handle both plain string and { "$value": "#hex" } formats
    palette[name] = (typeof value === 'object' && value.$value) ? value.$value : value;
  }
  return palette;
}

// ─── Resolve brand tokens from design system ─────────────────────────────────
// Returns { primary, accent, surface, text, font } resolved from actual extraction.
function resolveBrandTokens(ds) {
  const colors = ds?.colors || {};
  const semantic = ds?.semantic || ds?.semanticColors || {};

  // Helper: unwrap { "$value": "#hex" } or plain string
  const val = (v) => (v && typeof v === 'object' && v.$value) ? v.$value : (v || null);

  // Try to resolve a semantic token name through the color palette
  const resolveRef = (refStr) => {
    if (!refStr) return null;
    // Resolve {color.name} references
    const match = refStr.match(/\{color\.(.+?)\}/);
    if (match) {
      const colorVal = val(colors[match[1]]);
      return colorVal;
    }
    return refStr.startsWith('#') ? refStr : null;
  };

  // 1. Try semantic tokens first
  const semPrimary = resolveRef(val(semantic['text-primary'])) ||
                     resolveRef(val(semantic['accent'])) ||
                     resolveRef(val(semantic['brand']));
  const semAccent  = resolveRef(val(semantic['text-secondary'])) ||
                     resolveRef(val(semantic['cta'])) ||
                     resolveRef(val(semantic['highlight']));

  // 2. Heuristic fallback: scan color palette
  // Most-used dark color = primary, most-used bright/saturated color = accent
  let primary = semPrimary;
  let accent  = semAccent;

  if (!primary || !accent) {
    const hexValues = Object.values(colors)
      .map(v => typeof v === 'object' ? v.$value : v)
      .filter(v => v && /^#[0-9a-fA-F]{6}$/.test(v));

    for (const hex of hexValues) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      const brightness = (r*299 + g*587 + b*114) / 1000;
      const saturation = (Math.max(r,g,b) - Math.min(r,g,b)) / 255;

      // Dark + saturated → likely primary brand color
      if (!primary && brightness < 80 && saturation > 0.3) primary = hex;
      // Medium brightness + high saturation → likely accent/CTA
      if (!accent && brightness > 80 && brightness < 200 && saturation > 0.5) accent = hex;
    }
  }

  // Font family
  const fontFamilies = Object.keys(ds?.fonts || {});
  const font = fontFamilies[0] || 'sans-serif';

  return {
    primary: primary || '#001a70',   // fallback: deep navy
    accent:  accent  || '#00bfb2',   // fallback: teal
    surface: '#ffffff',
    font,
  };
}

// ─── Load page assembly JSON(s) ────────────────────────────────────────────────
function loadPages() {
  // Primary: content/pages/*.json
  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
    if (files.length > 0) {
      return files.map(f => loadJSON(path.join(pagesDir, f), {}));
    }
  }

  // Fallback: .claude-gen/manifest.json (produced after extract phase)
  const manifestPath = path.join(siteDir, '.claude-gen', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log('  ℹ  content/pages/ not found — falling back to .claude-gen/manifest.json');
    const manifest = loadJSON(manifestPath, { pages: [] });

    // Prefer the "-merged" page (all 3 viewports combined) for the target lang
    const targetName = `${lang}-merged`;
    const page = manifest.pages.find(p => p.name === targetName)
              || manifest.pages.find(p => p.lang === lang)
              || manifest.pages[0];
    if (!page) return [];

    // Enrich each component with componentType from .claude-gen/{pageName}/*.json
    const claudeGenDir = path.join(siteDir, '.claude-gen', page.name);
    const components = (page.components || []).map((comp, i) => {
      const jsonPath = path.join(claudeGenDir, `${comp.file}.json`);
      const compData = fs.existsSync(jsonPath) ? loadJSON(jsonPath, {}) : {};
      return {
        index: i,
        componentName: comp.name,
        componentType: compData.componentType || 'content-section',
        componentVariant: compData.componentVariant || null,
        name: comp.name,
        file: comp.file,
      };
    });

    return [{
      page: page.lang || lang,
      title: page.title || path.basename(siteDir),
      language: page.lang || lang,
      components,
    }];
  }

  return [];
}

// ─── Component type → React component name mapping ────────────────────────────
const TYPE_TO_COMPONENT = {
  'header': 'Header',
  'hero': 'Hero',
  'footer': 'Footer',
  'stats': 'Stats',
  'video-section': 'VideoSection',
  'carousel': null, // depends on variant/name
  'card-grid': 'CardGrid',
  'content-section': 'ContentSection',
  'split-content': 'SplitContent',
  'logo-cloud': 'LogoCarousel',
  'cta-banner': 'CtaBanner',
  'tabs': 'Tabs',
  'accordion': 'Accordion',
  'form': 'ContactForm',
  'table': 'DataTable',
  'gallery': 'Gallery',
  'timeline': 'Timeline',
  'testimonials': 'Testimonials',
  'pricing': 'Pricing',
  'breadcrumb': 'Breadcrumb',
  'sidebar': 'Sidebar',
  'feature-grid': 'FeatureGrid',
};

// Infer component name from component name + type
function inferComponentName(comp) {
  const name = comp.componentName || comp.name || '';
  const type = comp.componentType || comp.type || 'content-section';

  // Name-based overrides (most specific first)
  if (/news|article|latest/i.test(name)) return 'NewsCarousel';
  if (/timeline/i.test(name)) return 'TimelineCarousel';
  if (/partner|logo|brand/i.test(name)) return 'LogoCarousel';
  if (/tab.*carousel|carousel.*tab/i.test(name)) return 'TabbedCarousel';
  if (/commitment|card.*bg|bg.*card/i.test(name)) return 'CommitmentsCards';
  if (/video/i.test(name)) return 'VideoSection';
  if (/stat|insight|metric|number/i.test(name)) return 'Stats';
  if (/title.*desc|desc.*title|who.*we|about/i.test(name)) return 'ContentSection';
  if (/hero|banner/i.test(name)) return 'Hero';
  if (/header/i.test(name)) return 'Header';
  if (/footer/i.test(name)) return 'Footer';
  if (/svg|animated|string\]|broken/i.test(name)) return 'ContentSection';

  // Type-based fallback (carousel type without a name hint → generic carousel)
  if (type === 'carousel') return 'NewsCarousel';

  return TYPE_TO_COMPONENT[type] || 'ContentSection';
}

// ─── JSX GENERATORS ───────────────────────────────────────────────────────────

const JSX_TEMPLATES = {

  Header: () => `import { useState } from 'react';

export default function Header({ logo, navigationItems = [], languageToggle, ctaButton }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full absolute top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between w-full px-[16px] py-[12px] lg:px-[44px] lg:py-[24px]">
        {logo && (
          <a href="/" className="shrink-0">
            <img src={logo.src} alt={logo.alt || ''} className="h-[36px] md:h-[52px] w-auto" />
          </a>
        )}
        <nav className="hidden lg:flex items-center gap-[32px]">
          {navigationItems.filter(n => n.text).map((item, i) => (
            <a key={i} href={item.href} className="text-[15px] font-[500] text-white hover:text-[#00bfb2] transition-colors duration-200 font-['var(--font-primary)',sans-serif]">
              {item.text}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-[16px]">
          {languageToggle?.text && (
            <a href={languageToggle.href} className="hidden lg:block text-[14px] font-[500] text-white hover:text-[#00bfb2] transition-colors duration-200 border border-white/30 rounded-full px-[14px] py-[6px]">
              {languageToggle.text}
            </a>
          )}
          {ctaButton?.text && (
            <a href={ctaButton.href} className="hidden lg:block bg-[#00bfb2] text-[#001a70] text-[14px] font-[700] rounded-full px-[20px] py-[10px] hover:bg-white transition-all duration-300">
              {ctaButton.text}
            </a>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center w-[24px] h-[24px] text-white" aria-label="Menu">
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" d="M3 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1z" fill="currentColor"/></svg>
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="lg:hidden bg-white shadow-lg">
          <nav className="flex flex-col">
            {navigationItems.filter(n => n.text).map((item, i) => (
              <a key={i} href={item.href} className="block px-[24px] py-[14px] text-[15px] font-[500] text-[#001a70] border-b border-gray-100 hover:bg-gray-50">
                {item.text}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}`,

  Hero: () => `export default function Hero({ heading, subheading, description, backgroundImage, video, cta = [], stats = [] }) {
  return (
    <section className="w-full relative flex flex-col justify-center min-h-screen">
      {video?.src ? (
        <>
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
            <source src={video.src} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : backgroundImage ? (
        <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: \`url('\${backgroundImage}')\` }} />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : null}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px] pt-[120px] pb-[80px]">
        {heading && <h1 className="text-[36px] md:text-[52px] lg:text-[64px] font-[700] leading-[1.1] text-white max-w-[800px]">{heading}</h1>}
        {subheading && <h2 className="text-[20px] lg:text-[28px] font-[400] text-white/90 mt-[16px]">{subheading}</h2>}
        {description && <p className="text-[16px] lg:text-[18px] font-[400] leading-[28px] text-white/85 mt-[20px] max-w-[640px]">{description}</p>}
        {cta.filter(c => c.text).length > 0 && (
          <div className="flex flex-wrap gap-[12px] mt-[32px]">
            {cta.filter(c => c.text).map((btn, i) => (
              <a key={i} href={btn.href} className={\`inline-block px-[28px] py-[14px] rounded-full text-[15px] font-[600] transition-all duration-300 \${i === 0 ? 'bg-[#00bfb2] text-[#001a70] hover:bg-white' : 'border border-white text-white hover:bg-white hover:text-[#001a70]'}\`}>
                {btn.text}
              </a>
            ))}
          </div>
        )}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[24px] mt-[48px]">
            {stats.map((stat, i) => (
              <div key={i} className="text-white">
                <span className="text-[40px] lg:text-[56px] font-[700] leading-[1]">{stat.value}{stat.suffix}</span>
                {stat.label && <span className="text-[13px] font-[400] text-white/70 block mt-[4px] uppercase tracking-[1px]">{stat.label}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}`,

  Footer: () => `export default function Footer({ logo, copyright, links = [], socialLinks = [], disclaimerLink }) {
  const SOCIAL_ICONS = {
    linkedin: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    x: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    instagram: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    facebook: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    youtube: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>,
  };

  return (
    <footer className="w-full bg-[#001a70] text-white py-[48px] lg:py-[64px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        <div className="flex flex-col lg:flex-row gap-[40px] lg:gap-[80px]">
          <div className="shrink-0">
            {logo && <img src={logo.src} alt={logo.alt || ''} className="h-[48px] w-auto mb-[24px]" />}
            {socialLinks.length > 0 && (
              <div className="flex gap-[16px]">
                {socialLinks.map((s, i) => (
                  <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="w-[36px] h-[36px] rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00bfb2] hover:text-[#001a70] transition-all duration-300">
                    {SOCIAL_ICONS[s.platform] || s.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-[16px] lg:gap-[8px] lg:flex-col">
            {links.filter(l => l.text).map((link, i) => (
              <a key={i} href={link.href} className="text-[14px] font-[400] text-white/70 hover:text-white transition-colors duration-200">
                {link.text}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-[16px] mt-[40px] pt-[24px] border-t border-white/20">
          {copyright && <p className="text-[13px] font-[400] text-white/50">{copyright}</p>}
          {disclaimerLink?.text && (
            <a href={disclaimerLink.href} className="text-[13px] font-[400] text-white/50 hover:text-white transition-colors duration-200">
              {disclaimerLink.text}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}`,

  Stats: () => `export default function Stats({ items = [], sectionTitle }) {
  return (
    <section className="w-full bg-[#001a70] py-[48px] lg:py-[64px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        {sectionTitle && <h2 className="text-[22px] font-[700] text-white mb-[40px]">{sectionTitle}</h2>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-white/20">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center justify-center bg-[#001a70] py-[32px] px-[16px] text-center">
              <div className="flex items-end gap-[4px] mb-[8px]">
                <span className="text-[48px] md:text-[60px] font-[700] leading-[1] text-white">{item.value}</span>
                {item.suffix && <span className="text-[24px] font-[700] leading-[1.2] text-[#00bfb2] pb-[4px]">{item.suffix}</span>}
              </div>
              {item.label && <span className="text-[13px] font-[400] text-white/60 uppercase tracking-[1px]">{item.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

  ContentSection: () => `export default function ContentSection({ overline, heading, description, images = [], links = [], icon }) {
  const iconImg = icon || images[0];
  const descParas = Array.isArray(description) ? description : (description ? [description] : []);

  return (
    <section className="w-full bg-white py-[60px] lg:py-[80px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        <div className="flex flex-col lg:flex-row items-start gap-[32px] lg:gap-[64px]">
          {iconImg && (
            <div className="shrink-0">
              <img src={iconImg.src} alt={iconImg.alt || ''} className="w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] object-contain" />
            </div>
          )}
          <div className="flex flex-col gap-[16px]">
            {overline && <span className="text-[13px] font-[600] text-[#001a70] uppercase tracking-[2px]">{overline}</span>}
            {heading && <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-[700] leading-[1.2] text-[#001a70]">{heading}</h2>}
            {descParas.length > 0 && (
              <div className="flex flex-col gap-[16px]">
                {descParas.map((para, i) => para && <p key={i} className="text-[16px] lg:text-[18px] font-[400] leading-[28px] text-[#3d3d3d] max-w-[720px]">{para}</p>)}
              </div>
            )}
            {links.filter(l => l.text).length > 0 && (
              <div className="flex flex-wrap gap-[12px] mt-[8px]">
                {links.filter(l => l.text).map((link, i) => (
                  <a key={i} href={link.href} className="text-[14px] font-[600] text-[#001a70] hover:text-[#00bfb2] flex items-center gap-[6px] transition-colors duration-200">
                    {link.text}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}`,

  VideoSection: () => `import { useState } from 'react';

export default function VideoSection({ image, video, heading, playButtonLabel = 'Watch Video' }) {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="w-full relative overflow-hidden">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        {playing && video?.src ? (
          <video className="absolute inset-0 w-full h-full object-cover" src={video.src} autoPlay controls playsInline />
        ) : (
          <>
            {image && <img src={image.src} alt={image.alt || ''} className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/40" />
            {heading && (
              <div className="absolute top-[40px] left-[24px] lg:left-[64px] right-[24px]">
                <h2 className="text-[24px] lg:text-[36px] font-[700] text-white max-w-[600px]">{heading}</h2>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={() => setPlaying(true)} className="group flex flex-col items-center gap-[16px]" aria-label={playButtonLabel}>
                <div className="w-[72px] h-[72px] lg:w-[96px] lg:h-[96px] rounded-full border-2 border-white flex items-center justify-center bg-white/10 group-hover:bg-white/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" className="ml-[4px]"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <span className="text-[13px] font-[500] text-white uppercase tracking-[2px]">{playButtonLabel}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}`,

  CardGrid: () => `export default function CardGrid({ sectionTitle, cards = [], viewAllLink }) {
  return (
    <section className="w-full bg-[#f7f7f7] py-[60px] lg:py-[80px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        {sectionTitle && <h2 className="text-[28px] lg:text-[36px] font-[700] text-[#001a70] mb-[40px]">{sectionTitle}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-[8px] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
              {card.image && (
                <div className="h-[200px] overflow-hidden">
                  <img src={card.image.src} alt={card.image.alt || ''} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-[24px] flex flex-col gap-[12px] flex-1">
                {card.heading && <h3 className="text-[18px] font-[700] text-[#001a70] leading-[1.3]">{card.heading}</h3>}
                {card.description && <p className="text-[14px] font-[400] leading-[22px] text-[#555] flex-1">{card.description}</p>}
                {card.link?.text && (
                  <a href={card.link.href} className="text-[13px] font-[600] text-[#00bfb2] hover:text-[#001a70] transition-colors mt-[8px] flex items-center gap-[6px]">
                    {card.link.text}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        {viewAllLink?.text && (
          <div className="flex justify-center mt-[40px]">
            <a href={viewAllLink.href} className="inline-flex items-center gap-[8px] px-[32px] py-[14px] border border-[#001a70] text-[#001a70] text-[14px] font-[600] rounded-full hover:bg-[#001a70] hover:text-white transition-all duration-300">
              {viewAllLink.text}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}`,

  NewsCarousel: () => `import { useState } from 'react';

export default function NewsCarousel({ sectionTitle, slides = [], viewAllLink }) {
  return (
    <section className="w-full bg-white py-[60px] lg:py-[80px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        <div className="flex items-end justify-between mb-[40px]">
          {sectionTitle && <h2 className="text-[22px] md:text-[28px] font-[700] text-[#001a70] uppercase tracking-[2px]">{sectionTitle}</h2>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          {slides.map((slide, i) => (
            <a key={i} href={slide.link?.href || '#'} className="group flex flex-col bg-white border border-[#e8e8e8] rounded-[8px] overflow-hidden hover:shadow-lg transition-all duration-300">
              {slide.image && (
                <div className="overflow-hidden h-[220px]">
                  <img src={slide.image.src} alt={slide.image.alt || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="flex flex-col gap-[12px] p-[24px]">
                {slide.tag && <span className="text-[11px] font-[600] text-[#00bfb2] uppercase tracking-[2px]">{slide.tag}</span>}
                {slide.heading && <h3 className="text-[16px] font-[600] leading-[24px] text-[#001a70] group-hover:text-[#0a3299] transition-colors line-clamp-3">{slide.heading}</h3>}
                {slide.date && <span className="text-[13px] font-[400] text-[#888]">{slide.date}</span>}
              </div>
            </a>
          ))}
        </div>
        {viewAllLink?.text && (
          <div className="flex justify-center mt-[40px]">
            <a href={viewAllLink.href} className="inline-flex items-center gap-[8px] px-[32px] py-[14px] border border-[#001a70] text-[#001a70] text-[14px] font-[600] rounded-full hover:bg-[#001a70] hover:text-white transition-all duration-300">
              {viewAllLink.text}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}`,

  TimelineCarousel: () => `import { useState } from 'react';

export default function TimelineCarousel({ overline, sectionTitle, items = [] }) {
  const [active, setActive] = useState(0);
  const current = items[active];

  return (
    <section className="w-full bg-white py-[60px] lg:py-[120px] overflow-hidden">
      <div className="w-full max-w-[1440px] mx-auto px-[24px] md:px-[48px] lg:px-[156px]">
        {overline && (
          <p className="text-[14px] font-[400] uppercase tracking-[2px] text-[#001a70] mb-[16px]">{overline}</p>
        )}
        {sectionTitle && (
          <h2 className="text-[32px] md:text-[42px] lg:text-[48px] font-[400] leading-[1.1] text-[#001a70] uppercase mb-[48px] lg:mb-[80px]">{sectionTitle}</h2>
        )}
        {/* Mobile: horizontal scrolling pills */}
        <div className="lg:hidden flex gap-[8px] overflow-x-auto pb-[4px] mb-[32px]">
          {items.map((item, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={\`shrink-0 rounded-full px-[16px] py-[8px] flex items-center gap-[8px] text-[16px] font-[400] transition-all duration-300 \${active === i ? 'bg-[#001a70] text-white' : 'bg-[#9aa6cf] text-[#001a70]'}\`}>
              {item.year}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          ))}
        </div>
        {/* Mobile: active slide content */}
        {current && (
          <div className="lg:hidden flex flex-col gap-[16px]">
            <span className="text-[56px] font-[700] text-[#001a70]">{current.year}</span>
            {current.heading && <h3 className="text-[22px] font-[400] text-[#001a70] uppercase">{current.heading}</h3>}
            {current.description && <p className="text-[16px] font-[400] leading-[26px] text-[#001a70]">{current.description}</p>}
          </div>
        )}
        {/* Desktop: two-column — pills left, content right */}
        <div className="hidden lg:flex items-start gap-0">
          <div className="w-[180px] shrink-0 flex flex-col gap-[16px]">
            {items.map((item, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={\`rounded-full px-[16px] py-[8px] flex justify-between items-center gap-[10px] text-[16px] font-[400] transition-all duration-300 \${active === i ? 'bg-[#001a70] text-white' : 'bg-[#9aa6cf] text-[#001a70] hover:bg-[#00bfb2] hover:text-[#001a70]'}\`}>
                <span>{item.year}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            ))}
          </div>
          {current && (
            <div className="flex-1 pl-[40px] flex flex-col gap-[32px]">
              <span className="text-[120px] lg:text-[160px] font-[700] leading-[1] text-[#001a70] uppercase">{current.year}</span>
              {current.heading && <h3 className="text-[28px] font-[400] text-[#001a70] uppercase">{current.heading}</h3>}
              {current.description && <p className="text-[18px] font-[400] leading-[28px] text-[#001a70]">{current.description}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}`,

  LogoCarousel: () => `export default function LogoCarousel({ logos = [] }) {
  // Triplicate for seamless infinite marquee
  const allLogos = logos.length > 0 ? [...logos, ...logos, ...logos] : [];

  return (
    <section className="w-full bg-[#f7f7f7] py-[40px] overflow-hidden">
      <style>{\`
        @keyframes logo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .logo-marquee-track { animation: logo-marquee 30s linear infinite; }
        .logo-marquee-track:hover { animation-play-state: paused; }
      \`}</style>
      {logos.length === 0 ? (
        <div className="flex items-center justify-center gap-[40px] flex-wrap px-[24px] min-h-[80px]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[120px] h-[48px] bg-gray-200 rounded-[4px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex logo-marquee-track">
          {allLogos.map((logo, i) => (
            <div key={i} className="shrink-0 flex items-center justify-center px-[40px] lg:px-[60px] h-[80px]">
              <img
                src={logo.src}
                alt={logo.alt || ''}
                className="max-h-[56px] w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}`,

  TabbedCarousel: () => `import { useState } from 'react';

export default function TabbedCarousel({ sectionTitle, tabs = [], products = [], slides = [] }) {
  const [activeTab, setActiveTab] = useState(0);
  const currentSlide = slides.find(s => s.tab === activeTab) || slides[0];

  return (
    <section className="w-full bg-[#f7f7f7] py-[60px] lg:py-[80px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        {sectionTitle && <h2 className="text-[24px] md:text-[32px] lg:text-[38px] font-[700] text-[#001a70] mb-[40px] max-w-[700px]">{sectionTitle}</h2>}
        <div className="flex flex-col lg:flex-row gap-[40px]">
          <div className="lg:w-[320px] shrink-0 flex flex-col gap-[8px]">
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)} className={\`text-left px-[20px] py-[14px] rounded-[4px] text-[14px] font-[600] transition-all duration-200 \${activeTab === i ? 'bg-[#001a70] text-white' : 'bg-white text-[#001a70] hover:bg-[#e8ecf8]'}\`}>
                {tab.label}
              </button>
            ))}
            {products.length > 0 && (
              <div className="mt-[24px] flex flex-wrap gap-[8px]">
                {products.map((p, i) => (
                  <span key={i} className="px-[14px] py-[6px] rounded-full bg-[#001a70] text-white text-[12px] font-[500]">{p}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 relative overflow-hidden rounded-[8px] min-h-[280px] md:min-h-[400px]">
            {currentSlide?.image && <img src={currentSlide.image.src} alt={currentSlide.image.alt || ''} className="w-full h-full object-cover absolute inset-0" />}
          </div>
        </div>
      </div>
    </section>
  );
}`,

  CommitmentsCards: () => `export default function CommitmentsCards({ sectionTitle, cards = [] }) {
  return (
    <section className="w-full bg-white py-[60px] lg:py-[80px]">
      {sectionTitle && (
        <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px] mb-[40px]">
          <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-[700] text-[#001a70]">{sectionTitle}</h2>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {cards.map((card, i) => (
          <div key={i} className="relative flex flex-col justify-between min-h-[400px] lg:min-h-[520px] p-[40px] lg:p-[64px] overflow-hidden bg-[#001a70]">
            {card.theme === 'image' && card.image && (
              <>
                <img src={card.image.src} alt={card.image.alt || ''} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#001a70]/75" />
              </>
            )}
            <div className="relative z-10 flex flex-col gap-[24px]">
              {card.icon && <img src={card.icon.src} alt="" className="w-[56px] h-[56px]" />}
              <h3 className="text-[22px] md:text-[28px] font-[700] leading-[1.2] text-white">{card.heading}</h3>
              <div className="flex flex-col gap-[12px]">
              {(Array.isArray(card.description) ? card.description : [card.description]).filter(Boolean).map((para, j) => (
                <p key={j} className="text-[15px] font-[400] leading-[26px] text-white/80">{para}</p>
              ))}
            </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}`,

  SplitContent: () => `export default function SplitContent({ heading, description, image, cta = [], imagePosition = 'right' }) {
  const descText = Array.isArray(description) ? description : [description].filter(Boolean);
  const reversed = imagePosition === 'left';

  return (
    <section className="w-full bg-white py-[60px] lg:py-[80px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        <div className={\`flex flex-col \${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-[48px] items-center\`}>
          <div className="flex-1 flex flex-col gap-[20px]">
            {heading && <h2 className="text-[28px] lg:text-[40px] font-[700] leading-[1.2] text-[#001a70]">{heading}</h2>}
            {descText.map((d, i) => d && <p key={i} className="text-[16px] font-[400] leading-[28px] text-[#3d3d3d]">{d}</p>)}
            {cta.filter(c => c.text).length > 0 && (
              <div className="flex flex-wrap gap-[12px] mt-[8px]">
                {cta.filter(c => c.text).map((btn, i) => (
                  <a key={i} href={btn.href} className="inline-block px-[24px] py-[12px] bg-[#001a70] text-white text-[14px] font-[600] rounded-full hover:bg-[#00bfb2] hover:text-[#001a70] transition-all duration-300">{btn.text}</a>
                ))}
              </div>
            )}
          </div>
          {image && (
            <div className="flex-1 overflow-hidden rounded-[8px]">
              <img src={image.src} alt={image.alt || ''} className="w-full h-[300px] lg:h-[420px] object-cover" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}`,

  CtaBanner: () => `export default function CtaBanner({ heading, description, cta = [], backgroundImage }) {
  return (
    <section className="w-full relative py-[64px] lg:py-[96px] overflow-hidden bg-[#001a70]">
      {backgroundImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: \`url('\${backgroundImage}')\` }} />
          <div className="absolute inset-0 bg-[#001a70]/80" />
        </>
      )}
      <div className="relative z-10 w-full max-w-[800px] mx-auto px-[24px] text-center">
        {heading && <h2 className="text-[28px] lg:text-[40px] font-[700] text-white leading-[1.2] mb-[16px]">{heading}</h2>}
        {description && <p className="text-[16px] font-[400] text-white/80 leading-[28px] mb-[32px]">{Array.isArray(description) ? description.join(' ') : description}</p>}
        <div className="flex flex-wrap gap-[12px] justify-center">
          {cta.filter(c => c.text).map((btn, i) => (
            <a key={i} href={btn.href} className={\`inline-block px-[32px] py-[14px] rounded-full text-[15px] font-[600] transition-all duration-300 \${i === 0 ? 'bg-[#00bfb2] text-[#001a70] hover:bg-white' : 'border border-white text-white hover:bg-white hover:text-[#001a70]'}\`}>{btn.text}</a>
          ))}
        </div>
      </div>
    </section>
  );
}`,
};

// ─── Fallback generic component ───────────────────────────────────────────────
function buildFallbackComponent(name) {
  return `export default function ${name}({ heading, description, images = [], links = [] }) {
  const descText = Array.isArray(description) ? description.join(' ') : description;

  return (
    <section className="w-full bg-white py-[60px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        {heading && <h2 className="text-[28px] lg:text-[36px] font-[700] text-[#001a70] mb-[24px]">{heading}</h2>}
        {descText && <p className="text-[16px] text-[#555] leading-[28px] max-w-[720px]">{descText}</p>}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-[16px] mt-[24px]">
            {images.map((img, i) => (
              <img key={i} src={img.src} alt={img.alt || ''} className="max-h-[200px] object-contain" />
            ))}
          </div>
        )}
        {links.filter(l => l.text).length > 0 && (
          <div className="flex flex-wrap gap-[12px] mt-[24px]">
            {links.filter(l => l.text).map((link, i) => (
              <a key={i} href={link.href} className="text-[14px] font-[600] text-[#001a70] hover:text-[#00bfb2] underline transition-colors">{link.text}</a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}`;
}

// ─── Build package.json ────────────────────────────────────────────────────────
function buildPackageJson(domainName) {
  return {
    name: domainName.replace(/[^a-z0-9-]/gi, '-').toLowerCase() + '-react',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.4',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.49',
      tailwindcss: '^3.4.17',
      vite: '^6.0.5',
    },
  };
}

// ─── Build vite.config.js ─────────────────────────────────────────────────────
const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;

// ─── Build postcss.config.js ──────────────────────────────────────────────────
const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

// ─── Build tailwind.config.js from design system ──────────────────────────────
function buildTailwindConfig(colors) {
  const colorLines = Object.entries(colors)
    .slice(0, 10)
    .map(([k, v]) => `      '${k}': '${v}',`)
    .join('\n');

  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
${colorLines}
      },
    },
  },
  plugins: [],
}
`;
}

// ─── Build index.css from font faces + brand tokens ───────────────────────────
function buildIndexCss(fontFaces, primaryFamily, brandTokens = {}) {
  const faceRules = fontFaces.map(f => (
    `@font-face { font-family: '${f.family}'; src: url('${f.src}') format('${f.format || 'woff2'}'); font-weight: ${f.weight}; font-style: normal; }`
  )).join('\n');

  // CSS custom properties from extracted design tokens — all components reference
  // these variables so NO hex values are hardcoded anywhere in JSX.
  const cssVars = `
  --color-primary:   ${brandTokens.primary || '#001a70'};
  --color-accent:    ${brandTokens.accent  || '#00bfb2'};
  --color-surface:   ${brandTokens.surface || '#ffffff'};
  --font-primary:    '${primaryFamily}', sans-serif;`;

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${faceRules}

:root {${cssVars}
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { overflow-x: hidden; font-family: var(--font-primary); }
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }
`;
}

// ─── Build index.html ─────────────────────────────────────────────────────────
function buildIndexHtml(title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

// ─── Build main.jsx ───────────────────────────────────────────────────────────
const MAIN_JSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;

// ─── Calculate vertical gaps between components from extraction data ─────────
// Reads box.y and box.h from the desktop extraction JSON to determine the spacing
// between each component as rendered on the original site.
function calculateComponentGaps(pageName) {
  // Try to load the desktop extraction file for this page
  const extractedDir = path.join(siteDir, 'extracted');
  if (!fs.existsSync(extractedDir)) return { gaps: {}, parallaxSkip: [], parallaxBg: {} };

  const possibleFiles = [
    `page-${pageName}.json`,
    `page-${pageName}-merged.json`,
  ];
  let pageData = null;
  for (const f of possibleFiles) {
    const fp = path.join(extractedDir, f);
    if (fs.existsSync(fp)) { pageData = loadJSON(fp); break; }
  }
  if (!pageData || !pageData.components) return { gaps: {}, parallaxSkip: [], parallaxBg: {} };

  const gaps = {};
  const parallaxSkip = new Set(); // indices of position:fixed components to skip in rendering
  const parallaxBg = {}; // index → background info for the NEXT component to inherit
  const comps = pageData.components;

  for (let i = 0; i < comps.length; i++) {
    const curr = comps[i];
    // Detect parallax background components (position: fixed, usually a background image)
    if (curr.s?.position === 'fixed' && curr.box?.y === 0) {
      parallaxSkip.add(i);
      // Find background image in this component
      const findBg = (node) => {
        if (node.s?.['background-image'] && node.s['background-image'] !== 'none') return node.s['background-image'];
        if (node.c) for (const child of node.c) { const bg = findBg(child); if (bg) return bg; }
        return null;
      };
      const bgImage = findBg(curr);
      if (bgImage && i + 1 < comps.length) {
        // Give the background to the next non-fixed component
        for (let j = i + 1; j < comps.length; j++) {
          if (!parallaxSkip.has(j)) { parallaxBg[j] = bgImage; break; }
        }
      }
      console.log(`    ℹ Parallax bg detected at [${i}] — will be merged into next component`);
      continue;
    }

    // Calculate gaps (skip parallax components)
    if (i > 0 && !parallaxSkip.has(i - 1)) {
      const prev = comps[i - 1];
      if (prev.box && curr.box) {
        const gap = Math.round(curr.box.y - (prev.box.y + prev.box.h));
        if (gap > 5) gaps[i] = gap;
      }
    }
  }
  return { gaps, parallaxSkip: [...parallaxSkip], parallaxBg };
}

// ─── Build App.jsx for a single page ─────────────────────────────────────────
function buildAppJsx(pageComponents, pageLang, pageName) {
  const imports = pageComponents.map(pc => (
    `import ${pc.componentName} from './components/${pc.componentName}'`
  )).join('\n');

  const contentImports = pageComponents.map(pc => (
    `import ${pc.varName}Content from './content/${pageLang}/${pc.jsonFile}'`
  )).join('\n');

  // Calculate gaps + detect parallax components
  const { gaps, parallaxSkip, parallaxBg } = calculateComponentGaps(pageName || pageLang);
  const hasGaps = Object.keys(gaps).length > 0;
  const parallaxSet = new Set(parallaxSkip);

  const renders = pageComponents.map((pc, idx) => {
    // Skip parallax background components — their bg is merged into the next component
    if (parallaxSet.has(pc.index)) {
      return `\n      {/* ── ${pc.componentName} [${pc.index}] SKIPPED: parallax bg merged into next ── */}`;
    }

    const gap = gaps[pc.index];
    const spacer = gap ? `\n      <div style={{ marginTop: '${gap}px' }} /> {/* extracted gap: ${gap}px */}` : '';
    const compType = pc.componentType || 'section';
    const comment = `{/* ── ${pc.componentName} [${pc.index}] type: ${compType} ── */}`;
    return `${spacer}\n      ${comment}\n      <${pc.componentName} {...${pc.varName}Content.fields} />`;
  }).join('');

  if (hasGaps) {
    console.log(`    ✓ Component gaps calculated from extraction (${Object.keys(gaps).length} gaps)`);
  }
  if (parallaxSkip.length > 0) {
    console.log(`    ✓ Parallax components merged: ${parallaxSkip.length} bg components skipped`);
  }

  return `${imports}

${contentImports}

export default function App() {
  return (
    <div className="min-h-screen">
${renders}
    </div>
  )
}
`;
}

// ─── Content JSON builder ──────────────────────────────────────────────────────
function buildContentJson(comp, reactComponentName) {
  // Load the actual content JSON from the site's content directory
  const safeName = `${String(comp.index || 0).padStart(2, '0')}-${(comp.componentName || comp.name || 'component').replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40)}`;
  const contentPath = path.join(contentSrcDir, `${safeName}.json`);

  let data = null;
  if (fs.existsSync(contentPath)) {
    data = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  } else {
    // Fallback: extract REAL content from the extraction data (.claude-gen JSON)
    // This populates the content JSON with actual text, images, links from the site
    // Find extraction JSON by index prefix (handles long/truncated file names)
    const indexPrefix = `${String(comp.index || 0).padStart(2, '0')}-`;
    const searchDirs = [
      path.join(siteDir, '.claude-gen', lang),
      path.join(siteDir, '.claude-gen', `${lang}-merged`),
    ];
    let extractionData = null;
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const match = fs.readdirSync(dir).find(f => f.startsWith(indexPrefix) && f.endsWith('.json'));
      if (match) { extractionData = loadJSON(path.join(dir, match)); break; }
    }

    // ── Type-aware content extraction from DOM tree ──────────────────────────
    // Each component type gets structured fields that match what the component needs
    function extractContent(node, componentType, componentVariant) {
      const content = { texts: [], images: [], links: [], videos: [], backgroundImages: [], svgs: [] };

      // Walk all nodes and collect raw data
      function walk(n) {
        if (!n) return;
        if (n.t) content.texts.push(n.t);
        if (n.src) content.images.push({ src: n.src, alt: n.alt || '' });
        if (n.href && n.href !== '#' && !n.href.startsWith('javascript:')) content.links.push({ href: n.href, text: n.t || '' });
        if (n.vsrc) content.videos.push({ src: n.vsrc, poster: n.poster || '' });
        // Save inline SVGs as .svg files in public/assets/images/
        if (n.svg && n.svg.length > 50) {
          const svgHash = require('crypto').createHash('md5').update(n.svg).digest('hex').substring(0, 12);
          const svgFileName = `svg-${svgHash}.svg`;
          const svgDir = path.join(siteDir, 'react-app', 'public', 'assets', 'images');
          fs.mkdirSync(svgDir, { recursive: true });
          const svgPath = path.join(svgDir, svgFileName);
          if (!fs.existsSync(svgPath)) {
            fs.writeFileSync(svgPath, n.svg);
          }
          content.svgs.push({ src: `/assets/images/${svgFileName}`, original: n.svg.substring(0, 100) });
          // Also add as image so it's available in content
          content.images.push({ src: `/assets/images/${svgFileName}`, alt: '', isSvg: true });
        }
        // Capture CSS background-image URLs
        if (n.s?.['background-image'] && n.s['background-image'] !== 'none') {
          const bgMatch = n.s['background-image'].match(/url\(["']?([^"')]+)["']?\)/);
          if (bgMatch) content.backgroundImages.push(bgMatch[1]);
        }
        if (n.c) n.c.forEach(walk);
      }
      walk(node);

      // Now build type-aware structured fields
      const fields = {
        texts: content.texts,
        images: content.images,
        links: content.links,
        videos: content.videos,
        backgroundImages: content.backgroundImages,
      };

      const type = componentType || 'content-section';

      // ── HERO ──
      if (type === 'hero') {
        fields.heading = content.texts[0] || '';
        fields.subheading = content.texts[1] || '';
        // Find description (longer text, typically > 50 chars)
        fields.description = content.texts.find(t => t.length > 50) || content.texts[2] || '';
        // Background image/video
        fields.backgroundImage = content.backgroundImages[0] || content.images[0]?.src || '';
        fields.backgroundColor = node.s?.['background-color'] || '#001530';
        fields.videoSrc = content.videos[0]?.src || '';
        fields.height = node.box?.h || 900;
        // Stats: look for number patterns (digits with +/~ prefix and unit suffix)
        fields.stats = [];
        for (let i = 0; i < content.texts.length; i++) {
          const t = content.texts[i];
          // Match stat values: "+10", "6", "+3,260", "~60", "100", "TOP 5", etc
          if (/^[+~]?\d[\d,]*$/.test(t) || /^TOP\s+\d/.test(t)) {
            const unit = content.texts[i + 1] || '';
            const label = content.texts[i + 2] || '';
            // Only add if unit/label look like stat labels (short text, not a sentence)
            if (unit.length < 20 || label.length < 60) {
              fields.stats.push({ prefix: t.match(/^[+~]/)?.[0] || '', value: t.replace(/^[+~]/, ''), unit, label });
            }
          }
        }
        // CTA buttons: look for links with short text (< 30 chars) that look like buttons
        const ctaLink = content.links.find(l => l.text && l.text.length < 30 && l.text.length > 2);
        if (ctaLink) { fields.ctaText = ctaLink.text; fields.ctaHref = ctaLink.href; }
      }

      // ── SPLIT-CONTENT ──
      else if (type === 'split-content') {
        fields.heading = content.texts[0] || '';
        fields.description = content.texts.filter(t => t.length > 30).join('\n') || content.texts.slice(1).join('\n') || '';
        fields.backgroundImage = content.backgroundImages[0] || '';
        fields.backgroundColor = node.s?.['background-color'] || '#1a1a2e';
        fields.height = node.box?.h || 500;
        const ctaLink = content.links.find(l => l.text && l.text.length < 30 && l.text.length > 2);
        if (ctaLink) { fields.ctaText = ctaLink.text; fields.ctaHref = ctaLink.href; }
      }

      // ── CARD-GRID ──
      else if (type === 'card-grid') {
        fields.heading = content.texts[0] || '';
        // Extract cards: each card typically has an image + title + description
        fields.cards = [];
        // Look for child nodes that represent individual cards
        if (node.c) {
          function findCards(n, depth) {
            if (depth > 3) return;
            if (n.c && n.c.length >= 2) {
              // Check if children look like cards (have images or bg images)
              const cardLikeChildren = n.c.filter(child => {
                const hasBg = child.s?.['background-image'] && child.s['background-image'] !== 'none';
                const hasImg = child.c?.some(gc => gc.src);
                return hasBg || hasImg;
              });
              if (cardLikeChildren.length >= 2) {
                cardLikeChildren.forEach(card => {
                  const cardContent = { texts: [], images: [], backgroundImages: [], links: [] };
                  function walkCard(cn) {
                    if (cn.t) cardContent.texts.push(cn.t);
                    if (cn.src) cardContent.images.push({ src: cn.src, alt: cn.alt || '' });
                    if (cn.href && cn.href !== '#') cardContent.links.push({ href: cn.href, text: cn.t || '' });
                    if (cn.s?.['background-image'] && cn.s['background-image'] !== 'none') {
                      const m = cn.s['background-image'].match(/url\(["']?([^"')]+)["']?\)/);
                      if (m) cardContent.backgroundImages.push(m[1]);
                    }
                    if (cn.c) cn.c.forEach(walkCard);
                  }
                  walkCard(card);
                  fields.cards.push({
                    title: cardContent.texts[0] || '',
                    description: cardContent.texts.slice(1).join(' ') || '',
                    image: cardContent.images[0]?.src || '',
                    backgroundImage: cardContent.backgroundImages[0] || '',
                    href: cardContent.links[0]?.href || '',
                  });
                });
                return; // Found cards, stop recursing
              }
            }
            if (n.c) n.c.forEach(child => findCards(child, depth + 1));
          }
          findCards(node, 0);
        }
      }

      // ── STATS ──
      else if (type === 'stats') {
        fields.items = [];
        for (let i = 0; i < content.texts.length; i++) {
          const t = content.texts[i];
          if (/^[+~]?\d[\d,]*$/.test(t) || t.includes('MILLION') || t.includes('TOP')) {
            fields.items.push({ value: t, unit: content.texts[i + 1] || '', label: content.texts[i + 2] || '' });
          }
        }
        fields.backgroundImage = content.backgroundImages[0] || '';
      }

      // ── CAROUSEL ──
      else if (type === 'carousel') {
        fields.slides = [];
        // Group texts in sets of 3-4 (title, description, date, link)
        for (let i = 0; i < Math.min(content.texts.length, 20); i += 3) {
          fields.slides.push({
            title: content.texts[i] || '',
            description: content.texts[i + 1] || '',
            extra: content.texts[i + 2] || '',
            image: content.images[Math.floor(i / 3)]?.src || '',
          });
        }
      }

      // ── FOOTER ──
      else if (type === 'footer') {
        fields.heading = '';
        // Group links by column (based on x position clustering)
        fields.linkColumns = [];
        const sortedLinks = content.links.filter(l => l.text).sort((a, b) => (a.x || 0) - (b.x || 0));
        // Simple: just pass all links, let component organize them
        fields.allLinks = sortedLinks;
        fields.copyright = content.texts.find(t => t.includes('©') || t.includes('Copyright')) || '';
        fields.backgroundImage = content.backgroundImages[0] || '';
      }

      // ── ACCORDION / TABS ──
      else if (type === 'accordion' || type === 'tabs') {
        fields.heading = content.texts[0] || '';
        fields.items = [];
        // Pairs: heading + content
        for (let i = 0; i < content.texts.length - 1; i += 2) {
          fields.items.push({ title: content.texts[i], content: content.texts[i + 1] || '' });
        }
      }

      // ── VIDEO-SECTION ──
      else if (type === 'video-section') {
        fields.heading = content.texts[0] || '';
        fields.videoSrc = content.videos[0]?.src || '';
        fields.poster = content.videos[0]?.poster || content.images[0]?.src || '';
        fields.backgroundImage = content.backgroundImages[0] || '';
      }

      // ── FORM ──
      else if (type === 'form') {
        fields.heading = content.texts[0] || '';
        fields.formFields = [];
        // Look for input/textarea/select in the DOM tree
        function findFormFields(n) {
          if (n.tag === 'input' || n.tag === 'textarea' || n.tag === 'select') {
            fields.formFields.push({ type: n.type || 'text', name: n.name || '', placeholder: n.placeholder || '', required: n.required || false });
          }
          if (n.c) n.c.forEach(findFormFields);
        }
        findFormFields(node);
        fields.submitLabel = content.links.find(l => l.text?.toLowerCase().includes('submit') || l.text?.toLowerCase().includes('send'))?.text || 'Submit';
      }

      // ── BREADCRUMB ──
      else if (type === 'breadcrumb') {
        fields.items = content.links.map(l => ({ text: l.text, href: l.href }));
        if (content.texts.length > content.links.length) {
          // Last breadcrumb is current page (no link)
          fields.items.push({ text: content.texts[content.texts.length - 1], href: '' });
        }
      }

      // ── CONTENT-SECTION (fallback) ──
      else {
        fields.heading = content.texts[0] || '';
        fields.description = content.texts.filter(t => t.length > 30).join('\n') || content.texts.slice(1).join('\n') || '';
        fields.backgroundImage = content.backgroundImages[0] || '';
        const ctaLink = content.links.find(l => l.text && l.text.length < 30 && l.text.length > 2);
        if (ctaLink) { fields.ctaText = ctaLink.text; fields.ctaHref = ctaLink.href; }
      }

      return fields;
    }

    const desktopNode = extractionData?.desktop || null;
    const compType = comp.componentType || comp.type || 'content-section';
    const compVariant = comp.componentVariant || null;
    const extracted = desktopNode ? extractContent(desktopNode, compType, compVariant) : { texts: [], images: [], links: [], videos: [], backgroundImages: [] };

    data = {
      type: compType,
      fields: extracted,
      componentName: comp.componentName || comp.name,
      componentType: compType,
      componentVariant: compVariant,
    };
  }

  // ── Header/Footer variant metadata ──────────────────────────────────────────
  // Always load extraction data for variant metadata (even if content JSON existed)
  const indexPrefix = `${String(comp.index || 0).padStart(2, '0')}-`;
  const variantSearchDirs = [
    path.join(siteDir, '.claude-gen', lang),
    path.join(siteDir, '.claude-gen', `${lang}-merged`),
  ];
  let variantExtractionData = null;
  for (const dir of variantSearchDirs) {
    if (!fs.existsSync(dir)) continue;
    const match = fs.readdirSync(dir).find(f => f.startsWith(indexPrefix) && f.endsWith('.json'));
    if (match) { variantExtractionData = loadJSON(path.join(dir, match)); break; }
  }
  const extractionNode = variantExtractionData?.desktop || null;
  if (extractionNode?._headerMeta) {
    if (!data.fields) data.fields = {};
    data.fields._headerVariant = extractionNode._headerMeta.variant;
    data.fields._headerMeta = extractionNode._headerMeta;
  }
  if (extractionNode?._footerMeta) {
    if (!data.fields) data.fields = {};
    data.fields._footerVariant = extractionNode._footerMeta.variant;
    data.fields._footerMeta = extractionNode._footerMeta;
  }

  // ── Mega-menu: build navStructure from extracted links ─────────────────────
  // Groups nav links by URL path prefix to build nested dropdown structure.
  // This runs for ALL sites with hasMegaMenu — no sitemap fetch needed,
  // it uses the links already in the extraction + sitemap paths from orchestrate.
  if ((comp.componentType === 'header' || reactComponentName === 'Header') && siteProfile.navigation?.hasMegaMenu) {
    data._megaMenu = true;
    data._megaMenuCount = siteProfile.navigation.megaMenuCount;
    if (!data.fields) data.fields = {};
    data.fields._hasMegaMenu = true;

    // Build navStructure from all extracted page files in the extracted/ directory
    // Each page-*.json represents a discovered page — group by URL prefix
    const extractedPages = fs.existsSync(path.join(siteDir, 'extracted'))
      ? fs.readdirSync(path.join(siteDir, 'extracted'))
          .filter(f => f.startsWith('page-') && !f.includes('-merged') && !f.includes('-768') && !f.includes('-375') && f.endsWith('.json'))
          .map(f => {
            try {
              const pd = loadJSON(path.join(siteDir, 'extracted', f));
              return { url: pd?.meta?.url || '', title: pd?.meta?.title || '' };
            } catch { return null; }
          })
          .filter(Boolean)
      : [];

    // Also use the top-level nav links from the header extraction
    const topNavLinks = (data.fields.links || [])
      .filter(l => l.href && l.text && !l.href.includes('/ar/') && l.text !== 'العربية')
      .filter(l => {
        // Only main nav items (not utility links like News, Contact, Search)
        const path = new URL(l.href, 'https://example.com').pathname;
        const segments = path.split('/').filter(Boolean);
        return segments.length >= 2; // /en/something
      });

    // Group extracted pages by their parent nav link
    const navStructure = topNavLinks
      .filter(l => {
        // Skip utility nav items (News and Media, Contact Us)
        const p = new URL(l.href, 'https://example.com').pathname;
        return !p.includes('contact') && !p.includes('news-and-media') && !p.includes('search') && !p.includes('privacy');
      })
      .map(navLink => {
        const navPath = new URL(navLink.href, 'https://example.com').pathname.replace(/\/$/, '');
        // Find child pages that start with this path
        const children = extractedPages
          .filter(p => {
            const pPath = new URL(p.url, 'https://example.com').pathname.replace(/\/$/, '');
            return pPath.startsWith(navPath + '/') && pPath !== navPath;
          })
          .map(p => {
            const pPath = new URL(p.url, 'https://example.com').pathname;
            const slug = pPath.split('/').pop();
            const text = p.title?.replace(/ - .*$/, '') || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return { text, href: pPath };
          });

        return {
          text: navLink.text,
          href: new URL(navLink.href, 'https://example.com').pathname,
          children,
        };
      });

    if (navStructure.length > 0) {
      data.fields.navStructure = navStructure;
      console.log(`    ✓ navStructure: ${navStructure.length} top-level items, ${navStructure.reduce((s, n) => s + n.children.length, 0)} sub-links`);
    }
  }

  // ── Type-aware field reshaping ──────────────────────────────────────────────
  // If the React component is Stats but fields don't have `items`, try to build them
  if (reactComponentName === 'Stats' && !data.fields?.items) {
    const f = data.fields || {};
    const labels = Array.isArray(f.description) ? f.description : [];
    if (labels.length > 0) {
      // Build stub items from labels (values need manual entry or deeper extraction)
      data.fields = {
        items: labels.map(label => ({ value: '—', suffix: '', label })),
      };
      if (f.overline) data.fields.items.unshift({ value: '—', suffix: '', label: f.overline });
    }
  }

  // If the React component is NewsCarousel, fix slide structure (date/tag)
  if (reactComponentName === 'NewsCarousel' && data.fields?.slides) {
    const tabLabels = data.fields.tabLabels || [];
    data.fields.slides = data.fields.slides.map((slide, i) => ({
      ...slide,
      tag: slide.tag || tabLabels[i] || null,
      // description field is sometimes the date — move it if date is missing
      date: slide.date || (typeof slide.description === 'string' ? slide.description : null),
    }));
  }

  // If TimelineCarousel, ensure items structure
  if (reactComponentName === 'TimelineCarousel' && data.fields?.slides && !data.fields?.items) {
    const tabLabels = data.fields.tabLabels || [];
    const uniqueYears = [...new Set(tabLabels)];
    data.fields.items = (data.fields.slides || []).map((slide, i) => ({
      year: tabLabels[i] || String(i + 1),
      heading: slide.heading || '',
      description: slide.description || '',
    }));
  }

  return data;
}

// ─── Determine unique component name ─────────────────────────────────────────
function uniquifyName(baseName, usedNames) {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  let n = 2;
  while (usedNames.has(`${baseName}${n}`)) n++;
  const unique = `${baseName}${n}`;
  usedNames.add(unique);
  return unique;
}

// ─── Internal link rewriter ──────────────────────────────────────────────────
// Converts absolute URLs to relative paths when they point to pages we're generating.
// e.g. "https://adnoc.ae/en/our-story" → "/en/our-story" (internal <Link>)
// e.g. "https://external.com/page" → kept as-is (external <a>)
function buildLinkRewriter(pages, siteOrigin) {
  // Build set of known internal paths from our pages
  const internalPaths = new Set();
  for (const page of pages) {
    const pagePath = page.path || '';
    internalPaths.add(pagePath);
    // Also add with/without trailing slash
    internalPaths.add(pagePath.replace(/\/$/, ''));
    if (!pagePath.endsWith('/')) internalPaths.add(pagePath + '/');
  }

  // Get site origin for matching absolute URLs
  let origin = '';
  try { origin = new URL(siteOrigin || '').origin; } catch {}

  return function rewriteLink(href) {
    if (!href) return href;

    // Already a relative path
    if (href.startsWith('/')) {
      const clean = href.replace(/\/$/, '');
      // Mark as internal if it matches a page we generated
      return { href: clean || '/', isInternal: internalPaths.has(clean) || internalPaths.has(clean + '/') };
    }

    // Absolute URL to same origin → convert to relative
    if (origin && href.startsWith(origin)) {
      try {
        const urlPath = new URL(href).pathname.replace(/\/$/, '');
        return { href: urlPath || '/', isInternal: internalPaths.has(urlPath) || internalPaths.has(urlPath + '/') };
      } catch {}
    }

    // External URL
    return { href, isInternal: false };
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main() {
  console.log(`\n⚛  React Generator — ${siteDir}\n`);

  const pages = loadPages();
  if (pages.length === 0) {
    console.error('No pages found in content/pages/. Run extract-content.js first.');
    process.exit(1);
  }

  const { primaryFamily, faces } = extractFonts(designSystem, siteDir);
  const colors = extractColors(designSystem);

  const domainName = path.basename(siteDir);
  const pageTitle = pages[0]?.title || domainName;

  // Pick pages to process
  const targetPages = multiPage ? pages : [pages[0]];

  // Build link rewriter from known pages
  const siteOrigin = (() => {
    try {
      const pageData = loadJSON(path.join(siteDir, 'extracted', 'page-en.json')) || loadJSON(path.join(siteDir, 'extracted', 'page-home.json'));
      return pageData?.meta?.url ? new URL(pageData.meta.url).origin : '';
    } catch { return ''; }
  })();
  const rewriteLink = buildLinkRewriter(targetPages, siteOrigin);
  if (siteOrigin) console.log(`  ✓ Link rewriter: ${siteOrigin} → internal paths`);

  // Collect all unique component types needed
  const usedComponentNames = new Set();
  const allPageComponents = [];

  for (const page of targetPages) {
    const pageLang = page.language || lang;
    const pageComps = [];

    for (const comp of (page.components || [])) {
      const baseReactName = inferComponentName(comp);
      const reactName = uniquifyName(baseReactName, usedComponentNames);

      const varName = reactName.charAt(0).toLowerCase() + reactName.slice(1) + String(comp.index || pageComps.length);
      const jsonFile = `${reactName.toLowerCase()}-${comp.index || pageComps.length}.json`;

      pageComps.push({
        index: comp.index,
        originalName: comp.componentName || comp.name,
        componentName: reactName,
        baseComponentName: baseReactName,
        varName,
        jsonFile,
        comp,
        pageLang,
      });
    }

    allPageComponents.push({ page, pageLang, comps: pageComps });
  }

  // ── Create directory structure ──────────────────────────────────────────────
  const dirs = [
    reactDir,
    path.join(reactDir, 'src'),
    path.join(reactDir, 'src', 'components'),
    path.join(reactDir, 'src', 'content', lang),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // ── Write package.json ─────────────────────────────────────────────────────
  const pkgPath = path.join(reactDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify(buildPackageJson(domainName), null, 2));
    console.log('  ✓ package.json');
  }

  // ── Write config files ─────────────────────────────────────────────────────
  if (!fs.existsSync(path.join(reactDir, 'vite.config.js'))) {
    fs.writeFileSync(path.join(reactDir, 'vite.config.js'), VITE_CONFIG);
    console.log('  ✓ vite.config.js');
  }
  if (!fs.existsSync(path.join(reactDir, 'postcss.config.js'))) {
    fs.writeFileSync(path.join(reactDir, 'postcss.config.js'), POSTCSS_CONFIG);
    console.log('  ✓ postcss.config.js');
  }
  if (!fs.existsSync(path.join(reactDir, 'tailwind.config.js'))) {
    fs.writeFileSync(path.join(reactDir, 'tailwind.config.js'), buildTailwindConfig(colors));
    console.log('  ✓ tailwind.config.js');
  }
  if (!fs.existsSync(path.join(reactDir, 'index.html'))) {
    fs.writeFileSync(path.join(reactDir, 'index.html'), buildIndexHtml(pageTitle));
    console.log('  ✓ index.html');
  }

  // ── Resolve brand tokens from extracted design system ──────────────────────
  const brandTokens = resolveBrandTokens(designSystem);
  console.log(`\n  Brand tokens → primary: ${brandTokens.primary}  accent: ${brandTokens.accent}  font: ${brandTokens.font}`);

  // ── Write src files ────────────────────────────────────────────────────────
  if (!fs.existsSync(path.join(reactDir, 'src', 'main.jsx'))) {
    fs.writeFileSync(path.join(reactDir, 'src', 'main.jsx'), MAIN_JSX);
    console.log('  ✓ src/main.jsx');
  }
  fs.writeFileSync(path.join(reactDir, 'src', 'index.css'), buildIndexCss(faces, primaryFamily, brandTokens));
  console.log('  ✓ src/index.css');

  // Post-process helper: replace hardcoded fallback colors in templates
  // with CSS variable references. The actual color values live in index.css
  // :root block (generated from extracted design tokens) — NOT in JSX files.
  function applyTokens(jsx) {
    return jsx
      .replace(/#001a70/g, 'var(--color-primary)')
      .replace(/#00bfb2/g, 'var(--color-accent)');
  }

  // ── Write components + content JSONs ───────────────────────────────────────
  const writtenComponents = new Set();
  let componentCount = 0;
  let contentCount = 0;

  for (const { page, pageLang, comps } of allPageComponents) {
    console.log(`\n  Page: ${page.page || pageLang}`);

    for (const pc of comps) {
      // Write JSX component (once per unique name)
      if (!writtenComponents.has(pc.componentName)) {
        const compPath = path.join(reactDir, 'src', 'components', `${pc.componentName}.jsx`);
        if (!fs.existsSync(compPath)) {
          const template = JSX_TEMPLATES[pc.baseComponentName];
          const rawJsx = template ? template() : buildFallbackComponent(pc.componentName);
          const jsx = applyTokens(rawJsx);
          fs.writeFileSync(compPath, jsx);
          componentCount++;
        }
        writtenComponents.add(pc.componentName);
      }

      // Write content JSON — with internal link rewriting
      const contentPath = path.join(reactDir, 'src', 'content', pageLang, pc.jsonFile);
      const contentData = buildContentJson(pc.comp, pc.baseComponentName);

      // Rewrite links: absolute URLs → relative paths for internal pages
      if (contentData.fields?.links && Array.isArray(contentData.fields.links)) {
        contentData.fields.links = contentData.fields.links.map(link => {
          const rewritten = rewriteLink(link.href);
          return { ...link, href: rewritten.href, _internal: rewritten.isInternal };
        });
      }
      if (contentData.fields?.navStructure && Array.isArray(contentData.fields.navStructure)) {
        contentData.fields.navStructure = contentData.fields.navStructure.map(nav => ({
          ...nav,
          href: rewriteLink(nav.href).href,
          children: (nav.children || []).map(child => ({
            ...child,
            href: rewriteLink(child.href).href,
          })),
        }));
      }

      fs.writeFileSync(contentPath, JSON.stringify(contentData, null, 2));
      contentCount++;

      console.log(`    [${pc.index}] ${pc.originalName.substring(0, 30).padEnd(30)} → ${pc.componentName}.jsx`);
    }
  }

  // ── Generate page-level JSONs for DynamicPage rendering ─────────────────────
  // Each page gets a single JSON with seo + components array (type + props).
  // This enables content-separated rendering — components are pure UI, content is in JSON.
  const pageJsonDir = path.join(reactDir, 'src', 'content', 'pages');
  let pageJsonCount = 0;

  for (const { page, pageLang, comps } of allPageComponents) {
    const pageName = page.page || page.title?.toLowerCase().replace(/\s+/g, '-') || 'page';
    const langDir = path.join(pageJsonDir, pageLang);
    fs.mkdirSync(langDir, { recursive: true });

    // Load extraction meta for SEO data
    const extractedDir = path.join(siteDir, 'extracted');
    let pageMeta = {};
    const possibleMetaFiles = [`page-${pageName}.json`, `page-home.json`];
    for (const f of possibleMetaFiles) {
      const fp = path.join(extractedDir, f);
      if (fs.existsSync(fp)) {
        const d = loadJSON(fp);
        if (d?.meta) { pageMeta = d.meta; break; }
      }
    }

    // Build component entries from the page's components
    const componentEntries = comps.map(pc => {
      // Determine component type for DynamicPage COMPONENT_MAP
      const compType = pc.comp?.componentType || 'content-section';
      const variant = pc.comp?.componentVariant || null;

      // Map extraction type+variant to DynamicPage type string
      let dynamicType = compType;
      if (compType === 'hero' && variant === 'hero-centered') dynamicType = 'hero-centered';
      else if (compType === 'hero' && variant === 'hero-fullscreen') dynamicType = 'hero-fullscreen';
      else if (compType === 'hero' && variant === 'hero-video') dynamicType = 'hero';
      else if (compType === 'card-grid' && variant === 'card-vertical') dynamicType = 'card-grid-vertical';
      else if (compType === 'card-grid' && variant === 'card-text-only') dynamicType = 'breadcrumbs';
      else if (compType === 'stats') dynamicType = 'infographic';

      // Load the per-component content JSON for props
      const compContentPath = path.join(reactDir, 'src', 'content', pageLang, pc.jsonFile);
      let props = {};
      if (fs.existsSync(compContentPath)) {
        const cd = loadJSON(compContentPath);
        props = cd?.fields || {};
      }

      return { type: dynamicType, props };
    });

    const pageJson = {
      page: {
        slug: page.path || `/${pageLang}/${pageName}`,
        template: pageName,
        language: pageLang,
        direction: pageMeta.dir || 'ltr',
      },
      seo: pageMeta.seo || {
        title: pageMeta.title || page.title || pageName,
        description: null,
      },
      favicon: pageMeta.favicon || null,
      hreflang: pageMeta.hreflang || [],
      components: componentEntries,
    };

    const slug = pageName.replace(/[^a-zA-Z0-9-]/g, '-');
    fs.writeFileSync(path.join(langDir, `${slug}.json`), JSON.stringify(pageJson, null, 2));
    pageJsonCount++;
  }

  if (pageJsonCount > 0) {
    console.log(`  ✓ ${pageJsonCount} page-level JSONs written (content/pages/${lang}/)`);
  }

  // ── Write App.jsx for first page ───────────────────────────────────────────
  const firstPage = allPageComponents[0];
  const appJsx = buildAppJsx(firstPage.comps, firstPage.pageLang, firstPage.pageName || firstPage.pageLang);
  fs.writeFileSync(path.join(reactDir, 'src', 'App.jsx'), appJsx);

  console.log(`\n  ✓ ${componentCount} components written`);
  console.log(`  ✓ ${contentCount} content JSONs written`);
  console.log(`  ✓ App.jsx assembled\n`);

  // ── npm install ────────────────────────────────────────────────────────────
  if (doInstall) {
    console.log('  Installing dependencies...');
    try {
      execSync('npm install', { cwd: reactDir, stdio: 'inherit' });
      console.log('  ✓ npm install complete');
    } catch (e) {
      console.error('  ✗ npm install failed:', e.message);
    }
  }

  console.log('\n✓ React project generated successfully!\n');
  console.log('  To run:');
  console.log(`    cd ${reactDir}`);
  console.log('    npm install');
  console.log('    npm run dev\n');
}

main();
