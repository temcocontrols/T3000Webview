# 12 — AI features

*Covers: Future AI Features (commit analysis, impact analysis, stale detection, assistant).*

Two AI responsibilities, kept strictly apart:

| | Automatic, deterministic, safe | Assisted, advisory, draft-only |
|---|---|---|
| Examples | staleness detection, TOC/manifest generation, link checking, mechanical renames | changelog summaries, release-note drafts, prose update proposals, natural-language answers |
| Rule | runs unattended in CI | lands as a draft in a PR or a logged answer; **a human approves before publish** |

Nothing here writes prose into a shipped page automatically. The model's job is to make the human's edit
small.

---

## 1. Commit analysis → the changelog

```
input   : commit range, per-commit {sha, author, date, message, files, diffstat}
output  : 2–4 lines per scope group, each naming the files/features it describes
artefact: docs/help/changelog/<version>.md  +  .summarised.json (idempotency ledger)
```

Where it runs: `npm run docs:sync` (local) and the `docs-sync` job (advisory, on push to `main`). The
generated files are committed by the job through a normal PR — so a bad summary is a review comment, not a
published lie.

Prompt contract (kept in `scripts/prompts/changelog.md`, versioned with the code):

- Input is **only** commit metadata and file paths; no file contents unless a scope group is too opaque to
  summarise, in which case the diff of that group's largest file is added.
- Output is Markdown with a fixed skeleton (`## <scope>` → bullets → `Files: …`).
- Forbidden: inventing features, naming customers, hedging language, mention of the summariser itself.
- If the model is unavailable, the raw grouped commit list is written with a `pending` marker and the build
  proceeds.

Quality metric: for a past release, compare the generated changelog against what the team wrote by hand;
target is "no factual error, ≤ 1 missed user-visible change per release".

## 2. Documentation impact analysis

```
changed file  →  registry.glob match  →  candidate pages
candidate page + diff  →  classify:
    mechanical  : a documented token changed (setting, field, command, path, default value)
                  → apply as a deterministic rule, show as a diff in the PR
    prose       : behaviour or wording changed
                  → propose a diff in the PR body; never applied automatically
    none        : the change does not affect the documented behaviour
                  → recorded so the page is not flagged again for this commit
```

Deterministic rules live in `docs/help/rules/<slug>.json`:

```jsonc
{
  "id": "setting-rename",
  "match": { "in": "docs/t3000/**/*.md", "old": "CtrlMax" },
  "replace": { "with": "CtrlMaxValue" },
  "evidence": ["src/t3-react/features/**/*.tsx"],
  "lastFired": "2026-10-02"
}
```

`lastFired` is maintained by the job; a rule that has not fired in two quarters is deleted (dead rules are
worse than no rules — they hide the next real change).

Output is always a **PR**: "docs follow-up for `<sha range>`", containing the mechanical edits already
applied and the prose proposals in the body for the page owner to accept or reject.

## 3. Stale documentation detection

Deterministic, not AI (`05-content-and-registry.md` §4). The model is used only to **draft** the update when
the owner asks for it: `npm run docs:sync -- --draft t3000/features/trendlogs` prints a proposed section
change next to the diff that caused the flag. Never committed by the tool.

## 4. Natural-language assistant (phase 5)

| Aspect | Design |
|---|---|
| Corpus | `docs/help/index.json` + page text via the MCP doc tools; pages flagged `stale` are excluded from answers (or answered with an explicit stale warning) |
| Retrieval | keyword + embedding over `title`/`headings`/`tags`/body |
| Answer shape | short answer + **page citations**; if confidence is low, return search results instead of a synthesis |
| Audience | internal/partner first; customer-facing only after the review set passes |
| Review set | the same 20 support questions used for search ranking (`06-search.md` §5); pass = every answer cites a correct page and no answer contradicts a page |
| Logging | question, cited pages, whether the user clicked through → monthly documentation to-do list |
| Providers | model-agnostic; the interface is a single "answer(question, candidates)" call, so the provider can change without touching the pipeline |

## 5. Guardrails (apply to every AI feature)

1. **No shipped page is edited by a model unattended.** Drafts only; the diff is reviewed.
2. **No secrets or customer data in prompts.** Prompts take commit metadata, paths, and docs text only;
   the repository is the boundary.
3. **Traceable.** Every generated artefact names the commit range and the prompt version that produced it.
4. **Degradable.** No model → deterministic output, build continues, marker visible in the artefact.
5. **Deterministic first.** Anything expressible as a registry rule, a glob or a generator is not given to
   a model.
6. **Costs bounded.** Summarisation is per commit range, not per commit, and results are cached by SHA in
   `.summarised.json`.

## 6. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | `docs-sync --summarise` (changelog) + prompt file + ledger | 2 |
| 2 | `docs-sync --impact` (candidate pages + classification) | 2 |
| 3 | Follow-up PR generation (mechanical edits applied, prose proposed) | 2 |
| 4 | Rule registry + `lastFired` pruning | 2 |
| 5 | `--draft <page>` on demand | 3 |
| 6 | Embedding index over pages and code paths | 5 |
| 7 | Assistant over the MCP tools + review set + logging | 5 |

**Acceptance:** `docs:sync` over a past release produces no factual error against the hand-written notes;
impact analysis names the pages a human reviewer agrees with (precision measured on the same release);
enabling the assistant against the 20-question set yields answers that cite correct pages; with the model
disabled, every pipeline still completes and marks its output `pending`.
