# 14 — Governance: ownership, publishing, emergencies, retirement

*Covers the operational questions the technical design cannot answer by itself. `11-review-and-cicd.md` is
the tooling; this document is the policy the tooling enforces.*

Without this page the architecture is complete but the project is not runnable: nobody knows who may
publish, who may waive a gate, or how a page is retired.

---

## 1. Roles

| Role | Who | Owns | May |
|---|---|---|---|
| **Docs owner** (exactly one named person) | assigned by management | structure, prose standards, the registry, the weekly ritual | approve any doc change; waive `docs-owed`; retire a page; decide merge/split of overlapping pages |
| **Page owner** | named in `registry.pages[].owner` | the truth of the pages whose `code` globs they claim | update those pages; request a waiver; delete an obsolete page *after* the docs owner agrees |
| **Reviewer** | named in `registry.pages[].reviewer` | review quality for a domain | approve PRs touching those pages |
| **Release owner** | rotates per release | the release artefacts (CHM, PDF, offline zip, release notes) | publish a version; freeze a snapshot |
| **Platform owner** | this design's maintainer | engine pin, template, generators, CI | upgrade the engine pin; change the portal contract |

Rules:

1. Every `ship: true` page has an owner. An unowned page is a build error, not a warning.
2. Owners are **roles, not people**, where possible (`trendlog`, `bacnet`, `ui`) — a person leaving must not
   orphan 40 pages. The mapping role → person lives outside the registry, in the team's roster.
3. The docs owner is a *named human*; "the docs team" is not an owner.

---

## 2. When review is required

| Change | Review required |
|---|---|
| Prose edit to a shipped page | the page owner or the docs owner |
| New page | the docs owner (structure/title/order) + the page owner |
| `chapter`, `order`, `title`, `ship` change in the registry | the docs owner (it changes navigation and the CHM) |
| `code` glob change | the page owner (it changes what marks the page stale) |
| Mechanically generated files (`docfx.json`, `toc.yml`, manifests, `index.json`) | must be regenerated, never hand-edited; CI proves freshness |
| Template / widget change | the platform owner |
| Engine pin upgrade | the platform owner, with the app-verify command in the PR (`02-docfx-engine.md` §6) |
| Release notes | the release owner + the docs owner |

---

## 3. Publishing

| Action | Who | Mechanism |
|---|---|---|
| Publish the site (current version) | CI on merge to `main` | `publish` job → `/docs/` |
| Publish a version snapshot | the release owner | tag → `publish` job → `/docs/<version>/` |
| Publish the CHM | the release owner | `npm run build:help` → attach to the release; the installer copies it next to `T3000.exe` |
| Publish the PDF / offline zip | the release owner | `npm run docs:pdf`, `npm run docs:offline`, attached to the release |
| Publish a *page* | any author | pull request; nothing bypasses review |

Rollback: the previous version folder plus `versions.json` is the pointer — restoring both is a copy, no
rebuild (`11-review-and-cicd.md` §4). Rolling back a *page* is a revert commit.

---

## 4. Emergency changes

Definition: a customer-visible error in the docs (wrong instruction, dangerous procedure, wrong field name)
during a release window.

| Step | What |
|---|---|
| 1 | Comment on the PR or open an issue with `docs-urgent` and name the page |
| 2 | Edit **only that page** (no restructuring, no template changes) |
| 3 | The docs owner or the release owner may approve *without* the normal owner if they are unavailable; the owner is notified the same day |
| 4 | `docs-owed` may be waived with the reason `docs-urgent`; the waiver expires in 14 days |
| 5 | Ship: the CHM is rebuilt if the page is in the manual, and the release notes record the correction |

Escalation: if the docs owner and the release owner are both unreachable, the platform owner may approve —
recorded in the PR, never silent.

---

## 5. Deprecation and retirement of pages

| Situation | Action |
|---|---|
| Page describes a removed feature | mark `deprecated: true` in the registry, add a banner at the top ("This describes behaviour removed in <version>"), keep it for one release, then |
| Page describes a *replaced* feature | add a "superseded by <page>" banner linking to the replacement immediately; never leave two conflicting pages competing in search |
| Overlap (two pages, same content, different emphasis) | the docs owner decides merge or keep; if both are kept, each gets a one-line "not the same as <other page>" pointer at the top |
| Truly dead page | remove from `toc.yml`/manifests (`ship: false`) first, then delete the file in a follow-up PR; the version snapshot keeps it readable |
| URL that must survive | generated redirect stub with `redirect_url` metadata (a *generated* file may carry metadata; hand-written pages never do) |

Never delete a page and add a new one in the same PR: removals are visible on their own.

---

## 6. Waivers

A waiver is a time-boxed, recorded exception. It lives in the registry, never in a CI setting:

```jsonc
"waivers": {
  "t3000/features/trendlogs": { "until": "2026-11-15", "reason": "behaviour not shipping yet", "by": "docs" }
}
```

- An expired waiver is a gate failure (`11-review-and-cicd.md` §3).
- A waiver longer than one release cycle needs the docs owner's name in `by`.
- Waiver count is on the health dashboard; a growing number is a signal, not a solution.

---

## 7. Standards the docs owner enforces

1. No page metadata (no front matter) in shipped pages — structure and ownership live in the registry.
2. No file moves: reorganization means a registry change, not a rename.
3. No bare `§N` references; name the target section and link it.
4. Screenshots live in the page's own `media/` folder, named `NN-area-slug.png`; no `image1.png`.
5. A page names its audience (user / developer / contributing) via the registry; user pages are the ones the
   gates block on.
6. Terminology: T3000, Design Studio, Tstat11, the product's own names — no third-party product names in
   shipped pages.
7. The docs owner decides the language question: English only today; a `docs/<lang>/…` layout and translated
   titles are a registry concern, so the door stays open without paying for it now.

---

## 8. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | Name the docs owner; record it in the registry and in this document | 0 (human) |
| 2 | Publish this policy where authors will see it (PR template + `docs/design/help-platform/README.md`) | 1 |
| 3 | Waiver block in the registry schema + the expiry gate | 1 |
| 4 | `docs-urgent` label + the emergency checklist in the PR template | 1 |
| 5 | Deprecation/supersede banners as a generated block (registry `deprecated`/`superseded_by`) | 2 |
| 6 | Generated redirect stubs for retired pages | 2 |
| 7 | Roles → people roster maintained outside the repository | 1 |

**Acceptance:** an unowned shipped page fails the build; an expired waiver fails the build; the PR template
carries the docs section and the emergency checklist; a retired page keeps its URL via a generated redirect
stub and disappears from navigation before its file is deleted.
