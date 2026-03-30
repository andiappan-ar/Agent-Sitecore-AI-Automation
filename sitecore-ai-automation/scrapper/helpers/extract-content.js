/**
 * extract-content.js — Separates content from presentation
 *
 * Takes extracted component JSON and splits into:
 *   1. Content JSON (text, images, links — CMS-editable fields)
 *   2. Page assembly JSON (component order, layout, metadata)
 *
 * This runs AFTER extraction and BEFORE generation.
 *
 * Usage:
 *   node helpers/extract-content.js <output-dir>
 *
 * Outputs:
 *   {output-dir}/content/
 *   ├── pages/
 *   │   └── en.json              ← Page assembly: component order + meta
 *   └── components/
 *       └── en/
 *           ├── 00-header.json   ← Content fields for header
 *           ├── 01-hero.json     ← Content fields for hero
 *           └── ...
 */

const path = require('path');
const fs = require('fs');

const siteDir = process.argv[2];
if (!siteDir) { console.error('Usage: node helpers/extract-content.js <output-dir>'); process.exit(1); }

const extractedDir = path.join(siteDir, 'extracted');
const contentDir = path.join(siteDir, 'content');
const pagesDir = path.join(contentDir, 'pages');
const componentsDir = path.join(contentDir, 'components');

// Create dirs
[contentDir, pagesDir, componentsDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Content extraction per component type ──────────────────
function extractContent(node, type) {
  switch (type) {
    case 'header': return extractHeader(node);
    case 'hero': return extractHero(node);
    case 'card-grid': return extractCardGrid(node);
    case 'split-content': return extractSplitContent(node);
    case 'stats': return extractStats(node);
    case 'content-section': return extractContentSection(node);
    case 'footer': return extractFooter(node);
    case 'carousel': return extractCarousel(node);
    case 'tabs': return extractTabs(node);
    case 'logo-cloud': return extractLogoCloud(node);
    case 'cta-banner': return extractCtaBanner(node);
    case 'video-section': return extractVideoSection(node);
    case 'form': return extractForm(node);
    case 'testimonials': return extractTestimonials(node);
    case 'sidebar': return extractSidebar(node);
    case 'accordion': return extractAccordion(node);
    case 'timeline': return extractTimeline(node);
    case 'breadcrumb': return extractBreadcrumb(node);
    case 'gallery': return extractGallery(node);
    case 'pricing': return extractPricing(node);
    case 'table': return extractTable(node);
    default: return extractGeneric(node);
  }
}

// ── Helpers ─────────────────────────────────────────────────
function findAll(node, predicate, maxDepth = 20, depth = 0) {
  const results = [];
  if (predicate(node)) results.push(node);
  if (node.c && depth < maxDepth) node.c.forEach(ch => results.push(...findAll(ch, predicate, maxDepth, depth + 1)));
  return results;
}

function findFirst(node, predicate, maxDepth = 20) {
  const results = findAll(node, predicate, maxDepth);
  return results[0] || null;
}

function getText(node, maxDepth = 15, depth = 0) {
  if (!node) return '';
  let text = '';
  if (node.t) text += node.t.trim();
  if (node.c && depth < maxDepth) {
    node.c.forEach(ch => {
      const childText = getText(ch, maxDepth, depth + 1);
      if (childText) text += (text ? ' ' : '') + childText;
    });
  }
  return text.trim();
}

function getDirectText(node) {
  return (node.t || '').trim();
}

function collectTexts(node, tag, maxDepth = 20) {
  return findAll(node, n => n.tag === tag && n.t, maxDepth).map(n => n.t.trim());
}

function collectImages(node, maxDepth = 20) {
  return findAll(node, n => n.src, maxDepth).map(n => ({ src: n.src, alt: n.alt || '' }));
}

function collectLinks(node, maxDepth = 20) {
  return findAll(node, n => n.href, maxDepth).map(n => ({
    href: n.href,
    text: getText(n, 3),
    type: n.tag === 'a' ? 'link' : 'other'
  }));
}

// ── Type-specific extractors ────────────────────────────────

function extractHeader(node) {
  const logo = findFirst(node, n => n.src && (n.alt?.toLowerCase().includes('logo') || n.tag === 'img'));
  const navLinks = findAll(node, n => n.tag === 'a' && n.href && getText(n, 2).length > 1 && getText(n, 2).length < 50, 15);

  // Separate utility links from main nav (utility = top bar, main = primary nav)
  const allLinks = navLinks.map(n => ({ text: getText(n, 2), href: n.href }));

  return {
    type: 'header',
    fields: {
      logo: logo ? { src: logo.src, alt: logo.alt || 'Logo' } : null,
      navigationItems: allLinks.filter(l => l.text.length > 0 && l.text.length < 30),
      ctaButton: findFirst(node, n => n.tag === 'button' || (n.cls || '').includes('btn') || (n.cls || '').includes('cta'))
        ? { text: getText(findFirst(node, n => n.tag === 'button'), 2) } : null,
      languageToggle: findFirst(node, n => getText(n, 1).match(/عربي|arabic|العربية|en|ar/i))
        ? { text: getText(findFirst(node, n => getText(n, 1).match(/عربي|arabic|العربية/i)), 1) } : null
    }
  };
}

function extractHero(node) {
  const h1 = findFirst(node, n => n.tag === 'h1');
  const h2 = findFirst(node, n => n.tag === 'h2');
  const bgImage = node.s?.['background-image'] || findFirst(node, n => n.s?.['background-image'])?.s?.['background-image'] || null;
  const images = collectImages(node, 15);
  const buttons = findAll(node, n => n.tag === 'button' || n.tag === 'a' && ((n.cls || '').includes('btn') || (n.cls || '').includes('cta')), 15);
  const video = findFirst(node, n => n.vsrc || n.tag === 'video');

  // Find description text (paragraph after heading)
  const paragraphs = findAll(node, n => n.tag === 'p' && n.t && n.t.length > 20, 15);

  return {
    type: 'hero',
    fields: {
      heading: h1 ? getText(h1, 2) : (h2 ? getText(h2, 2) : null),
      subheading: h1 && h2 ? getText(h2, 2) : null,
      description: paragraphs.length > 0 ? paragraphs[0].t.trim() : null,
      backgroundImage: bgImage ? bgImage.replace(/url\(["']?|["']?\)/g, '') : (images[0]?.src || null),
      video: video ? { src: video.vsrc || null, poster: video.poster || null, autoplay: !!video.autoplay } : null,
      cta: buttons.map(b => ({ text: getText(b, 2), href: b.href || '#' })),
      stats: findAll(node, n => n.t && /^\d[\d,.\s]*[+%KMB]?$/.test(n.t.trim()) && n.t.length < 20, 8)
        .map(n => ({ value: n.t.trim() }))
    }
  };
}

function extractCardGrid(node) {
  const sectionTitle = findFirst(node, n => ['h2', 'h3'].includes(n.tag) && n.t);
  // Find repeated card-like structures
  const cards = [];
  const directChildren = node.c || [];

  // Try to find swiper-slides, card-like divs, or <a> wrappers with content
  const slides = findAll(node, n => (n.cls || '').includes('swiper-slide'), 8);
  const cardDivs = findAll(node, n => (n.cls || '').match(/card|article|news-item|post/i), 8);
  // Find <a> elements that contain headings (h3/h4/h5) — these are card links
  const cardLinks = findAll(node, n => {
    if (n.tag !== 'a' || !n.href) return false;
    const hasHeading = findFirst(n, x => ['h3', 'h4', 'h5'].includes(x.tag) && x.t, 6);
    return !!hasHeading;
  }, 10);

  // Pick the best collection source (prefer slides > card divs > card links > direct children)
  let cardNodes = slides.length >= 2 ? slides : cardDivs.length >= 2 ? cardDivs : cardLinks.length >= 2 ? cardLinks : [];

  // Fallback: find all h3/h4/h5 elements and treat their parent containers as cards
  if (cardNodes.length === 0) {
    const headings = findAll(node, n => ['h3', 'h4', 'h5'].includes(n.tag) && n.t && n.t.length > 5, 10);
    if (headings.length >= 2) {
      // Use the headings themselves as card anchors — extract content around each
      for (const h of headings) {
        const img = null; // Image may be at sibling level, hard to find from heading
        cards.push({
          image: null,
          heading: h.t.trim(),
          description: null,
          date: null,
          link: null
        });
      }
      // Skip the main loop since we already built cards
      return {
        type: 'card-grid',
        fields: {
          sectionTitle: sectionTitle ? sectionTitle.t.trim() : null,
          viewAllLink: findFirst(node, n => n.tag === 'a' && getText(n, 2).match(/all|view|more/i))
            ? { text: getText(findFirst(node, n => n.tag === 'a' && getText(n, 2).match(/all|view|more/i)), 2), href: findFirst(node, n => n.tag === 'a' && getText(n, 2).match(/all|view|more/i)).href }
            : null,
          cards
        }
      };
    }
  }

  for (const card of cardNodes) {
    const img = findFirst(card, n => n.src, 6);
    const heading = findFirst(card, n => ['h3', 'h4', 'h5'].includes(n.tag) && n.t, 6);
    const desc = findFirst(card, n => n.tag === 'p' && n.t && n.t.length > 10, 6);
    const link = findFirst(card, n => n.tag === 'a' && n.href, 6);
    const date = findFirst(card, n => n.tag === 'p' && n.t && /\d{1,2}\s+\w+,?\s+\d{4}/.test(n.t), 6);

    if (heading || img || desc) {
      cards.push({
        image: img ? { src: img.src, alt: img.alt || '' } : null,
        heading: heading ? heading.t.trim() : null,
        description: desc ? desc.t.trim() : null,
        date: date ? date.t.trim() : null,
        link: link ? { href: link.href, text: getText(link, 2) || 'Read More' } : null
      });
    }
  }

  return {
    type: 'card-grid',
    fields: {
      sectionTitle: sectionTitle ? sectionTitle.t.trim() : null,
      viewAllLink: findFirst(node, n => n.tag === 'a' && getText(n, 2).match(/all|view|more/i))
        ? { text: getText(findFirst(node, n => n.tag === 'a' && getText(n, 2).match(/all|view|more/i)), 2), href: findFirst(node, n => n.tag === 'a' && getText(n, 2).match(/all|view|more/i)).href }
        : null,
      cards
    }
  };
}

function extractSplitContent(node) {
  const heading = findFirst(node, n => ['h2', 'h3', 'h4'].includes(n.tag) && n.t);
  const paragraphs = findAll(node, n => n.tag === 'p' && n.t && n.t.length > 15, 15);
  const images = collectImages(node, 15);
  const buttons = findAll(node, n => n.tag === 'a' && ((n.cls || '').includes('btn') || (n.cls || '').includes('cta') || (n.cls || '').includes('explore')), 15);

  return {
    type: 'split-content',
    fields: {
      heading: heading ? heading.t.trim() : null,
      description: paragraphs.map(p => p.t.trim()),
      image: images[0] || null,
      cta: buttons.map(b => ({ text: getText(b, 2), href: b.href || '#' })),
      backgroundImage: node.s?.['background-image']?.replace(/url\(["']?|["']?\)/g, '') || null
    }
  };
}

function extractStats(node) {
  const items = [];
  // Find number + label pairs
  const allTexts = findAll(node, n => n.t, 8);
  for (let i = 0; i < allTexts.length; i++) {
    const text = allTexts[i].t.trim();
    if (/^\d[\d,.\s]*[+%KMBkmb]*$/.test(text)) {
      // This is a number — next text is likely the label
      const label = allTexts[i + 1]?.t?.trim() || '';
      items.push({ value: text, label, suffix: text.match(/[+%KMBkmb]+$/)?.[0] || '' });
      i++; // Skip the label
    }
  }

  return {
    type: 'stats',
    fields: {
      sectionTitle: findFirst(node, n => ['h2', 'h3'].includes(n.tag) && n.t)?.t?.trim() || null,
      items
    }
  };
}

function extractContentSection(node) {
  const heading = findFirst(node, n => ['h1', 'h2', 'h3', 'h4'].includes(n.tag) && n.t);
  const paragraphs = findAll(node, n => n.tag === 'p' && n.t && n.t.length > 10, 15);
  const overline = findFirst(node, n => n.t && n.t.length < 30 && n.s?.['text-transform'] === 'uppercase');

  return {
    type: 'content-section',
    fields: {
      overline: overline ? overline.t.trim() : null,
      heading: heading ? heading.t.trim() : null,
      description: paragraphs.map(p => p.t.trim()),
      images: collectImages(node, 15),
      links: collectLinks(node, 15).filter(l => l.text.length > 0)
    }
  };
}

function extractFooter(node) {
  const logo = findFirst(node, n => n.src && (n.alt?.toLowerCase().includes('logo') || n.tag === 'img'));
  const copyright = findFirst(node, n => n.t && /©|copyright|\d{4}/i.test(n.t));

  // Collect link groups (columns)
  const allLinks = findAll(node, n => n.tag === 'a' && n.href && getText(n, 2).length > 0, 10);
  const headings = findAll(node, n => ['h3', 'h4', 'h5', 'strong'].includes(n.tag) && n.t && n.t.length < 40, 15);

  // Social links
  const socialLinks = allLinks.filter(l => {
    const href = (l.href || '').toLowerCase();
    return href.includes('linkedin') || href.includes('twitter') || href.includes('facebook') ||
           href.includes('instagram') || href.includes('youtube') || href.includes('x.com');
  });

  return {
    type: 'footer',
    fields: {
      logo: logo ? { src: logo.src, alt: logo.alt || 'Logo' } : null,
      copyright: copyright ? copyright.t.trim() : null,
      columnHeadings: headings.map(h => h.t.trim()),
      links: allLinks.filter(l => !socialLinks.includes(l)).map(l => ({ text: getText(l, 2), href: l.href })),
      socialLinks: socialLinks.map(l => ({ href: l.href, platform: detectSocialPlatform(l.href) }))
    }
  };
}

function detectSocialPlatform(href) {
  const h = (href || '').toLowerCase();
  if (h.includes('linkedin')) return 'linkedin';
  if (h.includes('twitter') || h.includes('x.com')) return 'x';
  if (h.includes('facebook')) return 'facebook';
  if (h.includes('instagram')) return 'instagram';
  if (h.includes('youtube')) return 'youtube';
  return 'unknown';
}

function extractCarousel(node) {
  const slides = findAll(node, n => (n.cls || '').includes('swiper-slide'), 15);
  const heading = findFirst(node, n => ['h2', 'h3'].includes(n.tag) && n.t);

  return {
    type: 'carousel',
    fields: {
      sectionTitle: heading ? heading.t.trim() : null,
      slides: slides.map(slide => {
        const img = findFirst(slide, n => n.src, 4);
        const title = findFirst(slide, n => ['h3', 'h4', 'h5'].includes(n.tag) && n.t, 5);
        const desc = findFirst(slide, n => n.tag === 'p' && n.t && n.t.length > 10, 5);
        return {
          image: img ? { src: img.src, alt: img.alt || '' } : null,
          heading: title ? title.t.trim() : null,
          description: desc ? desc.t.trim() : null,
          backgroundImage: slide.s?.['background-image']?.replace(/url\(["']?|["']?\)/g, '') || null
        };
      })
    }
  };
}

function extractTabs(node) {
  const tabs = findAll(node, n => (n.cls || '').includes('tab') && n.t && n.t.length < 40, 15);
  const panels = findAll(node, n => n.cls?.includes('tab-pane') || n.cls?.includes('tabpanel'), 15);

  return {
    type: 'tabs',
    fields: {
      tabs: tabs.map((t, i) => ({
        label: t.t.trim(),
        content: panels[i] ? getText(panels[i], 3) : null
      }))
    }
  };
}

function extractLogoCloud(node) {
  const heading = findFirst(node, n => ['h2', 'h3'].includes(n.tag) && n.t);
  const images = collectImages(node, 8);
  const items = findAll(node, n => n.tag === 'a' || ((n.cls || '').includes('service') || (n.cls || '').includes('item')), 15);

  return {
    type: 'logo-cloud',
    fields: {
      sectionTitle: heading ? heading.t.trim() : null,
      items: items.length > 0 ? items.map(item => {
        const img = findFirst(item, n => n.src, 3);
        const title = findFirst(item, n => ['h3', 'h4', 'h5', 'span'].includes(n.tag) && n.t, 3);
        return {
          image: img ? { src: img.src, alt: img.alt || '' } : null,
          title: title ? title.t.trim() : (getText(item, 2) || null),
          link: item.href || null
        };
      }) : images.map(img => ({ image: img, title: img.alt || '', link: null }))
    }
  };
}

function extractCtaBanner(node) {
  return {
    type: 'cta-banner',
    fields: {
      heading: findFirst(node, n => ['h2', 'h3'].includes(n.tag) && n.t)?.t?.trim() || null,
      description: findFirst(node, n => n.tag === 'p' && n.t && n.t.length > 15)?.t?.trim() || null,
      primaryCta: findFirst(node, n => n.tag === 'a' || n.tag === 'button')
        ? { text: getText(findFirst(node, n => n.tag === 'a' || n.tag === 'button'), 2), href: findFirst(node, n => n.tag === 'a')?.href || '#' }
        : null,
      backgroundImage: node.s?.['background-image']?.replace(/url\(["']?|["']?\)/g, '') || null
    }
  };
}

function extractVideoSection(node) {
  const video = findFirst(node, n => n.vsrc || n.tag === 'video');
  const image = findFirst(node, n => n.src);
  const heading = findFirst(node, n => ['h2', 'h3', 'h4'].includes(n.tag) && n.t);

  return {
    type: 'video-section',
    fields: {
      heading: heading ? heading.t.trim() : null,
      description: findFirst(node, n => n.tag === 'p' && n.t && n.t.length > 15)?.t?.trim() || null,
      video: video ? { src: video.vsrc, poster: video.poster || image?.src || null } : null,
      image: !video && image ? { src: image.src, alt: image.alt || '' } : null,
      backgroundImage: node.s?.['background-image']?.replace(/url\(["']?|["']?\)/g, '') || null
    }
  };
}

function extractForm(node) {
  const inputs = findAll(node, n => ['input', 'textarea', 'select'].includes(n.tag), 8);
  return {
    type: 'form',
    fields: {
      heading: findFirst(node, n => ['h2', 'h3'].includes(n.tag) && n.t)?.t?.trim() || null,
      fields: inputs.map(inp => ({
        type: inp.type || 'text',
        name: inp.name || '',
        placeholder: inp.placeholder || '',
        required: !!inp.required
      })),
      submitText: getText(findFirst(node, n => n.tag === 'button' && n.type !== 'reset') || {}, 2) || 'Submit'
    }
  };
}

function extractTestimonials(node) {
  return extractCarousel(node); // Same structure
}

function extractSidebar(node) {
  const links = collectLinks(node, 15);
  return {
    type: 'sidebar',
    fields: {
      links: links.map(l => ({ ...l, platform: detectSocialPlatform(l.href) }))
    }
  };
}

function extractAccordion(node) {
  const items = findAll(node, n => n.cls?.includes('accordion') || n.tag === 'details', 15);
  return {
    type: 'accordion',
    fields: {
      items: items.map(item => ({
        heading: findFirst(item, n => ['h3', 'h4', 'button', 'summary'].includes(n.tag) && n.t, 3)?.t?.trim() || '',
        content: getText(findFirst(item, n => n.cls?.includes('content') || n.cls?.includes('panel') || n.tag === 'dd', 3) || item, 3)
      }))
    }
  };
}

function extractTimeline(node) { return extractCarousel(node); }
function extractBreadcrumb(node) { return { type: 'breadcrumb', fields: { items: collectLinks(node, 15) } }; }
function extractGallery(node) { return { type: 'gallery', fields: { images: collectImages(node, 8) } }; }
function extractPricing(node) { return extractGeneric(node); }
function extractTable(node) { return extractGeneric(node); }

function extractGeneric(node) {
  return {
    type: 'generic',
    fields: {
      headings: collectTexts(node, 'h1', 6).concat(collectTexts(node, 'h2', 6)).concat(collectTexts(node, 'h3', 6)),
      paragraphs: collectTexts(node, 'p', 6).filter(t => t.length > 10),
      images: collectImages(node, 8),
      links: collectLinks(node, 8).filter(l => l.text.length > 0)
    }
  };
}

// ── Main ───────────────────────────────────────────────────
function run() {
  const files = fs.readdirSync(extractedDir).filter(f =>
    f.startsWith('page-') && !f.includes('-768') && !f.includes('-375') && !f.includes('-merged') && f.endsWith('.json')
  );

  console.log(`\nContent Extraction — CMS Structure\n`);

  for (const file of files) {
    const pageName = file.replace('page-', '').replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(extractedDir, file), 'utf-8'));

    const pageCompDir = path.join(componentsDir, pageName);
    if (!fs.existsSync(pageCompDir)) fs.mkdirSync(pageCompDir, { recursive: true });

    // Page assembly JSON
    const pageAssembly = {
      page: pageName,
      url: data.meta?.url || '',
      title: data.meta?.title || '',
      language: data.meta?.lang || 'en',
      direction: data.meta?.dir || 'ltr',
      layout: 'default',
      components: []
    };

    console.log(`  Page: ${pageName} (${data.components.length} components)`);

    for (let i = 0; i < data.components.length; i++) {
      const comp = data.components[i];
      const name = comp.componentName || `Unknown-${i}`;
      const type = comp.componentType || 'content-section';
      const variant = comp.componentVariant || null;
      const safeName = `${String(i).padStart(2, '0')}-${name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40)}`;

      // Extract content
      const content = extractContent(comp, type);
      content.componentName = name;
      content.componentType = type;
      content.componentVariant = variant;
      content.alignment = comp.alignment || 'full-bleed';
      content.containerMaxWidth = comp.containerMaxWidth || null;

      // Save component content JSON
      const contentPath = path.join(pageCompDir, `${safeName}.json`);
      fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));

      // Add to page assembly
      pageAssembly.components.push({
        index: i,
        name,
        type,
        variant,
        alignment: comp.alignment || 'full-bleed',
        containerMaxWidth: comp.containerMaxWidth || null,
        contentFile: `components/${pageName}/${safeName}.json`,
        templateFile: `templates/${type}.html`
      });

      const fieldCount = Object.values(content.fields || {}).filter(v => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)).length;
      console.log(`    ${safeName} [${type}] → ${fieldCount} fields`);
    }

    // Save page assembly
    const pagePath = path.join(pagesDir, `${pageName}.json`);
    fs.writeFileSync(pagePath, JSON.stringify(pageAssembly, null, 2));
    console.log(`  → Page assembly: ${pagePath}`);
  }

  console.log(`\n✓ Content extracted to ${contentDir}/`);
  console.log(`  Pages: ${pagesDir}/`);
  console.log(`  Components: ${componentsDir}/\n`);
}

run();
