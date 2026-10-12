/* T3000 template entry module.
 *
 * The modern template loads this file (a custom template's `public/main.js`) as an ES module and
 * uses its default export as template options. Everything here is additive: if a feature cannot
 * run, it must silently do nothing rather than break the page.
 */

/** Absolute site root, derived from where this script was served from. */
const SITE_ROOT = (() => {
  try {
    return new URL('.', document.currentScript.src);
  } catch {
    return null;
  }
})();

/** The page id, e.g. "t3000/features/trendlogs", derived from the URL under the site root. */
function pageId() {
  if (!SITE_ROOT) return null;
  const rel = decodeURIComponent(location.pathname.slice(SITE_ROOT.pathname.length));
  return rel.replace(/\/index\.html$/, '').replace(/\.html$/, '') || 'index';
}

let metaCache = null;

async function loadMeta() {
  if (metaCache) return metaCache;
  if (!SITE_ROOT) return null;
  try {
    const res = await fetch(new URL('help/page-meta.json', SITE_ROOT), { cache: 'no-cache' });
    if (!res.ok) return null;
    metaCache = await res.json();
    return metaCache;
  } catch {
    return null; // offline package, file://, or the file is genuinely absent
  }
}

/** Small "Updated / owner / reviewed" strip above the article. */
async function mountPageMeta() {
  const article = document.querySelector('article') || document.querySelector('main');
  if (!article) return;
  const id = pageId();
  if (!id) return;

  const meta = await loadMeta();
  const entry = meta?.[id];
  if (!entry) return;

  const bar = document.createElement('div');
  bar.className = 't3-pagemeta';

  const bits = [];
  if (entry.updated) bits.push(`<span>Updated <strong>${entry.updated}</strong></span>`);
  if (entry.sha) bits.push(`<span>commit <code>${String(entry.sha).slice(0, 7)}</code></span>`);
  if (entry.owner) bits.push(`<span class="t3-pagemeta-owner">${entry.owner}</span>`);
  if (entry.stale) bits.push('<span class="t3-chip t3-chip-warn">may be out of date</span>');
  if (!bits.length) return;

  bar.innerHTML = bits.join('<span aria-hidden="true">·</span>');
  article.parentElement?.insertBefore(bar, article);
}

/** Point "Edit this page" at GitHub's *editor* instead of its viewer (one click, like MS Learn). */
function fixEditLink() {
  for (const a of document.querySelectorAll('a[href*="github.com"][href*="/blob/"]')) {
    const label = (a.textContent || '').toLowerCase();
    if (!label.includes('edit')) continue;
    a.href = a.href.replace('/blob/', '/edit/').replace(/#L\d+$/, '');
  }
}

export default {
  defaultTheme: 'light',
  start: () => {
    fixEditLink();
    mountPageMeta();
  },
};
