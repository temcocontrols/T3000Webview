# EEZ editor — button-by-button: origin vs the unified shell

What every control *does*, what it changes, and what is drawn as a result — **origin** (`T3000Webview-eez-origin`,
EEZ draws its own workbench) vs **new** (the unified Designer shell, EEZ in `hostMode`).

The comparison is mechanical:

```
git diff --no-index "…\T3000Webview-eez-origin\T3000Webview\src\lib\t3-eez-studio" \
                    "…\T3000Webview-EEZ-Studio\src\lib\t3-eez-studio"
```

**Result of that diff for this document: all the *handlers* are byte-identical to the origin.**
`store/index.ts` (mode switching, save, runtime), `project/ui/Toolbar.tsx` (except three `hostMode` gates),
`fluent-toolbar.tsx` (labels) — unchanged logic. What differs is **what is drawn once the state changes**, plus a
short list of gates listed in §5.

---

## 0. The one structural difference

| | origin | new |
|---|---|---|
| Who draws the workbench | EEZ: `ProjectEditor.Content` renders its FlexLayout model (borders + rows of tabsets) | the shell: `projectEezLayout` turns the **same model** into regions (left / right / bottom); EEZ draws none of them |
| Who draws the toolbar | EEZ: `ProjectEditor.Content` → `<Toolbar/>` | the shell's 60 px band, fed by `ProjectToolbarView` (`top.tools`) + the mode cluster (`top.modeBar`) |
| Who draws the canvas | flexlayout's `EDITORS` tabset: **tab strip + the active editor** | only the active editor (`ActiveEditorView`). **No tab strip** (§4) |
| Who draws side panels | flexlayout tabsets, positions from the model | shell regions, positions from the model — *same panels, different geometry* |

So a click that mutates the model is identical in both; **where its result appears** is not.

---

## 1. Mode buttons (right end of the band)

Handler code is the origin's, unchanged (`project-editor/store/index.ts`).

### Edit — `onSetEditorMode` (`store/index.ts:1299`)
| | |
|---|---|
| runs | leaving Full Sim → `onExitFullSimulatorMode()` **and return**; else a live runtime → `runtime.stop()`; else `setEditorMode()` **and** `layoutModels.selectTab(root, PROPERTIES_TAB_ID)` |
| changes | `runtime` → undefined; `layoutModels.root` → `rootEditor` |
| origin draws | workbench from `rootEditor`: left area (*Pages · User Widgets · User Actions* over *Components Palette* · *Widgets Structure*), canvas = `EditorsStore`'s active editor + **its tab strip**, right = *Properties* + the 7-tab border rail, bottom = *Checks · Output · Search · References* |
| new draws | the same panels, as shell regions: left = 431 px (palette 245 + structure 186), right = 346 px (Properties 320 + rail 26), bottom = collapsed dock; canvas = active editor, **no strip** |
| note | because the shell reads the model, the `store/editor.ts:376` fix is what makes "click a page ⇒ that editor appears" work; the origin got it from `TabSetNode.isActive()` |

### Run — `onSetRuntimeMode`
| | |
|---|---|
| runs | runtime exists **and** debugger active → `runtime.toggleDebugger()`; else `setRuntimeMode(false)` |
| changes | `runtime` created; `layoutModels.root` → `rootRuntime` |
| origin draws | the **runtime page alone** — returned *before* the model is consulted (`ProjectEditor.tsx:312-331`) |
| new draws | `eezRegionPlan(mode="run")` → `editor-only`: **no left/right/bottom at all**; the running screen owns the area (LVGL screen at x 0, w 1600) — matches the origin |
| note | the mode is published to the shell by `activeProject.ts` (`isDockerSimulatorMode` → `full-sim`, `runtime.isDebuggerActive` → `debug`/`run`) |

### Debug — `onSetDebuggerMode`
| | |
|---|---|
| runs | no runtime → `setRuntimeMode(true)`; runtime → `editorsStore.openEditor(runtime.selectedPage)` + `toggleDebugger()`; **then** `selectTab(root, DEBUGGER_TAB_ID)` |
| changes | `runtime.isDebuggerActive` true; `layoutModels.root` → `rootRuntime` |
| origin draws | workbench from `rootRuntime`: *Active Flows · Watch* (left), *Queue · Logs* (right) — **no Properties anywhere** — plus the debugger panels; canvas = the runtime editor tab |
| new draws | the same four panels as regions (`projectEezLayout` on `rootRuntime`); canvas = active editor |
| note | a breakpoint hit switches modes **without a click** (`flow/runtime/runtime.ts:239,247` call the same handler) — both builds behave the same |

### Full Sim — `onSetFullSimulatorMode`
| | |
|---|---|
| runs | leaves runtime mode, `layoutModels.isDockerSimulatorMode = true`, `dockerBuildManager.startFullSimulator(store)` |
| changes | `root` → `rootDockerSimulator`; docker build state → `building` |
| origin draws | `rootDockerSimulator`: the **Preview** panel *is* the canvas; right column = *Build Logs* over *Preview Logs* |
| new draws | same model, projected to regions; the canvas resolves the Preview **panel by tab id** (`ActiveEditorView.canvasPanel`, `DOCKER_SIMULATOR_PREVIEW_TAB_ID`) — necessary because in host mode EEZ no longer draws the canvas tab |
| button state | spinner while `dockerBuildState.state === "building"` (`loader`) — unchanged |

### Deploy — `handleDeploy` (`Toolbar.tsx:905`)
| | |
|---|---|
| runs | no `filePath` → error toast *"Save the project first before deploying."*; else `await doSave()`, then opens `DeployDeviceDrawer` (pick device → push → logs) |
| label | origin `Deploy to Device` → new **`Deploy`** (label only; tooltip keeps the full sentence) |
| note | the drawer is T3000's addition on top of EEZ's export; the origin's button only exported JSON |

---

## 2. Toolbar buttons (left cluster of the band)

All handlers identical; only the label/gate column differs.

| button (label) | what it does | new-shell difference |
|---|---|---|
| Save | `doSave()` | — |
| Undo / Redo | `editorsStore`/page undo | the shell's trailing `↶ ↷` are the same commands; `Ctrl+Z/Y` handled by the shell **only if** it has a history |
| Cut / Copy / Paste / Duplicate / Delete | editor-level object ops | — |
| Scrapbook | opens the scrapbook drawer | — |
| Configuration → **Settings** | opens project settings | label shortened |
| Check | runs project validation → fills the **Checks** dock panel | dock opens via the model now (§3) |
| Build | build (LVGL/flow) → fills **Output** | same |
| Run MicroPython Script → **Script** | runs the script editor | label shortened |
| Show front face / back face | `pageTabState.frontFace = …` | — |
| Show timeline | `pageTabState.timeline.isEditorActive` toggle | — |
| Show component descriptions | toggles descriptions in the flow editor | — |
| Editor session buttons (`EditorButtons`) | `editorsStore.openEditor(object)`; `enabled={!isActive}` | — |
| Language selector | `uiStateStore.selectedLanguageID` | — |
| **Zoom box** (`PageZoomButton`, typed % + dropdown) | `pageTabState.transform` | **not drawn when hosted** (`Toolbar.tsx:~543`); the shell's command bar owns zoom (`− 100% +`, `View ▾`) through `eezViewport.ts` — same `pageTabState.transform` |

---

## 3. Panels and what is inside them

| panel | origin position | new position | notes |
|---|---|---|---|
| Pages (`PagesNavigation`) | left, top group | shell left region, section 1 | add/delete/rename page, tree → `openEditor` |
| User Widgets / User Actions | left, top group (tabs) | same section, sibling tabs | |
| Components Palette | left, bottom group | section 2 | widget tiles |
| Widgets Structure | left, second column | `secondary` column (draggable divider) | JSON view of the selected widget |
| Properties | right | right region body | property grid |
| Styles · Fonts · Bitmaps · Themes · LVGL Groups · Breakpoints · Variables | right **border** bar | right region `rail` (26 px) | click = `model.doAction(selectTab)`, click the active tab closes the border |
| Checks · Output · Search · References | bottom border | bottom dock | selecting a tab now also *opens* the dock (`TopSpec.collapsed` from `projection.bottom.activeTabId`) |
| Preview / Build Logs / Preview Logs (Full Sim) | model | canvas + right region | |
| **Editor tab strip** | **canvas tab bar of the `EDITORS` tabset** — one chip per open editor (icon, title, × close, click to switch), added by `EditorsStore.refresh` (`store/editor.ts:514-540`) | **absent** — the canvas shows the active editor only; nothing in the shell reads `editorsStore.tabsModel` | the one part of the origin's UI that is genuinely missing |

---

## 4. The missing piece, precisely

The origin's canvas is a *tabset*, so flexlayout draws its tab bar: one tab per open editor
(`{type:"tab", name: editor.title, component:"editor", icon}` → `AddNode`, `store/editor.ts:514-540`), closable
by flexlayout's default `tabEnableClose`. The shell's canvas is a single `ActiveEditorView` node
(`ProjectEditor.tsx:400`), so:

- no strip → no titles/icons of what is open;
- no **×** → an editor cannot be closed;
- switching works only from the left panels (Pages / User Widgets / User Actions).

---

## 5. Behavioural gates added (complete list)

| # | file | gate | effect |
|---|---|---|---|
| 1 | `ProjectEditor.tsx:72` | `!isProjectEditorHosted()` | EEZ does not draw its own toolbar (the shell's band is the toolbar) |
| 2 | `ProjectEditor.tsx:392` | `isProjectEditorHosted() ? <ActiveEditorView/> : <workbench/>` | canvas only; panels are the shell's |
| 3 | `store/editor.ts:376` | `isProjectEditorHosted()` | the active editor follows the **model's selected tab**, because nothing maintains `TabSetNode.isActive()` when FlexLayout is not rendered |
| 4 | `Toolbar.tsx:~543` | `!isProjectEditorHosted()` | the page **zoom box** is not drawn (the shell's command bar owns zoom) |
| 5 | `Toolbar.tsx:145` | `!isProjectEditorHosted()` | the mode cluster is not drawn inside EEZ's nav — the shell pins it to the band's right (`TopSpec.modeBar`) |
| 6 | `features/page/page.tsx` | feature flag | the LVGL page surface is `LVGLSvgPage` for the version whose runtime carries the scene dump, `LVGLPage` (canvas) otherwise — `?svg=0` or `localStorage["t3.lvgl.svgRenderer"]="0"` forces the canvas |
| 7 | `lvgl/widgets/Base.tsx`, `flow/component.tsx` | guards | property-grid crash fixes for multi-selection (a widget + one of its wires) |
| 8 | `home/settings.tsx`, `home/open-projects-v2.tsx`, `home/main.tsx`, `home/tabs-store.tsx` | — | Restart reloads the new route; delete sends `allowProject=true`; `eez-open-project` bound once; `disposeTabListeners()` |

Keyboard: EEZ's own bindings are untouched (`F5` Run, `Ctrl+F5` Debug, `Shift+F5` Edit, `F7` Full Sim). The shell
claims `Ctrl+Z/Y/S/0/-/=` in the **capture** phase and only when it can carry the key out
(`hooks/useDesignerShortcuts.ts`); editable fields are never claimed.
