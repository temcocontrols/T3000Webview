# 06 — Search

*Covers: Search System · Layer 4.*

Four search surfaces, in order of when they arrive:

| # | Surface | Engine | Phase |
|---|---|---|---|
| 1 | **Offline CHM search** | `hhc.exe` full-text index compiled into `T3000_Help.chm` | exists |
| 2 | **Website search** | the search index `docfx build` writes into `_site/`, consumed by the modern template's search box | 1 |
| 3 | **In-app documentation page search** | the same Pagefind index served statically, filtered to the in-app trees | 1 |
| 4 | **Natural-language answers** | the MCP doc tools over the corpus, answers citing pages | 5 |

Facets (product, category, version, tag) are **ours**: DocFX search is plain full text, so the facet
filters are implemented in `templates/t3000/public/main.js` from `docs/help/index.json`, applied to the
results the template returns. No server, no OpenSearch until a hosted portal with real facet requirements
is approved.

---

## 1. What the build gives us, and what we add

The engine builds a site and writes its own search data into `_site/`. We use that for structure, and put
**Pagefind** in front of it for the search UI:

| Piece | Choice | Why |
|---|---|---|
| Search index + UI on the site | **Pagefind** over the built HTML | better ranking on short queries, chunked index (only the matching shard is fetched), works on a static host, no service |
| The engine's own search box | **disabled** (`_enableSearch: false`) | one search UI, not two; the engine's data stays in the build as a fallback |
| Engine index `_site/index.json` | kept | fallback for the offline package and for the in-app page if Pagefind cannot load there |
| `_noindex` | `design/**`, `help/**` | never in results; `legacy/**` stays searchable — it is what a developer greps for |
| CHM | `hhc.exe` index | unchanged; it lives inside the help file and never competes with the site |

Sanity checks after every build (part of the CI gate):

```
Pagefind index exists and is non-empty (_site/pagefind/…)
indexed page count >= ship count − noindex count
search for a known string ("trendlog") returns the expected page
search for a nonsense string returns zero results without an error
```

**Offline caveat, to verify rather than assume:** a Pagefind index is fetched at runtime, which can be
blocked when the site is opened from `file://`. The offline package step must load it from a real local
browser; if it fails, the package falls back to the engine's own index (`07-offline-pdf-chm.md` §1). Same
index distribution, two environments, one verification each.

---

## 2. Facets (ours)

`main.js`:

```
start() → if search UI present:
  fetch('docs-meta.json')            # generated: { pages: {id: {category, product, version, tags}} }
  render facet chips above the results:  Category · Product · Version · Tag
  on results update: filter rows whose page id's facets do not match the active chips
  persist the chips in location.hash so a filtered search is linkable
```

Data source: `docs/help/index.json` (copied to `_site/docs-meta.json` by the build script). Nothing extra
is computed — the registry already holds every facet value.

Version filtering uses the `version` field, which is only meaningful once phase 4 publishes per-tag sites
(`10-changelog-releases-versioning.md`); until then the version facet is hidden.

---

## 3. In-app documentation page

The React page keeps its own layout; it gains search by fetching the same index:

| Step | Detail |
|---|---|
| 1 | `docs:site` copies the search data file and `docs-meta.json` to a path the app can read (`/docs/_site-meta/…`, or the app's `public/` folder at build time) |
| 2 | the page loads it lazily on first focus of the search box (no cost on normal navigation) |
| 3 | results are filtered by the two in-app trees (T3000 / Design Studio / Legacy) so a search never jumps the user out of the page they are reading |
| 4 | clicking a result routes through the existing `onNavigate` handler (in-app), with a "open on the website" secondary link |

Fallback rule: Pagefind is the primary index. The engine's own index is the fallback for environments where
a chunked, runtime-fetched index cannot load, and for the CHM (which has its own). If a future need outgrows
Pagefind (cross-version search, facets over millions of documents), the escalation is OpenSearch in a hosted
portal — and it is decided on measurements from §4, never on preference.

---

## 4. Analytics (traffic, searches, health)

First-party only: same-origin beacons to our own endpoint on `/docs/`. No third-party script exists in this
design — the offline rule forbids remote assets, and analytics is exactly where a documentation site
usually leaks usage to somebody else.

| Event | Payload | Used for |
|---|---|---|
| page view | `{page, version, ref}` | most-viewed pages; which areas matter |
| search | `{q, resultCount, clicked}` | most-searched terms; search quality |
| zero-result search | `{q}` | **missing content** — the highest-value signal we can collect |
| feedback | see `09-…` | quality per page |

Aggregation (weekly, into `docs/help/reports/analytics-<date>.md` and the `_admin` dashboard):

```
Top 20 searches            what people want
top 20 zero-result queries what is missing -> to-do list entries owned by the docs owner
most viewed pages          where polish pays off
feedback ratio per owner   quality trend
health score               staleness + broken links + unreviewed pages + feedback ratio -> one number
```

Privacy and cost: no cookies, no identifiers, no third-party network calls, nothing that identifies a user;
events are aggregated, not stored per visitor. A zero-result query seen three times in a month becomes a
review-queue entry (`01-plan.md`, Documentation Review Process).

### Turning searches into content

Every zero-result query is one of exactly three things: a synonym problem (add it to the page's `keywords`),
a missing page, or a badly titled page. The weekly review classifies each one and closes it — that loop is the
cheapest documentation improvement available to us, and it only works because the signal is collected.

---

## 5. Natural-language search (phase 5)

Inputs: the question, `index.json` (ids, titles, headings, tags, owners). Procedure:

1. Retrieve candidate pages (keyword + embedding over `title`/`headings`/`tags`).
2. Read the candidates through the MCP doc tools.
3. Answer with **page references**, never free-floating prose; if confidence is low, answer with the
   search results instead of a synthesis.
4. Log the question and the cited pages — that log feeds the same to-do list as §4.

Constraints: internal/partner only until an accuracy review against the 20-question set passes; no
customer-facing answer without a page citation; answers never come from pages flagged `stale`.

---

## 6. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | Pagefind run in `docs:site` (post-build) + disable the engine's search box | 1 |
| 2 | Search UI in `main.js` (Pagefind component, styled to the theme) | 1 |
| 3 | `fileMetadata._noindex` for `design/**`, `help/**` | 1 |
| 4 | Copy the index + `docs-meta.json` into the app's reach; wire in-app search | 1 |
| 5 | Facet chips in `main.js` (from `docs-meta.json`) | 1 |
| 6 | 20-question ranking baseline recorded (same set reviews the phase-5 assistant) | 1 |
| 7 | `file://` verification for the offline package; the fallback is decided by measurement | 4 |
| 8 | Page/search beacons + weekly aggregation + health score | 3 |
| 9 | Natural-language search over the MCP tools | 5 |

**Acceptance:** searching "trendlog" and "static pressure" in the built site returns the expected pages;
`design/**` and `help/**` never appear; facet chips filter correctly and are linkable; the in-app page
searches without leaving the page; the offline package and the CHM both search with no network, and the
`file://` check is recorded in the release checklist either way.
