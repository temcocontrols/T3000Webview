# 06 — Search

*Covers: Search System · Layer 4.*

Four search surfaces, in order of when they arrive:

| # | Surface | Engine | Phase |
|---|---|---|---|
| 1 | **Offline CHM search** | `hhc.exe` full-text index compiled into `T3000_Help.chm` | exists |
| 2 | **Website search** | the search index `docfx build` writes into `_site/`, consumed by the modern template's search box | 1 |
| 3 | **In-app documentation page search** | the same `_site` index (or a Pagefind pass over `_site/`) served statically | 1 |
| 4 | **Natural-language answers** | the MCP doc tools over the corpus, answers citing pages | 5 |

Facets (product, category, version, tag) are **ours**: DocFX search is plain full text, so the facet
filters are implemented in `templates/t3000/public/main.js` from `docs/help/index.json`, applied to the
results the template returns. No server, no OpenSearch until a hosted portal with real facet requirements
is approved.

---

## 1. What the build gives us

- `docfx build` writes the site's search data into `_site/` (the modern template ships the search UI and
  fetches that data — filename and format belong to the pinned template version, so read it from
  `tools/docfx/templates/modern/` rather than assuming).
- `_enableSearch: true` in `docfx.json` renders the search box (`false` = no search on the site).
- `_noindex: true` (via `fileMetadata`) removes a page from the results. We set it for
  `design/**` and `help/**` and leave `legacy/**` searchable — engineering notes are exactly what a
  developer greps for.
- The offline package ships the same index, so search works from a local folder and inside the CHM
  (the CHM uses its own index, so the two never compete).

Sanity checks after every build (part of the CI gate):

```
_site/index.json exists and is non-empty
number of indexed pages >= ship count − noindex count
search for a known string ("trendlog") returns the expected page
```

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

Fallback rule: if the DocFX index turns out to rank poorly for short queries (measured on a fixed query
set — 20 real support questions), add a **Pagefind** post-build pass over `_site/` and serve *that* index
instead. Pagefind is the only approved alternative, and only for ranking, never for content model.

---

## 4. Query quality log

Every search the user abandons is a documentation gap. Phase 3 adds a tiny beacon on the portal (off by
default, enabled per host): `{q, resultCount, clicked}` posted to the feedback endpoint. The monthly review
turns "queries with zero results" into a documentation to-do list — this is the cheapest, most honest
signal we will ever get about missing content.

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
| 1 | Verify the built search index and record the check as a CI gate | 1 |
| 2 | `fileMetadata._noindex` for `design/**`, `help/**` | 1 |
| 3 | Copy the index + `docs-meta.json` into the app's reach; wire in-app search | 1 |
| 4 | Facet chips in `main.js` | 1 |
| 5 | Query set (20 support questions) + ranking baseline | 1 |
| 6 | Pagefind evaluation against that baseline (only if the DocFX index fails it) | 1 |
| 7 | Zero-result beacon + monthly review ritual | 3 |
| 8 | Natural-language search over the MCP tools | 5 |

**Acceptance:** searching "trendlog" and "static pressure" in the built site returns the expected pages;
`design/**` and `help/**` never appear; facet chips filter correctly and are linkable; the in-app page
searches without leaving the page; the offline site and the CHM both search with no network.
