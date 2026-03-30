#!/usr/bin/env node
/**
 * validate-components.js — Per-Component Pixel Comparison (v3)
 *
 * Strategy: Full-page screenshots → crop per-component regions → pixelmatch.
 * This avoids scroll-position drift that plagued v1/v2.
 *
 * For ORIGINAL: crops using extraction bounding boxes (box.y, box.h).
 * For GENERATED: crops using data-component element positions (Playwright locators).
 *
 * Usage:
 *   node helpers/validate-components.js <output-dir> [--viewport 1440] [--threshold 85]
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const args = process.argv.slice(2);
const siteDir = args[0];
if (!siteDir) { console.error('Usage: node helpers/validate-components.js <output-dir>'); process.exit(1); }

const vpArg = args.indexOf('--viewport');
const threshArg = args.indexOf('--threshold');
const VIEWPORTS = [
  { width: vpArg >= 0 ? parseInt(args[vpArg + 1]) : 1440, height: 900, name: 'desktop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 375, height: 812, name: 'mobile' }
];
const PASS_THRESHOLD = threshArg >= 0 ? parseInt(args[threshArg + 1]) : 85;

const extractedDir = path.join(siteDir, 'extracted');
const tailwindDir = path.join(siteDir, 'tailwind');
const validationDir = path.join(siteDir, 'validation');
if (!fs.existsSync(validationDir)) fs.mkdirSync(validationDir, { recursive: true });

// ── Load page data ─────────────────────────────────────────
function loadPageData() {
  const files = fs.readdirSync(extractedDir).filter(f =>
    f.startsWith('page-') && !f.includes('-768') && !f.includes('-375') && !f.includes('-merged') && f.endsWith('.json')
  );
  if (files.length === 0) { console.error('No page files found'); process.exit(1); }
  const pageFile = files[0];
  const pageName = pageFile.replace('page-', '').replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(extractedDir, pageFile), 'utf-8'));

  let generatedPath = path.join(tailwindDir, 'index.html');
  if (!fs.existsSync(generatedPath)) generatedPath = path.join(tailwindDir, 'pages', `${pageName}.html`);
  if (!fs.existsSync(generatedPath)) {
    const pagesDir = path.join(tailwindDir, 'pages');
    if (fs.existsSync(pagesDir)) {
      const htmlFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html') && !f.includes('merged'));
      if (htmlFiles.length > 0) generatedPath = path.join(pagesDir, htmlFiles[0]);
    }
  }
  return { data, pageName, generatedPath, originalUrl: data.meta?.url };
}

// ── PNG helpers ─────────────────────────────────────────────
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
      const srcIdx = ((cy + row) * full.width + (cx + col)) * 4;
      const dstIdx = (row * cw + col) * 4;
      cropped.data[dstIdx] = full.data[srcIdx];
      cropped.data[dstIdx + 1] = full.data[srcIdx + 1];
      cropped.data[dstIdx + 2] = full.data[srcIdx + 2];
      cropped.data[dstIdx + 3] = full.data[srcIdx + 3];
    }
  }
  return cropped;
}

function comparePNGs(png1, png2, diffPath) {
  const w = Math.min(png1.width, png2.width);
  const h = Math.min(png1.height, png2.height);
  if (w < 10 || h < 10) return { matchPercent: 0, error: 'Too small' };

  // Re-crop to same size
  const c1 = cropPNG(png1, w, h);
  const c2 = cropPNG(png2, w, h);
  const diff = new PNG({ width: w, height: h });

  const diffPixels = pixelmatch(c1.data, c2.data, diff.data, w, h, { threshold: 0.15, alpha: 0.3 });
  if (diffPath) fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const total = w * h;
  return { matchPercent: Math.round((1 - diffPixels / total) * 10000) / 100, diffPixels, total, width: w, height: h };
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

function safeName(name, i) {
  return `${String(i).padStart(2, '0')}-${name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40)}`;
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  const { data, pageName, generatedPath, originalUrl } = loadPageData();
  if (!originalUrl) { console.error('No URL in extraction'); process.exit(1); }

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Component Validation v3 — Full-Page Crop        ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Original:  ${originalUrl.substring(0, 40).padEnd(40)}║`);
  console.log(`║  Generated: ${path.basename(generatedPath).padEnd(40)}║`);
  console.log(`║  Components: ${String(data.components.length).padEnd(39)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  const browser = await chromium.launch({ headless: true });
  const report = { url: originalUrl, generated: generatedPath, timestamp: new Date().toISOString(), threshold: PASS_THRESHOLD, viewports: {} };

  for (const vp of VIEWPORTS) {
    console.log(`\n━━━ ${vp.name} (${vp.width}x${vp.height}) ━━━\n`);
    const vpDir = path.join(validationDir, vp.name);
    if (!fs.existsSync(vpDir)) fs.mkdirSync(vpDir, { recursive: true });

    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const vpReport = { viewport: `${vp.width}x${vp.height}`, components: [], summary: {} };

    try {
      // ── ORIGINAL: full-page screenshot ─────────────────
      console.log('  📸 Original full-page...');
      const origPage = await context.newPage();
      try {
        await origPage.goto(originalUrl, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (navErr) {
        console.log('    networkidle timeout — retrying with domcontentloaded...');
        await origPage.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await origPage.waitForTimeout(5000); // Wait extra for resources
      }
      // Scroll to trigger lazy content
      await origPage.evaluate(() => new Promise(resolve => {
        let t = 0; const s = window.innerHeight;
        const timer = setInterval(() => { window.scrollBy(0, s); t += s; if (t >= document.body.scrollHeight) { clearInterval(timer); window.scrollTo(0,0); setTimeout(resolve, 1000); } }, 200);
      }));
      const origFullPath = path.join(vpDir, 'original-full.png');
      await origPage.screenshot({ path: origFullPath, fullPage: true });
      console.log('    Saved.');

      // Get actual element positions from the live page (for more accurate cropping)
      const origPositions = await origPage.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        // Find top-level component elements
        let elements = [...main.querySelectorAll(':scope > *')].filter(el => el.getBoundingClientRect().height > 10 && !['SCRIPT','STYLE','LINK','META'].includes(el.tagName));
        // If single wrapper, unwrap
        if (elements.length === 1 && elements[0].tagName === 'DIV') {
          const inner = [...elements[0].querySelectorAll(':scope > *')].filter(el => el.getBoundingClientRect().height > 10 && !['SCRIPT','STYLE','LINK','META'].includes(el.tagName));
          if (inner.length > 1) elements = inner;
        }
        return elements.map(el => {
          const r = el.getBoundingClientRect();
          return { y: Math.round(r.y + window.scrollY), h: Math.round(r.height), w: Math.round(r.width), tag: el.tagName };
        });
      });
      console.log(`    Found ${origPositions.length} elements in original DOM`);
      await origPage.close();

      // ── GENERATED: full-page screenshot + element positions ──
      console.log('  📸 Generated full-page...');
      const genPage = await context.newPage();
      const genUrl = 'file:///' + path.resolve(generatedPath).replace(/\\/g, '/');
      try {
        await genPage.goto(genUrl, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        console.log('    networkidle timeout — retrying with domcontentloaded...');
        await genPage.goto(genUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await genPage.waitForTimeout(5000);
      }
      const genFullPath = path.join(vpDir, 'generated-full.png');
      await genPage.screenshot({ path: genFullPath, fullPage: true });

      // Get generated component positions via data-component
      const genPositions = await genPage.evaluate(() => {
        let comps = [...document.querySelectorAll('[data-component]')];
        if (comps.length === 0) {
          comps = [...document.body.children].filter(el => el.getBoundingClientRect().height > 10 && !['SCRIPT','STYLE','LINK','META'].includes(el.tagName));
        }
        return comps.map(el => {
          const r = el.getBoundingClientRect();
          return {
            name: el.getAttribute('data-component') || el.tagName.toLowerCase(),
            y: Math.round(r.y + window.scrollY),
            h: Math.round(r.height),
            w: Math.round(r.width)
          };
        });
      });
      console.log(`    Found ${genPositions.length} components in generated page`);
      await genPage.close();

      // ── CROP + COMPARE ─────────────────────────────────
      console.log('\n  📊 Comparing...\n');
      console.log(`  ${'#'.padStart(3)} | ${'Component'.padEnd(34)} | ${'Type'.padEnd(16)} | ${'Match'.padStart(7)} | Status`);
      console.log(`  ${'─'.repeat(3)} | ${'─'.repeat(34)} | ${'─'.repeat(16)} | ${'─'.repeat(7)} | ──────`);

      let totalMatch = 0, comparedCount = 0;

      for (let i = 0; i < data.components.length; i++) {
        const comp = data.components[i];
        const name = comp.componentName || `Unknown-${i}`;
        const type = comp.componentType || 'unknown';
        const sName = safeName(name, i);

        // Original crop: use live page positions if available, fallback to extraction box
        const origPos = origPositions[i] || (comp.box ? { y: comp.box.y, h: comp.box.h, w: vp.width } : null);
        // Generated crop: match by index
        const genPos = genPositions[i] || null;

        if (!origPos || origPos.h < 10 || !genPos || genPos.h < 10) {
          console.log(`  ${String(i).padStart(3)} | ${name.substring(0,34).padEnd(34)} | ${type.padEnd(16)} | ${'SKIP'.padStart(7)} |`);
          vpReport.components.push({ index: i, name, type, status: 'skipped' });
          continue;
        }

        // Crop from full-page images
        const origCrop = cropFromFullPage(origFullPath, 0, origPos.y, vp.width, Math.min(origPos.h, 2000));
        const genCrop = cropFromFullPage(genFullPath, 0, genPos.y, vp.width, Math.min(genPos.h, 2000));

        if (!origCrop || !genCrop) {
          console.log(`  ${String(i).padStart(3)} | ${name.substring(0,34).padEnd(34)} | ${type.padEnd(16)} | ${'CROP'.padStart(7)} |`);
          vpReport.components.push({ index: i, name, type, status: 'crop-failed' });
          continue;
        }

        // Save cropped images
        const origCropPath = path.join(vpDir, `original-${sName}.png`);
        const genCropPath = path.join(vpDir, `generated-${sName}.png`);
        const diffPath = path.join(vpDir, `diff-${sName}.png`);
        fs.writeFileSync(origCropPath, PNG.sync.write(origCrop));
        fs.writeFileSync(genCropPath, PNG.sync.write(genCrop));

        // Compare
        const result = comparePNGs(origCrop, genCrop, diffPath);
        const status = result.matchPercent >= 90 ? '✅ Good' : result.matchPercent >= 70 ? '⚠️ Fair' : '❌ Poor';
        const stateDependent = ['carousel', 'hero', 'tabs', 'sidebar'].includes(type);
        const stateTag = stateDependent ? ' [S]' : '';

        console.log(`  ${String(i).padStart(3)} | ${name.substring(0,34).padEnd(34)} | ${type.padEnd(16)} | ${(result.matchPercent+'%').padStart(7)} | ${status}${stateTag}`);

        vpReport.components.push({
          index: i, name, type,
          variant: comp.componentVariant || null,
          matchPercent: result.matchPercent,
          diffPixels: result.diffPixels,
          originalSize: `${origCrop.width}x${origCrop.height}`,
          generatedSize: `${genCrop.width}x${genCrop.height}`,
          stateDependent,
          status: result.matchPercent >= 90 ? 'good' : result.matchPercent >= 70 ? 'fair' : 'poor'
        });

        if (!result.error) { totalMatch += result.matchPercent; comparedCount++; }
      }

      // Full page comparison
      const fullOrig = PNG.sync.read(fs.readFileSync(origFullPath));
      const fullGen = PNG.sync.read(fs.readFileSync(genFullPath));
      const fullResult = comparePNGs(fullOrig, fullGen, path.join(vpDir, 'diff-full.png'));

      const avgMatch = comparedCount > 0 ? Math.round(totalMatch / comparedCount * 100) / 100 : 0;
      const stateIndep = vpReport.components.filter(c => c.matchPercent !== undefined && !c.stateDependent);
      const stateIndepAvg = stateIndep.length > 0 ? Math.round(stateIndep.reduce((a,c) => a + c.matchPercent, 0) / stateIndep.length * 100) / 100 : 0;
      const good = vpReport.components.filter(c => c.status === 'good').length;
      const fair = vpReport.components.filter(c => c.status === 'fair').length;
      const poor = vpReport.components.filter(c => c.status === 'poor').length;

      vpReport.summary = { averageMatch: avgMatch, stateIndependentAvg: stateIndepAvg, fullPageMatch: fullResult.matchPercent, compared: comparedCount, good, fair, poor, passed: avgMatch >= PASS_THRESHOLD };

      console.log(`\n  ┌────────────────────────────────────────┐`);
      console.log(`  │ ${vp.name.toUpperCase()} RESULTS${' '.repeat(31 - vp.name.length)}│`);
      console.log(`  ├────────────────────────────────────────┤`);
      console.log(`  │ Average Match:       ${(avgMatch + '%').padEnd(18)}│`);
      console.log(`  │ Static Components:   ${(stateIndepAvg + '%').padEnd(18)}│`);
      console.log(`  │ Full Page:           ${(fullResult.matchPercent + '%').padEnd(18)}│`);
      console.log(`  │ Good (≥90%):         ${String(good).padEnd(18)}│`);
      console.log(`  │ Fair (70-90%):       ${String(fair).padEnd(18)}│`);
      console.log(`  │ Poor (<70%):         ${String(poor).padEnd(18)}│`);
      console.log(`  │ Threshold:           ${(PASS_THRESHOLD + '%').padEnd(18)}│`);
      console.log(`  │ Status:              ${(avgMatch >= PASS_THRESHOLD ? '✅ PASSED' : '❌ FAILED').padEnd(18)}│`);
      console.log(`  └────────────────────────────────────────┘`);
      console.log(`  [S] = state-dependent (carousel/hero/tabs — varies between runs)`);

    } catch (err) {
      console.error(`  Error: ${err.message}`);
      vpReport.summary = { error: err.message };
    }

    report.viewports[vp.name] = vpReport;
    await context.close();
  }

  await browser.close();

  // ── Overall ──────────────────────────────────────────────
  const dAvg = report.viewports.desktop?.summary?.averageMatch || 0;
  const tAvg = report.viewports.tablet?.summary?.averageMatch || 0;
  const mAvg = report.viewports.mobile?.summary?.averageMatch || 0;
  const overall = Math.round((dAvg + tAvg + mAvg) / 3 * 100) / 100;
  const dStatic = report.viewports.desktop?.summary?.stateIndependentAvg || 0;

  report.overall = { averageMatch: overall, desktop: dAvg, tablet: tAvg, mobile: mAvg, desktopStatic: dStatic, passed: overall >= PASS_THRESHOLD };

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  OVERALL RESULTS                                  ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Desktop:        ${(dAvg + '%').padEnd(35)}║`);
  console.log(`║  Desktop Static: ${(dStatic + '%').padEnd(35)}║`);
  console.log(`║  Tablet:         ${(tAvg + '%').padEnd(35)}║`);
  console.log(`║  Mobile:         ${(mAvg + '%').padEnd(35)}║`);
  console.log(`║  Overall:        ${(overall + '%').padEnd(35)}║`);
  console.log(`║  Verdict:        ${(overall >= PASS_THRESHOLD ? '✅ PASSED' : '❌ NEEDS FIXES').padEnd(35)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  fs.writeFileSync(path.join(validationDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Report: ${path.join(validationDir, 'report.json')}`);
  console.log(`Diffs:  ${validationDir}/{desktop,tablet,mobile}/diff-*.png\n`);

  const poorComps = (report.viewports.desktop?.components || []).filter(c => c.status === 'poor' && !c.stateDependent);
  if (poorComps.length > 0) {
    console.log('⚠ Static components needing fixes (desktop):');
    poorComps.forEach(c => console.log(`  - ${c.name} (${c.type}): ${c.matchPercent}%`));
  }

  process.exit(overall >= PASS_THRESHOLD ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
