# 05 — Content, the registry and the generated metadata

*Covers: Layer 1 Content Repository · Content Organization · Documentation Metadata.*

Everything a page needs that is *not* its text lives in **one file**: `docs/help/registry.json`. Pages stay
plain Markdown with no front matter, in their current folders. The DocFX project, the CHM manifests, the
in-app navigation, the search facets and the staleness reports are all projections of that one file.

```
docs/help/registry.json  ──►  docfx.json · toc.yml (×4) · collection manifests (×3)
                         ──►  index.json · page-meta.json · versions.json
                         ──►  in-app nav · CHM .hhc/.hhk · F1 id map
```

---

## 1. Repository layout (nothing moves)

```
docs/
├─ t3000/                 product documentation          (user audience, ships in the CHM + site)
├─ legacy/                engineering notes               (developer audience, site only)
├─ design/help-platform/  this design package            (contributing audience, site, noindex)
├─ help/                  build definitions + registry   (not content)
│  ├─ registry.json       ← the single source of the structure
│  ├─ manual.json         → T3000_Help.chm               (generated)
│  ├─ reference.json      → T3Web_Ref.chm                (generated, on demand)
│  ├─ engineering.json    → T3Web_Dev.chm                (generated, on demand)
│  ├─ index.json          full page index + provenance   (generated)
│  ├─ page-meta.json      runtime metadata for the site  (generated)
│  └─ versions.json       version → site URL             (generated)
└─ todo/                  working file (excluded from every output)
```

Rules that keep this stable:

1. **No page is moved or renamed** — the app, the MCP tools and inbound links depend on these paths.
2. **No front matter is added to a shipped page.**
3. Structure changes are registry edits, not file moves. A "reorganization" in this platform means a
   different `chapter`/`order`, i.e. a different TOC — the files never move.
4. `docs/design/**` and `docs/help/*.md` are published as the *Contributing* area and are `_noindex`ed.

---

## 2. `registry.json` — schema v1

`docs/help/registry.schema.json` is the JSON-Schema; `scripts/docs-registry.mjs` validates against it.

```jsonc
{
  "$schema": "./registry.schema.json",
  "version": 1,
  "generated": "2026-10-10",
  "products": {
    "t3000":  { "title": "T3000", "url": "/docs/t3000/" },
    "studio": { "title": "Design Studio", "url": "/docs/t3000/t3-eez-studio/" },
    "legacy": { "title": "Engineering notes", "url": "/docs/legacy/" }
  },
  "categories": {
    "products":      { "title": "Products",      "order": 10 },
    "protocols":     { "title": "Protocols",     "order": 20 },
    "reference":     { "title": "Reference",     "order": 30 },
    "tutorials":     { "title": "Tutorials",     "order": 40 },
    "troubleshooting": { "title": "Troubleshooting", "order": 50 },
    "development":   { "title": "Development",   "order": 60 },
    "releases":      { "title": "Release notes", "order": 70 }
  },
  "areas": {                              // what becomes a toc.yml and a docfx content entry
    "t3000":  { "title": "T3000",  "site": true, "chm": ["manual", "reference"], "noindex": false },
    "legacy": { "title": "Legacy / Engineering", "site": true, "chm": ["engineering"], "noindex": false },
    "design": { "title": "Contributing", "site": true, "chm": [], "noindex": true }
  },
  "pages": {
    "t3000/features/trendlogs": {
      "title": "Trend Logs",
      "category": "products",
      "product": "t3000",
      "audience": "user",              // user | developer | contributing
      "area": "t3000",
      "chapter": "features",           // the TOC parent
      "order": 40,                     // position inside the chapter
      "ship": true,                    // appears in the CHM + the site
      "keywords": ["trend log", "history"],
      "tags": ["trend", "history", "chart"],
      "owner": "trendlog",
      "reviewer": "docs",
      "version": "v26.0930",
      "help_ids": ["IDH_TOPIC_TREND_LOGS"],
      "code": ["src/t3-react/features/trendlog/**", "api/src/t3_device/trendlog*.rs"],
      "reviewed": { "sha": "a1b2c3d", "date": "2026-10-09", "by": "docs" }
    }
  },
  "exclude": {
    "todo/notes.md": "scratch file",
    "help/DESIGN.md": "internal build documentation"
  }
}
```

### Validation rules (all `error` unless noted)

| Rule | Message |
|---|---|
| Every `.md` under `t3000/`, `legacy/`, `design/` is either a `pages` key or an `exclude` key | `unregistered page: <path>` |
| `chapter` exists as a chapter of the page's area | `unknown chapter` |
| `order` unique inside `chapter` | `duplicate order` (warning) |
| `ship: true` ⇒ `owner`, `chapter`, `order`, `code` present | `shipped page missing <field>` |
| `code` globs are unique across pages | `ambiguous ownership: <glob> claimed by X and Y` |
| `code` globs match at least one file | `glob matches nothing` |
| `help_ids` unique | `duplicate help id` |
| `area` matches the page's path prefix | `area mismatch` |
| `category` exists | `unknown category` |
| `version` is a key of `versions.json` | `unknown version` |

---

## 3. Generated artefacts

### `docs/help/index.json`

The in-app page, the portal and the AI layer all read this; nothing parses Markdown twice.

```json
{
  "generated": "2026-10-10",
  "commit": "a1b2c3d",
  "version": "v26.0930",
  "pages": [
    {
      "id": "t3000/features/trendlogs",
      "url": "/docs/t3000/features/trendlogs.html",
      "title": "Trend Logs",
      "area": "t3000",
      "chapter": "features",
      "order": 40,
      "category": "products",
      "product": "t3000",
      "audience": "user",
      "tags": ["trend", "history", "chart"],
      "keywords": ["trend log"],
      "owner": "trendlog",
      "version": "v26.0930",
      "git": { "sha": "a1b2c3d", "author": "…", "date": "2026-10-09T11:02:00Z" },
      "reviewed": { "sha": "a1b2c3d", "date": "2026-10-09", "by": "docs" },
      "stale": false,
      "headings": ["Overview", "Setup", "Fields"],
      "code": ["src/t3-react/features/trendlog/**"]
    }
  ]
}
```

`headings` and `git` are filled by the generator: headings by parsing the page, git by
`git log -1 --format=… -- <path>`.

### `docs/help/page-meta.json` (runtime, small)

Only what `main.js` needs per page (keeps the client payload tiny):

```json
{ "t3000/features/trendlogs": { "updated": "2026-10-09", "sha": "a1b2c3d", "owner": "trendlog", "stale": false, "v": "v26.0930" } }
```

### `docs/help/versions.json`

```json
{ "current": "v26.0930", "items": [ { "version": "v26.0930", "url": "https://<host>/docs/", "current": true },
                                     { "version": "v26.0610", "url": "https://<host>/docs/v26.0610/", "current": false } ] }
```

### The five DocFX-facing files

`docfx.json`, `docs/toc.yml`, `docs/t3000/toc.yml`, `docs/legacy/toc.yml`, `docs/design/toc.yml` — see
`03-site-project.md` for their exact shape and the parity assertion.

---

## 4. Staleness

One rule, computed at generation time and stored in `index.json`:

```
stale  ⇔  ∃ commit touching a path matching page.code  with  date > page.reviewed.date
```

- `family of signals` in the report: days since `reviewed.date` (90 / 180 / 365 thresholds).
- The weekly report (`11-review-and-cicd.md`) groups stale pages by `owner`.
- The page itself shows a chip, sourced from `page-meta.json` (never written into the Markdown).

---

## 5. Tasks

1. `docs/help/registry.schema.json`; `scripts/docs-registry.mjs` with `--check` / `--dry-run`.
2. Seed `pages` from the file tree (one pass) + `exclude` entries with reasons; keep `manual.json`'s
   chapter structure as the initial `chapter`/`order` values so the CHM does not change on day one.
3. Fill `owner`, `reviewer`, `category`, `product`, `keywords`, `help_ids` for the 53 shipped pages.
4. Implement `index.json`, `page-meta.json`, `versions.json` emitters + the staleness pass.
5. Implement the five DocFX-facing emitters and the parity assertion.
6. Point the CHM build at the generated manifests (`docs/help/*.json`), delete the hand-written ones from
   the build path.
7. Point the in-app navigation (`docStructure.ts`) at `index.json`.

**Acceptance:** `npm run docs:registry --check` clean; every shipped page has an owner; the CHM built from
generated manifests is page-for-page identical to the previous one; `index.json` lists `headings` for every
page; a page with a modified `code` glob reports `stale: true`.
