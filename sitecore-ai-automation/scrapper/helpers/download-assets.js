/**
 * download-assets.js — Downloads all fonts, images, SVGs to local assets/
 *
 * Scans generated HTML files for external URLs (images, fonts, icons)
 * and downloads them locally. Rewrites HTML to use local paths.
 * Skips videos (too large).
 *
 * Usage:
 *   node helpers/download-assets.js output/{domain}/{tech}
 *
 * Example:
 *   node helpers/download-assets.js output/www.taziz.com/tailwind
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const targetDir = process.argv.filter(a => !a.startsWith('--'))[2];
const DRY_RUN = process.argv.includes('--dry-run');
if (!targetDir) {
  console.error('Usage: node helpers/download-assets.js output/{domain}/{tech} [--dry-run]');
  process.exit(1);
}
if (DRY_RUN) console.log('DRY RUN — listing URLs without downloading\n');

const ASSETS_DIR = path.join(targetDir, 'assets');
fs.mkdirSync(path.join(ASSETS_DIR, 'images'), { recursive: true });
fs.mkdirSync(path.join(ASSETS_DIR, 'fonts'), { recursive: true });

// ============================================================
// DOWNLOAD HELPER
// ============================================================
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, { timeout: 15000, rejectUnauthorized: false }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(true); });
      stream.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

function urlToFilename(url) {
  try {
    const parsed = new URL(url);
    let name = parsed.pathname.split('/').pop() || 'file';
    // Remove query params from filename but keep extension
    name = name.split('?')[0];
    // Sanitize
    name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Ensure extension
    if (!name.includes('.')) name += '.bin';
    return name;
  } catch {
    return 'file_' + Date.now() + '.bin';
  }
}

function getFileType(url) {
  const lower = url.toLowerCase();
  // Fonts
  if (lower.includes('.woff2') || lower.includes('.woff') || lower.includes('.ttf') ||
      lower.includes('.otf') || lower.includes('.eot')) return 'font';
  // Videos — skip
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') ||
      lower.includes('.avi') || lower.includes('/video')) return 'video';
  // Images
  if (lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg') ||
      lower.includes('.gif') || lower.includes('.webp') || lower.includes('.svg') ||
      lower.includes('.ico') || lower.includes('/img/') || lower.includes('/image/') ||
      lower.includes('/media/img/') || lower.includes('/icons/') || lower.includes('/logo/')) return 'image';
  // Font in URL path
  if (lower.includes('/font') || lower.includes('format(')) return 'font';
  return 'image'; // default to image
}

// ============================================================
// SCAN AND DOWNLOAD
// ============================================================
async function processFiles() {
  // Find all HTML files
  const htmlFiles = [];
  function findHtml(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'assets') findHtml(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  }
  findHtml(targetDir);

  console.log(`Found ${htmlFiles.length} HTML files`);

  // Collect all external URLs from HTML + CSS
  const urlMap = new Map(); // url → local path
  const seenFilenames = new Set();

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf-8');

    // Find all URLs: src="...", url("..."), url('...'), href="..." (for stylesheets/fonts)
    const urlRegex = /(?:src|href|poster)="(https?:\/\/[^"]+)"|url\(["']?(https?:\/\/[^"')]+)["']?\)/g;
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1] || match[2];
      if (!url || urlMap.has(url)) continue;

      const type = getFileType(url);
      if (type === 'video') continue; // Skip videos

      // Skip CDN libraries (Tailwind, Alpine.js, etc.) — keep as external URLs
      if (url.includes('cdn.tailwindcss.com') || url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com')) continue;

      // Skip non-asset URLs (social media, navigation pages, external sites)
      const skipDomains = ['linkedin.com', 'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'youtube.com', 'fertiglobe.com', 'adq.ae'];
      try {
        const host = new URL(url).hostname;
        if (skipDomains.some(d => host.includes(d))) continue;
        // Skip URLs that look like page navigation (no file extension)
        const urlPath = new URL(url).pathname;
        const hasExtension = /\.\w{2,5}$/.test(urlPath.split('?')[0]);
        if (!hasExtension && !urlPath.includes('/media/') && !urlPath.includes('/img/') && !urlPath.includes('/icon')) continue;
      } catch { continue; }

      let filename = urlToFilename(url);
      // Ensure unique
      while (seenFilenames.has(filename)) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        filename = base + '_' + Math.random().toString(36).substring(2, 6) + ext;
      }
      seenFilenames.add(filename);

      const subdir = type === 'font' ? 'fonts' : 'images';
      // Use forward slashes for HTML compatibility
      const localPath = 'assets/' + subdir + '/' + filename;
      urlMap.set(url, localPath);
    }
  }

  console.log(`Found ${urlMap.size} assets to download (excluding videos)`);

  // Download all assets
  let downloaded = 0;
  let failed = 0;
  const entries = [...urlMap.entries()];

  // Download in batches of 5
  if (DRY_RUN) {
    for (const [url, localPath] of entries) {
      console.log(`  ${localPath} ← ${url}`);
    }
    console.log(`\nDry run complete: ${entries.length} assets would be downloaded.`);
    // Skip download but continue to link rewriting below
  } else {

  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    await Promise.all(batch.map(async ([url, localPath]) => {
      const destPath = path.join(targetDir, localPath);
      try {
        await downloadFile(url, destPath);
        downloaded++;
        if (downloaded % 10 === 0) console.log(`  Downloaded ${downloaded}/${urlMap.size}...`);
      } catch (err) {
        failed++;
        console.warn(`  Failed: ${urlToFilename(url)} — ${err.message}`);
        // Remove from map so we don't rewrite this URL
        urlMap.delete(url);
      }
    }));
  }

  console.log(`Downloaded: ${downloaded}, Failed: ${failed}`);

  // Rewrite URLs in HTML files
  for (const htmlFile of htmlFiles) {
    let content = fs.readFileSync(htmlFile, 'utf-8');
    const isSubpage = htmlFile.includes(path.sep + 'pages' + path.sep);

    for (const [url, localPath] of urlMap.entries()) {
      // Adjust relative path for subpages
      const relativePath = isSubpage ? '../' + localPath : localPath;
      // Replace all occurrences of this URL
      content = content.split(url).join(relativePath);
    }

    fs.writeFileSync(htmlFile, content);
  }

  console.log(`\nRewrote URLs in ${htmlFiles.length} HTML files`);

  } // end of else (non-dry-run)

  // Also rewrite font URLs in tailwind.config.js if it exists
  const twConfig = path.join(targetDir, 'tailwind.config.js');
  if (fs.existsSync(twConfig)) {
    let content = fs.readFileSync(twConfig, 'utf-8');
    for (const [url, localPath] of urlMap.entries()) {
      content = content.split(url).join(localPath);
    }
    fs.writeFileSync(twConfig, content);
  }

  // ── INTERNAL LINK REWRITING ──
  // Rewrite same-domain links to local paths if a matching .html file exists,
  // otherwise point to # with data-original-href for reference.
  console.log(`\n── Rewriting internal links ──`);

  // Detect base domain from URLs found in HTML
  let baseDomain = '';
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf-8');
    const domainMatch = content.match(/href="(https?:\/\/[^"/]+)/);
    if (domainMatch) {
      baseDomain = domainMatch[1];
      break;
    }
  }

  if (baseDomain) {
    // Build map of available local pages: path → local file
    const localPages = {};
    // index.html → /
    localPages['/'] = 'index.html';
    const pagesDir = path.join(targetDir, 'pages');
    if (fs.existsSync(pagesDir)) {
      const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
      for (const pf of pageFiles) {
        const name = pf.replace('.html', '');
        // Map common patterns: about-us.html → /about-us, /about-us/
        localPages['/' + name] = 'pages/' + pf;
        localPages['/' + name + '/'] = 'pages/' + pf;
      }
    }

    let linksRewritten = 0;
    let linksDeadended = 0;

    for (const htmlFile of htmlFiles) {
      let content = fs.readFileSync(htmlFile, 'utf-8');
      const isSubpage = htmlFile.includes(path.sep + 'pages' + path.sep);

      content = content.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
        try {
          const urlObj = new URL(url);
          // Only rewrite same-domain links
          if (urlObj.origin !== baseDomain) return match;

          const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
          const localPath = localPages[pathname] || localPages[pathname + '/'];

          if (localPath) {
            linksRewritten++;
            const relativePath = isSubpage
              ? (localPath === 'index.html' ? '../index.html' : localPath.replace('pages/', ''))
              : localPath;
            return `href="${relativePath}"`;
          } else {
            // No local page — dead-end with reference
            linksDeadended++;
            return `href="#" data-original-href="${url}"`;
          }
        } catch {
          return match;
        }
      });

      fs.writeFileSync(htmlFile, content);
    }

    console.log(`  Domain: ${baseDomain}`);
    console.log(`  Rewritten to local: ${linksRewritten}`);
    console.log(`  Unresolved (→ #): ${linksDeadended}`);
  } else {
    console.log('  No base domain detected — skipping link rewriting');
  }

  console.log(`\n✓ Assets downloaded to ${ASSETS_DIR}/`);
  console.log(`  Images: ${path.join(ASSETS_DIR, 'images')}`);
  console.log(`  Fonts: ${path.join(ASSETS_DIR, 'fonts')}`);
}

processFiles().catch(console.error);
