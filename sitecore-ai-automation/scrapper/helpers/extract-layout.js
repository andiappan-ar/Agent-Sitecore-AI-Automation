/**
 * extract-layout.js — Layer 1: Layout shell extraction
 *
 * Run in puppeteer_evaluate at EACH viewport (1440, 768, 375).
 * Captures the site's structural DNA:
 * - Body/HTML baseline styles (font, color, bg)
 * - Container system (max-width, padding, margin, actual width)
 * - @font-face declarations with font-display
 * - Font stacks and type scale (h1-h6 + body)
 * - Section map (order, heights, positions)
 *
 * orchestrate.js calls this 3 times and merges into layout.json.
 */

(() => {
  const DPR = window.devicePixelRatio || 1;
  const vpWidth = window.innerWidth;

  // ── 1. BASELINES — html + body computed styles ──────────────
  const htmlCs = getComputedStyle(document.documentElement);
  const bodyCs = getComputedStyle(document.body);

  const baselines = {
    htmlFontSize: htmlCs.fontSize,
    bodyFontFamily: bodyCs.fontFamily,
    bodyFontSize: bodyCs.fontSize,
    bodyFontWeight: bodyCs.fontWeight,
    bodyLineHeight: bodyCs.lineHeight,
    bodyColor: bodyCs.color,
    bodyBgColor: bodyCs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bodyCs.backgroundColor : '#ffffff',
    bodyLetterSpacing: bodyCs.letterSpacing !== 'normal' ? bodyCs.letterSpacing : null,
    bodyDirection: bodyCs.direction || 'ltr'
  };

  // ── 2. FONT FACES — all @font-face with font-display ───────
  const fontFaces = [];
  const origin = window.location.origin;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) {
          let src = rule.style.getPropertyValue('src').substring(0, 500);
          src = src.replace(/url\(["']?\//g, `url("${origin}/`).replace(/["']?\)/g, '")');
          fontFaces.push({
            family: rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim(),
            src: src,
            weight: rule.style.getPropertyValue('font-weight') || '400',
            style: rule.style.getPropertyValue('font-style') || 'normal',
            display: rule.style.getPropertyValue('font-display') || 'auto'
          });
        }
      }
    } catch (e) { /* cross-origin */ }
  }

  // ── 3. FONT STACKS — detect primary + heading font families ─
  const fontUsage = {};
  document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li, button, div').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height < 1 || rect.width < 1) return;
    const ff = getComputedStyle(el).fontFamily;
    if (!fontUsage[ff]) fontUsage[ff] = 0;
    fontUsage[ff]++;
  });
  const sortedFonts = Object.entries(fontUsage).sort((a, b) => b[1] - a[1]);
  const primaryFont = sortedFonts[0]?.[0] || bodyCs.fontFamily;

  // Detect heading font (might differ from body)
  let headingFont = primaryFont;
  const h1 = document.querySelector('h1');
  if (h1) headingFont = getComputedStyle(h1).fontFamily;

  const fontStacks = {
    primary: primaryFont,
    heading: headingFont !== primaryFont ? headingFont : null
  };

  // ── 4. TYPE SCALE — actual sizes for h1-h6 + body + small ──
  const typeScale = {};
  const typeTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  for (const tag of typeTags) {
    const el = document.querySelector(tag);
    if (el && el.getBoundingClientRect().height > 0) {
      const cs = getComputedStyle(el);
      typeScale[tag] = {
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        fontFamily: cs.fontFamily !== primaryFont ? cs.fontFamily : null,
        letterSpacing: cs.letterSpacing !== 'normal' ? cs.letterSpacing : null,
        textTransform: cs.textTransform !== 'none' ? cs.textTransform : null
      };
    }
  }
  // Body text
  const bodyP = document.querySelector('p');
  if (bodyP && bodyP.getBoundingClientRect().height > 0) {
    const cs = getComputedStyle(bodyP);
    typeScale.body = { fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight };
  }
  // Small text
  const smallEl = document.querySelector('small, .small, [class*="caption"]');
  if (smallEl && smallEl.getBoundingClientRect().height > 0) {
    const cs = getComputedStyle(smallEl);
    typeScale.small = { fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight };
  }

  // ── 5. CONTAINER SYSTEM — find the dominant container pattern ─
  const containers = [];
  document.querySelectorAll('[class*="container"], [class*="wrapper"], main > div, section > div, #content > div').forEach(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const maxW = cs.maxWidth;
    const ml = cs.marginLeft;
    const mr = cs.marginRight;
    const w = rect.width / DPR;

    if (maxW !== 'none' && parseFloat(maxW) > 200 && parseFloat(maxW) < 3000) {
      containers.push({
        maxWidth: maxW,
        actualWidth: Math.round(w) + 'px',
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        marginLeft: ml,
        marginRight: mr,
        isCentered: ml === 'auto' || mr === 'auto',
        selector: el.id ? `#${el.id}` : el.className?.toString()?.split(/\s+/).filter(c => c && c.length > 2)[0] || el.tagName.toLowerCase()
      });
    }
  });

  // Find the dominant container pattern (most common max-width)
  const maxWidthCounts = {};
  containers.forEach(c => {
    const rounded = Math.round(parseFloat(c.maxWidth) / 10) * 10;
    if (!maxWidthCounts[rounded]) maxWidthCounts[rounded] = { count: 0, example: c };
    maxWidthCounts[rounded].count++;
  });
  const dominantContainer = Object.entries(maxWidthCounts)
    .sort((a, b) => b[1].count - a[1].count)[0];

  const containerSystem = dominantContainer ? {
    maxWidth: dominantContainer[1].example.maxWidth,
    actualWidth: dominantContainer[1].example.actualWidth,
    paddingLeft: dominantContainer[1].example.paddingLeft,
    paddingRight: dominantContainer[1].example.paddingRight,
    isCentered: dominantContainer[1].example.isCentered,
    occurrences: dominantContainer[1].count
  } : null;

  // ── 6. SECTION MAP — all top-level sections with heights ────
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR', 'HR']);
  const main = document.querySelector('main') || document.body;

  // Walk to find actual content sections (unwrap wrappers)
  function getSections(parent, depth = 0) {
    if (depth > 4) return [parent];
    const kids = [...parent.children].filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > 10 && !SKIP_TAGS.has(el.tagName);
    });

    // If this is a single-child wrapper, unwrap
    if (kids.length === 1) {
      const tag = kids[0].tagName.toLowerCase();
      const cls = (kids[0].className || '').toString();
      if (tag === 'div' && (!cls || /^(wrapper|container|content|page|main|row)/.test(cls))) {
        return getSections(kids[0], depth + 1);
      }
    }

    return kids;
  }

  const sectionEls = getSections(main);

  // Also ensure header/footer are in the list
  const headerEl = document.querySelector('header');
  const footerEl = document.querySelector('footer');

  const sections = [];

  if (headerEl && headerEl.getBoundingClientRect().height > 0) {
    const cs = getComputedStyle(headerEl);
    const rect = headerEl.getBoundingClientRect();
    sections.push({
      name: 'header',
      tag: 'header',
      height: Math.round(rect.height / DPR) + 'px',
      width: Math.round(rect.width / DPR) + 'px',
      position: cs.position,
      zIndex: cs.zIndex !== 'auto' ? cs.zIndex : null,
      top: cs.position === 'fixed' || cs.position === 'sticky' ? cs.top : null
    });
  }

  sectionEls.forEach(el => {
    if (el === headerEl || el === footerEl) return;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();

    // Get meaningful name
    const id = el.id;
    const cls = el.className?.toString()?.split(/\s+/).filter(c => c && c.length > 2 && !c.includes(':'))[0];
    const name = id || cls || tag;

    sections.push({
      name,
      tag,
      height: Math.round(rect.height / DPR) + 'px',
      width: Math.round(rect.width / DPR) + 'px',
      y: Math.round((rect.y + window.scrollY) / DPR),
      bgColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : null,
      hasBgImage: cs.backgroundImage !== 'none'
    });
  });

  if (footerEl && footerEl.getBoundingClientRect().height > 0) {
    const cs = getComputedStyle(footerEl);
    const rect = footerEl.getBoundingClientRect();
    sections.push({
      name: 'footer',
      tag: 'footer',
      height: Math.round(rect.height / DPR) + 'px',
      width: Math.round(rect.width / DPR) + 'px',
      bgColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : null
    });
  }

  return JSON.stringify({
    viewport: vpWidth,
    baselines,
    fontFaces,
    fontStacks,
    typeScale,
    containerSystem,
    sections,
    pageHeight: Math.round(document.documentElement.scrollHeight / DPR) + 'px'
  }, null, 2);
})();
