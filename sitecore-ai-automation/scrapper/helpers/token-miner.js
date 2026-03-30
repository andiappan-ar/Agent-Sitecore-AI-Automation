/**
 * token-miner.js
 *
 * Advanced design token mining pipeline (Research Paper-informed).
 * Takes raw design-system.json and produces:
 *   1. Perceptually clustered color palette (CIELAB space)
 *   2. 3-tier token taxonomy (Primitive → Semantic → Component)
 *   3. W3C DTCG format output (Design Tokens Community Group spec)
 *
 * Usage:
 *   node helpers/token-miner.js output/{domain}
 *
 * Expects:
 *   {site_dir}/extracted/design-system.json
 *
 * Produces:
 *   {site_dir}/tokens/dtcg-tokens.json    (W3C DTCG format)
 *   {site_dir}/tokens/palette.json         (clustered color palette)
 *   {site_dir}/tokens/taxonomy.json        (3-tier token taxonomy)
 */

const fs = require('fs');
const path = require('path');

const siteDir = process.argv[2];
if (!siteDir) {
  console.error('Usage: node helpers/token-miner.js output/{domain}');
  process.exit(1);
}

const extractedPath = path.join(siteDir, 'extracted', 'design-system.json');
if (!fs.existsSync(extractedPath)) {
  console.error(`Error: ${extractedPath} not found. Run extract-design-system.js first.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
const outputDir = path.join(siteDir, 'tokens');
fs.mkdirSync(outputDir, { recursive: true });


// ============================================================
// COLOR SPACE CONVERSION: RGB → CIELAB
// ============================================================
// CIELAB is perceptually uniform — equal distances = equal perceived differences
// This enables meaningful color clustering (Research Paper 1)

function parseRgb(str) {
  const m = str.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
  if (!m) {
    // Try hex
    const hex = str.match(/^#([0-9a-fA-F]{6})$/);
    if (hex) {
      return {
        r: parseInt(hex[1].slice(0, 2), 16),
        g: parseInt(hex[1].slice(2, 4), 16),
        b: parseInt(hex[1].slice(4, 6), 16)
      };
    }
    return null;
  }
  return { r: parseFloat(m[1]), g: parseFloat(m[2]), b: parseFloat(m[3]) };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

// sRGB → linear RGB → XYZ → CIELAB
function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return {
    x: 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb,
    y: 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb,
    z: 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb
  };
}

// D65 illuminant reference
const REF_X = 0.95047, REF_Y = 1.00000, REF_Z = 1.08883;

function xyzToLab(x, y, z) {
  function f(t) {
    return t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116;
  }
  const fx = f(x / REF_X);
  const fy = f(y / REF_Y);
  const fz = f(z / REF_Z);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function rgbToLab(r, g, b) {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// CIEDE2000 simplified — Euclidean distance in CIELAB
// (Full CIEDE2000 is complex; Euclidean ΔE*ab is sufficient for clustering)
function deltaE(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}


// ============================================================
// HIERARCHICAL AGGLOMERATIVE CLUSTERING
// ============================================================
// Groups perceptually similar colors together (threshold ΔE < 3)

function clusterColors(colors, threshold = 3) {
  // Convert all colors to LAB + parse
  const items = colors
    .map(c => {
      const rgb = parseRgb(c.value);
      if (!rgb) return null;
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
      return { ...c, rgb, lab, hex: rgbToHex(rgb.r, rgb.g, rgb.b) };
    })
    .filter(Boolean);

  // Each item starts as its own cluster
  let clusters = items.map((item, i) => ({
    id: i,
    members: [item],
    centroid: item.lab,
    totalCount: item.count,
    representative: item // most frequent member
  }));

  // Agglomerative: merge closest pairs until no pair is within threshold
  let merged = true;
  while (merged) {
    merged = false;
    let minDist = Infinity;
    let mergeA = -1, mergeB = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = deltaE(clusters[i].centroid, clusters[j].centroid);
        if (d < minDist) {
          minDist = d;
          mergeA = i;
          mergeB = j;
        }
      }
    }

    if (minDist < threshold && mergeA >= 0) {
      const a = clusters[mergeA];
      const b = clusters[mergeB];
      const allMembers = [...a.members, ...b.members];
      const totalCount = a.totalCount + b.totalCount;
      // Weighted centroid
      const centroid = {
        L: (a.centroid.L * a.totalCount + b.centroid.L * b.totalCount) / totalCount,
        a: (a.centroid.a * a.totalCount + b.centroid.a * b.totalCount) / totalCount,
        b: (a.centroid.b * a.totalCount + b.centroid.b * b.totalCount) / totalCount,
      };
      // Most frequent member is the representative
      const representative = allMembers.reduce((best, m) => m.count > best.count ? m : best);

      clusters[mergeA] = { id: a.id, members: allMembers, centroid, totalCount, representative };
      clusters.splice(mergeB, 1);
      merged = true;
    }
  }

  return clusters
    .sort((a, b) => b.totalCount - a.totalCount)
    .map((c, i) => ({
      id: i,
      hex: c.representative.hex,
      rgb: c.representative.value,
      lab: c.centroid,
      count: c.totalCount,
      memberCount: c.members.length,
      usedFor: c.representative.usedFor,
      members: c.members.map(m => m.hex)
    }));
}


// ============================================================
// 3-TIER TOKEN TAXONOMY
// ============================================================
// Primitive → Semantic → Component (Research Paper 1)

function inferHueName(lab, hex) {
  // Determine hue category from LAB values
  const { L, a, b } = lab;
  const chroma = Math.sqrt(a * a + b * b);

  // Achromatic (grays, black, white)
  if (chroma < 5) {
    if (L > 95) return 'white';
    if (L > 75) return 'gray-light';
    if (L > 50) return 'gray';
    if (L > 25) return 'gray-dark';
    return 'black';
  }

  // Chromatic — determine hue angle
  const hue = Math.atan2(b, a) * 180 / Math.PI;
  const h = hue < 0 ? hue + 360 : hue;

  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 75) return 'yellow';
  if (h < 150) return 'green';
  if (h < 195) return 'teal';
  if (h < 255) return 'blue';
  if (h < 285) return 'indigo';
  if (h < 330) return 'purple';
  return 'pink';
}

function inferLuminanceScale(L) {
  if (L > 95) return '50';
  if (L > 85) return '100';
  if (L > 75) return '200';
  if (L > 65) return '300';
  if (L > 55) return '400';
  if (L > 45) return '500';
  if (L > 35) return '600';
  if (L > 25) return '700';
  if (L > 15) return '800';
  return '900';
}

function buildTaxonomy(clusteredColors, rawDesignSystem) {
  const taxonomy = {
    primitive: {},
    semantic: {},
    component: {}
  };

  // Track name collisions
  const usedNames = new Set();
  function uniqueName(base) {
    if (!usedNames.has(base)) { usedNames.add(base); return base; }
    let i = 2;
    while (usedNames.has(`${base}-${i}`)) i++;
    const name = `${base}-${i}`;
    usedNames.add(name);
    return name;
  }

  // ── PRIMITIVE TOKENS ──
  // Named by hue + luminance scale (e.g., blue-500, gray-200)
  clusteredColors.forEach(color => {
    const hueName = inferHueName(color.lab, color.hex);
    const scale = inferLuminanceScale(color.lab.L);
    const name = uniqueName(`${hueName}-${scale}`);
    taxonomy.primitive[name] = {
      $value: color.hex,
      $type: 'color',
      $description: `${color.count}x usage, ${color.memberCount} variants clustered`
    };
    color.primitiveName = name; // back-reference for semantic mapping
  });

  // ── SEMANTIC TOKENS ──
  // Inferred from DOM usage context
  const usedFor = (color) => color.usedFor || '';

  // Find primary text color (most-used non-white/black text color)
  const textColors = clusteredColors
    .filter(c => usedFor(c).includes('color(') && !['white-50', 'black-900'].includes(c.primitiveName))
    .sort((a, b) => {
      const aMatch = usedFor(a).match(/color\((\d+)\)/);
      const bMatch = usedFor(b).match(/color\((\d+)\)/);
      return (bMatch ? parseInt(bMatch[1]) : 0) - (aMatch ? parseInt(aMatch[1]) : 0);
    });

  if (textColors[0]) {
    taxonomy.semantic['text-primary'] = {
      $value: `{color.${textColors[0].primitiveName}}`,
      $type: 'color'
    };
  }
  if (textColors[1]) {
    taxonomy.semantic['text-secondary'] = {
      $value: `{color.${textColors[1].primitiveName}}`,
      $type: 'color'
    };
  }

  // Find primary background color
  const bgColors = clusteredColors
    .filter(c => usedFor(c).includes('backgroundColor('))
    .sort((a, b) => {
      const aMatch = usedFor(a).match(/backgroundColor\((\d+)\)/);
      const bMatch = usedFor(b).match(/backgroundColor\((\d+)\)/);
      return (bMatch ? parseInt(bMatch[1]) : 0) - (aMatch ? parseInt(aMatch[1]) : 0);
    });

  // Surface = most used bg, accent = first non-white/non-black bg
  if (bgColors[0]) {
    taxonomy.semantic['surface-primary'] = {
      $value: `{color.${bgColors[0].primitiveName}}`,
      $type: 'color'
    };
  }
  const accentBg = bgColors.find(c =>
    c.lab.L < 90 && c.lab.L > 10 && Math.sqrt(c.lab.a ** 2 + c.lab.b ** 2) > 5
  );
  if (accentBg) {
    taxonomy.semantic['accent'] = {
      $value: `{color.${accentBg.primitiveName}}`,
      $type: 'color'
    };
  }

  // Find border color
  const borderColors = clusteredColors
    .filter(c => usedFor(c).includes('borderColor(') || usedFor(c).includes('borderTopColor('))
    .sort((a, b) => b.count - a.count);
  if (borderColors[0]) {
    taxonomy.semantic['border-default'] = {
      $value: `{color.${borderColors[0].primitiveName}}`,
      $type: 'color'
    };
  }

  // ── COMPONENT TOKENS ──
  // From button extraction
  const buttons = rawDesignSystem.buttons || [];
  buttons.slice(0, 5).forEach((btn, i) => {
    const suffix = i === 0 ? 'primary' : i === 1 ? 'secondary' : `variant-${i + 1}`;
    // Map button colors to nearest primitive token
    const bgRgb = parseRgb(btn.backgroundColor || '');
    const textRgb = parseRgb(btn.color || '');

    if (bgRgb) {
      const bgLab = rgbToLab(bgRgb.r, bgRgb.g, bgRgb.b);
      const nearest = clusteredColors.reduce((best, c) =>
        deltaE(bgLab, c.lab) < deltaE(bgLab, best.lab) ? c : best
      );
      taxonomy.component[`button-${suffix}-bg`] = {
        $value: `{color.${nearest.primitiveName}}`,
        $type: 'color'
      };
    }
    if (textRgb) {
      const textLab = rgbToLab(textRgb.r, textRgb.g, textRgb.b);
      const nearest = clusteredColors.reduce((best, c) =>
        deltaE(textLab, c.lab) < deltaE(textLab, best.lab) ? c : best
      );
      taxonomy.component[`button-${suffix}-text`] = {
        $value: `{color.${nearest.primitiveName}}`,
        $type: 'color'
      };
    }
  });

  return taxonomy;
}


// ============================================================
// DTCG FORMAT OUTPUT (W3C Design Tokens Community Group)
// ============================================================
// Spec: $value, $type, $description — the canonical interchange format

function buildDTCG(taxonomy, rawDesignSystem, clusteredColors) {
  const dtcg = {
    $name: rawDesignSystem.meta?.title || 'Extracted Design Tokens',
    $description: 'Auto-extracted from live website via getComputedStyle()',

    // ── Colors ──
    color: {}
  };

  // Primitive colors
  for (const [name, token] of Object.entries(taxonomy.primitive)) {
    dtcg.color[name] = token;
  }

  // Semantic color aliases
  dtcg.semantic = {};
  for (const [name, token] of Object.entries(taxonomy.semantic)) {
    dtcg.semantic[name] = token;
  }

  // Component tokens
  dtcg.component = {};
  for (const [name, token] of Object.entries(taxonomy.component)) {
    dtcg.component[name] = token;
  }

  // ── Typography ──
  dtcg.typography = {};
  const typo = rawDesignSystem.typography || [];
  typo.slice(0, 15).forEach((t, i) => {
    const tags = Object.keys(t.tags || {});
    const primaryTag = tags.sort((a, b) => (t.tags[b] || 0) - (t.tags[a] || 0))[0] || 'body';

    let name;
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(primaryTag)) {
      name = `heading-${primaryTag.replace('H', '')}`;
    } else {
      const fs = t.fontSize?.replace('px', '') || '16';
      name = `body-${fs}`;
    }

    // Ensure unique
    const uniqueN = Object.keys(dtcg.typography).includes(name) ? `${name}-${i}` : name;

    dtcg.typography[uniqueN] = {
      $value: {
        fontFamily: (t.fontFamily || 'sans-serif').split(',')[0].trim().replace(/['"]/g, ''),
        fontSize: t.fontSize || '16px',
        fontWeight: t.fontWeight || '400',
        lineHeight: t.lineHeight || 'normal',
        letterSpacing: t.letterSpacing || 'normal',
        textTransform: t.textTransform || 'none'
      },
      $type: 'typography',
      $description: `${t.count || 0}x usage, tags: ${tags.join(', ')}`
    };
  });

  // ── Spacing ──
  dtcg.spacing = {};
  const gaps = rawDesignSystem.spacing?.gaps || [];
  gaps.slice(0, 10).forEach((g, i) => {
    dtcg.spacing[`gap-${i + 1}`] = {
      $value: g.value,
      $type: 'dimension',
      $description: `${g.count}x usage`
    };
  });

  const container = rawDesignSystem.spacing?.container;
  if (container) {
    if (container.maxWidth) {
      dtcg.spacing['container-max-width'] = { $value: container.maxWidth, $type: 'dimension' };
    }
    if (container.padding) {
      dtcg.spacing['container-padding'] = { $value: container.padding, $type: 'dimension' };
    }
  }

  // ── Border Radius ──
  dtcg.borderRadius = {};
  (rawDesignSystem.borderRadii || []).slice(0, 8).forEach((r, i) => {
    dtcg.borderRadius[`radius-${i + 1}`] = {
      $value: r.value,
      $type: 'dimension',
      $description: `${r.count}x usage`
    };
  });

  // ── Shadows ──
  dtcg.shadow = {};
  (rawDesignSystem.shadows || []).slice(0, 5).forEach((s, i) => {
    dtcg.shadow[`shadow-${i + 1}`] = {
      $value: s.value,
      $type: 'shadow',
      $description: `${s.count}x usage`
    };
  });

  // ── Gradients ──
  if (rawDesignSystem.gradients?.length > 0) {
    dtcg.gradient = {};
    rawDesignSystem.gradients.slice(0, 5).forEach((g, i) => {
      dtcg.gradient[`gradient-${i + 1}`] = {
        $value: {
          type: g.type || 'linear',
          angle: g.angle,
          stops: g.stops || []
        },
        $type: 'gradient',
        $description: `${g.count}x usage`
      };
    });
  }

  // ── Font Faces ──
  dtcg.fontFamily = {};
  const seenFamilies = new Set();
  (rawDesignSystem.fontFaces || [])
    .filter(f => f.family && !['swiper-icons', 'fontawesome'].includes(f.family.toLowerCase()))
    .forEach(f => {
      const family = f.family.trim();
      if (seenFamilies.has(family)) return;
      seenFamilies.add(family);
      dtcg.fontFamily[family.toLowerCase().replace(/\s+/g, '-')] = {
        $value: family,
        $type: 'fontFamily',
        $description: `weight: ${f.weight}, style: ${f.style}`
      };
    });

  // ── Breakpoints ──
  if (rawDesignSystem.breakpoints?.length > 0) {
    dtcg.breakpoint = {};
    rawDesignSystem.breakpoints.forEach((bp, i) => {
      dtcg.breakpoint[`bp-${i + 1}`] = {
        $value: bp,
        $type: 'dimension'
      };
    });
  }

  return dtcg;
}


// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('Token Miner — Processing design-system.json...\n');

// Step 1: Cluster colors
const clusteredColors = clusterColors(raw.colors || []);
console.log(`Colors: ${(raw.colors || []).length} raw → ${clusteredColors.length} clusters (ΔE < 3 threshold)`);

// Step 2: Build 3-tier taxonomy
const taxonomy = buildTaxonomy(clusteredColors, raw);
console.log(`Taxonomy: ${Object.keys(taxonomy.primitive).length} primitive, ${Object.keys(taxonomy.semantic).length} semantic, ${Object.keys(taxonomy.component).length} component tokens`);

// Step 3: Build DTCG output
const dtcg = buildDTCG(taxonomy, raw, clusteredColors);

// Write outputs
const palettePath = path.join(outputDir, 'palette.json');
fs.writeFileSync(palettePath, JSON.stringify(clusteredColors, null, 2));
console.log(`\nPalette: ${palettePath}`);

const taxonomyPath = path.join(outputDir, 'taxonomy.json');
fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomy, null, 2));
console.log(`Taxonomy: ${taxonomyPath}`);

const dtcgPath = path.join(outputDir, 'dtcg-tokens.json');
fs.writeFileSync(dtcgPath, JSON.stringify(dtcg, null, 2));
console.log(`DTCG tokens: ${dtcgPath}`);

console.log('\nToken mining complete.');
