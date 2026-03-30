#!/usr/bin/env node
/**
 * render-page.js — TRUE template rendering: templates + content JSON → HTML
 *
 * TWO MODES:
 *   --static  → Copy static HTML + inject data-cms-* attributes (pixel-identical)
 *   --render  → Actually render templates with content JSON via Handlebars (DEFAULT)
 *
 * The render mode reads:
 *   1. templates/components/{page}/*.template.html  (Handlebars templates with {{fields.xxx}})
 *   2. content/components/{page}/*.json              (content data)
 *   3. content/pages/{page}.json                     (page assembly — component order)
 *
 * And produces:
 *   rendered/{page}.html  ← Real rendered output from templates + content
 *
 * Usage:
 *   node helpers/render-page.js <output-dir>              ← Template render mode (default)
 *   node helpers/render-page.js <output-dir> --static     ← Static copy mode
 */

const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');

const siteDir = process.argv[2];
if (!siteDir) { console.error('Usage: node helpers/render-page.js <output-dir>'); process.exit(1); }

const isStaticMode = process.argv.includes('--static');
const pageArg = process.argv.indexOf('--page');
const targetPage = pageArg >= 0 ? process.argv[pageArg + 1] : null;

const contentDir = path.join(siteDir, 'content');
const pagesDir = path.join(contentDir, 'pages');
const templateDir = path.join(siteDir, 'templates', 'components');
const renderedDir = path.join(siteDir, 'rendered');
const designDir = path.join(siteDir, 'design-system');

if (!fs.existsSync(renderedDir)) fs.mkdirSync(renderedDir, { recursive: true });

// ── Register Handlebars helpers ────────────────────────────
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('json', (obj) => JSON.stringify(obj));

// ── Find closing > of first tag (skip > inside attributes) ──
function findFirstTagEnd(html) {
  let inSQ = false, inDQ = false;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === '"' && !inSQ) inDQ = !inDQ;
    else if (ch === "'" && !inDQ) inSQ = !inSQ;
    else if (ch === '>' && !inSQ && !inDQ) return i;
  }
  return -1;
}

// ── Load <head> from static HTML ───────────────────────────
function loadHead(pageName) {
  const staticPath = path.join(siteDir, 'tailwind', 'pages', `${pageName}.html`);
  if (fs.existsSync(staticPath)) {
    const html = fs.readFileSync(staticPath, 'utf-8');
    const match = html.match(/<head>([\s\S]*?)<\/head>/);
    if (match) return match[1].trim().replace(/\.\.\/assets\//g, 'assets/');
  }
  // Fallback: minimal head
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>`;
}

// ── Find template file ─────────────────────────────────────
function findTemplate(pageName, compIndex, compName) {
  const dir = path.join(templateDir, pageName);
  if (!fs.existsSync(dir)) return null;
  const prefix = String(compIndex).padStart(2, '0') + '-';
  const file = fs.readdirSync(dir).find(f => f.startsWith(prefix) && f.endsWith('.template.html'));
  return file ? fs.readFileSync(path.join(dir, file), 'utf-8') : null;
}

// ── Find static generated HTML ─────────────────────────────
function findStaticHtml(pageName, compIndex, compName) {
  const dir = path.join(siteDir, '.claude-gen', pageName);
  if (!fs.existsSync(dir)) return null;
  const prefix = String(compIndex).padStart(2, '0') + '-';
  const file = fs.readdirSync(dir).find(f => f.startsWith(prefix) && f.endsWith('.html'));
  return file ? fs.readFileSync(path.join(dir, file), 'utf-8') : null;
}

// ── Render in STATIC mode (copy + inject attrs) ────────────
function renderStatic(pageJsonPath) {
  const pageData = JSON.parse(fs.readFileSync(pageJsonPath, 'utf-8'));
  const pageName = pageData.page;
  const staticPath = path.join(siteDir, 'tailwind', 'pages', `${pageName}.html`);

  if (fs.existsSync(staticPath)) {
    let html = fs.readFileSync(staticPath, 'utf-8');
    html = html.replace(/\.\.\/assets\//g, 'assets/');
    for (const comp of pageData.components) {
      const contentPath = path.join(contentDir, comp.contentFile);
      if (!fs.existsSync(contentPath)) continue;
      const esc = comp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(data-component="${esc}"[^>]*)>`);
      html = html.replace(regex, `$1 data-cms-content="${comp.contentFile}" data-cms-type="${comp.type}">`);
    }
    const outPath = path.join(renderedDir, `${pageName}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  → ${outPath} (static copy + CMS attrs)`);
    return;
  }
  console.warn(`  No static HTML found for ${pageName}`);
}

// ── Render in TEMPLATE mode (Handlebars) ───────────────────
function renderTemplate(pageJsonPath) {
  const pageData = JSON.parse(fs.readFileSync(pageJsonPath, 'utf-8'));
  const pageName = pageData.page;
  const headContent = loadHead(pageName);

  console.log(`  Page: ${pageName} (${pageData.components.length} components)`);

  let body = '';
  let renderedCount = 0;
  let fallbackCount = 0;

  for (const comp of pageData.components) {
    // Load content
    const contentPath = path.join(contentDir, comp.contentFile);
    const content = fs.existsSync(contentPath) ? JSON.parse(fs.readFileSync(contentPath, 'utf-8')) : {};

    // Load template
    let templateSrc = findTemplate(pageName, comp.index, comp.name);
    let rendered = null;
    let mode = '';

    if (templateSrc && Object.keys(content.fields || {}).length > 0) {
      // === TEMPLATE RENDER: Handlebars template + content JSON ===
      try {
        const template = Handlebars.compile(templateSrc, { noEscape: true });
        rendered = template(content);
        mode = 'template';
        renderedCount++;
      } catch (e) {
        console.warn(`    [${comp.index}] ${comp.name} — template error: ${e.message.substring(0, 60)}`);
        // Fallback to static
      }
    }

    if (!rendered) {
      // === FALLBACK: Use static generated HTML ===
      rendered = findStaticHtml(pageName, comp.index, comp.name);
      if (rendered) {
        rendered = rendered.replace(/\.\.\/assets\//g, 'assets/');
        mode = 'static';
        fallbackCount++;
      }
    }

    if (rendered) {
      // Inject CMS metadata attributes
      const cmsAttrs = ` data-cms-content="${comp.contentFile}" data-cms-type="${comp.type}" data-cms-render="${mode}"`;
      const tagEnd = findFirstTagEnd(rendered);
      if (tagEnd > 0) {
        body += rendered.substring(0, tagEnd) + cmsAttrs + rendered.substring(tagEnd) + '\n';
      } else {
        body += rendered + '\n';
      }
      console.log(`    [${comp.index}] ${comp.name} → ${mode} ✓`);
    } else {
      console.warn(`    [${comp.index}] ${comp.name} → MISSING`);
    }
  }

  // Assemble page
  const html = `<!DOCTYPE html>
<html lang="${pageData.language || 'en'}" dir="${pageData.direction || 'ltr'}">
<head>
  ${headContent}
</head>
<body>
${body}
</body>
</html>`;

  const outPath = path.join(renderedDir, `${pageName}.html`);
  fs.writeFileSync(outPath, html);

  // Copy assets
  const tailwindAssets = path.join(siteDir, 'tailwind', 'assets');
  const renderedAssets = path.join(renderedDir, 'assets');
  if (fs.existsSync(tailwindAssets) && !fs.existsSync(renderedAssets)) {
    try { fs.cpSync(tailwindAssets, renderedAssets, { recursive: true }); } catch (e) {}
  }

  // Content map
  const contentMap = {
    page: pageName, title: pageData.title, url: pageData.url,
    components: pageData.components.map(c => ({
      index: c.index, name: c.name, type: c.type,
      contentFile: c.contentFile,
      renderMode: findTemplate(pageName, c.index, c.name) ? 'template' : 'static'
    }))
  };
  fs.writeFileSync(path.join(renderedDir, `${pageName}-content-map.json`), JSON.stringify(contentMap, null, 2));

  console.log(`  → ${outPath}`);
  console.log(`  → ${renderedCount} template-rendered, ${fallbackCount} static fallback\n`);
}

// ── Main ───────────────────────────────────────────────────
function main() {
  const mode = isStaticMode ? 'STATIC (copy + attrs)' : 'TEMPLATE (Handlebars + content JSON)';
  console.log(`\nCMS Page Renderer — ${mode}\n`);

  if (!fs.existsSync(pagesDir)) {
    console.error('No content/pages/ directory. Run extract-content.js first.');
    process.exit(1);
  }

  const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));

  for (const pf of pageFiles) {
    const pageName = pf.replace('.json', '');
    if (targetPage && pageName !== targetPage) continue;

    if (isStaticMode) {
      renderStatic(path.join(pagesDir, pf));
    } else {
      renderTemplate(path.join(pagesDir, pf));
    }
  }

  console.log(`✓ Rendered pages in ${renderedDir}/`);
  if (!isStaticMode) {
    console.log(`\nHow it works:`);
    console.log(`  1. Templates: templates/components/{page}/*.template.html`);
    console.log(`  2. Content:   content/components/{page}/*.json`);
    console.log(`  3. Engine:    Handlebars replaces {{fields.xxx}} with content values`);
    console.log(`  4. Fallback:  Components without templates use static HTML`);
    console.log(`  5. Each component has data-cms-render="template" or "static"`);
    console.log(`\nTo update: edit content JSON → re-run this script → HTML updates\n`);
  }
}

main();
