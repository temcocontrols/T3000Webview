# 07 — Offline outputs: website package, PDF, CHM

*Covers: Offline Documentation (all three subsections).*

Four artefacts, one source:

| Artefact | Producer | Audience | Offline |
|---|---|---|---|
| DocFX site (`_site/`) | `docfx build` | humans on the network | — |
| Offline website package (`T3000-Docs-<version>.zip`) | `_site` + relative-URL rewrite + zip | field laptops, partners | yes |
| PDF manual (`T3000-Learn.pdf`) | `docfx pdf` | printing, archival, translation | yes |
| CHM (`T3000_Help.chm`) | `npm run build:help` → `hhc.exe` | **F1 in the product** — the most important channel | yes |

DocFX produces the first three. It **cannot** produce a CHM (no CHM writer exists in it), which is why the
Node + `hhc.exe` pipeline stays — see `docs/help/DESIGN.md` for that pipeline's own details.

---

## 1. Offline website package

The site as built is *almost* offline-ready; the only things that break when the folder is opened from the
file system are root-relative URLs (in our case only the homepage uses them implicitly) and any remote
reference.

Build step — `scripts/docs-offline.mjs`, run by `npm run docs:offline`:

```
1. docfx build                                    →  _site/
2. pagefind --site _site                          →  _site/pagefind/**
3. audit _site/**/*.{html,css,js} for remote URLs  →  fail on any http(s):// fetch
                                                       (allow the ones in <a href> to external sites)
4. rewrite root-relative hrefs/srcs to relative     →  so file:// navigation works
5. verify search from file:// in a real browser     →  record the verdict in the release checklist
6. write OFFLINE-README.txt (version, commit, date, how to open)
7. zip  _site/  →  dist/T3000-Docs-<version>.zip
8. list the zip in docs/t3000/releases/<version>.md (the download page)
```

Details that matter:

- **Search works offline — after verification, not by assumption.** The Pagefind index ships inside the
  package; if it cannot be fetched from `file://`, the package falls back to the engine's own index. Either
  way a field laptop gets search without a network, and the release checklist records which index was used.
- **Images are already local** (the `remote-asset` rule forbids otherwise), so only URL form changes.
- **Zip layout** is flat: `index.html` at the root of the archive, so "extract and open `index.html`" is
  the whole instruction.
- The package is versioned by the same `version` field the registry uses, so it cannot be published
  untagged.
- Size budget: warn above 150 MB (images dominate; if exceeded, prune screenshots by `audience`).

---

## 2. PDF manual

PDF support requires **DocFX ≥ 2.73 and the modern template** (both satisfied by the pin).

Enable and build — `npm run docs:pdf`:

```
1. docfx build docs/docfx.json          # pdf: true also renders a "Download PDF" button on the site
2. docfx pdf   docs/docfx.json          # renders a PDF per TOC that has pdf: true
```

One manual, not many files: a **dedicated PDF TOC** produces exactly one PDF,

```yaml
# docs/toc.pdf.yml
order: 200                 # larger order ⇒ this TOC does not become the site's navigation
pdf: true
pdfFileName: T3000-Learn.pdf
pdfTocPage: true           # insert a "Table of Contents" page (page numbers clickable)
pdfCoverPage: cover.html   # must be built: docs/cover.md → _site/cover.html
items:
- name: Getting Started
  href: t3000/quick-start/toc.yml
- name: Device Management
  href: t3000/device-management/toc.yml
- name: Data Points
  href: t3000/data-points/toc.yml
- name: Features
  href: t3000/features/toc.yml
- name: Building Platform
  href: t3000/building-platform/toc.yml
- name: Design Studio
  href: t3000/t3-eez-studio/toc.yml
- name: API Reference
  href: t3000/api-reference/toc.yml
- name: Troubleshooting
  href: t3000/guides/toc.yml
```

Metadata that controls the PDF (all of it belongs in `toc.yml` / `docfx.json`, never in a page):

| Key | Value here | Effect |
|---|---|---|
| `pdf` | `true` global; `false` for `legacy/**`, `design/**` via `fileMetadata` | include/exclude an area |
| `pdfFileName` | `T3000-Learn.pdf` | output name (default `toc.pdf`) |
| `pdfTocPage` | `true` | "Table of Contents" pages with page numbers |
| `pdfCoverPage` | `cover.html` | full-bleed cover (`docs/cover.md`, built) |
| `pdfPrintBackground` | `true` | keep background graphics (cover, callouts) |
| `pdfHeaderTemplate` | custom HTML | running header, e.g. section name + T3000 |
| `pdfFooterTemplate` | custom HTML | `<span class='pageNumber'></span> / <span class='totalPages'></span>` |
| `pdfHeaderFooterOnCover` | `false` | clean cover |
| `pdfHeaderFooterOnToc` | `true` | numbered TOC pages |

Precedence for these keys is `fileMetadata` > values in `toc.yml` > `globalMetadata`, and values are
selected per key (not deep-merged) — so exclude the engineering areas with `fileMetadata.pdf: false`
instead of trying to subtract inside the PDF TOC.

Cover and print styling (CSS in `templates/t3000/public/main.css`):

```css
@page { margin: 12mm }
@media print {
  pre, table { break-inside: avoid }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: .85em }  /* printable links */
}
/* full-bleed cover */
.cover { @page { margin: 0 } print-color-adjust: exact }
/* TOC page: .pdftoc h1 / ul / li / .page-number / .spacer */
```

Verification (manual, per release): cover present, TOC page numbers correct, headers/footers on article
pages only, no clipped code blocks, no page with a stray "Loading…" placeholder, PDF opens in two readers,
bookmarks/outline present.

---

## 3. CHM (unchanged pipeline, added guarantees)

```
docs/help/manual.json  →  .hhp / .hhc / .hhk  →  hhc.exe  →  T3000_Help.chm  →  copied next to T3000.exe
```

What this design adds on top of the existing pipeline:

| Addition | Why |
|---|---|
| Manifests are **generated from the registry** | one structure drives the CHM and the site |
| Parity assertion: `toc.yml` page set == manifest page set | a page can never exist in one and not the other (`03-site-project.md` §4) |
| Keywords from `registry.keywords` → `.hhk` | the CHM index is curated, not scraped |
| `help_ids` from the registry → `[ALIAS]` / `[MAP]` | F1 context-sensitive help, generated rather than hand-maintained (see the F1 map task in `13-implementation-plan.md`) |
| Build is a documented npm script with a dry-run | reproducible local and CI builds |
| Verification checklist | opened CHM, F1 from a known topic, search, no missing images |

CHM verification checklist (manual, per build — the compiler's exit code is unreliable, judge by the
output file):

```
1. T3000_Help.chm exists and is > 20 MB
2. opens in the help viewer; the contents tree expands to 2 levels
3. Contents top-level books == the manual.json chapters
4. search for "trendlog" and "BACnet" returns hits
5. Index tab lists the curated keywords
6. F1 from the main dialog opens the expected topic (needs the F1 map task)
7. no "page cannot be displayed" placeholder: spot-check 5 pages with images
```

---

## 4. Cross-output parity (the point of the whole design)

| Check | Tool | Failure means |
|---|---|---|
| Site page set == CHM manifest page set | `docs:registry --check` | structure edited in one place only |
| Every page renders in all three | build + compare page counts | a glob or exclude is wrong |
| No remote assets in `_site` or `_chm` | `docs:blocking` | offline reading would break |
| Broken links = 0 in the site build | warning count vs baseline | a link was written by hand and rotted |
| Media: no missing / oversized; unused reported | `docs:media --check` | image rot, the most common decay |
| PDF page count > 0 and covers every user chapter | `docs:pdf` + manual check | PDF TOC drifted from the site TOC |
| Search works from `file://` in the offline package | manual, recorded per release | users open the zip, not a server |

---

## 5. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | `scripts/docs-offline.mjs` (audit → rewrite → zip) + `npm run docs:offline` | 4 |
| 2 | `docs/cover.md` + cover/print CSS | 4 |
| 3 | `docs/toc.pdf.yml` + `pdf*` metadata + `npm run docs:pdf` | 4 |
| 4 | Download page block in `docs/t3000/releases/<version>.md` (generated) | 4 |
| 5 | Registry-generated CHM manifests + keywords + `help_ids` | 1 |
| 6 | CHM deployment step in the installer (copy next to `T3000.exe`) | 1 |
| 7 | The verification checklists as release-checklist items | 1 |
| 8 | Media report in the audit: missing / unused / duplicate / oversized | 1 |
| 9 | Version snapshot publish + **retention (current + last 3, media shared)** | 4 |

**Acceptance:** unzipping the offline package on an air-gapped machine gives a browsable, searchable site;
`T3000-Learn.pdf` has a cover, a numbered TOC and no engineering area; `T3000_Help.chm` opens with the
expected trees and its F1 topics resolve for the topics in the map.

---

## 6. Build & publish chain (the product payload)

The docs ship **inside the product**: one product build, one publish pass, one runtime folder tree. No
separate deployment, no second server, no manual copy.

```
npm run build                        (ONE product build — the docs ride along)
  ├─ 1  quasar build        →  dist/spa/                    the app
  ├─ 2  docs:registry       →  docs/docfx.json, docs/toc.yml, docs/help/*.json   (generated)
  ├─ 3  docs:site           →  dist/docs/                   docfx build + pagefind
  ├─ 4  build:help          →  T3000_Help.chm               (needs hhc.exe on the build host)
  └─ 5  publish:webview     →  scripts/publish-webview.mjs  one pass, three targets:
                                 dist/spa/*     →  …\ResourceFile\webview\www\
                                 dist/docs/*    →  …\ResourceFile\webview\docs\   ← sibling, NOT www\docs
                                 T3000_Help.chm →  next to T3000.exe

runtime:  T3000.exe → rust service →  http://localhost:9103
            /         the app  (www)
            /docs/    the site (docs, from DOCS_DIR — a sibling folder, never inside www)
            /api/*    REST + MCP
```

| Step | Command | Output |
|---|---|---|
| 1 | `npm run build` → `quasar build` | `dist/spa/` |
| 2 | `npm run docs:registry` | `docs/docfx.json`, `docs/toc.yml`, `docs/help/*.json` |
| 3 | `npm run docs:site` | `dist/docs/` (docfx build + pagefind) |
| 4 | `npm run build:help` | `T3000_Help.chm` |
| 5 | `npm run publish:webview` | `…\ResourceFile\webview\{www,docs}` + CHM beside `T3000.exe` |

Rules and gotchas:

1. `quasar build` **clears `dist/spa`**, so the site is emitted to its own `dist/docs` **after** the app
   build and placed by the publish step — never written into `dist/spa`.
2. `publish:webview` copies `dist/docs/*` into `ResourceFile\webview\docs\` — a **sibling** of `www`. The API
   serves it through `DOCS_DIR` + `.nest("/docs", routes_docs())`.
3. **Every** other mechanism that copies or mirrors `www` (installer, the product's own auto-update) must
   carry `docs` too, or customers get a stale or missing site.
4. **WebView2 cache**: `%LOCALAPPDATA%\T3000\EBWebView\` has served stale assets in this project before, so
   the site's HTML/CSS/JS carry a build stamp (`?v=<build>`), and the update path clears the cache.
5. `npm run deploy:t3000` and `deploy:t3000:build` are **dead** — `scripts/deploy-to-t3000.bat` does not
   exist and `build:webview` is not defined. `publish:webview` replaces both and fixes the app's own deploy.
6. Docs-only paths for local work: `npm run docs:site`, `docs:serve` (:8080, **dev only — never deployed**),
   `docs:pdf`, `docs:offline`.

**Acceptance (deploy):** after `npm run build` and `npm run publish:webview`, `T3000.exe` on a clean machine
serves `http://localhost:9103/` (the app) and `http://localhost:9103/docs/` (the site) with no additional
service, F1 opens the CHM, and nobody had to copy a file by hand.
