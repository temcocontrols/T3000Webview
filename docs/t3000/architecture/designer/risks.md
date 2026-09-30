# Designer — risks, open questions, rollback

---

## 1. Risk register

Severity: **S1** = can block or corrupt the editor · **S2** = visible breakage, has a workaround ·
**S3** = cosmetic / future.

| # | Risk | Sev | Phase | Mitigation | Evidence |
|---|---|---|---|---|---|
| R1 | **The HVAC engine cannot be re-initialised.** `T3Opt.Initialize` destroys `T3Gv.state`/`stdObj` (`DataOpt.ts:472-477`), creates new `docUtil`/`opt` (`T3Opt.ts:100-101`), and `InitializeWorkArea` re-binds jQuery handlers with no unbind (`DocUtil.ts:225,230,240`). A shell that remounts the canvas (e.g. on a collapse toggle, a re-render with a changed key, or React StrictMode's double-effect) corrupts the drawing. | S1 | P1, P3 | The canvas host is mounted **once per document** and keyed by document id only. The shell must not key the canvas on panel state. A guard in the adapter (`if (mountedRef.current) return;`) plus a dev assertion that `initialize` is called exactly once per document id. **Verify: round-trip 10× and assert a stable `#svg-area` element instance.** Also: check whether `main.tsx` runs React StrictMode — if it does, dev double-mounting will fire it twice and the adapter needs an explicit guard. | `T3Opt.ts:88-158`; `UIUtil.ts:374-376`; `IdxPageReact.ts:58-66` |
| R2 | **`EditorsStore` is coupled to FlexLayout rendering.** `activeEditor` is derived from tab nodes (`store/editor.ts:296-416`) and `openEditor` mutates the model via `FlexLayout.Actions.addNode` (`:526-542`); `actualTabsetID` (`:167`) resolves the *rendered* tabset id. If the root model is not rendered, some paths may stop working. | S1 | P2 | D8 keeps the model headless so `tabs` (`:281`, `visitNodes`) and `selectTab` still work. **Before writing any P2 code, run a 1-hour spike**: render nothing, keep the model, call `openEditor` from the console, and check `activeEditor` + `editorsStore.tabs.length`. If it fails, add the smallest additive override (`selectActiveEditor(editor)`), never a rewrite. | `grep editorsStore.` → 30 files |
| R3 | **EEZ global CSS leaks** and would restyle the HVAC document in the same page: `* { user-select: none }` (`app.less:52`), `body { overflow: hidden; font-size: .8rem }` (`:64`), element-level `input…` rules (`:79-98`), `#EezStudio_Content { position: absolute }` (`:129`), `.flexlayout__*` (`:1421-1490`). | S1 | P2 | `theme-and-css.md` §4 — scope every leaking selector under the EEZ wrapper in the same commit that first renders the shell. Verify with an HVAC document open. | listed with line numbers |
| R4 | **Menu-set prefix collision.** `'/t3000/designer'.startsWith('/t3000/design')` → `getMenusForPath` returns the Design Hub menus for every designer route. | S2 | P1 | Add the designer branch **before** line 1430 or match on segments. Cheap, but a 100 % symptom if missed (wrong menu bar, missing File/Edit). | `menuConfig.ts:1429-1434` |
| R5 | **Two hand-maintained route tables.** `App.tsx` renders; `routes.ts` holds `windowId`/title/shortcut metadata consumed by `Header.tsx:814`. `routes.ts` has already drifted (no `/t3000/eez`, no `/t3000/design`). | S3 | P4 | Update both in the same commit; add the missing entries; add a comment in each file pointing at the other. | `routes.ts:115-122, 305-330` |
| R6 | **No catch-all route** in the live table (`App.tsx:621` is a comment) — a bad `:kind` renders an empty frame. | S2 | P1 (shell) | The shell renders an explicit "unknown document type" state listing valid kinds + a link to the Design Hub. P4 may add a real `*` route. | `App.tsx:621` |
| R7 | **Route change remounts the EEZ root.** The EEZ app is its own `createRoot` on `#EezStudio_Content` (`home/main.tsx:183-194`), cached as `el._eezRoot`; there is **no teardown** — navigating away leaves mobx stores/timers alive on a detached node, and the next mount unmounts + recreates. | S2 | P2, P4 | Keep the host element mounted for the whole LVGL document (the shell owns the outer div; only its children change). Measure the switch cost in P4; add keep-alive only if it is a visible problem (D3: suspend/resume is not needed). | `main.tsx:185-194`; `EezStudioApp.tsx:195-200` |
| R8 | **The saved FlexLayout layout becomes stale** if the root model's tab set changes: `AbstractLayoutModels.load` accepts a saved model only when `savedModel.version == model.version` (`layout-models.ts:15-21`), persisted in `<project>-ui-state` (`ui-state.ts:291/160`). | S2 | P2 | If the root model changes at all, **bump `version`** (`layout-models.tsx:404`, currently `129`). If a saved layout references a tab the shell no longer renders, that is harmless (the model is headless) — but bumping keeps the two shapes in sync. Also expose "Reset panels" → `LayoutModels.reset()` (`:1185`). | `layout-models.tsx:404`, `ui-state.ts:160/291` |
| R9 | **HVAC has no event bus.** No `T3Gv.Evt`, no emitter; `RefConstant` "refs" are plain `{value}` boxes (`RefConstant.ts:4`), so nothing is observable. | S2 | P1, P1b | Poll with a single shared hook (existing precedent: `TopToolbar.tsx:192` 300 ms, `T3ContextMenu.tsx:329` 150 ms, `useStatusMessage.ts:16-23` rAF). P1b optionally adds a 2-line notification hook at the two mutation funnels (`SelectUtil.ts:115, 251`). | verified: no emitter in `lib/t3-hvac` |
| R10 | **HVAC has two disjoint state models.** `features/hvac-designer/store/designerStore.ts` (Zustand, `shapes/selectedShapeIds`) vs the engine's `T3Gv.stdObj` blocks. `PropertiesPanel.tsx` reads the Zustand store and edits it — which the engine never reads. The panel is also **imported nowhere**. | S2 | P1, P1b | The new `HvacPropertiesPanel` reads the **engine** (D12). The Zustand store is left alone; do not "fix" it in this project (out of scope, listed in §3). | `PropertiesPanel.tsx:17-19`; `designerStore.ts:25` |
| R11 | **The HVAC undo entry point is unverified.** `engineMutation` needs a real undo API; I have not read it. | S1 for P1b | P1b | Do not write P1b until the spike locates the engine's undo/action manager and proves one edit = one undo entry. Candidates to inspect: `T3Gv.opt` action methods, `ToolActUtil`, `OptCMUtil`, `SvgUtil.RenderDirtySVGObjects` (`SvgUtil.ts:149`). If no clean API exists, P1b degrades to "read-only panel" and editing stays in the engine's own UI (documented, not shipped broken). | must verify |
| R12 | **Window-based sizing.** `UIUtil.GetScreenDimensions()` (`:879-887`) uses `window.innerWidth/…` to set the *initial* document size. A shell with narrower panels keeps the same document size — correct — but a future "fit to container" change would alter behaviour. | S3 | P3 | Leave as-is; noted so nobody "fixes" it accidentally. | `UIUtil.ts:879-887` |
| R13 | **Losing FlexLayout features** (drag-dock, saved layouts for the root, "Reset Layout" from the Electron menu at `main/menu.ts:765` → IPC `resetLayoutModels` → `tabs-store.tsx:699-703`). | S3 | P2 | Accepted with D2/D8: the *model* still exists and `reset()` still works, so the IPC path keeps functioning; only drag-docking of the five areas is gone, replaced by collapse toggles + splitters + persisted widths. | — |
| R14 | **`?svg*` flags and the runtime stamp must survive redirects.** `feature-flag.ts:42-55` reads `location.search + hash`; `runtime-cache-guard.ts` keys its per-tab stamp off the URL. Dropping the query during a redirect would re-download the WASM and break `?svgDiff=1` bookmarks. | S2 | P4 | The redirect component must copy `location.search` verbatim (HashRouter: query lives inside the hash — `EezStudioApp.tsx:183-186`). Covered in the P4 gate. | `feature-flag.ts:28-55` |
| R15 | **Cold-load path.** `settings.tsx:371` does `window.location.href = "/#/t3000/eez"` — a full page reload. A client-side redirect works but costs a double load. | S3 | P4 | Update the literal in `settings.tsx` to the new route. | `settings.tsx:371` |
| R16 | **Dark mode is not wired anywhere** (`App.tsx:204` hardcodes light; `t3000Theme` at `app/config/theme.ts:38` is unused; `ThemeSelector` is commented out at `Header.tsx:1006`). | S3 | — | Out of scope. The bridge (`theme-and-css.md` §3) is written against Fluent tokens so it becomes correct automatically when dark lands. Do not add a second theme switch inside the Designer. | — |
| R17 | **Shell re-render cost.** EEZ panels are mobx `observer`s over a 280k-line app; a shell that re-renders on every model change can amplify work. | S3 | P2 | Region content is `useMemo`'d per tab id; the shell subscribes only to the layout projection, and the projection is computed from the model node tree, not from project data. Watch for it in the P2 performance pass (`?svgStats=1`, and a React Profiler run on page switch). | — |
| R18 | **`Level` of effort on P2.3** (panels out of FlexLayout) is the largest single step. | S2 | P2 | Split into P2.1…P2.9 sub-steps, each shippable and each verified (see the phase doc). The first sub-step (host the whole workbench inside the canvas slot) proves the hosting approach before the remaining sub-steps. | — |

---

## 2. Rollback

The design is deliberately rollback-friendly:

| Failure point | Rollback | Cost |
|---|---|---|
| P1 or P1b (HVAC shell) | Do nothing — the old route `/t3000/hvac-designer` is untouched (D10). Users keep using it; the new route can be hidden by removing one `App.tsx` entry | one line |
| P2 (LVGL shell) | Same: `/t3000/eez` still renders the original page (D11). The new route is additive | one line |
| P3 (container parameterisation) | Revert the 7 engine files; the ids fall back to the current literals. `git revert` of one commit | ~15 min |
| P4 (redirects) | `git revert` the route-table commit; both routes live again. Nothing else depends on it | ~10 min |
| P5 | Remove `lcd-ui` from the registry; keep the command bus if it is already in use | minutes |

Because the redirects land last (P4), **the entire project up to P3 has zero user-visible risk**: every
existing URL keeps rendering exactly what it renders today.

Optional extra safety in P4: a one-line kill switch
(`localStorage["t3.designer.enabled"] = "0"` → the old route renders the old page) for one release, then
delete it. This turns "rollback" into a support instruction instead of a deploy.

---

## 3. Open questions

Deliberately small; each has a default so nothing is blocked.

| # | Open question | Decision default | When it must be settled |
|---|---|---|---|
| Q1 | For an LVGL document, which left-panel tab is active on open? | **Pages** (matches the old workbench's `PAGES_TAB` selection logic at runtime; `NavigationComponentFactory.tsx:185-191` selects `USER_WIDGETS_TAB_ID` for a user-widget project) | P2.3 (one line) |
| Q2 | With no tabs, opening a *second* editor (a font, an action) replaces the canvas instead of adding a tab. Acceptable? | **Yes** — matches D3. The left tree still switches back | P2.2 (confirm) |
| Q3 | Where does "New drawing" live in the Designer? | **Keep it in the Design Hub** (`DesignMenuBar.tsx:114` → Hub), and add a `File ▸ New…` in P4 that goes to the Hub with `?create=`. No in-editor creation dialog | P4 |
| Q4 | Is the EEZ `View ▸ Switch Theme` menu item? | **Remove it** (D5); the T3000 theme owns theme selection | P2.7 |
| Q5 | Should the shell persist region widths per document kind or globally? | **Per kind** (`localStorage["t3.designer.layout"]`, keyed by kind) — an HVAC user and an LVGL user want different defaults | P1 |
| Q6 | Is an "unsaved changes" guard wanted on navigate? | **Not in P1–P4** (today's behaviour is no guard). Add later only if asked | P4 optional |
| Q7 | Should the new route ever carry the LVGL project path in `:id` instead of `?open=`? | **Yes, support both**: `:id` (URL-encoded path) preferred, `?open=` accepted for back-compat | P2/P4 |
| Q8 | Is T3000 dark mode wired as part of this? | **No** (R16) — out of scope | — |

## 4. Explicitly out of scope (do not drift here)

- Merging the two document models, or rewriting either engine.
- Making the engines non-singleton, supporting two documents at once, document tabs, or split view.
- Replacing EEZ's internal UI kit with Fluent (only the chrome and the *chrome around* panels is Fluent).
- Fixing the HVAC Zustand/engine state duplication (`designerStore.ts`), or the dead `PropertiesPanel`
  legacy file — the new panel replaces its role.
- Wiring dark mode, or the unused `t3000Theme`.
- Vue-era dead code (`Page/P.Main.ts`, `AppRuntime.ts`, `IdxUtils.ts` Moveable DOM, `typescript`'s
  `ignoreDeprecations` mismatch) — noted, not touched.
