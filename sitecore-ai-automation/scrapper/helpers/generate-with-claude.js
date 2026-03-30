/**
 * generate-with-claude.js — Prep + Assemble for Claude Code-driven generation
 *
 * No API key needed — Claude Code IS the generator.
 *
 * Two-phase workflow:
 *   Phase 1 (--prepare): Reads extracted data, writes per-component JSON prompts
 *   Phase 2 (--assemble): Reads generated HTML files, assembles into final pages
 *
 * Usage:
 *   node helpers/generate-with-claude.js output/{domain} --prepare
 *     → writes .claude-gen/{page}/{component}.json (prompt data)
 *     → writes .claude-gen/{page}/{component}.prompt.md (human-readable prompt)
 *
 *   # Claude Code generates HTML for each component (reads prompt, writes .html)
 *
 *   node helpers/generate-with-claude.js output/{domain} --assemble
 *     → reads .claude-gen/{page}/{component}.html
 *     → assembles into tailwind/index.html + pages/*.html
 *
 * Expects:
 *   {site_dir}/extracted/design-system.json
 *   {site_dir}/extracted/page-*.json (desktop 1440px)
 *   {site_dir}/extracted/page-*-375.json (mobile)
 *   {site_dir}/extracted/page-*-768.json (tablet)
 *   {site_dir}/tokens/dtcg-tokens.json
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CLI ARGS
// ============================================================
const args = process.argv.slice(2);
const siteDir = args[0];
const MODE = args.includes('--prepare') ? 'prepare'
  : args.includes('--assemble') ? 'assemble'
  : null;
const REACT_MODE = args.includes('--react');

if (!siteDir || !MODE) {
  console.error('Usage:');
  console.error('  node helpers/generate-with-claude.js output/{domain} --prepare');
  console.error('  node helpers/generate-with-claude.js output/{domain} --prepare --react');
  console.error('  node helpers/generate-with-claude.js output/{domain} --assemble');
  process.exit(1);
}

const MAX_TOKENS_PER_VIEWPORT = 6000;

// ============================================================
// PATHS
// ============================================================
const extractedDir = path.join(siteDir, 'extracted');
const tokensDir = path.join(siteDir, 'tokens');
const genDir = path.join(siteDir, '.claude-gen');
const outputDir = path.join(siteDir, 'tailwind');

// ============================================================
// SHARED HELPERS
// ============================================================
function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function preprocessComponents(components) {
  for (const comp of components) hideNavOverlays(comp, 0);
  return components;
}

function hideNavOverlays(node, depth) {
  if (!node || !node.c || depth > 5) return;
  const nodeH = parseFloat(node.s?.height) || 0;
  if (nodeH > 0 && nodeH < 250) {
    node.c = node.c.filter(child => {
      const cs = child.s || {};
      const childH = parseFloat(cs.height) || 0;
      const isAbsolute = cs.position === 'absolute' || cs.position === 'fixed';
      if (isAbsolute && childH >= 500) {
        console.log(`  [preprocess] Hiding nav overlay: ${child.tag} (${cs.width}x${cs.height})`);
        return false;
      }
      return true;
    });
  }
  for (const child of node.c) hideNavOverlays(child, depth + 1);
}

function compactNode(node, maxDepth = 12, depth = 0) {
  if (!node || depth > maxDepth) return null;
  const out = { tag: node.tag };
  if (node.s && Object.keys(node.s).length > 0) out.s = node.s;
  if (node.t) out.t = node.t;
  if (node.componentName) out.componentName = node.componentName;
  if (node.box) out.box = node.box;
  if (node.src) out.src = node.src;
  if (node.alt) out.alt = node.alt;
  if (node.href) out.href = node.href;
  if (node.svg) out.svg = node.svg;
  if (node.vsrc) out.vsrc = node.vsrc;
  if (node.poster) out.poster = node.poster;
  if (node.autoplay) out.autoplay = node.autoplay;
  if (node.muted) out.muted = node.muted;
  if (node.loop) out.loop = node.loop;
  if (node.type) out.type = node.type;
  if (node.placeholder) out.placeholder = node.placeholder;
  if (node.name) out.name = node.name;
  if (node.required) out.required = node.required;
  if (node.pseudos) out.pseudos = node.pseudos;
  if (node.cls) out.cls = node.cls;
  if (node.alignment) out.alignment = node.alignment;
  if (node.containerMaxWidth) out.containerMaxWidth = node.containerMaxWidth;
  if (node.contentPadding) out.contentPadding = node.contentPadding;
  if (node.c && node.c.length > 0) {
    out.c = node.c.map(c => compactNode(c, maxDepth, depth + 1)).filter(Boolean);
  }
  return out;
}

function estimateTokens(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

// ─── HTML skeleton from extracted DOM (tag + cls only) ────────────────────
// Gives Claude a readable structural blueprint alongside the JSON data.
function nodeToHtmlSkeleton(node, depth = 0) {
  if (!node) return '';
  const indent = '  '.repeat(Math.min(depth, 8));
  const tag = node.tag || 'div';

  const attrs = [];
  if (node.cls && node.cls.trim()) attrs.push(`class="${node.cls.trim()}"`);
  if (node.src) attrs.push(`src="${node.src}"`);
  if (node.alt != null) attrs.push(`alt="${node.alt}"`);
  if (node.href) attrs.push(`href="${node.href}"`);
  if (node.vsrc) attrs.push(`src="${node.vsrc}"`);
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

  const selfClosing = ['img', 'br', 'hr', 'input', 'link', 'meta'];
  if (selfClosing.includes(tag)) return `${indent}<${tag}${attrStr} />`;
  if (tag === 'svg') return `${indent}<svg${attrStr}><!-- icon --></svg>`;
  if (tag === 'video') return `${indent}<video${attrStr} autoplay muted loop></video>`;

  const children = [];
  if (node.t && node.t.trim()) {
    const text = node.t.trim();
    children.push(`${indent}  ${text.length > 80 ? text.substring(0, 80) + '…' : text}`);
  }
  if (node.c && node.c.length > 0) {
    if (depth < 10) {
      for (const child of node.c) {
        const h = nodeToHtmlSkeleton(child, depth + 1);
        if (h) children.push(h);
      }
    } else {
      children.push(`${indent}  <!-- ${node.c.length} children -->`);
    }
  }

  if (!children.length) return `${indent}<${tag}${attrStr}></${tag}>`;
  return `${indent}<${tag}${attrStr}>\n${children.join('\n')}\n${indent}</${tag}>`;
}

// ─── Unique typography tokens used inside a component ─────────────────────
// Returns an array of Tailwind-ready font strings for each distinct usage.
function extractComponentFonts(node, seen = new Map()) {
  if (!node) return seen;
  if (node.s) {
    const ff = node.s['font-family'];
    const fs = node.s['font-size'];
    const fw = node.s['font-weight'];
    const lh = node.s['line-height'];
    if (ff && fs) {
      const key = `${ff}|${fs}|${fw || '400'}`;
      if (!seen.has(key)) seen.set(key, { family: ff, size: fs, weight: fw || '400', lineHeight: lh || 'normal' });
    }
  }
  if (node.c) for (const child of node.c) extractComponentFonts(child, seen);
  return seen;
}

// ─── Extract content/props values from a component tree ──────────────────
// Walks the extracted DOM and collects every piece of actual content:
// headings, body text, images, links, videos, and repeated item groups.
// The result is used to build the "## Extracted Content" section of the prompt
// so Claude knows exactly what prop values to use — no tree hunting needed.
function extractContentProps(node, depth = 0, acc) {
  if (!acc) acc = { headings: [], texts: [], images: [], links: [], videos: [], overlines: [] };
  if (!node || depth > 18) return acc;

  const tag = (node.tag || '').toLowerCase();
  const text = (node.t || '').trim();

  if (/^h[1-6]$/.test(tag) && text) {
    acc.headings.push({ level: parseInt(tag[1]), text });
  } else if (tag === 'p' && text) {
    acc.texts.push(text);
  } else if (tag === 'img' && node.src) {
    // Skip tiny icons (data URIs and very short URLs) but keep real images/icons
    acc.images.push({ src: node.src, alt: node.alt || '' });
  } else if (tag === 'video' && node.vsrc) {
    acc.videos.push({ src: node.vsrc, poster: node.poster || '' });
  } else if (tag === 'source' && node.vsrc) {
    acc.videos.push({ src: node.vsrc });
  } else if (tag === 'a' && text) {
    acc.links.push({ text, href: node.href || '#' });
  } else if (tag === 'button' && text) {
    acc.links.push({ text, href: null, isButton: true });
  } else if (tag === 'span' && text && node.s) {
    // Catch overlines / labels that are only spans (e.g. uppercase tracking labels)
    const fs = parseFloat(node.s['font-size'] || '0');
    const transform = node.s['text-transform'] || '';
    if (transform === 'uppercase' && fs < 20) acc.overlines.push(text);
  }

  if (node.c) {
    for (const child of node.c) extractContentProps(child, depth + 1, acc);
  }
  return acc;
}

// Detect repeated card/item groups: children with same tag + similar child count
function detectRepeatingItems(node) {
  if (!node || !node.c || node.c.length < 2) return [];
  const groups = [];
  // Walk to find parent nodes whose children are structurally similar
  const candidates = node.c.filter(c => c.tag && c.c && c.c.length >= 1);
  if (candidates.length >= 2) {
    const firstChildCount = candidates[0].c.length;
    const similar = candidates.filter(c => Math.abs((c.c?.length || 0) - firstChildCount) <= 2);
    if (similar.length >= 2) {
      return similar.map(item => {
        const p = extractContentProps(item);
        return {
          heading: p.headings[0]?.text || '',
          description: p.texts[0] || '',
          image: p.images[0] || null,
          link: p.links[0] || null,
        };
      });
    }
  }
  // Recurse into children
  for (const child of node.c) {
    const found = detectRepeatingItems(child);
    if (found.length) groups.push(...found);
  }
  return groups;
}

// Format extracted content as a readable markdown section
function formatContentSection(node) {
  const props = extractContentProps(node);
  const items = detectRepeatingItems(node);
  const lines = [];

  if (props.overlines.length > 0) {
    lines.push(`**Overlines / Labels:** ${props.overlines.map(t => `"${t}"`).join(' · ')}`);
  }
  if (props.headings.length > 0) {
    lines.push(`**Headings:**`);
    props.headings.forEach(h => lines.push(`  - H${h.level}: "${h.text}"`));
  }
  if (props.texts.length > 0) {
    lines.push(`**Body Text / Descriptions:**`);
    props.texts.slice(0, 6).forEach(t => {
      lines.push(`  - "${t.length > 120 ? t.substring(0, 120) + '…' : t}"`);
    });
    if (props.texts.length > 6) lines.push(`  - … and ${props.texts.length - 6} more`);
  }
  if (props.images.length > 0) {
    lines.push(`**Images:**`);
    props.images.forEach(img => lines.push(`  - src: \`${img.src}\` | alt: "${img.alt}"`));
  }
  if (props.videos.length > 0) {
    lines.push(`**Videos:**`);
    props.videos.forEach(v => lines.push(`  - src: \`${v.src}\`${v.poster ? ` | poster: \`${v.poster}\`` : ''}`));
  }
  if (props.links.length > 0) {
    lines.push(`**Links / Buttons:**`);
    props.links.slice(0, 10).forEach(l => lines.push(`  - "${l.text}" → ${l.href || '(button)'}`));
    if (props.links.length > 10) lines.push(`  - … and ${props.links.length - 10} more`);
  }
  if (items.length > 0) {
    lines.push(`**Repeated Items (${items.length} detected — map to \`items=[]\` or \`cards=[]\` prop):**`);
    items.forEach((item, i) => {
      const parts = [];
      if (item.heading) parts.push(`heading: "${item.heading}"`);
      if (item.description) parts.push(`description: "${item.description.substring(0, 60)}…"`);
      if (item.image) parts.push(`image: "${item.image.src.split('/').pop().split('?')[0]}"`);
      if (item.link) parts.push(`link: "${item.link.text}"`);
      lines.push(`  ${i + 1}. { ${parts.join(', ')} }`);
    });
  }

  return lines;
}

// Adaptive depth: reduce tree depth for large components
function adaptiveCompact(node) {
  let depth = 12;
  let compact = compactNode(node, depth);
  while (estimateTokens(compact) > MAX_TOKENS_PER_VIEWPORT && depth > 4) {
    depth -= 1;
    compact = compactNode(node, depth);
  }
  return { compact, depth };
}

// Page file discovery
function getPageFiles() {
  return fs.readdirSync(extractedDir)
    .filter(f => f.startsWith('page-') && f.endsWith('.json'))
    .filter(f => !f.match(/page-.*-(375|768|1024|1440)\.json$/))
    .sort();
}

// ============================================================
// LINK REWRITING
// ============================================================
function buildLinkMap(pageFiles) {
  const map = {};
  for (const pf of pageFiles) {
    const name = pf.replace('page-', '').replace('.json', '');
    const pd = loadJson(path.join(extractedDir, pf));
    const pageUrl = pd.meta?.url || '';
    const isHome = name === 'home';
    const localPath = isHome ? 'index.html' : `pages/${name}.html`;
    if (pageUrl) {
      try {
        const urlObj = new URL(pageUrl);
        const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
        map[pageUrl] = localPath;
        map[urlObj.origin + pathname] = localPath;
        map[urlObj.origin + pathname + '/'] = localPath;
        map[pathname] = localPath;
        map[pathname + '/'] = localPath;
        if (pathname !== '/') map[pathname.replace(/\/$/, '')] = localPath;
      } catch {}
    }
  }
  return map;
}

function rewriteLinks(html, pagePathMap, baseUrl, isSubpage = false) {
  if (!baseUrl) return html;
  return html.replace(/href="([^"]+)"/g, (match, url) => {
    let localPath = pagePathMap[url] || pagePathMap[url.replace(/\/$/, '')];
    if (!localPath && url.startsWith(baseUrl)) {
      const urlPath = url.replace(baseUrl, '').replace(/\/$/, '') || '/';
      localPath = pagePathMap[urlPath];
    }
    if (!localPath) {
      const lower = url.toLowerCase();
      for (const [key, val] of Object.entries(pagePathMap)) {
        if (key.toLowerCase() === lower) { localPath = val; break; }
      }
    }
    if (!localPath) return match;
    if (isSubpage) {
      if (localPath === 'index.html') return `href="../index.html"`;
      if (localPath.startsWith('pages/')) return `href="${localPath.replace('pages/', '')}"`;
    }
    return `href="${localPath}"`;
  });
}

// ============================================================
// PHASE 1: PREPARE
// ============================================================
function runPrepare() {
  console.log(`Phase 1: PREPARE — Building per-component prompt data${REACT_MODE ? ' [REACT MODE]' : ''}\n`);

  const dsPath = path.join(extractedDir, 'design-system.json');
  if (!fs.existsSync(dsPath)) {
    console.error(`Error: ${dsPath} not found. Run extraction first.`);
    process.exit(1);
  }

  // Load tokens
  let dtcgTokens = null;
  const dtcgPath = path.join(tokensDir, 'dtcg-tokens.json');
  if (fs.existsSync(dtcgPath)) {
    dtcgTokens = loadJson(dtcgPath);
    console.log('Loaded DTCG tokens');
  }

  // Build compact token summary for prompts
  let tokenSummary = null;
  if (dtcgTokens) {
    tokenSummary = {};
    if (dtcgTokens.color) tokenSummary.colors = dtcgTokens.color;
    if (dtcgTokens.semantic) tokenSummary.semantic = dtcgTokens.semantic;
    if (dtcgTokens.typography) tokenSummary.typography = dtcgTokens.typography;
  }

  // ── Load component-info-sheet.md sections for injection into prompts ──────
  componentInfoSheet = (() => {
    const sheetPath = path.join(__dirname, '..', 'component-info-sheet.md');
    if (!fs.existsSync(sheetPath)) return {};
    const content = fs.readFileSync(sheetPath, 'utf-8');
    const sheetLines = content.split('\n');
    const sections = {};
    let currentKey = null;
    let currentLines = [];
    for (const line of sheetLines) {
      const h2Match = line.match(/^## \d+\. (.+)/);
      if (h2Match) {
        if (currentKey) sections[currentKey] = currentLines.join('\n');
        currentKey = h2Match[1].trim().toLowerCase();
        currentLines = [line];
        continue;
      }
      if (currentKey) currentLines.push(line);
    }
    if (currentKey) sections[currentKey] = currentLines.join('\n');
    return sections;
  })();
  if (Object.keys(componentInfoSheet).length > 0) {
    console.log(`Loaded component-info-sheet: ${Object.keys(componentInfoSheet).length} sections`);
  }

  // Map componentType → component-info-sheet section key
  COMPONENT_TYPE_TO_SHEET = {
    'header': 'header / navigation',
    'hero': 'hero section',
    'footer': 'footer',
    'stats': 'lists & data display',
    'card-grid': 'cards',
    'carousel': 'carousels & sliders',
    'form': 'forms',
    'tabs': 'tabs',
    'accordion': 'accordions & collapsibles',
    'table': 'tables',
    'timeline': 'timeline & stepper',
    'breadcrumb': 'breadcrumbs & pagination',
    'sidebar': 'sidebar & drawer navigation',
    'gallery': 'media components',
    'video-section': 'media components',
    'testimonials': 'testimonials & reviews',
    'pricing': 'pricing tables',
    'cta-banner': 'buttons & ctas',
    'content-section': 'content sections',
    'split-content': 'content sections',
    'feature-grid': 'cards',
    'logo-cloud': 'media components',
  };

  const pageFiles = getPageFiles();
  if (pageFiles.length === 0) {
    console.error(`No page-*.json files found in ${extractedDir}`);
    process.exit(1);
  }

  // Clean previous gen directory
  if (fs.existsSync(genDir)) {
    fs.rmSync(genDir, { recursive: true });
  }

  // Write shared tokens file once
  fs.mkdirSync(genDir, { recursive: true });
  if (tokenSummary) {
    fs.writeFileSync(path.join(genDir, 'tokens.json'), JSON.stringify(tokenSummary, null, 2));
  }

  // Load site profile (from examine-site.js) for dynamic rules
  let siteProfile = null;
  const profilePath = path.join(extractedDir, 'site-profile.json');
  if (fs.existsSync(profilePath)) {
    siteProfile = loadJson(profilePath);
    console.log(`Loaded site profile: ${siteProfile.generationHints?.length || 0} hints, ${siteProfile.cleaningRules?.length || 0} cleaning rules`);
  }

  // Load layout data (container system, fonts, baselines — from extract-layout.js)
  let layoutData = null;
  const layoutPath = path.join(extractedDir, 'layout.json');
  if (fs.existsSync(layoutPath)) {
    layoutData = loadJson(layoutPath);
    console.log(`Loaded layout: container ${layoutData.containers?.desktop?.maxWidth || 'none'}, font ${layoutData.baselines?.bodyFontFamily?.substring(0, 30)}`);
  }

  // Load interactions data (hover rules, animations, transitions)
  const interactionsMap = {};
  const interactionFiles = fs.readdirSync(extractedDir).filter(f => f.startsWith('interactions-') && f.endsWith('.json'));
  for (const iFile of interactionFiles) {
    const pageName = iFile.replace('interactions-', '').replace('.json', '');
    interactionsMap[pageName] = loadJson(path.join(extractedDir, iFile));
    const s = interactionsMap[pageName].summary || {};
    console.log(`Loaded interactions for ${pageName}: ${s.hoverRules || 0} hover rules, ${s.keyframes || 0} keyframes`);
  }

  // Detect source framework
  const sourceFramework = siteProfile?.sourceFramework || 'vanilla';
  console.log(`Source framework: ${sourceFramework}`);

  // Build DYNAMIC rules from static base + site-specific hints
  let dynamicRules = GENERATION_RULES;
  if (siteProfile && siteProfile.generationHints?.length > 0) {
    dynamicRules += '\n\n## Site-Specific Rules (auto-detected)\n\n';
    siteProfile.generationHints.forEach((hint, i) => {
      dynamicRules += `${i + 1}. ${hint}\n`;
    });
  }

  // Write the generation rules as a reference file
  fs.writeFileSync(path.join(genDir, 'RULES.md'), dynamicRules);

  let totalComponents = 0;
  const manifest = { pages: [] };

  for (const pageFile of pageFiles) {
    const pageName = pageFile.replace('page-', '').replace('.json', '');
    console.log(`\n  Page: ${pageName}`);

    const pageData = loadJson(path.join(extractedDir, pageFile));
    pageData.components = preprocessComponents(pageData.components || []);

    // Load viewport data
    const mobilePath = path.join(extractedDir, `page-${pageName}-375.json`);
    const tabletPath = path.join(extractedDir, `page-${pageName}-768.json`);
    let mobileData = null, tabletData = null;

    if (fs.existsSync(mobilePath)) {
      mobileData = loadJson(mobilePath);
      mobileData.components = preprocessComponents(mobileData.components || []);
    }
    if (fs.existsSync(tabletPath)) {
      tabletData = loadJson(tabletPath);
      tabletData.components = preprocessComponents(tabletData.components || []);
    }

    const hasResponsive = mobileData && tabletData;
    console.log(`  Viewports: ${hasResponsive ? '375 + 768 + 1440' : '1440 only'}`);

    const dComps = pageData.components;
    const mComps = mobileData?.components || [];
    const tComps = tabletData?.components || [];

    const pageDir = path.join(genDir, pageName);
    fs.mkdirSync(pageDir, { recursive: true });

    const pageManifest = {
      name: pageName,
      title: pageData.meta?.title || 'Page',
      lang: pageData.meta?.lang || 'en',
      dir: pageData.meta?.dir || 'ltr',
      components: []
    };

    for (let i = 0; i < dComps.length; i++) {
      const compName = dComps[i].componentName || `Section_${i + 1}`;
      const safeCompName = compName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${String(i).padStart(2, '0')}-${safeCompName}`;

      // Adaptive compact
      const { compact: dCompact, depth } = adaptiveCompact(dComps[i]);
      const mCompact = mComps[i] ? compactNode(mComps[i], depth) : null;
      const tCompact = tComps[i] ? compactNode(tComps[i], depth) : null;

      // Pre-compute Tailwind classes for each node using the deterministic mapper
      const twAdapter = require('./adapters/tailwind.js');
      const colorLookup = twAdapter.buildColorLookup(tokenSummary || {});
      function addTailwindClasses(node, parentStyles) {
        if (!node || !node.s) return node;
        node.tw = twAdapter.cssToTailwindClasses(node.s, colorLookup, parentStyles, {
          isSection: node.componentType != null,
          viewportWidth: 1440,
        }).join(' ');
        if (node.c) node.c = node.c.map(child => addTailwindClasses(child, node.s));
        return node;
      }
      const dWithTw = addTailwindClasses(JSON.parse(JSON.stringify(dCompact)), null);
      const mWithTw = mCompact ? addTailwindClasses(JSON.parse(JSON.stringify(mCompact)), null) : null;
      const tWithTw = tCompact ? addTailwindClasses(JSON.parse(JSON.stringify(tCompact)), null) : null;

      // Write component data JSON (for Claude Code to read)
      const compData = {
        componentName: compName,
        componentType: dComps[i].componentType || null,
        componentVariant: dComps[i].componentVariant || null,
        typeConfidence: dComps[i].typeConfidence || 0,
        index: i,
        desktop: dWithTw,
        mobile: mWithTw,
        tablet: tWithTw,
        tokens: tokenSummary
      };
      fs.writeFileSync(
        path.join(pageDir, `${fileName}.json`),
        JSON.stringify(compData, null, 2)
      );

      // Filter interactions for this component
      const pageInteractions = interactionsMap[pageName];
      let compInteractions = null;
      if (pageInteractions) {
        const lowerName = compName.toLowerCase();
        compInteractions = {
          hoverRules: (pageInteractions.hoverRules || []).filter(r => r.componentName?.toLowerCase().includes(lowerName) || r.componentName === 'body'),
          focusRules: (pageInteractions.focusRules || []).filter(r => r.componentName?.toLowerCase().includes(lowerName) || r.componentName === 'body'),
          transitions: (pageInteractions.transitions || []).slice(0, 5),
          keyframes: pageInteractions.keyframes || {}
        };
        // Only include if there's actual data
        if (compInteractions.hoverRules.length === 0 && compInteractions.focusRules.length === 0) {
          // Fall back to all hover rules (they often apply globally)
          compInteractions.hoverRules = (pageInteractions.hoverRules || []).slice(0, 10);
        }
      }

      // Crop component screenshot from full-page screenshot (desktop viewport)
      // Provides visual reference for the generation agent
      let screenshotRef = null;
      const desktopBox = dComps[i].box;
      if (desktopBox && desktopBox.h > 10) {
        const screenshotFile = path.join(extractedDir, `screenshot-${pageName}.png`);
        if (fs.existsSync(screenshotFile)) {
          try {
            const { PNG } = require('pngjs');
            const fullImg = PNG.sync.read(fs.readFileSync(screenshotFile));
            const cx = Math.max(0, Math.round(desktopBox.x || 0));
            const cy = Math.max(0, Math.round(desktopBox.y));
            const cw = Math.min(Math.round(desktopBox.w || fullImg.width), fullImg.width - cx);
            const ch = Math.min(Math.round(desktopBox.h), fullImg.height - cy);
            if (cw > 10 && ch > 10) {
              const cropped = new PNG({ width: cw, height: ch });
              for (let row = 0; row < ch; row++) {
                for (let col = 0; col < cw; col++) {
                  const si = ((cy + row) * fullImg.width + (cx + col)) * 4;
                  const di = (row * cw + col) * 4;
                  cropped.data[di] = fullImg.data[si];
                  cropped.data[di + 1] = fullImg.data[si + 1];
                  cropped.data[di + 2] = fullImg.data[si + 2];
                  cropped.data[di + 3] = fullImg.data[si + 3];
                }
              }
              const cropPath = path.join(pageDir, `${fileName}.screenshot.png`);
              fs.writeFileSync(cropPath, PNG.sync.write(cropped));
              screenshotRef = `${fileName}.screenshot.png`;
            }
          } catch (_) { /* pngjs not available or image too small — skip */ }
        }
      }

      // Write human-readable prompt (for Claude Code to follow)
      const typeInfo = { componentType: dComps[i].componentType, componentVariant: dComps[i].componentVariant, typeConfidence: dComps[i].typeConfidence };
      const prompt = buildPrompt(compName, dCompact, mCompact, tCompact, tokenSummary, compInteractions, sourceFramework, layoutData, typeInfo, REACT_MODE, screenshotRef);
      fs.writeFileSync(path.join(pageDir, `${fileName}.prompt.md`), prompt);

      const tokens = estimateTokens(compData);
      if (depth < 12) {
        console.log(`    ${compName}: depth=${depth}, ~${tokens} tokens`);
      } else {
        console.log(`    ${compName}: ~${tokens} tokens`);
      }

      pageManifest.components.push({
        name: compName,
        file: fileName,
        tokens
      });
      totalComponents++;
    }

    manifest.pages.push(pageManifest);
  }

  // Write manifest
  fs.writeFileSync(path.join(genDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Prepared ${totalComponents} components across ${manifest.pages.length} pages`);
  console.log(`  Prompt data: ${genDir}/`);
  console.log(`  Manifest: ${genDir}/manifest.json`);
  if (REACT_MODE) {
    console.log(`  Mode: REACT JSX — prompts ask for .jsx + .content.json output`);
    console.log(`\nNext: Ask Claude Code to generate JSX for each component.`);
    console.log(`  Each component → .jsx file + .content.json companion`);
    console.log(`  Place .jsx files in react-app/src/components/`);
    console.log(`  Place .content.json fields in react-app/src/content/en/`);
  } else {
    console.log(`\nNext: Ask Claude Code to generate HTML for each component.`);
    console.log(`Then: node helpers/generate-with-claude.js ${siteDir} --assemble`);
  }
}

// ── Module-level: component-info-sheet (loaded once, used by buildPrompt) ────
let componentInfoSheet = {};
let COMPONENT_TYPE_TO_SHEET = {};

function buildPrompt(compName, desktop, mobile, tablet, tokens, interactions, sourceFramework, layoutData, typeInfo, reactMode = false, screenshotRef = null) {
  const lines = [];
  lines.push(`# Generate: ${compName}\n`);
  lines.push(`Generate pixel-perfect responsive Tailwind HTML for the "${compName}" component.`);
  lines.push(`Follow the rules in RULES.md.`);
  lines.push(`\n**Pre-computed Tailwind**: Each node in the JSON has a \`tw\` field with deterministic Tailwind classes mapped from computed styles. USE these classes as your starting point — they are exact pixel-perfect values. Only adjust for responsive overrides (md:/lg: prefixes).`);
  if (screenshotRef) {
    lines.push(`\n**Visual Reference**: See \`${screenshotRef}\` — this is a cropped screenshot of the ORIGINAL component from the live site. Your output MUST visually match this image. Read this image before generating code.`);
  }
  lines.push('');

  // Layout context — always included so generator knows the page structure
  if (layoutData) {
    lines.push(`## Layout Context`);
    const c = layoutData.containers || {};
    if (c.desktop) {
      lines.push(`- Container: \`max-w-[${c.desktop.maxWidth}] mx-auto\` (desktop), padding: \`${c.desktop.paddingLeft} / ${c.desktop.paddingRight}\``);
    }
    if (c.tablet) {
      lines.push(`- Tablet container: \`max-w-[${c.tablet.maxWidth}]\`, padding: \`${c.tablet.paddingLeft} / ${c.tablet.paddingRight}\``);
    }
    if (c.mobile) {
      lines.push(`- Mobile container: \`max-w-[${c.mobile.maxWidth}]\`, padding: \`${c.mobile.paddingLeft} / ${c.mobile.paddingRight}\``);
    }
    const b = layoutData.baselines || {};
    if (b.bodyFontFamily) {
      lines.push(`- Body font: \`${b.bodyFontFamily.substring(0, 60)}\` / ${b.bodyFontSize} / ${b.bodyLineHeight}`);
    }
    const ts = layoutData.typeScale || {};
    const scaleItems = Object.entries(ts).map(([tag, v]) => `${tag}=${v.fontSize}`).join(', ');
    if (scaleItems) {
      lines.push(`- Type scale: ${scaleItems}`);
    }
    lines.push('');
  }

  // Component type classification — tells Claude WHAT this component is
  if (typeInfo && typeInfo.componentType) {
    const cType = typeInfo.componentType;
    const cVariant = typeInfo.componentVariant;
    const confidence = typeInfo.typeConfidence || 0;
    lines.push(`## Component Type: \`${cType}\`${cVariant ? ` (variant: \`${cVariant}\`)` : ''}`);
    lines.push(`Detection confidence: ${confidence}%\n`);

    const hintSource = reactMode ? (REACT_TYPE_GENERATION_HINTS[cType] || TYPE_GENERATION_HINTS[cType]) : TYPE_GENERATION_HINTS[cType];
    if (hintSource && hintSource.length > 0) {
      lines.push(`### Type-Specific Instructions`);
      hintSource.forEach(h => lines.push(`- ${h}`));
      lines.push('');
    }

    // Inject component-info-sheet section for this component type
    const sheetKey = COMPONENT_TYPE_TO_SHEET[cType];
    if (sheetKey && componentInfoSheet[sheetKey]) {
      const sheetContent = componentInfoSheet[sheetKey];
      // Truncate to ~150 lines to keep prompt manageable
      const sheetLines = sheetContent.split('\n').slice(0, 150);
      lines.push(`### Component Specification (from taxonomy)`);
      lines.push(`Reference specification for \`${cType}\` components. Follow these property tables for pixel-perfect output:\n`);
      lines.push(sheetLines.join('\n'));
      lines.push('');
    }

    // Global React rules — injected into EVERY React prompt
    if (reactMode) {
      lines.push(`### Global React Rules (apply to every component)`);
      REACT_GLOBAL_RULES.forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }
  }

  // ── React-only: HTML reference + component-specific fonts ─────────────────
  // These go BEFORE the JSON dumps so Claude orients structurally first,
  // then reads JSON for precise pixel values.
  if (reactMode && desktop) {
    const htmlSkel = nodeToHtmlSkeleton(desktop);
    const skelChars = htmlSkel.length;
    // Only include if reasonably sized (< ~12 000 chars ≈ 3 000 tokens)
    if (skelChars < 12000) {
      lines.push(`## Reference HTML Structure (desktop)`);
      lines.push(`Original tag + class structure extracted from the live site. Use this as your structural blueprint — get the nesting right, then fill in exact pixel values from the JSON below.\n`);
      lines.push('```html');
      lines.push(htmlSkel);
      lines.push('```\n');
    } else {
      lines.push(`## Reference HTML Structure`);
      lines.push(`(Structure too large to inline — ${Math.round(skelChars / 1000)}k chars. Rely on the JSON tree below.)\n`);
    }

    // Component-specific typography tokens
    const fontMap = extractComponentFonts(desktop);
    if (fontMap.size > 0) {
      lines.push(`## Component Typography (${fontMap.size} distinct usages)`);
      lines.push('Tailwind-ready classes for every font variant inside this component:\n');
      for (const [, f] of fontMap) {
        const family = f.family.split(',')[0].trim().replace(/["']/g, '');
        lines.push(`- \`text-[${f.size}] font-[${f.weight}] leading-[${f.lineHeight}] font-['${family}',sans-serif]\``);
      }
      lines.push('');
    }

    // Component content / props values — extracted from the live DOM
    const contentLines = formatContentSection(desktop);
    if (contentLines.length > 0) {
      lines.push(`## Extracted Content (use these as prop values)`);
      lines.push(`Everything below was found inside this component on the live site. Use these exact values when writing the content JSON and default props.\n`);
      contentLines.forEach(l => lines.push(l));
      lines.push('');
    }
  }

  if (tokens) {
    lines.push(`## Design Tokens`);
    lines.push('```json');
    lines.push(JSON.stringify(tokens, null, 1));
    lines.push('```\n');
  }

  // Source framework hint + preserve mode
  const preserveClasses = process.argv.includes('--preserve-classes');

  if (preserveClasses) {
    lines.push(`## Class Preservation Mode: ON`);
    lines.push(`The client wants to keep their existing CSS classes. The \`cls\` field on each node contains the original classes.`);
    lines.push(`Reuse \`cls\` values directly on each element. Only restructure HTML into clean components.`);
    lines.push(`Do NOT convert to Tailwind — preserve the original framework (${sourceFramework}).\n`);
  } else if (sourceFramework === 'tailwind') {
    lines.push(`## Source: Tailwind`);
    lines.push('This site uses Tailwind CSS. The `cls` field on each node contains original Tailwind classes.');
    lines.push('Reuse Tailwind utility classes from `cls` where they are standard (e.g. `flex`, `gap-4`, `px-4`).');
    lines.push('**CRITICAL: ALWAYS use computed typography from `s` object** for: `font-size`, `font-weight`, `font-family`, `line-height`, `letter-spacing`, `color`.');
    lines.push('Custom CSS classes in `cls` (like `typo-h1`, `text-brand`) do NOT work standalone — you must convert these to Tailwind arbitrary values from `s`.');
    lines.push('Example: if `cls` has `typo-h1` and `s` has `font-size: 70px`, `font-weight: 500` → use `text-[70px] font-[500] leading-[77px]`.\n');
  } else {
    lines.push(`## Source: ${sourceFramework}`);
    lines.push('Generate Tailwind from computed styles (`s`). The `cls` field shows original classes for reference only.\n');
  }

  // Alignment hint for generation
  if (desktop && desktop.alignment) {
    lines.push(`## Layout Alignment: \`${desktop.alignment}\``);
    if (desktop.alignment === 'full-bleed') {
      lines.push('This component stretches edge-to-edge. Use `w-full` with no max-width constraint.');
    } else if (desktop.alignment === 'contained') {
      lines.push(`Content is centered with max-width. Use \`w-full max-w-[${desktop.containerMaxWidth || '1296px'}] mx-auto\`.`);
    } else if (desktop.alignment === 'full-bleed-contained') {
      lines.push(`Background is full-bleed but inner content is constrained.`);
      lines.push(`Outer wrapper: \`w-full\`. Inner wrapper: \`max-w-[${desktop.containerMaxWidth || '1296px'}] mx-auto\`.`);
    }
    if (desktop.contentPadding) {
      lines.push(`Horizontal content padding: \`px-[${desktop.contentPadding}]\``);
    }
    lines.push('');
  }

  // MOBILE-FIRST ORDER: Mobile → Tablet → Desktop
  // Base Tailwind classes come from mobile. md: diffs from tablet. lg: diffs from desktop.
  if (mobile) {
    lines.push(`## 📱 Mobile (375px) — BASE CLASSES (no prefix)`);
    lines.push(`**Start here.** All base Tailwind classes come from this data. The \`tw\` field on each node has pre-computed classes.`);
    lines.push('```json');
    lines.push(JSON.stringify(mobile, null, 1));
    lines.push('```\n');
  }

  if (tablet) {
    lines.push(`## 📋 Tablet (768px) — md: overrides only`);
    lines.push(`Compare with mobile above. Only add \`md:\` prefix for values that DIFFER from mobile.`);
    lines.push('```json');
    lines.push(JSON.stringify(tablet, null, 1));
    lines.push('```\n');
  }

  lines.push(`## 🖥️ Desktop (1440px) — lg: overrides only`);
  lines.push(`Compare with tablet above. Only add \`lg:\` prefix for values that DIFFER from tablet.`);
  lines.push('```json');
  lines.push(JSON.stringify(desktop, null, 1));
  lines.push('```\n');

  // Cross-viewport diff summary — ACTIONABLE mobile-first instructions
  if (desktop?.box && mobile?.box) {
    lines.push(`## Responsive Blueprint (MOBILE-FIRST — use mobile values as base)`);
    lines.push('');
    lines.push(`| Property | Base (mobile 375px) | md: (tablet 768px) | lg: (desktop 1440px) |`);
    lines.push(`|----------|--------------------|--------------------|---------------------|`);
    lines.push(`| Height | ${mobile.box.h}px | ${tablet?.box?.h || '?'}px | ${desktop.box.h}px |`);
    lines.push(`| Width | ${mobile.box.w}px | ${tablet?.box?.w || '?'}px | ${desktop.box.w}px |`);

    // Padding comparison
    const mPad = mobile.s?.padding || '0';
    const tPad = tablet?.s?.padding || mPad;
    const dPad = desktop.s?.padding || tPad;
    if (mPad !== dPad) lines.push(`| Padding | ${mPad} | ${tPad !== mPad ? tPad : '—'} | ${dPad !== tPad ? dPad : '—'} |`);

    // Font size on root
    const mFs = mobile.s?.['font-size'] || '16px';
    const tFs = tablet?.s?.['font-size'] || mFs;
    const dFs = desktop.s?.['font-size'] || tFs;
    if (mFs !== dFs) lines.push(`| Font size | ${mFs} | ${tFs !== mFs ? tFs : '—'} | ${dFs !== tFs ? dFs : '—'} |`);

    // Layout direction (flex)
    const mDir = mobile.s?.['flex-direction'] || '';
    const dDir = desktop.s?.['flex-direction'] || '';
    if (mDir && dDir && mDir !== dDir) lines.push(`| Layout | flex-${mDir} | — | lg:flex-${dDir} |`);

    // Display
    const mDisp = mobile.s?.display || '';
    const dDisp = desktop.s?.display || '';
    if (mDisp !== dDisp && mDisp && dDisp) lines.push(`| Display | ${mDisp} | — | lg:${dDisp} |`);

    lines.push('');
    lines.push(`**IMPORTANT:** The "Base" column values become your DEFAULT classes (no prefix).`);
    lines.push(`Only add \`md:\` or \`lg:\` for values that CHANGE from the previous breakpoint.`);
    lines.push('');
  }

  // Interactions section (hover, focus, transitions, animations)
  if (interactions && (interactions.hoverRules?.length > 0 || interactions.focusRules?.length > 0 || Object.keys(interactions.keyframes || {}).length > 0)) {
    lines.push(`## Interactions\n`);

    if (interactions.hoverRules?.length > 0) {
      lines.push(`### Hover Effects`);
      interactions.hoverRules.slice(0, 15).forEach(r => {
        const props = Object.entries(r.styles || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
        lines.push(`- \`${r.selector}\` → ${props}`);
      });
      lines.push('');
    }

    if (interactions.focusRules?.length > 0) {
      lines.push(`### Focus Effects`);
      interactions.focusRules.slice(0, 10).forEach(r => {
        const props = Object.entries(r.styles || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
        lines.push(`- \`${r.selector}\` → ${props}`);
      });
      lines.push('');
    }

    if (interactions.transitions?.length > 0) {
      lines.push(`### Transitions`);
      interactions.transitions.slice(0, 5).forEach(t => {
        lines.push(`- \`${t.value}\` (${t.count}x)`);
      });
      lines.push('');
    }

    if (Object.keys(interactions.keyframes || {}).length > 0) {
      lines.push(`### Animations`);
      for (const [name, frames] of Object.entries(interactions.keyframes).slice(0, 5)) {
        const desc = Object.entries(frames).map(([k, v]) => `${k}: ${Object.entries(v).map(([p, val]) => `${p}:${val}`).join(', ')}`).join(' → ');
        lines.push(`- \`${name}\`: ${desc}`);
      }
      lines.push('');
    }
  }

  if (reactMode) {
    // ── React JSX output instructions ──────────────────────────────────────
    // Derive clean PascalCase function name: take consecutive PascalCase tokens before CSS utility fragments
    const fnName = (() => {
      const parts = compName.split(/[-_]/);
      const nameParts = [];
      for (const p of parts) {
        if (/^[A-Z]/.test(p)) nameParts.push(p);
        else break; // stop at first lowercase-starting segment (CSS utility)
      }
      // If no PascalCase parts found, PascalCase each segment of the original name
      const joined = nameParts.length > 0
        ? nameParts.join('')
        : parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      const raw = joined.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]+/, '');
      return raw || 'Component';
    })();
    lines.push(`## React Component Output\n`);
    lines.push(`Generate a **React JSX component** (not HTML). Rules:`);
    lines.push(`- \`export default function ${fnName}(props) { ... }\``);
    lines.push(`- All hardcoded text, images, links, and numbers must become **props**`);
    lines.push(`- Props structure: flat or nested objects matching the content hierarchy`);
    lines.push(`- Use \`import { useState } from 'react'\` for any interactive state (carousels, tabs, hamburger, accordion)`);
    lines.push(`- Replace ALL Alpine.js (\`x-data\`, \`x-show\`, \`@click\`) with React useState hooks`);
    lines.push(`- Keep ALL Tailwind classes exactly as you would for the HTML version`);
    lines.push(`- Inline SVGs stay inline — no external icon libraries`);
    lines.push(`- No TypeScript, no PropTypes — plain JavaScript JSX only`);
    lines.push(`- Default prop values with \`= []\` or \`= ''\` or \`= null\` for optional fields`);
    lines.push(``);
    lines.push(`### Props Convention`);
    lines.push(`Follow this prop naming pattern based on component type:`);
    lines.push(`- Text fields: \`heading\`, \`subheading\`, \`description\`, \`overline\`, \`sectionTitle\``);
    lines.push(`- Images: \`{ src, alt }\` objects`);
    lines.push(`- Links/CTAs: \`{ text, href }\` objects`);
    lines.push(`- Collections: \`cards = []\`, \`slides = []\`, \`items = []\`, \`links = []\``);
    lines.push(`- Boolean flags: \`isFixed\`, \`showScroll\`, etc.`);
    lines.push(``);
    lines.push(`### Content JSON`);
    lines.push(`After the JSX component, output a second file: a content JSON with ALL the extracted values.`);
    lines.push(`Format:`);
    lines.push('```json');
    lines.push(`{`);
    lines.push(`  "type": "${typeInfo?.componentType || 'content-section'}",`);
    lines.push(`  "componentName": "${fnName}",`);
    lines.push(`  "fields": { /* all prop values extracted from the DOM data above */ }`);
    lines.push(`}`);
    lines.push('```');
    lines.push(``);
    lines.push(`### Interactive Patterns (React equivalents)`);
    lines.push(`| Pattern | React Hook |`);
    lines.push(`|---------|------------|`);
    lines.push(`| Hamburger menu | \`const [menuOpen, setMenuOpen] = useState(false)\` |`);
    lines.push(`| Carousel | \`const [current, setCurrent] = useState(0)\` |`);
    lines.push(`| Tabs | \`const [activeTab, setActiveTab] = useState(0)\` |`);
    lines.push(`| Accordion item | \`const [open, setOpen] = useState(false)\` |`);
    lines.push(`| Dropdown | \`const [open, setOpen] = useState(false)\` + onMouseEnter/Leave |`);
    lines.push(``);
    lines.push(`Output ONLY the JSX code. No markdown fences, no explanations.`);
    lines.push(`Save as the matching .jsx file (same name as this prompt, with .jsx extension).`);
    lines.push(`Save the content JSON as a separate .content.json file (same name + .content.json extension).`);
  } else {
    lines.push(`Output ONLY raw HTML. No markdown fences, no explanations.`);
    lines.push(`Save as the matching .html file (same name as this prompt, with .html extension).`);
  }

  return lines.join('\n');
}

// ============================================================
// PHASE 2: ASSEMBLE
// ============================================================
function runAssemble() {
  console.log('Phase 2: ASSEMBLE — Building final HTML pages\n');

  if (!fs.existsSync(path.join(genDir, 'manifest.json'))) {
    console.error(`Error: ${genDir}/manifest.json not found. Run --prepare first.`);
    process.exit(1);
  }

  const manifest = loadJson(path.join(genDir, 'manifest.json'));
  const designSystem = loadJson(path.join(extractedDir, 'design-system.json'));

  // Load Tailwind config
  let twConfig = {};
  const twConfigPath = path.join(siteDir, 'design-system', 'tailwind.config.js');
  if (fs.existsSync(twConfigPath)) {
    const twContent = fs.readFileSync(twConfigPath, 'utf-8');
    const match = twContent.match(/module\.exports\s*=\s*(\{[\s\S]*\});/);
    if (match) {
      try { twConfig = eval('(' + match[1] + ')'); } catch {}
    }
  }
  twConfig.theme = twConfig.theme || {};
  const twConfigJson = JSON.stringify(twConfig, null, 2);

  // Font faces
  const fontFaces = (designSystem.fontFaces || [])
    .filter(f => f.family && f.family.toLowerCase() !== 'swiper-icons')
    .map(ff => `@font-face { font-family: '${ff.family}'; src: ${ff.src}; font-weight: ${ff.weight}; font-style: ${ff.style || 'normal'}; }`)
    .join('\n    ');

  // Link rewriting
  const pageFiles = getPageFiles();
  const pagePathMap = buildLinkMap(pageFiles);
  const baseUrl = (() => {
    const firstPage = loadJson(path.join(extractedDir, pageFiles[0]));
    try { return new URL(firstPage.meta?.url || '').origin; } catch { return ''; }
  })();

  fs.mkdirSync(outputDir, { recursive: true });

  let assembled = 0;
  let missing = 0;

  for (const page of manifest.pages) {
    const pageDir = path.join(genDir, page.name);
    const componentHtmlParts = [];

    for (const comp of page.components) {
      const htmlPath = path.join(pageDir, `${comp.file}.html`);
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf-8').trim();
        componentHtmlParts.push('  ' + html);
        assembled++;
      } else {
        console.warn(`  Missing: ${page.name}/${comp.file}.html (${comp.name})`);
        componentHtmlParts.push(`  <!-- Missing: ${comp.name} — generate this component first -->`);
        missing++;
      }
    }

    const body = componentHtmlParts.join('\n\n');

    let finalHtml = `<!DOCTYPE html>
<html lang="${page.lang}" dir="${page.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script>
    tailwind.config = ${twConfigJson};
  </script>
  <style>
    ${fontFaces}
    /* Reset for pixel-perfect rendering */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { overflow-x: hidden; }
    /* Sections span full viewport; center non-positioned content containers */
    [data-component] > *:not([class*="absolute"]):not([class*="fixed"]) {
      margin-left: auto;
      margin-right: auto;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { text-decoration: none; color: inherit; }
    button { font-family: inherit; cursor: pointer; border: none; background: none; }
    svg { display: block; }
    video { display: block; width: 100%; height: 100%; object-fit: cover; }

    @media (max-width: 640px) {
      img { max-width: 100% !important; height: auto !important; }
      svg { max-width: 100%; }
      [data-component] { overflow: hidden; max-width: 100vw; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;

    const isHome = page.name === 'home' || manifest.pages.length === 1;
    finalHtml = rewriteLinks(finalHtml, pagePathMap, baseUrl, !isHome);

    const htmlPath = isHome
      ? path.join(outputDir, 'index.html')
      : path.join(outputDir, 'pages', `${page.name}.html`);

    if (!isHome) fs.mkdirSync(path.join(outputDir, 'pages'), { recursive: true });
    fs.writeFileSync(htmlPath, finalHtml);
    console.log(`  → ${path.relative(siteDir, htmlPath)} (${page.components.length} components)`);
  }

  // Copy tailwind.config.js
  const twSrc = path.join(siteDir, 'design-system', 'tailwind.config.js');
  if (fs.existsSync(twSrc)) {
    fs.copyFileSync(twSrc, path.join(outputDir, 'tailwind.config.js'));
    console.log(`  → tailwind.config.js`);
  }

  console.log(`\n✓ Assembled ${assembled} components (${missing} missing)`);
  console.log(`  Output: ${outputDir}/`);
  if (missing > 0) {
    console.log(`  ⚠ ${missing} components need generation — re-run --assemble after generating them`);
  } else {
    // Auto-run download-assets.js if --download flag is set
    const shouldDownload = process.argv.includes('--download');
    if (shouldDownload) {
      console.log(`\n── Downloading assets ──`);
      const { execSync } = require('child_process');
      try {
        execSync(`node "${path.join(__dirname, 'download-assets.js')}" "${outputDir}"`, { stdio: 'inherit' });
      } catch (e) {
        console.warn('Asset download failed (non-fatal):', e.message);
      }
    } else {
      console.log(`  Run next: node helpers/download-assets.js ${outputDir}`);
    }
  }
}

// ============================================================
// TYPE-SPECIFIC GENERATION HINTS (from component-info-sheet.md)
// ============================================================
const TYPE_GENERATION_HINTS = {
  'header': [
    'Build as semantic <header> with <nav>. Logo on left, links horizontal on desktop, hamburger on mobile.',
    'CHECK extracted `position` in `s` object: if `fixed` → use `fixed top-0 inset-x-0 z-50`. If `absolute` → use `absolute top-0 inset-x-0 z-50`. If `sticky` → use `sticky top-0 z-50`.',
    'CHECK extracted `background-color`: if transparent/rgba(0,0,0,0) → header overlays hero. Use `bg-transparent` as base. Do NOT add opaque bg.',
    'Mobile header: typically compact (h-[52px] to h-[60px]), shows logo + hamburger only. Desktop: taller (h-[100px]+), shows full nav.',
    'ALPINE.JS: `x-data="{ menuOpen: false }"` on <header>. Hamburger: `@click="menuOpen = !menuOpen"`. Mobile nav: `x-show="menuOpen" x-transition @click.outside="menuOpen = false" class="lg:hidden"`.',
    'If dropdown/mega-menu navs exist: wrap each in `x-data="{ open: false }" @mouseenter="open = true" @mouseleave="open = false"`. Submenu: `x-show="open" x-transition`.',
    'MEGA-MENU (MANDATORY if site-profile shows hasMegaMenu:true): Content JSON has `megaMenuData` (rich structure with sections/headings/featured) or `navStructure` (flat links fallback). USE THIS DATA — NEVER hardcode placeholder text. Mega-menus typically have: section headings grouping links, descriptions per link, featured card with image/CTA, "View All" links. Render the FULL structure. Desktop: absolute dropdown panel on hover (onMouseEnter/onMouseLeave). Mobile: accordion sections in hamburger menu.',
    'Desktop nav: `class="hidden lg:flex"`. Use extracted gap/spacing between nav items.'
  ],
  'hero': [
    'Use min-h from extracted height. bg-cover bg-center bg-no-repeat for background images.',
    'Add overlay div (absolute inset-0 bg-black/40) if background-overlay detected in styles.',
    'Content area: respect content-position and use max-w constraint. Left-aligned or centered.',
    'CTAs: primary button + optional secondary, inline on desktop (flex-row gap-4), stacked on mobile (flex-col).',
    'If hero-video variant: use <video autoplay muted loop playsinline> with absolute positioning behind content.',
    'Scroll indicator: centered at bottom with animate-bounce chevron.'
  ],
  'feature-grid': [
    'CSS grid with responsive columns: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 (or 4 based on extraction).',
    'Each item: icon on top (or left), heading below, description text, optional link/arrow.',
    'Equal height items: h-full on each card + flex-col with grow on text area.',
    'Section heading centered above grid with max-w-2xl mx-auto if present.',
    'ICON POSITIONING: Check extraction for icon-position — `top` (icon centered above heading), `left` (icon beside text in flex-row), or `inline` (icon inline with heading). Icon background: circle/square bg behind icon if detected (rounded-full bg-brand/10 p-3).',
    'ICON SIZING: Icons should be uniform size (w-10 h-10 or w-12 h-12). Use object-contain for image icons. SVG icons: set width/height explicitly. Color from extraction or brand color.',
    'HOVER EFFECTS: Check extraction for hover-effect — shadow-lift (hover:shadow-lg hover:-translate-y-1), scale (hover:scale-[1.02]), border-color change (hover:border-brand), or bg-change. Always add transition-all duration-300.',
    'RESPONSIVE COLUMNS: Match exact column count from extraction per breakpoint. Common patterns: 1→2→3, 1→2→4, 1→3. Gap from extraction (gap-6 or gap-8 typical).',
    'DESCRIPTION TRUNCATION: If text is long, apply line-clamp-2 or line-clamp-3 on description text. Links at bottom: text-link with arrow (→) or "Learn More" pattern.'
  ],
  'split-content': [
    'Two-column layout: image + text side by side on desktop, stacked on mobile.',
    'Use grid grid-cols-1 lg:grid-cols-2 gap-[Xpx] items-center.',
    'Image: object-cover with rounded corners if detected. Maintain aspect ratio.',
    'If image-right variant: use lg:order-2 on image column to reverse visual order.',
    'If alternating pattern across sections: alternate flex-row and flex-row-reverse.'
  ],
  'stats': [
    'Large numbers with labels in a row. Use text-[48px] or larger font-bold for numbers.',
    'Layout: grid grid-cols-2 md:grid-cols-4 gap-[Xpx].',
    'Preserve suffixes (+, %, K, M, B) as inline text with the number.',
    'If separators detected: add border-r between items on desktop (last:border-r-0).',
    'Mobile: stack to 1-2 columns with border-b instead of border-r.'
  ],
  'logo-cloud': [
    'Logo images in a row or grid. Apply grayscale if detected (grayscale hover:grayscale-0 transition-all).',
    'Uniform max-height for all logos (h-8 or h-12). Use object-contain.',
    'Optional heading above: "Trusted by" / "Our Partners".',
    'If marquee/scrolling: use overflow-hidden with flex and animation.',
    'GRAYSCALE-TO-COLOR HOVER: Check extraction for logo-treatment. If grayscale: apply `grayscale hover:grayscale-0 transition-all duration-300` on each logo. If opacity: apply `opacity-50 hover:opacity-100 transition-opacity`.',
    'UNIFORM HEIGHT: All logos MUST have the same max-height (h-8, h-10, or h-12) with object-contain to prevent distortion. Width can vary naturally. Wrap logos in flex items-center justify-center containers.',
    'MARQUEE/INFINITE SCROLL: For scrolling variant, duplicate logo list for seamless loop. Use CSS @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } with animation: marquee Xs linear infinite. Pause on hover: hover:[animation-play-state:paused].',
    'RESPONSIVE WRAP: Static grid: flex flex-wrap justify-center items-center gap-8 lg:gap-12. On mobile, logos may shrink or show fewer per row. Ensure adequate spacing between logos.',
    'LAZY LOADING: Add loading="lazy" on all logo images since logo clouds are often below the fold.'
  ],
  'cta-banner': [
    'Short call-to-action section with heading + subtext + 1-2 buttons.',
    'Often has distinctive background (gradient, brand color, or image with overlay).',
    'Center-align content with max-w-2xl or max-w-3xl mx-auto.',
    'Buttons: inline on desktop, stacked full-width on mobile.',
    'BUTTON HIERARCHY: Primary CTA (solid, high contrast) + optional secondary (outline/ghost). Primary should visually dominate. Match button sizes and variants from extraction.',
    'SHAPE VARIANTS: full-width banner (w-full with py-16+), rounded-card within container (rounded-2xl p-8 lg:p-12), or contained-card with shadow. Check extraction for border-radius and padding.',
    'BACKGROUND CONTRAST: Ensure text has sufficient contrast against bg. For image backgrounds: add overlay (absolute inset-0 bg-black/50). For solid color: use contrasting text color.',
    'RESPONSIVE STACKING: On mobile, heading/subtext/buttons stack vertically (flex-col text-center). On desktop, may use left-right-split layout (heading+text left, buttons right) if extraction shows that pattern.',
    'DECORATIVE ELEMENTS: Check extraction for background illustrations, shapes, or patterns. Render as absolute-positioned elements with low z-index behind content.'
  ],
  'card-grid': [
    'Repeated cards in responsive grid. Match exact column count from extraction data.',
    'Card structure: image (aspect-video or aspect-[4/3]), content area (p-4 or p-6), optional footer.',
    'Equal card heights: h-full on card + flex-col, let content area grow.',
    'Hover effects: hover:shadow-lg hover:-translate-y-1 transition-all duration-300.',
    'Image hover: group + group-hover:scale-110 with overflow-hidden on image container.',
    'PSEUDO-ELEMENT OVERLAYS: Check the `pseudos` array in extraction data for each card. If a ::before/::after has a background-color (e.g., rgba(0,20,60,0.55)), add an absolute-positioned <div> with that background as a dark overlay on the card. This is CRITICAL for cards with background images.'
  ],
  'testimonials': [
    'Quote text with author name/role/avatar pattern.',
    'If carousel: show 1 active testimonial, overflow-hidden, navigation dots below.',
    'Large opening quote mark as decorative element (text-6xl text-brand/20 or SVG).',
    'Avatar: rounded-full w-12 h-12 object-cover.',
    'QUOTE MARKS: Decorative large opening quote — use text-6xl or text-8xl font-serif text-brand/20 (or SVG). Position: absolute top-0 left-0 or relative above quote text. Closing quote mark optional.',
    'AVATAR SIZING: Consistent avatar size across all testimonials. Common sizes: w-12 h-12 (small), w-16 h-16 (medium). Always rounded-full with object-cover. Add ring-2 ring-white or border-2 border-brand for emphasis.',
    'STAR RATING: If rating present in extraction, render 1-5 stars using SVG. Filled stars: text-yellow-400. Empty stars: text-gray-300. Place above or below quote text. Use flex gap-1 for star row.',
    'COMPANY LOGO: If company-logo in extraction, render below author name/role. Small size (h-6 or h-8) with object-contain. Adds credibility to testimonial.',
    'CAROUSEL VS GRID: Check extraction for layout. Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6. Carousel: single testimonial visible with Alpine.js navigation (see carousel hints). Masonry: columns-1 md:columns-2 lg:columns-3 for varying quote lengths.'
  ],
  'pricing': [
    'Side-by-side plan cards. Highlighted/recommended plan gets scale-105 or ring-2 ring-brand.',
    'Each card: plan name, price (large), period (/mo), feature list with check/x marks, CTA button.',
    'If toggle (monthly/annual): render both price values, show active one.',
    'RECOMMENDED PLAN HIGHLIGHT: Check extraction for highlighted-plan. Apply scale-105 (slightly larger), ring-2 ring-brand, shadow-xl, or distinct bg-color. Add "Recommended" / "Most Popular" badge (absolute -top-4 left-1/2 -translate-x-1/2 bg-brand text-white px-4 py-1 rounded-full text-sm).',
    'TOGGLE MONTHLY/ANNUAL: Alpine.js: x-data="{ annual: false }". Toggle switch between "Monthly" and "Annual" labels. Show savings badge near toggle: "Save 20%" with bg-green-100 text-green-700. Display correct price based on toggle state using x-show or x-text.',
    'FEATURE LIST: Each feature as flex items-center gap-2. Available features: green checkmark SVG + text. Unavailable: gray X or dash + text-gray-400 line-through. Tooltip (?) icon for feature explanations.',
    'CTA PER PLAN: Highlighted plan gets solid primary button (bg-brand text-white). Other plans get outline button (border-brand text-brand). All buttons full width at bottom of card (mt-auto for flex-col push-to-bottom).',
    'PRICE EMPHASIS: Price number in large font (text-4xl or text-5xl font-bold). Period text (/mo, /year) in smaller muted text (text-base text-gray-500). Original price with line-through if discount shown.'
  ],
  'form': [
    'Clean form layout with proper <label> + <input> pairs.',
    'Input styling: consistent border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-brand.',
    'If floating labels detected: use peer + peer-placeholder-shown pattern.',
    'Submit button: matches site CTA style. Full-width on mobile, right-aligned on desktop.',
    'Error states: text-red-500 text-sm below inputs.'
  ],
  'tabs': [
    'ALPINE.JS: Add `x-data="{ activeTab: 0 }"` on tab container.',
    'Tab buttons: `@click="activeTab = N"` with `:class="activeTab === N ? \'active-styles\' : \'inactive-styles\'"`. Use extracted active/inactive colors.',
    'Tab panels: `x-show="activeTab === N" x-transition` for each content panel.',
    'Render ALL tab contents in the HTML (not just active). Alpine controls visibility.',
    'Mobile: overflow-x-auto with flex-nowrap for horizontal scroll of tab buttons.'
  ],
  'accordion': [
    'ALPINE.JS: Wrap each item in `x-data="{ open: false }"` (first item: `{ open: true }`).',
    'Header button: `@click="open = !open"`. Chevron: `:class="open ? \'rotate-180\' : \'\'"` with transition-transform.',
    'Content panel: `x-show="open" x-collapse` for smooth height animation.',
    'Each item: button header with chevron/plus icon on right, content panel below.',
    'SINGLE-OPEN VS MULTI-OPEN: Check extraction for multiple-open. If single-open (only one panel at a time): use parent x-data="{ activeIndex: 0 }" with each item checking activeIndex === i. If multi-open: each item has its own x-data="{ open: false }".',
    'ICON ROTATION: Chevron icon rotates 180° on expand. Plus/minus: swap between + and × (or −). Use transition-transform duration-200 for smooth animation. Icon position from extraction (left or right of header text).',
    'BORDER BETWEEN ITEMS: Check extraction for variant — bordered (divide-y divide-gray-200), separated (space-y-2 with individual borders), flush (no borders, just content division). Apply matching border pattern.',
    'CONTENT PADDING: Expanded content gets adequate padding (px-4 pb-4 or px-6 pb-6). Content may include rich text, lists, images — ensure they render properly within the panel.',
    'FAQ SCHEMA: If accordion is used for FAQ content, add JSON-LD FAQPage schema.org markup in a <script type="application/ld+json"> tag for SEO benefits.'
  ],
  'carousel': [
    'ALPINE.JS: Add `x-data="{ current: 0, total: N }"` where N = actual slide count.',
    'Prev button: `@click="current = (current - 1 + total) % total"`. Next: `@click="current = (current + 1) % total"`.',
    'Slides wrapper: `:style="\'transform: translateX(-\' + (current * 100) + \'%)\'"` with `transition-transform duration-500`.',
    'Each slide: `class="w-full flex-shrink-0"`. Container: `class="overflow-hidden"`.',
    'Dots: `<template x-for="i in total"><button @click="current = i-1" :class="current===i-1 ? \'bg-brand\' : \'bg-gray-300\'"></button></template>`.',
    'COLLECTION CAROUSELS (news, timeline, logos): render ALL items. `total` must match actual count.',
    'For multi-card carousels (3 visible): use `translateX(-${current * (100/3)}%)` and `w-1/3 flex-shrink-0` per slide.'
  ],
  'footer': [
    'Build as semantic <footer>. Dark background (#1a1a2e or similar) with light text.',
    'Multi-column layout: logo+about (col 1), link columns (cols 2-4), newsletter/contact (last col).',
    'RENDER ALL LINKS: extraction captures all text items including secondary sub-links under each column heading. Render EVERY link — column heading AND its sub-links. Do NOT skip sub-items.',
    'Mobile: stack columns vertically. Link groups may collapse as accordions.',
    'Sub-footer: border-t mt-8 pt-4 with copyright text + legal links (Privacy, Terms, etc.).',
    'Social icons: flex row gap-4, SVG icons or font-awesome. hover:text-brand transition.'
  ],
  'table': [
    'Responsive table: overflow-x-auto wrapper with min-w-full table inside.',
    'Header: bg-gray-50 font-semibold text-left. Rows: even:bg-gray-50 for striping.',
    'Borders: divide-y divide-gray-200. Cell padding: px-4 py-3.',
    'OVERFLOW-X-AUTO WRAPPER: Always wrap table in <div class="overflow-x-auto"> for mobile horizontal scroll. Table gets min-w-full to prevent squishing. Add -webkit-overflow-scrolling: touch for smooth mobile scroll.',
    'STICKY FIRST COLUMN: If extraction shows sticky column — first <th>/<td> gets sticky left-0 z-10 bg-white (or bg-gray-50 for header). Add shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] on sticky column for depth indicator.',
    'ZEBRA STRIPING: Use even:bg-gray-50 or odd:bg-gray-50 on <tr> elements. Add hover:bg-gray-100 for row hover. Header row: bg-gray-100 or bg-gray-50 with font-semibold.',
    'SORT INDICATORS: If sortable columns detected, add sort icon (chevron-up/down SVG) in header cells. Active sort: text-brand with filled chevron. Inactive: text-gray-400 with outline chevron.',
    'RESPONSIVE STRATEGY: Check extraction for responsive-strategy. horizontal-scroll (default, overflow-x-auto), stack (each row becomes a card on mobile with label:value pairs), or hide-columns (hide non-essential columns on mobile with hidden md:table-cell).',
    'CELL ALIGNMENT: Match alignment from extraction — text-left for text, text-right for numbers/currency, text-center for status/badges. Vertical align: align-middle on <td>.'
  ],
  'timeline': [
    'Vertical line with nodes at each step. Line: absolute left-1/2 w-0.5 bg-gray-300.',
    'Nodes: w-4 h-4 rounded-full bg-brand on the line.',
    'Content alternates left/right on desktop, single column on mobile.',
    'VERTICAL LINE POSITIONING: Use relative container with absolute vertical line. Desktop: left-1/2 -translate-x-1/2. Mobile: left-4 or left-6 (single-side). Line style from extraction: solid/dashed/dotted, color may differ for completed vs upcoming segments.',
    'NODE/MARKER STYLING: Check extraction for node-shape (circle/square/diamond), node-size (w-6 h-6 typical), and node-icon (number, checkmark, or custom icon inside). Completed nodes: bg-brand. Current: ring-2 ring-brand bg-white. Upcoming: bg-gray-200.',
    'ALTERNATING LAYOUT: Desktop — odd items text-right on left side, even items text-left on right side (using grid grid-cols-2 with items placed in alternating columns). Mobile — all items on one side with left padding for the line.',
    'DATE/YEAR BADGES: Render date/year text prominently — either above the node (font-semibold text-brand), beside the node, or as a badge (bg-brand text-white px-3 py-1 rounded-full text-sm). Position from extraction.',
    'CONNECTING LINE: Width from extraction (w-0.5 or w-px typical). Color: bg-gray-300 or bg-brand for completed portions. Ensure line starts at first node and ends at last node (not extending beyond).'
  ],
  'breadcrumb': [
    'Horizontal list with separator (/ or > or chevron) between items.',
    'Last item is current page — no link, font-medium or text-gray-500.',
    'Usually small text (text-sm) with text-gray-500 links.',
    'SEPARATOR TYPES: Check extraction for separator — `/` (text), `>` (text), chevron SVG icon (w-4 h-4 text-gray-400), or `·` (dot). Separator color should be muted (text-gray-400). Use flex items-center gap-2 for consistent spacing.',
    'CURRENT PAGE STYLING: Last item: font-medium or font-semibold, text-gray-900 (not a link, use <span>). Previous items: text-gray-500 hover:text-gray-700 as <a> tags. First item may use a home icon (house SVG) instead of text.',
    'MOBILE TRUNCATION: On mobile, show only last 2-3 items with "..." ellipsis for deep paths. Use overflow-hidden text-ellipsis whitespace-nowrap on long item text. Consider hiding on very small screens if extraction shows mobile-behavior: hide.',
    'STRUCTURED DATA: Add JSON-LD BreadcrumbList schema.org markup in a <script type="application/ld+json"> tag for SEO. Each item gets position, name, and item (URL).',
    'SPACING: Small vertical padding (py-2 or py-3). Often placed below header or at top of content area. Background usually matches page background or has subtle border-b border-gray-100.'
  ],
  'sidebar': [
    'Fixed width (w-64 or w-80) on desktop. Hidden or drawer on mobile.',
    'Navigation items: vertical list with hover:bg-gray-100 and active indicator.',
    'May have sticky positioning to follow scroll.',
    'STICKY ON SCROLL: Use sticky top-24 (offset for header height) with max-h-[calc(100vh-6rem)] overflow-y-auto for sidebar that follows scroll. Self-start for flex/grid alignment.',
    'MOBILE DRAWER: On mobile, sidebar becomes off-canvas drawer. Alpine.js: x-data="{ sidebarOpen: false }". Drawer: fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300. Backdrop: fixed inset-0 bg-black/50 z-30. Toggle: -translate-x-full (closed) → translate-x-0 (open).',
    'ACTIVE STATE INDICATOR: Current page/section indicator — left border bar (border-l-4 border-brand), background fill (bg-brand/10), font-weight change (font-semibold), or text color (text-brand). Only one item active at a time.',
    'COLLAPSE/EXPAND: If collapsible sidebar detected, support icon-only mode (w-16) with tooltip on hover. Collapse button at bottom or top of sidebar. Transition width with duration-300.',
    'FILTER SIDEBAR: If used for filtering (e-commerce, blog), render filter groups with headings, checkboxes, radio buttons, or range sliders. Each group separated by border-b py-4. "Clear all" and "Apply" buttons at top/bottom.'
  ],
  'gallery': [
    'Image grid with consistent aspect ratios (aspect-square or aspect-[4/3]).',
    'Responsive: grid-cols-2 md:grid-cols-3 lg:grid-cols-4.',
    'Hover: group-hover:scale-105 or overlay with icon.',
    'LIGHTBOX PATTERN: Wrap each image in a clickable container. On click, open fullscreen overlay (fixed inset-0 z-50 bg-black/90) with enlarged image, close button (top-right), and prev/next navigation arrows. Alpine.js: x-data="{ lightbox: false, activeIndex: 0 }".',
    'ASPECT RATIO CONSISTENCY: All images in the grid must use the same aspect ratio (aspect-square, aspect-[4/3], or aspect-video). Use object-cover to fill container without distortion. Gap between images: gap-2 or gap-4.',
    'LAZY LOADING: Add loading="lazy" on all gallery images to improve performance. First row images can use loading="eager" for above-fold content.',
    'MASONRY VS GRID: If extraction shows varying image heights, use CSS columns (columns-2 md:columns-3 lg:columns-4 gap-4) for masonry layout. Otherwise use standard CSS grid.',
    'RESPONSIVE COLUMNS: Common patterns — 2→3→4 columns. On mobile (375px), use 2 columns with small gap. Hover zoom: overflow-hidden on container + group-hover:scale-110 transition-transform duration-500 on image.'
  ],
  'video-section': [
    'Video container with poster image and centered play button overlay.',
    'If background video: <video autoplay muted loop playsinline> with absolute positioning.',
    'Maintain aspect ratio: aspect-video (16:9) wrapper.',
    'Play button: absolute centered, w-16 h-16 rounded-full bg-white/80 with triangle icon.',
    'POSTER IMAGE MANDATORY: Always include poster attribute on <video> for the thumbnail. For inline videos, show poster image with play button overlay until user clicks to play.',
    'PLAY BUTTON STYLING: Centered circle overlay — absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2. Triangle icon via CSS border trick or SVG. Add hover:scale-110 transition-transform. Background: bg-white/80 or bg-brand with shadow-lg.',
    'LAZY LOADING: Add loading="lazy" on poster images. For embeds (YouTube/Vimeo), use srcdoc pattern or load iframe only on play click to improve page performance.',
    'THUMBNAIL GRID: For multiple videos, use responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) with each video having its own aspect-video container + play button overlay.',
    'VIDEO TYPES: Check extraction for type — `inline` (controls visible, user plays), `background` (autoplay muted loop, no controls, behind content), `modal` (click thumbnail opens video in lightbox overlay), `embed` (YouTube/Vimeo iframe with aspect-video wrapper).'
  ],
  'content-section': [
    'Generic content block — follow extraction structure closely.',
    'Typically: section heading (H2/H3) + body text + optional CTA button.',
    'Respect alignment: centered content uses text-center + mx-auto, left-aligned uses text-left.',
    'Container: use max-w and padding from alignment metadata.',
    'LAYOUT PATTERNS: Full-bleed (w-full bg with inner container max-w-7xl mx-auto) vs contained (max-w within parent). Check extraction for background treatment — solid color, image with overlay, or gradient.',
    'HEADING HIERARCHY: H2 for section titles, H3 for subsections. Apply font-size per breakpoint from extraction. Overline/kicker text uses text-xs uppercase tracking-widest font-semibold above heading.',
    'CTA PATTERNS: Primary button + optional secondary inline on desktop (flex-row gap-4), stacked full-width on mobile (flex-col). Match button variant (solid/outline/ghost) from extraction styles.',
    'IMAGE+TEXT ARRANGEMENTS: If image present, use grid grid-cols-1 lg:grid-cols-2 gap-[Xpx] items-center. Image: object-cover with border-radius from extraction. Maintain aspect ratio.',
    'BACKGROUND TREATMENT: Check background-color, background-image, background-gradient in extraction. For image backgrounds: bg-cover bg-center + overlay div (absolute inset-0 bg-black/40). For gradient: bg-gradient-to-r/b from-X to-Y.',
    'SPACING: Section padding py-12 lg:py-24 (from extraction). Internal element spacing via space-y-4 or space-y-6. Respect gap between heading, body text, and CTA.'
  ]
};

// ============================================================
// REACT TYPE GENERATION HINTS — overrides for interactive types
// (replaces Alpine.js patterns with React useState equivalents)
// ============================================================
// ── GLOBAL REACT RULES (injected into every React prompt regardless of type) ──
const REACT_GLOBAL_RULES = [
  'CSS VARIABLE OPACITY: NEVER use `bg-[var(--color-x)]/40` or `text-[var(--color-x)]/80` — Tailwind opacity modifiers DO NOT work with CSS variables. Use `style={{ backgroundColor: "rgba(R,G,B,0.A)" }}` instead. Primary=#001a70 → rgba(0,26,112,0.N). Accent=#00bfb2 → rgba(0,191,178,0.N).',
  'CSS VARIABLES ARE SET: index.css defines --color-primary, --color-accent, --color-surface. Use them freely in className for solid colors: `text-[var(--color-primary)]`, `bg-[var(--color-accent)]`. Only AVOID the `/opacity` modifier syntax.',
  'FONTS ARE LOCAL: @font-face for ADNOC Sans is in index.css pointing to ./assets/fonts/. Use font-family via `font-[\'ADNOC_Sans\',sans-serif]` in className.',
];

const REACT_TYPE_GENERATION_HINTS = {
  'header': [
    'Build as semantic <header> with <nav>. Logo on left, links horizontal on desktop, hamburger on mobile.',
    'CHECK extracted `position` in `s` object: if `fixed` → use `fixed top-0 inset-x-0 z-50`. If `absolute` → use `absolute top-0 inset-x-0 z-50`.',
    'CHECK extracted `background-color`: if transparent/rgba(0,0,0,0) → header overlays hero. Use `bg-transparent` as base.',
    'Mobile header: compact (h-[52px] to h-[60px]), shows logo + hamburger. Desktop: taller (h-[100px]+), shows full nav.',
    'REACT: `const [menuOpen, setMenuOpen] = useState(false)`. Hamburger: `onClick={() => setMenuOpen(!menuOpen)}`. Mobile menu: conditionally render with `{menuOpen && <div>...</div>}`.',
    'BREAKPOINT: Use `min-[1440px]:` (not `xl:`) for desktop nav visibility. Desktop nav: `className="hidden min-[1440px]:flex"`. Hamburger: `className="min-[1440px]:hidden"`.',
    'HEADER VARIANT: Check content JSON `_headerMeta` for variant info (sticky-transparent, sticky-opaque, static). Use `_headerMeta.isSticky` for fixed positioning, `_headerMeta.isTransparent` for transparent bg (overlays hero), `_headerMeta.backgroundColor` for opaque bg color.',
    'If dropdown navs exist: `const [openDropdown, setOpenDropdown] = useState(null)`. Each item: `onMouseEnter={() => setOpenDropdown(i)} onMouseLeave={() => setOpenDropdown(null)}`.',
  ],
  'tabs': [
    'REACT: `const [activeTab, setActiveTab] = useState(0)` on component.',
    'Tab buttons: `onClick={() => setActiveTab(i)}` with conditional class: `activeTab === i ? "active-styles" : "inactive-styles"`. Use extracted active/inactive colors.',
    'Tab panels: `{activeTab === i && <div>...</div>}` for each content panel.',
    'Render ALL tab contents (conditionally shown). React controls visibility with activeTab state.',
    'Mobile: overflow-x-auto with flex-nowrap for horizontal scroll of tab buttons.'
  ],
  'accordion': [
    'REACT: Each accordion item is its own component or uses index-based state.',
    'Simple: `const [openIndex, setOpenIndex] = useState(0)` (first open). Toggle: `setOpenIndex(openIndex === i ? -1 : i)`.',
    'Chevron: `className={\`transition-transform duration-200 \${openIndex === i ? "rotate-180" : ""}\`}`.',
    'Content panel: `{openIndex === i && <div>...</div>}` or use CSS max-height transition.',
    'Each item: button header with chevron/plus icon on right, content panel below.'
  ],
  'carousel': [
    'REACT: `const [current, setCurrent] = useState(0)` where total = actual slide count from extraction.',
    'Prev: `onClick={() => setCurrent((current - 1 + total) % total)}`. Next: `onClick={() => setCurrent((current + 1) % total)}`.',
    'Slides wrapper: `style={{ transform: \`translateX(-\${current * 100}%)\` }}` with `transition-transform duration-500 ease-in-out`.',
    'Each slide: `className="w-full flex-shrink-0"`. Container: `className="overflow-hidden"`.',
    'Dots: `{Array.from({ length: total }, (_, i) => <button key={i} onClick={() => setCurrent(i)} className={current === i ? "bg-brand" : "bg-gray-300"} />)}`.',
    'COLLECTION CAROUSELS (news, timeline, logos): render ALL items. `total` must match actual slide count.',
    'For multi-card carousels (3 visible): `style={{ transform: \`translateX(-\${current * (100/3)}%)\` }}` and `className="w-1/3 flex-shrink-0"` per slide.',
    'WIDE-SCREEN ALIGNMENT: For carousels where cards start at the same left edge as page content (not full-width), use `style={{ paddingInlineStart: "max(1rem, calc((100vw - VAR) / 2))" }}` where VAR = containerMaxWidth - 2*contentPadding (e.g. 1440-312=1128px). This keeps cards aligned with headings on screens wider than 1440px.',
  ],
  'hero': [
    'OVERLAY: Use `style={{ backgroundColor: "rgba(0,26,112,0.65)" }}` for navy overlay — NOT `bg-[var(--color-primary)]/40` (CSS var opacity modifier broken).',
    'VIDEO HERO: `<video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline src={...} />`.',
    'Overlay div sits above video with `absolute inset-0 z-10`. Content sits above overlay with `relative z-20`.',
    'Min height: use `min-h-screen` or exact value from extraction.',
  ],
  'pricing': [
    'Side-by-side plan cards. Highlighted plan gets scale-105 or ring-2 ring-brand.',
    'Each card: plan name, price (large), period (/mo), feature list, CTA button.',
    'If toggle (monthly/annual): `const [isAnnual, setIsAnnual] = useState(false)`. Show price conditionally: `{isAnnual ? annualPrice : monthlyPrice}`.',
    'RECOMMENDED PLAN: Highlighted plan gets scale-105 + ring-2 + "Most Popular" badge positioned absolute -top-4. Primary CTA for highlighted, outline for others.',
    'FEATURE LIST: Map features array with checkmark (green SVG) or X (gray) icons. Use flex items-center gap-2 per feature row.'
  ],
  'gallery': [
    'REACT: `const [lightboxOpen, setLightboxOpen] = useState(false)` and `const [activeIndex, setActiveIndex] = useState(0)` for lightbox functionality.',
    'Image click: `onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}`. Close: `onClick={() => setLightboxOpen(false)}`.',
    'Lightbox: `{lightboxOpen && <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">...</div>}`. Add prev/next navigation.',
    'Images: consistent aspect ratios with object-cover. Responsive grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4.',
    'Hover effect: group + group-hover:scale-110 with overflow-hidden on container. transition-transform duration-500.'
  ],
  'sidebar': [
    'REACT: `const [sidebarOpen, setSidebarOpen] = useState(false)` for mobile drawer toggle.',
    'Mobile drawer: `className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}`.',
    'Backdrop: `{sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}`.',
    'Desktop: sticky top-24 with max-h-[calc(100vh-6rem)] overflow-y-auto. Active item: track with state or derive from current route.',
    'Collapse support: `const [collapsed, setCollapsed] = useState(false)`. Toggle width between w-64 and w-16 with transition-all duration-300.'
  ],
  'timeline': [
    'Vertical line: absolute left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 on desktop. Mobile: left-4 or left-6.',
    'Nodes: w-6 h-6 rounded-full bg-brand z-10 relative. Completed vs upcoming: different colors.',
    'Alternating layout: grid grid-cols-2 on desktop, single column on mobile. Items alternate text-right/text-left.',
    'Date badges: font-semibold text-brand. May render as rounded pill badges (bg-brand text-white px-3 py-1 rounded-full).'
  ],
  'video-section': [
    'REACT: `const [playing, setPlaying] = useState(false)` for play/pause toggle on inline videos.',
    'Click poster to play: `{!playing ? <div onClick={() => setPlaying(true)}>poster + play button</div> : <video autoPlay .../>}` or use ref to call videoRef.current.play().',
    'Play button: absolute centered with hover:scale-110 transition-transform. rounded-full bg-white/80 shadow-lg.',
    'Aspect ratio: aspect-video wrapper (16:9). For embeds: load iframe only when playing to improve performance.',
    'Background video: `<video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />`.'
  ]
};

// ============================================================
// GENERATION RULES (shared as RULES.md for Claude Code reference)
// ============================================================
const GENERATION_RULES = `# Tailwind Component Generation Rules

You are generating pixel-perfect responsive Tailwind HTML from extracted DOM trees.
Each component has computed CSS styles captured at 3 viewports (375px, 768px, 1440px).

## Output Format

- Output ONLY raw HTML — no markdown fences, no explanations, no comments.
- Save as a .html file (same base name as the .prompt.md file).

## Content Integrity (CRITICAL — read before generating)

**Every component MUST render REAL content from the extraction data.** Never generate:
- A blank/empty section to match a blank validator crop
- Placeholder text like "Sub-navigation for Company" or "Section content here"
- A component with the correct dimensions but no actual content

If the extraction JSON has text (\`t\` fields), images (\`src\`), links (\`href\`) — they MUST appear in the generated output.
If a component has \`position: fixed\` (parallax/sticky) and the validator can't compare it properly — still generate the REAL component. Accept a lower pixel score rather than faking it.

The screenshot (.screenshot.png) shows what the component looks like on the LIVE site. Your output must visually match it. If the screenshot shows stats, text, images — your component must show those same stats, text, images.

## SVG Logos & Icons (NEVER recreate — always download)

**NEVER draw SVG paths manually in JSX.** The extraction captures SVG outerHTML in the svg field — but do NOT paste it into components. Instead:

1. The original SVG is downloaded to \`public/assets/images/\` by \`download-react-assets.js\`
2. Reference it as: \`<img src="/assets/images/logo.svg" alt="Logo" />\`
3. If the SVG URL is in the extraction data (\`src\` field on an \`<img>\` or \`background-image\`), it gets downloaded automatically
4. For inline SVGs (no URL, only \`outerHTML\`), save the \`svg\` field content to a \`.svg\` file in \`public/assets/images/\`

**Why:** Hand-drawn SVG paths never match the original — wrong proportions, missing details, broken rendering. The original file is pixel-perfect by definition.

**Exception:** Simple UI icons (chevrons, arrows, close X, hamburger lines) can be inline SVG since they're 3-4 paths.

## ZERO Hardcoded Content (MANDATORY — DynamicPage pattern)

**Components are PURE UI — they receive ALL content via props. ZERO hardcoded strings.**

❌ WRONG:
\`\`\`jsx
export default function Hero() {
  return <h1>Investing in Growth</h1>  // HARDCODED — NEVER DO THIS
}
\`\`\`

✅ CORRECT:
\`\`\`jsx
export default function Hero({ heading, description, backgroundImage }) {
  return <h1>{heading}</h1>  // FROM PROPS — content is in page JSON
}
\`\`\`

**Rules:**
- ALL text strings → from props (heading, description, ctaText, etc.)
- ALL image URLs → from props (backgroundImage, image, poster, etc.)
- ALL link hrefs → from props (ctaHref, href, etc.)
- ALL data arrays → from props (stats, cards, slides, items, etc.)
- If a prop might be missing, use empty default: \`heading = ''\`, \`items = []\`
- The ONLY hardcoded values allowed are: Tailwind classes, color hex values, icon SVG paths, structural HTML
- Content lives in \`content/pages/{lang}/{slug}.json\` and flows through DynamicPage → component props

## Responsive Strategy (CRITICAL — Mobile-First)

**ALL base classes MUST come from the MOBILE (375px) extraction data.** This is the #1 cause of poor mobile scores.

### How to read the 3-viewport data:
- **Mobile JSON (375px)** → these become your BASE classes (no prefix)
- **Tablet JSON (768px)** → compare with mobile, add \`md:\` prefix ONLY for values that differ
- **Desktop JSON (1440px)** → compare with tablet, add \`lg:\` prefix ONLY for values that differ

### Common mobile-first patterns:

**Padding — mobile is tight, desktop is generous:**
\`\`\`
px-[16px] md:px-[48px] lg:px-[156px]  ← NOT px-[156px] lg:px-[156px]
\`\`\`

**Layout — mobile stacks, desktop is side-by-side:**
\`\`\`
flex flex-col lg:flex-row  ← NOT flex flex-row (that's desktop-first!)
\`\`\`

**Font size — mobile is smaller:**
\`\`\`
text-[32px] md:text-[48px] lg:text-[70px]  ← Base is mobile size
\`\`\`

**Grid — mobile is 1 column:**
\`\`\`
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  ← NOT grid-cols-4
\`\`\`

**Images — mobile is full-width:**
\`\`\`
w-full lg:w-1/2  ← Images fill container on mobile
\`\`\`

**Container — mobile has minimal padding:**
\`\`\`
px-[16px] md:px-[30px] lg:px-[50px]  ← Mobile padding from mobile extraction
\`\`\`

### Width on mobile:
- NEVER use fixed pixel widths as base (e.g. \`w-[600px]\`). Use \`w-full\` as base.
- Card widths: \`w-full md:w-[calc(50%-12px)] lg:w-[calc(33%-16px)]\`
- Images: \`w-full\` as base, constrain on desktop if needed.

### DOM structure differences:
When mobile and desktop have different DOM structures (different child count), use show/hide:
\`\`\`
<div class="block lg:hidden"><!-- mobile layout --></div>
<div class="hidden lg:block"><!-- desktop layout --></div>
\`\`\`

## Source Framework Handling

Each node has a \`cls\` field with original CSS classes from the source site.

- **Tailwind source** (\`sourceFramework: "tailwind"\`): Reuse \`cls\` values directly. Only restructure HTML.
- **Everything else** (Bootstrap, SASS, vanilla): Generate all Tailwind from computed styles \`s\`. The \`cls\` field is reference only.
- **Preserve mode** (\`--preserve-classes\` flag): Keep ALL original classes regardless of framework. Output uses the source framework as-is (Bootstrap, SASS, whatever the client wants to keep).

## Alignment Patterns

Each component has an \`alignment\` field indicating its container behavior:

- **full-bleed**: Outer wrapper is \`w-full\`, NO max-width. Background and content stretch edge-to-edge.
  Example: hero banners, full-width image/color sections.
  \`\`\`html
  <section data-component="Hero" class="w-full bg-[#435254]"><!-- content --></section>
  \`\`\`

- **contained**: Content sits in a centered max-width container. Use \`w-full max-w-[Xpx] mx-auto\`.
  Example: text sections, card grids, article content.
  \`\`\`html
  <section data-component="Cards" class="w-full max-w-[1296px] mx-auto px-[56px]"><!-- content --></section>
  \`\`\`

- **full-bleed-contained**: Background stretches full-width, but inner content is constrained.
  Outer: \`w-full\`. Inner wrapper: \`max-w-[Xpx] mx-auto\`.
  \`\`\`html
  <section data-component="CTA" class="w-full bg-[#001a70]">
    <div class="max-w-[1296px] mx-auto px-[56px]"><!-- centered content --></div>
  </section>
  \`\`\`

- Use the detected \`containerMaxWidth\` value for \`max-w-[Xpx]\`.
- Use \`contentPadding\` for \`px-[Xpx]\`.
- NEVER hardcode viewport widths (1440px, 1920px, etc.) as element widths or max-widths.

## Sizing Rules

- Sections (top-level components): \`w-full\` always.
- Elements matching viewport width (±10px): \`w-full\` (not fixed px).
- Content containers (70-95% of viewport, with padding): \`w-full max-w-[Xpx] mx-auto\`.
- Fixed-size elements (buttons, icons, cards): exact \`w-[Xpx]\`.
- Heights: SKIP for content-flow elements. Only set for positioned elements, flex/grid containers, or elements with min-height.

## Layout

- Use standard Tailwind: \`flex\`, \`flex-col\`, \`grid\`, \`justify-between\`, \`items-center\`.
- Always set explicit flex direction (\`flex-row\` or \`flex-col\`) — needed for responsive overrides.
- Gap: \`gap-[24px]\` (arbitrary for pixel-perfect).

## Colors

- Use design token names from the tokens JSON: \`bg-accent\`, \`text-text-primary\`, \`bg-surface-primary\`.
- Map hex values to token names: check tokens.colors and tokens.semantic.
- Fall back to arbitrary hex: \`bg-[#001a70]\`.
- Preserve rgba transparency: \`bg-[rgba(0,0,0,0.5)]\`.

## Typography (CRITICAL — never skip)

- **ALWAYS apply font-size, font-weight, font-family, line-height from the \`s\` object** — even if \`cls\` has classes.
- Use arbitrary values: \`text-[70px]\`, \`font-[500]\`, \`leading-[77px]\`, \`font-['ADNOC_Sans',sans-serif]\`.
- Custom CSS classes in \`cls\` like \`typo-h1\`, \`typo-p-large\` do NOT work in generated output. Always convert to Tailwind from \`s\`.
- Use \`font-brand\` only if Tailwind config defines it. Otherwise use \`font-['FontName']\` with exact family from \`s\`.
- Skip inherited properties (if parent has same color/font-size, don't repeat on children).
- \`letter-spacing\` is often dropped — always check \`s\` and include if not \`normal\`.

## Spacing

- Arbitrary padding/margin: \`p-[36px_44px]\`, \`py-[80px]\`, \`px-[20px]\`.
- For 2-value padding (V H): use \`py-[V] px-[H]\`.
- Skip zero values.

## Decorative

- \`rounded-[16px]\`, \`rounded-full\` for 9999px/50%.
- \`[box-shadow:0_4px_6px_rgba(0,0,0,0.1)]\` (replace spaces with underscores).
- \`[border-bottom:1px_solid_#e5e7eb]\`.
- \`opacity-[0.5]\`.

## Backgrounds

- \`bg-cover\`, \`bg-center\`, \`bg-no-repeat\`.
- Gradients: \`[background-image:linear-gradient(...)]\`.

## Background Image & Video Fallback (CRITICAL — all components)

External image/video URLs may fail to load (CORS, hotlink protection, CDN restrictions).

**For background images — always add fallback backgroundColor:**
\`\`\`html
style={{ backgroundImage: 'url("...")', backgroundColor: '#001a70' }}
\`\`\`

**For video backgrounds in heroes — always add fallback:**
\`\`\`html
<video ... />
<div className="absolute inset-0 -z-10" style={{ backgroundColor: '#001a70' }} />
\`\`\`
Choose the fallback color from the dominant color in the screenshot.
Text content MUST be visible even when images/videos fail to load.

## Parallax Background + Overlay Pattern (CRITICAL)

Some sites use \`position: fixed\` backgrounds with content sections overlaid on top.
The extraction may capture these as SEPARATE components:
- Component A: fixed background image (no text)
- Component B: overlay text/cards that visually sit on top of A

**In React, these are separate sections stacked vertically — the parallax effect is lost.**
When generating component B (the overlay), check the screenshot: if it shows text on a background image, the component needs its OWN background image (copy from component A or use the screenshot as reference). Do not generate transparent-background sections that depend on a previous parallax component for their visual backdrop.

## Pseudo-Element Overlays (CRITICAL — check on every component)

Each node may have a \`pseudos\` array containing \`::before\`/\`::after\` styles. These are commonly used for:
- **Dark overlays on images/cards** — e.g., \`background-color: rgba(0,20,60,0.55)\` on a \`::before\`
- **Decorative borders or icons** — e.g., colored bars, quote marks
- **Gradient overlays** — e.g., linear-gradient on \`::before\` with \`position: absolute; inset: 0\`

**How to implement:** Render as an absolute-positioned \`<div>\` (or \`<span>\`) inside the same container:
\`\`\`html
<div class="relative">
  <!-- original content -->
  <div class="absolute inset-0 z-0" style="background-color: rgba(0,20,60,0.55)"></div>
  <div class="relative z-[1]"><!-- text content above overlay --></div>
</div>
\`\`\`
**Always check the \`pseudos\` array.** If it exists and has \`background-color\` or \`background-image\`, render it.

## Positioning

- \`absolute\`, \`relative\`, \`fixed\`, \`sticky\`.
- \`top-0\`, \`left-0\` for zero. \`top-[132px]\` for non-zero.
- \`inset-0\` when all sides are 0.
- \`z-[50]\`.

## Collection Components (CRITICAL — never skip items)

- If the JSON contains multiple items (swiper-slides, cards, list items, timeline steps, news articles):
  **RENDER EVERY SINGLE ITEM.** Do not show just 1 and skip the rest.
- Count the items in the JSON data. The generated HTML must have the SAME count.
- Items with \`slideState: "inactive"\` are hidden in the carousel but are REAL content — render them all.
- For news cards: each card has image + title + date + category. Render ALL cards.
- For timeline: each step has year + title + description. Render ALL steps.
- For logo carousels: each logo is an image. Render ALL logos.
- Layout: \`overflow-hidden\` on container, \`flex\` on inner wrapper, all items side-by-side.

## Special Elements

- \`<img>\`: preserve src, alt. Add \`object-cover\` if object-fit:cover.
- \`<svg>\`: output raw SVG outerHTML as-is (the \`svg\` field).
- \`<video>\`: use vsrc as source, preserve poster/autoplay/muted/loop, add playsinline.
- \`<a>\`: preserve href.
- Pseudo-elements (::before/::after in \`pseudos\` array): render as real child elements with equivalent styles.

## Component Wrapper (MANDATORY — never skip)

Every component root element MUST have:
1. \`data-component="ComponentName"\` attribute — identifies the component for validation and debugging
2. A semantic CSS class matching the component type — e.g. \`hero-section\`, \`stats-section\`, \`card-grid-section\`

Example:
\`\`\`html
<section data-component="HeroVideo" class="hero-section w-full relative ...">
<header data-component="SiteHeader" class="site-header fixed top-0 ...">
<footer data-component="SiteFooter" class="site-footer w-full ...">
\`\`\`

For React JSX:
\`\`\`jsx
<section data-component="HeroVideo" className="hero-section w-full relative ...">
\`\`\`

This makes components identifiable in DevTools and distinguishes them from generic \`<section>\` tags.

## Hover & Interaction States

- Apply hover effects from the Interactions section using Tailwind \`hover:\` prefix:
  - Color change: \`hover:text-[#003f2d]\`
  - Background change: \`hover:bg-[#012a2d]\`
  - Scale: \`hover:scale-[1.02]\`
  - Shadow: \`hover:[box-shadow:...]\`
  - Opacity: \`hover:opacity-80\`
  - Underline: \`hover:underline\`
- Add transition classes from the Interactions data: \`transition-all duration-300 ease-in-out\`
- For focus states use \`focus:\` prefix: \`focus:outline-none focus:ring-2 focus:ring-[#003f2d]\`
- For scroll animations (AOS), use Tailwind animation utilities or skip (progressive enhancement).
- \`cursor-pointer\` is implicit on \`<a>\` and \`<button>\` — only add on other interactive elements.

## Alpine.js Interactions (MANDATORY for interactive components)

The assembled HTML includes Alpine.js via CDN. Use Alpine.js attributes for ALL interactive behaviors:

### Hamburger / Mobile Navigation
\`\`\`html
<header x-data="{ menuOpen: false }">
  <button @click="menuOpen = !menuOpen" class="lg:hidden">
    <!-- hamburger icon -->
  </button>
  <nav x-show="menuOpen" x-transition @click.outside="menuOpen = false" class="lg:hidden">
    <!-- mobile nav items -->
  </nav>
  <nav class="hidden lg:flex">
    <!-- desktop nav items -->
  </nav>
</header>
\`\`\`

### Dropdown / Mega Menu Navigation
\`\`\`html
<li x-data="{ open: false }" @mouseenter="open = true" @mouseleave="open = false" class="relative">
  <a href="#">Services</a>
  <div x-show="open" x-transition.origin.top class="absolute top-full left-0 bg-white shadow-lg">
    <!-- dropdown items -->
  </div>
</li>
\`\`\`

### Carousel / Slider (prev/next + dots)
\`\`\`html
<div x-data="{ current: 0, total: N }" data-component="Carousel">
  <button @click="current = (current - 1 + total) % total">←</button>
  <div class="overflow-hidden">
    <div class="flex transition-transform duration-500" :style="'transform: translateX(-' + (current * 100) + '%)'">
      <div class="w-full flex-shrink-0"><!-- slide 1 --></div>
      <div class="w-full flex-shrink-0"><!-- slide 2 --></div>
      <div class="w-full flex-shrink-0"><!-- slide 3 --></div>
    </div>
  </div>
  <button @click="current = (current + 1) % total">→</button>
  <!-- dots -->
  <div class="flex justify-center gap-2 mt-4">
    <template x-for="i in total" :key="i">
      <button @click="current = i - 1" :class="current === i - 1 ? 'bg-brand w-3 h-3' : 'bg-gray-300 w-2 h-2'" class="rounded-full transition-all"></button>
    </template>
  </div>
</div>
\`\`\`

For multi-slide carousels (showing 3 cards at once), adjust translateX calculation:
\`:style="'transform: translateX(-' + (current * (100/slidesPerView)) + '%)'"

### Tab Navigation
\`\`\`html
<div x-data="{ activeTab: 0 }">
  <div class="flex gap-2" role="tablist">
    <button @click="activeTab = 0" :class="activeTab === 0 ? 'bg-brand text-white' : 'bg-gray-200'" role="tab">Tab 1</button>
    <button @click="activeTab = 1" :class="activeTab === 1 ? 'bg-brand text-white' : 'bg-gray-200'" role="tab">Tab 2</button>
  </div>
  <div x-show="activeTab === 0" x-transition role="tabpanel">Content 1</div>
  <div x-show="activeTab === 1" x-transition role="tabpanel">Content 2</div>
</div>
\`\`\`

### Accordion / Collapsible
\`\`\`html
<div x-data="{ open: false }">
  <button @click="open = !open" class="flex justify-between w-full">
    <span>Question</span>
    <svg :class="open ? 'rotate-180' : ''" class="w-5 h-5 transition-transform"><!-- chevron --></svg>
  </button>
  <div x-show="open" x-collapse>
    <p>Answer content</p>
  </div>
</div>
\`\`\`

### Rules:
- ALWAYS add \`x-data\` on the outermost interactive container
- Use \`x-show\` + \`x-transition\` for show/hide (not manual class toggling)
- Use \`x-collapse\` for accordion height animations (requires Alpine collapse plugin)
- Use \`:class\` for conditional styling (active tab, current dot, open state)
- Use \`:style\` for carousel translateX transforms
- Use \`@click.outside\` to close dropdowns/menus when clicking elsewhere
- Carousel \`total\` must match the actual number of slides in the HTML

## Skip These

- word-break properties.
- display:block (it's the default).
- Zero margins/padding.
- No inline styles — everything as Tailwind classes or \`[property:value]\` arbitrary.
`;

// ============================================================
// RUN
// ============================================================
if (MODE === 'prepare') {
  runPrepare();
} else {
  runAssemble();

  // CMS structure output (default — always extract content alongside static HTML)
  const skipCms = process.argv.includes('--static-only');
  if (!skipCms) {
    console.log(`\n── Extracting CMS content structure ──`);
    const { execSync } = require('child_process');
    try {
      execSync(`node "${path.join(__dirname, 'extract-content.js')}" "${siteDir}"`, { stdio: 'inherit' });
    } catch (e) {
      console.warn('Content extraction failed (non-fatal):', e.message);
    }
  }
}
