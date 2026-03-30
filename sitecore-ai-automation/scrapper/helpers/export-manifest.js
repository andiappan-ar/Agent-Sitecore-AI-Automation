#!/usr/bin/env node
/**
 * export-manifest.js — CMS migration manifest generator
 *
 * Reads extraction data and generates structured page manifests
 * suitable for importing into any CMS (Sitecore, Contentful, Sanity, etc.)
 *
 * Usage:
 *   node helpers/export-manifest.js output/adnoc.ae
 *   node helpers/export-manifest.js output/adnoc.ae --lang en,ar
 *
 * Output:
 *   output/{domain}/manifest/
 *     ├── site.json                    ← site-level config
 *     ├── pages/en/home.json           ← page manifest with components + content
 *     ├── pages/en/our-story.json
 *     ├── pages/ar/home.json           ← Arabic mirror
 *     └── components/
 *         ├── header.schema.json       ← component field schemas
 *         ├── hero.schema.json
 *         └── ...
 */

const fs = require('fs');
const path = require('path');

const siteDir = process.argv[2];
if (!siteDir) {
  console.error('Usage: node helpers/export-manifest.js <output-dir> [--lang en,ar]');
  process.exit(1);
}

const langIdx = process.argv.indexOf('--lang');
const LANGUAGES = langIdx >= 0 ? process.argv[langIdx + 1].split(',') : ['en'];

const extractedDir = path.join(siteDir, 'extracted');
const manifestDir = path.join(siteDir, 'manifest');
const claudeGenDir = path.join(siteDir, '.claude-gen');

function loadJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

// ── Extract content from component DOM tree ──────────────────────────────────
function extractContent(node, type) {
  const content = {
    texts: [],
    headings: [],
    descriptions: [],
    images: [],
    links: [],
    videos: [],
    ctas: [],
  };

  function walk(n, depth = 0) {
    if (!n) return;

    // Classify text by tag/styling
    if (n.t) {
      const tag = n.tag?.toLowerCase();
      const fontSize = parseFloat(n.s?.['font-size']) || 16;
      const fontWeight = parseInt(n.s?.['font-weight']) || 400;

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) || fontSize > 24 || fontWeight >= 700) {
        content.headings.push(n.t);
      } else {
        content.descriptions.push(n.t);
      }
      content.texts.push(n.t);
    }

    // Images
    if (n.src) {
      content.images.push({ src: n.src, alt: n.alt || '' });
    }

    // Links
    if (n.href && n.href !== '#' && !n.href.startsWith('javascript:')) {
      const isButton = n.tag === 'button' || n.cls?.includes('btn') || n.cls?.includes('cta');
      if (isButton) {
        content.ctas.push({ text: n.t || '', href: n.href });
      } else {
        content.links.push({ text: n.t || '', href: n.href });
      }
    }

    // Videos
    if (n.vsrc) {
      content.videos.push({ src: n.vsrc, poster: n.poster || '' });
    }

    if (n.c) n.c.forEach(child => walk(child, depth + 1));
  }

  walk(node);
  return content;
}

// ── Build component schema from content ──────────────────────────────────────
function buildSchema(type, variant, content) {
  const schema = { type, variant: variant || null, fields: {} };

  if (content.headings.length > 0) schema.fields.heading = { type: 'string', required: true };
  if (content.descriptions.length > 0) schema.fields.description = { type: 'richtext' };
  if (content.images.length > 0) schema.fields.images = { type: 'array', items: { type: 'image' } };
  if (content.videos.length > 0) schema.fields.videos = { type: 'array', items: { type: 'video' } };
  if (content.links.length > 0) schema.fields.links = { type: 'array', items: { type: 'link' } };
  if (content.ctas.length > 0) schema.fields.cta = { type: 'link', required: false };

  // Type-specific fields
  switch (type) {
    case 'header':
      schema.fields.logo = { type: 'image', required: true };
      schema.fields.navItems = { type: 'array', items: { type: 'navLink' } };
      schema.fields.megaMenu = { type: 'array', items: { type: 'megaMenuItem' } };
      break;
    case 'hero':
      schema.fields.backgroundImage = { type: 'image' };
      schema.fields.backgroundVideo = { type: 'video' };
      schema.fields.overlay = { type: 'boolean' };
      schema.fields.slides = { type: 'array', items: { type: 'heroSlide' } };
      break;
    case 'footer':
      schema.fields.logo = { type: 'image' };
      schema.fields.linkColumns = { type: 'array', items: { type: 'linkGroup' } };
      schema.fields.socialLinks = { type: 'array', items: { type: 'socialLink' } };
      schema.fields.copyright = { type: 'string' };
      break;
    case 'card-grid':
      schema.fields.cards = { type: 'array', items: { type: 'card' } };
      break;
    case 'carousel':
      schema.fields.slides = { type: 'array', items: { type: 'slide' } };
      break;
    case 'form':
      schema.fields.formFields = { type: 'array', items: { type: 'formField' } };
      schema.fields.submitLabel = { type: 'string' };
      break;
    case 'stats':
      schema.fields.items = { type: 'array', items: { type: 'statItem' } };
      break;
  }

  return schema;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log(`\n📦 Exporting CMS migration manifest`);
  console.log(`  Source: ${siteDir}`);
  console.log(`  Languages: ${LANGUAGES.join(', ')}\n`);

  // Create directories
  fs.mkdirSync(path.join(manifestDir, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(manifestDir, 'components'), { recursive: true });

  // Load site profile
  const siteProfile = loadJSON(path.join(extractedDir, 'site-profile.json')) || {};
  const layout = loadJSON(path.join(extractedDir, 'layout.json')) || {};
  const designSystem = loadJSON(path.join(extractedDir, 'design-system.json')) || {};

  // Site-level manifest
  const siteManifest = {
    url: siteDir.split('/').pop(),
    exportedAt: new Date().toISOString(),
    languages: LANGUAGES,
    rtlLanguages: LANGUAGES.filter(l => ['ar', 'he', 'fa', 'ur'].includes(l)),
    framework: siteProfile.sourceFramework || 'unknown',
    fonts: layout.baselines?.bodyFontFamily || 'sans-serif',
    container: layout.containers?.desktop?.maxWidth || 'none',
    navigation: siteProfile.navigation || {},
    pages: [],
    componentTypes: new Set(),
  };

  // Process each extracted page
  const pageFiles = fs.readdirSync(extractedDir)
    .filter(f => f.startsWith('page-') && !f.includes('-merged') && !f.includes('-768') && !f.includes('-375') && f.endsWith('.json'));

  const componentSchemas = {};

  for (const pageFile of pageFiles) {
    const pageData = loadJSON(path.join(extractedDir, pageFile));
    if (!pageData) continue;

    const pageName = pageFile.replace('page-', '').replace('.json', '');
    const pageMeta = pageData.meta || {};
    const lang = pageMeta.lang || 'en';

    console.log(`  Processing: ${pageName} (${lang})`);

    // Build page manifest
    const pageManifest = {
      page: {
        name: pageName,
        title: pageMeta.title || '',
        url: pageMeta.url || '',
        language: lang,
        direction: pageMeta.dir || 'ltr',
        template: pageName.replace(/^(en|ar)-?/, '').replace(/-/g, '_') || 'home',
      },
      seo: pageMeta.seo || {},
      favicon: pageMeta.favicon || null,
      hreflang: pageMeta.hreflang || [],
      jsonLd: pageMeta.jsonLd || [],
      components: [],
    };

    // Process each component
    (pageData.components || []).forEach((comp, i) => {
      const type = comp.componentType || 'content-section';
      const variant = comp.componentVariant || null;

      siteManifest.componentTypes.add(type);

      // Extract content from DOM tree
      const content = extractContent(comp, type);

      // Build component entry
      const componentEntry = {
        order: i,
        type,
        variant,
        name: comp.componentName || `component-${i}`,
        dimensions: comp.box ? { width: comp.box.w, height: comp.box.h } : null,
        alignment: comp.alignment || null,
        content: {
          heading: content.headings[0] || null,
          subheading: content.headings[1] || null,
          description: content.descriptions.slice(0, 3).join('\n') || null,
          allText: content.texts,
          images: content.images,
          links: content.links,
          ctas: content.ctas,
          videos: content.videos,
        },
      };

      pageManifest.components.push(componentEntry);

      // Build schema for this component type (first occurrence wins)
      const schemaKey = variant ? `${type}--${variant}` : type;
      if (!componentSchemas[schemaKey]) {
        componentSchemas[schemaKey] = buildSchema(type, variant, content);
      }
    });

    // Save page manifest
    const langDir = path.join(manifestDir, 'pages', lang);
    fs.mkdirSync(langDir, { recursive: true });
    const pageSlug = pageName.replace(/^(en|ar)-?/, '') || 'home';
    fs.writeFileSync(path.join(langDir, `${pageSlug}.json`), JSON.stringify(pageManifest, null, 2));

    siteManifest.pages.push({
      name: pageSlug,
      language: lang,
      path: pageMeta.url || '',
      components: pageManifest.components.length,
    });
  }

  // Save component schemas
  for (const [key, schema] of Object.entries(componentSchemas)) {
    fs.writeFileSync(
      path.join(manifestDir, 'components', `${key}.schema.json`),
      JSON.stringify(schema, null, 2)
    );
  }

  // Save site manifest
  siteManifest.componentTypes = [...siteManifest.componentTypes];
  fs.writeFileSync(path.join(manifestDir, 'site.json'), JSON.stringify(siteManifest, null, 2));

  console.log(`\n✓ Manifest exported:`);
  console.log(`  ${siteManifest.pages.length} page(s)`);
  console.log(`  ${Object.keys(componentSchemas).length} component schema(s)`);
  console.log(`  ${siteManifest.componentTypes.length} component type(s)`);
  console.log(`\n  Output: ${manifestDir}/`);
}

main();
