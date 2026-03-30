/**
 * transform-tokens.js — Tailwind-only token transformer
 *
 * Transforms extracted design-system.json + token-miner output into
 * Tailwind config + CSS/SCSS design tokens.
 *
 * Usage:
 *   node helpers/transform-tokens.js output/www.example.com
 *
 * Produces:
 *   {site_dir}/design-system/tailwind.config.js      (Full Tailwind theme)
 *   {site_dir}/design-system/tokens.css              (CSS custom properties)
 *   {site_dir}/design-system/tokens.scss             (SCSS variables)
 *   {site_dir}/design-system/tokens-flat.json        (Style Dictionary flat format)
 */

const fs = require('fs');
const path = require('path');

const siteDir = process.argv[2];
if (!siteDir) {
  console.error('Usage: node helpers/transform-tokens.js output/{domain}');
  process.exit(1);
}

const extractedPath = path.join(siteDir, 'extracted', 'design-system.json');
if (!fs.existsSync(extractedPath)) {
  console.error(`Error: ${extractedPath} not found. Run extract-design-system.js first.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
const outputDir = path.join(siteDir, 'design-system');
fs.mkdirSync(outputDir, { recursive: true });

// Load token-miner outputs if available
const tokensDir = path.join(siteDir, 'tokens');
const palette = fs.existsSync(path.join(tokensDir, 'palette.json'))
  ? JSON.parse(fs.readFileSync(path.join(tokensDir, 'palette.json'), 'utf-8'))
  : null;
const taxonomy = fs.existsSync(path.join(tokensDir, 'taxonomy.json'))
  ? JSON.parse(fs.readFileSync(path.join(tokensDir, 'taxonomy.json'), 'utf-8'))
  : null;

// ============================================================
// HELPERS
// ============================================================
function rgbToHex(rgb) {
  const match = rgb.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
  if (!match) return rgb;
  return '#' + [match[1], match[2], match[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

function getPrimaryFont() {
  const skip = new Set(['swiper-icons', 'fontawesome', 'fa', 'icon', 'material']);
  for (const ff of (raw.fontFaces || [])) {
    const family = (ff.family || '').trim();
    if (family && !skip.has(family.toLowerCase())) return family;
  }
  if (raw.typography?.[0]) return raw.typography[0].fontFamily?.split(',')[0].trim().replace(/['"]/g, '') || 'sans-serif';
  return 'sans-serif';
}

// ============================================================
// 1. STYLE DICTIONARY — CSS + SCSS + JSON (existing, kept)
// ============================================================
const tokens = { color: {}, font: {}, size: {}, spacing: {}, radius: {}, breakpoint: {} };

// Use clustered palette if available, otherwise raw colors
const colorSource = palette || (raw.colors || []).map((c, i) => ({ hex: rgbToHex(c.value), rgb: c.value, count: c.count, usedFor: c.usedFor }));
colorSource.slice(0, 30).forEach((c, i) => {
  const name = c.primitiveName || `color-${i + 1}`;
  tokens.color[name] = {
    value: c.hex || rgbToHex(c.rgb || c.value),
    original: c.rgb || c.value,
    comment: `Used ${c.count}x`
  };
});

(raw.typography || []).forEach((t, i) => {
  tokens.size[`font-type-${i + 1}`] = { value: t.fontSize, comment: `weight:${t.fontWeight} line:${t.lineHeight} (${t.count}x)` };
});

(raw.fontFaces || []).filter(f => f.family !== 'swiper-icons').forEach((f) => {
  tokens.font[`family-${f.weight}`] = { value: f.family, weight: f.weight, src: f.src };
});

if (raw.spacing?.container) {
  tokens.spacing['container-max-width'] = { value: raw.spacing.container.maxWidth };
  tokens.spacing['container-padding'] = { value: raw.spacing.container.padding };
}
(raw.spacing?.gaps || []).forEach((g, i) => {
  tokens.spacing[`gap-${i + 1}`] = { value: g.value, comment: `Used ${g.count}x` };
});
(raw.borderRadii || []).forEach((r, i) => {
  tokens.radius[`radius-${i + 1}`] = { value: r.value, comment: `Used ${r.count}x` };
});
(raw.breakpoints || []).forEach((bp, i) => {
  tokens.breakpoint[`bp-${i + 1}`] = { value: bp };
});

const sdInputPath = path.join(outputDir, 'sd-tokens.json');
fs.writeFileSync(sdInputPath, JSON.stringify(tokens, null, 2));

function toSDFormat(obj) {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && val.value !== undefined) {
      result[key] = { $value: val.value, $description: val.comment || '' };
    } else if (val && typeof val === 'object') {
      result[key] = toSDFormat(val);
    }
  }
  return result;
}

const sdTokens = toSDFormat(tokens);
fs.writeFileSync(path.join(outputDir, 'sd-tokens-v4.json'), JSON.stringify(sdTokens, null, 2));

// Style Dictionary v5 is ESM — use dynamic import
async function runStyleDictionary() {
  try {
    const { default: StyleDictionary } = await import('style-dictionary');
    const sd = new StyleDictionary({
      tokens: sdTokens,
      platforms: {
        css: { transformGroup: 'css', buildPath: outputDir + '/', files: [{ destination: 'tokens.css', format: 'css/variables' }] },
        scss: { transformGroup: 'scss', buildPath: outputDir + '/', files: [{ destination: 'tokens.scss', format: 'scss/variables' }] },
        json: { transformGroup: 'web', buildPath: outputDir + '/', files: [{ destination: 'tokens-flat.json', format: 'json/flat' }] }
      }
    });
    await sd.buildAllPlatforms();
    console.log(`Style Dictionary outputs: ${outputDir}/tokens.{css,scss,json}`);
  } catch (e) {
    console.warn(`Style Dictionary skipped (${e.message}). Other outputs still generated.`);
  }
}
runStyleDictionary();

// ============================================================
// 2. TAILWIND CONFIG — Full theme (enhanced from v1)
// ============================================================
const primaryFont = getPrimaryFont();
const tw = {
  theme: {
    extend: {
      colors: {},
      fontFamily: { brand: [`"${primaryFont}"`, 'sans-serif'] },
      fontSize: {},
      spacing: {},
      borderRadius: {},
      boxShadow: {},
      maxWidth: {}
    }
  }
};

// Colors — use taxonomy semantic names if available, otherwise clustered palette
if (taxonomy) {
  // Semantic colors (most useful for Tailwind)
  for (const [name, token] of Object.entries(taxonomy.semantic)) {
    // Resolve reference to hex
    const ref = token.$value?.replace(/\{color\.(.+)\}/, '$1');
    const primitive = taxonomy.primitive[ref];
    tw.theme.extend.colors[name] = primitive?.$value || token.$value;
  }
  // Also include top primitives for full palette access
  for (const [name, token] of Object.entries(taxonomy.primitive)) {
    tw.theme.extend.colors[name] = token.$value;
  }
} else {
  colorSource.slice(0, 20).forEach((c, i) => {
    const hex = c.hex || rgbToHex(c.rgb || c.value);
    if (hex.startsWith('#')) tw.theme.extend.colors[`brand-${i + 1}`] = hex;
  });
}

// Typography — full fontSize entries with lineHeight tuples
(raw.typography || []).slice(0, 15).forEach((t) => {
  const tags = Object.keys(t.tags || {});
  const primaryTag = tags.sort((a, b) => (t.tags[b] || 0) - (t.tags[a] || 0))[0] || 'body';
  let name;
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(primaryTag)) {
    name = primaryTag.toLowerCase();
  } else {
    name = `${t.fontSize?.replace('px', '') || '16'}`;
  }

  tw.theme.extend.fontSize[name] = [
    t.fontSize || '16px',
    {
      lineHeight: t.lineHeight || 'normal',
      fontWeight: t.fontWeight || '400',
      ...(t.letterSpacing && t.letterSpacing !== 'normal' ? { letterSpacing: t.letterSpacing } : {})
    }
  ];
});

// Spacing — gaps + container
(raw.spacing?.gaps || []).slice(0, 10).forEach((g, i) => {
  tw.theme.extend.spacing[`gap-${i + 1}`] = g.value;
});
if (raw.spacing?.container?.maxWidth) {
  tw.theme.extend.maxWidth.container = raw.spacing.container.maxWidth;
}

// Border radius
(raw.borderRadii || []).slice(0, 8).forEach((r, i) => {
  const name = r.value === '9999px' ? 'pill' : `custom-${i + 1}`;
  tw.theme.extend.borderRadius[name] = r.value;
});

// Box shadows
(raw.shadows || []).slice(0, 5).forEach((s, i) => {
  tw.theme.extend.boxShadow[`custom-${i + 1}`] = s.value;
});

const twPath = path.join(outputDir, 'tailwind.config.js');
fs.writeFileSync(twPath, `/** Auto-generated Tailwind theme — from extracted design tokens */\nmodule.exports = ${JSON.stringify(tw, null, 2)};\n`);
console.log(`Tailwind config: ${twPath}`);

console.log('\nTransform complete. Generated: Tailwind config, CSS vars, SCSS vars.');
// EOF — Bootstrap/SASS generation removed (Tailwind-only pipeline)
