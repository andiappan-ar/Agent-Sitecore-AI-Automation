/**
 * extract-responsive.js
 *
 * Run in puppeteer_evaluate at EACH viewport width.
 * Captures layout-critical styles that change across breakpoints.
 *
 * Usage (from Claude Code):
 *   1. Navigate to page
 *   2. For each breakpoint width:
 *      a. Resize viewport: puppeteer_evaluate → window.innerWidth (after page resize)
 *      b. Run this script
 *      c. Save result as extracted/responsive-{width}.json
 *   3. generate-blueprint.py reads all responsive-*.json and produces @media CSS
 *
 * Captures: display, flex-direction, grid-template-columns, padding, gap, font-size,
 *           width, height, visibility, position — only values that DIFFER from 1440px baseline
 */

(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Layout-critical properties to compare across viewports
  const LAYOUT_PROPS = [
    'display', 'flexDirection', 'gridTemplateColumns', 'justifyContent', 'alignItems',
    'gap', 'padding', 'margin', 'maxWidth', 'width', 'height', 'minHeight',
    'position', 'top', 'left', 'right', 'bottom',
    'fontSize', 'lineHeight', 'textAlign',
    'visibility', 'overflow'
  ];

  const getLayoutStyles = (el) => {
    const cs = getComputedStyle(el);
    const s = {};
    LAYOUT_PROPS.forEach(p => {
      const val = cs[p];
      if (val && val !== 'normal' && val !== 'auto' && val !== 'none' && val !== 'visible'
          && val !== 'static' && val !== '0px' && val !== 'start') {
        // Convert camelCase to kebab-case
        const kebab = p.replace(/([A-Z])/g, '-$1').toLowerCase();
        s[kebab] = val;
      }
    });
    return s;
  };

  const sections = [...document.querySelectorAll('section')].filter(s => s.getBoundingClientRect().height > 0);

  const components = sections.map(section => {
    const className = section.className?.toString() || '';
    const name = className.split(' ')
      .filter(c => c && !c.includes(':') && !c.includes('[') && !c.includes('/')
        && !c.startsWith('bg-') && !c.startsWith('py-') && !c.startsWith('px-')
        && !c.startsWith('relative') && !c.startsWith('flex') && !c.startsWith('w-'))
      [0] || 'Unknown';

    const rect = section.getBoundingClientRect();

    // Section-level styles
    const sectionStyles = getLayoutStyles(section);

    // Key child elements (container, grid, flex layouts)
    const children = [];
    section.querySelectorAll('.container, [class*="grid"], [class*="flex"], h1, h2, h3, h4, img, video, button, a, p').forEach(el => {
      const elRect = el.getBoundingClientRect();
      if (elRect.height < 1 || elRect.width < 1) return;

      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim()?.substring(0, 30);

      // Only capture elements with interesting layout properties
      const styles = getLayoutStyles(el);
      if (Object.keys(styles).length === 0) return;

      children.push({
        tag,
        text: ['h1','h2','h3','h4','p','a','button'].includes(tag) ? text : undefined,
        rect: { x: Math.round(elRect.x), y: Math.round(elRect.y), w: Math.round(elRect.width), h: Math.round(elRect.height) },
        styles
      });
    });

    return {
      name,
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      styles: sectionStyles,
      children: children.slice(0, 30) // limit per component
    };
  });

  // Header visibility check (nav items visible vs hidden)
  const header = document.querySelector('section.Header');
  const headerNav = header?.querySelectorAll('h3');
  const navVisible = headerNav ? [...headerNav].filter(h => {
    const r = h.getBoundingClientRect();
    return r.height > 0 && r.width > 0 && r.x >= 0 && r.x < vw;
  }).length : 0;

  return JSON.stringify({
    viewport: { width: vw, height: vh },
    components: components,
    header_nav_visible: navVisible,
    component_names: components.map(c => c.name),
    total_components: components.length
  }, null, 2);
})();
