# Every route in the app, and how the Designer touches it

Source of truth: `src/t3-react/app/App.tsx` — `HashRouter` at `:224`, `<Routes>` `:225-622`.
Second table (metadata only, **not** rendered by `App.tsx`): `app/router/routes.ts:124` `t3000Routes`,
consumed by `Header.tsx:108, 814`.

**43 routes, 4 layout scopes, 3 designer-relevant routes.** Everything else is untouched.

---

## 1. Impact summary

| Impact | Count | What it means |
|---|---|---|
| `HOSTS-SHELL` | 3 | becomes a Designer document (P1 HVAC, P2 LVGL, P5 LCD) — a **new** route is added; the old route keeps rendering the old page until P4 |
| `REDIRECT-SOURCE` | 3 | the same three URLs, after P4 |
| `LINK-ONLY` | 2 | Design Hub pages: their own code does not change, their links resolve through `drawingTypes.ts` / `openPath` |
| `TOUCHED (non-page)` | 11 | files that are not routes but must change (menu config, route table #2, link builders, docs) |
| `UNCHANGED` | 38 | no code change at all |

## 2. The three designer-relevant routes (all under `MinimalLayout`, none under `ProtectedRoute`)

| Route (`App.tsx`) | Element | Impact | Phase |
|---|---|---|---|
| `hvac-designer/:graphicId?` (`:492-503`) | `HvacDesignerPage` | `HOSTS-SHELL` → `REDIRECT-SOURCE` | P1 (shell) / P4 (redirect) |
| `eez` (`:549-559`) | `EezStudioApp` | `HOSTS-SHELL` → `REDIRECT-SOURCE` | P2 / P4 |
| `tstat10-simulator` (`:505-511`) | `Tstat10SimulatorPage` (responsive wrapper `:110-126`) | `HOSTS-SHELL` → `REDIRECT-SOURCE` | P5 |

New routes (additive from P1, D10): `/t3000/designer/hvac-schematic/:id?`,
`/t3000/designer/lvgl-9-5/:id?`, `/t3000/designer/lvgl-flow-9-5/:id?`, `/t3000/designer/lcd-ui`.

## 3. `MainLayout` branch — `App.tsx:226-472` (29 routes, all `UNCHANGED`)

Parent `App.tsx:227-233` — `path="/t3000"`, element `<ProtectedRoute><MainLayout/></ProtectedRoute>`.
Every child below is a relative path under `/t3000`, wrapped in `ProtectedRoute` + `React.Suspense`
(`<div>Loading...</div>`).

| path | element | what it is | impact |
|---|---|---|---|
| `index`, `dashboard` | `DashboardPage` | landing blade; dev popover portal `:764` | UNCHANGED |
| `inputs` / `outputs` / `variables` | `InputsPage` / `OutputsPage` / `VariablesPage` | Azure-blade point grids (the reference layout for all table pages) | UNCHANGED |
| `programs` | `ProgramsPage` | BACnet program editor (`T3000-Source/…/BacnetProgram.cpp`) | UNCHANGED |
| `pidloops` | `PIDLoopsPage` | PID loop grid | UNCHANGED |
| `graphics` | `GraphicsPage` | graphical floor plans | UNCHANGED |
| `schedules` / `holidays` | `SchedulesPage` / `HolidaysPage` | weekly / annual routines | UNCHANGED |
| `trendlogs` | `TrendlogsPage` | trend-log config; **portals tabs into `#page-header-actions`** (`:1905`, `:2412`) — works because it is under `MainLayout`, and it has a fallback (`:2429`) | UNCHANGED |
| `trend-policy` | `TrendPolicyPage` | **deprecated**, superseded by Haystack tags | UNCHANGED |
| `alarms` | `AlarmsPage` | alarm list / ack | UNCHANGED |
| `network` | `NetworkPage` | BACnet network + topology | UNCHANGED |
| `array` / `tables` | `ArrayPage` / `TablesPage` | BACnet array / generic table browser | UNCHANGED |
| `users` / `custom-units` | `UsersPage` / `CustomUnitsPage` | accounts / engineering units | UNCHANGED |
| `settings` | `SettingsPageResponsive` | device settings tabs (wrapper switches at `<1200px`, `:74-91`) | UNCHANGED |
| `discover` / `buildings` | `DiscoverPage` / `BuildingsPage` | LAN scan / building config | UNCHANGED |
| `developer/sync` / `developer/fluentui-v9` | `SyncConfigurationPage` / `FluentUIV9Page` | FFI sync / Fluent test harness | UNCHANGED |
| `database/config` | `DatabaseConfigPage` | server DB backend config | UNCHANGED |
| `haystack-tags` / `custom-tags` / `auto-tagging` | `HaystackTagsPage` / `CustomTagsPage` / `AutoTaggingMcpPage` | tag library / regex auto-tagging | UNCHANGED |
| `fdd` | `FddPage` | fault detection & diagnostics | UNCHANGED |
| `ai-assistant/mcp` | `McpServerPage` | MCP server guide | UNCHANGED |

## 4. `MinimalLayout` branch — `App.tsx:474-560` (8 routes)

Parent `App.tsx:474` — `path="/t3000"`, element `<MinimalLayout/>`, **no `ProtectedRoute`**.

| path | element | impact |
|---|---|---|
| `ai-chat` (`:476-482`) | `AiChatPage` | UNCHANGED (its doc comment claiming MainLayout chrome is stale) |
| `trends/chart` (`:484-490`) | `TrendChartPage` | UNCHANGED (`?serial_number/panel_id/trendlog_id/monitor_id`) |
| `hvac-designer/:graphicId?` (`:492-503`) | `HvacDesignerPage` | **HOSTS-SHELL → REDIRECT-SOURCE** |
| `tstat10-simulator` (`:505-511`) | `Tstat10SimulatorPage` | **HOSTS-SHELL → REDIRECT-SOURCE** (P5) |
| `documentation/*` (`:513-524`) | `DocumentationPage` | UNCHANGED (its *content* mentions designer routes → doc edits in P4) |
| `design` (`:526-540`) | `DesignHubPage` | **LINK-ONLY** |
| `design/projects/:id` (`:541-548`) | `ProjectDetailPage` | **LINK-ONLY** |
| `eez` (`:549-559`) | `EezStudioApp` | **HOSTS-SHELL → REDIRECT-SOURCE** |

## 5. `/t3000/develop` branch — `App.tsx:563-618` (5 routes, all `UNCHANGED`)

`DevelopLayoutWrapper` (own `Header` + `StatusBar`, `:41-63`) and `DevelopLayout` (own left nav,
`:15-29`): `index` → `<Navigate to="/t3000/develop/files">`, `files`, `database`, `transport`, plus sibling
`logs` (which gets the wrapper but **not** the left nav).

## 6. Chrome each layout gives a page

### `MainLayout` (desktop) — `layout/MainLayout.tsx:186-236`

| # | Chrome | Height / style |
|---|---|---|
| 1 | `GlobalMessageBar` (only when a message exists) | `padding:6px 12px` |
| 2 | `Header` | menu bar `minHeight:32px` (`Header.tsx:140-148`) + toolbar `minHeight:44px` (`:173-180`) |
| 3 | left `TreePanel` + 4 px resizer | `minWidth:200; maxWidth:500; backgroundColor:#fafafa` (`:58-72`) |
| 4 | `PageHeader` | `minHeight:44px`; hosts **`#page-header-actions`** (`PageHeader.tsx:198`) |
| 5 | `<Outlet/>` | `flex:1; overflow:auto; padding:10px` (`:75-81, 204`) |
| 6 | `StatusBar` | `height:24px` (`layout/StatusBar.tsx:16`) |

→ available height `100vh − 146px`, minus 10 px padding. Mobile (`<768px`) swaps in `MobileShell`
(`:274-275`) with bottom nav.

### `MinimalLayout` — `layout/MinimalLayout.tsx:50-74`

| # | Chrome | Note |
|---|---|---|
| 1 | `Header showToolbar={false}` | **menu bar only**, `minHeight:32px` (`Header.tsx:140-148, 1062`) |
| 2 | `GlobalMessageBar` (optional) | same as above |
| 3 | `<Outlet/>` directly | `flex:1; overflow:hidden; background:#ffffff; position:relative` — **no PageHeader, no StatusBar, no TreePanel, no padding** |

Also injected: a global `<style>` forcing `.fui-MenuPopover`/`.fui-PopoverSurface` to `z-index:10000`
(`:14-18, 54`) — needed because the EEZ app paints over Fluent popovers.

→ **Designer consequence:** the shell (a `MinimalLayout` route) must own its top bar, status bar and panel
chrome. `PageHeader` and its breadcrumb table (`PageHeader.tsx:96-159`, incl. the dead `:137`, `:140`, `:143`
entries) are not reachable from here.

### `DevelopLayoutWrapper` — `:41-63`

`GlobalMessageBar` → `Header` (with toolbar) → `contentArea` → `<Outlet/>` → `StatusBar`. `DevelopLayout`
adds a collapsible left `aside`.

## 7. Portal usage vs `MinimalLayout` — the one real defect

| Page | Portal target | Under MainLayout | Under MinimalLayout |
|---|---|---|---|
| `TrendlogsPage` | `#page-header-actions` (`:1905` → `:2412`) | tabs in the PageHeader row | n/a (it is a MainLayout route) |
| **`Tstat10SimulatorPage`** | `#page-header-actions` (`:298-302`, `:330`, `:339`, `:400`) | Design/View toggle in the header | **`portalTarget === null` → the toggle silently does not render; there is no fallback** |

`FIX-OPPORTUNITY` (P5): the LCD document must render its mode toggles in the shell's own top bar
(this is exactly what `pages/lcd-document.md` specifies).

Other `createPortal` uses (`DashboardPage.tsx:764`, `DeviceTree.tsx:374`) are floating popovers, unaffected.

## 8. Link inventory — where the 30 entry points live

Grouped; every designer URL is minted in one of these places. **Closing pass: the minting sites are done** —
they all call `designerPath(kind, id?)`. There are no legacy literals left outside `legacyRedirects.ts`,
`App.tsx` + `routes.ts` (the redirect and its metadata, which must stay) and `menuConfig.ts` (hub paths),
checked with a repo-wide grep.

| Group | Sites |
|---|---|
| **Registry (the single source for "open this kind")** | `design-hub/drawingTypes.ts:17, 66, 78, 91` — **now `designerPath(kind)` calls**; the commented (hidden) variants `:32, 44, 55` keep their historical literals because they are comments |
| **Services** | `designHubService.ts:97, 365, 487, 516, 595, 657` — all `designerPath('hvac-schematic', id)`; `projectCatalog.ts:75` (`designerPath('lvgl-9-5') + '?open=…'`), `:95` (`designerPath('hvac-schematic', d.id)`). The helper encodes the id, so the hand-written `encodeURIComponent` at `:95` is gone |
| **Hub dialogs** | `NewDrawingDialog.tsx:141` (navigates `type.openPath`, so it followed the registry automatically), `LvglCreateDialog.tsx:189` + `:273` (`designerPath(lvglKind)`), `EezExampleCreateDialog.tsx:100` (`designerPath(isFlow ? 'lvgl-flow-9-5' : 'lvgl-9-5')`), `ImportDialog.tsx:44`, `TemplatesSection.tsx:26` |
| **Hub components** | `ProjectCard.tsx:96, 100`, `ProjectsGrid.tsx:301`, `ProjectDetailPage.tsx:375`, `ActivityPanel.tsx:74` (unmounted today), `CommandPalette.tsx:44, 52-58, 60-68, 124`, `DesignHubPage.tsx:110` — all navigate a handed `openPath`, so none of them changed |
| **Top menu bar** | `menuConfig.ts:889, 904, 919, 928, 937, 947, 956, 965, 975, 990-993` (hub paths — the designer is not a menu target), `Header.tsx:583` **done** → `designerPath('lvgl-9-5')`, `Header.tsx:814` (windowId → `routes.ts`) |
| **Second route table** | `routes.ts:306` (`tstat10-simulator`, `windowId:17`, `Alt+M`), `:327` (`hvac-designer`) — metadata kept on purpose, both elements are redirects |
| **Inside EEZ** | `home/settings.tsx:370-371` **done** (cold full page load → `/#/t3000/designer/lvgl-9-5`, i.e. the same document the redirect picked, without the extra bounce), `home/main.tsx:202` now binds `eez-open-project` **once per page** instead of once per mount, `EezStudioApp.tsx:483` (back to hub) |
| **Mobile** | `t3-mobile/layout/SideNavContent.tsx:155` **done** → `designerPath('lcd-ui')` — no entries for the other design routes |
| **Dead / unmounted** | `DesignMenuBar.tsx:113-207` (exported `index.tsx:6`, rendered nowhere), `ActivityPanel`, `HubStats`, `FoldersBar`, `TemplatesSection`, `SharedLibraries` are commented out of `DesignHubPage` (`:20-27, 437-441, 463-471`) |

### Two findings worth acting on in P4

1. **`?tab=` is written by four menu items and read by nobody.** `menuConfig.ts:947, 956, 965, 975` produce
   `#/t3000/design?tab=templates|libraries|recent|import`; the only `params.get(` in the whole Design Hub is
   `DesignHubPage.tsx:82` reading `create`. So those four menu items navigate to the hub and do nothing else.
   `FIX-OPPORTUNITY`: either implement the tab focus or point the items at the sections/pages that exist.
2. **`?type=` is appended by the command palette to *every* registry `openPath`**
   (`CommandPalette.tsx:52-58` → e.g. `/t3000/eez?type=lvgl-9-5`), and no destination reads it except the
   LVGL *examples* flow. On the new route the shell should read it as a kind hint and ignore it otherwise.

## 9. Non-page files that must change (P1–P5)

| File | Change | Phase |
|---|---|---|
| `app/App.tsx` | +1 route (P1), +1 route table entry for LVGL kinds (P2), 3 redirects + fallback (P4/P5); **also unmounts EEZ's own root on document teardown (closing pass)** | P1/P4 |
| `app/router/routes.ts` | update `:306`, `:327`; add the designer entries; add the missing `/t3000/eez` + `/t3000/design` entries so the tables stop drifting | P4 |
| `config/menuConfig.ts` | designer branch **before** `:1430` (prefix collision) + `getMenusForKind`; drop/remap `Switch Theme` (`:1364`) | P1/P2/P4 |
| `layout/Header.tsx` | `:583` target — **done** (`designerPath('lvgl-9-5')`); `:814` untouched; `REFRESHABLE_PATHS` (`:125-132`) contains only T3000 page paths, so the designer needs no entry | P4 |
| `t3-mobile/layout/SideNavContent.tsx` | `:155` path — **done** (`designerPath('lcd-ui')`) | P5 |
| `layout/PageHeader.tsx` | `:137, 140` **deleted (closing pass)** — both legacy paths render under `MinimalLayout`, which never renders `PageHeader`, so the entries were unreachable; a comment now says why the designer routes need none | P5 |
| `lib/t3-eez-studio/home/settings.tsx` | `:371` cold-load URL — **done** (`/#/t3000/designer/lvgl-9-5`); `home/main.tsx:202` also binds its listener once | P4 |
| `features/design-hub/*` | see [`design-hub.md`](./design-hub.md) | P4 |
| `lib/t3-hvac/Opt/Common/IdxPageReact.ts` | **new in the closing pass**: the window-listener pair is kept on the singleton and released by `destroyWindowListener()` | P3 follow-up |
| docs | `docs/t3000/design-hub/README.md:13-16, 20, 106`; `t3-eez-studio/manual/01-overview.md:70`; `…/06-reference-and-faq.md:46-48`; `lvgl-svg/architecture.md:20`; `lvgl-svg/editor-integration.md:51` | P4 |
