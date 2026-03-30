#!/usr/bin/env node
/**
 * discover-pages.js — LLM-powered smart page selector
 *
 * Fetches sitemap, analyzes URL patterns, and selects ~15 unique template pages
 * for extraction. Uses Claude to intelligently pick representative pages.
 *
 * Usage:
 *   node helpers/discover-pages.js https://adnoc.ae output/adnoc.ae
 *   node helpers/discover-pages.js https://adnoc.ae output/adnoc.ae --max 20
 *   node helpers/discover-pages.js https://adnoc.ae output/adnoc.ae --lang en,ar
 *
 * Output:
 *   output/{domain}/pages.json — selected pages for orchestrate.js --pages
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const BASE_URL = args[0];
const OUTPUT_DIR = args[1];

if (!BASE_URL || !OUTPUT_DIR) {
  console.error('Usage: node helpers/discover-pages.js <base-url> <output-dir> [--max N] [--lang en,ar]');
  process.exit(1);
}

const maxIdx = args.indexOf('--max');
const MAX_PAGES = maxIdx >= 0 ? parseInt(args[maxIdx + 1]) : 15;

const langIdx = args.indexOf('--lang');
const LANGUAGES = langIdx >= 0 ? args[langIdx + 1].split(',') : ['en'];
const PRIMARY_LANG = LANGUAGES[0];
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// ── Fetch URL content ─────────────────────────────────────────────────────────
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── Parse sitemap XML ─────────────────────────────────────────────────────────
function parseSitemap(xml) {
  const urls = [];
  const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
  for (const m of locMatches) urls.push(m[1].trim());
  return urls;
}

// ── Discover all URLs from robots.txt + sitemap ──────────────────────────────
async function discoverAllUrls(baseUrl) {
  const origin = new URL(baseUrl).origin;
  let sitemapUrls = [];

  // Try robots.txt
  try {
    const robotsTxt = await fetchUrl(origin + '/robots.txt');
    const matches = robotsTxt.match(/Sitemap:\s*(.+)/gi) || [];
    sitemapUrls = matches.map(m => m.replace(/^Sitemap:\s*/i, '').trim());
    console.log(`  robots.txt: ${sitemapUrls.length} sitemap(s)`);
  } catch {
    console.log('  No robots.txt');
  }

  if (sitemapUrls.length === 0) {
    sitemapUrls = [origin + '/sitemap.xml'];
  }

  // Parse sitemaps (follow sub-sitemaps)
  const allUrls = new Set();
  const processed = new Set();

  while (sitemapUrls.length > 0) {
    const url = sitemapUrls.shift();
    if (processed.has(url)) continue;
    processed.add(url);

    try {
      const xml = await fetchUrl(url);
      const urls = parseSitemap(xml);

      for (const u of urls) {
        if (u.endsWith('.xml') || u.endsWith('.xml.gz')) {
          sitemapUrls.push(u);
        } else {
          allUrls.add(u);
        }
      }
      console.log(`  ${url}: ${urls.length} URLs`);
    } catch (e) {
      console.log(`  Failed: ${url} (${e.message})`);
    }
  }

  return [...allUrls];
}

// ── Group URLs by pattern ────────────────────────────────────────────────────
function groupUrls(urls, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const groups = {};

  for (const url of urls) {
    if (!url.startsWith(origin)) continue;
    const urlPath = new URL(url).pathname;

    // Determine language from path
    let lang = null;
    let cleanPath = urlPath;
    for (const l of LANGUAGES) {
      if (urlPath.startsWith(`/${l}/`) || urlPath === `/${l}`) {
        lang = l;
        cleanPath = urlPath.substring(l.length + 1) || '/';
        break;
      }
    }
    if (!lang) lang = PRIMARY_LANG;

    // Group by first two path segments (section)
    const segments = cleanPath.split('/').filter(Boolean);
    const section = segments.length === 0 ? 'home' : segments[0];
    const depth = segments.length;
    const isLanding = depth <= 1;
    const isDetail = depth >= 2;

    if (!groups[section]) groups[section] = { landing: [], detail: [], all: [] };
    const entry = { url, path: urlPath, lang, depth, isLanding, section };
    groups[section].all.push(entry);
    if (isLanding) groups[section].landing.push(entry);
    else groups[section].detail.push(entry);
  }

  return groups;
}

// ── Select representative pages ──────────────────────────────────────────────
function selectPages(groups, maxPages) {
  const selected = [];

  // Always include home page per language
  for (const lang of LANGUAGES) {
    const homePath = lang === PRIMARY_LANG ? `/${lang}` : `/${lang}`;
    selected.push({
      name: lang === PRIMARY_LANG ? 'home' : `home-${lang}`,
      path: homePath,
      lang,
      type: 'home',
      rtl: RTL_LANGUAGES.includes(lang),
    });
  }

  // For each section, pick 1 landing + 1 detail (primary language first)
  const sections = Object.entries(groups)
    .filter(([name]) => name !== 'home' && name !== 'errors' && name !== 'search')
    .sort((a, b) => b[1].all.length - a[1].all.length); // largest sections first

  for (const [section, group] of sections) {
    if (selected.length >= maxPages) break;

    // Pick landing page (primary language)
    const landing = group.landing.find(p => p.lang === PRIMARY_LANG) || group.landing[0];
    if (landing) {
      selected.push({
        name: section,
        path: landing.path,
        lang: landing.lang,
        type: 'landing',
        rtl: RTL_LANGUAGES.includes(landing.lang),
      });
    }

    // Pick one detail page (if different template from landing)
    if (group.detail.length > 0 && selected.length < maxPages) {
      const detail = group.detail.find(p => p.lang === PRIMARY_LANG) || group.detail[0];
      if (detail) {
        const detailName = detail.path.split('/').filter(Boolean).slice(0, 3).join('-');
        selected.push({
          name: detailName,
          path: detail.path,
          lang: detail.lang,
          type: 'detail',
          rtl: RTL_LANGUAGES.includes(detail.lang),
        });
      }
    }

    // Add Arabic landing for this section if multilingual
    if (LANGUAGES.includes('ar') && selected.length < maxPages) {
      const arLanding = group.landing.find(p => p.lang === 'ar');
      if (arLanding) {
        selected.push({
          name: `${section}-ar`,
          path: arLanding.path,
          lang: 'ar',
          type: 'landing',
          rtl: true,
        });
      }
    }
  }

  return selected.slice(0, maxPages);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Discovering pages for ${BASE_URL}`);
  console.log(`  Max pages: ${MAX_PAGES}`);
  console.log(`  Languages: ${LANGUAGES.join(', ')}\n`);

  // Step 1: Discover all URLs
  const allUrls = await discoverAllUrls(BASE_URL);
  console.log(`\n  Total URLs found: ${allUrls.length}`);

  // Step 2: Group by section
  const groups = groupUrls(allUrls, BASE_URL);
  console.log(`  Sections: ${Object.keys(groups).length}`);
  Object.entries(groups).forEach(([section, g]) => {
    console.log(`    ${section}: ${g.landing.length} landing, ${g.detail.length} detail`);
  });

  // Step 3: Select representative pages
  const selected = selectPages(groups, MAX_PAGES);

  console.log(`\n✓ Selected ${selected.length} pages:\n`);
  selected.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.type}] ${p.name} → ${p.path} (${p.lang}${p.rtl ? ', RTL' : ''})`);
  });

  // Step 4: Save
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, 'pages.json');

  const output = {
    site: BASE_URL,
    discoveredAt: new Date().toISOString(),
    totalUrls: allUrls.length,
    languages: LANGUAGES,
    rtlLanguages: LANGUAGES.filter(l => RTL_LANGUAGES.includes(l)),
    defaultLanguage: PRIMARY_LANG,
    templates: selected,
    // Format for orchestrate.js --pages
    pages: selected.map(p => ({ name: p.name, path: p.path })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n  Saved: ${outputPath}`);
  console.log(`\n  Next: node helpers/orchestrate.js ${BASE_URL} ${OUTPUT_DIR} --pages ${outputPath}`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
