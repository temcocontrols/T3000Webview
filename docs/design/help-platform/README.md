# T3000 Learn Platform — design package

This folder is the **engineering design** for the T3000 documentation platform: a DocFX documentation
website, its offline outputs (website zip, PDF, CHM), the tooling that generates all of them from one
Markdown source, and the AI-assisted maintenance loop.

Read `01-plan.md` for the platform design (the "what and why"). Every other file is the **buildable
detail** for one part of it — schemas, file paths, commands, code sketches and acceptance tests.

For a management-level summary — requirements, the system picture, phases and the decisions requested —
read `16-management-overview.md`. It is the only file in this folder written for a non-engineering reader.

## The engine decision, in one line

The website is published by **DocFX**, and the policy is **pin first, patch last**: phase 1 runs a pinned
official release recorded in `tools/docfx.pin` (with the local tool manifest committed), and cloning
`dotnet/docfx` **as a sibling folder** (`C:\QN\temcocontrols\docfx`, pointed at by `DOCFX_REPO`) and
building it from source is the documented **mode A** escalation for when we need full control, an actual
patch, or an offline-only build host. **Never a submodule, never vendored** — the engine is a separate
checkout, not part of this tree. The CHM is still produced by the existing Node pipeline + `hhc.exe`,
because DocFX cannot emit CHM.

Why that framing: DocFX grew out of Microsoft's documentation toolchain, and the project's own README says
Microsoft Learn no longer uses it and does not intend to support it (November 2022), continuing instead as a
community-driven .NET Foundation project. The current Learn architecture is not public. So we neither chase
Microsoft's stack nor assume upstream owes us a fix — we pin, verify, and keep patching as an option we have
designed for but do not pay for on day one.

## Document map

| # | Document | Covers plan sections | You get |
|---|---|---|---|
| 00 | [`00-architecture.md`](00-architecture.md) | the whole picture | ASCII figures: system, disk layout, ports/mounts, the two sites, data flow, phases — **plus "what to do now"** |
| 01 | [`01-plan.md`](01-plan.md) | Vision, Philosophy, six layers, all feature sections, tech stack | the platform design (authoritative for scope) |
| 02 | [`02-docfx-engine.md`](02-docfx-engine.md) | Overall Architecture → Layer 2, Technology Stack | how to clone, build, pin, run, upgrade and patch DocFX |
| 03 | [`03-site-project.md`](03-site-project.md) | Layer 1–2, Content Organization, Version Management | `docfx.json`, `toc.yml`, URL map, file metadata, log rules |
| 04 | [`04-template.md`](04-template.md) | Website Design, Editing System (portal side) | the `t3000` template: CSS, `main.js`, homepage, article zones, widgets |
| 05 | [`05-content-and-registry.md`](05-content-and-registry.md) | Content Organization, Documentation Metadata | `registry.json` schema, generators, parity assertion |
| 06 | [`06-search.md`](06-search.md) | Search System, Layer 4 | Pagefind index, facets, in-app search, offline verification, analytics + health score |
| 07 | [`07-offline-pdf-chm.md`](07-offline-pdf-chm.md) | Offline Documentation | offline site package, `docfx pdf`, CHM pipeline and their parity |
| 08 | [`08-editing-and-git.md`](08-editing-and-git.md) | Editing System, Git Integration | author/date/commit surfaces, preview, review, PR flow |
| 09 | [`09-feedback-subscriptions-notifications.md`](09-feedback-subscriptions-notifications.md) | Feedback, Subscription, Notification | endpoints, tables, RSS, routing, aging |
| 10 | [`10-changelog-releases-versioning.md`](10-changelog-releases-versioning.md) | What's New, Release Notes, Version Management | changelog generation, release drafts, `versions.json`, per-tag sites |
| 11 | [`11-review-and-cicd.md`](11-review-and-cicd.md) | Documentation Review Process | ownership, staleness rules, `docs-owed`, workflows, publish, rollback |
| 12 | [`12-ai-features.md`](12-ai-features.md) | Future AI Features | commit analysis, impact analysis, stale detection, assistant |
| 13 | [`13-implementation-plan.md`](13-implementation-plan.md) | Implementation Plan, Detailed Starting Steps | phases as PR-sized tasks with acceptance tests and a week-by-week phase 1 |
| 14 | [`14-governance.md`](14-governance.md) | Documentation Review Process (the policy half) | roles, when review is required, publish authority, emergencies, waivers, page retirement |
| 15 | [`15-online-editor.md`](15-online-editor.md) | Editing System (hosted half), Layer 3 | the phase-3 editor: **Monaco** (the VS Code core) source-first, self-hosted bundle, API, server-side git flow, safety rules |
| 16 | [`16-management-overview.md`](16-management-overview.md) | the whole picture, for management | the one-page-for-the-boss view: requirements, system figures, roles, phases, risks, decisions requested — **also records the correction that the platform is a standalone internal app, not part of the T3000 runtime** |

Related, outside this folder:

- `docs/help/DESIGN.md` — the CHM pipeline and `docs/help/*.json` manifest format (unchanged by this design).
- `docs/help/README.md` — the CHM collection definitions.
- `scripts/audit-docs.mjs`, `scripts/build-t3000-help-chm.mjs` — the existing docs tooling.

## Locked decisions

These are not open questions; everything in this folder assumes them.

1. **One source.** Markdown in `docs/**` in the T3000 repository. No second content store, no page copies.
2. **DocFX is the publishing engine.** Pinned in `tools/docfx.pin`: mode B = a pinned official release
   (default), mode A = a checkout **outside** the repo (`DOCFX_REPO`). Site, offline site, PDF and the search
   index all come from `docfx build` / `docfx pdf`.
3. **CHM is the Node pipeline** (`npm run build:help` → `hhc.exe`). DocFX cannot produce CHM; F1
   help stays a shipping artifact.
4. **No file moves.** Pages stay at `docs/t3000/**` and `docs/legacy/**`; the app, the MCP tools and
   every inbound link depend on those paths.
5. **No page-level metadata.** No YAML front matter added to shipped pages. Everything a page needs
   (title, owner, chapter order, tags, code globs) lives in `docs/help/registry.json`, and DocFX receives
   it through generated `toc.yml` / `docfx.json` (`globalMetadata`, `fileMetadata`).
6. **Offline first.** Every published page must render with no network: no remote fonts, images, scripts
   or styles. `npm run docs:blocking` enforces this and now also runs over `_site`.
7. **The engine is pinned, and separate.** Never depend on a floating global `docfx`; the optional source
   checkout lives outside the repository, so `git status` here never shows engine files. If the engine ever
   must change, **fork it into your org** and clone that fork as a sibling folder (mode A+) — patches then
   live as commits and reviewable PRs instead of loose `.patch` files.
8. **One page set everywhere.** CI fails if `toc.yml` and the CHM collection manifests disagree.
9. **Humans approve prose.** AI may summarise, detect and draft; a named owner approves before publish.
10. **No vendor or product names in shipped docs** other than T3000's own.
11. **Hosting: `/docs/` on the existing server (:9103).** A third static mount next to the two the Rust
    server already has, serving `_site/` (dev: `DOCS_DIR=docs/_site`). Authoring preview is DocFX's own
    server on :8080 and never ships. The public static host, if any, receives a copy of the same `_site/`.
    See `00-architecture.md` Figure 3.
12. **Two surfaces, one artefact.** The read site is `_site/`; the authoring surface lives beside it
    (`/docs/_admin/` generated dashboard in phase 1, `/edit/<page-id>` hosted editor in phase 3), is
    `noindex`ed, and is excluded from the CHM, the PDF and the offline package.
13. **Search is Pagefind** over the built site, with the engine's own search box switched off (one search UI)
    and the engine's index kept as the fallback where a runtime-fetched index cannot load. OpenSearch only
    on measured need.
14. **Analytics are first-party** — same-origin beacons into `docs_analytics` (page views, search terms,
    zero-result queries, feedback ratio) feeding one health score. No third-party script, ever.
15. **Media is governed**, not left to whoever adds a screenshot: per-page `media/` folder,
    `NN-area-slug.png`, ≥1600 px, plus missing / unused / duplicate / oversized reports in the audit.
16. **Retention: the current version plus the last 3 snapshots** on the host; older ones remain as release
    artefacts, and media may be served once at a stable path if size demands it.
17. **The changelog is phase 1.** Commit summaries need no portal, no endpoint and no auth, and they are the
    ask that started this platform — so they do not wait for phase 5.
18. **One build root, N content sources.** The site project starts inside this repo; another product's docs
    are a content mapping (`src` + `dest`) plus a navbar node plus a registry area — not a second site. Lifting
    the hub into its own repo later moves infrastructure only: no page, no URL, no link changes
    (`00-architecture.md` Figure 7).
19. **No new port for users, and a sibling folder.** The site is served at `/docs/` on the existing API port
    **9103** from `…\ResourceFile\webview\docs\` — a sibling of `www`, never inside it (`DOCS_DIR`).
20. **The docs ride in the product build.** `npm run build` builds the app *and* the site (`dist/docs`), and
    one publish pass (`scripts/publish-webview.mjs`) places `www`, `docs` and the CHM into the runtime folder;
    `:8080` is dev-only. Docs-only builds and previews are extra scripts, not a second pipeline.
21. **The online editor is Monaco** (the VS Code core): source-first, self-hosted custom bundle, preview from
    `docfx build --serve`, gate findings as inline markers, and a toolbar we build (~1 day) because no
    library ships our combination. No WYSIWYG — our pages are hard-wrapped (`15-online-editor.md`).

## Prerequisites for phase 1

| Tool | Version | Needed for | Notes |
|---|---|---|---|
| .NET SDK | 8.x / 9.x / 10.x | building and running DocFX | DocFX targets these |
| Node.js | 24.x | **mode A only** — building the DocFX site templates from source | this repo also uses Node for its own scripts |
| Git | any | engine checkout (mode A), provenance, diff guards | — |
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
