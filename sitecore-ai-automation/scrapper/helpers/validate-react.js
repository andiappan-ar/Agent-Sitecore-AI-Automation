#!/usr/bin/env node
/**
 * validate-react.js — React app vs Original site pixel comparison
 *
 * Starts the Vite dev server for react-app/, screenshots both at 3 viewports,
 * crops each section, and pixelmatch-compares them.
 *
 * Usage:
 *   node helpers/validate-react.js output/www.taziz.com [--viewport 1440] [--threshold 75] [--page home]
 *
 * --page <name>  Filter to a specific extracted page (e.g. home, what-we-do, contact)
 *               Maps page name to React route: home→/, what-we-do→/what-we-do, etc.
 */

const { chromium } = require('playwright');

const path = require('path');
const fs = require('fs');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// ─── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const siteDir = args[0];
if (!siteDir) { console.error('Usage: node helpers/validate-react.js <output-dir> [--page <name>]'); process.exit(1); }

const vpArg = args.indexOf('--viewport');
const threshArg = args.indexOf('--threshold');
const pageArg = args.indexOf('--page');
const DESKTOP_WIDTH = vpArg >= 0 ? parseInt(args[vpArg + 1]) : 1440;
const PASS_THRESHOLD = threshArg >= 0 ? parseInt(args[threshArg + 1]) : 75;
const PAGE_FILTER = pageArg >= 0 ? args[pageArg + 1] : null; // e.g. 'home', 'what-we-do'
const REACT_PORT = 5174; // Use 5174 to avoid conflict with any running 5173

// Map page name to React route path
function pageNameToRoute(pageName) {
  if (!pageName || pageName === 'home' || pageName === 'index' || pageName === 'en') return '/';
  return '/' + pageName;
}

const VIEWPORTS = [
  { width: DESKTOP_WIDTH, height: 900, name: 'desktop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 375, height: 812, name: 'mobile' },
];

const reactDir = path.join(siteDir, 'react-app');
const extractedDir = path.join(siteDir, 'extracted');
// If --page is specified, store results under react-validation/<pageName>/
const validationDir = PAGE_FILTER
  ? path.join(siteDir, 'react-validation', PAGE_FILTER)
  : path.join(siteDir, 'react-validation');

if (!fs.existsSync(validationDir)) fs.mkdirSync(validationDir, { recursive: true });

// ─── Load extraction data ─────────────────────────────────────────────────────
// Returns { desktopData, vpData: {desktop, tablet, mobile}, originalUrl, pageName, reactRoute }
function loadPageData() {
  let allFiles = fs.readdirSync(extractedDir).filter(f =>
    f.startsWith('page-') && !f.includes('-merged') && f.endsWith('.json')
  );
  if (allFiles.length === 0) { console.error('No page files found in extracted/'); process.exit(1); }

  // Filter to specific page if --page was provided
  if (PAGE_FILTER) {
    // Exact match: page-{name}.json, page-{name}-768.json, page-{name}-375.json
    allFiles = allFiles.filter(f =>
      f === `page-${PAGE_FILTER}.json` ||
      f === `page-${PAGE_FILTER}-768.json` ||
      f === `page-${PAGE_FILTER}-375.json`
    );
    if (allFiles.length === 0) {
      console.error(`No page files matching "${PAGE_FILTER}" found in extracted/`);
      console.error('Available pages:', fs.readdirSync(extractedDir)
        .filter(f => f.startsWith('page-') && !f.includes('-merged') && !f.includes('-768') && !f.includes('-375') && f.endsWith('.json'))
        .map(f => f.replace('page-', '').replace('.json', '')).join(', '));
      process.exit(1);
    }
  }

  const readFile = (f) => JSON.parse(fs.readFileSync(path.join(extractedDir, f), 'utf-8'));

  const desktopFile = allFiles.find(f => !f.includes('-768') && !f.includes('-375'));
  const tabletFile  = allFiles.find(f => f.includes('-768'));
  const mobileFile  = allFiles.find(f => f.includes('-375'));

  const desktopData = desktopFile ? readFile(desktopFile) : null;
  const tabletData  = tabletFile  ? readFile(tabletFile)  : null;
  const mobileData  = mobileFile  ? readFile(mobileFile)  : null;

  if (!desktopData) { console.error('No desktop page file found in extracted/'); process.exit(1); }

  const originalUrl = desktopData.meta?.url || desktopData.components?.[0]?.url;

  // Determine page name from file or --page flag, then map to React route
  const pageName = PAGE_FILTER || (desktopFile ? desktopFile.replace('page-', '').replace('.json', '') : 'home');
  const reactRoute = pageNameToRoute(pageName);

  return {
    desktopData,
    vpData: { desktop: desktopData, tablet: tabletData || desktopData, mobile: mobileData || desktopData },
    originalUrl,
    pageName,
    reactRoute,
  };
}

// ─── Vite dev server — ALWAYS assumed running on port 5174 ───────────────────
// The user runs `npm run dev -- --port 5174` separately.
// This script NEVER starts or stops the server. It just connects.
// If not running, it tells you to start it.

// ─── PNG helpers ──────────────────────────────────────────────────────────────
function cropFromFullPage(fullPagePath, x, y, w, h) {
  const full = PNG.sync.read(fs.readFileSync(fullPagePath));
  const cx = Math.max(0, Math.round(x));
  const cy = Math.max(0, Math.round(y));
  const cw = Math.min(Math.round(w), full.width - cx);
  const ch = Math.min(Math.round(h), full.height - cy);
  if (cw < 10 || ch < 10) return null;

  const cropped = new PNG({ width: cw, height: ch });
  for (let row = 0; row < ch; row++) {
    for (let col = 0; col < cw; col++) {
      const si = ((cy + row) * full.width + (cx + col)) * 4;
      const di = (row * cw + col) * 4;
      cropped.data[di] = full.data[si];
      cropped.data[di + 1] = full.data[si + 1];
      cropped.data[di + 2] = full.data[si + 2];
      cropped.data[di + 3] = full.data[si + 3];
    }
  }
  return cropped;
}

function cropPNG(png, tw, th) {
  if (png.width === tw && png.height === th) return png;
  const c = new PNG({ width: tw, height: th });
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const si = (y * png.width + x) * 4;
      const di = (y * tw + x) * 4;
      c.data[di] = png.data[si]; c.data[di+1] = png.data[si+1]; c.data[di+2] = png.data[si+2]; c.data[di+3] = png.data[si+3];
    }
  }
  return c;
}

function comparePNGs(png1, png2, diffPath) {
  const w = Math.min(png1.width, png2.width);
  const h = Math.min(png1.height, png2.height);
  if (w < 10 || h < 10) return { matchPercent: 0, error: 'Too small' };

  const c1 = cropPNG(png1, w, h);
  const c2 = cropPNG(png2, w, h);
  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(c1.data, c2.data, diff.data, w, h, { threshold: 0.30, alpha: 0.3 });
  if (diffPath) fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const total = w * h;
  return { matchPercent: Math.round((1 - diffPixels / total) * 10000) / 100, diffPixels, total, w, h };
}

// ─── Screenshot helpers ───────────────────────────────────────────────────────
async function screenshotPage(browser, url, vpWidth, vpHeight, outPath) {
  const ctx = await browser.newContext({ viewport: { width: vpWidth, height: vpHeight } });
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Wait for React to mount — body must be taller than the viewport.
  // Without this, the scroll loop exits immediately (scrollHeight === viewportHeight)
  // and the screenshot captures a white pre-render frame.
  try {
    await page.waitForFunction(
      (minH) => document.body.scrollHeight > minH,
      vpHeight + 100,
      { timeout: 8000 }
    );
  } catch (_) { /* page may genuinely be short */ }
  await page.waitForTimeout(500);

  // Scroll to trigger lazy loading
  await page.evaluate(() => new Promise(resolve => {
    let t = 0;
    const s = window.innerHeight;
    const timer = setInterval(() => {
      window.scrollBy(0, s);
      t += s;
      if (t >= document.body.scrollHeight) {
        clearInterval(timer);
        window.scrollTo(0, 0);
        setTimeout(resolve, 800);
      }
    }, 150);
  }));

  // Pause all videos to get deterministic frames (video playback causes unstable scores)
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach(v => {
      v.pause();
      try { if (v.readyState >= 2) v.currentTime = 0; } catch (_) {}
    });
    // Force ALL AOS animations to completed state
    // 1. Disable AOS completely
    try {
      if (window.AOS) { window.AOS.init({ disable: true }); }
    } catch (_) {}
    // 2. Remove all AOS attributes, classes, and inline styles to neutralize AOS CSS
    document.querySelectorAll('[data-aos], .aos-init, .aos-animate').forEach(el => {
      el.removeAttribute('data-aos');
      el.removeAttribute('data-aos-delay');
      el.removeAttribute('data-aos-duration');
      el.removeAttribute('data-aos-offset');
      el.classList.remove('aos-init');
      el.classList.add('aos-animate');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('transition', 'none', 'important');
    });
    // 3. Override AOS stylesheet rules via injected style
    const aosOverride = document.createElement('style');
    aosOverride.textContent = '[data-aos], .aos-init, .aos-animate { opacity: 1 !important; transform: none !important; visibility: visible !important; transition: none !important; }';
    document.head.appendChild(aosOverride);
  });
  await page.waitForTimeout(400);

  await page.screenshot({ path: outPath, fullPage: true });

  // Return section positions from React app (section elements)
  const sections = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('header, section, footer'));
    return els.map((el, i) => {
      const r = el.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        y: r.top + scrollY,
        height: el.scrollHeight || r.height,
        width: el.width || document.documentElement.scrollWidth,
      };
    });
  });

  await ctx.close();
  return sections;
}

// ─── Get component bounding boxes from extraction data ────────────────────────
function getComponentBoxes(components, vpWidth) {
  return components.map((comp, i) => {
    const box = comp.box || {};
    // Scale x if viewport differs
    return {
      index: i,
      name: comp.componentName || `comp-${i}`,
      type: comp.componentType || 'unknown',
      x: 0, // always compare full width
      y: box.y || 0,
      height: box.h || 200,
    };
  }).filter(c => c.height > 20);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { desktopData, vpData, originalUrl, pageName, reactRoute } = loadPageData();

  // Try to get URL from extraction
  let url = originalUrl || desktopData?.meta?.url;
  if (!url) {
    // Try pages.json
    const pagesFile = path.join(extractedDir, 'pages.json');
    if (fs.existsSync(pagesFile)) {
      const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf-8'));
      url = pages[0]?.url;
    }
  }
  if (!url) { console.error('No original URL found. Check extraction data.'); process.exit(1); }

  const reactUrl = `http://localhost:${REACT_PORT}${reactRoute}`;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  React Validation — vs Original Site             ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Page:      ${pageName.substring(0, 40).padEnd(40)}║`);
  console.log(`║  Original:  ${url.substring(0, 40).padEnd(40)}║`);
  console.log(`║  React app: ${reactUrl.substring(0, 40).padEnd(40)}║`);
  console.log(`║  Threshold: ${String(PASS_THRESHOLD + '%').padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Check Vite dev server is running on port 5174 — never start/stop it
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${REACT_PORT}/`, (res) => { res.resume(); resolve(); });
      req.on('error', () => reject());
      req.setTimeout(3000, () => { req.destroy(); reject(); });
    });
    console.log(`  ✓ Vite dev server reachable on port ${REACT_PORT}\n`);
  } catch {
    console.error(`  ✗ Vite dev server not running on port ${REACT_PORT}`);
    console.error(`    Start it first:  cd ${reactDir} && npm run dev -- --port ${REACT_PORT}`);
    process.exit(1);
  }
  const finalReactUrl = `http://localhost:${REACT_PORT}${reactRoute}`;

  const browser = await chromium.launch({ headless: true });
  const report = {
    url,
    reactUrl: finalReactUrl,
    pageName,
    timestamp: new Date().toISOString(),
    threshold: PASS_THRESHOLD,
    viewports: {},
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n━━━ ${vp.name} (${vp.width}×${vp.height}) ━━━`);
      const vpDir = path.join(validationDir, vp.name);
      if (!fs.existsSync(vpDir)) fs.mkdirSync(vpDir, { recursive: true });

      // Screenshot original
      console.log('  📸 Original site...');
      const origFullPath = path.join(vpDir, 'original-full.png');
      await screenshotPage(browser, url, vp.width, vp.height, origFullPath);

      // Screenshot React app + get section positions
      console.log('  📸 React app...');
      const reactFullPath = path.join(vpDir, 'react-full.png');
      const reactSections = await screenshotPage(browser, finalReactUrl, vp.width, vp.height, reactFullPath);

      // Use viewport-specific extraction data for correct box positions
      const vpName2 = vp.name; // 'desktop' | 'tablet' | 'mobile'
      const vpExtract = vpData[vpName2] || vpData.desktop;

      // Filter out tiny extraction components (height < 30px) BEFORE index matching
      // so that spurious small elements (SVG icons etc.) don't misalign all comparisons
      const validExtComps = vpExtract.components.filter(c => (c.box?.h || 0) >= 30);

      console.log(`\n  Sections found in React: ${reactSections.length}`);
      console.log(`  Components in extraction: ${vpExtract.components.length} (${validExtComps.length} valid ≥30px)`);

      // Compare full-page first
      const origFull = PNG.sync.read(fs.readFileSync(origFullPath));
      const reactFull = PNG.sync.read(fs.readFileSync(reactFullPath));
      const fullDiffPath = path.join(vpDir, 'diff-full.png');
      const fullResult = comparePNGs(origFull, reactFull, fullDiffPath);
      console.log(`\n  Full-page match: ${fullResult.matchPercent}%\n`);

      // Per-section comparison: extraction box → original crop, React DOM → react crop
      // Match by index so each section N is compared to component N regardless of y-offset drift
      const sectionResults = [];
      const n = Math.min(reactSections.length, validExtComps.length);

      for (let idx = 0; idx < n; idx++) {
        const reactSection = reactSections[idx];
        const origComp = validExtComps[idx];
        if (!reactSection || !origComp) continue;

        // Skip tiny sections
        const reactH = reactSection.height;
        const origBox = origComp.box || {};
        const origH = origBox.h || 0;
        if (reactH < 30 || origH < 30) continue;

        const compName = (origComp.componentName || origComp.name || `comp${idx}`).replace(/[^a-zA-Z0-9-_]/g,'_').substring(0, 25);
        const label = `${String(idx).padStart(2,'0')}-${compName}`;

        // Crop from original using extraction bounding box Y (at desktop viewport)
        const origCrop = cropFromFullPage(origFullPath, 0, origBox.y || 0, vp.width, origH);
        // Crop from React using live DOM Y position
        const reactCrop = cropFromFullPage(reactFullPath, 0, reactSection.y, vp.width, reactH);

        if (!origCrop || !reactCrop) continue;

        const diffPath = path.join(vpDir, `diff-${label}.png`);
        fs.writeFileSync(path.join(vpDir, `orig-${label}.png`), PNG.sync.write(origCrop));
        fs.writeFileSync(path.join(vpDir, `react-${label}.png`), PNG.sync.write(reactCrop));
        const result = comparePNGs(origCrop, reactCrop, diffPath);

        const status = result.matchPercent >= PASS_THRESHOLD ? '✅' : '⚠️ ';
        const origType = (origComp.componentType || 'unknown').padEnd(14);
        console.log(`  ${status} [${String(idx).padStart(2,'0')}] ${origType} orig:${String(Math.round(origH)).padStart(4)}px react:${String(Math.round(reactH)).padStart(4)}px → ${result.matchPercent}%`);

        sectionResults.push({ label, origY: origBox.y, reactY: reactSection.y, origH, reactH, matchPercent: result.matchPercent, type: origComp.componentType });
      }

      const passing = sectionResults.filter(r => r.matchPercent >= PASS_THRESHOLD).length;
      const avg = sectionResults.length > 0
        ? Math.round(sectionResults.reduce((s, r) => s + r.matchPercent, 0) / sectionResults.length)
        : 0;

      console.log(`\n  Summary: ${passing}/${sectionResults.length} sections pass  |  avg ${avg}%  |  full-page ${fullResult.matchPercent}%`);

      report.viewports[vp.name] = {
        fullPageMatch: fullResult.matchPercent,
        avgSectionMatch: avg,
        passingSections: passing,
        totalSections: sectionResults.length,
        sections: sectionResults,
      };
    }
  } finally {
    await browser.close();
  }

  // Write report
  const reportPath = path.join(validationDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  RESULTS                                         ║');
  console.log('╠══════════════════════════════════════════════════╣');
  for (const [vpName, vpData] of Object.entries(report.viewports)) {
    const line = `  ${vpName.padEnd(8)} full: ${String(vpData.fullPageMatch + '%').padEnd(8)} sections: ${vpData.passingSections}/${vpData.totalSections} (avg ${vpData.avgSectionMatch}%)`;
    console.log(`║${line.padEnd(50)}║`);
  }
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Report: ${reportPath.substring(0, 42).padEnd(42)}║`);
  console.log('╚══════════════════════════════════════════════════╝');

  // ── Quality warnings ──────────────────────────────────────────────────────
  const warnings = [];

  // Spacing gap detection: full-page score significantly lower than per-component average
  for (const [vpName, vpData] of Object.entries(report.viewports)) {
    const gap = vpData.avgSectionMatch - vpData.fullPageMatch;
    if (gap > 15) {
      warnings.push(`⚠ ${vpName}: full-page (${vpData.fullPageMatch}%) is ${Math.round(gap)}% below component avg (${vpData.avgSectionMatch}%) → likely SPACING/GAP issue between components`);
    }
  }

  // Mega-menu reminder: check site-profile for hasMegaMenu
  const siteProfilePath = path.join(siteDir, 'extracted', 'site-profile.json');
  if (fs.existsSync(siteProfilePath)) {
    try {
      const profile = JSON.parse(fs.readFileSync(siteProfilePath, 'utf-8'));
      if (profile.navigation?.hasMegaMenu) {
        warnings.push(`ℹ Site has mega-menu (${profile.navigation.megaMenuCount} dropdowns) — pixel validation only tests default state. Manually verify hover dropdowns work.`);
      }
    } catch {}
  }

  // Blank component detection: React section with 100% score but very different height from original
  // OR high score on a component where original has rich content but React is suspiciously small
  const desktopVp = report.viewports?.desktop;
  if (desktopVp?.sections) {
    for (const sec of desktopVp.sections) {
      // Flag: score >= 95% but React height is very different from original (likely blank-matching-blank)
      if (sec.match >= 95 && sec.reactHeight && sec.origHeight) {
        const ratio = sec.reactHeight / sec.origHeight;
        if (ratio < 0.3 || ratio > 3) {
          warnings.push(`⚠ [${sec.index}] ${sec.type}: scores ${sec.match}% but height ratio is ${ratio.toFixed(1)}x (orig ${sec.origHeight}px, react ${sec.reactHeight}px) → possible blank/fake component`);
        }
      }
      // Flag: score >= 90% but React content height is suspiciously small (< 50px inner content)
      if (sec.match >= 90 && sec.reactHeight && sec.reactHeight < 50 && sec.origHeight > 200) {
        warnings.push(`⚠ [${sec.index}] ${sec.type}: scores ${sec.match}% but React is only ${sec.reactHeight}px vs original ${sec.origHeight}px → likely empty/collapsed`);
      }
    }
  }

  // Mandatory visual check reminder
  warnings.push('ℹ VISUAL CHECK REQUIRED: Screenshot http://localhost:5174 with Puppeteer and visually compare with original site before declaring pass.');

  if (warnings.length > 0) {
    console.log('\n  ── Warnings ──');
    warnings.forEach(w => console.log(`  ${w}`));
  }
  console.log('');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
