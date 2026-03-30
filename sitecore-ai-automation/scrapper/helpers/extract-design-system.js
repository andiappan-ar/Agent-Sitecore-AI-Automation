/**
 * extract-design-system.js
 *
 * Run this in puppeteer_evaluate on any website homepage.
 * Returns a complete, pixel-exact design system JSON.
 *
 * Usage: Copy the contents of extractDesignSystem() and run in puppeteer_evaluate.
 * The function is wrapped in an IIFE to avoid variable collisions.
 */

(() => {
  const ds = {};

  // ============================================================
  // 1. COLORS — extract every unique color from computed styles
  // ============================================================
  const colorMap = {};
  const allEls = document.querySelectorAll('*');
  const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];

  allEls.forEach(el => {
    const cs = getComputedStyle(el);
    colorProps.forEach(prop => {
      const val = cs[prop];
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'currentcolor') {
        if (!colorMap[val]) colorMap[val] = { value: val, count: 0, usedFor: {} };
        colorMap[val].count++;
        colorMap[val].usedFor[prop] = (colorMap[val].usedFor[prop] || 0) + 1;
      }
    });
  });

  ds.colors = Object.entries(colorMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([value, data]) => ({
      value,
      count: data.count,
      usedFor: Object.entries(data.usedFor).map(([k, v]) => `${k}(${v})`).join(', ')
    }));

  // ============================================================
  // 2. TYPOGRAPHY — extract from every visible text element
  // ============================================================
  const typoMap = {};
  const textEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, div, li, button, label, blockquote, figcaption, time');

  textEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.width === 0) return;
    // Only elements with direct text content
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasText && !['H1','H2','H3','H4','H5','H6'].includes(el.tagName)) return;

    const cs = getComputedStyle(el);
    const key = `${cs.fontSize}|${cs.fontWeight}|${cs.lineHeight}|${cs.textTransform}|${cs.letterSpacing}`;

    if (!typoMap[key]) {
      typoMap[key] = {
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        textTransform: cs.textTransform,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily,
        samples: [],
        count: 0,
        tags: {}
      };
    }
    typoMap[key].count++;
    typoMap[key].tags[el.tagName] = (typoMap[key].tags[el.tagName] || 0) + 1;
    if (typoMap[key].samples.length < 3) {
      const section = el.closest('section');
      const sectionName = section?.className?.split(' ').filter(c => c && !c.includes(':') && !c.includes('['))[0] || 'unknown';
      typoMap[key].samples.push({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 60),
        section: sectionName,
        color: cs.color
      });
    }
  });

  ds.typography = Object.values(typoMap)
    .sort((a, b) => parseInt(b.fontSize) - parseInt(a.fontSize));

  // ============================================================
  // 3. FONT FACES — extract all @font-face declarations
  // ============================================================
  ds.fontFaces = [];
  const origin = window.location.origin;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) {
          let src = rule.style.getPropertyValue('src').substring(0, 500);
          // Convert relative URLs to absolute so blueprint can load fonts
          src = src.replace(/url\(["']?\//g, `url("${origin}/`).replace(/["']?\)/g, '")');
          ds.fontFaces.push({
            family: rule.style.getPropertyValue('font-family').replace(/['"]/g, ''),
            src: src,
            weight: rule.style.getPropertyValue('font-weight'),
            style: rule.style.getPropertyValue('font-style')
          });
        }
      }
    } catch (e) { /* skip cross-origin */ }
  }

  // ============================================================
  // 4. CSS VARIABLES — extract from :root
  // ============================================================
  ds.cssVariables = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ':root' || rule.selectorText?.includes(':root')) {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) {
              ds.cssVariables.push({
                name: prop,
                value: rule.style.getPropertyValue(prop).trim()
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  // ============================================================
  // 5. SPACING — extract all unique paddings, margins, gaps
  // ============================================================
  const spacingSet = { paddings: {}, gaps: {}, margins: {} };
  const sections = document.querySelectorAll('section, .container, [class*="container"]');

  sections.forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.padding !== '0px') spacingSet.paddings[cs.padding] = (spacingSet.paddings[cs.padding] || 0) + 1;
    if (cs.gap !== 'normal' && cs.gap !== '0px') spacingSet.gaps[cs.gap] = (spacingSet.gaps[cs.gap] || 0) + 1;
  });

  // Also check containers
  document.querySelectorAll('.container').forEach(el => {
    const cs = getComputedStyle(el);
    spacingSet.container = {
      maxWidth: cs.maxWidth,
      padding: cs.padding,
      margin: cs.margin
    };
  });

  ds.spacing = {
    container: spacingSet.container || null,
    paddings: Object.entries(spacingSet.paddings).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ value: k, count: v })),
    gaps: Object.entries(spacingSet.gaps).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ value: k, count: v }))
  };

  // ============================================================
  // 6. BORDER RADII — all unique values
  // ============================================================
  const radiiMap = {};
  allEls.forEach(el => {
    const r = getComputedStyle(el).borderRadius;
    if (r && r !== '0px') {
      radiiMap[r] = (radiiMap[r] || 0) + 1;
    }
  });
  ds.borderRadii = Object.entries(radiiMap)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count }));

  // ============================================================
  // 7. BREAKPOINTS — from media queries
  // ============================================================
  const bpSet = new Set();
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSMediaRule) {
          const media = rule.conditionText || rule.media?.mediaText || '';
          const matches = media.match(/(\d+)px/g);
          if (matches) matches.forEach(m => bpSet.add(m));
        }
      }
    } catch (e) {}
  }
  ds.breakpoints = [...bpSet].sort((a, b) => parseInt(a) - parseInt(b));

  // ============================================================
  // 8. BUTTONS — extract all unique button styles
  // ============================================================
  const btnMap = {};
  document.querySelectorAll('button, a[class*="btn"], a[class*="cta"], [role="button"]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.width === 0) return;
    const cs = getComputedStyle(el);
    const key = `${cs.padding}|${cs.borderRadius}|${cs.backgroundColor}|${cs.color}|${cs.fontSize}`;
    if (!btnMap[key]) {
      btnMap[key] = {
        padding: cs.padding,
        borderRadius: cs.borderRadius,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        border: cs.border,
        text: el.textContent.trim().substring(0, 30),
        tag: el.tagName,
        count: 0
      };
    }
    btnMap[key].count++;
  });
  ds.buttons = Object.values(btnMap).sort((a, b) => b.count - a.count);

  // ============================================================
  // 9. SHADOWS — all unique box-shadows
  // ============================================================
  const shadowSet = {};
  allEls.forEach(el => {
    const s = getComputedStyle(el).boxShadow;
    if (s && s !== 'none') shadowSet[s] = (shadowSet[s] || 0) + 1;
  });
  ds.shadows = Object.entries(shadowSet).map(([value, count]) => ({ value: value.substring(0, 200), count }));

  // ============================================================
  // 10. GRADIENTS — parse all background gradients into structured tokens
  // ============================================================
  const gradientMap = {};
  allEls.forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') return;
    // Match linear-gradient and radial-gradient
    const gradientMatches = bg.match(/(linear-gradient|radial-gradient|conic-gradient)\([^)]+\)/g);
    if (!gradientMatches) return;
    gradientMatches.forEach(g => {
      if (!gradientMap[g]) gradientMap[g] = { value: g, count: 0, type: 'linear', stops: [] };
      gradientMap[g].count++;
    });
  });

  // Parse gradient strings into structured data
  ds.gradients = Object.values(gradientMap).sort((a, b) => b.count - a.count).map(g => {
    const result = { raw: g.value, count: g.count };
    // Parse linear-gradient angle and stops
    const linearMatch = g.value.match(/linear-gradient\((\d+(?:\.\d+)?deg)?,?\s*(.*)\)/);
    if (linearMatch) {
      result.type = 'linear';
      result.angle = linearMatch[1] ? parseFloat(linearMatch[1]) : 180; // default to bottom
      // Parse color stops: "rgb(r,g,b) 0%, rgb(r,g,b) 100%"
      const stopsStr = linearMatch[2] || '';
      const stops = [];
      // Match color values followed by optional position
      const stopRegex = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s*(\d+(?:\.\d+)?%)?/g;
      let match;
      while ((match = stopRegex.exec(stopsStr)) !== null) {
        stops.push({ color: match[1], position: match[2] ? parseFloat(match[2]) / 100 : null });
      }
      // Auto-fill positions if missing
      if (stops.length > 0) {
        if (stops[0].position === null) stops[0].position = 0;
        if (stops[stops.length - 1].position === null) stops[stops.length - 1].position = 1;
        // Linear interpolation for middle stops
        for (let i = 1; i < stops.length - 1; i++) {
          if (stops[i].position === null) {
            stops[i].position = stops[i - 1].position + (stops[i + 1].position - stops[i - 1].position) / 2;
          }
        }
      }
      result.stops = stops;
    }
    const radialMatch = g.value.match(/radial-gradient\((.*)\)/);
    if (radialMatch && !linearMatch) {
      result.type = 'radial';
      // Parse stops same way
      const stopsStr = radialMatch[1] || '';
      const stops = [];
      const stopRegex = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s*(\d+(?:\.\d+)?%)?/g;
      let match;
      while ((match = stopRegex.exec(stopsStr)) !== null) {
        stops.push({ color: match[1], position: match[2] ? parseFloat(match[2]) / 100 : null });
      }
      result.stops = stops;
    }
    return result;
  });

  // ============================================================
  // 11. META — tech stack detection
  // ============================================================
  ds.meta = {
    title: document.title,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir || 'ltr',
    viewport: document.querySelector('meta[name="viewport"]')?.content,
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href),
    tech: {
      react: !!document.getElementById('root') || !!document.querySelector('[data-reactroot]'),
      nextjs: !!document.getElementById('__next'),
      tailwind: [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText?.includes('\\\:')); } catch(e) { return false; } }),
      swiper: !!document.querySelector('.swiper'),
      aos: !!document.querySelector('[data-aos]')
    }
  };

  return JSON.stringify(ds, null, 2);
})();
