/* ═══════════════════════════════════════════════
   AGARWOODING — CMS DATA CLIENT
   Reads content/site.json. No backend.
═══════════════════════════════════════════════ */

window.CMS = (function () {
  const SOURCE = 'content/site.json';
  const ADMIN_URL = 'admin/';

  let cache = null;
  let inflight = null;

  async function load(force = false) {
    if (cache && !force) return cache;
    if (inflight) return inflight;
    inflight = fetch(SOURCE + '?v=' + Date.now())
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

    async hero()           { return (await load()).hero || {}; }
    ,
    async company()        { return (await load()).company || {}; }
    ,
    async blogFeatured()   { return (await load()).blogFeatured || null; }
    ,
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
