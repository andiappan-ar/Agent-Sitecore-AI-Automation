/**
 * orchestrate.js — Site-agnostic extraction orchestrator (v2)
 *
 * Launches Puppeteer, discovers pages, injects extraction scripts, saves results.
 * Imports extract-components.js and extract-design-system.js instead of inlining.
 *
 * Usage:
 *   # Auto-discover pages from sitemap
 *   node helpers/orchestrate.js https://www.example.com output/www.example.com
 *
 *   # Use a manual page list
 *   node helpers/orchestrate.js https://www.example.com output/www.example.com --pages pages.json
 *
 *   # Specify pages inline
 *   node helpers/orchestrate.js https://www.example.com output/www.example.com --paths /,/about,/contact
 *
 * Then run:
 *   python helpers/generate-blueprint.py output/www.example.com
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const BASE_URL = args[0];
const OUTPUT_DIR = args[1];

// ── Optional --viewport flag for desktop viewport width (default: 1440) ──
const vpFlagIdx = args.indexOf('--viewport');
const DESKTOP_VP = vpFlagIdx >= 0 ? parseInt(args[vpFlagIdx + 1], 10) : 1440;

if (!BASE_URL || !OUTPUT_DIR) {
  console.error('Usage: node helpers/orchestrate.js <base-url> <output-dir> [--pages file.json | --paths /,/about,/contact] [--viewport 1920]');
  process.exit(1);
}

const EXTRACTED_DIR = path.join(OUTPUT_DIR, 'extracted');
fs.mkdirSync(EXTRACTED_DIR, { recursive: true });

// ── Load extraction scripts from files ──────────────────────────────
const HELPERS_DIR = path.resolve(__dirname);
const COMPONENT_SCRIPT = fs.readFileSync(path.join(HELPERS_DIR, 'extract-components.js'), 'utf-8');
const DESIGN_SYSTEM_SCRIPT = fs.readFileSync(path.join(HELPERS_DIR, 'extract-design-system.js'), 'utf-8');
const INTERACTION_SCRIPT = fs.readFileSync(path.join(HELPERS_DIR, 'extract-interactions.js'), 'utf-8');
const LAYOUT_SCRIPT = fs.readFileSync(path.join(HELPERS_DIR, 'extract-layout.js'), 'utf-8');

// ── Interactive content detection script ────────────────────────────
// Detects tabs, accordions, and other click-to-reveal patterns in the page.
// Returns an array of interaction descriptors with click targets.
const DETECT_INTERACTIVE_SCRIPT = `(() => {
  const interactions = [];

  // ── Tab detection ──
  // Strategy 1: role="tablist" (ARIA-compliant)
  document.querySelectorAll('[role="tablist"]').forEach(tablist => {
    const section = tablist.closest('section') || tablist.closest('[class]')?.closest('section, header, footer, main > *');
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    if (tabs.length < 2) return;
    interactions.push({
      type: 'tabs',
      sectionSelector: section ? buildSelector(section) : null,
      triggers: tabs.map((tab, i) => ({
        selector: buildSelector(tab),
        text: tab.textContent.trim().substring(0, 50),
        isActive: tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active')
      }))
    });
  });

  // Strategy 2: Button groups (non-ARIA tabs) — sibling buttons where one looks "active"
  if (interactions.length === 0) {
    document.querySelectorAll('section').forEach(section => {
      const buttons = [...section.querySelectorAll('button, [role="tab"]')];
      // Group buttons that are siblings
      const groups = new Map();
      buttons.forEach(btn => {
        const parent = btn.parentElement;
        if (!parent) return;
        const key = buildSelector(parent);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(btn);
      });

      groups.forEach((btns, parentKey) => {
        if (btns.length < 2 || btns.length > 20) return;
        // Check if buttons have different styles (one "active")
        const styles = btns.map(b => getComputedStyle(b));
        const bgColors = new Set(styles.map(s => s.backgroundColor));
        const fontWeights = new Set(styles.map(s => s.fontWeight));
        if (bgColors.size > 1 || fontWeights.size > 1) {
          interactions.push({
            type: 'tabs',
            sectionSelector: buildSelector(section),
            triggers: btns.map((btn, i) => ({
              selector: buildSelector(btn),
              text: btn.textContent.trim().substring(0, 50),
              isActive: i === 0 // assume first is active; detect via style diff
            }))
          });
        }
      });
    });
  }

  // ── Accordion detection ──
  document.querySelectorAll('[aria-expanded]').forEach(trigger => {
    const section = trigger.closest('section');
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    interactions.push({
      type: 'accordion',
      sectionSelector: section ? buildSelector(section) : null,
      triggers: [{
        selector: buildSelector(trigger),
        text: trigger.textContent.trim().substring(0, 50),
        isActive: isExpanded
      }]
    });
  });

  // ── Helper: build a unique CSS selector for an element ──
  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    const path = [];
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.id) { path.unshift('#' + el.id); break; }
      const parent = el.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c.tagName === el.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(el) + 1;
          selector += ':nth-of-type(' + idx + ')';
        }
      }
      path.unshift(selector);
      el = parent;
    }
    return path.join(' > ');
  }

  return JSON.stringify(interactions);
})()`;

// ── Click-through extraction ────────────────────────────────────────
// For each detected interactive element, click non-active triggers and
// re-extract the affected section to capture hidden content.
async function extractInteractiveContent(page, componentScript, delay) {
  let interactions;
  try {
    const raw = await page.evaluate(DETECT_INTERACTIVE_SCRIPT);
    interactions = JSON.parse(raw);
  } catch (e) {
    console.log('  No interactive content detected');
    return null;
  }

  if (!interactions || interactions.length === 0) {
    return null;
  }

  console.log(`  Found ${interactions.length} interactive element(s)`);
  const tabContents = {};

  for (const interaction of interactions) {
    if (interaction.type !== 'tabs') continue;

    const sectionSel = interaction.sectionSelector;
    const contents = [];

    for (const trigger of interaction.triggers) {
      try {
        // Click the tab trigger
        await page.click(trigger.selector);
        await delay(600); // Wait for content transition

        // Re-extract just the affected section
        const sectionData = await page.evaluate((sel, script) => {
          const section = sel ? document.querySelector(sel) : null;
          if (!section) return null;
          // Use the walk function from the component script context
          // We'll do a lightweight extraction here
          const getText = (el) => {
            const parts = [];
            el.childNodes.forEach(n => {
              if (n.nodeType === 3 && n.textContent.trim()) parts.push(n.textContent.trim());
            });
            el.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,a,li,button').forEach(child => {
              const t = child.textContent.trim();
              if (t && t.length > 2) parts.push(t);
            });
            return [...new Set(parts)].join(' | ').substring(0, 500);
          };
          const getImages = (el) => {
            return [...el.querySelectorAll('img')].map(img => ({
              src: img.src, alt: img.alt || ''
            }));
          };
          const getBgImage = (el) => {
            const bg = getComputedStyle(el).backgroundImage;
            return bg !== 'none' ? bg : null;
          };

          // Find the content pane (not the tab buttons)
          const tablist = section.querySelector('[role="tablist"]');
          let contentArea = section;
          if (tablist) {
            // Content is usually a sibling of the tablist or its parent
            const tablistParent = tablist.parentElement;
            const siblings = [...tablistParent.parentElement.children];
            const tablistParentIdx = siblings.indexOf(tablistParent);
            if (tablistParentIdx < siblings.length - 1) {
              contentArea = siblings[tablistParentIdx + 1];
            }
          }

          return {
            text: getText(contentArea),
            images: getImages(contentArea),
            bgImage: getBgImage(contentArea) || getBgImage(section),
            height: contentArea.getBoundingClientRect().height
          };
        }, sectionSel);

        contents.push({
          label: trigger.text,
          isActive: trigger.isActive,
          content: sectionData
        });
        console.log(`    Tab "${trigger.text}": ${sectionData?.text?.substring(0, 60) || '(empty)'}...`);
      } catch (e) {
        console.log(`    Tab "${trigger.text}": click failed - ${e.message.substring(0, 60)}`);
      }
    }

    if (contents.length > 0 && sectionSel) {
      tabContents[sectionSel] = { type: 'tabs', tabs: contents };
    }
  }

  return Object.keys(tabContents).length > 0 ? tabContents : null;
}

// ── Page list resolution ────────────────────────────────────────────
function getManualPages() {
  const pagesIdx = args.indexOf('--pages');
  if (pagesIdx !== -1 && args[pagesIdx + 1]) {
    const pagesFile = args[pagesIdx + 1];
    const raw = JSON.parse(fs.readFileSync(pagesFile, 'utf-8'));
    // Support both flat array and { pages: [...] } from discover-pages.js
    return Array.isArray(raw) ? raw : (raw.pages || raw);
  }

  const pathsIdx = args.indexOf('--paths');
  if (pathsIdx !== -1 && args[pathsIdx + 1]) {
    return args[pathsIdx + 1].split(',').map(p => {
      const name = p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      return { name, path: p };
    });
  }

  return null;
}

// ── Sitemap discovery ───────────────────────────────────────────────
async function discoverPages(page, baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const origin = new URL(base).origin;
  const pages = [];
  const seen = new Set();

  console.log('Discovering pages...');

  // Try robots.txt for sitemap URLs
  let sitemapUrls = [];
  try {
    await page.goto(origin + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const robotsTxt = await page.evaluate(() => document.body.innerText);
    const matches = robotsTxt.match(/Sitemap:\s*(.+)/gi) || [];
    sitemapUrls = matches.map(m => m.replace(/^Sitemap:\s*/i, '').trim());
    console.log(`  Found ${sitemapUrls.length} sitemap(s) in robots.txt`);
  } catch (e) {
    console.log('  No robots.txt found, trying default sitemap');
  }

  if (sitemapUrls.length === 0) {
    sitemapUrls = [origin + '/sitemap.xml'];
  }

  // Parse sitemaps
  for (const sitemapUrl of sitemapUrls) {
    try {
      await page.goto(sitemapUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const urls = await page.evaluate(() => {
        const locs = document.querySelectorAll('loc');
        return [...locs].map(l => l.textContent.trim());
      });

      for (const url of urls) {
        // Check if it's a sub-sitemap
        if (url.endsWith('.xml')) {
          sitemapUrls.push(url);
          continue;
        }
        if (seen.has(url)) continue;
        seen.add(url);

        // Filter to same origin and base path
        if (!url.startsWith(origin)) continue;

        const urlPath = new URL(url).pathname;
        const basePath = new URL(base).pathname;
        // Only include pages under the base path
        if (!urlPath.startsWith(basePath)) continue;

        const relativePath = urlPath.substring(basePath.length) || '/';
        const name = relativePath === '/'
          ? 'home'
          : relativePath.replace(/^\//, '').replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '').substring(0, 60);

        pages.push({ name, path: relativePath, url });
      }

      console.log(`  Parsed ${sitemapUrl}: ${urls.length} URLs`);
    } catch (e) {
      console.log(`  Could not parse ${sitemapUrl}: ${e.message}`);
    }
  }

  // Fallback: just the home page
  if (pages.length === 0) {
    console.log('  No pages discovered, using homepage only');
    pages.push({ name: 'home', path: '/' });
  }

  return pages;
}

// ── Scroll to trigger lazy content ──────────────────────────────────
async function scrollPage(page) {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 200));
    }
    // Wait for lazy content + animations
    await new Promise(r => setTimeout(r, 1500));
    // Force AOS elements to visible state
    document.querySelectorAll('[data-aos]').forEach(el => {
      el.classList.add('aos-animate');
      el.style.opacity = '';
      el.style.transform = '';
    });
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
  });
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nTarget: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Desktop viewport: ${DESKTOP_VP}px\n`);

  // --headed flag: use headed mode for Cloudflare-protected sites
  const isHeaded = args.includes('--headed');
  const browser = await puppeteer.launch({
    headless: !isHeaded,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  if (isHeaded) console.log('  ℹ Headed mode: browser window open for Cloudflare bypass\n');

  const page = await browser.newPage();
  await page.setViewport({ width: DESKTOP_VP, height: 900 });

  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Resolve page list
  let pages = getManualPages();
  if (!pages) {
    pages = await discoverPages(page, BASE_URL);
  }

  console.log(`\nPages to extract: ${pages.length}`);
  pages.forEach(p => console.log(`  - ${p.name}: ${p.path}`));

  // Save page list
  fs.writeFileSync(
    path.join(EXTRACTED_DIR, 'pages.json'),
    JSON.stringify(pages, null, 2),
    'utf-8'
  );

  // ── Extract design system from homepage ───────────────────────
  console.log('\n=== Extracting design system ===');
  try {
    const homeUrl = BASE_URL.replace(/\/$/, '') + (pages[0]?.path || '/');
    await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await scrollPage(page);

    const dsResult = await page.evaluate(DESIGN_SYSTEM_SCRIPT);
    const dsPath = path.join(EXTRACTED_DIR, 'design-system.json');
    // Parse and re-stringify to validate JSON
    const dsData = JSON.parse(dsResult);
    fs.writeFileSync(dsPath, JSON.stringify(dsData, null, 2), 'utf-8');
    console.log(`  Saved: ${dsPath}`);
    console.log(`  Colors: ${dsData.colors?.length || 0}, Typography: ${dsData.typography?.length || 0}, Fonts: ${dsData.fontFaces?.length || 0}`);
  } catch (err) {
    console.error(`  ERROR extracting design system: ${err.message}`);
  }

  // ── Examine site (detect libraries, patterns, generate dynamic rules) ──
  console.log('\n=== Examining site patterns ===');
  try {
    const EXAMINE_SCRIPT = fs.readFileSync(path.join(__dirname, 'examine-site.js'), 'utf-8');
    const examResult = await page.evaluate(EXAMINE_SCRIPT);
    const examData = JSON.parse(examResult);
    const examPath = path.join(EXTRACTED_DIR, 'site-profile.json');
    fs.writeFileSync(examPath, JSON.stringify(examData, null, 2), 'utf-8');
    console.log(`  Saved: ${examPath}`);
    console.log(`  Libraries: ${Object.keys(examData.libraries || {}).join(', ') || 'none'}`);
    console.log(`  Navigation: ${examData.navigation.hasMegaMenu ? 'mega-menu' : 'simple'}, ${examData.navigation.sticky ? 'sticky' : 'static'}`);
    console.log(`  Carousel: ${examData.carouselSystem ? examData.carouselSystem.type + ' (' + examData.carouselSystem.totalSlides + ' slides)' : 'none'}`);
    console.log(`  Hidden elements: ${examData.hiddenElements.count}`);
    console.log(`  Source framework: ${examData.sourceFramework || 'vanilla'}`);
    console.log(`  Generation hints: ${examData.generationHints?.length || 0}`);
  } catch (err) {
    console.error(`  WARNING: Site examination failed: ${err.message}`);
  }

  // ── Layer 1: Extract layout at all 3 viewports ─────────────────
  console.log(`\n=== Extracting layout (3 viewports) ===`);
  const VIEWPORTS_ALL = [
    { width: DESKTOP_VP, height: 900, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 812, name: 'mobile' }
  ];
  const layoutPerVP = {};
  for (const vp of VIEWPORTS_ALL) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await delay(500);
    try {
      const layoutResult = await page.evaluate(LAYOUT_SCRIPT);
      layoutPerVP[vp.name] = JSON.parse(layoutResult);
    } catch (e) {
      console.warn(`  Layout extraction failed at ${vp.name}: ${e.message}`);
    }
  }
  // Merge layout across viewports
  const layout = {
    baselines: layoutPerVP.desktop?.baselines || layoutPerVP.tablet?.baselines || {},
    fontFaces: layoutPerVP.desktop?.fontFaces || [],
    fontStacks: layoutPerVP.desktop?.fontStacks || {},
    typeScale: layoutPerVP.desktop?.typeScale || {},
    containers: {
      desktop: layoutPerVP.desktop?.containerSystem || null,
      tablet: layoutPerVP.tablet?.containerSystem || null,
      mobile: layoutPerVP.mobile?.containerSystem || null
    },
    sections: (layoutPerVP.desktop?.sections || []).map((dSec, i) => {
      const tSec = layoutPerVP.tablet?.sections?.[i];
      const mSec = layoutPerVP.mobile?.sections?.[i];
      return {
        ...dSec,
        height: {
          desktop: dSec.height,
          tablet: tSec?.height || dSec.height,
          mobile: mSec?.height || dSec.height
        }
      };
    }),
    pageHeight: {
      desktop: layoutPerVP.desktop?.pageHeight,
      tablet: layoutPerVP.tablet?.pageHeight,
      mobile: layoutPerVP.mobile?.pageHeight
    }
  };
  fs.writeFileSync(path.join(EXTRACTED_DIR, 'layout.json'), JSON.stringify(layout, null, 2), 'utf-8');
  console.log(`  Saved: layout.json`);
  console.log(`  Container: ${layout.containers.desktop?.maxWidth || 'none'} (desktop), ${layout.containers.tablet?.maxWidth || '100%'} (tablet), ${layout.containers.mobile?.maxWidth || '100%'} (mobile)`);
  console.log(`  Sections: ${layout.sections.length}`);
  console.log(`  Font: ${layout.baselines.bodyFontFamily?.substring(0, 40)}`);

  // Restore desktop viewport
  await page.setViewport({ width: DESKTOP_VP, height: 900 });

  // ── Extract components from each page ─────────────────────────
  for (const pg of pages) {
    const url = BASE_URL.replace(/\/$/, '') + pg.path;
    console.log(`\n--- Extracting: ${pg.name} (${url}) ---`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(1000);
      await scrollPage(page);

      // Force Swiper initialization and advance through ALL slides to trigger lazy loading
      await page.evaluate(() => {
        document.querySelectorAll('.swiper, .swiper-container').forEach(el => {
          if (el.swiper) {
            const s = el.swiper;
            try { s.update(); } catch(e) {}
            // Advance through every slide to trigger lazy loading on each
            const total = s.slides?.length || 0;
            for (let i = 0; i < total; i++) {
              try { s.slideTo(i, 0); } catch(e) {}
              try { s.lazy?.loadInSlide?.(i); } catch(e) {}
            }
            // Return to first slide
            try { s.slideTo(0, 0); } catch(e) {}
          }
        });

        // Also capture background-image URLs from Swiper slides as src for extraction
        document.querySelectorAll('.swiper-slide').forEach(slide => {
          const innerEl = slide.querySelector('[style*="background-image"]') || slide;
          const bg = innerEl.style?.backgroundImage || getComputedStyle(innerEl).backgroundImage;
          if (bg && bg !== 'none') {
            const urlMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
            if (urlMatch && !slide.querySelector('img')) {
              // Create a hidden img element so extraction captures it as src
              const img = document.createElement('img');
              img.src = urlMatch[1];
              img.alt = '';
              img.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
              img.dataset.extractedBg = 'true';
              slide.appendChild(img);
            }
          }
        });

        // Force all lazy images to load
        document.querySelectorAll('img[loading="lazy"], img[data-src]').forEach(img => {
          if (img.dataset.src && !img.src) img.src = img.dataset.src;
          if (img.loading === 'lazy') img.loading = 'eager';
        });
        // Trigger intersection observers / AOS
        document.querySelectorAll('[data-aos]').forEach(el => {
          el.classList.add('aos-animate');
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      });
      await delay(3000); // Wait for lazy content + slide images to load

      // Run component extraction
      const result = await page.evaluate(COMPONENT_SCRIPT);
      const data = JSON.parse(result);

      // Run interactive content detection + click-through extraction
      const interactiveContent = await extractInteractiveContent(page, COMPONENT_SCRIPT, delay);
      if (interactiveContent) {
        data.interactiveContent = interactiveContent;
        console.log(`  Interactive content captured for ${Object.keys(interactiveContent).length} section(s)`);
      }

      // Run interaction extraction (hover rules, animations, transitions)
      try {
        const interactionResult = await page.evaluate(INTERACTION_SCRIPT);
        const interactions = JSON.parse(interactionResult);
        fs.writeFileSync(path.join(EXTRACTED_DIR, `interactions-${pg.name}.json`), JSON.stringify(interactions, null, 2), 'utf-8');
        console.log(`  Interactions: ${interactions.summary.hoverRules} hover rules, ${interactions.summary.keyframes} animations, ${interactions.summary.uniqueTransitions} transitions`);
      } catch (e) {
        console.warn(`  Interaction extraction failed (non-fatal): ${e.message}`);
      }

      const outPath = path.join(EXTRACTED_DIR, `page-${pg.name}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`  Saved: ${outPath} (${data.meta.componentCount} components: ${(data.meta.componentTypes || data.meta.componentNames).join(', ')})`);

      // Screenshot
      await page.screenshot({ path: path.join(EXTRACTED_DIR, `screenshot-${pg.name}.png`), fullPage: true });
      console.log(`  Screenshot saved`);

      // ── Multi-viewport extraction for responsive output ──────
      // Re-extract at tablet (768px) and mobile (375px) viewports
      const RESPONSIVE_VIEWPORTS = [
        { width: 768, height: 1024, name: '768' },
        { width: 375, height: 812, name: '375' }
      ];

      for (const vp of RESPONSIVE_VIEWPORTS) {
        try {
          await page.setViewport({ width: vp.width, height: vp.height });
          await delay(500); // Let layout reflow
          await scrollPage(page);

          const vpResult = await page.evaluate(COMPONENT_SCRIPT);
          const vpData = JSON.parse(vpResult);

          const vpPath = path.join(EXTRACTED_DIR, `page-${pg.name}-${vp.name}.json`);
          fs.writeFileSync(vpPath, JSON.stringify(vpData, null, 2), 'utf-8');
          console.log(`  Viewport ${vp.width}px: ${vpData.meta.componentCount} components saved`);

          // Screenshot at this viewport
          await page.screenshot({ path: path.join(EXTRACTED_DIR, `screenshot-${pg.name}-${vp.name}.png`), fullPage: true });
        } catch (vpErr) {
          console.warn(`  Viewport ${vp.width}px extraction failed: ${vpErr.message}`);
        }
      }

      // Restore desktop viewport for next page
      await page.setViewport({ width: DESKTOP_VP, height: 900 });

      // ── Cross-viewport merge ──────────────────────────────────
      try {
        const desktopData = JSON.parse(fs.readFileSync(path.join(EXTRACTED_DIR, `page-${pg.name}.json`), 'utf-8'));
        const tabletPath = path.join(EXTRACTED_DIR, `page-${pg.name}-768.json`);
        const mobilePath = path.join(EXTRACTED_DIR, `page-${pg.name}-375.json`);
        const tabletData = fs.existsSync(tabletPath) ? JSON.parse(fs.readFileSync(tabletPath, 'utf-8')) : null;
        const mobileData = fs.existsSync(mobilePath) ? JSON.parse(fs.readFileSync(mobilePath, 'utf-8')) : null;

        const merged = (desktopData.components || []).map((dComp, i) => {
          const tComp = tabletData?.components?.[i] || null;
          const mComp = mobileData?.components?.[i] || null;
          return {
            componentName: dComp.componentName,
            componentType: dComp.componentType || null,
            componentVariant: dComp.componentVariant || null,
            typeConfidence: dComp.typeConfidence || 0,
            alignment: dComp.alignment,
            containerMaxWidth: dComp.containerMaxWidth,
            contentPadding: dComp.contentPadding,
            desktop: dComp,
            tablet: tComp,
            mobile: mComp,
            viewportDiff: {
              height: `${dComp.box?.h || '?'}→${tComp?.box?.h || '?'}→${mComp?.box?.h || '?'}`,
              width: `${dComp.box?.w || '?'}→${tComp?.box?.w || '?'}→${mComp?.box?.w || '?'}`,
              alignmentConsistent: dComp.alignment === tComp?.alignment && tComp?.alignment === mComp?.alignment
            }
          };
        });

        const mergedPath = path.join(EXTRACTED_DIR, `page-${pg.name}-merged.json`);
        fs.writeFileSync(mergedPath, JSON.stringify({ meta: desktopData.meta, components: merged }, null, 2), 'utf-8');
        console.log(`  Merged: ${merged.length} components across 3 viewports`);
      } catch (mergeErr) {
        console.warn(`  Merge failed (non-fatal): ${mergeErr.message}`);
      }

    } catch (err) {
      console.error(`  ERROR on ${pg.name}: ${err.message}`);
    }

    await delay(1500); // Rate limit
  }

  await browser.close();
  console.log(`\n✓ Extraction complete. Data in: ${EXTRACTED_DIR}/`);

  console.log(`Next steps:`);
  let step = 1;
  if (process.argv.includes('--tokens')) {
    console.log(`  ${step++}. node helpers/token-miner.js ${OUTPUT_DIR}`);
    console.log(`  ${step++}. node helpers/transform-tokens.js ${OUTPUT_DIR}`);
  } else {
    console.log(`  (Optional: node helpers/token-miner.js + transform-tokens.js — add --tokens to auto-include)`);
  }
  console.log(`  ${step++}. node helpers/generate-with-claude.js ${OUTPUT_DIR} --prepare`);
  console.log(`  ${step++}. (Generate HTML for each component)`);
  console.log(`  ${step++}. node helpers/generate-with-claude.js ${OUTPUT_DIR} --assemble --download`);
}

main().catch(console.error);
