# T3000 Learn Platform

## Microsoft Learn / MSDN Inspired Documentation Ecosystem — Technical Design

| | |
|---|---|
| Status | Draft — technical design and implementation reference |
| Date | 2026-10-10 |
| Basis | Follows the Microsoft Learn-inspired platform specification: same sections, same six layers, same phases, adapted to the T3000 codebase and its shipping constraints |
| Web engine | **DocFX** — the open-source documentation engine that powered Microsoft's docs platform; the only website / offline-site / PDF / search-index engine in this design |
| Engine source | a **clone of `dotnet/docfx` at `tools/docfx`**, pinned to a commit (`tools/docfx.pin`), built from source so the version is fixed and patchable |
| CHM engine | the existing Node pipeline + `hhc.exe` (`scripts/build-t3000-help-chm.mjs`); DocFX cannot emit CHM |
| Existing assets | `docs/` (319 Markdown pages), `scripts/build-t3000-help-chm.mjs`, `scripts/audit-docs.mjs`, the in-app Documentation page, the MCP doc tools |

---

## Project Vision

Build a long-term documentation ecosystem for T3000 inspired by Microsoft Learn.

The platform becomes the official knowledge center for:

- T3000
- Building Controllers
- BACnet
- Modbus
- MQTT
- APIs
- SDKs
- Architecture Documentation
- Troubleshooting Guides
- Release Notes
- Customer Manuals
- Developer Documentation

The final product should feel like Microsoft Learn: search, browse, learn, give feedback, receive
updates, and contribute documentation.

The system must support:

- Online documentation portal
- Offline website package
- PDF manuals
- CHM help files
- Documentation editing
- Git-based version control
- Feedback collection
- Notifications
- Release management
- Search
- AI-assisted maintenance

The long-term goal: documentation never becomes outdated and remains synchronized with product
development.

### Where T3000 starts from

| Capability | State today | Gap to close |
|---|---|---|
| Single source in Git (Markdown) | **exists** — `docs/` | structure not declared in one place |
| CHM help file, offline, F1 | **exists** — `npm run build:help` | F1 id map 61% complete |
| Full-text search | **exists** — compiled into the CHM | no search outside the CHM; the DocFX lunr index closes this in phase 1 |
| Documentation website | **not started** | DocFX build in phase 1 (local), published in phase 3 |
| Offline reading | **exists** — the CHM is offline by design | no offline website package, no PDF |
| In-app documentation page | **exists** — React page, T3000 + Legacy trees | no "In this article", no feedback, no last-updated |
| Git version control | **exists** | per-page author/commit not surfaced |
| Docs-as-code gates | **exists** — `npm run docs:blocking` | no "docs owed" check, no ownership |
| AI-assisted maintenance | **not started** | the core of phases 2 and 5 |
| Portal, editing UI, feedback, subscriptions, notifications | **not started** | phases 2–5 |

## Core Philosophy

### Single Source of Truth

All documentation is stored in Git as Markdown. No separate sources for the website, CHM, PDF, the
offline package, search or the AI knowledge base.

```
Markdown documents (docs/**)
        │
        ▼
Publishing pipeline (scripts/)
        │
        ▼
Website · Offline website · PDF · CHM · Search index · AI knowledge base
```

Outputs, and what produces each:

| Output | Producer | State |
|---|---|---|
| Documentation website | `docfx build` → `_site/` | phase 1 (local) / phase 3 (published) |
| Search index (portal) | `docfx build` → `_site/index.json` (lunr) | phase 1 |
| PDF manual | `docfx pdf` → `T3000-Learn.pdf` | phase 4 |
| Offline website package | zip of `_site/` (relative URLs) | phase 4 |
| CHM (`T3000_Help.chm`) | `npm run build:help` (hhc.exe) | exists |
| In-app documentation page | the app reads `docs/**` through `/docs/…` | exists |
| Search index (offline CHM) | compiled into the CHM by hhc.exe | exists |
| AI knowledge base | `docs/help/index.json` + the MCP doc tools | phase 5 |

### Documentation as Code

Every document change carries: author, date, commit history, version, pull request, review.

Concretely, per page in `docs/help/index.json`:

| Field | Source |
|---|---|
| Author, last commit | `git log -1 --format='%an %h %ad' -- <path>` |
| Verified date, owner, reviewer | `docs/help/registry.json` |
| Version | the release the CHM was built for |
| Review state | PR history; `docs-owed` check result |

### AI-Assisted Documentation

AI maintains the corpus; humans approve what customers read.

| AI duty | Produces | Phase |
|---|---|---|
| Analyze commits | a 2–4 line summary per commit, grouped by scope | 2 |
| Detect impacted documents | the list of pages whose `code` globs match the diff | 2 |
| Identify stale content | pages whose claimed code changed after the verified date | 2 |
| Suggest updates | mechanical edits applied; prose edits proposed as diffs | 2 |
| Generate release notes / What's New | draft pages, editable before publication | 2 |
| Assist in search | natural-language answers with page references (MCP) | 5 |

## Overall Architecture

Six layers. Each row gives the technology, the artifacts, and what exists versus what is new.

### Engine decision: DocFX

The website side of this platform is built on **DocFX**, the open-source static documentation engine that
powered Microsoft's own documentation platform. Two facts drive the rest of this design:

- **Microsoft Learn moved off DocFX in November 2022** and no longer maintains it. DocFX continues as a
  community-driven project under the .NET Foundation.
- Therefore we do not install it and hope: we **clone the DocFX repository**, pin a commit and build it
  ourselves, so the site's rendering can never change under us, and so a template or engine fix is a local
  patch rather than an upstream wait.

DocFX is **the** site engine for this project; MkDocs, VitePress, Starlight and Next.js are not
alternatives in this design.

| Why DocFX | Detail |
|---|---|
| Learn-style layout without building it | left navigation, article column, the right "In this article" rail (affix), breadcrumbs, prev/next article, TOC filter, dark mode and a lunr search index come from the built-in `default` + `modern` templates |
| Markdown stays where it is | `docfx.json` globs + `toc.yml` describe the corpus; pages keep their current paths, so the in-app documentation page, the MCP doc tools and every existing link keep working |
| Navigation is a separate file | `toc.yml` is generated from the registry — which is exactly how per-page metadata stays **out of `docs/**`** |
| Links are validated | relative `.md` links are resolved and warned on, and `~/` gives root-relative links, so broken links are caught by the build |
| It also produces the PDF | with `pdf: true` and DocFX ≥ 2.73, `docfx pdf` renders `toc.pdf` from the same TOC structure — the PDF cannot diverge from the site |
| The search index is a build artifact | every build writes the search index and an `xrefmap.yml`, which matches the offline-first requirement |
| Templates are replaceable | a T3000 template layer (`templates/t3000`) overrides look and feel without touching content |
| It is ours to fix | the clone can carry patches; embedded template names `default`, `default(zh-cn)`, `statictoc` and `common` are reserved by the engine |

What DocFX does not do, and what covers it:

| Missing | Covered by |
|---|---|
| CHM output | `scripts/build-t3000-help-chm.mjs` + `hhc.exe` — the shipping artifact opened by F1 |
| C++ / Rust / TypeScript API metadata | Markdown API pages authored from the OpenAPI and register definitions (`docfx metadata` applies to .NET only) |
| Docs linting, broken-link and offline-asset rules | `scripts/audit-docs.mjs` |
| Context-sensitive help ids | `scripts/docs-map.mjs` (F1 id map) |

### Layer 1: Content Repository

| | |
|---|---|
| Stores | `docs/t3000/**` (product docs), `docs/legacy/**` (engineering notes), images beside the pages |
| Technology | the existing repository (GitHub); no second repository is created — the content repository already exists and every format is generated from it |
| Content format | Markdown, images (PNG/SVG), attachments |
| Structure declared in | `docs/help/registry.json` (see *Content Organization*) |

### Layer 2: Documentation Engine

| | |
|---|---|
| Purpose | turn one Markdown source into every output, and report what is wrong with it |
| Web / offline site / PDF / search engine | **DocFX** (`dotnet tool install -g docfx`) |
| CHM engine | the Node pipeline: `scripts/build-t3000-help-chm.mjs` → `hhc.exe` |
| Lint / gate | `scripts/audit-docs.mjs`; mechanical cleanup: `scripts/normalize-docs.mjs` |
| New | `scripts/docs-registry.mjs` (index + collection manifests + `docfx.json` + `toc.yml`), `scripts/docs-sync.mjs` (commit loop), `scripts/docs-map.mjs` (F1 map), `scripts/lib/doc-parse.mjs` (shared parser) |
| Contract | DocFX never becomes a second source: it reads `docs/**` plus the generated `docfx.json` / `toc.yml`; pages stay plain Markdown, in place, with no per-page metadata |

DocFX artifacts in this repository:

| File / command | Role | Generated? |
|---|---|---|
| `docfx.json` | build config: `content` globs (which folder feeds which area), `build.dest`, templates, markdown extensions | generated from the registry, `--check` in CI |
| `docs/t3000/toc.yml`, `docs/legacy/toc.yml` | navigation trees, one per area | generated from `registry.json` (`chapter`/`order`) — the same source as the CHM `.hhc` |
| `docfx build` | static site + lunr search index → `_site/` | phase 1 local, phase 3 published |
| `docfx serve _site` | local preview | phase 1 |
| `docfx pdf --pdf.toc.yml` | PDF manual → `T3000-Learn.pdf` | phase 4 |
| `_site/index.json` | in-site search index (lunr) | every build |
| `xrefmap.yml` + `xref:` links | cross references between pages, protocols and API entries | phase 1 onward |
| `docfx metadata` | .NET/C# API reference only; T3000 is C++/Rust/TypeScript, so API pages are authored in Markdown and rendered by DocFX | phase 3+ |
| template override | the T3000 look on top of `default` + `modern` | phase 3 |

Two engines, one source, and the split is deliberate: **DocFX owns the website, the offline site, the PDF
and the lunr index; the Node pipeline owns the CHM.** Both read the same Markdown and both take their
structure from the registry, and `scripts/docs-registry.mjs` fails the build if `toc.yml` and the
collection manifests ever describe different page sets.

### Layer 3: Portal Layer

| | |
|---|---|
| Today | the in-app Documentation page (`src/t3-react/features/documentation/`) with its own nav, markdown rendering and search-free browsing |
| Phase 1 change | its nav is generated from `docs/help/index.json` instead of the hand-written lists; the DocFX site exists locally next to it |
| Phase 3 | the **DocFX site** (T3000 template) is the portal: homepage with the search box, category navigation, recently-updated list, version switcher, feedback and editing entry points |
| Version switcher | one published `_site` per release tag, selected by the template |
| Rule | the portal renders the same pages; it never hosts content of its own |

### Layer 4: Search Layer

| | |
|---|---|
| Offline (must work) | the CHM's own full-text index, compiled by hhc.exe — already shipped |
| In-app page (phase 1) | the DocFX lunr index (`_site/index.json`) served statically; a Pagefind pass over `_site/` only if ranking needs it |
| Portal (phase 3) | the same DocFX index, published with the site; OpenSearch only if a hosted portal with real facets is approved |
| Facets | product, category, version, tags — all from the registry, no page edits |
| Semantic (phase 5) | natural-language questions answered over the corpus through the MCP doc tools, with page references |

### Layer 5: Collaboration Layer

| | |
|---|---|
| Editing | Markdown in any editor, `npm run help:preview` to see the result in the real help viewer |
| Review | pull requests; the `docs`-owned files list their owner in the registry |
| Approval | prose changes proposed, never committed unattended; mechanical edits auto-applied |
| Gates | `docs:blocking` (quality), `docs-owed` (a claimed feature changed without its page), registry validation |
| Feedback | phase 3 (portal) or a prefilled issue link before that |

### Layer 6: AI Layer

| | |
|---|---|
| Inputs | commit range, changed files, the registry, `index.json` |
| Responsibilities | commit analysis, documentation impact analysis, stale detection, changelog generation, search assistance |
| Runs where | CI (`docs-sync` job, advisory) and locally (`npm run docs:sync`) |
| Never | publishes prose to customers without a human approval step |

## Content Organization

Documentation is organized by user needs, not by source tree. The categories live in the registry, so
**no file has to move** (moving files would break the in-app page, the MCP tools and every inbound link):

| Category | Pages | Current location |
|---|---|---|
| Products — T3000, CM5, edge controllers, routers | device management, data points, features | `docs/t3000/**` |
| Protocols — BACnet, Modbus, MQTT | building platform, BACnet messages | `docs/t3000/building-platform/**` |
| Development — architecture, build system, source tree | architecture, design hub, components | `docs/t3000/architecture/**`, `docs/legacy/development/**` |
| Reference — APIs, commands, registers | REST API, control messages, registers | `docs/t3000/api-reference/**` |
| Troubleshooting — FAQs, known issues, field cases | troubleshooting guide | `docs/t3000/guides/**` |
| Tutorials — getting started, advanced, examples | quick start, Design Studio manual | `docs/t3000/quick-start/**`, `t3-eez-studio/manual/**` |
| Release Notes — releases, hot fixes, new features | releases | `docs/t3000/releases/**` |

Registry entry per page:

```json
"t3000/features/trendlogs": {
  "title": "Trend Logs",
  "category": "products",
  "product": "t3000",
  "audience": "user",
  "ship": true,
  "chapter": "features",
  "order": 40,
  "owner": "trendlog",
  "reviewer": "docs",
  "version": "v26.0930",
  "tags": ["trend", "history", "chart"],
  "keywords": ["trend log"],
  "help_ids": ["IDH_TOPIC_TREND_LOGS"],
  "code": ["src/t3-react/features/trendlog/**", "api/src/trendlog.rs"],
  "reviewed": { "sha": "a1b2c3d", "date": "2026-10-09", "by": "docs" }
}
```

## Documentation Metadata

Every document carries metadata — held centrally, because pages stay plain Markdown:

| Field | Used for | Store |
|---|---|---|
| Title | nav, CHM contents, search | registry (`title`) |
| Product | portal filtering, CHM collection choice | registry (`product`) |
| Category | navigation grouping, search facets | registry (`category`) |
| Version | release association, version switcher | registry (`version`) |
| Owner | review routing, staleness notifications | registry (`owner`) |
| Reviewer | approval record | registry (`reviewer`) |
| Verified Date | staleness arithmetic | registry (`reviewed.date`) |
| Tags / keywords | search facets, the CHM index | registry (`tags`, `keywords`) |

Validation: a page missing from the registry fails the build unless it is listed in `registry.exclude`
with a reason; a `ship: true` page must have `owner`, `chapter`, `order`, `code`.

## Website Design

Microsoft Learn principles, applied to the surfaces T3000 actually has.

### Homepage

| Component | Today | Phase |
|---|---|---|
| Large search box | absent (CHM search only) | 3 — portal |
| Product categories | sidebar sections | 1 — generated from the registry |
| Documentation categories | sidebar sections | 1 |
| Recently updated | absent | 1 — from `index.json` |
| Featured content | absent | 3 |
| Release information | `docs/t3000/releases/**` | 2 — generated What's New |

### Documentation page layout

| Zone | Content | Today | Phase |
|---|---|---|---|
| Left | navigation tree, related sections | exists (hand-written nav) | 1: registry-generated, T3000 + Legacy trees |
| Center | article | exists | — |
| Right | "In this article", related content, last updated | absent | 1: headings from the parsed page; last updated from `index.json` |
| Bottom | feedback, edit page, follow page, history | absent | 1: "Edit on GitHub" + commit history link; 3: feedback + follow |

## Search System

Requirements: full-text; filters for product, version, tag, category; results covering articles,
tutorials, FAQs, release notes and API pages; later, natural-language questions.

| Requirement | Implementation | Phase |
|---|---|---|
| Full-text, offline | CHM index (hhc.exe) | exists |
| Full-text, in-app | the DocFX search index (`_site/index.json`, lunr) served statically; Pagefind only if ranking needs it | 1 |
| Facets | registry fields; no page changes | 1 |
| Version filter | `version` field + one published `_site` per release tag | 4 |
| Natural language | MCP doc tools over the corpus, answers cite pages | 5 |

## Editing System

A browser-based editor is added later; until then the workflow is the same pipeline with a local editor.

| Feature | Near term | Phase 3 (portal) |
|---|---|---|
| Markdown editor | any editor + `npm run help:preview` | in-app editor |
| Live preview | `help:preview` builds and opens the real CHM | preview panel |
| Image upload | drop the file into the page's folder; the build copies it | upload endpoint |
| Table editor | Markdown tables | optional grid |
| Revision history | `git log -p -- <path>` | history panel |
| Draft saving | a branch | draft records |
| Link validation | `npm run docs:blocking` (broken relative links) | inline warnings |

Workflow, unchanged by the editor choice:

```
Edit → Save draft → Commit → Pull request → Review → Publish (build + release)
```

## Git Integration

Every page surfaces its provenance, served from `index.json` (no page edits):

| Displayed | Source |
|---|---|
| Author | last commit author |
| Last updated date | last commit date |
| Version | release the page ships in |
| Commit reference | short SHA, linked |
| View source | `…/blob/<sha>/docs/<path>.md` |
| View history | `…/commits/<sha>/docs/<path>.md` |
| Compare versions | release tags |

## Feedback System

| Option | Store | Routing |
|---|---|---|
| Helpful / not helpful | counter per page | — |
| Not helpful reasons: incorrect, missing, outdated, other | row per report | to the page's `owner` from the registry |

Phase 1: an "Edit on GitHub" and a prefilled issue link (title = page id, body = page URL) so feedback
exists without a backend. Phase 3: an endpoint + table in the portal, routed by `owner`, with an aging
report so unhandled feedback is visible.

## Subscription System

Users follow products, categories or documents and receive updates when followed content changes.

| Phase | Mechanism |
|---|---|
| 1 | GitHub watch / repo notifications; the generated changelog page is the source of "what changed" |
| 2 | RSS from the generated changelog and release-notes pages |
| 3 | Portal subscriptions table keyed by `product`, `category`, page id |

## Notification System

| Event | Phase 1–2 | Phase 3 |
|---|---|---|
| New / updated documentation | changelog page + RSS | portal notification |
| Product releases, release notes published | release page + RSS | portal + email |
| Review requests | PR review request | portal + Teams webhook |
| Delivery | GitHub, email (repo), RSS | email, web, Teams, webhooks |

## What's New System

Automatically generated from git commits, pull requests, releases and new documents; no manual
maintenance.

```
1. Range of commits since the last published release
2. Group by scope (api/, src/t3-react/, T3000-Source/, docs/)
3. Summarise per group: 2–4 lines, citing the files it describes
4. Append to docs/help/changelog/<version>.md and to .summarised.json (idempotent by SHA)
5. The CHM build includes the changelog as a "What's New" chapter
6. No model available → the raw grouped commit list is written and marked "pending"; never blocks
```

## Release Notes System

Draft release notes are generated from pull requests, commits and release data, then edited before
publication.

| Step | Output |
|---|---|
| Collect | merged PRs, commit summaries, changed pages since the last tag |
| Draft | `docs/t3000/releases/<version>.md` with sections: new features, fixes, known issues |
| Human pass | the owner edits the draft; the file is a normal page from then on |
| Publish | included in the CHM and the portal on the next build |

## Version Management

| Requirement | Design |
|---|---|
| Multiple versions (V16, V17, V18) | each release keeps a frozen snapshot: the CHM and PDF shipped with it, plus a git tag |
| Switching versions in the interface | portal phase — one static build per tag; the in-app page shows the current version only |
| Older versions remain accessible | release artifacts are kept with the release, not overwritten |
| What "current" means | `docs/` at `HEAD` describes the version under development |

## Offline Documentation

The same source generates every offline format.

### Offline website

`docfx build` output (`_site/`) rewritten to relative URLs, zipped for download and browsable without a
network. The lunr search index is part of the output, so search works offline too. Phase 4.

### PDF manual

With `pdf: true` in `globalMetadata` (DocFX ≥ 2.73 and the modern template), `docfx build` emits a
"Download PDF" button and a `toc.pdf` per TOC, and `docfx pdf` renders them — a dedicated PDF TOC
(`order: 200` so it stays out of the site navigation) produces one **`T3000-Learn.pdf`**. No separate
print pipeline exists, so the PDF cannot diverge from the site. Phase 4.

### CHM help file

Generated automatically from the same source; shipped with the product; opened by F1.

| Requirement | Implementation |
|---|---|
| Navigation tree | `.hhc` generated from the registry chapters |
| Table of contents | same source as the tree |
| Search | hhc.exe full-text index |
| Index / keywords | `keywords` from the registry → `.hhk` |
| Context-sensitive help | `[ALIAS]`/`[MAP]` from the F1 id map |
| Images, hyperlinks | root-relative paths; the offline-safety gate forbids remote assets |
| No separate CHM editing process | there is exactly one source: `docs/**` |

## Documentation Review Process

Every page has an owner, a reviewer and a verified date; the system detects stale documentation.

| Signal | Rule | Action |
|---|---|---|
| Code changed after review | commits touching the page's `code` globs since `reviewed.date` | page flagged stale in `index.json` |
| Time since review | 90 / 180 / 365 days | escalating notice to the owner |
| Claimed feature changed, page untouched | the `docs-owed` CI check | PR fails unless waived with a reason |

Weekly job: `docs/help/reports/staleness-<date>.md`, grouped by owner, sorted by age.

## Future AI Features

### Commit Analysis

Inputs: commit message, modified files, pull request. Outputs: a human-readable summary, affected
areas, related documentation. Implemented in `docs-sync` (phase 2).

### Documentation Impact Analysis

```
Code changed → pages whose code globs match → mechanical edit (rules) or prose proposal → review
```

### Stale Documentation Detection

`code changed AND documentation did not change` → a review task for the owner, listed in the weekly
report and in the PR check.

### AI Chat Assistant

Questions in natural language over the documentation corpus, answers with page references, served
through the existing MCP doc tools (phase 5). The corpus is trustworthy only after phases 2–3, which is
why the assistant comes last.

## Recommended Technology Stack

| Concern | Choice | Note |
|---|---|---|
| Documentation storage | Markdown in git | exists |
| Source control | GitHub (existing); Gitea if an internal mirror is required | — |
| Documentation engine (website, offline site, PDF, search) | **DocFX**, cloned from `dotnet/docfx` into `tools/docfx` and pinned to a commit; `default` + `modern` + our `t3000` template | phase 1/3 |
| Documentation engine (CHM) | the existing Node pipeline + `hhc.exe` | exists |
| Portal | the published DocFX `_site`, one per release tag | phase 3 |
| Build prerequisites | .NET SDK 8–10 and Node 24 (DocFX, template build) on the site host; HTML Help Workshop on the CHM host; neither blocks the other | — |
| Database | none required until feedback/subscriptions; then PostgreSQL | phase 3 |
| Search | CHM index (offline, exists) · DocFX lunr index `_site/index.json` · OpenSearch only if a hosted portal with real facets is approved | phase 1/3 |
| Authentication | none for reading; Entra ID / LDAP / local accounts only if editing is hosted | phase 3 |
| AI | model-agnostic: the repository's agent/MCP tooling, a CI token for `docs-sync` | phase 2/5 |
| CHM compiler | HTML Help Workshop (`hhc.exe`) on the Windows build host | exists |

## Implementation Plan

Phases follow the specification's shape (foundation → collaboration → editing → offline → AI) with the
dependency order T3000 forces: the offline CHM is a shipping artifact from day one, so it is completed
inside phase 1 rather than phase 4.

### Phase 1 — Foundation (Month 1)

Objective: one declared structure, generated everywhere, with the shipped CHM at full parity.

Tasks:

- Registry (`docs/help/registry.json`) + validator; `scripts/lib/doc-parse.mjs` extracted from the
  existing scripts
- `scripts/docs-registry.mjs` → `docs/help/index.json` + generated collection manifests
- **DocFX engine setup**: clone `dotnet/docfx` into `tools/docfx`, build the templates (`npm install`,
  `npm run build` under `templates/`) and the CLI (`dotnet build docfx.sln -c Release`), and record the
  pinned commit in `tools/docfx.pin`
- **DocFX baseline**: generated `docfx.json` + `docs/toc.yml` + `docs/t3000/toc.yml` +
  `docs/legacy/toc.yml`; `npm run docs:site` produces `_site/` with both trees and the search index;
  `npm run docs:serve` for local preview
- In-app navigation generated from `index.json`; the hand-written nav lists deleted
- In-app search served from the DocFX lunr index
- CI: registry validation, `docs:blocking`, offline-safety rule, `docfx build` must succeed
- CHM parity: keywords → index, generated F1 map (`docs:map`), `help:preview`, deployment check,
  and an assertion that `toc.yml` and the collection manifests list the same pages

Deliverable: a DocFX site and a help file that cannot disagree, built from one declared structure;
every page owned or explicitly excluded.

### Phase 2 — Collaboration (Month 2)

Objective: the documentation maintains itself with human approval.

Tasks:

- Ownership and review fields populated for the shipped manual, then the whole tree
- `scripts/docs-sync.mjs`: commit summaries, impact analysis, mechanical rules, prose proposals
- `.github/workflows/docs.yml`: the advisory `docs-sync` job and the blocking `docs-owed` job
- Generated **What's New** chapter + release-notes drafts
- Weekly staleness report and the review queue

Deliverable: a feature commit writes its own summary and the page diff a reviewer approves.

### Phase 3 — Editing (Month 3)

Objective: browser-based contribution.

Tasks:

- Portal: the DocFX site with a custom template — homepage with search, category navigation,
  recently updated, version switcher
- Article page: right panel ("In this article", related), feedback, follow, history, "Edit this page"
- Publish `_site` per release tag (version switcher data)
- Editor: Markdown editing, preview, image upload, draft → PR → review → publish
- Optional hosted editing behind Entra ID / LDAP

Deliverable: a DocFX portal whose content is the same Markdown, edited through pull requests.

### Phase 4 — Offline Documentation (Month 4)

Objective: every offline format from the same source.

Tasks:

- `pdf.toc.yml` + `docfx pdf` → `T3000-Learn.pdf`; `npm run docs:pdf`
- Offline website package: `_site/` rewritten to relative URLs and zipped, lunr index included
- Download center (portal) and release artifacts
- Versioned snapshots: one `_site`, one CHM and one PDF per release tag

Deliverable: web, offline web, PDF and CHM produced by one pipeline from one source.

### Phase 5 — AI Platform (Months 5–6)

Objective: assisted maintenance and search.

Tasks:

- Natural-language search over the corpus with page references (MCP)
- Impact analysis refined with an embedding pass over code and pages
- Auto changelog and release notes with a review workflow
- Stale detection with owner notification through the chosen channels

Deliverable: an AI-assisted ecosystem on top of a corpus that is already current.

## Detailed Starting Steps

1. Create `scripts/lib/doc-parse.mjs`; move `stripFences`, `headings`, `slugify`, `titleCase` and fence
   counting out of `audit-docs.mjs` and `build-t3000-help-chm.mjs`; re-import both. Verify:
   `npm run docs:blocking` and `npm run build:help:dry` unchanged.
2. Write `docs/help/registry.schema.json` and `scripts/docs-registry.mjs` (`--check`, `--dry-run`).
3. Seed `registry.json` from the file tree and the existing manifests; add `exclude` entries with
   reasons for the engineering notes that do not ship.
4. Fill `category`, `product`, `owner`, `chapter`, `order` and `code` for the 53 shipped pages.
   Verify: `npm run docs:registry --check` is clean.
5. **DocFX engine**: `git submodule add https://github.com/dotnet/docfx tools/docfx`; check out a release
   tag; build the templates (`cd tools/docfx/templates; npm install; npm run build`) and the CLI
   (`dotnet build docfx.sln -c Release`); record the commit in `tools/docfx.pin`. Verify:
   `dotnet run --project tools/docfx/src/docfx -- --version` matches the pin.
6. **DocFX site project**: generate `docs/docfx.json` and `docs/toc.yml` + `docs/t3000/toc.yml` +
   `docs/legacy/toc.yml` from the registry (`content` globs per area, `template: ["default", "modern",
   "templates/t3000"]`, `build.dest: _site`); `npm run docs:site` must produce `_site/` with both trees,
   working images and the search index; `npm run docs:serve` for preview.
6. Point `build-t3000-help-chm.mjs` at the **generated** collection manifests; delete the hand-written
   ones from the build path, and assert that `toc.yml` and the manifests list the same page set.
7. Generate `index.json`; render the `docs/help/reports/` summary.
8. Add the CI workflow: registry validation, `docs:blocking` and `docfx build` (blocking),
   `docs-sync` (advisory).
9. Swap the in-app navigation to `index.json`; delete `docStructure.ts` / `legacyDocsStructure.ts`
   entries (keep the components).
10. Seed `docs/help/help-ids.json` (`--dump-help-ids`), curate it, add `scripts/docs-map.mjs`, and
   generate `T3000_Help_Map.generated.h` with a diff guard against the current header.
11. Add the "In this article", last-updated and edit-on-GitHub zones to the in-app page from `index.json`.
12. Serve the DocFX lunr index to the in-app page (and add Pagefind only if the ranking needs it).
13. Implement `scripts/docs-sync.mjs --summarise` and the generated What's New chapter.
14. Implement `scripts/docs-owed.mjs` and its waiver rules.
15. Implement the weekly staleness report workflow.
16. Add `pdf.toc.yml` and `npm run docs:pdf` (`docfx pdf`).
17. Write the T3000 DocFX template (Learn layout: homepage, left nav, right panel, footer, feedback
   and version-switcher slots) and publish `_site` per release tag.
18. Build the offline website package (relative-URL `_site/` → zip) and the download link.
19. Stand up the feedback endpoint and route reports by `owner`.
20. Add subscriptions and notifications (RSS first, then the portal).
21. Add the natural-language assistant over the corpus through the MCP tools.

## Final Objective

T3000 Learn becomes the Microsoft Learn equivalent for T3000: all documentation lives in Git, is
authored in Markdown, is published automatically to web and offline formats, supports collaboration and
feedback, and is maintained with AI assistance under human approval. It becomes the single source of
truth for engineering teams, support teams, developers, partners and end users.

---

## Appendix A — Command reference

```
npm run docs:audit           # lint, read-only
npm run docs:blocking        # lint, exit 1 only for user-audience findings
npm run docs:clean           # mechanical doc cleanup (dry-run by default)
npm run docs:registry        # regenerate index.json + manifests + docfx.json + toc.yml
npm run docs:site            # docfx build → _site (site + lunr search index)
npm run docs:serve           # docfx serve _site (local preview)
npm run docs:pdf             # docfx pdf → build/docs/T3000-Learn.pdf
npm run docs:owed            # changed files vs claimed pages (CI)
npm run docs:sync            # commit → summary + impact + proposals
npm run docs:map             # regenerate the F1 id map + coverage report
npm run build:help           # build + deploy the shipped CHM
npm run build:help:dry       # build without deploying
npm run help:tree            # print the CHM Contents tree
npm run help:preview         # build and open the CHM locally
```

Raw DocFX commands (what the npm scripts wrap):

```
docfx build                 # site + lunr search index → _site
docfx build --serve         # build, serve, watch
docfx pdf --pdf.toc.yml     # PDF manual
docfx metadata              # .NET API reference only (unused for C++/Rust/TS)
```

## Appendix B — Interfaces that must not drift

| Contract | Producer | Consumers |
|---|---|---|
| Page id = docs-relative path without `.md` | content layout | registry, routes, MCP, links |
| `registry.json` shape | this design | scripts, CI, in-app nav, DocFX site |
| Collection manifests (`docs/help/*.json`) | generated from the registry | CHM build |
| `docfx.json` + `toc.yml` | generated from the registry | DocFX site, PDF, lunr index |
| One page set across engines | registry validation | the DocFX site and the CHM must list identical pages |
| `.hhc` `[ALIAS]` / `.hhp` `[MAP]` entries | CHM build | F1 (`HH_HELP_CONTEXT`) |
| `IDH_*` numbers in the C++ header | frozen; generated from a hand-curated map | application build |
| Root-relative asset paths inside CHM pages | build | offline rendering |

## Appendix C — Failure modes

| Failure | Behaviour |
|---|---|
| `hhc.exe` missing | build stops with the expected install path |
| CHM locked by the help viewer | deploy skipped, artifact copied to `build/help-chm/`, warning |
| No network / model unavailable during `docs-sync` | summaries marked pending, raw commit list written; build unaffected |
| Glob matches nothing | registry validation error |
| Two pages claim one file | reported ambiguous; `docs-owed` fails naming both |
| Page edited without a registry entry | validation error unless listed in `exclude` |
| A mechanical rule never fires | reported quarterly; dead rules are removed |
| `docfx` / .NET SDK missing on the site host | the site build stops with the install command; the CHM build and the product release are unaffected — DocFX is never on the shipping path |
| `toc.yml` and the collection manifests disagree | registry validation fails, naming the page that is in one and not the other |
| `docfx pdf` renderer unavailable | the PDF task skips and reports; site and CHM are unaffected |
