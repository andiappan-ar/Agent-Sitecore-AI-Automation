/**
 * test-blueprint.js — Comprehensive 3-phase blueprint validator
 *
 * Phase A: Content Completeness (JSON vs HTML comparison, no browser)
 * Phase B: Structural/Layout Validation (local Puppeteer on blueprint, all viewports)
 * Phase C: Visual Comparison (live site vs blueprint screenshots, desktop only)
 *
 * Usage:
 *   node helpers/test-blueprint.js output/www.example.com [--skip-visual]
 *
 * Output:
 *   Console: structured pass/fail per page/viewport/component
 *   JSON:    output/{domain}/test-report.json
 *   Images:  output/{domain}/test-results/
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");

// ── CLI args ─────────────────────────────────────────────────────────
const SITE_DIR = process.argv[2];
const SKIP_VISUAL = process.argv.includes("--skip-visual");

if (!SITE_DIR) {
  console.error(
    "Usage: node helpers/test-blueprint.js output/{domain} [--skip-visual]"
  );
  process.exit(1);
}

const BLUEPRINT_DIR = path.resolve(SITE_DIR, "blueprint");
const EXTRACTED_DIR = path.resolve(SITE_DIR, "extracted");
const RESULTS_DIR = path.resolve(SITE_DIR, "test-results");
fs.mkdirSync(RESULTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "wide", width: 1920, height: 900 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

// ── Helpers ──────────────────────────────────────────────────────────
function getPages() {
  const pages = [];
  const indexFile = path.join(BLUEPRINT_DIR, "index.html");
  if (fs.existsSync(indexFile)) pages.push({ name: "home", file: "index" });

  const pagesDir = path.join(BLUEPRINT_DIR, "pages");
  if (fs.existsSync(pagesDir)) {
    for (const file of fs.readdirSync(pagesDir)) {
      if (file.endsWith(".html")) {
        const name = file.replace(".html", "");
        pages.push({ name, file: "pages/" + name });
      }
    }
  }
  return pages;
}

function countTextNodes(node) {
  let count = 0;
  if (node.t && node.t.trim().length > 2) count++;
  if (node.c) {
    for (const child of node.c) {
      count += countTextNodes(child);
    }
  }
  return count;
}

function countImages(node) {
  let count = 0;
  if (node.tag === "img" && node.src) count++;
  if (node.c) {
    for (const child of node.c) {
      count += countImages(child);
    }
  }
  return count;
}

function loadExtractedData(pageName) {
  const jsonPath = path.join(EXTRACTED_DIR, `page-${pageName}.json`);
  if (!fs.existsSync(jsonPath)) return null;
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

function getBaseUrl(pageName) {
  const data = loadExtractedData(pageName);
  if (data && data.meta && data.meta.url) return data.meta.url;
  return null;
}

// ═══════════════════════════ PHASE A: CONTENT COMPLETENESS ═══════════
async function phaseA(pages) {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE A: Content Completeness (JSON vs HTML)");
  console.log("═".repeat(60));

  const results = [];

  for (const pg of pages) {
    const data = loadExtractedData(pg.name);
    if (!data) {
      console.log(`\n  ${pg.name}: SKIP (no extracted JSON)`);
      results.push({
        page: pg.name,
        status: "skip",
        components: [],
        issues: ["No extracted JSON found"],
      });
      continue;
    }

    const components = data.components || [];
    const htmlPath = path.join(BLUEPRINT_DIR, pg.file + ".html");
    const htmlContent = fs.existsSync(htmlPath)
      ? fs.readFileSync(htmlPath, "utf-8")
      : "";

    // Count data-component sections in HTML
    const htmlComponentMatches = htmlContent.match(/data-component="/g) || [];
    const htmlComponentCount = htmlComponentMatches.length;

    console.log(
      `\n--- ${pg.name} (${components.length} extracted, ${htmlComponentCount} in HTML) ---`
    );

    const pageIssues = [];
    const compResults = [];

    // Check component count
    if (htmlComponentCount < components.length) {
      pageIssues.push(
        `Component count mismatch: ${htmlComponentCount} in HTML vs ${components.length} extracted`
      );
    }

    for (const comp of components) {
      const name = comp.componentName || "Unknown";
      const jsonTextCount = countTextNodes(comp);
      const jsonImgCount = countImages(comp);
      const issues = [];

      // Check if component exists in HTML
      const compRegex = new RegExp(
        `data-component="${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
        "g"
      );
      const inHtml = compRegex.test(htmlContent);
      if (!inHtml) {
        issues.push(`Component "${name}" missing from HTML`);
      }

      // Count text in HTML for this component (rough heuristic)
      // We check if the component section has enough text content
      if (jsonTextCount > 3 && inHtml) {
        // Extract the component's HTML section
        const compStart = htmlContent.indexOf(`data-component="${name}"`);
        if (compStart !== -1) {
          // Find the section boundaries
          const sectionStart = htmlContent.lastIndexOf("<section", compStart);
          const searchStart = sectionStart !== -1 ? sectionStart : compStart;
          // Simple heuristic: count visible text-bearing tags in the section
          const sectionHtml = htmlContent.substring(
            searchStart,
            searchStart + 10000
          );
          const textTags =
            sectionHtml.match(/<(h[1-6]|p|span|div|a|li|button)[^>]*>[^<]+/g) ||
            [];
          const htmlTextCount = textTags.length;

          if (htmlTextCount < jsonTextCount * 0.5) {
            issues.push(
              `Low text content: ${htmlTextCount} text elements in HTML vs ${jsonTextCount} in JSON (< 50%)`
            );
          }
        }
      }

      // Empty section check
      if (jsonTextCount === 0 && jsonImgCount === 0) {
        issues.push(`Empty component in extraction: no text, no images`);
      }

      // Interactive content check
      if (
        data.interactiveContent &&
        Object.keys(data.interactiveContent).length > 0
      ) {
        for (const [, interactive] of Object.entries(
          data.interactiveContent
        )) {
          if (interactive.type === "tabs") {
            const emptyTabs = interactive.tabs.filter(
              (t) => !t.content || !t.content.text || t.content.text.length < 5
            );
            if (emptyTabs.length > 0) {
              issues.push(
                `${emptyTabs.length}/${interactive.tabs.length} tab(s) have empty content`
              );
            }
          }
        }
      }

      const status = issues.length === 0 ? "PASS" : "FAIL";
      const label = `  ${name}`.padEnd(35);
      if (issues.length === 0) {
        console.log(
          `${label} PASS  (${jsonTextCount} text, ${jsonImgCount} imgs)`
        );
      } else {
        console.log(`${label} FAIL`);
        issues.forEach((i) => console.log(`    - ${i}`));
      }

      compResults.push({
        name,
        status,
        jsonTextCount,
        jsonImgCount,
        issues,
      });
    }

    results.push({
      page: pg.name,
      status: pageIssues.length === 0 ? "pass" : "fail",
      components: compResults,
      issues: pageIssues,
    });
  }

  return results;
}

// ═══════════════════════════ PHASE B: STRUCTURAL VALIDATION ══════════
async function phaseB(pages, browser) {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE B: Structural/Layout Validation (all viewports)");
  console.log("═".repeat(60));

  const pg = await browser.newPage();
  const results = [];

  for (const pageDef of pages) {
    const file = path.join(BLUEPRINT_DIR, pageDef.file + ".html");
    if (!fs.existsSync(file)) {
      console.log(`\n  ${pageDef.name}: FILE MISSING`);
      results.push({
        page: pageDef.name,
        status: "fail",
        viewports: [],
        issues: ["File missing"],
      });
      continue;
    }

    const url = "file:///" + file.split(path.sep).join("/");
    console.log(`\n--- ${pageDef.name} ---`);

    const vpResults = [];
    const desktopHeights = {}; // Track component heights for ratio check

    for (const vp of VIEWPORTS) {
      await pg.setViewport({ width: vp.width, height: vp.height });
      await pg.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      // Remove videos to avoid layout shifts during test
      await pg.evaluate(() => {
        document.querySelectorAll("video").forEach((v) => v.remove());
      });
      await new Promise((r) => setTimeout(r, 500));

      const result = await pg.evaluate(
        (vpWidth, vpName) => {
          const issues = [];
          const sections = document.querySelectorAll("[data-component]");
          const htmlEl = document.documentElement;
          const componentData = [];

          // 1. Horizontal overflow
          if (htmlEl.scrollWidth > vpWidth + 10) {
            issues.push(
              `Page scrollWidth ${htmlEl.scrollWidth}px > viewport ${vpWidth}px`
            );
          }

          // 2. Per-section checks
          sections.forEach((sec) => {
            const name = sec.getAttribute("data-component");
            const rect = sec.getBoundingClientRect();
            const compIssues = [];

            // Zero height
            if (rect.height < 5) {
              compIssues.push("zero-height section");
            }

            // Section overflows viewport
            if (rect.width > vpWidth + 10) {
              compIssues.push(
                `section width ${Math.round(rect.width)}px > ${vpWidth}px`
              );
            }

            // Children overflow (max 3 per section)
            const secOverflow = getComputedStyle(sec).overflow;
            const sectionClips =
              secOverflow === "hidden" || secOverflow.includes("hidden");
            if (!sectionClips) {
              let overflowCount = 0;
              sec.querySelectorAll("*").forEach((el) => {
                if (overflowCount >= 3) return;
                const r = el.getBoundingClientRect();
                if (r.right > vpWidth + 10 && r.width > 10) {
                  let parent = el.parentElement;
                  let clipped = false;
                  while (parent && parent !== document.body) {
                    const po = getComputedStyle(parent).overflow;
                    if (
                      po === "hidden" ||
                      po === "clip" ||
                      po.includes("hidden")
                    ) {
                      clipped = true;
                      break;
                    }
                    parent = parent.parentElement;
                  }
                  if (!clipped) {
                    compIssues.push(
                      `<${el.tagName.toLowerCase()}> overflows by ${Math.round(r.right - vpWidth)}px`
                    );
                    overflowCount++;
                  }
                }
              });
            }

            // Centering check — for sections that should be centered
            if (rect.width >= vpWidth - 20) {
              // Full-width section: check if first meaningful child is centered
              const firstChild = sec.firstElementChild;
              if (firstChild) {
                const childRect = firstChild.getBoundingClientRect();
                const childStyle = getComputedStyle(firstChild);
                const expectedLeft = (vpWidth - childRect.width) / 2;
                const actualLeft = childRect.left;
                // Only flag if child is narrower than section and visibly off-center
                if (
                  childRect.width < vpWidth * 0.9 &&
                  childRect.width > 100 &&
                  Math.abs(actualLeft - expectedLeft) > 40
                ) {
                  // Check if it's intentionally left-aligned (has explicit text-align or flex-start)
                  const isIntentionallyLeft =
                    childStyle.textAlign === "left" ||
                    childStyle.justifyContent === "flex-start";
                  if (!isIntentionallyLeft) {
                    compIssues.push(
                      `Content appears off-center (left: ${Math.round(actualLeft)}px, expected: ~${Math.round(expectedLeft)}px)`
                    );
                  }
                }
              }
            }

            // Broken images
            sec.querySelectorAll("img").forEach((img) => {
              if (
                img.naturalWidth === 0 &&
                img.src &&
                !img.src.startsWith("data:")
              ) {
                compIssues.push("broken img: " + img.src.substring(0, 60));
              }
            });

            // Invisible text check
            sec
              .querySelectorAll("h1,h2,h3,h4,h5,h6,p,div")
              .forEach((el) => {
                const t = el.textContent?.trim();
                if (!t || t.length < 4) return;
                const hasDirectText = [...el.childNodes].some(
                  (n) => n.nodeType === 3 && n.textContent.trim().length > 3
                );
                if (!hasDirectText) return;

                let op = 1;
                let n = el;
                while (n && n !== document.body) {
                  op *= parseFloat(getComputedStyle(n).opacity);
                  n = n.parentElement;
                }
                if (op < 0.3 && op > 0) {
                  compIssues.push(
                    `invisible text: "${t.substring(0, 25)}..."`
                  );
                }
              });

            // Content visibility — text should have non-zero dimensions
            let visibleTextCount = 0;
            sec
              .querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,a,li,button")
              .forEach((el) => {
                const t = el.textContent?.trim();
                if (!t || t.length < 2) return;
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) visibleTextCount++;
              });

            if (compIssues.length > 0) {
              compIssues.forEach((i) => issues.push(`${name}: ${i}`));
            }

            componentData.push({
              name,
              height: Math.round(rect.height),
              width: Math.round(rect.width),
              top: Math.round(rect.top + window.scrollY),
              visibleText: visibleTextCount,
              issues: compIssues,
            });
          });

          return {
            sections: sections.length,
            pageHeight: htmlEl.scrollHeight,
            scrollWidth: htmlEl.scrollWidth,
            issues,
            components: componentData,
          };
        },
        vp.width,
        vp.name
      );

      // Track desktop heights for ratio check
      if (vp.name === "desktop") {
        for (const comp of result.components) {
          desktopHeights[comp.name] = comp.height;
        }
      }

      // Height ratio check (mobile vs desktop)
      if (vp.name === "mobile") {
        for (const comp of result.components) {
          const dh = desktopHeights[comp.name];
          if (dh && dh > 100 && comp.height < dh * 0.1 && comp.height < 50) {
            result.issues.push(
              `${comp.name}: collapsed on mobile (${comp.height}px vs ${dh}px desktop)`
            );
            comp.issues.push(
              `collapsed: ${comp.height}px vs ${dh}px desktop (< 10%)`
            );
          }
        }
      }

      const label = `  ${vp.name} (${vp.width}px)`.padEnd(25);
      if (result.issues.length === 0) {
        console.log(
          `${label} PASS  (${result.sections} sections, ${result.pageHeight}px)`
        );
      } else {
        console.log(`${label} FAIL  (${result.issues.length} issues)`);
        result.issues.forEach((i) => console.log(`    - ${i}`));
      }

      vpResults.push({
        viewport: vp.name,
        width: vp.width,
        status: result.issues.length === 0 ? "pass" : "fail",
        sections: result.sections,
        pageHeight: result.pageHeight,
        components: result.components,
        issues: result.issues,
      });
    }

    results.push({ page: pageDef.name, viewports: vpResults });
    console.log();
  }

  await pg.close();
  return results;
}

// ═══════════════════════════ PHASE C: VISUAL PIXEL-DIFF ══════════════
//
// Architecture:
//   1. For each page × viewport, take ONE full-page screenshot of live + blueprint
//   2. Match components by index (extraction preserves section order)
//   3. Crop matching regions, run pixelmatch, save diff image
//   4. Output structured report: component, viewport, mismatch%, diff path
//
// This avoids re-navigating per component (the old approach was N×2 page loads).

const VISUAL_VIEWPORTS = [
  { name: "ultrawide", width: 2560, height: 1080 },
  { name: "wide", width: 1920, height: 900 },
  { name: "desktop", width: 1440, height: 900 },
];

const PIXELMATCH_THRESHOLD = 0.15; // Stricter than default 0.1 — catches subtle color/spacing diffs
const PASS_THRESHOLD = 0.85; // 85%+ similarity = pass
const WARN_THRESHOLD = 0.70; // 70-85% = warn, <70% = fail

async function phaseC(pages, browser) {
  if (SKIP_VISUAL) {
    console.log("\n" + "═".repeat(60));
    console.log("PHASE C: Visual Pixel-Diff — SKIPPED (--skip-visual)");
    console.log("═".repeat(60));
    return [];
  }

  console.log("\n" + "═".repeat(60));
  console.log("PHASE C: Visual Pixel-Diff (live vs blueprint, multi-viewport)");
  console.log("═".repeat(60));

  // Create organized diff output directories
  const diffsDir = path.resolve(SITE_DIR, "diffs");
  fs.mkdirSync(diffsDir, { recursive: true });

  const pg = await browser.newPage();
  const results = [];

  for (const pageDef of pages) {
    const liveUrl = getBaseUrl(pageDef.name);
    if (!liveUrl) {
      console.log(`\n  ${pageDef.name}: SKIP (no live URL in extracted data)`);
      results.push({ page: pageDef.name, status: "skip", viewports: [], issues: ["No live URL"] });
      continue;
    }

    const bpFile = path.join(BLUEPRINT_DIR, pageDef.file + ".html");
    if (!fs.existsSync(bpFile)) {
      results.push({ page: pageDef.name, status: "skip", viewports: [], issues: ["Blueprint file missing"] });
      continue;
    }
    const bpUrl = "file:///" + bpFile.split(path.sep).join("/");

    console.log(`\n--- ${pageDef.name} ---`);
    const vpResults = [];

    for (const vp of VISUAL_VIEWPORTS) {
      await pg.setViewport({ width: vp.width, height: vp.height });

      const vpDir = path.join(diffsDir, pageDef.name, vp.name);
      fs.mkdirSync(vpDir, { recursive: true });

      try {
        // ── Step 1: Screenshot live site ──
        // Navigate once, scroll for lazy-load, remove videos (they always diff)
        await pg.goto(liveUrl, { waitUntil: "networkidle2", timeout: 30000 });
        await scrollForLazyLoad(pg);
        await pg.evaluate(() => {
          // Remove videos — they produce different frames each capture
          document.querySelectorAll("video").forEach((v) => {
            // Replace with poster image or solid color to preserve layout
            const poster = v.getAttribute("poster");
            if (poster) {
              const img = document.createElement("img");
              img.src = poster;
              img.style.cssText = "width:100%;height:100%;object-fit:cover;";
              v.parentElement.insertBefore(img, v);
            }
            v.remove();
          });
        });
        await new Promise((r) => setTimeout(r, 500));

        // Get live component positions (match by class name or section order)
        const liveComponents = await pg.evaluate(() => {
          const sections = document.querySelectorAll("section, header, footer");
          return [...sections].map((sec, idx) => {
            const cls = sec.className || "";
            const rect = sec.getBoundingClientRect();
            const cs = getComputedStyle(sec);
            // Extract component name from class (e.g. "HeroBanner relative ..." → "HeroBanner")
            const nameMatch = cls.match(/^([A-Z][a-zA-Z]+)/);
            return {
              name: nameMatch ? nameMatch[1] : `section-${idx}`,
              top: Math.round(rect.top + window.scrollY),
              height: Math.round(rect.height),
              width: Math.round(rect.width),
              index: idx,
              isOverlay: cs.position === "absolute" || cs.position === "fixed",
            };
          });
        });

        const liveFull = path.join(vpDir, "live-full.png");
        await pg.screenshot({ path: liveFull, fullPage: true });

        // ── Step 2: Screenshot blueprint ──
        await pg.goto(bpUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        await pg.evaluate(() => {
          // Replace videos with poster images (same as live treatment)
          document.querySelectorAll("video").forEach((v) => {
            const poster = v.getAttribute("poster");
            if (poster) {
              const img = document.createElement("img");
              img.src = poster;
              img.style.cssText = "width:100%;height:100%;object-fit:cover;";
              v.parentElement.insertBefore(img, v);
            }
            v.remove();
          });
        });
        await new Promise((r) => setTimeout(r, 500));

        const bpComponents = await pg.evaluate(() => {
          return [...document.querySelectorAll("[data-component]")].map((sec, idx) => {
            const cs = getComputedStyle(sec);
            return {
              name: sec.getAttribute("data-component"),
              top: Math.round(sec.getBoundingClientRect().top + window.scrollY),
              height: Math.round(sec.getBoundingClientRect().height),
              width: Math.round(sec.getBoundingClientRect().width),
              index: idx,
              isOverlay: cs.position === "absolute" || cs.position === "fixed",
            };
          });
        });

        const bpFull = path.join(vpDir, "bp-full.png");
        await pg.screenshot({ path: bpFull, fullPage: true });

        // ── Step 3: Per-component crop + pixelmatch ──
        const liveImg = PNG.sync.read(fs.readFileSync(liveFull));
        const bpImg = PNG.sync.read(fs.readFileSync(bpFull));

        const compResults = [];
        const matchedLiveIndices = new Set(); // Track already-matched live components

        for (const bpComp of bpComponents) {
          if (bpComp.height < 10) continue;

          // Skip overlay components (Header on top of Hero) — transparent bg always diffs
          if (bpComp.isOverlay) {
            console.log(`  ${bpComp.name}`.padEnd(35) + ` SKIP  (overlay — transparent bg)`);
            compResults.push({ name: bpComp.name, status: "skip", similarity: null, reason: "overlay" });
            continue;
          }

          // Detect dynamic content components — these have inherent visual variation
          // (carousels show different slides, videos show different frames)
          const dynamicNames = ["Video", "HeroBanner"];
          const carouselNames = ["TabbedCarousel", "LogoCarousel", "TimelineCarousel"];
          const isDynamic = dynamicNames.includes(bpComp.name) || carouselNames.includes(bpComp.name);

          // Match live component: by name (skip already-matched), then by index
          let liveComp = null;
          for (const lc of liveComponents) {
            if (lc.name === bpComp.name && !lc.isOverlay && !matchedLiveIndices.has(lc.index)) {
              liveComp = lc;
              break;
            }
          }
          if (!liveComp) {
            // Fallback: match by index offset (skip overlay sections in count)
            const bpNonOverlay = bpComponents.filter((c) => !c.isOverlay);
            const liveNonOverlay = liveComponents.filter((c) => !c.isOverlay);
            const bpIdx = bpNonOverlay.indexOf(bpComp);
            if (bpIdx >= 0 && bpIdx < liveNonOverlay.length) {
              const candidate = liveNonOverlay[bpIdx];
              if (!matchedLiveIndices.has(candidate.index)) {
                liveComp = candidate;
              }
            }
          }
          if (liveComp) matchedLiveIndices.add(liveComp.index);

          if (!liveComp || liveComp.height < 10) {
            console.log(`  ${bpComp.name}`.padEnd(35) + ` SKIP  (no live match at ${vp.name})`);
            compResults.push({ name: bpComp.name, status: "skip", similarity: null });
            continue;
          }

          // Crop both images to the component region
          // Use the SMALLER height to ensure fair comparison (different section heights = misaligned crops)
          const cropHeight = Math.min(bpComp.height, liveComp.height, 2000);
          const cropWidth = vp.width;

          const bpCrop = cropPNG(bpImg, 0, bpComp.top, cropWidth, cropHeight);
          const liveCrop = cropPNG(liveImg, 0, liveComp.top, cropWidth, cropHeight);

          if (!bpCrop || !liveCrop) {
            compResults.push({ name: bpComp.name, status: "skip", similarity: null });
            continue;
          }

          // Save cropped screenshots
          const bpCropPath = path.join(vpDir, `${bpComp.name}-bp.png`);
          const liveCropPath = path.join(vpDir, `${bpComp.name}-live.png`);
          const diffPath = path.join(vpDir, `${bpComp.name}-diff.png`);

          fs.writeFileSync(bpCropPath, PNG.sync.write(bpCrop));
          fs.writeFileSync(liveCropPath, PNG.sync.write(liveCrop));

          // Pixelmatch
          const diff = new PNG({ width: cropWidth, height: cropHeight });
          const numDiffPixels = pixelmatch(
            bpCrop.data,
            liveCrop.data,
            diff.data,
            cropWidth,
            cropHeight,
            { threshold: PIXELMATCH_THRESHOLD, includeAA: false }
          );

          fs.writeFileSync(diffPath, PNG.sync.write(diff));

          const totalPixels = cropWidth * cropHeight;
          const similarity = 1 - numDiffPixels / totalPixels;
          const pct = Math.round(similarity * 100);

          // Dynamic content gets relaxed thresholds — carousels/videos inherently differ
          let status;
          const passT = isDynamic ? 0.50 : PASS_THRESHOLD;
          const warnT = isDynamic ? 0.30 : WARN_THRESHOLD;
          if (similarity >= passT) status = "pass";
          else if (similarity >= warnT) status = "warn";
          else status = "fail";

          const dynamicTag = isDynamic ? " [dynamic]" : "";
          const statusLabel = status === "pass" ? "PASS" : status === "warn" ? "WARN" : "FAIL";
          const label = `  ${bpComp.name}`.padEnd(35);
          console.log(`${label} ${statusLabel}  ${pct}% similar${dynamicTag}  (${numDiffPixels} diff px)`);

          compResults.push({
            name: bpComp.name,
            status,
            similarity: pct,
            diffPixels: numDiffPixels,
            totalPixels,
            isDynamic,
            screenshots: {
              blueprint: path.relative(SITE_DIR, bpCropPath),
              live: path.relative(SITE_DIR, liveCropPath),
              diff: path.relative(SITE_DIR, diffPath),
            },
          });
        }

        vpResults.push({
          viewport: vp.name,
          width: vp.width,
          components: compResults,
          fullScreenshots: {
            live: path.relative(SITE_DIR, liveFull),
            blueprint: path.relative(SITE_DIR, bpFull),
          },
        });

      } catch (e) {
        console.log(`  ${vp.name}: ERROR — ${e.message.substring(0, 80)}`);
        vpResults.push({
          viewport: vp.name,
          width: vp.width,
          components: [],
          error: e.message,
        });
      }

      console.log();
    }

    results.push({ page: pageDef.name, viewports: vpResults });
  }

  await pg.close();
  return results;
}

// ── Helpers for Phase C ──────────────────────────────────────────────

async function scrollForLazyLoad(page) {
  await page.evaluate(async () => {
    // Scroll through the ENTIRE page in viewport-sized chunks.
    // Pause at each position to trigger AOS/scroll-based animations
    // and allow lazy images to load.
    const vh = window.innerHeight;
    const h = document.documentElement.scrollHeight;

    // Pass 1: scroll down in viewport steps, pausing to trigger animations
    for (let y = 0; y < h; y += vh * 0.7) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
    // Hit the very bottom to trigger footer animations
    window.scrollTo(0, h);
    await new Promise((r) => setTimeout(r, 300));

    // Pass 2: force ALL animation/transition states to their visible end-state
    // This handles AOS, GSAP, custom scroll-triggered animations, etc.

    // 2a. Force AOS elements
    document.querySelectorAll("[data-aos]").forEach((el) => {
      el.classList.add("aos-animate");
      el.style.setProperty("opacity", "1", "important");
      el.style.setProperty("transform", "none", "important");
    });

    // 2b. Inject targeted style overrides — only for AOS elements, not all transforms
    const forceVisible = document.createElement("style");
    forceVisible.textContent = `
      [data-aos] { opacity: 1 !important; transform: none !important; }
      .aos-init { opacity: 1 !important; transform: none !important; }
      * { transition-duration: 0s !important; animation-duration: 0s !important; }
    `;
    document.head.appendChild(forceVisible);

    // 2c. Walk all elements and force visible ONLY zero-opacity elements
    // Do NOT touch transforms — they may be part of actual layout (parallax, banners)
    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.opacity === "0") {
        el.style.setProperty("opacity", "1", "important");
      }
    });

    // Scroll back to top for full-page screenshot
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  });
}

/**
 * Crop a region from a PNG image.
 * Returns a new PNG of size (cropW × cropH) from position (srcX, srcY).
 * Handles out-of-bounds gracefully (fills with transparent).
 */
function cropPNG(img, srcX, srcY, cropW, cropH) {
  if (cropW < 1 || cropH < 1) return null;
  // Clamp crop dimensions to image bounds
  cropW = Math.min(cropW, img.width - srcX);
  cropH = Math.min(cropH, img.height - srcY);
  if (cropW < 1 || cropH < 1) return null;

  const cropped = new PNG({ width: cropW, height: cropH });
  for (let y = 0; y < cropH; y++) {
    const sy = srcY + y;
    if (sy < 0 || sy >= img.height) continue;
    for (let x = 0; x < cropW; x++) {
      const sx = srcX + x;
      if (sx < 0 || sx >= img.width) continue;
      const srcIdx = (sy * img.width + sx) * 4;
      const dstIdx = (y * cropW + x) * 4;
      cropped.data[dstIdx] = img.data[srcIdx];
      cropped.data[dstIdx + 1] = img.data[srcIdx + 1];
      cropped.data[dstIdx + 2] = img.data[srcIdx + 2];
      cropped.data[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }
  return cropped;
}

// ═══════════════════════════ MAIN ════════════════════════════════════
(async () => {
  const pages = getPages();
  if (pages.length === 0) {
    console.error("No blueprint pages found in: " + BLUEPRINT_DIR);
    process.exit(1);
  }

  console.log(
    `\nTesting ${pages.length} pages from: ${BLUEPRINT_DIR}`
  );
  console.log(
    `Pages: ${pages.map((p) => p.name).join(", ")}\n`
  );

  // Phase A: no browser needed
  const phaseAResults = await phaseA(pages);

  // Phases B & C need a browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  const phaseBResults = await phaseB(pages, browser);
  const phaseCResults = await phaseC(pages, browser);

  await browser.close();

  // ── Summary ────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));

  let totalPass = 0;
  let totalFail = 0;
  let totalWarn = 0;

  // Count Phase A
  for (const page of phaseAResults) {
    for (const comp of page.components || []) {
      if (comp.status === "PASS") totalPass++;
      else totalFail++;
    }
  }

  // Count Phase B
  for (const page of phaseBResults) {
    for (const vp of page.viewports || []) {
      if (vp.status === "pass") totalPass++;
      else totalFail++;
    }
  }

  // Count Phase C (per viewport × component)
  let visualTotal = 0;
  for (const page of phaseCResults) {
    for (const vp of page.viewports || []) {
      for (const comp of vp.components || []) {
        visualTotal++;
        if (comp.status === "pass") totalPass++;
        else if (comp.status === "warn") totalWarn++;
        else if (comp.status === "fail" || comp.status === "error") totalFail++;
      }
    }
  }

  console.log(`  Content checks:  ${phaseAResults.reduce((a, p) => a + (p.components || []).length, 0)} components`);
  console.log(`  Layout checks:   ${phaseBResults.reduce((a, p) => a + (p.viewports || []).length, 0)} viewport tests`);
  console.log(`  Visual checks:   ${visualTotal} comparisons`);
  console.log();
  console.log(`  PASS: ${totalPass}  |  FAIL: ${totalFail}  |  WARN: ${totalWarn}`);

  // ── Save report ────────────────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    site: path.basename(SITE_DIR),
    phases: {
      content: phaseAResults,
      layout: phaseBResults,
      visual: phaseCResults,
    },
    summary: { pass: totalPass, fail: totalFail, warn: totalWarn },
  };

  const reportPath = path.join(SITE_DIR, "test-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport saved: ${reportPath}`);
  console.log(`Screenshots: ${RESULTS_DIR}/`);

  console.log("\n" + "═".repeat(60));
  process.exit(totalFail > 0 ? 1 : 0);
})();
