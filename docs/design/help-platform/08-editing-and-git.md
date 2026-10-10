# 08 — Editing, preview and Git integration

*Covers: Editing System · Git Integration (plus the reviewer-facing half of the Review Process).*

Two halves: how a change is **made** (editing + preview), and what the page **shows about itself**
(provenance). Both must work without any hosted service — the hosted editor is phase 3.

---

## 1. Editing workflow (phases 1–2, no backend)

```
edit Markdown in any editor
  → npm run docs:serve    (DocFX site, live preview at :8080)
  → npm run help:preview  (Windows CHM, when the page ships there)
  → npm run docs:blocking (link / offline / structure gate)
  → commit → pull request → review by the page owner → merge → publish
```

| Need | How it is met | Notes |
|---|---|---|
| Markdown editing | any editor; VS Code with the workspace `.vscode` settings | no format lock-in |
| Live preview (site) | `npm run docs:serve` | rebuilds as you type; keeps scroll position |
| Live preview (CHM) | `npm run help:preview` | the only way to see how a page looks in the help viewer |
| Image placement | `media/` next to the page it belongs to, PNG, ≥1600 px wide | the app renders doc images at full content width, so small screenshots upscale into blur |
| Link checking | `npm run docs:blocking` + DocFX's own broken-link warnings | relative `.md` links are validated by the build |
| Table editing | Markdown tables (GFM) | no grid editor |
| Drafts | a branch, or a `[WIP]` PR | nothing unpublished is ever in `docs/` on `main` |
| PR checklist | the repo's PR template gains a docs section | see §5 |

Prose rules that survive tooling: no `§N` references (name the section instead), cross-document pointers
name the target section in bold next to the link, section anchors are computed from the heading (never
typed by hand).

---

## 2. Hosted editor (phase 3)

| Feature | Design |
|---|---|
| Entry point | "Edit this page" on the DocFX article → the portal editor at `/edit/<page-id>` (phase 1 links straight to GitHub instead) |
| Editing | **Monaco** (the VS Code core) source editor — heading outline in the breadcrumb bar; registry fields shown read-only while editing |
| Preview | server-side render of the page (same DocFX pipeline) in a right pane; "view in site" opens it for real |
| Image upload | `POST /api/docs/upload` → validated (content type, size ≤ 10 MB) → committed to the page's `media/` folder on the draft branch |
| Draft save | the draft is a commit on branch `docs/<page-id>-<user>-<ts>`; no database table for content, ever |
| Publish | "Publish" opens the PR for that branch (title = page id, body = the diff summary) — still a human merge |
| Auth | Entra ID (or LDAP, or local accounts) for `editor`/`reviewer` roles; read access stays anonymous |
| Conflicts | normal git conflict flow: the editor refuses to publish when the branch is behind `main` |

**Invariant:** the portal never stores document bodies. It edits working-tree files and pushes branches.

Full design — library choice, screen layout, API contract, server-side git flow and the safety rules — is in
`15-online-editor.md`.

---

## 3. Git integration (what the page shows)

DocFX already has the mechanism; we configure it and fill the gaps.

| Surface | Mechanism | Where configured |
|---|---|---|
| "Edit this page" / "Improve this doc" | `_gitContribute: { repo, branch }` + `_gitUrlPattern: "github"` | `docfx.json` `globalMetadata` |
| Same, for a *second* source repo | `_gitContribute` mapped per source glob in `fileMetadata` | required as soon as content comes from more than one repo — the URL is config, not where the file sits |
| "View source" | same keys, file path + line | `docfx.json` |
| Turn git features off per area | `_disableContribution: true` (`legacy/**`, `design/**`) | `fileMetadata` |
| Last updated (date) | `page-meta.json` → `main.js` page-meta bar | generated (`05-content-and-registry.md`) |
| Author of the last change | `page-meta.json` (`git.author`) | generated |
| Commit reference | linked short SHA → `…/commit/<sha>` | generated |
| Full history | linked `…/commits/main/<path>` | template link in the page-meta bar |
| Version the page belongs to | `page-meta.json` (`v`) + `versions.json` | generated |
| Review state | `page-meta.json`: `owner`, `reviewed`, `stale` | generated; stale chip only |

Why not rely on DocFX's built-in git dates alone: they are derived per build and are not cheap on a large
repository, and they cannot express "reviewed by", "owner" or "stale". `page-meta.json` is one small fetch
and carries all of it; `disableGitFeatures` stays `false` because the edit/source links are worth it.

---

## 4. Reviewer view

Reviewers get the same page plus context that only matters to them:

- an **internal banner** (visible only with `?internal=1` or on the internal host) summarising: owner,
  review age, stale reason ("`api/src/t3_device/trendlog*.rs` changed on 2026-10-02"), open feedback count
  for the page;
- a **diff-first review**: the PR body lists the registry fields that changed, plus the rendered pages, so
  order/title changes are visible without reading the YAML;
- a **"docs owed" badge** on pages that claim code changed without the page changing (see
  `11-review-and-cicd.md`).

---

## 5. PR template (docs section)

```markdown
## Docs impact
- [ ] Pages updated: <page ids>
- [ ] Registry updated (chapter/order/title/owner/code/tags): <what and why>
- [ ] `npm run docs:blocking` passes
- [ ] `npm run docs:serve` spot-checked the changed pages (site)
- [ ] `npm run help:preview` spot-checked the changed pages (CHM, if the page ships)
- [ ] New/changed images are local and ≥1600 px wide
- [ ] No new page metadata (front matter) was added
```

---

## 6. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | Point `_gitContribute` at the real repo + branch; verify edit/source links resolve | 1 |
| 2 | `page-meta.json` + the page-meta bar widget | 1 |
| 3 | `fileMetadata._disableContribution` for `legacy/**`, `design/**` | 1 |
| 4 | Docs section in the PR template | 1 |
| 5 | Internal banner (owner, review age, stale reason, feedback count) | 2 |
| 6 | Portal editor + upload + draft-branch publish | 3 |
| 7 | Roles/auth for editor and reviewer | 3 |

**Acceptance:** "Edit this page" on a T3000 page opens the correct file at the correct branch; the page-meta
bar shows date + SHA + owner and links to history; the internal banner appears only with `?internal=1`; a
draft branch published through the portal produces a normal PR.
