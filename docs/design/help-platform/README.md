# T3000 Learn Platform — design package

This folder is the **engineering design** for the T3000 documentation platform: a DocFX documentation
website, its offline outputs (website zip, PDF, CHM), the tooling that generates all of them from one
Markdown source, and the AI-assisted maintenance loop.

Read `01-plan.md` for the platform design (the "what and why"). Every other file is the **buildable
detail** for one part of it — schemas, file paths, commands, code sketches and acceptance tests.

## The engine decision, in one line

The website is built with **DocFX** — and because Microsoft Learn moved off DocFX in November 2022, the
project is now community-driven (`.NET Foundation`), so we **clone the DocFX repository** at
`tools/docfx`, pin a commit, build it ourselves, and own our template and any engine patches. The CHM is
still produced by the existing Node pipeline + `hhc.exe`, because DocFX cannot emit CHM.

## Document map

| # | Document | Covers plan sections | You get |
|---|---|---|---|
| 01 | [`01-plan.md`](01-plan.md) | Vision, Philosophy, six layers, all feature sections, tech stack | the platform design (authoritative for scope) |
| 02 | [`02-docfx-engine.md`](02-docfx-engine.md) | Overall Architecture → Layer 2, Technology Stack | how to clone, build, pin, run, upgrade and patch DocFX |
| 03 | [`03-site-project.md`](03-site-project.md) | Layer 1–2, Content Organization, Version Management | `docfx.json`, `toc.yml`, URL map, file metadata, log rules |
| 04 | [`04-template.md`](04-template.md) | Website Design, Editing System (portal side) | the `t3000` template: CSS, `main.js`, homepage, article zones, widgets |
| 05 | [`05-content-and-registry.md`](05-content-and-registry.md) | Content Organization, Documentation Metadata | `registry.json` schema, generators, parity assertion |
| 06 | [`06-search.md`](06-search.md) | Search System, Layer 4 | DocFX lunr index, facets, in-app search, Pagefind fallback |
| 07 | [`07-offline-pdf-chm.md`](07-offline-pdf-chm.md) | Offline Documentation | offline site package, `docfx pdf`, CHM pipeline and their parity |
| 08 | [`08-editing-and-git.md`](08-editing-and-git.md) | Editing System, Git Integration | author/date/commit surfaces, preview, review, PR flow |
| 09 | [`09-feedback-subscriptions-notifications.md`](09-feedback-subscriptions-notifications.md) | Feedback, Subscription, Notification | endpoints, tables, RSS, routing, aging |
| 10 | [`10-changelog-releases-versioning.md`](10-changelog-releases-versioning.md) | What's New, Release Notes, Version Management | changelog generation, release drafts, `versions.json`, per-tag sites |
| 11 | [`11-review-and-cicd.md`](11-review-and-cicd.md) | Documentation Review Process | ownership, staleness rules, `docs-owed`, workflows, publish, rollback |
| 12 | [`12-ai-features.md`](12-ai-features.md) | Future AI Features | commit analysis, impact analysis, stale detection, assistant |
| 13 | [`13-implementation-plan.md`](13-implementation-plan.md) | Implementation Plan, Detailed Starting Steps | phases as PR-sized tasks with acceptance tests and a week-by-week phase 1 |

Related, outside this folder:

- `docs/help/DESIGN.md` — the CHM pipeline and `docs/help/*.json` manifest format (unchanged by this design).
- `docs/help/README.md` — the CHM collection definitions.
- `scripts/audit-docs.mjs`, `scripts/build-t3000-help-chm.mjs` — the existing docs tooling.

## Locked decisions

These are not open questions; everything in this folder assumes them.

1. **One source.** Markdown in `docs/**` in the T3000 repository. No second content store, no page copies.
2. **DocFX is the web engine** (`dotnet/docfx`, cloned and pinned at `tools/docfx`). Site, offline site,
   PDF and the search index all come from `docfx build` / `docfx pdf`.
3. **CHM is the Node pipeline** (`npm run build:help` → `hhc.exe`). DocFX cannot produce CHM; F1
   help stays a shipping artifact.
4. **No file moves.** Pages stay at `docs/t3000/**` and `docs/legacy/**`; the app, the MCP tools and
   every inbound link depend on those paths.
5. **No page-level metadata.** No YAML front matter added to shipped pages. Everything a page needs
   (title, owner, chapter order, tags, code globs) lives in `docs/help/registry.json`, and DocFX receives
   it through generated `toc.yml` / `docfx.json` (`globalMetadata`, `fileMetadata`).
6. **Offline first.** Every published page must render with no network: no remote fonts, images, scripts
   or styles. `npm run docs:blocking` enforces this and now also runs over `_site`.
7. **The engine is ours.** Clone + pin + patch; never depend on a floating global `docfx`.
8. **One page set everywhere.** CI fails if `toc.yml` and the CHM collection manifests disagree.
9. **Humans approve prose.** AI may summarise, detect and draft; a named owner approves before publish.
10. **No vendor or product names in shipped docs** other than T3000's own.

## Prerequisites for phase 1

| Tool | Version | Needed for | Notes |
|---|---|---|---|
| .NET SDK | 8.x / 9.x / 10.x | building and running DocFX | DocFX targets these |
| Node.js | 24.x | building the DocFX site templates (`templates/` in the DocFX repo) | this repo also uses Node for its own scripts |
| Git | any | submodule clone, provenance | — |
| HTML Help Workshop | installed at `C:\Program Files (x86)\HTML Help Workshop` | CHM only | `hhc.exe`; judge success by the output file, its exit code is unreliable |
| Visual Studio 2022 | optional | DocFX contributors only | not needed for CLI builds |
| `git-lfs` | optional | only DocFX's own snapshot tests | `git lfs checkout` |

## DocFX vocabulary used in these documents

| Term | Meaning here |
|---|---|
| `docfx.json` | the site project file; everything is relative to its directory |
| content / resource | globs for files that become pages (`.md`, `.yml`) vs files copied as-is (images) |
| file mapping | short form `["**/*.md"]` or expanded `{files, exclude, src, dest}` |
| TOC | a `toc.yml` file; the one beside `docfx.json` is the top navigation bar |
| nested vs reference TOC | nested = one TOC inside another; reference = `href: folder/` linking to that folder's TOC |
| template | DocFX's HTML rendering: `default` → `modern` → ours (`templates/t3000`) |
| theme | CSS layer applied on top of a template (we use the template's `public/` folder instead) |
| metadata | DocFX page metadata: `globalMetadata` (all pages), `fileMetadata` (globs → values) |
| `_layout` | `landing` or `chromeless` page layouts in the modern template |
| xref / xrefmap | cross-reference by `uid`; DocFX writes `xrefmap.yml` into the output folder |
| affix | the right-hand rail ("In this article") in the modern template |
