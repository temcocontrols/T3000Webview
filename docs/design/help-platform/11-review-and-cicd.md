# 11 — Review process, gates and CI/CD

*Covers: Documentation Review Process (ownership, staleness, "docs owed") and how everything is published.*

---

## 1. Ownership

| Role | Responsibility | Source of truth |
|---|---|---|
| **Docs owner** (one named person) | final word on prose, structure and the registry; triages feedback; owns the weekly report | recorded in `docs/help/registry.json` (`reviewer` default) and in this folder |
| **Page owner** | keeps the pages whose `code` globs they are responsible for true after code changes | `registry.pages[].owner` |
| **Reviewer** | approves a PR touching those pages | `registry.pages[].reviewer` |

An unowned page is a bug: `ship: true` requires `owner` (`05-content-and-registry.md` §2).

---

## 2. Staleness rules

```
stale      ⇔ a commit touching page.code landed after page.reviewed.date
review age ⇔ today − page.reviewed.date           → 90 days: notice
                                                    180 days: warning
                                                    365 days: escalate
```

Computed at generation time into `index.json`/`page-meta.json`; never written into a page.

Weekly job `docs-report.yml` writes `docs/help/reports/staleness-<date>.md`:

```markdown
# Documentation staleness — 2026-10-10
commit a1b2c3d · 216 pages · 47 stale · 12 escalated

## Escalated (> 365 days)
| page | owner | last reviewed | claimed code changed |
|---|---|---|---|
| t3000/features/trendlogs | trendlog | 2025-08-11 | api/src/t3_device/trendlog*.rs @ 2026-10-02 |

## Owed (code changed, page not updated)
## Negative feedback (last 30 days)
## Unhandled feedback (> 30 days)
```

The report is committed by the job (so a week with no report is itself visible) and posted to the review
channel. It is the agenda for the weekly documentation slot — the mechanism only works if someone reads it.

---

## 3. Gates

| Gate | Command | Blocking | What it proves |
|---|---|---|---|
| Registry valid + fresh | `npm run docs:registry --check` | yes | structure declared once, no unregistered pages, globs match, TOC/manifest parity |
| Docs lint | `npm run docs:blocking` | yes, for `docs/t3000/**` | links resolve, fences balanced, one H1 first, no remote assets, no TODO in prose |
| Site builds | `npm run docs:site` | yes | every page renders; **broken-link warnings = 0**; total warnings ≤ baseline |
| Offline safe | `npm run docs:offline -- --check` | yes | no remote URL anywhere in `_site` |
| Docs owed | `npm run docs:owed -- --base <sha>` | yes for PRs touching `code` globs | a claimed feature that changed has a documentation change, or an explicit waiver |
| CHM builds | `npm run build:help:dry` | yes before a release | the shipping help file still compiles and matches `toc.yml` |
| PDF | `npm run docs:pdf` | release only | the manual renders with a cover and a numbered TOC |

Waivers for "docs owed" live in the registry, per page, with an expiry and a reason:

```jsonc
"waivers": { "t3000/features/trendlogs": { "until": "2026-11-15", "reason": "behavior not shipping yet" } }
```

An expired waiver is itself a gate failure.

---

## 4. Workflows (`.github/workflows/docs.yml`)

| Job | Trigger | Steps | Blocking |
|---|---|---|---|
| `lint` | every PR touching `docs/**` or `scripts/**` | registry `--check`, `docs:blocking` | yes |
| `site` | same | engine pin check, `docs:site`, upload `_site` as a PR artefact (so reviewers can click) | yes |
| `docs-owed` | every PR touching code paths claimed in the registry | `docs:owed --base` | yes |
| `docs-sync` | push to `main` | changelog + impact analysis, commits the generated files, opens a "docs follow-up" PR if pages are owed | no (advisory) |
| `report` | weekly (cron) | staleness report + commit | no |
| `publish` | release tag | `docs:site`, `docs:pdf`, `docs:offline`, `build:help`, publish to `/docs/<version>/` + update `versions.json`, attach CHM/PDF/zip to the release | yes |

Publish targets, in order of preference: (1) static host / Azure Static Web Apps / GitHub Pages for the
public site; (2) the internal server for the engineering and contributing areas. Either way the artefact is
the same `_site` folder — publishing is a copy, never a rebuild with different settings.

Rollback: the previous `_site` stays on disk under its version folder and `versions.json` is the pointer.
A bad publish is fixed by restoring the previous folder and regenerating `versions.json` — no rebuild
needed, which is the reason per-version folders exist.

---

## 5. Branch protection and the PR ritual

Required on `main`: the `lint`, `site` and `docs-owed` checks green; one approval; the owner of every
touched page among the reviewers or explicitly waived in the PR body.

```markdown
## Docs impact
- [ ] Pages updated: …
- [ ] Registry updated (chapter/order/title/owner/code/tags): …
- [ ] `npm run docs:blocking` passes
- [ ] `npm run docs:serve` spot-checked the changed pages
- [ ] `npm run help:preview` spot-checked the changed pages (if they ship)
- [ ] New/changed images are local and ≥1600 px wide
- [ ] No page metadata added
```

---

## 6. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | Name the docs owner; record it in the registry and this folder | 0 (human) |
| 2 | `scripts/docs-registry.mjs --check` + `scripts/docs-owed.mjs` | 1 |
| 3 | `docs.yml` with `lint` + `site` (+ PR artefact upload) | 1 |
| 4 | Warning baseline recording; fail the build when it grows | 1 |
| 5 | `_site` offline check wired into `docs:blocking` | 1 |
| 6 | Staleness report job + weekly review slot | 2 |
| 7 | `docs.yml` `docs-sync` advisory job | 2 |
| 8 | Per-tag publish + `versions.json` + rollback drill | 3 |
| 9 | Release checklist (CHM/PDF/zip/attachments/verification) | 4 |

**Acceptance:** a PR that renames a registry chapter fails `lint` with the parity message; a PR that changes
a file matching a page's `code` glob and touches no page fails `docs-owed` (unless waived); the weekly
report lands in the repository on schedule; a release publishes a version folder, updates `versions.json`
and attaches all three artefacts; restoring the previous folder + regenerating `versions.json` rolls back.
