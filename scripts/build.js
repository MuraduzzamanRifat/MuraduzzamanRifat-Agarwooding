#!/usr/bin/env node
/**
 * Build-time injection of meta tags + footer text from content/site.json.
 *
 * For each page mapping defined in PAGES below:
 *  - Replaces <title>...</title>
 *  - Replaces <meta name="description" content="...">
 *  - Adds OG tags (og:title, og:description, og:type)
 *  - Replaces footer .foot-tagline text + .foot-copy text
 *
 * Runs in GitHub Actions before Pages deploy. Static fallback HTML stays
 * intact for any page not listed; client-side hydration still applies
 * for everything else.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));

const PAGES = {
  'index.html':          'home',
  'about-agarwood.html': 'about',
  'products.html':       'products',
  'blog.html':           'blog',
  'company.html':        'company',
  'contact.html':        'contact',
};

const SITE_URL = 'https://muraduzzamanrifat.github.io/MuraduzzamanRifat-Agarwooding';

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function escText(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function patchPage(filename, pageKey) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[build] ${filename} not found, skipping`);
    return;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  const meta = (data.meta || {})[pageKey] || {};
  const footer = data.footer || {};

  if (meta.title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escText(meta.title)}</title>`);
  }
  if (meta.description) {
    if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
      html = html.replace(
        /<meta\s+name=["']description["'][^>]*>/i,
        `<meta name="description" content="${escAttr(meta.description)}"/>`
      );
    } else {
      html = html.replace(/<\/title>/i, `</title>\n  <meta name="description" content="${escAttr(meta.description)}"/>`);
    }
  }

  // OG tags — replace existing block or insert after description
  const ogBlock = [
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:url" content="${escAttr(SITE_URL + '/' + filename)}"/>`,
    `<meta property="og:title" content="${escAttr(meta.title || '')}"/>`,
    `<meta property="og:description" content="${escAttr(meta.description || '')}"/>`,
    `<meta property="og:site_name" content="Agarwooding"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
  ].join('\n  ');

  if (/<meta\s+property=["']og:title["'][^>]*>/i.test(html)) {
    // Replace existing OG block (between og:type and twitter:card if both exist)
    html = html.replace(/<meta\s+property=["']og:[^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']twitter:[^>]*>/gi, '');
  }
  // Insert OG block right after description tag
  html = html.replace(
    /(<meta\s+name=["']description["'][^>]*>)/i,
    `$1\n  ${ogBlock}`
  );

  // Footer tagline + copyright
  if (footer.tagline) {
    html = html.replace(
      /<p class="foot-tagline">[\s\S]*?<\/p>/g,
      `<p class="foot-tagline">${escText(footer.tagline)}</p>`
    );
  }
  if (footer.copyright) {
    html = html.replace(
      /<span class="foot-copy">[\s\S]*?<\/span>/g,
      `<span class="foot-copy">${escText(footer.copyright)}</span>`
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`[build] ✓ ${filename}  ${meta.title ? '(title set)' : ''} ${meta.description ? '(desc set)' : ''}`);
}

console.log('[build] CMS schema version:', data._meta?.version, '· last updated:', data._meta?.lastUpdated);
Object.entries(PAGES).forEach(([f, k]) => patchPage(f, k));
console.log('[build] done');
