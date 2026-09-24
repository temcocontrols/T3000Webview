# The Design Hub, page by page — the entry point into every designer document

`features/design-hub/**`. Two pages, eleven dialogs/panels, two services, one registry. This is where
**every** designer URL is minted, which is why P4 touches it more than any other feature — and why the
*consumers* are all still `UNCHANGED`: they navigate with a `openPath` they are handed.

Since the closing pass the two **sources** mint canonical URLs — `drawingTypes.ts` and the services call
`designerPath(kind, id?)` (`features/designer/kinds.ts`), the same function `legacyRedirects.ts` uses — so no
hub link depends on the redirect hop any more (verified by `designer-route-links.test.ts`, which pins the two
directions against each other).

---

## 1. Pages

### `DesignHubPage` — `#/t3000/design` — **LINK-ONLY**

| Area | Component (line) | Notes |
|---|---|---|
| Hero / guide | `HeroHeader` (`:391`) | static help |
| Device context | `DeviceContextBar` (`:392`) | selects the device a new drawing binds to |
| Create by type | `TypeTiles` (`:424`) → `NewDrawingDialog` | tile click sets `newDrawingType`; **no navigation** |
| Projects | `ProjectsGrid` (`:449`) → `ProjectCard` | card/row click → detail page; green **Open** → `#${project.openPath}` (`ProjectCard.tsx:100`) |
| Examples | `EezExamplesDrawer` (`:526-530` badge) → `EezExampleCreateDialog` | LVGL example catalog |
| Command palette | `CommandPalette` (Ctrl+K) | `:44` hub, `:52-58` per drawing type, `:60-68` per template, `:124` project |
| Drag-drop import | `:104-113`, overlay `:344-378` | drops SVG/JSON → `importFile()` → `navigate(r.openPath)` (`:110`) |
| URL params | `?create=<typeId>` **live** (`:79-86`, stripped by rewriting the hash at `:278-286`); `?tab=` **dead** (see §4) | |

### `ProjectDetailPage` — `#/t3000/design/projects/:id` — **LINK-ONLY**

Hero, info cells, large preview, snapshots, compare, deploy log, actions (Open / Rename / Duplicate / Share /
Delete). Its **Open** is the only designer navigation: `window.location.hash = \`#${project.openPath}\``
(`:375`); duplicate navigates back to itself with the new id (`:327`); back-links go to `/t3000/design`
(`:251, 334, 395`).

## 2. Dialogs / panels that navigate into a designer route

| Component | User action | Target | Line | Phase change |
|---|---|---|---|---|
| `NewDrawingDialog` | tile → device (+ graphic slot, + name) → **Create & Open** | `${type.openPath}?device=…&graphic=…&name=…` | `:137-141`, navigate `:147-156` | `UNCHANGED` (registry-driven) |
| `LvglCreateDialog` | create LVGL / LVGL+Flow project | `` `${designerPath(lvglKind)}?new=<wizardType>&name=&location=&createDirectory=` `` | `:189` | **DONE** — `lvglKind` follows the type (`lvgl-flow-9-5` for the Flow type, matching its own `hasFlowSupport`) |
| `LvglCreateDialog` (load from device) | import over REST, then open | `` `${designerPath(lvglKind)}?open=<path>` `` | `:273` | **DONE** |
| `EezExampleCreateDialog` | pick an example, create | `` `${designerPath(isFlow ? 'lvgl-flow-9-5' : 'lvgl-9-5')}?examples=1&type=…` `` | `:100` | **DONE** — the example's own `type` decides the kind |
| `EezExamplesDrawer` | browses the catalog; opens the dialog (`:238-241`) | — | | `UNCHANGED` |
| `ImportDialog` | import SVG/JSON → jump into the editor | `navigate(result.openPath)` | `:44` | `UNCHANGED` (`openPath`) |
| `TemplatesSection` | create from template | `navigate(project.openPath)` | `:24-26` | `UNCHANGED` — **currently unmounted** (`DesignHubPage:20-27`) |
| `CommandPalette` | Ctrl+K commands | as above | `:44, 52-58, 60-68, 124` | `UNCHANGED` |
| `ProjectCard` | green **Open** | `#${project.openPath}` | `:100` | `UNCHANGED` |
| `ActivityPanel` | recent-activity row | `#${p.openPath}` | `:74` | `UNCHANGED` — **currently unmounted** |
| `DesignMenuBar` | File ▸ New Drawing / Back to Hub / … | `designerPath('hvac-schematic')` (`:114`), `/t3000/design` (`:113`) | | **DONE** — still **exported (`index.tsx:6`) but rendered nowhere**; if it is revived it must use the registry |
| `NewTypeDialog` | user registers a custom type (hidden by `getAllDrawingTypes`) | `designerPath('hvac-schematic')` as default **and** placeholder | `:39, 49, 70, 113` | **DONE** (the field stays free text — a custom type may point anywhere) |
| `EditorStatusBar` | — | consumes `t3-editor-status` | `:37-49` | `MOVED` into the shell's status slot (see `designer-shell-areas.md` §4) |
| `useEditorCommands` | publishes status/commands | `:24-32` | | `MOD`: becomes the shell adapters' publisher; today **nothing calls `emitEditorStatus`** |

## 3. Services and the registry (where the URLs actually come from)

| File | Role | Change |
|---|---|---|
| `drawingTypes.ts` | `DRAWING_TYPES` registry: `id`, `engine`, `openPath`, `wizardType` → the **single source** for "open this kind" (`:17` hvac, `:66` lcd, `:78` lvgl, `:91` lvgl-flow; commented `:32, 44, 55`) | **DONE**: `openPath` values are `designerPath(kind)` calls, so **every consumer follows automatically**. The commented (hidden) types keep their historical literals — they are comments |
| `services/designHubService.ts` | localStorage + `/api/design-hub/hvac-drawings/{id}`; mints the HVAC path in 6 places (`:97, 365, 487, 516, 595, 657`) | **DONE**: all 6 are `designerPath('hvac-schematic', id)` |
| `services/projectCatalog.ts` | on-disk catalog → `HubProject`; `?open=` for EEZ/LVGL (`:75`), HVAC drawing (`:95`) | **DONE**: `designerPath('lvgl-9-5')` + `?open=`, and `designerPath('hvac-schematic', d.id)` — the helper encodes the id, so the hand-written `encodeURIComponent` is gone |
| `store/designHubStore.ts` | tab state, projects, dialogs; `importFile` return type includes `openPath` (`:104`) | `UNCHANGED` |
| `templates.tsx` | template catalogue (`tpl-hvac-schematic`, `tpl-lcd`) | `UNCHANGED` |

## 4. Two regressions worth fixing in the same pass

1. **`?tab=` is written by four menu items and read by nobody.** `menuConfig.ts:947, 956, 965, 975` emit
   `#/t3000/design?tab=templates|libraries|recent|import`; the only `params.get(` in the whole feature is
   `DesignHubPage.tsx:82` (`create`). So the menu items land on the hub and do nothing.
   `FIX-OPPORTUNITY`: implement the tab focus, or point the items at the sections that exist
   (`SharedLibraries`, `TemplatesSection`, `ActivityPanel` are commented out at `:20-27, 437-441, 463-471`).
2. **Five hub components are dead code**: `HubStats`, `FoldersBar`, `TemplatesSection`, `SharedLibraries`,
   `ActivityPanel` are not rendered. Decide: revive during P4 (they are the natural home for `?tab=`), or
   delete. Leaving them half-wired is what makes the `?tab=` items look broken.

## 5. What the Designer needs from the Hub (and vice versa)

| Direction | Contract |
|---|---|
| Hub → Designer | the URL: `openPath` (+ `?device=&graphic=&name=` for HVAC, `?new=/&examples=/&open=` for LVGL) |
| Designer → Hub | the shell's back button → `/t3000/design`; the "unknown document" state links to the hub |
| Shared | **no shared state**: the hub owns the project list; the designer owns the open document |
| Not shared | creation dialogs. Q3 default: the Designer does **not** get its own "New drawing" dialog; `File ▸ New…` (P4) routes to the hub with `?create=<kind>` |

## 6. Verification for this family

Per the P4 gate ([`../verification.md`](../verification.md) §4/P4) and the closing pass (§4 *closing pass* in the
same file): type tiles, create (HVAC + LVGL + example), import (SVG/JSON + drop), template, duplicate,
recent/recently-created, project-card Open, project-detail Open — each must land on the same document, under
`/t3000/designer/...`, with `?create=` still stripping correctly and the `svg*` flags surviving any redirect.

**Run end-to-end in the browser (closing pass)** — hub history card →
`#/t3000/designer/lvgl-9-5?open=…`; palette → `#/t3000/designer/lvgl-flow-9-5?type=…`; both LVGL create
dialogs → the wizard with `?new=`/`name`/`location`/`createDirectory` intact; HVAC create →
`#/t3000/designer/hvac-schematic?device=1028&graphic=1&name=HVAC` with the editor rendering 222-224 SVG nodes.
**Not** exercised: the device-import tab (it writes an `.eez-project` into the project root — not something a
verification pass should create).
