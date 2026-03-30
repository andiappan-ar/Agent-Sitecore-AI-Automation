/**
 * Fix content JSONs by pulling ALL text/images/links from extraction data.
 * Goes deep (depth 20+) and captures everything regardless of tag.
 */
const fs = require('fs');
const path = require('path');

const siteDir = process.argv[2] || 'output/www.taziz.com';
const extractedDir = path.join(siteDir, 'extracted');
const contentDir = path.join(siteDir, 'content', 'components');

const pageFile = fs.readdirSync(extractedDir).find(f => f.startsWith('page-') && !f.includes('-768') && !f.includes('-375') && !f.includes('-merged') && f.endsWith('.json'));
const data = JSON.parse(fs.readFileSync(path.join(extractedDir, pageFile), 'utf-8'));
const pageName = pageFile.replace('page-', '').replace('.json', '');
const compDir = path.join(contentDir, pageName);

// Deep content finder — gets ALL text, images, links from any depth
function findAll(node, pred, depth = 0) {
  const r = [];
  if (pred(node)) r.push(node);
  if (node.c && depth < 30) node.c.forEach(ch => r.push(...findAll(ch, pred, depth + 1)));
  return r;
}

function getText(node) {
  if (!node) return '';
  let t = node.t || '';
  if (node.c) node.c.forEach(ch => { const ct = getText(ch); if (ct) t += (t ? ' ' : '') + ct; });
  return t.trim();
}

data.components.forEach((comp, i) => {
  const name = comp.componentName || `Unknown-${i}`;
  const type = comp.componentType || 'content-section';
  const safeName = `${String(i).padStart(2, '0')}-${name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40)}`;
  const contentPath = path.join(compDir, `${safeName}.json`);

  if (!fs.existsSync(contentPath)) {
    console.log(`[${i}] SKIP — no content file`);
    return;
  }

  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

  // Gather ALL content from extraction
  const allH1 = findAll(comp, n => n.tag === 'h1' && n.t);
  const allH2 = findAll(comp, n => n.tag === 'h2' && n.t);
  const allH3 = findAll(comp, n => n.tag === 'h3' && n.t);
  const allH4 = findAll(comp, n => n.tag === 'h4' && n.t);
  const allP = findAll(comp, n => n.tag === 'p' && n.t && n.t.length > 3);
  const allDiv = findAll(comp, n => n.tag === 'div' && n.t && n.t.length > 15);
  const allSpan = findAll(comp, n => n.tag === 'span' && n.t && n.t.length > 3);
  const allImg = findAll(comp, n => n.src);
  const allLinks = findAll(comp, n => n.tag === 'a' && n.href && n.href !== '#');
  const allButtons = findAll(comp, n => (n.tag === 'a' || n.tag === 'button') && ((n.cls || '').includes('btn') || (n.cls || '').includes('cta') || (n.cls || '').includes('rounded-full')));

  // Fix based on type
  switch (type) {
    case 'header': {
      // Logo
      const logoImg = allImg.find(n => (n.alt || '').toLowerCase().includes('logo') || (n.src || '').toLowerCase().includes('logo'));
      if (logoImg) content.fields.logo = { src: logoImg.src, alt: logoImg.alt || 'Logo' };

      // Nav items — all links with short text
      const navItems = allLinks.filter(n => {
        const text = getText(n);
        return text.length > 0 && text.length < 40;
      }).map(n => ({ text: getText(n), href: n.href }));
      if (navItems.length > 0) content.fields.navigationItems = navItems;

      // Language toggle
      const langLink = allLinks.find(n => getText(n).match(/عربي|arabic|العربية|english/i));
      if (langLink) content.fields.languageToggle = { text: getText(langLink), href: langLink.href };
      break;
    }

    case 'hero': {
      const h1 = allH1[0] || allH2[0];
      if (h1) content.fields.heading = h1.t.trim();

      // Description — longest paragraph or div text
      const descTexts = [...allP, ...allDiv].filter(n => n.t && n.t.length > 30).sort((a, b) => b.t.length - a.t.length);
      if (descTexts[0]) content.fields.description = descTexts[0].t.trim();

      // Background image or video
      const bgImg = comp.s?.['background-image']?.replace(/url\(["']?|["']?\)/g, '') || null;
      const firstImg = allImg[0];
      if (bgImg) content.fields.backgroundImage = bgImg;
      else if (firstImg) content.fields.backgroundImage = firstImg.src;

      // Video
      const video = findAll(comp, n => n.vsrc || n.tag === 'video')[0];
      if (video) content.fields.video = { src: video.vsrc || null, poster: video.poster || null };

      // CTAs
      const ctas = allButtons.filter(n => getText(n).length > 0).map(n => ({ text: getText(n), href: n.href || '#' }));
      if (ctas.length > 0) content.fields.cta = ctas;

      // Stats
      const stats = findAll(comp, n => n.t && /^\d[\d,.\s]*[+%KMBkmb]*$/.test(n.t.trim()) && n.t.length < 20);
      if (stats.length > 0) content.fields.stats = stats.map(n => ({ value: n.t.trim() }));
      break;
    }

    case 'content-section': {
      const heading = allH1[0] || allH2[0] || allH3[0] || allH4[0];
      if (heading) content.fields.heading = heading.t.trim();

      // Overline — short uppercase text
      const overline = allP.find(n => n.t && n.t.length < 30 && n.s?.['text-transform'] === 'uppercase') || allP.find(n => n.t && n.t.length < 25);
      if (overline && (!heading || overline.t !== heading.t)) content.fields.overline = overline.t.trim();

      // Description — all longer text blocks
      const descs = [...allP, ...allDiv].filter(n => n.t && n.t.length > 15 && n.t !== heading?.t && n.t !== overline?.t);
      if (descs.length > 0) content.fields.description = descs.map(n => n.t.trim());

      // Images
      if (allImg.length > 0) content.fields.images = allImg.map(n => ({ src: n.src, alt: n.alt || '' }));

      // Links
      const links = allLinks.filter(n => getText(n).length > 0).map(n => ({ text: getText(n), href: n.href }));
      if (links.length > 0) content.fields.links = links;
      break;
    }

    case 'stats': {
      // Find number + label pairs
      const items = [];
      const allTexts = findAll(comp, n => n.t && n.t.length > 0);
      for (let j = 0; j < allTexts.length; j++) {
        const text = allTexts[j].t.trim();
        if (/^\d[\d,.\s]*[+%KMBkmb]*$/.test(text)) {
          const label = allTexts[j + 1]?.t?.trim() || '';
          items.push({ value: text, label });
          j++;
        }
      }
      if (items.length > 0) content.fields.items = items;

      const heading = allH2[0] || allH3[0];
      if (heading) content.fields.sectionTitle = heading.t.trim();
      break;
    }

    case 'card-grid': {
      const heading = allH2[0] || allH3[0];
      if (heading) content.fields.sectionTitle = heading.t.trim();

      // Cards — find h3/h4 as card titles
      const cardHeadings = [...allH3, ...allH4];
      if (cardHeadings.length > 0) {
        content.fields.cards = cardHeadings.map(h => {
          // Find description near this heading
          const idx = findAll(comp, n => n === h)[0];
          return {
            heading: h.t.trim(),
            description: null, // Would need sibling detection
            image: null,
            link: null
          };
        });
        // Try to find images for cards
        if (allImg.length >= content.fields.cards.length) {
          content.fields.cards.forEach((card, ci) => {
            if (allImg[ci]) card.image = { src: allImg[ci].src, alt: allImg[ci].alt || '' };
          });
        }
        // Try to find descriptions
        const longTexts = [...allP, ...allDiv].filter(n => n.t && n.t.length > 30);
        content.fields.cards.forEach((card, ci) => {
          if (longTexts[ci]) card.description = longTexts[ci].t.trim();
        });
      }

      // View all link
      const viewAll = allLinks.find(n => getText(n).match(/all|view|more/i));
      if (viewAll) content.fields.viewAllLink = { text: getText(viewAll), href: viewAll.href };
      break;
    }

    case 'carousel': {
      const heading = allH2[0] || allH3[0];
      if (heading) content.fields.sectionTitle = heading.t.trim();

      // Slides
      const slides = findAll(comp, n => (n.cls || '').includes('swiper-slide'));
      if (slides.length > 0) {
        content.fields.slides = slides.map(slide => {
          const img = findAll(slide, n => n.src)[0];
          const title = findAll(slide, n => ['h3', 'h4', 'h5'].includes(n.tag) && n.t)[0];
          const desc = findAll(slide, n => n.tag === 'p' && n.t && n.t.length > 10)[0];
          const divText = findAll(slide, n => n.tag === 'div' && n.t && n.t.length > 15)[0];
          const bg = slide.s?.['background-image']?.replace(/url\(["']?|["']?\)/g, '') || null;
          const link = findAll(slide, n => n.tag === 'a' && n.href && n.href !== '#')[0];
          return {
            image: img ? { src: img.src, alt: img.alt || '' } : null,
            heading: title ? title.t.trim() : (divText ? divText.t.trim().substring(0, 80) : null),
            description: desc ? desc.t.trim() : null,
            backgroundImage: bg,
            link: link ? { text: getText(link), href: link.href } : null,
            date: findAll(slide, n => n.tag === 'p' && n.t && /\d{1,2}\s+\w+\s+\d{4}/.test(n.t))[0]?.t?.trim() || null
          };
        });
      }

      // Additional texts not in slides (tab labels, section descriptions)
      const tabLabels = findAll(comp, n => n.tag === 'div' && n.t && n.t.length < 30 && n.t.length > 3 && !(n.cls || '').includes('swiper'));
      if (tabLabels.length >= 2) content.fields.tabLabels = tabLabels.map(n => n.t.trim());
      break;
    }

    case 'video-section': {
      const video = findAll(comp, n => n.vsrc || n.tag === 'video')[0];
      const img = allImg[0];
      if (video) content.fields.video = { src: video.vsrc, poster: video.poster || img?.src || null };
      else if (img) content.fields.image = { src: img.src, alt: img.alt || '' };

      const heading = allH2[0] || allH3[0];
      if (heading) content.fields.heading = heading.t.trim();
      break;
    }

    case 'footer': {
      const logoImg = allImg.find(n => (n.alt || '').toLowerCase().includes('logo') || (n.src || '').toLowerCase().includes('logo'));
      if (logoImg) content.fields.logo = { src: logoImg.src, alt: logoImg.alt || 'Logo' };

      const copyright = findAll(comp, n => n.t && /©|copyright|\d{4}/i.test(n.t))[0];
      if (copyright) content.fields.copyright = copyright.t.trim();

      // All links
      const links = allLinks.filter(n => getText(n).length > 0).map(n => ({ text: getText(n), href: n.href }));
      if (links.length > 0) {
        // Separate social from regular
        const socials = links.filter(l => /linkedin|twitter|x\.com|facebook|instagram|youtube/i.test(l.href));
        const regular = links.filter(l => !socials.includes(l));
        content.fields.links = regular;
        content.fields.socialLinks = socials.map(l => {
          const h = l.href.toLowerCase();
          let platform = 'unknown';
          if (h.includes('linkedin')) platform = 'linkedin';
          else if (h.includes('twitter') || h.includes('x.com')) platform = 'x';
          else if (h.includes('instagram')) platform = 'instagram';
          else if (h.includes('facebook')) platform = 'facebook';
          else if (h.includes('youtube')) platform = 'youtube';
          return { href: l.href, platform, text: l.text };
        });
      }

      // Disclaimer text
      const disclaimer = findAll(comp, n => n.tag === 'a' && getText(n).match(/disclaimer|privacy|terms/i))[0];
      if (disclaimer) content.fields.disclaimerLink = { text: getText(disclaimer), href: disclaimer.href };
      break;
    }

    case 'sidebar': {
      const links = allLinks.filter(n => getText(n).length > 0 || n.href).map(n => {
        const h = n.href.toLowerCase();
        let platform = 'unknown';
        if (h.includes('linkedin')) platform = 'linkedin';
        else if (h.includes('twitter') || h.includes('x.com')) platform = 'x';
        else if (h.includes('instagram')) platform = 'instagram';
        else if (h.includes('facebook')) platform = 'facebook';
        else if (h.includes('youtube')) platform = 'youtube';
        return { href: n.href, platform, text: getText(n) };
      });
      if (links.length > 0) content.fields.links = links;
      break;
    }
  }

  // Save fixed content
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));

  const fieldCount = Object.entries(content.fields).filter(([k, v]) => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some(x => x !== null);
    return true;
  }).length;

  console.log(`[${i}] ${name.substring(0, 35).padEnd(35)} [${type.padEnd(15)}] → ${fieldCount} fields`);
});

console.log('\n✓ Content JSONs fixed from extraction data');
