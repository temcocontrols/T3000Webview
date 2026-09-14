# LVGL SVG Renderer — Architecture

Where rendering happens, which code the SVG surface occupies, and how it attaches to the existing
editor without changing it.

Part of the [document set](./README.md).

---

## 1. Entry paths

Both editor entry paths converge on one rendering choke point. Everything before it is JSON, filesystem
and MobX work with no rendering involved.

### 1.1 Create a new LVGL project

1. Design Hub → `setNewDrawingType(type)` — `src/t3-react/features/design-hub/pages/DesignHubPage.tsx:424`
   (deep link `?create=` at `:78-82`)
2. `NewDrawingDialog` → `LvglCreateDialog` for LVGL types — `NewDrawingDialog.tsx:124-126`
3. `handleCreate()` → `/t3000/eez?new=<wizardType>&name=&location=&createDirectory=` — `LvglCreateDialog.tsx:176-199`
4. `wizardType` from the registry (`'LVGL'`, `'LVGL with EEZ Flow'`) — `drawingTypes.ts:73`, `:86`
5. `EezStudioApp` reads `location.search`, fills `wizardModelTemplates` — `src/t3-react/app/EezStudioApp.tsx:207-219`, `:300-310`
6. Auto-create is implicit (`name && location` present) → `createProjectFromTemplate()`; otherwise
   `showNewProjectWizard()` — `EezStudioApp.tsx:375-383`. There is no `autoCreate` query parameter.
7. `WizardModel.createProject()`: validate → `mkdir` → template download → `lvglVersion = "9.5.0"` →
   `writeFile` → `openProject` — `Wizard.tsx:1240`, `:1553`, `:1567`, `:1655-1660`, `:1690`, `:1746`
8. Filesystem via the browser shim → `/api/eez-studio/{make-folder,write-text-file,read-text-file}` —
   `stubs/fs/index.ts:257-306`, `api/src/eez_studio/mod.rs:1500-1510`
9. Disk: `<cwd>/T3Web/t3-eez/project/<name>/<name>.eez-project` — `mod.rs:121`, `:1312-1320`
10. Open: `openProject` → `addProjectTab` → `loadProject` → `ProjectStore.openFile` → `setProject` —
    `home/tabs-store.tsx:1458,573,465`, `project-editor/store/index.ts:768`
11. First page: `ensureFirstPageVisible` → `openEditor(userPages[0])` — `home/tabs-store.tsx:511-550`

### 1.2 Load from device (JSON)

Two entries, one shared pipeline: `importProjectFromDevice()` — `project-editor/build/device-import.ts:52`

- **A** Design Hub → LVGL → “Load from Device” — `LvglCreateDialog.tsx:203` (`runImport`)
- **B** EEZ home → “Import from Device” — `home/open-projects-v2.tsx:654` (`startImport`)

| Step | Action | Where |
|---|---|---|
| — | name `<panel>_SN<serial>`; `project/<name>/device-import/` | `device-import.ts:59-72` |
| 1 | `client.connect(ip, panelId, serial)` → probe `GET .../api/eez-device/device/info` (10 s) | `device-rest-client.ts:262,296` |
| 2 | `getDeviceInfo()` (normalises `screens`: array **or** `{screen1..N}` map) | `:325`, `:207` |
| 3 | per screen: `loadScreen(name)` → cache `device-import/<name>.json` | `device-import.ts:100-102` |
| 4 | `firmwareToProject(...)` → `.eez-project` | `firmware-loader.ts:155-159`, `:202-628` |
| 4.5 | bitmaps: `pullImage(name)` → `device-import/imgs/<name>.png` → `data:image/png;base64,…` | `device-import.ts:136-155` |
| 4.6 | parameter grids from `/api/t3_device/devices/<serial>/{input,output,variable}-points` | `:172-181` |
| 5 | write `.eez-project` (`write-text-file`) | `:202-207` |
| — | `setDeviceBinding(...)` → `localStorage["eezDeviceBindings"]` | `:216`, `device-binding.ts:40` |

Transport: `USE_MOCK = false` → `/api/device-rest/<ip>/api/eez-device/<path>` → Rust `proxy_device_rest`
(`api/src/eez_studio/mod.rs:426,1515`; device port 80, 120 s budget, no CORS on the device). The BACnet
fallback is commented out. **The editor renders purely from the on-disk project; it never re-fetches the
device.**

### 1.3 The rendering choke point

The page surface is the only surface that becomes SVG.

```
… → ProjectStore.setProject
    → ensureFirstPageVisible
    → Page.renderWidgetComponents()            features/page/page.tsx:904
        isRuntimeSelectedPage → WasmRuntime.renderPage()      (run mode; page.tsx:905-920)
        else isLVGL           → <LVGLPage/>                   (design mode; page.tsx:923-931)
            → LVGLPage.createPageRuntime()                     lvgl/Page.tsx:26-46
            → LVGLPageEditorRuntime | LVGLNonActivePageViewerRuntime   lvgl/page-runtime.ts:736 / :1066
            → tick(): wasm._mainLoop() → getSyncedBuffer() → ImageData → ctx.putImageData()   :2009-2040
```

Run mode is a separate path: `flow/runtime/wasm-runtime.tsx:302` creates `LVGLPageViewerRuntime` and
`renderPage()` paints it. The SVG surface does not participate in that path (see
[invariants](./invariants.md)).

**A second canvas surface exists in design mode.** The styles-editor preview
(`LVGLStylesEditorRuntime`, `page-runtime.ts:1777`) builds a synthetic page containing every registered
widget and paints a 400×400 preview into its own canvas (`:2030` `getContext("2d")` → `:2033`
`putImageData`). It is reached through `setSelectedStyle(style, canvas)` (`:2076-2080`) rather than a
constructor argument, and never through `features/page/page.tsx`, so it is outside the SVG surface. See
[runtime-integration §1](./runtime-integration.md).

---

## 2. Module inventory

```
studio-wasm-libs/lvgl-runtime/common/src/svg_scene_dump.cpp
    lvglDumpScene(root, out, outLen)
    lvglCountObjects(root)
    (file-local helpers: SvgWriter, svgEmitPart, svgEmitObject, …)
studio-wasm-libs/build-lvgl-95.bat                     9.5-only build

src/lib/t3-eez-studio/project-editor/lvgl/svg/         new folder
    scene.ts, svg-renderer.ts, svg-sink.ts, scene-dump.ts,
    svg-context.ts, page-runtime-svg.ts, paint-policy.ts,
    hit-test.ts, overlay.ts, feature-flag.ts,
    runtime-artifacts.ts, runtime-cache-guard.ts,
    svg-diff.ts, svg-diff-harness.ts, LVGLSvgPage.tsx, index.ts

scripts/lvgl-svg-dump-smoke.mjs                        real-WASM smoke test + fixture capture
test/vitest/lvgl-svg/fixture-loader.ts                 fixture helpers
test/vitest/fixtures/lvgl-svg/*.json                   scene fixtures + captured-9.5.0.json
test/vitest/__tests__/lvgl-svg-*.test.ts               unit tests
```

The pure modules (`scene`, `svg-renderer`, `paint-policy`, `hit-test`, `overlay`, `svg-diff`) import
nothing from EEZ Studio — no MobX, no WASM, no app aliases — so they run under the stock vitest config,
which has no `project-editor` alias. In-folder imports are therefore relative.

Everything under §2 is additive. Files that are **not** modified: `lvgl/Page.tsx`,
`lvgl/page-runtime.ts` (subclassed, not edited), `firmware-loader.ts`, `device-import.ts`,
`device-rest-client.ts`, `Wizard.tsx`, `home/**`, `api/src/eez_studio/**`.

### 2.1 The one pre-existing edit site

The `isLVGL` branch of `renderWidgetComponents()` also checks the LVGL version and renders `<LVGLSvgPage>`
instead of `<LVGLPage>`; with the flag off the code path is identical. This is the only edit to pre-existing
source in the whole surface, and the reason it cannot be avoided is given in
[invariants §2.3](./invariants.md#23-the-single-pre-existing-edit-site).

### 2.2 Why subclassing is sufficient

- `lvgl/widget-common.tsx:70` and `widgets/Keyboard.tsx:234` test `instanceof` against the runtime
  classes, and the base class itself branches on subclass identity — `page-runtime.ts:554`
  (`this instanceof LVGLPageViewerRuntime`) and `:587` (`this instanceof LVGLNonActivePageViewerRuntime`).
  A subclass satisfies all of these.
- The TypeScript side already builds the LVGL object tree (`widgets/Base.tsx:1524 lvglCreate`,
  `:1552 children.map(...)`), so the mapping *widget → `lv_obj_t*`* exists at runtime and the SVG node can
  carry the widget identity for selection without any new mapping infrastructure.
- Only the frame output changes: instead of `getSyncedBuffer()` → `putImageData()`, the subclass paints a
  dumped scene. Inherited code that touches `ctx` receives a proxy context which swallows every canvas
  call and reacts to `putImageData` / `clearRect` ([runtime-integration](./runtime-integration.md)).

---

## 3. Scene contract (summary)

```
Scene       = { sceneVersion, width, height, bgColor?, rootPtr, objects: SceneObject[] }
SceneObject = { ptr, parentPtr?, index, name?, objId?, type, area, radius?,
                clip?, transform?, scroll?, opacity?, hidden?, parts: ScenePart[] }
ScenePart   = { part, state?, area?, bg?, bgImage?, border?, outline?, shadow?,
                text?, line?, arc?, img?, blendMode?, colorFilter?, opacity? }
```

The authoritative field list, the exact source of every field, and the buffer protocol are in
[scene-contract](./scene-contract.md). Every value comes from the **already-exported** bridge getters
(`lvglObjGetStylePropColor/Num`, `lvglObjGetStylePropBuiltInFont`, `lvglObjGetStylePropFontAddr`) plus
the LVGL 9.5 object/child/area/label/image accessors.

---

## 4. Reused assets

| Asset | Use |
|---|---|
| `studio_api.cpp` style getters | scene values (colour, numeric properties, fonts) |
| `getLvglObjectFromIndex` — exported (`flow.cpp:493`) | object identity in the dump |
| object names — `getLvglObjectNameFromIndex` is `static` (`flow.cpp:618`), not exported | reachable through the Flow hooks (`flow.cpp:707`, `:748`) or a small reader; `objId` alone identifies a widget |
| `widgets/Base.tsx lvglCreate` | widget ↔ `lv_obj_t*` mapping for `data-objid` |
| imported bitmaps already `data:image/png;base64,…` | used directly as `<image href>` |
| `lvgl-versions.ts` runtime loading | unchanged; WASM is still booted for layout truth |
| `features/page/page.tsx` thumbnail drawing | unaffected — there is no LVGL-page screenshot path |

Widget-by-widget coverage and the difficulty tiers are measured in [primitives](./primitives.md); the
renderer is a style-property renderer over parts, so `widgets/*.tsx` needs no changes.

---

## 5. Constraints and failure modes

| Constraint | Consequence / handling |
|---|---|
| Layout truth must come from LVGL | the scene is dumped from the running instance; the renderer never computes layout |
| The dump must not allocate per frame | one reused scratch buffer, grown on `-(required)` |
| The dump must not throw into the base frame loop | every failure is caught, the last scene is kept, the cause is reported once |
| The runtime artifacts are served without `Cache-Control`/`ETag` | the surface inspects the artifact bytes before mounting and the artifacts are requested under a per-tab cache key ([runtime-integration](./runtime-integration.md)) |
| Text metrics are unavailable without a layout round-trip | explicit `\n` is honoured; automatic wrap/ellipsis is not attempted |
| Shadow `spread`, blend modes and colour filters have no exact SVG equivalent | approximated, and recorded in the fidelity scorecard |
| Procedural widgets draw through callbacks, not style properties | out of scope for the surface; listed in [primitives](./primitives.md) and excluded from the scorecard |
| A page can contain hundreds of objects | repaint is polled and DOM patching is skipped when the dumped scene is byte-identical ([rendering §8](./rendering.md)) |
