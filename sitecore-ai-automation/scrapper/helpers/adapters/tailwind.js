const fs = require('fs');
const path = require('path');

/**
 * adapters/tailwind.js — Pixel-perfect Tailwind adapter (v2)
 *
 * Philosophy: PIXEL-PERFECT FIRST, Tailwind convenience second.
 * - ALL pixel dimensions use arbitrary values: w-[1440px], h-[132px], p-[36px_44px]
 * - Layout semantics use standard classes: flex, grid, absolute, relative
 * - Colors use semantic token names where available: bg-accent, text-text-primary
 * - Only 100%/auto/full use named classes: w-full, h-auto
 *
 * This ensures the output looks IDENTICAL to the original site.
 */

// ============================================================
// COLOR REVERSE LOOKUP — maps hex/rgb values to Tailwind token names
// ============================================================
function buildColorLookup(designTokens) {
  const lookup = {};
  if (designTokens.taxonomy?.semantic) {
    for (const [name, token] of Object.entries(designTokens.taxonomy.semantic)) {
      const ref = token.$value?.replace(/\{color\.(.+)\}/, '$1');
      const hex = designTokens.taxonomy?.primitive[ref]?.$value;
      if (hex) lookup[hex.toLowerCase()] = name;
    }
  }
  if (designTokens.taxonomy?.primitive) {
    for (const [name, token] of Object.entries(designTokens.taxonomy.primitive)) {
      const hex = token.$value?.toLowerCase();
      if (hex && !lookup[hex]) lookup[hex] = name;
    }
  }
  if (designTokens.palette) {
    designTokens.palette.forEach((c, i) => {
      const hex = c.hex?.toLowerCase();
      if (hex && !lookup[hex]) lookup[hex] = `brand-${i + 1}`;
    });
  }
  return lookup;
}

function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
  if (!m) return rgb;
  return '#' + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

// ============================================================
// NOISE FILTER — properties that don't affect static rendering
// ============================================================
const NOISE_PROPS = new Set(['cursor', 'transition', 'word-break']);
const INHERITED_TYPO = new Set(['color', 'font-size', 'font-weight', 'line-height', 'font-family']);

// ============================================================
// CSS → TAILWIND CLASS MAPPER (Pixel-Perfect)
// ============================================================
function mapColor(prefix, value, colorLookup) {
  if (!value || value === 'rgba(0, 0, 0, 0)' || value === 'transparent') return null;

  // Check for rgba with alpha < 1 — preserve as-is (don't lose transparency)
  const rgbaMatch = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgbaMatch && parseFloat(rgbaMatch[4]) < 1) {
    // Use Tailwind arbitrary with the full rgba value
    return `${prefix}-[${value.replace(/\s+/g, '_')}]`;
  }

  const hex = rgbToHex(value).toLowerCase();
  if (hex === '#ffffff' || value === 'rgb(255, 255, 255)') return `${prefix}-white`;
  if (hex === '#000000' || value === 'rgb(0, 0, 0)') return `${prefix}-black`;
  const tokenName = colorLookup[hex];
  if (tokenName) return `${prefix}-${tokenName}`;
  if (hex.startsWith('#')) return `${prefix}-[${hex}]`;
  // For complex values, use arbitrary
  return `${prefix}-[${value.replace(/\s+/g, '_')}]`;
}

/**
 * @param {object} styles - kebab-case CSS properties
 * @param {object} colorLookup - hex → token name map
 * @param {object} parentStyles - parent node's styles (for inheritance skip)
 * @param {object} opts - { isSection, viewportWidth, parentIsFlexOrGrid }
 */
function cssToTailwindClasses(styles, colorLookup, parentStyles, opts = {}) {
  const classes = [];
  if (!styles) return classes;

  const { isSection = false, viewportWidth = 1440, parentIsFlexOrGrid = false } = opts;
  const isInherited = (prop) => parentStyles && parentStyles[prop] === styles[prop];

  // ── DISPLAY + FLEX/GRID (standard classes — these ARE Tailwind's strength) ──
  const display = styles.display;
  if (display === 'flex') {
    classes.push('flex');
    // Always explicitly set flex direction — needed for responsive overrides
    // (if mobile is flex-col and desktop is default row, we need lg:flex-row)
    if (styles['flex-direction'] === 'column') classes.push('flex-col');
    else if (styles['flex-direction'] === 'column-reverse') classes.push('flex-col-reverse');
    else if (styles['flex-direction'] === 'row-reverse') classes.push('flex-row-reverse');
    else classes.push('flex-row'); // explicit row so responsive diff works
    if (styles['flex-wrap'] === 'wrap') classes.push('flex-wrap');

    const jc = styles['justify-content'];
    if (jc === 'center') classes.push('justify-center');
    else if (jc === 'flex-end' || jc === 'end') classes.push('justify-end');
    else if (jc === 'space-between') classes.push('justify-between');
    else if (jc === 'space-around') classes.push('justify-around');
    else if (jc === 'space-evenly') classes.push('justify-evenly');

    const ai = styles['align-items'];
    if (ai === 'center') classes.push('items-center');
    else if (ai === 'flex-start' || ai === 'start') classes.push('items-start');
    else if (ai === 'flex-end' || ai === 'end') classes.push('items-end');
    else if (ai === 'stretch') classes.push('items-stretch');
    else if (ai === 'baseline') classes.push('items-baseline');
  }
  if (display === 'grid') {
    classes.push('grid');
    if (styles['grid-template-columns']) {
      classes.push(`grid-cols-[${styles['grid-template-columns'].replace(/\s+/g, '_')}]`);
    }
    if (styles['grid-template-rows'] && styles['grid-template-rows'] !== 'auto') {
      classes.push(`grid-rows-[${styles['grid-template-rows'].replace(/\s+/g, '_')}]`);
    }
  }
  if (display === 'inline-flex') classes.push('inline-flex');
  if (display === 'inline') classes.push('inline');
  if (display === 'none') classes.push('hidden');

  // ── GAP (arbitrary for pixel-perfect) ──
  if (styles.gap && styles.gap !== 'normal' && styles.gap !== '0px') {
    classes.push(`gap-[${styles.gap}]`);
  }

  // ── POSITION (standard classes) ──
  if (styles.position === 'absolute') classes.push('absolute');
  if (styles.position === 'relative') classes.push('relative');
  if (styles.position === 'fixed') classes.push('fixed');
  if (styles.position === 'sticky') classes.push('sticky');

  // ── INSET / TOP / LEFT / RIGHT / BOTTOM (arbitrary — exact values) ──
  if (styles.inset === '0') {
    classes.push('inset-0');
  } else {
    if (styles.top !== undefined) {
      if (styles.top === '0px') classes.push('top-0');
      else classes.push(`top-[${styles.top}]`);
    }
    if (styles.left !== undefined) {
      if (styles.left === '0px') classes.push('left-0');
      else classes.push(`left-[${styles.left}]`);
    }
    if (styles.right !== undefined) {
      if (styles.right === '0px') classes.push('right-0');
      else classes.push(`right-[${styles.right}]`);
    }
    if (styles.bottom !== undefined) {
      if (styles.bottom === '0px') classes.push('bottom-0');
      else classes.push(`bottom-[${styles.bottom}]`);
    }
  }

  // ── Z-INDEX (arbitrary) ──
  if (styles['z-index']) classes.push(`z-[${styles['z-index']}]`);

  // ── TRANSFORM ──
  if (styles.transform && styles.transform !== 'none' && styles.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
    classes.push(`[transform:${styles.transform.replace(/\s+/g, '_')}]`);
  }

  // ── SIZING (with responsive width normalization) ──
  // The extraction captures pixel widths from a fixed viewport (e.g. 1440px).
  // On wider screens these would be stuck at 1440px. We normalize:
  //   - Sections: always w-full (they should span the viewport)
  //   - Containers near viewport width: w-full max-w-[1440px] mx-auto (centered)
  //   - Absolute/fixed fill elements (inset:0): w-full
  //   - Flex children matching parent width: w-full
  //   - Truly fixed-size elements (buttons, icons, cards): keep exact px
  if (styles.width) {
    const w = styles.width;
    if (w === '100%') {
      classes.push('w-full');
    } else if (w === 'auto') {
      /* default, skip */
    } else if (w === '100vw') {
      classes.push('w-screen');
    } else if (w.endsWith('px')) {
      const wpx = parseFloat(w);
      const isAbsOrFixed = styles.position === 'absolute' || styles.position === 'fixed';
      const isRelative = styles.position === 'relative';
      const hasInset = styles.inset === '0' || (styles.left === '0px' && styles.right === '0px');
      const isViewportWidth = wpx >= viewportWidth - 10 && wpx <= viewportWidth + 10;
      // Absolute/fixed with inset:0 AND viewport-matching width are true fill elements
      // Small absolute elements (buttons, badges) with left:0+right:0 are NOT fill elements
      const isFillElement = isAbsOrFixed && (hasInset || isViewportWidth) && wpx >= viewportWidth * 0.5;

      if (isSection) {
        // Sections always fill the viewport
        classes.push('w-full');
      } else if (isFillElement) {
        // Positioned elements that fill their parent (abs, fixed, or relative with inset:0)
        classes.push('w-full');
        // If parent is flex, prevent shrinking so carousel slides stay full-width
        if (parentIsFlexOrGrid) {
          classes.push('shrink-0');
        }
      } else if (isViewportWidth) {
        // Elements matching viewport width — they're meant to be full-width containers
        classes.push('w-full');
        // Flex children at viewport width need shrink-0 (carousel slides)
        if (parentIsFlexOrGrid) {
          classes.push('shrink-0');
        }
        const pad = styles.padding || '0px';
        const padParts = pad.split(/\s+/);
        const hPad = padParts.length >= 2 ? parseFloat(padParts[1]) : parseFloat(padParts[0]);
        if (hPad >= 40) {
          // Has significant horizontal padding — it's a centered content container
          classes.push(`max-w-[${viewportWidth}px]`);
          classes.push('mx-auto');
        }
        // else: edge-to-edge container — w-full already added above
      } else if (wpx >= viewportWidth * 0.7 && wpx < viewportWidth - 10) {
        // Large content-width containers (e.g. 1128px inside 1440px)
        // Keep exact width but add max-w-full so it doesn't overflow on smaller screens
        classes.push(`w-[${w}]`);
        classes.push('max-w-full');
      } else {
        // Truly fixed-size element — keep exact pixels
        classes.push(`w-[${w}]`);
      }
    } else {
      classes.push(`w-[${w}]`);
    }
  }
  if (styles.height) {
    const h = styles.height;
    if (h === '100%') classes.push('h-full');
    else if (h === 'auto') { /* default, skip */ }
    else if (h === '100vh') classes.push('h-screen');
    else {
      const isAbsFixedH = styles.position === 'absolute' || styles.position === 'fixed';
      const hasInsetH = styles.inset === '0';
      const isLayoutContainer = display === 'flex' || display === 'grid' || display === 'inline-flex';
      const hasMinHeight = !!styles['min-height'];
      // Content-flow elements (no position, no flex/grid) get content-derived height
      // from getComputedStyle — don't lock it with a fixed h-[...] class.
      // Only set explicit height for: positioned elements, flex/grid containers,
      // or elements with min-height (suggesting intentional sizing).
      // Content-flow elements get height from children — don't lock with fixed h-[...]
      // Only skip height for plain block elements with no positioning
      const hPx = parseFloat(h);
      const isContentFlow = !isAbsFixedH && !isLayoutContainer && !hasMinHeight
        && (!styles.position || styles.position === 'static');
      if (isAbsFixedH && hasInsetH) {
        classes.push('h-full');
      } else if (isContentFlow) {
        // Skip — let content determine height
      } else {
        classes.push(`h-[${h}]`);
      }
    }
  }
  if (styles['min-height']) classes.push(`min-h-[${styles['min-height']}]`);
  if (styles['min-width']) classes.push(`min-w-[${styles['min-width']}]`);
  if (styles['max-width']) {
    if (styles['max-width'] === '100%') classes.push('max-w-full');
    else if (styles['max-width'] !== 'none') {
      const mwPx = parseFloat(styles['max-width']);
      if (mwPx >= viewportWidth - 10) {
        // max-width matching viewport — this is a centered content container
        // If no explicit width was set, add w-full + mx-auto for centering
        if (!styles.width) {
          classes.push('w-full');
          classes.push('mx-auto');
        }
        classes.push(`max-w-[${viewportWidth}px]`);
      } else {
        classes.push(`max-w-[${styles['max-width']}]`);
      }
    }
  }
  if (styles['max-height'] && styles['max-height'] !== 'none') {
    classes.push(`max-h-[${styles['max-height']}]`);
  }
  if (styles['aspect-ratio'] && styles['aspect-ratio'] !== 'auto') {
    classes.push(`[aspect-ratio:${styles['aspect-ratio']}]`);
  }

  // ── EMPTY VISUAL ELEMENTS — no width/height but has visual styles ──
  // Background/shadow divs without explicit dimensions should fill their parent,
  // BUT only when inside an absolutely-positioned container (card shadows, overlays).
  // In normal flow (flex items), they should stay as thin decorative elements.
  if (!styles.width && !styles.height) {
    const hasVisualStyles = (styles['background-color'] && styles['background-color'] !== 'rgba(0, 0, 0, 0)')
      || (styles['background-image'] && styles['background-image'] !== 'none');
    const parentIsAbsolute = parentStyles?.position === 'absolute' || parentStyles?.position === 'fixed';
    if (hasVisualStyles && parentIsAbsolute) {
      // Inside an absolute parent — this is a background/shadow fill element
      classes.push('w-full');
      classes.push('h-full');
    }
    // In normal flow: leave it unsized (browser will size based on content/flex)
  }

  // ── PADDING (arbitrary — exact values, Tailwind shorthand for multi-value) ──
  if (styles.padding && styles.padding !== '0px') {
    const p = styles.padding;
    const parts = p.split(/\s+/);
    if (parts.length === 1) {
      classes.push(`p-[${parts[0]}]`);
    } else if (parts.length === 2) {
      if (parts[0] !== '0px') classes.push(`py-[${parts[0]}]`);
      if (parts[1] !== '0px') classes.push(`px-[${parts[1]}]`);
    } else if (parts.length === 3) {
      if (parts[0] !== '0px') classes.push(`pt-[${parts[0]}]`);
      if (parts[1] !== '0px') classes.push(`px-[${parts[1]}]`);
      if (parts[2] !== '0px') classes.push(`pb-[${parts[2]}]`);
    } else if (parts.length === 4) {
      if (parts[0] === parts[2] && parts[1] === parts[3]) {
        if (parts[0] !== '0px') classes.push(`py-[${parts[0]}]`);
        if (parts[1] !== '0px') classes.push(`px-[${parts[1]}]`);
      } else {
        if (parts[0] !== '0px') classes.push(`pt-[${parts[0]}]`);
        if (parts[1] !== '0px') classes.push(`pr-[${parts[1]}]`);
        if (parts[2] !== '0px') classes.push(`pb-[${parts[2]}]`);
        if (parts[3] !== '0px') classes.push(`pl-[${parts[3]}]`);
      }
    }
  }

  // ── MARGIN (arbitrary, with centering detection) ──
  if (styles.margin && styles.margin !== '0px' && styles.margin !== '0px 0px') {
    const m = styles.margin;
    const parts = m.split(/\s+/);
    if (parts.length === 1) {
      if (parts[0] === 'auto') classes.push('m-auto');
      else classes.push(`m-[${parts[0]}]`);
    } else if (parts.length === 2) {
      if (parts[1] === 'auto') {
        classes.push('mx-auto');
      } else if (parts[1].endsWith('px')) {
        // Check if horizontal margin is centering: (viewport - element) / 2
        const hMargin = parseFloat(parts[1]);
        const elWidth = parseFloat(styles.width) || 0;
        if (elWidth > 0 && Math.abs(hMargin - (viewportWidth - elWidth) / 2) < 5) {
          // This is centering via equal margins — use mx-auto
          classes.push('mx-auto');
        } else {
          classes.push(`mx-[${parts[1]}]`);
        }
      }
      if (parts[0] !== '0px') classes.push(`my-[${parts[0]}]`);
    } else if (parts.length === 4) {
      if (parts[0] !== '0px') classes.push(`mt-[${parts[0]}]`);
      if (parts[1] !== '0px') classes.push(`mr-[${parts[1]}]`);
      if (parts[2] !== '0px') classes.push(`mb-[${parts[2]}]`);
      if (parts[3] !== '0px') classes.push(`ml-[${parts[3]}]`);
    } else {
      classes.push(`[margin:${m.replace(/\s+/g, '_')}]`);
    }
  }

  // ── OVERFLOW (standard) ──
  if (styles.overflow === 'hidden') classes.push('overflow-hidden');
  else if (styles.overflow === 'auto') classes.push('overflow-auto');
  else if (styles.overflow === 'scroll') classes.push('overflow-scroll');
  else if (styles.overflow === 'clip') classes.push('overflow-clip');

  // ── OBJECT-FIT (standard) ──
  if (styles['object-fit'] === 'cover') classes.push('object-cover');
  if (styles['object-fit'] === 'contain') classes.push('object-contain');

  // ── BACKGROUND COLOR (semantic token or arbitrary) ──
  if (styles['background-color'] && styles['background-color'] !== 'rgba(0, 0, 0, 0)') {
    const bgClass = mapColor('bg', styles['background-color'], colorLookup);
    if (bgClass) classes.push(bgClass);
  }

  // ── BACKGROUND IMAGE (arbitrary) ──
  if (styles['background-image'] && styles['background-image'] !== 'none') {
    // Complex values — use arbitrary property
    classes.push(`[background-image:${styles['background-image'].replace(/\s+/g, '_')}]`);
  }
  if (styles['background-size'] && styles['background-size'] !== 'auto') {
    if (styles['background-size'] === 'cover') classes.push('bg-cover');
    else if (styles['background-size'] === 'contain') classes.push('bg-contain');
    else classes.push(`[background-size:${styles['background-size'].replace(/\s+/g, '_')}]`);
  }
  if (styles['background-position'] && styles['background-position'] !== '0% 0%') {
    if (styles['background-position'] === '50% 50%' || styles['background-position'] === 'center') classes.push('bg-center');
    else classes.push(`[background-position:${styles['background-position'].replace(/\s+/g, '_')}]`);
  }
  if (styles['background-repeat'] && styles['background-repeat'] !== 'repeat') {
    if (styles['background-repeat'] === 'no-repeat') classes.push('bg-no-repeat');
  }

  // ── WEBKIT BACKGROUND CLIP (for text gradient effects) ──
  if (styles['-webkit-background-clip'] && styles['-webkit-background-clip'] !== 'border-box') {
    classes.push(`[-webkit-background-clip:${styles['-webkit-background-clip']}]`);
  }
  if (styles['-webkit-text-fill-color']) {
    classes.push(`[-webkit-text-fill-color:${styles['-webkit-text-fill-color'].replace(/\s+/g, '_')}]`);
  }

  // ── BORDER RADIUS (standard for pill, arbitrary for rest) ──
  if (styles['border-radius'] && styles['border-radius'] !== '0px') {
    if (styles['border-radius'] === '9999px') classes.push('rounded-full');
    else if (styles['border-radius'] === '50%') classes.push('rounded-full');
    else classes.push(`rounded-[${styles['border-radius']}]`);
  }

  // ── BOX SHADOW (arbitrary) ──
  if (styles['box-shadow'] && styles['box-shadow'] !== 'none') {
    classes.push(`[box-shadow:${styles['box-shadow'].replace(/\s+/g, '_')}]`);
  }

  // ── OPACITY (arbitrary) ──
  if (styles.opacity && styles.opacity !== '1') {
    classes.push(`opacity-[${styles.opacity}]`);
  }

  // ── BORDERS (arbitrary) ──
  ['border-top', 'border-right', 'border-bottom', 'border-left'].forEach(side => {
    if (styles[side]) {
      classes.push(`[${side}:${styles[side].replace(/\s+/g, '_')}]`);
    }
  });

  // ── TYPOGRAPHY (arbitrary for pixel-perfect, skip inherited) ──
  if (styles.color && !isInherited('color')) {
    const textClass = mapColor('text', styles.color, colorLookup);
    if (textClass) classes.push(textClass);
  }
  if (styles['font-size'] && !isInherited('font-size')) {
    classes.push(`text-[${styles['font-size']}]`);
  }
  if (styles['font-weight'] && !isInherited('font-weight')) {
    classes.push(`font-[${styles['font-weight']}]`);
  }
  if (styles['line-height'] && !isInherited('line-height')) {
    classes.push(`leading-[${styles['line-height']}]`);
  }
  if (styles['font-family'] && !isInherited('font-family')) {
    // Use font-brand if it matches primary font, otherwise arbitrary
    classes.push('font-brand');
  }
  if (styles['text-transform']) {
    if (styles['text-transform'] === 'uppercase') classes.push('uppercase');
    else if (styles['text-transform'] === 'lowercase') classes.push('lowercase');
    else if (styles['text-transform'] === 'capitalize') classes.push('capitalize');
  }
  if (styles['text-align']) {
    if (styles['text-align'] === 'center') classes.push('text-center');
    else if (styles['text-align'] === 'right') classes.push('text-right');
    else if (styles['text-align'] === 'justify') classes.push('text-justify');
  }
  if (styles['text-decoration'] && styles['text-decoration'] !== 'none') {
    if (styles['text-decoration'] === 'underline') classes.push('underline');
    else if (styles['text-decoration'] === 'line-through') classes.push('line-through');
  }
  if (styles['font-style'] === 'italic') classes.push('italic');
  if (styles['white-space'] && styles['white-space'] !== 'normal') {
    if (styles['white-space'] === 'nowrap') classes.push('whitespace-nowrap');
    else if (styles['white-space'] === 'pre-wrap') classes.push('whitespace-pre-wrap');
  }
  if (styles['letter-spacing'] && styles['letter-spacing'] !== 'normal' && !isInherited('letter-spacing')) {
    classes.push(`tracking-[${styles['letter-spacing']}]`);
  }

  return classes;
}


// ============================================================
// NODE → HTML RENDERER
// ============================================================
function nodeToHtml(node, designTokens, colorLookup, depth = 0, parentStyles = null, opts = {}) {
  if (!node || !node.tag) return '';

  const indent = '  '.repeat(depth);
  const tag = node.tag;
  const styles = node.s || {};

  // Skip noise props
  const cleanStyles = {};
  for (const [k, v] of Object.entries(styles)) {
    if (!NOISE_PROPS.has(k)) cleanStyles[k] = v;
  }

  // Determine if this is a section-level component
  const isSection = depth === 0 || !!node.componentName;
  const viewportWidth = designTokens.viewportWidth || 1440;
  const parentDisplay = parentStyles?.display || '';
  const parentIsFlexOrGrid = parentDisplay === 'flex' || parentDisplay === 'grid' || parentDisplay === 'inline-flex';

  const classes = cssToTailwindClasses(cleanStyles, colorLookup, parentStyles, {
    isSection,
    viewportWidth,
    parentIsFlexOrGrid
  });
  const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

  // ── Special elements ──
  if (tag === 'img') {
    const imgClasses = cssToTailwindClasses(cleanStyles, colorLookup, parentStyles);
    const imgClassStr = imgClasses.length > 0 ? ` class="${imgClasses.join(' ')}"` : '';
    return `${indent}<img src="${node.src || ''}" alt="${node.alt || ''}"${imgClassStr}>`;
  }
  if (tag === 'svg') {
    return `${indent}${node.svg || '<svg></svg>'}`;
  }
  if (tag === 'video') {
    const attrs = [];
    if (node.poster) attrs.push(`poster="${node.poster}"`);
    if (node.autoplay) attrs.push('autoplay');
    if (node.muted) attrs.push('muted');
    if (node.loop) attrs.push('loop');
    attrs.push('playsinline');
    return `${indent}<video${classStr} ${attrs.join(' ')}>\n${indent}  <source src="${node.vsrc || ''}" type="video/mp4">\n${indent}</video>`;
  }
  if (tag === 'input' || tag === 'textarea') {
    const attrs = [];
    if (node.type) attrs.push(`type="${node.type}"`);
    if (node.placeholder) attrs.push(`placeholder="${node.placeholder}"`);
    if (node.name) attrs.push(`name="${node.name}"`);
    if (node.required) attrs.push('required');
    return `${indent}<${tag}${classStr} ${attrs.join(' ')}>`;
  }

  // ── Container elements ──
  let html = `${indent}<${tag}${classStr}`;
  if (tag === 'a' && node.href) html += ` href="${node.href}"`;
  if (node.componentName) html += ` data-component="${node.componentName}"`;
  html += '>';

  const hasChildren = node.c && node.c.length > 0;
  const hasText = node.t;

  if (!hasChildren && !hasText) {
    return html + `</${tag}>`;
  }
  if (hasText && !hasChildren) {
    return html + node.t + `</${tag}>`;
  }

  html += '\n';
  if (hasText) {
    html += `${indent}  ${node.t}\n`;
  }
  if (hasChildren) {
    for (const child of node.c) {
      const childHtml = nodeToHtml(child, designTokens, colorLookup, depth + 1, cleanStyles, opts);
      if (childHtml) html += childHtml + '\n';
    }
  }
  html += `${indent}</${tag}>`;
  return html;
}


// ============================================================
// EXPORTS
// ============================================================
// ============================================================
// RESPONSIVE: Generate classes by diffing mobile vs tablet vs desktop
// ============================================================
// Walks 3 trees in parallel. Mobile styles = base classes.
// Tablet diffs → md: prefix. Desktop diffs → lg: prefix.
// responsiveClasses logic is now inlined in nodeToResponsiveHtml for better context

function nodeToResponsiveHtml(mNode, tNode, dNode, designTokens, colorLookup, depth = 0, parentStyles = null) {
  // Desktop tree = HTML structure (most complete DOM)
  // Mobile styles = base Tailwind classes (no prefix — mobile-first)
  // Tablet diffs = md: prefix
  // Desktop diffs = lg: prefix
  const node = dNode || mNode || tNode;
  if (!node || !node.tag) return '';

  const indent = '  '.repeat(depth);
  const tag = node.tag;
  const mStyles = filterNoise(mNode?.s);
  const tStyles = filterNoise(tNode?.s);
  const dStyles = filterNoise(dNode?.s);

  const isSection = depth === 0 || !!node.componentName;
  const parentDisplay = parentStyles?.display || '';
  const parentIsFlexOrGrid = parentDisplay === 'flex' || parentDisplay === 'grid' || parentDisplay === 'inline-flex';
  const opts = { isSection, parentIsFlexOrGrid };

  // Mobile-first: mobile = base, tablet = md:, desktop = lg:
  const hasMobile = mStyles && Object.keys(mStyles).length > 0;
  const hasTablet = tStyles && Object.keys(tStyles).length > 0;

  // Base classes: mobile if available, otherwise desktop
  const baseStyles = hasMobile ? mStyles : dStyles;
  const baseVW = hasMobile ? 375 : 1440;
  const baseClasses = cssToTailwindClasses(baseStyles, colorLookup, parentStyles, { ...opts, viewportWidth: baseVW });
  const baseSet = new Set(baseClasses);

  const allClasses = [...baseClasses];

  // md: overrides — tablet styles that differ from mobile
  if (hasTablet) {
    const tClasses = cssToTailwindClasses(tStyles, colorLookup, parentStyles, { ...opts, viewportWidth: 768 });
    for (const cls of tClasses) {
      if (!baseSet.has(cls)) allClasses.push(`md:${cls}`);
    }
  }

  // lg: overrides — desktop styles that differ from tablet (or mobile if no tablet)
  const refStyles = hasTablet ? tStyles : baseStyles;
  const refClasses = hasTablet
    ? cssToTailwindClasses(tStyles, colorLookup, parentStyles, { ...opts, viewportWidth: 768 })
    : baseClasses;
  const refSet = new Set(refClasses);

  const dClasses = cssToTailwindClasses(dStyles, colorLookup, parentStyles, { ...opts, viewportWidth: 1440 });
  for (const cls of dClasses) {
    if (!refSet.has(cls) && !baseSet.has(cls)) allClasses.push(`lg:${cls}`);
  }

  const classStr = allClasses.length > 0 ? ` class="${allClasses.join(' ')}"` : '';

  // Special elements — use desktop node data (primary)
  if (tag === 'img') {
    return `${indent}<img src="${node.src || ''}" alt="${node.alt || ''}"${classStr}>`;
  }
  if (tag === 'svg') return `${indent}${node.svg || '<svg></svg>'}`;
  if (tag === 'video') {
    const attrs = [];
    if (node.poster) attrs.push(`poster="${node.poster}"`);
    if (node.autoplay) attrs.push('autoplay');
    if (node.muted) attrs.push('muted');
    if (node.loop) attrs.push('loop');
    attrs.push('playsinline');
    return `${indent}<video${classStr} ${attrs.join(' ')}>\n${indent}  <source src="${node.vsrc || ''}" type="video/mp4">\n${indent}</video>`;
  }
  if (tag === 'input' || tag === 'textarea') {
    const attrs = [];
    if (node.type) attrs.push(`type="${node.type}"`);
    if (node.placeholder) attrs.push(`placeholder="${node.placeholder}"`);
    if (node.name) attrs.push(`name="${node.name}"`);
    if (node.required) attrs.push('required');
    return `${indent}<${tag}${classStr} ${attrs.join(' ')}>`;
  }

  let html = `${indent}<${tag}${classStr}`;
  if (tag === 'a' && node.href) html += ` href="${node.href}"`;
  if (node.componentName) html += ` data-component="${node.componentName}"`;
  html += '>';

  // Desktop tree is the structural source of truth
  const dKids = dNode?.c || [];
  const mKids = mNode?.c || [];
  const tKids = tNode?.c || [];

  const hasText = node.t;
  if (dKids.length === 0 && !hasText) return html + `</${tag}>`;
  if (hasText && dKids.length === 0) return html + node.t + `</${tag}>`;

  html += '\n';
  if (hasText) html += `${indent}  ${node.t}\n`;

  const parentCtx = hasMobile ? mStyles : dStyles;

  const mAligned = mKids.length === dKids.length;
  const tAligned = tKids.length === dKids.length;

  if (mAligned && tAligned) {
    // All viewport trees match — walk in parallel (best case, pixel-perfect)
    for (let i = 0; i < dKids.length; i++) {
      const childHtml = nodeToResponsiveHtml(
        mKids[i], tKids[i], dKids[i],
        designTokens, colorLookup, depth + 1, parentCtx
      );
      if (childHtml) html += childHtml + '\n';
    }
  } else if (hasMobile) {
    // Children differ between viewports — render BOTH with show/hide
    // Use display:contents wrappers to avoid adding extra height/layout

    // Mobile layout: visible below lg breakpoint
    html += `${indent}  <div class="contents lg:hidden">\n`;
    for (const mChild of mKids) {
      const childHtml = nodeToHtml(mChild, designTokens, colorLookup, depth + 2, mStyles, { viewportWidth: 375 });
      if (childHtml) html += childHtml + '\n';
    }
    html += `${indent}  </div>\n`;

    // Desktop layout: visible at lg breakpoint and above
    html += `${indent}  <div class="hidden lg:contents">\n`;
    for (const dChild of dKids) {
      const childHtml = nodeToHtml(dChild, designTokens, colorLookup, depth + 2, dStyles, { viewportWidth: 1440 });
      if (childHtml) html += childHtml + '\n';
    }
    html += `${indent}  </div>\n`;
  } else {
    // No mobile data — desktop only
    for (let i = 0; i < dKids.length; i++) {
      const childHtml = nodeToResponsiveHtml(
        null, tAligned ? tKids[i] : null, dKids[i],
        designTokens, colorLookup, depth + 1, parentCtx
      );
      if (childHtml) html += childHtml + '\n';
    }
  }

  html += `${indent}</${tag}>`;
  return html;
}

function filterNoise(styles) {
  if (!styles) return {};
  const clean = {};
  for (const [k, v] of Object.entries(styles)) {
    if (!NOISE_PROPS.has(k)) clean[k] = v;
  }
  return clean;
}

module.exports = {
  name: 'tailwind',

  generatePage(pageData, designTokens) {
    const colorLookup = buildColorLookup(designTokens);
    const title = pageData.meta?.title || 'Page';
    const components = pageData.components || [];
    const viewportWidth = pageData.meta?.viewportWidth || 1440;
    designTokens.viewportWidth = viewportWidth;

    // Check for multi-viewport data
    const mobileData = designTokens._mobileData;
    const tabletData = designTokens._tabletData;
    const hasResponsive = mobileData && tabletData;

    let body = '';

    if (hasResponsive) {
      // Desktop-first responsive: use desktop tree structure,
      // overlay mobile/tablet styles as responsive overrides
      const mComps = mobileData.components || [];
      const tComps = tabletData.components || [];
      const dComps = components; // desktop = source of truth for structure

      for (let i = 0; i < dComps.length; i++) {
        body += nodeToResponsiveHtml(mComps[i] || null, tComps[i] || null, dComps[i], designTokens, colorLookup, 2) + '\n';
      }
    } else {
      // Desktop-only fallback
      for (const comp of components) {
        body += nodeToHtml(comp, designTokens, colorLookup, 2, null, { viewportWidth }) + '\n';
      }
    }

    // Font faces from design system
    const fontFaces = (designTokens.raw?.fontFaces || [])
      .filter(f => f.family && f.family.toLowerCase() !== 'swiper-icons')
      .map(ff => `@font-face { font-family: '${ff.family}'; src: ${ff.src}; font-weight: ${ff.weight}; font-style: ${ff.style || 'normal'}; }`)
      .join('\n    ');

    return `<!DOCTYPE html>
<html lang="${pageData.meta?.lang || 'en'}" dir="${pageData.meta?.dir || 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = TAILWIND_CONFIG_PLACEHOLDER;
  </script>
  <style>
    ${fontFaces}
    /* Reset for pixel-perfect rendering */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { overflow-x: hidden; max-width: 100vw; }
    img { max-width: 100%; height: auto; display: block; }
    a { text-decoration: none; color: inherit; }
    button { font-family: inherit; cursor: pointer; border: none; background: none; }
    svg { display: block; }
    video { display: block; width: 100%; height: 100%; object-fit: cover; }

    /* Responsive: handled by Tailwind md: and lg: prefixes from multi-viewport extraction */
    /* Fallback safety for any viewport */
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
  },

  cssToTailwindClasses,
  buildColorLookup,
  nodeToHtml
};
