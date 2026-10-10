# 13 — Implementation plan

*Covers: Implementation Plan (phases 1–5), Detailed Starting Steps, and the acceptance test for each task.*

Each task below is sized to be **one pull request** and carries its own acceptance test. Tasks are ordered
by dependency; nothing in a later phase is required for an earlier one to be useful.

---

## Phase 1 — Foundation (month 1)

Goal: the DocFX site exists, its structure is declared once, and the shipped CHM is at full parity.

| # | Task | Files | Acceptance |
|---|---|---|---|
| 1.1 | Shared parser: extract `stripFences`, `headings`, `slugify`, `titleCase`, fence counting | `scripts/lib/doc-parse.mjs`, `scripts/audit-docs.mjs`, `scripts/build-t3000-help-chm.mjs` | `npm run docs:blocking` and `build:help:dry` output unchanged |
| 1.2 | Engine pin: mode B (`dotnet new tool-manifest` + pinned `docfx`), optional mode A (external checkout + `DOCFX_REPO`), `tools/docfx.pin`, precheck | `.config/dotnet-tools.json`, `tools/docfx.pin`, `scripts/docs-engine.mjs` | `--version` matches the pin; the precheck fails on a missing/mismatched engine **and** on engine files appearing inside the repo |
| 1.3 | Registry schema + generator (`--check`, `--dry-run`) | `docs/help/registry.schema.json`, `scripts/docs-registry.mjs` | clean run on the seeded registry; every unregistered page is an error |
| 1.4 | Seed the registry from the tree + `manual.json`; add `exclude` reasons | `docs/help/registry.json` | same chapters/order as today's `manual.json` |
| 1.5 | Fill `owner`, `reviewer`, `category`, `product`, `keywords`, `help_ids` for the 53 shipped pages | registry | `--check` clean; every shipped page owned |
| 1.6 | Emit the DocFX-facing files | `docs/docfx.json`, `docs/toc.yml`, `docs/t3000/toc.yml`, `docs/legacy/toc.yml`, `docs/design/toc.yml` | `npm run docs:site` produces `_site/` with both area trees, images, search index, `xrefmap.yml` |
| 1.7 | Parity assertion + `docs:blocking` wiring | registry generator, audit script | editing one chapter fails the check with both paths named |
| 1.8 | Point the CHM build at generated manifests | `scripts/build-t3000-help-chm.mjs` | rebuilt CHM is page-for-page identical to the previous one |
| 1.9 | Template layer v1: brand CSS/JS, logo, favicon, self-hosted fonts | `docs/templates/t3000/public/**` | site branded; zero remote requests; dark mode works |
| 1.10 | Homepage | `docs/index.md`, generator blocks | landing page with working cards and "recently updated" |
| 1.11 | `index.json` / `page-meta.json` emitters + staleness pass | generator | a page with a touched `code` glob reports `stale: true` |
| 1.12 | Page-meta bar + version-switcher/feedback/copy widgets | `main.js` | bar shows date/SHA/owner; widgets degrade silently when data is missing |
| 1.13 | In-app navigation from `index.json`; search off the DocFX index | `docStructure.ts` path, app search hook | in-app tree matches the site; in-app search returns site pages |
| 1.14 | CI: `lint` + `site` jobs, warning baseline, PR artefact | `.github/workflows/docs.yml` | a broken link fails the build; PR shows a downloadable site |
| 1.15 | F1 context ids: seed `help-ids.json`, `scripts/docs-map.mjs`, generated `T3000_Help_Map.generated.h`, coverage report | new scripts + header | coverage ≥ 90 % of topics used by the dialogs; diff guard passes |
| 1.16 | Commit-summary changelog (`docs-sync --summarise`) + What's New chapter | re-running duplicates nothing; a model outage degrades to a pending list |
| 1.17 | Media audit (missing / unused / duplicate / oversized) + naming rules | a missing image fails the gate for user pages; the unused list is produced |
| 1.18 | `14-governance.md` published + waiver gate + PR/emergency checklist | an expired waiver fails; an unowned shipped page fails |
| 1.19 | Admin dashboard v1 at `/docs/_admin/` | coverage, stale by owner, docs-owed, unowned, unreviewed, health score |

## Phase 2 — Collaboration (month 2)

| # | Task | Acceptance |
|---|---|---|
| 2.1 | `docs-sync --summarise` + `.summarised.json` + changelog page | re-running produces no duplicate text |
| 2.2 | `docs-sync --impact` + rule registry (`docs/help/rules/*.json`) | a past commit range flags the pages a human agrees with |
| 2.3 | Follow-up PR generation (mechanical applied, prose proposed) | a code-only PR yields a docs follow-up PR, never a silent edit |
| 2.4 | `docs-owed` gate + waivers with expiry | waiving then editing code passes; an expired waiver fails |
| 2.5 | Staleness report job + weekly review slot | report lands weekly, grouped by owner |
| 2.6 | Release-note draft generator | draft release page in a PR with the four standard sections |
| 2.7 | RSS feeds (changelog, releases) | both validate; last 20 entries |
| 2.8 | Internal reviewer banner (`?internal=1`) | shows owner, age, stale reason, feedback count |

## Phase 3 — Editing (month 3)

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Publish the DocFX site as the portal + per-version folders | `/docs/` and `/docs/<version>/` both serve; switcher works |
| 3.2 | `versions.json` + switcher wiring | switching keeps the reader on the same page path when it exists |
| 3.3 | Feedback endpoint + `docs_feedback` + owner routing | a "No" click writes a row routed to the page owner |
| 3.4 | Helpfulness ratio + aging report | unhandled > 30 days appears in the weekly report |
| 3.5 | Portal editor (Markdown, preview, upload, draft branch, publish = PR) | editing a page end-to-end produces a normal PR |
| 3.6 | Roles/auth (editor, reviewer) | anonymous read; only roles can draft/publish |
| 3.7 | Search beacon + monthly to-do list | zero-result queries appear as a to-do list |
| 3.8 | `docs_subscriptions` + digest | category subscription notifies on a page change in that category |
| 3.9 | Analytics: page/search/zero-result beacons + weekly aggregation + health score on the dashboard | zero-result queries appear as a to-do list; health number visible |

## Phase 4 — Offline documentation (month 4)

| # | Task | Acceptance |
|---|---|---|
| 4.1 | `scripts/docs-offline.mjs` (audit → relative rewrite → zip) | package browses and searches on an air-gapped machine |
| 4.2 | Cover page + print CSS + PDF metadata | cover full-bleed; article headers/footers numbered |
| 4.3 | `docs/toc.pdf.yml` + `npm run docs:pdf` | one `T3000-Learn.pdf`; no engineering area inside |
| 4.4 | Download section on the release page | site links resolve to the version's own artefacts |
| 4.5 | Attach CHM/PDF/zip to the release | three assets per release, all versioned |
| 4.6 | Freeze/backport procedure documented | a release-note fix republishes one version folder |
| 4.7 | Retention policy (current + last 3) + media shared across snapshots | host size bounded; an old version stays readable |

## Phase 5 — AI platform (months 5–6)

| # | Task | Acceptance |
|---|---|---|
| 5.1 | Embedding index over pages and code paths | retrieval beats keyword search on the 20-question set |
| 5.2 | Assistant over the MCP doc tools | every answer cites a correct page; stale pages excluded |
| 5.3 | `--draft <page>` on demand | proposal matches the diff that caused the flag |
| 5.4 | Cost/quality review of summarisation | bounded cost per release; no factual errors in the sample |

---

## Detailed starting steps (the checklist)

The 21 steps in `01-plan.md` are the canonical order. This table says which deep document to read before
each one, and what "done" looks like.

| Step (`01-plan.md`) | Read first | Done when |
|---|---|---|
| 1 shared parser | `03` §5 | both old scripts behave identically |
| 2 registry schema + script | `05` §1–2 | `--check` runs |
| 3 seed registry | `05` §1 | structure equals today's CHM |
| 4 fill fields (53 pages) | `05` §2 | shipped pages owned |
| 5 DocFX engine clone/pin | `02` §1–3 | `--version` matches the pin |
| 6 DocFX site project | `03` §1–3 | `_site/` with both trees + index |
| 7 `index.json` + reports | `05` §3 | staleness computed |
| 8 CI lint + site | `11` §4 | PR gets an artefact |
| 9 in-app nav from `index.json` | `05` §3 | tree matches the site |
| 10 F1 map | `07` §3 | coverage ≥ 90 % |
| 11 page-meta bar | `04` §5, `08` §3 | date/SHA/owner visible |
| 12 in-app search | `06` §3 | search finds a known page |
| 13 `docs-sync --summarise` | `12` §1 | idempotent |
| 14 `docs-owed` | `11` §3 | code-only PR fails until waived |
| 15 staleness report | `11` §2 | weekly file lands |
| 16 PDF | `07` §2 | cover + numbered TOC |
| 17 DocFX template v2 | `04` §1–6 | no partial overrides yet |
| 18 offline package | `07` §1 | air-gapped browse + search |
| 19 feedback endpoint | `09` §1 | row routed to owner |
| 20 subscriptions + notifications | `09` §2–3 | digest arrives |
| 21 assistant | `12` §4 | answers cite pages |
| 22 media audit | `01-plan.md` Documentation Review Process | missing / unused / oversized reported |
| 23 `14-governance.md` | `14` | policy published, waiver gate live |
| 24 `_admin` dashboard | `11` §2 | health score + stale by owner visible |

---

## Dependencies

```
1 → 2 → 3 → 4 → 6 → 7 → 9/10/11/12/13/14/15/16/17/18/19/20/21
                5 ↗ (engine pin is a prerequisite of 6 only)
3 → 7 → 14 (docs-owed needs code globs)
5 → 6 → 18, 5 → 16 (pdf needs the modern template ≥ 2.73)
7 → 19 (feedback routing needs the registry)
```

Steps 9–12 and 14–16 are independent of each other once step 8 lands: they can run in parallel across
people.

---

## What needs a human, not code

| Item | Who | Blocks |
|---|---|---|
| Name the docs owner | management | phase 1 sign-off, `docs-owed` waivers |
| Markdown + `help:preview` verdict from the documentation colleague | that colleague | phase 2 start |
| Host decision (`/docs/` rewrite vs `/learn/`) | IT/platform | phase 3 publish |
| The two TRENDLOG_DATABASE_DESIGN documents: keep both or merge | docs owner | content cleanup (not blocking) |
| Installer step that copies `T3000_Help.chm` next to `T3000.exe` | build/release | CHM shipping |
| Model/provider choice for `docs-sync` | platform | phase 2 AI tasks |

---

## Definition of done for phase 1

- `dotnet tool restore; npm run docs:site` (or `npm run docs:engine; npm run docs:site` in mode A) works on a
  clean clone, and no engine file exists anywhere in the working tree.
- `docs/help/registry.json` is the only place the structure is declared; `--check` is clean.
- Two artefacts are produced from the same page set with zero parity violations: `_site/` and
  `T3000_Help.chm`.
- Every shipped page has an owner; every page appears in `index.json` with headings and provenance.
- The site is branded, searchable, and contains no remote asset.
- `lint`, `site` and `docs-owed` are required checks on `main`.

---

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| DocFX maintenance is community-only (Microsoft Learn moved off it in 2022) | a needed fix may never come | clone + pin + `tools/patches`; template kept thin so engine upgrades stay cheap |
| Engine upgrade breaks the template layer | site build fails on upgrade day | template overrides recorded and minimal; the app-verify command is the upgrade gate (`02` §6) |
| Registry becomes a bottleneck | slow doc changes | registry edits are small and scriptable; `--dry-run` + generated diff in the PR |
| Structure drift between site and CHM | users see different help | the parity assertion is a blocking gate |
| Stale content despite the tooling | trust loss | weekly report + `docs-owed` + feedback aging; the mechanism needs a reader, hence the named owner |
| Over-strict gates block work | authors route around the docs | blocking is limited to `docs/t3000/**`; everything else is warning + report |
