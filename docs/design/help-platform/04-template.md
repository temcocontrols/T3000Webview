# 04 — The T3000 template (website design)

*Covers: Website Design (homepage + article layout), the portal side of the Editing System.*

We do **not** write a site from scratch. The `modern` DocFX template already provides the Microsoft
Learn-style furniture; our template layer brands it and adds the four things it lacks (version switcher,
page-meta bar, feedback widget, homepage cards). Keeping our layer thin is a deliberate upgrade-cost
decision — see `02-docfx-engine.md` §6.

---

## 1. Template stack

```
"template": ["default", "modern", "templates/t3000"]
                        └── last one wins per file
```

- `default` — the base rendering machinery.
- `modern` — navbar, left TOC column, article column, right rail (affix), breadcrumbs, prev/next,
  dark mode, search box, "Edit this page", sitemap-ready markup. **This is the Learn-like part.**
- `templates/t3000` — ours: branding, widgets, homepage.

What lives in our layer:

```
docs/templates/t3000/
├─ public/
│  ├─ main.css        ← brand colours, typography, spacing, print styles
│  ├─ main.js         ← the template entry module (options + runtime widgets)
│  ├─ logo.svg        ← header logo     (also referenced by _appLogoPath)
│  ├─ favicon.ico
│  └─ fonts/…         ← self-hosted font files (no CDN — the offline rule)
└─ partials/…         ← optional markup overrides (keep this folder empty if possible)
```

The `modern` template's custom layer is a folder whose `public/` is merged into the site output and whose
`public/main.js` is the entry module; `main.css` and `main.js` are the supported extension points. Markup
overrides (partials) are the escape hatch, not the plan — an exported `modern` template
(`docfx template export modern`) is the reference to diff against, and every file we override is a file we
have to re-check on the next engine upgrade (record them in `tools/patches/TEMPLATE-OVERRIDES.md`).

---

## 2. `public/main.js` — the entry module

DocFX's modern template loads it as an ES module whose default export is an options object. Options we
use; the typings for the pinned version are in the engine clone at
`tools/docfx/templates/modern/src/options.d.ts`, and the engine ships a worked example at
`tools/docfx/samples/seed/template/public/main.js`.

```js
export default {
  defaultTheme: 'light',                 // 'light' | 'dark' | 'auto'
  iconLinks: [
    { icon: 'github', href: 'https://github.com/temcocontrols/T3000Webview', title: 'Repository' }
  ],
  configureHljs: (hljs) => {
    // our docs use text, json, yaml, powershell, rust, cpp, ts
  },
  start: () => {
    mountVersionSwitcher();   // reads versions.json
    mountPageMeta();          // reads page-meta.json (updated date, owner, review state)
    mountFeedbackWidget();    // posts to the feedback endpoint, or opens a prefilled issue (phase 1)
    mountCopyButtons();       // per code block
    mountRecentlyUpdated();   // homepage only: reads page-meta.json, renders the list
  }
};
```

`start()` runs on every page for the site-wide widgets, each guarded by the presence of its mount point so
a missing container is a no-op rather than an error.

**Check option names against the pinned version** — the field set has changed across releases (the docs
show both `_enableNewTab` and `_disableNewTab` depending on version). `options.d.ts` in the clone is
authoritative.

---

## 3. Layout: which knob does what

Global defaults live in `docfx.json` (`globalMetadata`), per-area deviations in `fileMetadata`, and
nothing at all in the pages.

| Zone | Provided by | Our configuration |
|---|---|---|
| Top navigation bar | `docs/toc.yml` | generated (see `03-site-project.md`) |
| Breadcrumb | TOC ancestry | `_disableBreadcrumb: false` |
| Left navigation tree | the area `toc.yml` | generated; `expanded: true` on the first two levels |
| Article column | the content | — |
| Right rail ("In this article") | affix, built from the heading tree | on for T3000 pages; `_disableAffix: true` for `legacy/**` (long engineering notes) |
| Table-of-contents filter box | modern template | `_disableTocFilter: false` |
| Prev / next article | TOC order | `_disableNextArticle: false` |
| "Edit this page" / "View source" | `_gitContribute` + `_gitUrlPattern: github` | on for `t3000/**`; off (`_disableContribution: true`) for `legacy/**` and `design/**` |
| Footer | `_appFooter` | brand line + build stamp injected by `main.js` |
| Search box | `_enableSearch: true` + the build's search index | see `06-search.md` |
| Dark mode | modern template | `defaultTheme: 'light'`, user-toggleable |
| Homepage | `docs/index.md` with `_layout: landing` | see §4 |
| `chromeless` layout | modern template | used for popups/embedded pages if we ever need one |

Note `_layout` is a *page-level* metadata key in general, but we never write it into a page: the homepage
case is covered by a `fileMetadata` rule for `index.md`, which is the only page that needs it.

---

## 4. Homepage

`docs/index.md` is the only hand-written page in the site project, and it is built from generated blocks
so it cannot go stale:

```markdown
<!-- BEGIN GENERATED: hero -->
# T3000 documentation
Everything for T3000: hardware, protocols, the Design Studio, the API and the troubleshooting guides.
<!-- END GENERATED: hero -->

<!-- BEGIN GENERATED: cards -->
| | |
|---|---|
| **Quick start** | Install, connect, first screen — [start here](t3000/quick-start/overview.md) |
| **Design Studio** | Build and deploy Tstat11 screens — [manual](t3000/t3-eez-studio/README.md) |
| **Protocols** | BACnet, Modbus, MQTT — [building platform](t3000/building-platform/overview.md) |
| **API reference** | REST, control messages, data points — [api](t3000/api-reference/overview.md) |
| **Troubleshooting** | Known issues and field cases — [guides](t3000/guides/troubleshooting.md) |
| **What's new** | Release notes and changelog — [releases](t3000/releases/beta-webui-announcement.md) |
<!-- END GENERATED: cards -->

## Recently updated

<div id="recently-updated"></div>
```

- Hero and cards are regenerated by `scripts/docs-registry.mjs` from the registry (titles and links come
  from `title` / `chapter`, so a renamed chapter updates the homepage).
- "Recently updated" is rendered **client-side** by `main.js` from `page-meta.json` — so it stays current
  between builds and needs no server.
- The landing layout (`_layout: landing` for `index.md` via `fileMetadata`) gives the wide hero treatment.

---

## 5. Widgets we add in `main.js`

| Widget | Data source | Contract |
|---|---|---|
| Version switcher | `versions.json` (generated: version → site URL, current flag) | renders a `<select>`; changing location navigates to the same path in the chosen version's site |
| Page meta bar | `page-meta.json` (per page: `updated`, `sha`, `owner`, `reviewed`, `stale`) | `Updated 2026-10-09 · <sha> · Owner: trendlog`; renders a "stale" chip when the registry marks the page stale |
| Feedback widget | none (phase 1) → feedback endpoint (phase 3) | phase 1: "Was this helpful?" with a prefilled GitHub issue URL (`title = page title`, `body = page URL + last commit`); phase 3: `POST /api/docs/feedback` (see `09-…`) |
| Copy code button | DOM | appended to every `<pre>` |
| Back-to-top / print | DOM | small footer affordances |
| Docs-owned banner | `page-meta.json` | shown only when `?internal=1` or on the internal host: "this page claims code that changed" |

All widgets are additive and must degrade to nothing if their JSON 404s (the offline package has the same
files, so they work offline too).

---

## 6. Styling rules

- Brand values as CSS custom properties at the top of `main.css`; the modern template is Bootstrap-based,
  so `--bs-*` variables (`--bs-link-color-rgb`, `--bs-body-font-size`, …) are the supported way to retheme.
- Only overrides in `public/main.css` — never a forked copy of a template stylesheet.
- **No remote assets.** No Google Fonts, no CDN. Fonts are self-hosted in `public/fonts/`. The
  `remote-asset` audit rule runs over `_site/**` as well as the sources (`11-review-and-cicd.md`).
- Print styles are part of the design from day one, because the PDF renders the same HTML
  (`07-offline-pdf-chm.md`): `@media print` rules for code blocks, tables and the cover page.
- Accessibility: heading order comes from the pages (the audit gate enforces single-H1), landmark regions
  come from the template; contrast checked for the brand palette.

---

## 7. Dev loop

```powershell
npm run docs:site          # build once
npm run docs:serve         # docfx build --serve  → http://localhost:8080
```

- Edit a page: the served site rebuilds and the browser keeps its position.
- Edit the template: `main.css`/`main.js` are static assets; reload the page. A markup change means
  editing a partial — re-run `docfx template export modern` and diff first.
- Inspect a template data model when something renders empty: build with `--exportRawModel` (or `--debug`)
  to dump the model the template received, then look at the JSON instead of guessing.
- Sanity-check the whole layer offline before calling it done: `npm run docs:site` then load `_site/`
  from the file system and confirm no network requests and no console errors.

---

## 8. Tasks

1. Create `docs/templates/t3000/public/` with `main.css`, `main.js`, logo, favicon, self-hosted fonts.
2. Add the brand variables and the print stylesheet; verify contrast and dark mode.
3. Add `docs/index.md` (hero + cards blocks + `#recently-updated`) and the `fileMetadata` rule that gives
   it `_layout: landing`.
4. Implement the five widgets in `main.js`, each guarded by its mount point.
5. Generate `versions.json` and `page-meta.json` in `scripts/docs-registry.mjs`.
6. Extend `scripts/audit-docs.mjs` with the `_site` pass: remote assets, missing favicon, missing
   `index.json`.
7. Record the override list in `tools/patches/TEMPLATE-OVERRIDES.md` (empty at first — that is the goal).

**Acceptance:** `_site/index.html` is a landing page with working cards; an article page shows breadcrumb,
left TOC, right affix, prev/next, "Edit this page" and the page-meta bar; the version switcher and feedback
widget render and function; the offline check reports zero remote URLs; `_site` loads with no console
errors from the file system.
