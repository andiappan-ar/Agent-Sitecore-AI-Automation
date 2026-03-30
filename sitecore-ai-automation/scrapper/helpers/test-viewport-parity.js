/**
 * test-viewport-parity.js
 * 
 * Validates the generated Tailwind HTML against the live site across multiple standard viewports.
 * Instead of raw pixelmatch (which has high false positives for dynamic content), 
 * this runs structural layout tests and captures direct visual references.
 *
 * Usage: node helpers/test-viewport-parity.js https://taziz.com/ output/www.taziz.com/tailwind/index.html
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const LIVE_URL = process.argv[2];
const LOCAL_HTML = process.argv[3];

if (!LIVE_URL || !LOCAL_HTML) {
  console.error("Usage: node test-viewport-parity.js <live-url> <local-html-path>");
  process.exit(1);
}

const VIEWPORTS = [
  { name: "mobile-small", width: 320, height: 600 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 }
];

(async () => {
  console.log(`\n🔍 Commencing Viewport Parity Test...`);
  console.log(`Live: ${LIVE_URL}`);
  console.log(`Local: ${LOCAL_HTML}\n`);

  const browser = await puppeteer.launch({ headless: "new" });
  const localUrl = `file:///${path.resolve(LOCAL_HTML).replace(/\\/g, "/")}`;
  
  const resultsDir = path.resolve(path.dirname(LOCAL_HTML), "viewport-tests");
  fs.mkdirSync(resultsDir, { recursive: true });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`\n\n=== Evaluating Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    await page.setViewport({ width: vp.width, height: vp.height });

    // 1. Evaluate Live Site
    await page.goto(LIVE_URL, { waitUntil: "networkidle2" });
    await page.evaluate(() => document.fonts.ready);
    const liveHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    
    // Detect horizontal overflow (a common responsive bug)
    const liveOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: path.join(resultsDir, `${vp.name}-live.png`), fullPage: true });

    // 2. Evaluate Local Tailwind Build
    await page.goto(localUrl, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    const localHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const localOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: path.join(resultsDir, `${vp.name}-local.png`), fullPage: true });

    // 3. Structural Comparison Output
    console.log(`📐 Document Height Gap: ${Math.abs(liveHeight - localHeight)}px difference.`);
    console.log(`  Live: ${liveHeight}px | Local: ${localHeight}px`);
    if (liveOverflow || localOverflow) {
        console.log(`⚠️  Horizontal Overflow Detected: Live (${liveOverflow}), Local (${localOverflow})`);
    } else {
        console.log(`✅  No horizontal overflow.`);
    }

    // 4. Feature Extraction Check
    // E.g. verify if the play button overlay drifted
    const driftCheck = await page.evaluate(() => {
        const svgBtn = document.querySelector('svg'); 
        if (!svgBtn) return null;
        const rect = svgBtn.getBoundingClientRect();
        return rect;
    });

    if (driftCheck) {
        // If it drifted outside standard alignment ratios
        const centerX = driftCheck.x + (driftCheck.width / 2);
        const ratio = centerX / vp.width;
        if (ratio < 0.4 || ratio > 0.6) {
           console.log(`🚨 Overlay Drift Detected: Play button is off-center at ${Math.round(ratio * 100)}% horizontal alignment.`);
        }
    }
  }

  await browser.close();
  console.log(`\n✅ Viewport parity complete. Screenshots saved to: ${resultsDir}`);
})();
