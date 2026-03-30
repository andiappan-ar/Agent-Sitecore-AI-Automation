#!/usr/bin/env node
/**
 * download-react-assets.js — Downloads external images from content JSONs to local assets
 *
 * Scans all page JSONs + component content JSONs for external image/video URLs,
 * downloads them to react-app/public/assets/images/, and rewrites URLs in the JSONs.
 *
 * Usage:
 *   node helpers/download-react-assets.js output/{domain}
 *
 * What it does:
 *   1. Scans content/pages/{lang}/*.json for image URLs (backgroundImage, image, src, poster)
 *   2. Scans content/{lang}/*.json for the same
 *   3. Downloads each image to react-app/public/assets/images/{hash}.{ext}
 *   4. Rewrites the URLs in the JSON files to /assets/images/{hash}.{ext}
 *   5. Skips videos (too large) — only images
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const siteDir = process.argv[2];
if (!siteDir) {
  console.error('Usage: node helpers/download-react-assets.js <output-dir>');
  process.exit(1);
}

const reactDir = path.join(siteDir, 'react-app');
const assetsDir = path.join(reactDir, 'public', 'assets', 'images');
fs.mkdirSync(assetsDir, { recursive: true });

// Track downloaded URLs → local path
const urlMap = {};
let downloadCount = 0;
let skipCount = 0;
let failCount = 0;

// ── Download a single file ───────────────────────────────────────────────────
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve(null);

    // Generate filename from URL hash + extension
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
    const ext = getExtension(url);
    const filename = `${hash}${ext}`;
    const localPath = path.join(assetsDir, filename);

    // Skip if already downloaded
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
      return resolve(`/assets/images/${filename}`);
    }

    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': new URL(url).origin + '/' },
      timeout: 15000,
    };

    client.get(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return resolve(null); // Skip non-200 responses
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 100) return resolve(null); // Too small, probably error page
        fs.writeFileSync(localPath, buffer);
        resolve(`/assets/images/${filename}`);
      });
    }).on('error', () => resolve(null));
  });
}

function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    // Common image extensions
    if (pathname.includes('.webp')) return '.webp';
    if (pathname.includes('.png')) return '.png';
    if (pathname.includes('.jpg') || pathname.includes('.jpeg')) return '.jpg';
    if (pathname.includes('.gif')) return '.gif';
    if (pathname.includes('.svg')) return '.svg';
    if (pathname.includes('.ashx')) return '.jpg'; // Sitecore media handler
    if (pathname.includes('.ico')) return '.ico';
    return '.jpg'; // Default
  } catch { return '.jpg'; }
}

// ── Check if a URL is an image (not video/document) ──────────────────────────
function isImageUrl(url) {
  if (!url || !url.startsWith('http')) return false;
  const lower = url.toLowerCase();
  // Skip videos
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('video')) return false;
  // Skip documents
  if (lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.xls')) return false;
  // Accept images
  return true;
}

// ── Recursively find and replace URLs in any JSON value ──────────────────────
async function processValue(value) {
  if (typeof value === 'string') {
    if (isImageUrl(value)) {
      if (urlMap[value]) return urlMap[value];
      const localPath = await downloadFile(value);
      if (localPath) {
        urlMap[value] = localPath;
        downloadCount++;
        return localPath;
      }
      failCount++;
      return value; // Keep original URL if download fails
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(v => processValue(v)));
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = await processValue(v);
    }
    return result;
  }
  return value;
}

// ── Process all JSON files in a directory ─────────────────────────────────────
async function processJsonFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const processed = await processValue(data);
    fs.writeFileSync(filePath, JSON.stringify(processed, null, 2));
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📥 Downloading React assets for ${siteDir}`);

  // Process page-level JSONs
  const pagesDir = path.join(reactDir, 'src', 'content', 'pages');
  if (fs.existsSync(pagesDir)) {
    const langs = fs.readdirSync(pagesDir).filter(f => fs.statSync(path.join(pagesDir, f)).isDirectory());
    for (const lang of langs) {
      console.log(`  Processing pages/${lang}/...`);
      await processJsonFiles(path.join(pagesDir, lang));
    }
  }

  // Process per-component content JSONs
  const contentDir = path.join(reactDir, 'src', 'content');
  if (fs.existsSync(contentDir)) {
    const langDirs = fs.readdirSync(contentDir).filter(f => {
      const fp = path.join(contentDir, f);
      return fs.statSync(fp).isDirectory() && f !== 'pages';
    });
    for (const lang of langDirs) {
      console.log(`  Processing content/${lang}/...`);
      await processJsonFiles(path.join(contentDir, lang));
    }
  }

  console.log(`\n✓ Assets downloaded:`);
  console.log(`  ${downloadCount} images downloaded`);
  console.log(`  ${Object.keys(urlMap).length} unique URLs processed`);
  console.log(`  ${failCount} failed (kept as external URLs)`);
  console.log(`  Saved to: ${assetsDir}`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
