/**
 * extract-interactions.js — Hover, focus, animation & transition extraction
 *
 * Run in puppeteer_evaluate AFTER navigating to a page.
 * Parses CSS stylesheet rules to find :hover/:focus/:active state changes,
 * @keyframes definitions, and transition properties.
 *
 * Outputs interactions.json for generation prompts.
 */

(() => {
  const result = {
    hoverRules: [],
    focusRules: [],
    keyframes: {},
    animatedElements: [],
    hoverTargets: [],
    transitions: [],
    animations: [],
    swipers: [],
    clickTargets: []
  };

  // ============================================================
  // 1. CSS RULE PARSING — :hover, :focus, :active states
  // ============================================================
  // Parse actual CSS rules to find what changes on pseudo-class states.
  // This is more reliable than simulating hover.

  const PSEUDO_CLASSES = [':hover', ':focus', ':active', ':focus-within', ':focus-visible'];
  const STYLE_PROPS = [
    'color', 'backgroundColor', 'opacity', 'transform', 'boxShadow',
    'borderColor', 'borderBottomColor', 'textDecoration', 'textDecorationLine',
    'outline', 'outlineColor', 'scale', 'filter', 'backdropFilter',
    'backgroundImage', 'borderRadius', 'fontWeight', 'letterSpacing',
    'width', 'height', 'maxHeight', 'padding', 'margin'
  ];

  // Helper: get component name for an element
  const getComponentName = (el) => {
    const section = el.closest('section, header, footer, nav, article, [data-component]');
    if (!section) return 'body';
    return section.getAttribute('data-component')
      || section.id
      || section.className?.toString()?.split(/\s+/).filter(c => c && c.length > 2 && !c.includes(':'))[0]
      || section.tagName.toLowerCase();
  };

  // Helper: convert CSSStyleDeclaration to plain object (only non-default values)
  const ruleToStyles = (rule) => {
    const styles = {};
    for (let i = 0; i < rule.style.length; i++) {
      const prop = rule.style[i];
      const val = rule.style.getPropertyValue(prop).trim();
      if (val && val !== 'initial' && val !== 'inherit' && val !== 'unset') {
        styles[prop] = val;
      }
    }
    return styles;
  };

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        // ── Pseudo-class rules ──
        if (rule instanceof CSSStyleRule) {
          const sel = rule.selectorText || '';
          let matchedPseudo = null;

          for (const pc of PSEUDO_CLASSES) {
            if (sel.includes(pc)) {
              matchedPseudo = pc;
              break;
            }
          }

          if (!matchedPseudo) continue;

          // Extract the base selector (remove pseudo-class)
          const baseSelector = sel
            .replace(/:hover/g, '')
            .replace(/:focus-within/g, '')
            .replace(/:focus-visible/g, '')
            .replace(/:focus/g, '')
            .replace(/:active/g, '')
            .replace(/::after|::before/g, '')
            .trim();

          if (!baseSelector) continue;

          // Try to find matching elements
          let matchCount = 0;
          let componentName = 'unknown';
          try {
            const matches = document.querySelectorAll(baseSelector);
            matchCount = matches.length;
            if (matches.length > 0) {
              componentName = getComponentName(matches[0]);
            }
          } catch (e) {
            // Invalid selector — skip
            continue;
          }

          if (matchCount === 0) continue;

          const styles = ruleToStyles(rule);
          if (Object.keys(styles).length === 0) continue;

          const entry = {
            selector: sel.substring(0, 200),
            baseSelector: baseSelector.substring(0, 200),
            pseudo: matchedPseudo,
            styles,
            matchedElements: matchCount,
            componentName
          };

          if (matchedPseudo === ':hover') {
            result.hoverRules.push(entry);
          } else if (matchedPseudo.includes('focus')) {
            result.focusRules.push(entry);
          }
          // :active rules go into hoverRules (they're interaction states)
          if (matchedPseudo === ':active') {
            result.hoverRules.push(entry);
          }
        }

        // ── @keyframes rules ──
        if (rule instanceof CSSKeyframesRule) {
          const name = rule.name;
          const frames = {};
          for (const kf of rule.cssRules) {
            const key = kf.keyText; // "0%", "50%", "100%", "from", "to"
            const styles = {};
            for (let i = 0; i < kf.style.length; i++) {
              const prop = kf.style[i];
              styles[prop] = kf.style.getPropertyValue(prop).trim();
            }
            frames[key] = styles;
          }
          if (Object.keys(frames).length > 0) {
            result.keyframes[name] = frames;
          }
        }
      }
    } catch (e) {
      // Skip cross-origin stylesheets
    }
  }

  // ============================================================
  // 2. ANIMATED ELEMENTS — elements with active CSS animations
  // ============================================================
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const animName = cs.animationName;
    if (!animName || animName === 'none') return;

    const rect = el.getBoundingClientRect();
    if (rect.height < 1 && rect.width < 1) return;

    result.animatedElements.push({
      tag: el.tagName.toLowerCase(),
      componentName: getComponentName(el),
      classes: el.className?.toString()?.substring(0, 100),
      animation: `${animName} ${cs.animationDuration} ${cs.animationTimingFunction}`,
      animationName: animName,
      animationDuration: cs.animationDuration,
      animationDelay: cs.animationDelay !== '0s' ? cs.animationDelay : null,
      animationIterationCount: cs.animationIterationCount,
      animationFillMode: cs.animationFillMode !== 'none' ? cs.animationFillMode : null,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
    });
  });

  // ============================================================
  // 3. HOVER TARGETS — elements with transitions (default state capture)
  // ============================================================
  const hoverCandidates = document.querySelectorAll(
    'a, button, [role="button"], [class*="hover"], [class*="group"], input, textarea, select'
  );

  const seen = new Set();
  hoverCandidates.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height < 1 || rect.width < 1) return;

    const cs = getComputedStyle(el);
    if (cs.transition === 'all 0s ease 0s' && cs.transitionDuration === '0s') return;

    const tag = el.tagName.toLowerCase();
    const key = `${tag}-${Math.round(rect.x)}-${Math.round(rect.y)}`;
    if (seen.has(key)) return;
    seen.add(key);

    result.hoverTargets.push({
      tag,
      componentName: getComponentName(el),
      text: el.textContent?.trim()?.substring(0, 40) || null,
      href: el.href || null,
      transition: cs.transition,
      transitionProperty: cs.transitionProperty,
      transitionDuration: cs.transitionDuration,
      transitionTimingFunction: cs.transitionTimingFunction,
      cursor: cs.cursor,
      defaultState: {
        color: cs.color,
        backgroundColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : null,
        opacity: cs.opacity,
        transform: cs.transform !== 'none' ? cs.transform : null,
        boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
        borderColor: cs.borderColor,
        textDecoration: cs.textDecorationLine !== 'none' ? cs.textDecorationLine : null
      }
    });
  });

  // ============================================================
  // 4. AOS SCROLL ANIMATIONS
  // ============================================================
  document.querySelectorAll('[data-aos]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height < 1) return;

    result.animations.push({
      type: 'aos',
      componentName: getComponentName(el),
      effect: el.getAttribute('data-aos'),
      delay: el.getAttribute('data-aos-delay') || '0',
      duration: el.getAttribute('data-aos-duration') || '400',
      easing: el.getAttribute('data-aos-easing') || 'ease',
      once: el.getAttribute('data-aos-once') || 'false',
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim()?.substring(0, 40)
    });
  });

  // ============================================================
  // 5. SWIPER CONFIGS
  // ============================================================
  document.querySelectorAll('.swiper').forEach(swiper => {
    const slides = swiper.querySelectorAll('.swiper-slide');
    const uniqueSlides = [...slides].filter(s => !s.classList.contains('swiper-slide-duplicate'));

    result.swipers.push({
      componentName: getComponentName(swiper),
      totalSlides: slides.length,
      uniqueSlides: uniqueSlides.length,
      hasNavigation: !!swiper.querySelector('.swiper-button-next, .swiper-button-prev'),
      hasPagination: !!swiper.querySelector('.swiper-pagination'),
      hasAutoplay: !!swiper.querySelector('[data-swiper-autoplay]'),
      direction: swiper.classList.contains('swiper-vertical') ? 'vertical' : 'horizontal',
      loop: slides.length > uniqueSlides.length
    });
  });

  // ============================================================
  // 6. CLICK TARGETS
  // ============================================================
  document.querySelectorAll('button').forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.height < 1 || rect.width < 1) return;
    const text = btn.textContent?.trim();
    if (!text || text.length > 50) return;

    let behavior = 'button';
    if (btn.closest('.swiper')) behavior = 'swiper-nav';
    else if (btn.className?.includes('tab') || btn.closest('[role="tablist"]')) behavior = 'tab-switch';
    else if (text.toLowerCase().includes('load more')) behavior = 'load-more';
    else if (text.toLowerCase().includes('submit')) behavior = 'form-submit';
    else if (btn.querySelector('svg') && !text.trim()) behavior = 'icon-button';

    result.clickTargets.push({
      componentName: getComponentName(btn),
      text: text.substring(0, 30),
      behavior,
      classes: btn.className?.toString()?.substring(0, 100)
    });
  });

  // ============================================================
  // 7. CSS TRANSITIONS — unique definitions with frequency
  // ============================================================
  const transitionSet = {};
  document.querySelectorAll('*').forEach(el => {
    const t = getComputedStyle(el).transition;
    if (t && t !== 'all 0s ease 0s') {
      if (!transitionSet[t]) transitionSet[t] = 0;
      transitionSet[t]++;
    }
  });
  result.transitions = Object.entries(transitionSet)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count }))
    .slice(0, 20);

  // ============================================================
  // SUMMARY
  // ============================================================
  result.summary = {
    hoverRules: result.hoverRules.length,
    focusRules: result.focusRules.length,
    keyframes: Object.keys(result.keyframes).length,
    animatedElements: result.animatedElements.length,
    hoverTargets: result.hoverTargets.length,
    aosAnimations: result.animations.length,
    swipers: result.swipers.length,
    clickTargets: result.clickTargets.length,
    uniqueTransitions: result.transitions.length
  };

  return JSON.stringify(result, null, 2);
})();
