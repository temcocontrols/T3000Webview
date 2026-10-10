# 09 — Feedback, subscriptions and notifications

*Covers: Feedback System · Subscription System · Notification System.*

All three are "later, but designed now": phase 1 gets the cheapest possible version of each (a prefilled
GitHub issue, a changelog page, GitHub notifications), phase 3 adds the portal versions on top. Nothing
here blocks the site.

---

## 1. Feedback

### Phase 1 — no backend

| Element | Implementation |
|---|---|
| "Was this helpful?" | two buttons in the footer widget (`main.js`); "Yes" records nothing server-side (a local count is pointless), "No" opens a prefilled form |
| Prefilled issue | `…/issues/new?title=<page title>&body=<page URL + commit SHA + version>&labels=docs-feedback` |
| Zero-result search beacon | a prefilled issue with `title = "search: <query>"` and `labels=docs-feedback,docs-search`; the user decides whether to submit |

Rationale: honest, zero infrastructure, and it lands in the same queue the reviewers already watch.

### Phase 3 — endpoint

```
POST /api/docs/feedback
{
  "page": "t3000/features/trendlogs",
  "url":  "/docs/t3000/features/trendlogs.html",
  "value": "down",                    // up | down
  "reasons": ["outdated"],            // incorrect | missing | outdated | other
  "comment": "the field table is for v25",
  "version": "v26.0930",
  "sha": "a1b2c3d",
  "contact": null,                    // optional
  "ts": "2026-10-10T09:12:00Z"
}
```

Schema:

```sql
create table docs_feedback (
  id           bigserial primary key,
  page         text        not null,
  url          text,
  value        text        not null check (value in ('up','down')),
  reasons      text[]      not null default '{}',
  comment      text,
  version      text,
  sha          text,
  contact      text,
  created_at   timestamptz not null default now(),
  owner        text,                          -- resolved from the registry at insert time
  state        text        not null default 'open'   -- open | triaged | fixed | wontfix
);
create index on docs_feedback (owner, state, created_at desc);
create index on docs_feedback (page, created_at desc);
```

Rules:

- `owner` is resolved from `docs/help/index.json` when the row is written, so routing never depends on the
  client.
- The **helpfulness ratio** (up/down per page, last 90 days) is published in the weekly report; a page that
  is "down" three times with the same reason outranks a stale page in the review queue.
- The **aging report** lists `state = 'open'` and `created_at < now() - 30 days`, grouped by owner. Unhandled
  feedback must be visible, not silent.
- The search beacon (`q`, `resultCount`, `clicked`) lands in the same table with `page = 'search:<query>'`,
  feeding the documentation to-do list in `06-search.md` §4.

---

## 2. Subscriptions

| Phase | Mechanism | Data |
|---|---|---|
| 1 | GitHub watch / repo notifications; the generated **What's New** page is the "what changed" source (`10-…`) | none |
| 2 | RSS/Atom feeds generated with the changelog: `/docs/feed/changelog.xml`, `/docs/feed/releases.xml` | none |
| 3 | Portal subscriptions | table below |

```sql
create table docs_subscriptions (
  id          bigserial primary key,
  subscriber  text not null,                 -- user id / email
  target_type text not null check (target_type in ('product','category','page','release')),
  target_id   text not null,                 -- e.g. 't3000', 'protocols', 't3000/features/trendlogs'
  channel     text not null default 'digest',-- digest | immediate | rss
  created_at  timestamptz not null default now(),
  unique (subscriber, target_type, target_id, channel)
);
```

Semantics: a change to page *P* notifies every subscriber whose target matches *P* by page, by category or
by product — resolved from the registry, so a page moving between categories needs no subscription edits.
Delivery defaults to a weekly digest; `immediate` exists for reviewers, not for the public.

---

## 3. Notifications

| Event | Phase 1–2 | Phase 3 | Recipients |
|---|---|---|---|
| Documentation updated (published) | changelog page + RSS | portal bell + digest | subscribers |
| Product release / release notes published | release page + RSS | portal + email | subscribers, support |
| Review requested | GitHub review request | portal + Teams webhook | page owner |
| Page went stale | weekly report | portal + digest | owner |
| "Docs owed" (claimed code changed) | PR check failure | portal + digest | PR author, owner |
| Negative feedback on a page | — | Teams webhook | owner |
| Unhandled feedback > 30 days | aging report (weekly) | escalation | docs owner |

Payload shape for the Teams webhook (one message per event, so a failure is visible and never batched):

```json
{ "event": "docs.stale", "page": "t3000/features/trendlogs", "owner": "trendlog",
  "reason": "api/src/t3_device/trendlog*.rs changed 2026-10-02", "url": "/docs/…/trendlogs.html" }
```

Two guardrails: notifications are **derived from git and the registry**, never from a hand-maintained list;
and every notification links to the page and to the exact command that fixes it.

---

## 4. Tasks

| # | Task | Phase |
|---|---|---|
| 1 | Feedback widget (issue URL form) + `docs-feedback` label + triage ritual | 1 |
| 2 | Changelog page + RSS feed generation | 2 |
| 3 | `docs_feedback` table, endpoint, owner resolution, weekly ratio/aging report | 3 |
| 4 | Teams webhook for stale/negative feedback/review requests | 3 |
| 5 | `docs_subscriptions` + digest job | 3 |
| 6 | Portal bell + subscription UI | 3 |
| 7 | Zero-result beacon → monthly to-do list | 3 |

**Acceptance:** a "No" click produces an issue carrying the page, SHA and version; the RSS feed validates
and lists the last 20 changes; a new feedback row resolves to the right owner without client input; a stale
page notifies its owner once, not once per run.
