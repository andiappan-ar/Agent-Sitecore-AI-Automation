/**
 * examine-site.js — Dynamic site examination
 *
 * Runs in Puppeteer context on a site to detect:
 * - Libraries/frameworks (Swiper, AOS, Bootstrap, Material Icons, Font Awesome, jQuery)
 * - Navigation patterns (sticky, mega-menu, hamburger)
 * - Interactive patterns (carousels, tabs, accordions)
 * - Hidden element patterns (offscreen menus, opacity:0 dropdowns)
 * - Icon systems, layout frameworks
 *
 * Outputs a site-profile.json that informs extraction cleaning + generation rules.
 *
 * Usage (in orchestrate.js or standalone):
 *   puppeteer_navigate(url)
 *   const profile = puppeteer_evaluate(<this script>)
 *   save to output/{domain}/extracted/site-profile.json
 */

(() => {
  const profile = {
    libraries: {},
    navigation: {},
    interactivePatterns: [],
    hiddenElements: { count: 0, patterns: [] },
    iconSystem: null,
    carouselSystem: null,
    layoutFramework: null,
    cleaningRules: [],
    generationHints: []
  };

  // ── LIBRARY DETECTION ──
  if (window.Swiper || document.querySelector('.swiper-container, .swiper')) profile.libraries.swiper = true;
  if (window.AOS || document.querySelector('[data-aos]')) profile.libraries.aos = true;
  if (window.jQuery || window.$) profile.libraries.jquery = true;
  if (document.querySelector('.container-fluid, .col-md-6, .col-lg-4')) profile.libraries.bootstrap = true;
  if (document.querySelector('link[href*="material-icons"], link[href*="material"], .material-icons')) profile.libraries.materialIcons = true;
  if (document.querySelector('link[href*="font-awesome"], i.fa, i.fas, i.fab, .fa-brands')) profile.libraries.fontAwesome = true;

  // ── SOURCE FRAMEWORK DETECTION ──
  const hasTailwind = (() => {
    const twClasses = document.querySelectorAll('[class*="flex-"], [class*="grid-cols-"], [class*="text-["], [class*="bg-["], [class*="px-["], [class*="py-["]');
    if (twClasses.length > 10) return true;
    try {
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText?.includes('\\:') || rule.selectorText?.includes('hover\\:')) return true;
        }
      }
    } catch(e) {}
    const links = [...document.querySelectorAll('link[href], script[src]')];
    return links.some(l => (l.href || l.src || '').includes('tailwind'));
  })();

  if (hasTailwind) profile.sourceFramework = 'tailwind';
  else if (profile.libraries.bootstrap) profile.sourceFramework = 'bootstrap';
  else profile.sourceFramework = 'vanilla';

  // ── ICON SYSTEM ──
  const matIcons = document.querySelectorAll('.material-icons, .material-icons-outlined, [class*="material-symbols"]');
  const faIcons = document.querySelectorAll('.fa, .fas, .fab, .far, .fal, .fa-brands, .fa-solid');
  if (matIcons.length > 0) {
    const samples = [...matIcons].slice(0, 10).map(e => e.textContent.trim()).filter(Boolean);
    profile.iconSystem = { type: 'material-icons', count: matIcons.length, samples };
    profile.generationHints.push('Icons use Material Icons font — render as <span class="material-icons">icon_name</span>, NOT as literal text');
  }
  if (faIcons.length > 0) {
    const samples = [...faIcons].slice(0, 10).map(e => e.className);
    profile.iconSystem = profile.iconSystem || { type: 'font-awesome', count: faIcons.length, samples };
    profile.generationHints.push('Icons use Font Awesome — render as <i class="fa fa-icon-name"></i>');
  }

  // ── CAROUSEL DETECTION ──
  const swiperContainers = document.querySelectorAll('.swiper-container, .swiper');
  if (swiperContainers.length > 0) {
    const totalSlides = document.querySelectorAll('.swiper-slide').length;
    const activeSlides = document.querySelectorAll('.swiper-slide-active, .swiper-slide-visible').length;
    profile.carouselSystem = { type: 'swiper', containers: swiperContainers.length, totalSlides, activeSlides };
    profile.cleaningRules.push('CAROUSEL: Only keep the active/visible slide(s). Remove duplicate slides with translateX transforms.');
    profile.generationHints.push(`Site uses Swiper.js carousels (${swiperContainers.length} instances, ${totalSlides} total slides). Generate only 1 visible slide per carousel. Do NOT render all slides stacked.`);
  }

  // ── NAVIGATION PATTERN ──
  const header = document.querySelector('header');
  if (header) {
    const rect = header.getBoundingClientRect();
    const cs = getComputedStyle(header);
    const isSticky = cs.position === 'fixed' || cs.position === 'sticky';
    const megaMenus = header.querySelectorAll('nav ul ul, nav li > div, [class*="mega"], [class*="sub-menu"]');
    const hamburger = header.querySelector('[class*="hamburger"], [class*="burger"], [class*="menu-toggle"], button[aria-label*="menu"]');

    profile.navigation = {
      sticky: isSticky,
      position: cs.position,
      height: Math.round(rect.height),
      hasMegaMenu: megaMenus.length > 0,
      megaMenuCount: megaMenus.length,
      hasHamburger: !!hamburger
    };

    if (megaMenus.length > 0) {
      // Capture mega-menu structure by hovering each top-level nav item
      // The dropdown DOM is hidden (opacity:0) by default but present in the page
      profile.generationHints.push(`Header has ${megaMenus.length} mega-menu dropdowns. MUST generate full mega-menu with sub-navigation. Use hover (onMouseEnter/onMouseLeave for React, @mouseenter/@mouseleave for Alpine) to show dropdowns. Reconstruct sub-nav from sitemap URL paths if extraction doesn't capture hidden dropdown content.`);
    }
    if (hamburger) {
      profile.cleaningRules.push('MOBILE-NAV: Remove offscreen mobile navigation panel (left:-375px or similar). It is the hidden hamburger menu.');
      profile.generationHints.push('Header has a hamburger menu for mobile. On mobile, show hamburger icon + logo only. On desktop (lg:), show full horizontal nav bar.');
    }
  }

  // ── HIDDEN/OFFSCREEN ELEMENTS ──
  let hiddenCount = 0;
  const hiddenPatterns = new Set();
  const allEls = document.querySelectorAll('header *, nav *, section *, footer *');
  allEls.forEach(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (cs.opacity === '0' && rect.height > 50) { hiddenCount++; hiddenPatterns.add('opacity-0-large'); }
    if (rect.left + rect.width < -10 && rect.width > 100) { hiddenCount++; hiddenPatterns.add('offscreen-left'); }
    if (cs.visibility === 'hidden' && rect.height > 50) { hiddenCount++; hiddenPatterns.add('visibility-hidden'); }
    if (parseInt(cs.maxHeight) === 0 && rect.height === 0) { hiddenCount++; hiddenPatterns.add('max-height-0'); }
  });
  profile.hiddenElements = { count: hiddenCount, patterns: [...hiddenPatterns] };
  if (hiddenCount > 50) {
    profile.cleaningRules.push(`HIDDEN-ELEMENTS: Site has ${hiddenCount} hidden elements. Skip elements with: opacity:0, visibility:hidden, offscreen positioning (left < -100px), max-height:0.`);
  }

  // ── TAB/ACCORDION DETECTION ──
  const tabPanels = document.querySelectorAll('[role="tabpanel"], .tab-pane, [class*="tab-content"]');
  const accordions = document.querySelectorAll('[class*="accordion"], details, [class*="collapse"]:not(.navbar-collapse)');
  if (tabPanels.length > 0) {
    profile.interactivePatterns.push({ type: 'tabs', count: tabPanels.length });
    profile.generationHints.push(`Site has ${tabPanels.length} tab panels. Show only the active tab content, render tab buttons as a horizontal row.`);
  }
  if (accordions.length > 0) {
    profile.interactivePatterns.push({ type: 'accordion', count: accordions.length });
    profile.generationHints.push('Site has accordions. Show first item expanded, rest collapsed.');
  }

  // ── LAYOUT FRAMEWORK ──
  const bsGrid = document.querySelectorAll('.col-md-6, .col-lg-4, .col-lg-3, .row, .col-12, .col-sm-6');
  if (bsGrid.length > 10) {
    profile.layoutFramework = 'bootstrap-grid';
    profile.generationHints.push('Site uses Bootstrap grid (row/col-*). Convert to Tailwind flex/grid equivalents, NOT literal col-md-6 translations.');
  }

  // ── CONTAINER/MAX-WIDTH PATTERN DETECTION ──
  const containerWidths = [];
  document.querySelectorAll('section > div, main > div > div, [class*="container"], [class*="wrapper"]').forEach(el => {
    const cs = getComputedStyle(el);
    const maxW = cs.maxWidth;
    if (maxW !== 'none') {
      const px = parseFloat(maxW);
      if (px > 600 && px < 2000) containerWidths.push(px);
    }
  });
  if (containerWidths.length > 0) {
    const rounded = containerWidths.map(v => Math.round(v / 10) * 10);
    const counts = {};
    rounded.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    profile.commonContainerWidth = sorted[0][0] + 'px';
    profile.generationHints.push(
      `Site uses a common container max-width of ${sorted[0][0]}px — use max-w-[${sorted[0][0]}px] mx-auto for contained sections.`
    );
  }

  // ── AOS ANIMATIONS ──
  if (profile.libraries.aos) {
    profile.cleaningRules.push('AOS: Force all [data-aos] elements to final visible state before extraction.');
    profile.generationHints.push('Site uses AOS scroll animations. Ignore AOS-related classes/attributes in generation.');
  }

  // ── GLOBAL GENERATION HINTS ──
  profile.generationHints.push(
    'Generate SEMANTIC HTML — understand what the component IS (nav bar, hero carousel, card grid, footer) and build it properly.',
    'Do NOT translate every extracted CSS property literally. Use the extracted styles as REFERENCE for colors, fonts, spacing — but build proper responsive layouts.',
    'Skip: cursor, transition, animation, word-break, text-decoration-skip-ink, -webkit-* vendor prefixes.',
    'Skip elements with opacity:0, visibility:hidden, or positioned far offscreen (left < -100px).',
    'For flex containers with many children at the same width — it\'s likely a carousel. Show only 1-3 visible items.',
    'For elements with Material Icons text content (search, menu, arrow_forward, etc.) — these are icon font glyphs, render with proper icon markup.'
  );

  return JSON.stringify(profile, null, 2);
})();
