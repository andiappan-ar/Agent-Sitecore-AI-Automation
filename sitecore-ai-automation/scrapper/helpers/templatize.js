#!/usr/bin/env node
/**
 * templatize.js — Converts pixel-perfect HTML + content JSON into templates
 *
 * Reads each component's:
 *   - .html (pixel-perfect generated HTML)
 *   - content .json (structured CMS fields)
 *
 * Produces:
 *   - .template.html (same HTML but with {{fields.xxx}} placeholders)
 *
 * Simple fields: {{fields.heading}}, {{fields.description}}, {{fields.logo.src}}
 * Collections:   {{#each fields.cards}} ... {{this.heading}} ... {{/each}}
 * Conditionals:  {{#if fields.backgroundImage}} ... {{/if}}
 *
 * Usage:
 *   node helpers/templatize.js <output-dir>
 *
 * Outputs:
 *   {output-dir}/templates/
 *   ├── components/
 *   │   └── en/
 *   │       ├── 00-header.template.html
 *   │       ├── 01-hero.template.html
 *   │       └── ...
 *   └── pages/
 *       └── en.template.html        ← Full page assembled from component templates
 */

const path = require('path');
const fs = require('fs');

const siteDir = process.argv[2];
if (!siteDir) { console.error('Usage: node helpers/templatize.js <output-dir>'); process.exit(1); }

const contentDir = path.join(siteDir, 'content');
const pagesDir = path.join(contentDir, 'pages');
const templateDir = path.join(siteDir, 'templates');
const templateCompDir = path.join(templateDir, 'components');
const templatePagesDir = path.join(templateDir, 'pages');

[templateDir, templateCompDir, templatePagesDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Collection field names per component type ──────────────
// These fields contain arrays that need {{#each}} loops
const COLLECTION_FIELDS = {
  'header': ['navigationItems'],
  'hero': ['cta', 'stats'],
  'card-grid': ['cards'],
  'stats': ['items'],
  'footer': ['links', 'socialLinks', 'columnHeadings'],
  'carousel': ['slides'],
  'logo-cloud': ['items'],
  'testimonials': ['slides'],
  'tabs': ['tabs'],
  'accordion': ['items'],
  'timeline': ['slides'],
  'gallery': ['images'],
  'breadcrumb': ['items'],
  'sidebar': ['links'],
  'form': ['fields'],
  'pricing': ['plans'],
  'content-section': ['description', 'images', 'links'],
  'split-content': ['description', 'cta'],
  'cta-banner': [],
  'video-section': [],
  'feature-grid': ['items'],
  'table': ['rows']
};

// ── Escape regex special chars ─────────────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Replace content values with placeholders ───────────────
function templatizeComponent(html, content) {
  if (!html || !content?.fields) return html;

  const type = content.componentType || content.type || 'generic';
  const collectionFields = COLLECTION_FIELDS[type] || [];
  let template = html;

  // Process each field
  for (const [fieldName, fieldValue] of Object.entries(content.fields)) {
    if (fieldValue === null || fieldValue === undefined) continue;

    if (Array.isArray(fieldValue) && collectionFields.includes(fieldName)) {
      // ── COLLECTION FIELD — replace repeated items with {{#each}} loop
      template = templatizeCollection(template, fieldName, fieldValue, type);
    } else if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
      // ── OBJECT FIELD (e.g. logo: { src, alt }, viewAllLink: { text, href })
      template = templatizeObject(template, fieldName, fieldValue);
    } else if (typeof fieldValue === 'string' && fieldValue.length > 2) {
      // ── SIMPLE STRING FIELD
      template = templatizeString(template, fieldName, fieldValue);
    }
  }

  return template;
}

// ── Replace a simple string value with placeholder ─────────
function templatizeString(html, fieldName, value) {
  if (!value || value.length < 3) return html;

  // Replace exact text content (within tags)
  const escaped = escapeRegex(value);
  // Match the value when it appears as text content between tags
  const regex = new RegExp(`(>\\s*)${escaped}(\\s*<)`, 'g');
  let result = html.replace(regex, `$1{{fields.${fieldName}}}$2`);

  // Also replace in src/href attributes
  if (value.startsWith('http') || value.startsWith('/')) {
    result = result.split(value).join(`{{fields.${fieldName}}}`);
  }

  return result;
}

// ── Replace object fields (logo.src, logo.alt, etc.) ───────
function templatizeObject(html, fieldName, obj) {
  let result = html;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.length > 2) {
      const escaped = escapeRegex(val);
      // Replace in attributes (src="...", alt="...", href="...")
      result = result.replace(new RegExp(escaped, 'g'), `{{fields.${fieldName}.${key}}}`);
    }
  }
  return result;
}

// ── Replace collection items with {{#each}} loop ───────────
function templatizeCollection(html, fieldName, items, componentType) {
  if (!items || items.length === 0) return html;

  // For string arrays (description paragraphs)
  if (typeof items[0] === 'string') {
    let result = html;
    items.forEach((text, i) => {
      if (text.length > 5) {
        const escaped = escapeRegex(text);
        result = result.replace(new RegExp(escaped, 'g'), `{{fields.${fieldName}.[${i}]}}`);
      }
    });
    return result;
  }

  // For object arrays (cards, slides, links, etc.)
  // Strategy: find the first item's content in HTML, identify the repeating block,
  // wrap it in {{#each}} and replace content with {{this.xxx}}

  const firstItem = items[0];
  if (!firstItem || typeof firstItem !== 'object') return html;

  // Find a unique text from the first item to locate it in HTML
  const firstText = findFirstText(firstItem);
  if (!firstText || firstText.length < 3) return html;

  const firstIdx = html.indexOf(firstText);
  if (firstIdx === -1) return html;

  // Find the repeating container — look for the parent element that wraps each item
  // Strategy: find the opening tag before the first item's text
  const beforeFirst = html.substring(0, firstIdx);
  const containerStart = findContainerStart(beforeFirst);

  if (containerStart === -1) return html;

  // Find all items' text to determine the repeating block boundaries
  const itemTexts = items.map(item => findFirstText(item)).filter(t => t && t.length > 3);

  if (itemTexts.length < 2) {
    // Only 1 item — just replace content with placeholders
    let result = html;
    for (const [key, val] of Object.entries(firstItem)) {
      if (typeof val === 'string' && val.length > 3) {
        result = result.replace(new RegExp(escapeRegex(val), 'g'), `{{fields.${fieldName}.[0].${key}}}`);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        for (const [k2, v2] of Object.entries(val)) {
          if (typeof v2 === 'string' && v2.length > 3) {
            result = result.replace(new RegExp(escapeRegex(v2), 'g'), `{{fields.${fieldName}.[0].${key}.${k2}}}`);
          }
        }
      }
    }
    return result;
  }

  // Multiple items — find the repeating HTML block
  const firstTextPos = html.indexOf(itemTexts[0]);
  const secondTextPos = itemTexts[1] ? html.indexOf(itemTexts[1]) : -1;

  if (firstTextPos === -1 || secondTextPos === -1) {
    // Can't find repeating pattern — fall back to simple replacement
    return replaceAllItems(html, fieldName, items);
  }

  // Find the repeating block: from before first item to before second item
  const blockStart = findBlockStart(html, firstTextPos);
  const blockEnd = findBlockEnd(html, firstTextPos, secondTextPos);

  if (blockStart === -1 || blockEnd === -1 || blockEnd <= blockStart) {
    return replaceAllItems(html, fieldName, items);
  }

  // Extract the first item's HTML block as the template
  let itemTemplate = html.substring(blockStart, blockEnd);

  // Replace first item's content with {{this.xxx}} placeholders
  for (const [key, val] of Object.entries(firstItem)) {
    if (typeof val === 'string' && val.length > 3) {
      itemTemplate = itemTemplate.replace(new RegExp(escapeRegex(val), 'g'), `{{this.${key}}}`);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [k2, v2] of Object.entries(val)) {
        if (typeof v2 === 'string' && v2.length > 3) {
          itemTemplate = itemTemplate.replace(new RegExp(escapeRegex(v2), 'g'), `{{this.${key}.${k2}}}`);
        }
      }
    }
  }

  // Find the end of ALL items in the HTML
  const lastItemText = itemTexts[itemTexts.length - 1];
  const lastItemPos = html.lastIndexOf(lastItemText);
  const allItemsEnd = findBlockEnd(html, lastItemPos, html.length);

  // Build the template: before items + {{#each}} + item template + {{/each}} + after items
  const beforeItems = html.substring(0, blockStart);
  const afterItems = html.substring(Math.min(allItemsEnd, html.length));

  const eachBlock = `{{#each fields.${fieldName}}}\n${itemTemplate}\n{{/each}}`;

  return beforeItems + eachBlock + afterItems;
}

// ── Helper: find first meaningful text in an item object ────
function findFirstText(item) {
  if (!item || typeof item !== 'object') return null;
  // Priority: heading > title > text > description > label
  for (const key of ['heading', 'title', 'text', 'description', 'label', 'name', 'value']) {
    if (typeof item[key] === 'string' && item[key].length > 3) return item[key];
  }
  // Check nested objects
  for (const val of Object.values(item)) {
    if (typeof val === 'string' && val.length > 5) return val;
  }
  return null;
}

// ── Helper: find the start of a container element ──────────
function findContainerStart(htmlBefore) {
  // Find the last opening tag before the content
  let depth = 0;
  for (let i = htmlBefore.length - 1; i >= 0; i--) {
    if (htmlBefore[i] === '>') depth++;
    if (htmlBefore[i] === '<' && depth === 1) return i;
  }
  return -1;
}

// ── Helper: find block boundaries ──────────────────────────
function findBlockStart(html, textPos) {
  // Walk backwards from textPos to find the opening tag of the item container
  let depth = 0;
  for (let i = textPos; i >= 0; i--) {
    if (html[i] === '>') depth++;
    if (html[i] === '<') {
      depth--;
      if (depth <= 0) return i;
    }
  }
  return 0;
}

function findBlockEnd(html, textPos, nextTextPos) {
  // Find the closing tag that balances the block starting near textPos
  // The block ends somewhere before nextTextPos
  const searchEnd = Math.min(nextTextPos, html.length);

  // Simple approach: find the last closing tag before the next item
  let lastClose = textPos;
  for (let i = textPos; i < searchEnd; i++) {
    if (html[i] === '>' && html[i - 1] !== '-') lastClose = i + 1;
  }

  // Refine: look for closing div/li/a tags
  const closingPattern = /<\/(?:div|li|a|article|section)>\s*$/;
  const segment = html.substring(textPos, searchEnd);
  const matches = [...segment.matchAll(/<\/(?:div|li|a|article|section)>/g)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return textPos + lastMatch.index + lastMatch[0].length;
  }

  return lastClose;
}

// ── Fallback: replace all items' content without {{#each}} ─
function replaceAllItems(html, fieldName, items) {
  let result = html;
  items.forEach((item, i) => {
    if (typeof item !== 'object') return;
    for (const [key, val] of Object.entries(item)) {
      if (typeof val === 'string' && val.length > 3) {
        result = result.replace(new RegExp(escapeRegex(val), 'g'), `{{fields.${fieldName}.[${i}].${key}}}`);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        for (const [k2, v2] of Object.entries(val)) {
          if (typeof v2 === 'string' && v2.length > 3) {
            result = result.replace(new RegExp(escapeRegex(v2), 'g'), `{{fields.${fieldName}.[${i}].${key}.${k2}}}`);
          }
        }
      }
    }
  });
  return result;
}

// ── Find component HTML template file ──────────────────────
function findComponentHtml(pageName, compIndex, compName) {
  const genDir = path.join(siteDir, '.claude-gen', pageName);
  if (!fs.existsSync(genDir)) return null;

  const files = fs.readdirSync(genDir).filter(f => f.endsWith('.html'));
  const prefix = String(compIndex).padStart(2, '0') + '-';
  const match = files.find(f => f.startsWith(prefix));
  return match ? fs.readFileSync(path.join(genDir, match), 'utf-8') : null;
}

// ── Main ───────────────────────────────────────────────────
function main() {
  console.log(`\nTemplatize — HTML + Content JSON → Templates\n`);

  const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));

  for (const pf of pageFiles) {
    const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, pf), 'utf-8'));
    const pageName = pageData.page;

    const pageTemplateDir = path.join(templateCompDir, pageName);
    if (!fs.existsSync(pageTemplateDir)) fs.mkdirSync(pageTemplateDir, { recursive: true });

    console.log(`  Page: ${pageName} (${pageData.components.length} components)`);

    let totalPlaceholders = 0;
    let totalCollections = 0;

    for (const comp of pageData.components) {
      // Load HTML
      const html = findComponentHtml(pageName, comp.index, comp.name);
      if (!html) {
        console.log(`    [${comp.index}] ${comp.name} — no HTML template`);
        continue;
      }

      // Load content JSON
      const contentPath = path.join(contentDir, comp.contentFile);
      const content = fs.existsSync(contentPath) ? JSON.parse(fs.readFileSync(contentPath, 'utf-8')) : null;

      if (!content) {
        // No content — just copy HTML as template
        const outName = `${String(comp.index).padStart(2, '0')}-${comp.name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40)}.template.html`;
        fs.writeFileSync(path.join(pageTemplateDir, outName), html);
        console.log(`    [${comp.index}] ${comp.name} — copied (no content JSON)`);
        continue;
      }

      // Templatize
      const template = templatizeComponent(html, content);

      // Count placeholders
      const placeholders = (template.match(/\{\{fields\./g) || []).length;
      const eachBlocks = (template.match(/\{\{#each/g) || []).length;
      totalPlaceholders += placeholders;
      totalCollections += eachBlocks;

      // Save
      const outName = `${String(comp.index).padStart(2, '0')}-${comp.name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40)}.template.html`;
      fs.writeFileSync(path.join(pageTemplateDir, outName), template);
      console.log(`    [${comp.index}] ${comp.name} [${comp.type}] → ${placeholders} placeholders, ${eachBlocks} loops`);
    }

    console.log(`  Total: ${totalPlaceholders} placeholders, ${totalCollections} collection loops\n`);
  }

  console.log(`✓ Templates saved to ${templateDir}/`);
  console.log(`\nStructure:`);
  console.log(`  templates/components/{page}/*.template.html  ← Component templates with {{placeholders}}`);
  console.log(`  content/components/{page}/*.json             ← Content JSON (CMS-editable data)`);
  console.log(`  content/pages/{page}.json                    ← Page assembly (component order)`);
  console.log(`\nTo render: load template + content JSON → replace {{fields.xxx}} with values\n`);
}

main();
