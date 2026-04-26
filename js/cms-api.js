/* ═══════════════════════════════════════════════
   AGARWOODING — CMS DATA CLIENT
   Reads content/site.json. No backend.
═══════════════════════════════════════════════ */

/**
 * Sanitize CMS-supplied HTML — allow only an audited tag whitelist.
 * Strips <script>, on* handlers, javascript: URLs, and any tag not on
 * the allowlist. This is a defense-in-depth measure; primary security
 * is GitHub PAT + commit history.
 */
window.sanitizeCmsHtml = function (raw) {
  if (raw == null || raw === '') return '';
  const ALLOWED = new Set(['em','strong','i','b','br','span']);
  const tpl = document.createElement('template');
  tpl.innerHTML = String(raw);
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT, null);
  const toRemove = [];
  let node;
  while ((node = walker.nextNode())) {
    const tag = node.tagName.toLowerCase();
    if (!ALLOWED.has(tag)) { toRemove.push(node); continue; }
    // Strip ALL attributes — no class, no style, no data-* — keep tags only
    for (const a of Array.from(node.attributes)) node.removeAttribute(a.name);
  }
  toRemove.forEach(n => {
    while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
    n.parentNode.removeChild(n);
  });
  return tpl.innerHTML;
};

window.CMS = (function () {
  const SOURCE = 'content/site.json';
  const ADMIN_URL = 'admin/';

  let cache = null;
  let inflight = null;

  function resolveSource() {
    const depth = (location.pathname.match(/\/[^/]+\.html$/) ? 0 : 0);
    const inSub = /\/admin\//.test(location.pathname);
    return inSub ? '../' + SOURCE : SOURCE;
  }

  async function load(force = false) {
    if (cache && !force) return cache;
    if (inflight) return inflight;
    inflight = fetch(resolveSource() + '?v=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error('CMS fetch failed: ' + r.status);
        return r.json();
      })
      .then(data => {
        cache = data;
        inflight = null;
        return data;
      })
      .catch(err => {
        inflight = null;
        console.error('[CMS]', err);
        throw err;
      });
    return inflight;
  }

  return {
    ADMIN_URL,
    load,

    async hero()         { return (await load()).hero || {}; },
    async company()      { return (await load()).company || {}; },
    async footer()       { return (await load()).footer || {}; },
    async pageHeroes()   { return (await load()).pageHeroes || {}; },
    async pageHero(name) { return ((await load()).pageHeroes || {})[name] || null; },
    async pageMeta(name) { return ((await load()).meta || {})[name] || null; },
    async pageSection(page, key) {
      const sec = ((await load()).pageSections || {})[page] || {};
      return key ? (sec[key] || null) : sec;
    },
    async team()         { return (await load()).team || []; },
    async milestones()   { return (await load()).milestones || []; },
    async certifications(){ return (await load()).certifications || []; },
    async sourcing()     { return (await load()).sourcing || []; },
    async faq()          { return (await load()).faq || []; },
    async blogFeatured() { return (await load()).blogFeatured || null; },

    async blogPosts(opts = {}) {
      const data = await load();
      let posts = data.blogPosts || [];
      if (opts.category) posts = posts.filter(p => p.category === opts.category);
      if (opts.limit) posts = posts.slice(0, opts.limit);
      return posts;
    },
    async products() {
      const data = await load();
      const items = data.products || [];
      return [...items].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    async meta() { return (await load())._meta || {}; }
  };
})();

/* ── Universal hydrator: page-hero, footer, meta tags ─────
   Pages opt in by adding data-page="<name>" to <body> or <html>.
   This auto-runs and patches common elements that exist on
   every page (footer tagline + copyright, page-hero block,
   meta tags). No-op if elements not present.
*/

// Insert anti-flash style as early as possible — body invisible until
// hydration finishes (or 1.5s timeout). Skip when data-page not set
// (admin pages, etc) so they don't get hidden unnecessarily.
(function antiFlash(){
  const pageName = (document.body?.dataset?.page || document.documentElement.dataset.page || '').trim();
  if (!pageName) return;
  const style = document.createElement('style');
  style.id = 'cms-antiflash';
  style.textContent = 'body[data-cms-loading]{opacity:0!important;transition:opacity .25s ease}body{opacity:1;transition:opacity .25s ease}';
  document.head.appendChild(style);
  document.documentElement.addEventListener('DOMContentLoaded', () => {
    document.body.setAttribute('data-cms-loading', '1');
  }, { once: true });
  // Fail-safe: never hide for more than 1.5s
  setTimeout(() => document.body && document.body.removeAttribute('data-cms-loading'), 1500);
})();

(async function autoHydrate(){
  if (!window.CMS) return;
  try {
    const data = await CMS.load();
    const pageName = (document.body.dataset.page || document.documentElement.dataset.page || '').trim();

    // Meta tags
    if (pageName && data.meta && data.meta[pageName]) {
      const m = data.meta[pageName];
      if (m.title) document.title = m.title;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && m.description) desc.setAttribute('content', m.description);
    }

    // Page hero (5 inner pages share .page-hero structure)
    if (pageName && data.pageHeroes && data.pageHeroes[pageName]) {
      const ph = data.pageHeroes[pageName];
      const bg = document.querySelector('.page-hero-bg');
      if (bg && ph.image) bg.style.backgroundImage = `url('${encodeURI(ph.image)}')`;
      const eb = document.querySelector('.page-hero-tag');
      if (eb && ph.eyebrow) eb.textContent = ph.eyebrow;
      const h1 = document.querySelector('.page-hero-h1');
      if (h1 && ph.headline) h1.innerHTML = sanitizeCmsHtml(ph.headline);
      const sub = document.querySelector('.page-hero-sub');
      if (sub && ph.sub) sub.textContent = ph.sub;
    }

    // Footer tagline + copyright
    const ft = data.footer || {};
    document.querySelectorAll('.foot-tagline').forEach(el => {
      if (ft.tagline) el.textContent = ft.tagline;
    });
    document.querySelectorAll('.foot-copy').forEach(el => {
      if (ft.copyright) el.textContent = ft.copyright;
    });

    // Footer contact (uses company.email/phone/hours)
    const co = data.company || {};
    document.querySelectorAll('.foot-contact-item').forEach(el => {
      const txt = el.textContent;
      if (/Email:/.test(txt) && co.email)  el.innerHTML = `<span>Email:</span> ${co.email}`;
      if (/Phone:/.test(txt) && co.phone)  el.innerHTML = `<span>Phone:</span> ${co.phone}`;
      if (/Hours:/.test(txt) && co.hours)  el.innerHTML = `<span>Hours:</span> ${co.hours}`;
    });
  } catch (err) {
    console.warn('[CMS auto-hydrate] failed (keeping static):', err.message);
  } finally {
    // Reveal the page now that hydration is done (or failed gracefully)
    if (document.body) document.body.removeAttribute('data-cms-loading');
  }
})();
