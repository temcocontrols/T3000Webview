# 00 — High-level structure (start here)

*Answers: what is the website, does it live on `localhost:9103` or is it a separate DocFX project, and
what exactly is "a site to show" versus "a site to edit".*

---

## The short answer

| Question | Answer |
|---|---|
| Do we clone DocFX as a repo? | **When we need it, yes — and separately.** Policy is *pin first, patch last*: phase 1 pins an official release (mode B, `tools/docfx.pin` + a committed local tool manifest), and cloning `dotnet/docfx` (mode A) is the documented escalation for full control, a patch, or an offline-only host. The clone lives **outside** the T3000 working tree (located via `DOCFX_REPO`), never as a submodule and never vendored in. |
| Is the website a separate DocFX project? | **No.** The **site project** is `docs/docfx.json` + `docs/toc.yml` + `docs/templates/t3000/` inside this repository. Nothing is duplicated and no pages are copied. |
| Where is the site served? | **On the existing server, port 9103, at `/docs/`** — a third static mount next to the two the Rust server already has (`/eez-studio-wasm`, `/eez-studio-assets`). The same `_site/` folder can later be copied to any static host; publishing is a copy, never a rebuild. |
| Where do I preview while writing? | `npm run docs:serve` → DocFX's own server on **:8080**. Authoring only; it never ships. |
| What is "the site to show"? | `_site/` served at `/docs/` — read-only, anonymous, plus the offline copies (CHM, PDF, zip). |
| What is "the site to edit"? | Phase 1: the local preview (:8080) + a generated **`/docs/_admin/` dashboard** (coverage, stale pages, docs-owed, unowned pages, feedback) — internal, noindex, never shipped. Phase 3: a hosted `/edit/<page-id>` editor behind auth. |
| Does the in-app Documentation page go away? | No. It stays (in-app reading next to F1); it gains search from the same index and links to the site for anything more. |

---

## Figure 1 — the system at a glance

```
   authors
      │  edit Markdown (no page metadata)
      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ T3000 repository (git)                                                       │
│                                                                              │
│   docs/t3000/**.md          the pages            ← never moved, never renamed │
│   docs/legacy/**.md         engineering notes                                │
│   docs/design/**.md         this design package (Contributing, noindex)       │
│                                                                              │
│   docs/help/registry.json   the structure: chapters, order, owner, code globs │
│   docs/templates/t3000/     look & feel (CSS/JS on top of the modern template) │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │  npm run docs:registry
        ┌───────────────────────────────┼────────────────────────────────┐
        ▼                               ▼                                ▼
 docs/docfx.json  +  docs/toc.yml   docs/help/*.json  (CHM defs)   index.json · page-meta.json
        │                               │                          versions.json · help-ids.json
        │ docfx build                   │ hhc.exe                        │
        ▼                               ▼                                ▼
 ┌──────────────────────┐     ┌────────────────────┐      ┌────────────────────────────┐
 │ _site/               │     │ T3000_Help.chm     │      │ in-app Documentation page  │
 │  the website         │     │  offline, F1       │      │  nav · search · stale chip │
 │  + search index      │     └─────────┬──────────┘      │  page-meta bar             │
 │  + xrefmap.yml       │               │                 └────────────────────────────┘
 └──────┬───────────────┘               │ installer copies it next to T3000.exe
        │ docfx pdf / zip               ▼
        ▼                          F1 in the product
 T3000-Learn.pdf  ·  T3000-Docs-<version>.zip
```

One source (Markdown + registry), five deliveries (site, offline site, PDF, CHM, app panel), and **no
second copy of any page anywhere**.

The engine is deliberately **not** in that tree: it is a pinned tool (mode B) or a checkout **outside** the
repository (mode A, located via `DOCFX_REPO`) — never a submodule, so T3000's `git status` never shows
engine files (`02-docfx-engine.md` §1–2).

---

## Figure 2 — what exists on disk

```
T3000Webview-EEZ-Studio/
├─ .config/dotnet-tools.json     the pinned engine (mode B) — a dependency, no engine source here
├─ tools/
│  ├─ docfx.pin                  mode + version + enginePath + patch list
│  └─ patches/                   our engine patches (empty is the goal)
│  (mode A: the ENGINE is cloned as a sibling folder, C:\QN\temcocontrols\docfx → DOCFX_REPO)
├─ docs/
│  ├─ docfx.json                 GENERATED  the site project
│  ├─ toc.yml                    GENERATED  top navigation bar
│  ├─ index.md                   hand-written  homepage (landing layout)
│  ├─ t3000/                     the pages            + t3000/toc.yml   (generated)
│  ├─ legacy/                    the pages            + legacy/toc.yml  (generated)
│  ├─ design/                    the pages            + design/toc.yml  (generated)
│  ├─ templates/t3000/public/    we own this: main.css, main.js, logo, fonts
│  ├─ help/                      registry.json + generated manifests/indexes
│  └─ _site/                     BUILD OUTPUT (gitignored) ← what gets served
├─ api/src/utils.rs              DOCS_DIR (new, mirrors the existing SPA_DIR)
└─ api/src/server.rs             .nest("/docs", routes_docs())   (new, ~6 lines)
```

---

## Figure 3 — where it runs

```
 AUTHORING MACHINE (developer)                         USER / FIELD MACHINE
 ┌──────────────────────────────────────┐              ┌──────────────────────────────────────┐
 │ VS Code                              │              │ T3000.exe                            │
 │   docs/**/*.md   ← the only place    │              │   F1 ──────────────► T3000_Help.chm  │
 │                                      │              │   Documentation page ► /docs/… or    │
 │ :8080  docfx build --serve           │              │                        /api/…       │
 │        live preview of the real site │              │                                      │
 │ :3003  the app (Vite dev)            │              │ :9103  T3_WebView_API                │
 │        /docs/… reads the same files  │              │   /api/*             REST + MCP      │
 │                                      │              │   /eez-studio-wasm   (exists)        │
 │ npm run docs:blocking  (gate)        │              │   /eez-studio-assets (exists)        │
 └──────────────────────────────────────┘              │   /docs/*        ← _site  (NEW)      │
                                                       │       static, no CORS, same origin   │
                                                       │       as /api → feedback + search OK │
                                                       └──────────────────────────────────────┘
 optional: the same _site/ copied to any static host → public docs (identical bytes)
```

The integration is the same pattern the server already uses twice, so it is small and familiar:

```rust
// api/src/utils.rs
pub static ref DOCS_DIR: String =
    env::var("DOCS_DIR").unwrap_or_else(|_| "./ResourceFile/webview/docs".to_string());

// api/src/server.rs
fn routes_docs() -> Router {
    Router::new().nest_service("/", get_service(ServeDir::new(DOCS_DIR.as_str()))
        .handle_error(|_| async move { (StatusCode::INTERNAL_SERVER_ERROR, "internal server error") }))
}
// …inside create_t3_app(), next to the existing nests:
.nest("/docs", routes_docs())
```

Dev: run the server with `DOCS_DIR=docs/_site` (or copy once). Release: the build already copies the site
next to the app's `www` folder. Serving `/docs/` on :9103 costs nothing, adds no CORS problem (the feedback
endpoint is on the same origin), and means one URL prefix for the app, the site and the future editor.

URL form: DocFX's links carry `.html` (`/docs/t3000/quick-start/overview.html`), and every link the site
generates is like that, so nothing needs a rewrite. Only hand-typed extensionless URLs (`…/overview`) miss;
if that turns out to matter, add a tiny fallback that retries with `.html` — a later, isolated change.

---

## Figure 4 — two sites, clearly separated

```
                ┌──────────────────────────────── READ SITE (ships) ──────────────────────────────┐
                │  /docs/                    everything published (T3000, Studio, Protocols, API,   │
                │                            Legacy, Contributing) — anonymous, indexable          │
                │  /docs/feed/*.xml          changelog + releases RSS                               │
                │  /docs/T3000-Learn.pdf     the PDF                                                │
                │  /docs/T3000-Docs-<v>.zip  the offline package                                    │
                └──────────────────────────────────────────────────────────────────────────────────┘

                ┌──────────────────────── AUTHORING SURFACE (never ships) ────────────────────────┐
   phase 1      │  :8080            docfx preview — what the page will look like, live             │
                │  /docs/_admin/    GENERATED dashboard: coverage · stale by owner · docs-owed ·   │
                │                   unowned pages · broken links · feedback · help-id coverage     │
                │                   (noindex, excluded from PDF/CHM/offline zip)                   │
                │  vscode://file/…  "open this page in VS Code" straight from a dashboard row      │
   phase 3      │  /edit/<page-id>  hosted editor: Markdown + preview + image upload + draft       │
                │                   branch + Publish → pull request          (auth: editor role)   │
                └──────────────────────────────────────────────────────────────────────────────────┘
```

Rules that keep the two from contaminating each other:

| Rule | Why |
|---|---|
| nothing under `_admin/` or `_edit/` is in `docfx.json` content | they are generated pages, not documentation |
| both are `_noindex` | never in search results |
| both are excluded from the PDF, the CHM and the offline zip | users must never receive an editing page |
| the admin dashboard is a **static generated page** in phase 1 | zero backend, zero auth, works on the LAN |
| phase 3 auth sits in front of `/edit/**` only | reading stays anonymous |

---

## Figure 5 — how one change flows

```
edit docs/t3000/features/trendlogs.md
   │
   ├─ npm run docs:serve ─────────► :8080  see it in the real template (seconds)
   ├─ npm run help:preview ───────► CHM   see it in the help viewer (only if the page ships)
   ├─ npm run docs:blocking ──────► gate  links, fences, one H1, no remote assets
   │
   └─ git commit ─► PR ─► CI: registry --check · docs:blocking · docfx build · docs-owed
                                │
                                ▼
                       merge to main
                                │
        ┌───────────────────────┼────────────────────────┬───────────────────────┐
        ▼                       ▼                        ▼                       ▼
  regenerated manifests   _site/ published          CHM rebuilt           changelog entry
  + index.json/page-meta  at /docs/ on :9103        + shipped             + RSS + subscriptions
                          (and optionally the
                           public static host)
```

---

## Figure 6 — what appears when

```
phase 1  ████████████████████████████  engine + registry + site + CHM parity + /docs on :9103
                                       + page-meta bar + in-app search + CI gates + _admin v1
phase 2  ░░░░████████████████████░░░░  changelog + impact analysis + docs-owed + weekly report
                                       + release-note drafts + RSS + reviewer banner
phase 3  ░░░░░░░░████████████████░░░░  per-version sites + version switcher + feedback endpoint
                                       + hosted editor /edit + subscriptions + notifications
phase 4  ░░░░░░░░░░░░████████████░░░░  PDF + offline zip + release attachments + freeze procedure
phase 5  ░░░░░░░░░░░░░░░░████████░░░░  embeddings + assistant + drafting on demand
```

---

## Figure 7 — many products, one site (the hub shape)

The site project is a *build root*, and content is mapped into it from one or more sources. Today N = 1; a
second product costs three config lines instead of a second site.

```
docs/docfx.json   ← the build root (ONE project, ONE search index, ONE template)
   │
   ├─ content: { files: "**/*.md", src: "../docs/t3000",  dest: "t3000"  }   ← T3000 product docs
   ├─ content: { files: "**/*.md", src: "../docs/legacy", dest: "legacy" }   ← engineering notes
   ├─ content: { files: "**/*.md", src: "../docs/design", dest: "design" }   ← this design package
   │
   └─ later, unchanged mechanics:
      content: { files: "**/*.md", src: "../../productX/docs", dest: "productx" }  ← another repo

URL = dest + path, so where content physically lives never leaks into a URL.
```

| Question | Answer |
|---|---|
| Where does the site project live now? | inside the T3000 repo (`docs/docfx.json`) — nothing new to create |
| Another product's docs arrive in another repo? | one content mapping + one navbar node + one registry area; CI checks that repo out, the build stays one pass |
| Can we lift the hub into its own repo later? | yes, and cheaply: move `docfx.json`, `toc.yml`, `templates/t3000/`, `registry.json`, scripts; `dest` prefixes keep every URL identical. Pages, links, CHM, app and MCP untouched |
| What keeps that cheap? | always set `dest` per source, and map `_gitContribute` per source glob so "Edit this page" points at the owning repo |
| What would force a separate site? | genuinely different audience/branding/versioning — then it is its own `docfx.json`, accepting that it has its own search |

## Figure 8 — deployment and ports

```
 npm run build                        (ONE product build — the docs ride along)
   │
   ├─ 1  quasar build        →  dist/spa/                    the app
   ├─ 2  docs:registry       →  docs/docfx.json, docs/toc.yml, docs/help/*.json  (generated)
   ├─ 3  docs:site           →  dist/docs/                   docfx build + pagefind
   ├─ 4  build:help          →  T3000_Help.chm               (needs hhc.exe on the build host)
   └─ 5  publish:webview     →  scripts/publish-webview.mjs  ONE pass, three targets:
                                 dist/spa/*     →  …\ResourceFile\webview\www\
                                 dist/docs/*    →  …\ResourceFile\webview\docs\   ← sibling, NOT www\docs
                                 T3000_Help.chm →  next to T3000.exe

 runtime:  T3000.exe starts the rust service  →  http://localhost:9103
             /          the app  (www)
             /docs/     the site (docs, from DOCS_DIR)     ← no new port, no new service
             /api/*     REST + MCP

 ordering:  quasar build clears dist/spa, so the site is generated into its own dist/docs AFTER it
            and publish:webview places both. Never write the site into dist/spa.
```

Two extra scripts (allowed: more scripts, same build): `npm run docs:site` on its own for a docs-only
build, and `npm run docs:serve` (:8080) for local authoring. The existing `deploy:t3000` and
`deploy:t3000:build` entries are dead — `scripts/deploy-to-t3000.bat` does not exist and `build:webview`
is not defined — so `publish:webview` replaces them and also fixes the app's own deploy.

| Service | Port | Serves | Seen by |
|---|---|---|---|
| **T3_WebView_API (Rust)** — exists | **9103** | the app `/`, `/api/*`, `/eez-studio-wasm`, `/eez-studio-assets`, **and NEW `/docs/*`** | **users** |
| WebSocket — exists | 9104 | live device data | the app |
| DocFX preview — dev only | 8080 | live site preview while editing | developers, never deployed |
| Vite dev server — dev only | 3003 | the app in development | developers |

**No new port, no new service, no new firewall rule.** Users keep `http://<host>:9103/`; the documentation is
`http://<host>:9103/docs/`. The runtime needs only static files — no Node, no .NET, no DocFX on the deployed
machine. If that is ever not enough:

| Shape | URL | Trade-off |
|---|---|---|
| **Default: same port/path, sibling folder** | `:9103/docs/` | zero new infrastructure; the site lives in `…\ResourceFile\webview\docs\` (a **sibling** of `www`, never inside it), so it is deployable and replaceable on its own |
| Standalone read-only docs host | `:9180/docs/` (static server / nginx / file share) | docs readable with the app stopped; a second service + firewall rule + deploy step |
| Public site | `https://learn.temcocontrols.com/` | the same `dist/docs` copied out; needs a DNS name + host |
| No host at all | `T3000_Help.chm` (F1), offline zip, PDF | air-gapped machines |

Operational note: `docs` must be included in **every** path that copies or mirrors `www` (installer, the
product's own auto-update). And because `%LOCALAPPDATA%\T3000\EBWebView\` cache has bitten this project
before, the site's HTML/CSS/JS get a build-stamp query (`?v=<build>`) so an update is not masked by a stale
cache.

Versioning on the host: `/docs/` = current, `/docs/<version>/` = frozen snapshots, `versions.json` = the
pointer; rollback is a folder swap, not a rebuild. The online editor (phase 3) lives at
`/docs/edit/<page-id>` **on the same port**, exposed only on the internal server (field machines have no git
remote and stay read-only).

---

## Decisions to lock now

1. **Hosting:** `/docs/` on the existing server (:9103) is the canonical location, served from
   `…\ResourceFile\webview\docs\` — a **sibling of `www`, not inside it** (`DOCS_DIR`). The public static
   host is optional and receives a copy of the same `dist/docs`. Authoring preview stays on :8080.
2. **Pin first, patch last.** The engine version is recorded in `tools/docfx.pin` in both modes: a pinned
   official release by default, the cloned-and-built source **outside this tree** when control or a patch is
   needed. The site project lives in this repository; `docfx init` is used only for throwaway experiments.
3. **Two surfaces, one artefact:** `_site/` contains the read site; the authoring surface is generated
   alongside it under `_admin/` (phase 1) and `/edit/` (phase 3) and is excluded from every shipped output.
4. **No page moves, no page metadata.** The registry is the only place structure is declared.
5. **The CHM stays the F1 channel**; the site is the browser/offline-reading channel; the PDF and zip are
   release artefacts.
6. **The engine is separate.** A pinned tool (mode B, default), or a checkout **outside** the repository
   (mode A) — best as **your own fork** of `dotnet/docfx` cloned as a sibling folder (mode A+), so engine
   changes are commits and PRs in your org. Never a submodule, never vendored, so T3000's `git status`
   never shows engine files.
7. **One build root, N content sources.** Adding a product is a content mapping + a navbar node + a
   registry area, not a second site; lifting the hub into its own repo later moves infrastructure only — no
   page, no URL and no link changes (`Figure 7`).
8. **The docs ride in the product build.** `npm run build` produces the app and the site; `dist/docs` is
   published by the same step as `dist/spa` (`scripts/publish-webview.mjs`), landing in the sibling
   `webview\docs` folder. Extra scripts (`docs:site`, `docs:serve`, `docs:pdf`, `docs:offline`) exist for
   docs-only builds and local dev. `:8080` is dev-only and never ships.

---

## What to do now (in this order)

| # | Action | Time | What you see when it is done |
|---|---|---|---|
| 0 | Answer one question: is `/docs/` on :9103 the canonical URL, or a public host first? | minutes | — (the rest of the design already assumes :9103) |
| 1 | Pin the engine: a) **mode B** (20 min) — `dotnet new tool-manifest`, `dotnet tool install docfx --local --version <x.y.z>`, record it in `tools/docfx.pin`; b) **mode A** (1–2 h) — clone the engine as a sibling folder (`git clone https://github.com/dotnet/docfx C:\QN\temcocontrols\docfx`), `setx DOCFX_REPO "C:\QN\temcocontrols\docfx"`, then build templates (`templates`: `npm install` + `npm run build`) and the CLI (`dotnet build docfx.sln -c Release`) | 20 min–2 h | `dotnet tool run docfx -- --version` (mode B) or `dotnet run --project $env:DOCFX_REPO\src\docfx -- --version` (mode A) matches the pin — and `git status` in T3000 shows **no engine files** |
| 2 | Write a **hand-written** `docs/docfx.json` (content globs for `t3000/**`, `legacy/**`; resource globs for images; `dest: "../dist/docs"`) and build | 30 min | all 319 pages rendered in `dist/docs/` with the Learn-style template |
| 3 | Write three **hand-written** `toc.yml` (root + `t3000/` + `legacy/`) using the chapter list you already have in `docs/help/manual.json` | 1 h | real navigation: left tree, breadcrumbs, right rail, prev/next, search box |
| 4 | Add `DOCS_DIR` + `routes_docs()` + `.nest("/docs", routes_docs())`, and create `scripts/publish-webview.mjs` (app + docs + CHM in one pass) | 1 h | `http://localhost:9103/docs/` serves the site from `…\ResourceFile\webview\docs\`, and `npm run publish:webview` fills all three targets |
| 5 | Brand it: `docs/templates/t3000/public/main.css` + `main.js` | ½ day | T3000 look, working search, dark mode |
| 6 | Only then: `registry.json` + the generators (`05-content-and-registry.md`) | phase 1 proper | toc.yml/docfx.json/manifests generated, parity gate green |

Steps 2–4 are deliberately registry-free: they prove the **engine, the look and the hosting** on day one,
with `toc.yml` hand-written and throwaway. Everything after that replaces hand-written files with generated
ones — the visible result never regresses.

The only thing I would not postpone: **step 1**, because "DocFX builds our corpus and it looks right" is the
assumption the whole design rests on, and it costs an afternoon to check.
