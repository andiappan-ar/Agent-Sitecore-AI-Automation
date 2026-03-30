/**
 * extract-components.js — Unified component extraction script (v2)
 *
 * Run in puppeteer_evaluate on any page after scrolling to trigger lazy content.
 * Returns a complete component tree with computed styles in compact format.
 *
 * Output format (compact, kebab-case):
 *   { tag, s: {kebab-case CSS}, t: "direct text", c: [children], componentName }
 *   + box: { x, y, w, h }         — bounding box geometry (DPR-normalized)
 *   + pseudos: [{ pseudo, content, s }]  — ::before/::after elements
 *   img: { src, alt }  |  a: { href }  |  svg: { svg }
 *   video: { vsrc, poster }  |  input: { type, placeholder, name }
 *
 * v3 enhancements (from research papers):
 *   - Pseudo-element extraction (::before/::after) via getComputedStyle(el, pseudo)
 *   - Shadow DOM piercing via element.shadowRoot traversal
 *   - Bounding box geometry via getBoundingClientRect() + devicePixelRatio normalization
 *   - Sub-pixel normalization via GPU composite layer forcing
 *
 * This is the SINGLE SOURCE OF TRUTH for extraction format.
 * generate-blueprint.py and framework adapters read this exact shape.
 */

(() => {
  const MAX_DEPTH = 12;

  // ── PHASE 0: Neutralize ALL animations BEFORE capturing styles ────
  // This is critical: AOS, Swiper, CSS transitions all cause mid-state captures.
  // We must force final state and disable transitions so getComputedStyle is clean.

  // 1. Kill all CSS transitions/animations globally
  const killSheet = document.createElement('style');
  killSheet.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(killSheet);

  // 2. Force ALL AOS elements to their final (visible) state
  document.querySelectorAll('[data-aos]').forEach(el => {
    el.classList.add('aos-animate');
    el.style.opacity = '1';
    el.style.transform = 'none';
    // Also clear any inline transition
    el.style.transition = 'none';
  });

  // 3. Force Swiper slides: make all visible (not just active)
  document.querySelectorAll('.swiper-slide').forEach(el => {
    // Don't touch transform on slides (they use translateX for positioning)
    // But ensure opacity is 1 for visible slides
    if (el.style.opacity === '0' || getComputedStyle(el).opacity === '0') {
      // Only fix non-active slides that are hidden
    }
  });

  // 4. Force sub-pixel normalization for hi-DPI screens (Research Paper 1)
  // translateZ(0) pushes to GPU composite layer, resolving fractional pixel rounding
  const pixelSnap = document.createElement('style');
  pixelSnap.textContent = 'html, body { transform: translateZ(0); will-change: transform; -webkit-font-smoothing: antialiased; }';
  document.head.appendChild(pixelSnap);

  // 5. Force reflow so the style changes take effect
  void document.body.offsetHeight;

  // ── Device pixel ratio for sub-pixel normalization ───────────────
  const DPR = window.devicePixelRatio || 1;

  // ── Pseudo-element extraction (Research Paper 1) ───────────────
  // ::before/::after don't exist as DOM nodes but render critical UI elements
  const getPseudoElements = (el) => {
    const pseudos = [];
    for (const pseudo of ['::before', '::after']) {
      try {
        const ps = getComputedStyle(el, pseudo);
        const content = ps.content;
        // Skip if no content or explicitly none/empty
        if (!content || content === 'none' || content === '""' || content === "''") continue;

        const s = {};
        // Capture visual properties of the pseudo-element
        if (ps.display !== 'none') s.display = ps.display;
        if (ps.position !== 'static') {
          s.position = ps.position;
          if (ps.top !== 'auto') s.top = ps.top;
          if (ps.left !== 'auto') s.left = ps.left;
          if (ps.right !== 'auto') s.right = ps.right;
          if (ps.bottom !== 'auto') s.bottom = ps.bottom;
        }
        if (ps.width !== 'auto' && ps.width !== '0px') s.width = ps.width;
        if (ps.height !== 'auto' && ps.height !== '0px') s.height = ps.height;
        if (ps.backgroundColor !== 'rgba(0, 0, 0, 0)') s['background-color'] = ps.backgroundColor;
        if (ps.backgroundImage !== 'none') s['background-image'] = ps.backgroundImage;
        if (ps.borderRadius !== '0px') s['border-radius'] = ps.borderRadius;
        if (ps.color) s.color = ps.color;
        if (ps.fontSize) s['font-size'] = ps.fontSize;
        if (ps.fontWeight) s['font-weight'] = ps.fontWeight;
        if (ps.fontFamily) s['font-family'] = ps.fontFamily;
        if (ps.opacity !== '1') s.opacity = ps.opacity;
        if (ps.transform !== 'none') s.transform = ps.transform;
        if (ps.boxShadow !== 'none') s['box-shadow'] = ps.boxShadow;
        if (ps.zIndex !== 'auto') s['z-index'] = ps.zIndex;

        pseudos.push({ pseudo, content, s });
      } catch (e) { /* skip inaccessible pseudo-elements */ }
    }
    return pseudos.length > 0 ? pseudos : null;
  };

  // ── Style extraction ──────────────────────────────────────────────
  const getStyles = (el, tag) => {
    const cs = getComputedStyle(el);
    const s = {};

    // Layout
    if (cs.display === 'flex') {
      s.display = 'flex';
      if (cs.flexDirection !== 'row') s['flex-direction'] = cs.flexDirection;
      if (cs.justifyContent !== 'normal') s['justify-content'] = cs.justifyContent;
      if (cs.alignItems !== 'normal') s['align-items'] = cs.alignItems;
      if (cs.gap !== 'normal' && cs.gap !== '0px') s.gap = cs.gap;
      if (cs.flexWrap !== 'nowrap') s['flex-wrap'] = cs.flexWrap;
    }
    if (cs.display === 'grid') {
      s.display = 'grid';
      if (cs.gridTemplateColumns !== 'none') s['grid-template-columns'] = cs.gridTemplateColumns;
      if (cs.gridTemplateRows !== 'none' && cs.gridTemplateRows !== 'auto') s['grid-template-rows'] = cs.gridTemplateRows;
      if (cs.gap !== 'normal' && cs.gap !== '0px') s.gap = cs.gap;
    }
    if (cs.display === 'inline-flex') {
      s.display = 'inline-flex';
      if (cs.flexDirection !== 'row') s['flex-direction'] = cs.flexDirection;
      if (cs.justifyContent !== 'normal') s['justify-content'] = cs.justifyContent;
      if (cs.alignItems !== 'normal') s['align-items'] = cs.alignItems;
      if (cs.gap !== 'normal' && cs.gap !== '0px') s.gap = cs.gap;
    }
    if (cs.display === 'none') s.display = 'none';
    if (cs.display === 'inline') s.display = 'inline';

    // Positioning
    // Positioning — clean capture, filter out calculation artifacts
    if (cs.position !== 'static') {
      s.position = cs.position;
      if (cs.top === '0px' && cs.left === '0px' && cs.right === '0px' && cs.bottom === '0px') {
        s.inset = '0';
      } else {
        // Only capture meaningful inset values (filter out huge computed artifacts)
        if (cs.top !== 'auto' && Math.abs(parseFloat(cs.top)) < 2000) s.top = cs.top;
        if (cs.left !== 'auto' && Math.abs(parseFloat(cs.left)) < 2000) s.left = cs.left;
        if (cs.right !== 'auto' && Math.abs(parseFloat(cs.right)) < 2000) s.right = cs.right;
        if (cs.bottom !== 'auto' && Math.abs(parseFloat(cs.bottom)) < 2000) s.bottom = cs.bottom;
      }
    }
    if (cs.zIndex !== 'auto') s['z-index'] = cs.zIndex;
    if (cs.transform !== 'none') s.transform = cs.transform;

    // Sizing — capture width/height on ALL significant elements (not just flex/grid)
    const elRect = el.getBoundingClientRect();
    const isSignificant = elRect.width > 10 && elRect.height > 10;
    if (isSignificant) {
      s.width = cs.width;
      s.height = cs.height;
    }
    if (cs.minHeight !== '0px' && cs.minHeight !== 'auto') s['min-height'] = cs.minHeight;
    if (cs.minWidth !== '0px' && cs.minWidth !== 'auto') s['min-width'] = cs.minWidth;
    if (cs.maxWidth !== 'none') s['max-width'] = cs.maxWidth;
    if (cs.maxHeight !== 'none') s['max-height'] = cs.maxHeight;
    if (cs.aspectRatio !== 'auto') s['aspect-ratio'] = cs.aspectRatio;

    // Box model — per-side padding and margin for responsive precision
    const pt = cs.paddingTop, pr = cs.paddingRight, pb = cs.paddingBottom, pl = cs.paddingLeft;
    if (pt !== '0px' || pr !== '0px' || pb !== '0px' || pl !== '0px') {
      if (pt === pr && pr === pb && pb === pl) {
        s.padding = pt;
      } else if (pt === pb && pr === pl) {
        s.padding = `${pt} ${pr}`;
      } else {
        s.padding = `${pt} ${pr} ${pb} ${pl}`;
      }
    }
    const mt = cs.marginTop, mr = cs.marginRight, mb = cs.marginBottom, ml = cs.marginLeft;
    if (ml === 'auto' || mr === 'auto') {
      s['margin-left'] = ml;
      s['margin-right'] = mr;
      if (mt !== '0px') s['margin-top'] = mt;
      if (mb !== '0px') s['margin-bottom'] = mb;
    } else if (mt !== '0px' || mr !== '0px' || mb !== '0px' || ml !== '0px') {
      if (mt === mr && mr === mb && mb === ml) {
        s.margin = mt;
      } else if (mt === mb && mr === ml) {
        s.margin = `${mt} ${mr}`;
      } else {
        s.margin = `${mt} ${mr} ${mb} ${ml}`;
      }
    }
    if (cs.overflow !== 'visible') s.overflow = cs.overflow;
    if (cs.objectFit !== 'fill') s['object-fit'] = cs.objectFit;

    // Background & borders
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
      s['background-color'] = cs.backgroundColor;
    }
    if (cs.backgroundImage !== 'none') s['background-image'] = cs.backgroundImage;
    if (cs.backgroundSize !== 'auto') s['background-size'] = cs.backgroundSize;
    if (cs.backgroundPosition !== '0% 0%') s['background-position'] = cs.backgroundPosition;
    if (cs.backgroundRepeat !== 'repeat') s['background-repeat'] = cs.backgroundRepeat;
    // Webkit text clipping (used for text-mask effects like text with bg image)
    const bgClip = cs.webkitBackgroundClip || cs.backgroundClip;
    if (bgClip && bgClip !== 'border-box') s['-webkit-background-clip'] = bgClip;
    const textFill = cs.webkitTextFillColor;
    if (textFill && textFill !== cs.color) s['-webkit-text-fill-color'] = textFill;
    if (cs.borderRadius !== '0px') s['border-radius'] = cs.borderRadius;
    if (cs.boxShadow !== 'none') s['box-shadow'] = cs.boxShadow;
    if (cs.opacity !== '1') s.opacity = cs.opacity;

    // Individual borders (more useful than shorthand for pixel-perfect)
    if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none') {
      s['border-top'] = cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor;
    }
    if (cs.borderRightWidth !== '0px' && cs.borderRightStyle !== 'none') {
      s['border-right'] = cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor;
    }
    if (cs.borderBottomWidth !== '0px' && cs.borderBottomStyle !== 'none') {
      s['border-bottom'] = cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor;
    }
    if (cs.borderLeftWidth !== '0px' && cs.borderLeftStyle !== 'none') {
      s['border-left'] = cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor;
    }

    // Typography
    s.color = cs.color;
    s['font-size'] = cs.fontSize;
    s['font-weight'] = cs.fontWeight;
    s['line-height'] = cs.lineHeight;
    s['font-family'] = cs.fontFamily;
    if (cs.textTransform !== 'none') s['text-transform'] = cs.textTransform;
    if (cs.fontStyle !== 'normal') s['font-style'] = cs.fontStyle;
    if (cs.letterSpacing !== 'normal') s['letter-spacing'] = cs.letterSpacing;
    if (cs.textAlign !== 'start' && cs.textAlign !== 'left') s['text-align'] = cs.textAlign;
    if (cs.textDecorationLine !== 'none') s['text-decoration'] = cs.textDecorationLine;
    if (cs.whiteSpace !== 'normal') s['white-space'] = cs.whiteSpace;
    if (cs.wordBreak !== 'normal') s['word-break'] = cs.wordBreak;

    // Transitions (for hover state detection downstream)
    if (cs.transition !== 'all 0s ease 0s' && cs.transitionDuration !== '0s') {
      s.transition = cs.transition;
    }
    if (cs.cursor === 'pointer') s.cursor = 'pointer';

    return s;
  };

  // ── Component name detection ──────────────────────────────────────
  const getComponentName = (section) => {
    const tag = section.tagName.toLowerCase();
    const cls = section.className?.toString() || '';
    const id = section.id || '';

    // Filter out utility/layout classes
    const SKIP_CLASSES = new Set([
      'relative', 'absolute', 'fixed', 'flex', 'grid', 'block', 'hidden',
      'overflow-hidden', 'overflow-x-hidden', 'items-center', 'justify-center',
      'container', 'widget', 'placeholder', 'section', 'wrapper', 'inner',
    ]);
    const meaningful = cls.split(/\s+/).filter(c =>
      c && c.length > 2
      && !c.includes(':') && !c.includes('[') && !c.includes('/')
      && !c.startsWith('bg-') && !c.startsWith('py-') && !c.startsWith('px-')
      && !c.startsWith('pt-') && !c.startsWith('pb-') && !c.startsWith('mt-')
      && !c.startsWith('mb-') && !c.startsWith('mx-') && !c.startsWith('my-')
      && !c.startsWith('w-') && !c.startsWith('h-') && !c.startsWith('min-')
      && !c.startsWith('max-') && !c.startsWith('text-') && !c.startsWith('font-')
      && !c.startsWith('placeholder') && !c.startsWith('swiper-')
      && !SKIP_CLASSES.has(c)
    );

    // Prefer: id > meaningful class > combined classes > tag-based name
    if (id && id.length > 2 && id.length < 40) return id;
    if (meaningful.length > 0) {
      // Join up to 2 most specific classes for a better name
      return meaningful.slice(0, 2).join('-');
    }
    // Fallback to tag-based name
    if (tag === 'header') return 'Header';
    if (tag === 'footer') return 'Footer';
    if (tag === 'nav') return 'Navigation';
    return 'Unknown';
  };

  // ── Recursive DOM walker ──────────────────────────────────────────
  const walk = (el, depth = 0) => {
    if (!el || depth > MAX_DEPTH) return null;

    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);

    // Skip truly hidden elements (not interactive content we want to preserve)
    const isInteractiveContent = el.closest('[role="tabpanel"]')
      || el.hasAttribute('role') && el.getAttribute('role') === 'tabpanel'
      || el.closest('[aria-expanded]')
      || el.closest('[data-tab-content]');

    // Skip zero-size elements (unless interactive)
    if (rect.height < 1 && rect.width < 1 && !isInteractiveContent) return null;

    // Skip offscreen elements (hidden mobile menus, nav panels at left:-375px etc.)
    if (rect.right < -50 && rect.width > 100 && !isInteractiveContent) return null;

    // Skip large invisible elements (opacity:0) UNLESS they are mega-menu dropdowns inside header/nav
    const isInsideHeaderNav = !!el.closest('header, nav, [class*="navigation"]');
    if (cs.opacity === '0' && rect.height > 100 && !isInteractiveContent && !isInsideHeaderNav) return null;

    // Skip visibility:hidden large elements UNLESS inside header/nav (mega-menu)
    if (cs.visibility === 'hidden' && rect.height > 50 && !isInteractiveContent && !isInsideHeaderNav) return null;

    // For mega-menu items inside header: mark as hidden but preserve the DOM tree
    // Store flag on the DOM element — will be transferred to the node object later
    if (isInsideHeaderNav && (cs.opacity === '0' || cs.visibility === 'hidden')) {
      el._megaMenu = true;
    }

    // Swiper slides: keep ALL slides for collection components (news, timeline, logos).
    // Mark inactive slides so generation can decide what to show.
    // Only skip duplicate slides in HERO carousels (where there are 50+ identical slides).
    const isSwiper = el.classList?.contains('swiper-slide');
    if (isSwiper) {
      const swiperContainer = el.closest('.swiper, .swiper-container');
      const totalSlides = swiperContainer ? swiperContainer.querySelectorAll('.swiper-slide').length : 0;
      const isActive = el.classList.contains('swiper-slide-active') || el.classList.contains('swiper-slide-visible');
      const isPrevNext = el.classList.contains('swiper-slide-prev') || el.classList.contains('swiper-slide-next');

      // Hero carousels (few unique slides, many duplicates): keep active + prev/next only
      // Collection carousels (many unique items like news cards): keep ALL
      if (totalSlides > 20 && !isActive && !isPrevNext) {
        // Large carousel (likely hero with duplicate slides) — skip inactive
        return null;
      }
      // For smaller carousels (< 20 slides), keep everything — these are collections
      // Mark inactive slides so generation knows which are visible
      if (!isActive && !isPrevNext) {
        // Will be marked as slideState: 'inactive' below
      }
    }

    const tag = el.tagName?.toLowerCase();
    if (!tag) return null;
    if (['script', 'style', 'noscript', 'link', 'meta'].includes(tag)) return null;

    const s = getStyles(el, tag);
    const node = { tag, s };

    // Preserve original CSS classes for framework-aware generation
    const cls = el.className?.toString()?.trim();
    if (cls && cls.length > 0 && cls.length < 500) {
      node.cls = cls;
    }

    // ── Bounding box geometry (Research Paper 1) ─────────────────
    // Capture exact rendered position/size, normalized for devicePixelRatio
    node.box = {
      x: Math.round(rect.x / DPR),
      y: Math.round(rect.y / DPR),
      w: Math.round(rect.width / DPR),
      h: Math.round(rect.height / DPR)
    };

    // Mark Swiper slide state (active/inactive) for collection components
    if (isSwiper) {
      const isActive = el.classList.contains('swiper-slide-active') || el.classList.contains('swiper-slide-visible');
      node.slideState = isActive ? 'active' : 'inactive';
    }

    // Flag hidden interactive content (tabs, accordion panels, carousel slides)
    if (isInteractiveContent && (rect.height < 1 || rect.width < 1 || s.display === 'none' || s.opacity === '0')) {
      node.hidden = true;
    }

    // Content by tag type
    if (tag === 'img') {
      node.src = el.src;
      node.alt = el.alt || '';
    } else if (tag === 'svg') {
      node.svg = el.outerHTML.substring(0, 2000);
      return node; // don't recurse into SVG internals
    } else if (tag === 'a') {
      node.href = el.href;
    } else if (tag === 'video') {
      const source = el.querySelector('source');
      node.vsrc = source?.src || el.src || '';
      node.poster = el.poster || '';
      node.autoplay = el.autoplay;
      node.muted = el.muted;
      node.loop = el.loop;
    } else if (tag === 'input' || tag === 'textarea') {
      node.type = el.type;
      node.placeholder = el.placeholder || '';
      node.name = el.name || '';
      node.required = el.required;
    } else if (tag === 'select') {
      node.name = el.name || '';
      node.required = el.required;
    } else if (tag === 'button') {
      node.type = el.type;
    } else if (tag === 'iframe') {
      node.src = el.src;
      return node; // don't recurse into iframes
    }

    // data-aos (animation attribute)
    const aos = el.getAttribute('data-aos');
    if (aos) node.aos = aos;

    // Direct text content (not from children)
    const directText = [...el.childNodes]
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim())
      .filter(t => t.length > 0)
      .join(' ');
    if (directText) node.t = directText.substring(0, 500);

    // Recurse into children
    const kids = [...el.children]
      .map(child => walk(child, depth + 1))
      .filter(Boolean);

    // ── Shadow DOM piercing (Research Paper 1) ───────────────────
    // Web Components encapsulate their DOM in shadowRoot — pierce it
    if (el.shadowRoot) {
      const shadowKids = [...el.shadowRoot.children]
        .map(child => walk(child, depth + 1))
        .filter(Boolean);
      if (shadowKids.length > 0) {
        kids.push(...shadowKids);
      }
    }

    if (kids.length > 0) node.c = kids;

    // ── Pseudo-element capture (Research Paper 1) ────────────────
    // ::before/::after generate visual content that doesn't exist in DOM
    const pseudos = getPseudoElements(el);
    if (pseudos) node.pseudos = pseudos;

    // Transfer flags from DOM element to node
    if (el._megaMenu) node._megaMenu = true;
    if (el._headerMeta) node._headerMeta = el._headerMeta;
    if (el._footerMeta) node._footerMeta = el._footerMeta;

    return node;
  };

  // ── Find section-level components ─────────────────────────────────
  // Strategy: use body's direct children as component boundaries.
  // Many sites (e.g. ADNOC) wrap sections in <div class="placeholder"> wrappers
  // with the actual component being a child <div class="widget"> or <section>.
  // Relying only on <section> tags misses div-based components.

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR', 'HR']);
  const MIN_HEIGHT = 10;
  // Wrapper detection: class names that indicate a layout/structural wrapper, not a semantic component
  const WRAP_PATTERNS = [
    'placeholder', 'container', 'wrapper', 'outer', 'inner', 'content', 'main',
    'white-bg', 'grey-bg', 'light-grey', 'dark-bg', 'bg-white', 'bg-grey', 'bg-light', 'bg-dark',
    'page-content', 'site-content', 'body-content', 'row', 'col-'
  ];
  // Tailwind/CSS utility classes that are structural, NOT semantic component names
  const UTILITY_CLASSES = new Set([
    'relative', 'absolute', 'fixed', 'sticky', 'static',
    'flex', 'grid', 'block', 'inline', 'inline-flex', 'inline-block', 'inline-grid', 'contents',
    'hidden', 'visible', 'invisible', 'collapse',
    'overflow-hidden', 'overflow-x-hidden', 'overflow-y-hidden', 'overflow-auto', 'overflow-scroll',
    'items-center', 'items-start', 'items-end', 'items-stretch', 'items-baseline',
    'justify-center', 'justify-start', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly',
    'isolate', 'antialiased', 'subpixel-antialiased',
    'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50',
    'w-full', 'h-full', 'min-h-screen', 'min-w-full',
    'mx-auto', 'my-auto',
    'flex-col', 'flex-row', 'flex-wrap', 'flex-nowrap',
    'gap-0', 'space-x-0', 'space-y-0',
    'text-left', 'text-center', 'text-right',
    'font-sans', 'font-serif', 'font-mono',
    'transition', 'transition-all', 'duration-300', 'ease-in-out',
    'cursor-pointer', 'select-none', 'pointer-events-none',
    'sr-only', 'not-sr-only',
    'group', 'peer'
  ]);
  const isWrapperClass = (cls) => {
    if (!cls || cls.length < 2) return true;
    // Exact Tailwind utility match
    if (UTILITY_CLASSES.has(cls)) return true;
    // Pure CSS utility classes (padding, margin, background modifiers, layout, sizing, positioning)
    if (/^(p[btlrxy]?-|m[btlrxy]?-|bg-|text-|d-|col-|row|offset-|order-|align-|justify-|gap-|space-|overflow-|z-|w-|h-|min-|max-|inset-|top-|left-|right-|bottom-|border-|rounded-|shadow-|opacity-|scale-|translate-|rotate-|skew-|origin-|ring-|outline-|decoration-|underline-|placeholder-|from-|to-|via-)/.test(cls)) return true;
    if (/^(sm-|md-|lg-|xl-|xxl-|sm:|md:|lg:|xl:|2xl:)/.test(cls)) return true;
    if (WRAP_PATTERNS.some(p => cls.startsWith(p))) return true;
    // AOS classes
    if (cls.startsWith('aos-')) return true;
    // Tailwind arbitrary values like w-[100px], bg-[#fff], etc.
    if (/^[a-z]+-\[/.test(cls)) return true;
    return false;
  };

  // Step 1: Gather body's direct visible children (the page's top-level blocks)
  const main = document.querySelector('main') || document.body;
  const topChildren = [...main.children].filter(el => {
    const r = el.getBoundingClientRect();
    return r.height > MIN_HEIGHT && !SKIP_TAGS.has(el.tagName);
  });

  // Step 2: For each top child, decide if it's the component itself or a wrapper.
  // A wrapper is a div with no meaningful class that wraps content.
  // We unwrap recursively, and if we find a div with MULTIPLE significant children,
  // we split them into separate components (not keep as one blob).
  let sectionEls = [];
  for (const el of topChildren) {
    const resolved = unwrapToComponents(el);
    sectionEls.push(...resolved);
  }

  function isWrapperDiv(el) {
    const tag = el.tagName?.toLowerCase();
    if (tag !== 'div') return false;
    const cls = (el.className || '').toString().trim();
    const allClasses = cls.split(/\s+/).filter(c => c && c.length > 1);
    return allClasses.length === 0 || allClasses.every(c => isWrapperClass(c));
  }

  function unwrapToComponents(el, depth = 0) {
    if (depth > 8) return [el];

    // First try single-child unwrapping
    const single = unwrapToComponent(el, depth);
    const resolved = single || el;

    // Check if resolved element is still a wrapper with multiple children — split it
    if (isWrapperDiv(resolved)) {
      const kids = [...resolved.children].filter(ch => {
        const r = ch.getBoundingClientRect();
        return r.height > MIN_HEIGHT && !SKIP_TAGS.has(ch.tagName);
      });
      if (kids.length > 1) {
        const results = [];
        for (const kid of kids) {
          results.push(...unwrapToComponents(kid, depth + 1));
        }
        return results;
      }
      // Single child wrapper — keep unwrapping
      if (kids.length === 1) {
        return unwrapToComponents(kids[0], depth + 1);
      }
    }

    return [resolved];
  }

  function unwrapToComponent(el, depth = 0) {
    if (depth > 3) return el; // Stop unwrapping after 3 levels
    const tag = el.tagName.toLowerCase();
    const cls = (el.className || '').toString();

    // Semantic tags are always components
    if (['section', 'header', 'footer', 'nav', 'article', 'aside', 'main'].includes(tag)) {
      return el;
    }

    // Divs with meaningful class names (widget, banner, card, etc.) are components
    const classes = cls.split(/\s+/).filter(c => c && c.length > 2);
    const hasSemanticClass = classes.some(c => !isWrapperClass(c));
    // If ALL classes are wrapper-like, keep unwrapping. Otherwise it's a component.
    if (hasSemanticClass && tag === 'div') {
      return el;
    }

    // Plain wrapper div — look inside for the real component
    const significantChildren = [...el.children].filter(ch => {
      const r = ch.getBoundingClientRect();
      return r.height > MIN_HEIGHT && !SKIP_TAGS.has(ch.tagName);
    });

    // If wrapper has exactly 1 significant child, unwrap it
    if (significantChildren.length === 1) {
      return unwrapToComponent(significantChildren[0], depth + 1);
    }

    // Multiple children or no clear wrapper — use this element as the component
    return el;
  }

  // Step 3: Ensure header is first and footer is last (regardless of DOM order)
  const headerEl = sectionEls.find(el => el.tagName.toLowerCase() === 'header');
  const footerEl = sectionEls.find(el => el.tagName.toLowerCase() === 'footer');
  sectionEls = sectionEls.filter(el => el.tagName.toLowerCase() !== 'header' && el.tagName.toLowerCase() !== 'footer');
  if (headerEl) sectionEls.unshift(headerEl);
  if (footerEl) sectionEls.push(footerEl);

  // Also check for <header> nested inside body > div (common pattern)
  if (!headerEl) {
    const nestedHeader = document.querySelector('header');
    if (nestedHeader && nestedHeader.getBoundingClientRect().height > 0) {
      sectionEls.unshift(nestedHeader);
    }
  }

  // Step 4: Force-split oversized components
  // If a component's DOM subtree is too large (>4000 estimated tokens),
  // split it at direct children boundaries so each piece is manageable.
  const MAX_COMPONENT_CHARS = 16000; // ~4000 tokens at 4 chars/token
  const finalSections = [];
  for (const el of sectionEls) {
    // Quick size estimate: count descendant elements
    const descendantCount = el.querySelectorAll('*').length;
    const estimatedChars = descendantCount * 80; // ~80 chars per element average
    if (estimatedChars > MAX_COMPONENT_CHARS) {
      // Try splitting at direct children
      const kids = [...el.children].filter(ch => {
        const r = ch.getBoundingClientRect();
        return r.height > 80 && !SKIP_TAGS.has(ch.tagName);
      });
      if (kids.length >= 2) {
        // Split into separate components
        for (const kid of kids) {
          finalSections.push(kid);
        }
        continue;
      }
      // Single large child — try one level deeper
      if (kids.length === 1) {
        const grandkids = [...kids[0].children].filter(ch => {
          const r = ch.getBoundingClientRect();
          return r.height > 80 && !SKIP_TAGS.has(ch.tagName);
        });
        if (grandkids.length >= 2) {
          for (const gk of grandkids) {
            finalSections.push(gk);
          }
          continue;
        }
      }
    }
    finalSections.push(el);
  }
  sectionEls = finalSections;

  // ── Alignment classification ─────────────────────────────────────
  // Detects whether each component is full-bleed, contained, or
  // full-bleed with contained inner content. This drives generation
  // of correct w-full / max-w-[Xpx] mx-auto patterns.
  const vpWidth = window.innerWidth;
  const ALIGN_TOLERANCE = 10; // px

  const classifyAlignment = (el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const elWidth = rect.width / DPR;

    const isFullWidth = elWidth >= vpWidth - ALIGN_TOLERANCE;

    // Check max-width on this element
    const maxW = cs.maxWidth;
    const hasMaxWidth = maxW !== 'none' && parseFloat(maxW) < vpWidth - ALIGN_TOLERANCE;

    // Check margin-auto centering
    const ml = cs.marginLeft;
    const mr = cs.marginRight;
    const isCentered = ml === 'auto' || mr === 'auto'
      || (parseFloat(ml) > 20 && Math.abs(parseFloat(ml) - parseFloat(mr)) < 5);

    // Check first meaningful children for inner container patterns
    let innerContained = false;
    let innerMaxWidth = null;
    let innerPadding = null;

    const directChildren = [...el.children].filter(ch => {
      const cr = ch.getBoundingClientRect();
      return cr.height > 10 && !['SCRIPT','STYLE','LINK','META','NOSCRIPT'].includes(ch.tagName);
    });

    for (const child of directChildren) {
      const ccs = getComputedStyle(child);
      const cRect = child.getBoundingClientRect();
      const childW = cRect.width / DPR;
      const cMaxW = ccs.maxWidth;
      const cML = ccs.marginLeft;
      const cMR = ccs.marginRight;

      const childHasMaxWidth = cMaxW !== 'none' && parseFloat(cMaxW) < vpWidth - ALIGN_TOLERANCE;
      const childIsCentered = cML === 'auto' || cMR === 'auto'
        || (childW < vpWidth - ALIGN_TOLERANCE && parseFloat(cML) > 20
            && Math.abs(parseFloat(cML) - parseFloat(cMR)) < 5);

      if (childHasMaxWidth || childIsCentered) {
        innerContained = true;
        innerMaxWidth = childHasMaxWidth ? cMaxW : Math.round(childW) + 'px';
        const pad = parseFloat(ccs.paddingLeft) || 0;
        if (pad > 0) innerPadding = Math.round(pad) + 'px';
        break;
      }
    }

    const hPad = parseFloat(cs.paddingLeft) || 0;

    // Classification
    let alignment, containerMaxWidth, contentPadding;

    if (isFullWidth && innerContained) {
      alignment = 'full-bleed-contained';
      containerMaxWidth = innerMaxWidth;
      contentPadding = innerPadding || (hPad > 0 ? Math.round(hPad) + 'px' : null);
    } else if (isFullWidth && !hasMaxWidth && !isCentered && hPad < 40) {
      alignment = 'full-bleed';
      containerMaxWidth = null;
      contentPadding = hPad > 0 ? Math.round(hPad) + 'px' : null;
    } else if (hasMaxWidth || isCentered || hPad >= 40) {
      alignment = 'contained';
      containerMaxWidth = hasMaxWidth ? maxW : Math.round(elWidth) + 'px';
      contentPadding = hPad > 0 ? Math.round(hPad) + 'px' : null;
    } else {
      alignment = 'full-bleed';
      containerMaxWidth = null;
      contentPadding = null;
    }

    return { alignment, containerMaxWidth, contentPadding };
  };

  // ── Component type classification ──────────────────────────────────
  // Identifies WHAT each component is (header, hero, card-grid, stats, footer, etc.)
  // Uses weighted scoring from 5 signal layers.
  const classifyComponentType = (el, index, totalCount) => {
    const tag = el.tagName.toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();
    const rect = el.getBoundingClientRect();
    const vpH = window.innerHeight;
    const vpW = window.innerWidth;
    const scores = {};

    // === Signal 1: Semantic tags (weight: 100) ===
    if (tag === 'header') scores.header = (scores.header || 0) + 100;
    if (tag === 'footer') scores.footer = (scores.footer || 0) + 100;
    if (tag === 'nav') scores.header = (scores.header || 0) + 60;
    if (tag === 'form') scores.form = (scores.form || 0) + 80;
    if (tag === 'table') scores.table = (scores.table || 0) + 90;
    if (tag === 'aside') scores.sidebar = (scores.sidebar || 0) + 70;

    // === Signal 2: Page position (weight: 30-60) ===
    const isNearTop = index <= 1;
    const isLast = index === totalCount - 1;
    const isTall = rect.height > vpH * 0.5;
    if (isNearTop && isTall) scores.hero = (scores.hero || 0) + 50;
    if (isLast) scores.footer = (scores.footer || 0) + 30;

    // === Signal 3: Class name hints (weight: 40) ===
    const classPatterns = {
      header: /header|navbar|site-header|topbar|navigation|desktop__navigation/,
      hero: /hero|banner|jumbotron|masthead|splash|page-cover|homepage/,
      'feature-grid': /feature|service|benefit|icon-grid|icon-block/,
      'split-content': /split|two-col|side-by-side|image-text|img-desc|cta-img/,
      stats: /stat|counter|number|figure|metric|ticker|infographic/,
      'logo-cloud': /logo|partner|client|trust|brand|shareholder/,
      'cta-banner': /cta|call-to-action|subscribe|newsletter|two-column-text/,
      'card-grid': /card|tile|news-card|article|props-columns/,
      testimonials: /testimonial|review|quote|feedback/,
      pricing: /pricing|plan|package|tier/,
      form: /form|contact|signup|register|login/,
      tabs: /tab|tabbed/,
      accordion: /accordion|faq|collapse|expandable/,
      carousel: /carousel|slider|swiper|slick|marquee/,
      footer: /footer|site-footer|page-footer/,
      sidebar: /sidebar|social-link|socialmedia|social-media|side-nav|aside-nav/,
      timeline: /timeline|history|milestone|stepper|progress/,
      breadcrumb: /breadcrumb/,
      gallery: /gallery|portfolio|showcase|lightbox/,
      'video-section': /video|media-player/,
      'content-section': /our-story|about|overview|description/
    };
    for (const [type, pattern] of Object.entries(classPatterns)) {
      if (pattern.test(cls)) scores[type] = (scores[type] || 0) + 40;
    }

    // === Signal 4: Content analysis (weight: 50-70) ===
    const hasH1 = el.querySelector('h1') !== null;
    const hasH2 = el.querySelector('h2') !== null;
    const formEl = el.querySelector('form');
    const inputs = el.querySelectorAll('input, textarea, select');
    const videos = el.querySelectorAll('video, [class*="video"]');
    const imgs = el.querySelectorAll('img');
    const tables = el.querySelectorAll('table');
    const swiper = el.querySelector('.swiper, .swiper-container, .slick-slider, [class*="carousel"]');
    const tablist = el.querySelector('[role="tablist"], [class*="tab-nav"], [class*="tab-list"]');
    const accordion = el.querySelector('[class*="accordion"], details, [aria-expanded]');
    const links = el.querySelectorAll('a');
    const buttons = el.querySelectorAll('button, [role="button"], a[class*="btn"], a[class*="cta"]');

    // Hero: first section with H1, tall, likely has background
    if (hasH1 && isNearTop) scores.hero = (scores.hero || 0) + 60;
    if (isTall && isNearTop && !tag.match(/header|footer|nav/)) scores.hero = (scores.hero || 0) + 30;

    // Form
    if (formEl || inputs.length >= 2) scores.form = (scores.form || 0) + 60;

    // Video section
    if (videos.length > 0) scores['video-section'] = (scores['video-section'] || 0) + 50;

    // Table
    if (tables.length > 0) scores.table = (scores.table || 0) + 70;

    // Carousel/Swiper
    if (swiper) scores.carousel = (scores.carousel || 0) + 60;

    // Tabs
    if (tablist) scores.tabs = (scores.tabs || 0) + 70;

    // Accordion
    if (accordion) scores.accordion = (scores.accordion || 0) + 60;

    // === Signal 5: Structural patterns (weight: 50) ===
    // Stats: multiple large numbers
    const directChildren = [...el.children].filter(ch => ch.getBoundingClientRect().height > 10);
    let largeNumberCount = 0;
    let repeatedStructureCount = 0;
    const childSignatures = [];

    for (const child of directChildren) {
      // Check for large numbers (stats pattern)
      const text = (child.textContent || '').trim();
      if (/^\d[\d,.\s]*[+%KMB]?$/.test(text) && text.length < 20) {
        const fontSize = parseFloat(getComputedStyle(child).fontSize);
        if (fontSize >= 28) largeNumberCount++;
      }
      // Build structural signature for repeated pattern detection
      const sig = child.tagName + ':' + child.children.length;
      childSignatures.push(sig);
    }

    // Count most common child signature
    const sigCounts = {};
    childSignatures.forEach(s => { sigCounts[s] = (sigCounts[s] || 0) + 1; });
    repeatedStructureCount = Math.max(0, ...Object.values(sigCounts));

    if (largeNumberCount >= 3) scores.stats = (scores.stats || 0) + 70;
    if (repeatedStructureCount >= 3) scores['card-grid'] = (scores['card-grid'] || 0) + 50;

    // Logo cloud: multiple small images with uniform size
    if (imgs.length >= 4) {
      const imgHeights = [...imgs].slice(0, 8).map(img => img.getBoundingClientRect().height);
      const avgH = imgHeights.reduce((a, b) => a + b, 0) / imgHeights.length;
      const allSmall = imgHeights.every(h => h < 100 && h > 10);
      const uniformSize = imgHeights.every(h => Math.abs(h - avgH) < 15);
      if (allSmall && uniformSize) scores['logo-cloud'] = (scores['logo-cloud'] || 0) + 50;
    }

    // CTA banner: short section with heading + buttons, no long content
    if (hasH2 && buttons.length >= 1 && rect.height < vpH * 0.4 && directChildren.length <= 5) {
      scores['cta-banner'] = (scores['cta-banner'] || 0) + 30;
    }

    // Split content: 2 children, one is image-heavy, other is text-heavy
    if (directChildren.length === 2) {
      const ch0Imgs = directChildren[0].querySelectorAll('img').length;
      const ch1Imgs = directChildren[1].querySelectorAll('img').length;
      const ch0Text = (directChildren[0].textContent || '').trim().length;
      const ch1Text = (directChildren[1].textContent || '').trim().length;
      if ((ch0Imgs > 0 && ch1Text > 100 && ch1Imgs === 0) || (ch1Imgs > 0 && ch0Text > 100 && ch0Imgs === 0)) {
        scores['split-content'] = (scores['split-content'] || 0) + 50;
      }
    }

    // Footer: many links, near bottom
    if (links.length > 10 && isLast) scores.footer = (scores.footer || 0) + 40;

    // Sidebar: fixed/absolute positioned narrow element with social links
    const elPosition = getComputedStyle(el).position;
    const isFixed = elPosition === 'fixed' || elPosition === 'absolute';
    const isNarrow = rect.width < 100;
    if (isFixed && isNarrow) scores.sidebar = (scores.sidebar || 0) + 60;
    if (links.length >= 3 && links.length <= 8 && isNarrow) scores.sidebar = (scores.sidebar || 0) + 40;

    // === Pick winner ===
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0 || sorted[0][1] < 20) {
      return { type: 'content-section', variant: null, confidence: 0 };
    }

    const winnerType = sorted[0][0];
    const confidence = Math.min(sorted[0][1], 100);

    // === Variant detection ===
    let variant = null;
    if (winnerType === 'hero') {
      if (videos.length > 0) variant = 'hero-video';
      else if (rect.height >= vpH * 0.85) variant = 'hero-fullscreen';
      else if (swiper) variant = 'hero-carousel';
      else if (directChildren.length === 2) variant = 'hero-split';
      else variant = 'hero-centered';
    } else if (winnerType === 'card-grid') {
      const firstImg = el.querySelector('.card img, [class*="card"] img');
      if (firstImg) {
        const imgRect = firstImg.getBoundingClientRect();
        const parentRect = firstImg.closest('[class*="card"]')?.getBoundingClientRect();
        if (parentRect && imgRect.y <= parentRect.y + 10) variant = 'card-vertical';
        else variant = 'card-horizontal';
      } else {
        variant = 'card-text-only';
      }
    } else if (winnerType === 'split-content') {
      if (directChildren.length >= 2) {
        const firstChildImgs = directChildren[0].querySelectorAll('img').length;
        variant = firstChildImgs > 0 ? 'image-left' : 'image-right';
      }
    } else if (winnerType === 'header') {
      // Detect header variants: sticky/static, transparent/opaque, with-mega-menu
      const hcs = getComputedStyle(el);
      const bgColor = hcs.backgroundColor;
      const isTransparent = bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)';
      const isSticky = hcs.position === 'fixed' || hcs.position === 'sticky';
      const hasMega = el.querySelectorAll('nav ul ul, nav li > div, [class*="mega"], [class*="sub-menu"]').length > 0;
      const hasLangToggle = !!(el.querySelector('[href*="/ar/"], [href*="/en/"]'));
      const hasCta = el.querySelectorAll('a[class*="btn"], a[class*="cta"], button[class*="btn"]').length > 0;

      if (isSticky && isTransparent) variant = hasMega ? 'sticky-transparent-mega' : 'sticky-transparent';
      else if (isSticky) variant = hasMega ? 'sticky-opaque-mega' : 'sticky-opaque';
      else variant = 'static';

      // Store metadata on DOM element — transferred to node later
      el._headerMeta = {
        variant,
        isSticky,
        isTransparent,
        backgroundColor: bgColor,
        hasMegaMenu: hasMega,
        hasLanguageToggle: hasLangToggle,
        hasCTA: hasCta,
        height: Math.round(rect.height),
        zIndex: hcs.zIndex,
      };
    } else if (winnerType === 'footer') {
      // Detect footer variants: multi-column, minimal, with-newsletter
      const fcs = getComputedStyle(el);
      const columns = el.querySelectorAll('[class*="col"], nav, ul').length;
      const hasNewsletter = !!(el.querySelector('form, input[type="email"]'));
      const hasSocial = el.querySelectorAll('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"], a[href*="instagram"], [class*="social"]').length > 0;

      if (columns > 6) variant = 'multi-column';
      else if (columns <= 2 && !hasNewsletter) variant = 'minimal';
      else variant = 'standard';

      el._footerMeta = {
        variant,
        columnCount: columns,
        hasNewsletter,
        hasSocialLinks: hasSocial,
        height: Math.round(rect.height),
        backgroundColor: fcs.backgroundColor,
      };
    }

    return { type: winnerType, variant, confidence };
  };

  const components = sectionEls.map((section, idx) => {
    const tree = walk(section, 0);
    if (tree) {
      tree.componentName = getComponentName(section);
      // Attach alignment metadata
      const alignInfo = classifyAlignment(section);
      tree.alignment = alignInfo.alignment;
      if (alignInfo.containerMaxWidth) tree.containerMaxWidth = alignInfo.containerMaxWidth;
      if (alignInfo.contentPadding) tree.contentPadding = alignInfo.contentPadding;
      // Attach component type classification
      const typeInfo = classifyComponentType(section, idx, sectionEls.length);
      tree.componentType = typeInfo.type;
      if (typeInfo.variant) tree.componentVariant = typeInfo.variant;
      tree.typeConfidence = typeInfo.confidence;
      // Transfer header/footer variant metadata from DOM element
      if (section._headerMeta) tree._headerMeta = section._headerMeta;
      if (section._footerMeta) tree._footerMeta = section._footerMeta;
    }
    return tree;
  }).filter(Boolean);

  // ── Page metadata + SEO ─────────────────────────────────────────────
  const getMeta = (name) => {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el?.content || el?.getAttribute('content') || null;
  };
  const getLink = (rel) => {
    const el = document.querySelector(`link[rel="${rel}"]`);
    return el?.href || null;
  };

  const meta = {
    url: window.location.href,
    title: document.title,
    lang: document.documentElement.lang || 'en',
    dir: document.documentElement.dir || 'ltr',
    pageHeight: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    dpr: DPR,
    componentCount: components.length,
    componentNames: components.map(c => c.componentName),
    componentTypes: components.map(c => `${c.componentName}[${c.componentType}${c.componentVariant ? ':' + c.componentVariant : ''}]`),

    // ── SEO metadata ──
    seo: {
      description: getMeta('description'),
      keywords: getMeta('keywords'),
      robots: getMeta('robots'),
      canonical: getLink('canonical'),
      // Open Graph
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      ogUrl: getMeta('og:url'),
      ogType: getMeta('og:type'),
      ogSiteName: getMeta('og:site_name'),
      // Twitter Card
      twitterCard: getMeta('twitter:card'),
      twitterTitle: getMeta('twitter:title'),
      twitterDescription: getMeta('twitter:description'),
      twitterImage: getMeta('twitter:image'),
      twitterSite: getMeta('twitter:site'),
      // Theme
      themeColor: getMeta('theme-color'),
      viewport: getMeta('viewport'),
    },

    // ── Favicon + icons ──
    favicon: getLink('icon') || getLink('shortcut icon'),
    appleTouchIcon: getLink('apple-touch-icon'),
    manifest: getLink('manifest'),

    // ── Multilingual (hreflang) ──
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(el => ({
      lang: el.hreflang,
      href: el.href,
    })),

    // ── Structured data (JSON-LD) ──
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => {
      try { return JSON.parse(el.textContent); } catch { return null; }
    }).filter(Boolean),
  };

  // ── Cleanup: remove injected stylesheets ────────────────────────
  killSheet.remove();
  pixelSnap.remove();

  return JSON.stringify({ meta, components });
})();
