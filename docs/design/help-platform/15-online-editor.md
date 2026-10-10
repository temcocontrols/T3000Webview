# 15 — The online editor

*Covers: Editing System (hosted half) · Layer 3 authoring surface. Companion to `08-editing-and-git.md` §2.*

Phase 1 has no online editor: you edit files and watch `:8080`. This document is the design for the phase-3
editor — what it is, which library it uses, the API, the server-side git flow, and the rules that keep it
safe.

---

## 1. Editor core: **Monaco** (the VS Code editor)

Requirement, stated plainly: the editor has to feel like **VS Code**, because that is where the people who
will use it already work. The consequence is that the editor core is **Monaco** — the editor VS Code is
built on. My earlier pick (EasyMDE) was wrong for that requirement: it is a Markdown *text area with a
toolbar*, not an editor.

| Option | Verdict | Why |
|---|---|---|
| **Monaco Editor** (`monaco-editor`) | **chosen** | real VS Code behaviour: multi-cursor, find/replace, folding by heading, minimap and word-wrap control, a **built-in diff editor**, and a **markers API** we feed our gate findings into — a broken link becomes a squiggle on the exact line, like VS Code |
| CodeMirror 6 | fallback | much smaller and still good, but no diff editor, no markers for free, and more chrome for us to build |
| EasyMDE | fallback for constrained hosts | ~30 lines of glue, but not a VS Code-class editor; keep it only as a degraded mode |
| SimpleMDE | rejected | unmaintained |
| Toast UI / Vditor | rejected | bigger *and* weaker editing than Monaco; their value is the rich mode we are not using |
| ProseMirror / Milkdown / any WYSIWYG | **rejected on principle** | WYSIWYG re-wraps paragraphs. Our pages are **hard-wrapped on purpose**, so a rich round-trip rewrites every line → a whole-file diff for a one-word change, unreviewable, and `git blame` destroyed. Source-first stays a requirement. |
| github.dev / Codespaces | not the product, but worth knowing | real VS Code on the real repo with zero code from us — ideal for engineers; it has no preview of *our* template, no registry fields and no gate results, so it complements rather than replaces the editor (§6) |

### Self-hosting Monaco (the offline rule)

Monaco must work with no network, so it is **bundled and served by us**, never from a CDN:

| Concern | Decision |
|---|---|
| Bundle | a **custom build using only what we need** — `editor.api` + the Markdown basic language + `diffEditor` — not the all-languages default bundle |
| Build step | `npm run docs:editor:build` (esbuild) → `docs/templates/t3000/public/editor/`; it is the only bundler step in the site pipeline and it emits static files, so the deployed runtime still needs nothing |
| Loading | lazy: fetched only on `/docs/edit/**`, so article pages stay as light as they are today |
| Workers | `self.MonacoEnvironment.getWorkerUrl` points at our local worker files |
| Size budget | measured in CI; if the custom bundle exceeds ~2 MB gzipped, revisit CodeMirror 6 — and record the number instead of guessing |
| Degraded mode | if the bundle fails to load, fall back to a plain `<textarea>`: editing must never be blocked by an asset |

### Can it author Markdown documents? Yes — and it is the right core for *our* Markdown

Monaco is a text editor with language support, and Markdown is one of its languages. It writes and edits
`.md` files exactly like VS Code does. What that means in practice:

| Need | Built into Monaco | Our addition |
|---|---|---|
| Highlighting for headings, lists, tables, fences, links | **yes** — the Markdown language | — |
| Folding by heading, bracket matching, auto-close | **yes** | — |
| List/blockquote continuation on Enter, indent/outdent | **yes** (Markdown language configuration) | — |
| Word wrap — essential for prose | available, but **off by default** | we set `wordWrap: "on"` for `.md` models |
| Find/replace, multi-cursor, column select, minimap | **yes** | — |
| Link and image-path completion | no | a completion provider fed by `index.json` (page ids) and the page's `media/` listing — typing `](` suggests *real* pages, so a broken link is hard to type in the first place |
| Page metadata in the text | n/a — our pages carry **no front matter by design** | registry fields live in the toolbar, written to the registry, not the page |
| Rendered preview | no | the preview pane (iframe → `docfx serve`) — *preview == site* |
| Gate findings on the exact line | via the markers API | `docs:blocking` + `registry --check` results as squiggles |
| Spell check | **no** — VS Code's is an extension | **v1 ships without it**; the hook exists (a local dictionary library, offline) if prose errors justify it later |
| Table grids, WYSIWYG formatting | no rich mode | Markdown snippets; tables stay text |
| Reflowing a hard-wrapped paragraph | **never** — it is plain text | this is precisely why it is the right core |

So: Monaco authors the Markdown source; the preview pane, the markers and the completion provider are the
three things we add on top. Nothing about our hard-wrapped pages is ever rewritten.

### Are there editors that already ship the toolbar?

Yes — several "batteries-included" Markdown editors have the toolbar we would otherwise build. They all
force the same trade: the toolbar is the *cheap* half of an editor, and what you pay for it is either the
**VS Code-class editing core** or the **hard-wrap property of our pages**.

| Editor | Toolbar built in | Editing mode | Size | Maintenance | Verdict for us |
|---|---|---|---|---|---|
| **Monaco** | **no** — we build it (~1 day) | source | 2–5 MB (custom bundle smaller) | very active (VS Code core) | **chosen** |
| CodeMirror 6 | no | source | ~250–400 KB | active | fallback if the Monaco bundle is too heavy |
| EasyMDE | **yes** | source + preview | ~200 KB | maintained fork of SimpleMDE | fallback for constrained hosts |
| Toast UI Editor | **yes** | WYSIWYG **and** Markdown | ~600 KB+ | upstream archived / slow — verify before depending on it | rejected (reflow risk, size, its own theme) |
| Vditor | **yes** | IR / split / WYSIWYG | ~1 MB | active | rejected (same reasons) |
| Cherry Markdown | **yes** | several modes | large | active-ish, docs mostly Chinese | rejected (same reasons) |
| ByteMD | **yes** | source (CodeMirror 6 inside) | medium | releases have gone quiet | rejected (staleness) |
| MDXEditor / Milkdown / TipTap | **yes** | WYSIWYG (Lexical / ProseMirror) | needs a React runtime | active | rejected on principle — see the hard-wrap row in §1 |
| `github.dev` / Codespaces | VS Code's own UI | source | nothing of ours | n/a | complement for engineers, not the product |

The pattern is consistent: **rich editors reflow** (our pages are hard-wrapped, so a rich round-trip rewrites
whole files and destroys `git blame`), and **lightweight editors are not VS Code**. Nothing ships "Monaco +
our toolbar + link completion + gate markers" as a package, and those three integrations are the parts only
we can build anyway.

If a batteries-included editor is ever adopted, one guard becomes mandatory with it: a **reflow check** in
the publish gate — fail when the diff rewrites more than a small percentage of untouched lines, because that
means the editor reformatted the page. That check is cheap and it is the only thing standing between a rich
editor and an unreviewable history.

Everything else on the page is plain DOM in our template layer — no framework runtime is added.

---

## 2. Screen layout

```
┌ toolbar  [T3000 ▸ Features ▸ Trend Logs]  [B] [I] [H▾] [• list] [1. list] [❝] [table] [link] [image]  [Save draft] [Validate] [Diff] [Publish]
├───────────────────────────────────────────────┬───────────────────────────────────────────────────────
│  Monaco                                       │  Preview (iframe → docfx serve on the draft worktree:
│   • Markdown source — the editor of record    │  same template, same links, same search index)
│   • tabs: Source │ Diff (Monaco diff vs main) │
│   • problems: gate findings as inline markers │
├───────────────────────────────────────────────┴───────────────────────────────────────────────────────
└ status bar  draft branch · last save · gate results · conflicts · cursor + word count
```

States: `read` (no draft) → `drafting` → `validating` → `diff` → `published` (shows the PR link). A gate
failure keeps the page in `validating` with the failing lines underlined in the editor; publish stays
disabled.

### The toolbar is ours — Monaco ships none

Monaco is only the **editor component**. The toolbar, the side panes and the command palette are VS Code's
*application shell*, which is not part of Monaco. Nothing in Monaco draws a "B / I / link" bar, and it has no
Markdown formatting buttons at all. **We build the toolbar** in our own template layer — plain HTML + CSS
plus a dispatch table in `main.js` — and every button also registers as a Monaco **command**, so keyboard
users get the same actions through the command palette and shortcuts (nothing is mouse-only).

| Toolbar group | Buttons | Backed by |
|---|---|---|
| Inline | Bold `**…**` · Italic `*…*` · Inline code `` `…` `` | `executeEdits` on the selection |
| Blocks | Heading level (`##`–`####`) · bullet list · numbered list · task list · blockquote · code block with language · table snippet · horizontal rule · DocFX note/tip/warning callout | snippets |
| Insert | **Link → page picker** (from `index.json`) · **Image → upload**: writes the file into the page's `media/`, then inserts the relative reference | our completion provider + `POST /api/docs/upload` |
| Document | Save draft · Validate · Diff · Publish · preview toggle | the API in §3 |
| Navigation | heading outline (jump to a section) · page picker | `index.json` |

What Monaco **does** give for free — not worth rebuilding:

| Free chrome | Notes |
|---|---|
| Breadcrumb bar (`breadcrumbs.enabled`) | for Markdown it shows the heading path, so it doubles as a live outline |
| Find/replace widget, folding controls, minimap, sticky scroll | plain editor options |
| Context menu + command palette | so every toolbar action is also a searchable command with a shortcut |
| Suggest widget | what renders our link/page completion |
| Hover and problem markers | where our gate findings surface, inline and in the gutter |

Cost: about **one day** for the toolbar, most of it in the two insert buttons that actually matter (the page
picker and the image upload). A ready-made toolbar exists only in the weaker editors (EasyMDE) — the trade we
already decided against.

---

## 3. API contract (same origin as the site: `:9103`)

| Method + path | Auth | Body → Response |
|---|---|---|
| `GET /api/docs/page?id=<page-id>` | editor | → `{ path, markdown, sha, registry, headings, media[] }` |
| `POST /api/docs/draft` | editor | `{ id, markdown, registry? }` → `{ branch, savedAt }` (creates/updates the draft branch) |
| `POST /api/docs/upload` | editor | multipart image → `{ url }` (committed into the page's `media/` on the draft branch) |
| `POST /api/docs/validate` | editor | `{ id }` → `{ ok, findings[] }` — runs the gates on the draft; each finding carries `line` + `column` so Monaco can mark it |
| `GET /api/docs/diff?id=<page-id>` | editor | → unified diff (text) + the registry diff |
| `POST /api/docs/publish` | editor | `{ id, comment? }` → `{ pr }` or `{ errors[] }` |
| `GET /api/docs/pages` | any | → the page list for the picker (served from the static `index.json`) |

`id` is always a **registry page id** (`t3000/features/trendlogs`). There is no path parameter anywhere:
the server resolves id → file path through the registry, so a caller cannot address a file that is not a
documented page.

Rendering for the preview is **not** an API call — the server keeps `docfx build --serve` running on the
draft worktree at an internal port, and the preview iframe points at it.

### Uploads: what you can attach

| Kind | Types | Notes |
|---|---|---|
| Screenshots (the common case) | PNG, JPG, WebP, GIF, SVG | PNG for UI, JPG/WebP for photos — the media rules in `01-plan.md` |
| Diagrams | SVG | **sanitized on upload** (strip `<script>`, `on*` handlers, external references), then rendered through `<img>` |
| Attachments | PDF, ZIP, CSV | copied as DocFX *resources* and linked from the page; they are not pages |
| Rejected | anything else · > 10 MB per file · > 2 MB for an image | the error names the limit and lists what the page already has |

Flow: **paste a clipboard screenshot (Ctrl+V)**, drag-and-drop, or the toolbar button → `POST
/api/docs/upload` → the file is written into the **page's own `media/` folder on the draft branch** → the
relative reference is inserted at the cursor. Nothing reaches the published site until the draft is merged.

Rules the uploader enforces — the same ones the audit checks afterwards:

1. **The destination is derived, never supplied**: the page's `media/` folder inside the draft worktree, with
   a slugified filename (`02-run-screen.png`). A client-provided path is never used (see §5 rule 1).
2. **Reading-order naming** (`NN-area-slug.png`) is proposed by the tool; the author can adjust it before
   saving.
3. **≥ 1600 px wide for UI screenshots** — doc pages stretch images to the content width, so smaller ones
   blur.
4. **No duplicate copies**: if identical bytes already exist in the repo, the editor reuses that file and
   says so.
5. **Missing / unused / oversized / duplicate media** are reported weekly by the audit
   (`11-review-and-cicd.md`), so uploads cannot quietly rot.

Failure: a rejected upload never costs the draft — the reason appears in the status bar and no file is
written.

---

## 4. Server-side git flow

```
server (internal host, where the API runs)
  ├─ content clone            <data>/docs-repo        ← our repo, checked out on main
  ├─ draft worktrees          <data>/docs-work/<slug>  ← one per open draft (git worktree add)
  ├─ preview                  docfx build --serve on the draft worktree  (internal port)
  └─ credentials              a deploy token / SSH key with contents:write + pull_requests:write,
                              stored in server config, scoped to this repository only

open draft   → git worktree add -b docs/<slug> <path> main
save         → write the file(s) in the worktree (and registry.json if a field changed)
validate     → run the gates inside the worktree
publish      → git commit -am …  →  git push -u origin docs/<slug>  →  open a PR (GitHub API)
merge        → normal review; CI builds and publishes; the draft worktree is pruned
```

| Rule | Why |
|---|---|
| drafts are **worktrees**, never the live tree | editing can never disturb the published site or a running build |
| drafts are **branches**, never database rows | git is the history; there is nothing to back up or migrate |
| publish requires the branch to be **up to date with `main`** | a stale branch is refused; the editor offers "sync" which rebases and surfaces conflicts |
| one open draft per page **per user** | two people on one page is a conflict, not a merge — the second editor is told who holds it |
| no network to GitHub (air-gapped host) | publish writes a `.patch` bundle for a human to apply, and says so |

---

## 5. Safety rules

1. **Addressable targets are registry page ids only.** No user-supplied paths, anywhere.
2. **Size limits**: page ≤ 1 MB, image ≤ 10 MB, and images are content-type sniffed.
3. **Publish runs the gates first** — `docs:blocking`, `registry --check`, link check, media check. Failures
   block publish; they are never skipped with a flag. Waivers live in the registry (`14-governance.md` §6).
4. **Restricted fields.** `title`, `order`, `owner`, `tags`, `keywords`, `reviewer`, `code` are editable by
   a page owner; `chapter`, `ship`, `area`, `category` are *structure* and are marked "needs the docs
   owner" — the editor requires a PR comment for those (governance, not tooling).
5. **Generated files are not editable** (`toc.yml`, `docfx.json`, the manifests, `index.json`). The editor
   refuses them; the fix is to edit the registry and regenerate.
6. **Internal host only.** The editor is served only where a git remote and a content clone exist. Field and
   customer machines have neither, so `/docs/edit/**` is simply absent there — read-only by construction.
7. **Auth reuses what exists**: the API's `require_auth` middleware (`Authorization` vs `API_SECRET_KEY`) or
   the server's user accounts, with `editor` / `reviewer` roles. Reading stays anonymous.
8. **Audit trail is the PR.** Every published change is a commit + PR with the page id, the author, the diff
   and the gate results.

---

## 6. Relationship to the rest of the authoring surface

| Surface | Role |
|---|---|
| `/docs/_admin/` (phase 1) | read-only dashboard: coverage, stale by owner, docs-owed, unowned, unreviewed, health score |
| `/docs/edit/<page-id>` (phase 3) | this document — the editor |
| dashboard → editor | a row deep-links into the editor for that page (that is the point of the dashboard) |
| `:8080` (`docfx build --serve`) | the developer's own preview; the editor reuses the same mechanism internally |
| `github.dev` / Codespaces | real VS Code on the real repo, zero code from us — the zero-cost option for engineers. No preview of our template, no registry fields, no gate markers, so it is a complement, not the product |
| GitHub "Edit this page" | still present as the secondary path, and the fallback if the editor host is down |

---

## 7. Failure modes

| Failure | Behaviour |
|---|---|
| draft worktree missing on save | recreated from `main`; the user is told their branch was re-based |
| branch behind `main` at publish | publish refused, "sync" offered; conflicts are listed per hunk |
| preview server down | the editor still saves; the preview pane says so and offers a rebuild button |
| Monaco bundle fails to load | the editor drops to a plain `<textarea>`; save, validate and publish keep working — an asset never blocks editing |
| push rejected (permissions or protected branch) | the error and the remote's message are shown verbatim; the draft is kept |
| gate failure | findings listed with file:line; publish disabled |
| page id unknown | 404 with the closest registry matches ("did you mean …") |
| two editors, one page | the second is read-only with the holder's name and the draft age |
| > 10 MB image | rejected client-side *and* server-side |

---

## 8. Tasks (phase 3)

| # | Task | Acceptance |
|---|---|---|
| 1 | `npm run docs:editor:build`: custom Monaco bundle (editor + Markdown + diff editor + workers), self-hosted under `docs/templates/t3000/public/editor/` | the editor loads with the network off; bundle size recorded in CI |
| 2 | Editor page in `templates/t3000/public/` — Monaco, lazy load, `<textarea>` fallback, guarded so it 404s when the editor is disabled | `/docs/edit/<id>` loads; Source and Diff tabs work |
| 3 | `GET /api/docs/page`, `POST /api/docs/draft`, `GET /api/docs/diff` | a draft branch appears on save; the diff tab matches `git diff` |
| 4 | Gate findings → Monaco markers (`/api/docs/validate`) | a broken link shows as a squiggle on the exact line |
| 5 | `POST /api/docs/upload` with sniffing and size limits | the image lands in the page's `media/` on the draft branch |
| 6 | `POST /api/docs/publish` (commit → push → PR) with the sync check | a published draft opens a real PR; a stale branch is refused |
| 7 | Roles + auth wiring (`editor`, `reviewer`) and the "disabled" mode | anonymous read; non-editors get read-only |
| 8 | Registry-field editing incl. the "structure needs the docs owner" rule | editing `order` publishes; editing `chapter` demands a PR comment |
| 9 | One-draft-per-page lock + dashboard deep links | a second editor sees read-only with the holder's name |

**Acceptance:** on the internal host, a support engineer opens a stale page from the dashboard, edits the
paragraph, uploads one screenshot, sees a preview identical to the site, validates, publishes, and the result
is a normal PR. On a field machine, the same URL does not exist and the page is read-only. Nothing is stored
outside git.

---

## 9. What we deliberately do not build

| Not building | Because |
|---|---|
| WYSIWYG / rich-text editing | hard-wrapped pages; a rich round-trip rewrites whole files |
| an embedded VS Code (`vscode.dev` in an iframe) | Monaco gives the editing experience; the integration — our preview, registry fields, gate markers, publish flow — is the part we actually need |
| real-time co-editing | one draft per page per user is enough, and git already merges |
| in-browser image editing | screenshots are captured properly or not at all (the media rules in `01-plan.md`) |
| comment threads on drafts | PR review is the review tool, and it already records decisions |
| a CMS database | documents live in git; a database is a second source of truth waiting to disagree |

---

## 10. Decisions, and what is deliberately deferred

**Decided — do not relitigate:**

| Decision | Because |
|---|---|
| Editor core is **Monaco**, source-first | VS Code-class editing, and it never reflows our hard-wrapped pages |
| The bundle is **self-hosted and custom** (editor + Markdown + diff + workers) | the offline rule, and the all-languages default bundle is pure waste |
| The **toolbar is ours** (~1 day); every button is also a Monaco command | no library ships our toolbar *plus* link completion *plus* gate markers |
| **Preview is `docfx build --serve`** on the draft worktree | preview == site, by construction; no second renderer to drift |
| **Gate findings are markers** in the editor | a broken link becomes a squiggle, not a log line to hunt for |
| **Drafts are git branches in worktrees**, publish is a PR | git is the history; there is no CMS database anywhere |
| **Internal host only**; field machines stay read-only | they have no git remote, so there is nothing to edit against |
| **No WYSIWYG, no spell check, no table grid, no co-editing** in v1 | each is either a reflow risk or a cost we do not need yet |

**Deferred, each with the trigger that would reconsider it:**

| Deferred | Reconsider when | Cost if adopted |
|---|---|---|
| Spell check | prose errors keep reaching review | a locally shipped dictionary + a toggle |
| Table grid editor | authors ask for it more than once | a small dialog, not a rich editor |
| CodeMirror 6 sweep | the custom Monaco bundle exceeds ~2 MB gzipped | swap behind the same API; redo the toolbar bindings |
| `github.dev` shortcut in the toolbar | engineers want the full IDE on a page | one link |
| Patch-based offline publishing | an air-gapped host must publish without a remote | a `.patch` bundle and a documented hand-off |
| Rich / WYSIWYG mode | **never** without the reflow check in the publish gate | a whole-file-diff discipline problem |

With §1–§9 above, this document is buildable without further questions.
