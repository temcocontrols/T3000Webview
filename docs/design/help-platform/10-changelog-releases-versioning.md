# 10 — What's New, release notes and version management

*Covers: What's New System · Release Notes System · Version Management.*

Three related mechanisms: the **changelog** records what changed in the docs, the **release notes** record
what changed in the product, and **version management** decides what the site shows for a given release.

---

## 1. What's New (generated, never hand-written)

Input: the commit range since the last published release tag. Output: a changelog page per version plus a
JSON ledger that makes the pass idempotent.

```
scripts/docs-sync.mjs --changelog <fromTag>..HEAD

1. collect commits (hash, author, date, files, message)
2. drop noise: docs-only commits by the docs pipeline, merges, version bumps
3. group by scope, in this order:
     api/            → Backend
     src/            → Application
     T3000-Source/   → Firmware / controllers
     docs/           → Documentation
     other           → Other
4. per group, summarise in 2–4 lines that name the files or features they describe
5. append to docs/help/changelog/<version>.md   (append-only, newest first)
6. record every consumed commit hash in docs/help/changelog/.summarised.json
7. write docs/help/changelog/index.json         (the machine-readable ledger)
```

Idempotency: `.summarised.json` is `{ "<sha>": "<version>" }`. Re-running never re-summarises a commit, so
the changelog can be regenerated at any time without duplicating text.

**Phase: 1.** The commit-summary changelog is deliberately the *first* AI feature, not a phase-2 one: it is
the ask that started this platform, it needs no other component (no feedback endpoint, no portal, no auth),
and it is advisory — a bad summary is a PR comment, never a broken build. Impact analysis and prose drafting
stay in phase 2, because those touch pages.

The changelog page is a normal site page (registered in the registry as an area chapter), and is the
`<source>` for `/docs/feed/changelog.xml`. It is also the **only** place users have to look for "what
changed in the docs" — which is what makes the subscription system cheap (`09-…` §2).

Failure mode: no model available → the raw grouped commit list is written and the section is marked
`pending`, and the build continues. A changelog that is late is annoying; a release that is blocked by a
summariser is not acceptable.

## 2. Release notes

| Step | Output |
|---|---|
| Collect | merged PRs, changelog entries, changed registry pages, the version's CHM/PDF artefacts |
| Draft | `docs/t3000/releases/<version>.md` with `## New features`, `## Improvements`, `## Fixes`, `## Known issues` |
| Human pass | the release owner edits the draft; from then on it is a normal page (last word is human) |
| Publish | page + RSS entry; the PDF/offline zip/CHM of that version are attached to the release |

The draft is generated as a **file in a branch** (a PR from the release branch), never as a
side-channel document, so the review record is git history like everything else.

---

## 3. Version management

| Question | Answer in this design |
|---|---|
| What is "current"? | `docs/**` on `main` describes the version under development; the newest release tag is the newest *published* version |
| How are versions named? | `v<YY>.<MMDD>`, e.g. `v26.0930`; the registry's `version` field and `versions.json` use the same string |
| How does a version get a site? | the publish job builds the site **at the release tag** and publishes it to `/docs/<version>/` (`11-review-and-cicd.md` §4) |
| How does the switcher know? | `versions.json` is generated at publish time: `{ current, items: [{version, url, current}] }` |
| Are old versions readable? | yes — each version folder is a frozen `_site`; nothing is overwritten |
| What about the CHM and PDF? | attached to the release (one `T3000_Help.chm`, one `T3000-Learn.pdf` per version) |
| Backports? | only release-note and known-issue corrections: fix on `main`, cherry-pick to the version branch, re-publish that version's folder |
| Retention | current version + the last 3 releases stay on the host; older folders remain as release artefacts. Media dominates the size — if retention is not enough, media is served once at a stable path and versions reference it |
| Where is the version shown? | page-meta bar (`page-meta.json.v`) and the version switcher; the PDF cover and footer; the offline package filename |

Multi-output builds: DocFX can emit named output groups (`build.groups` with a per-group `dest`). Evaluate
it for building several versions in one run; if the pinned version's CLI semantics do not fit our layout,
build each version from a git worktree — one `docfx build` per version, which is slower but completely
explicit and does not depend on engine behaviour we would have to re-verify on upgrade.

Per-version layout on the host:

```
/docs/                    ← current (main)
/docs/v26.0930/           ← frozen site for that version
/docs/v26.0610/
/docs/feed/changelog.xml
/docs/feed/releases.xml
/docs/T3000-Docs-v26.0930.zip
/docs/T3000-Learn.pdf
```

Search across versions is deliberately **not** built: the switcher navigates, and the offline package of a
version carries that version's own index. Cross-version search is a phase 5 candidate, ranked below the
assistant.

---

## 4. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | `docs-sync --changelog`, `.summarised.json`, `changelog/index.json` | **1** |
| 2 | Changelog area chapter in the registry + `toc.yml` entry | **1** |
| 3 | RSS feeds (`changelog.xml`, `releases.xml`) | 2 |
| 4 | Release-note draft generator + PR flow | 2 |
| 5 | `versions.json` emitter + version switcher widget (`04-…` §5) — widget renders only when a second version exists | 3 |
| 6 | Per-tag publish job + `/docs/<version>/` layout + retention (current + last 3) | 3 |
| 7 | Attach CHM/PDF/offline zip to the release | 4 |
| 8 | Freeze policy + backport procedure documented for the release owner | 4 |

**Acceptance:** running `docs:sync` twice produces no duplicated changelog text; the latest version's site
is reachable at `/docs/` and the previous one at `/docs/<version>/`; the switcher moves between them and
keeps the reader on the same page path when it exists; the CHM and PDF attached to a release match the
version's site.
