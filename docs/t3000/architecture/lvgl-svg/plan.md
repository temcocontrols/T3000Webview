# LVGL SVG Renderer — Implementation Plan (LVGL 9.5 only)

**Status:** proposal, for review before any code.
**Branch:** `feature/lvgl-svg-renderer`
**Scope:** Tstat11 / LVGL screen editor — replace the **design-time rendering surface** (canvas) with **SVG**.
**Non-goal:** removing canvas from the product. The canvas path stays as the pixel-truth preview and as the
run/flow renderer.

## Design set index

The full index lives in **[README.md](./README.md)** in this folder.

> **Hard rule for this work: additive only.**
> Do not delete or refactor existing code. Add new functions / new classes / new files. Where an existing
> file must be involved, the change is a *new function in it* or a *single flagged branch*, and with the
> flag OFF the behaviour is byte-identical to today.

---

## 1. Verified context: where rendering happens

Both editor entry paths (create-new and load-from-device) converge on **one** choke point. Everything
before it is JSON + FS + MobX and does not involve rendering.

### 1.1 Create a new LVGL project

1. Design Hub → `setNewDrawingType(type)` — `src/t3-react/features/design-hub/pages/DesignHubPage.tsx:424` (deep link `?create=` at `:78-82`)
2. `NewDrawingDialog` → `LvglCreateDialog` for LVGL types — `NewDrawingDialog.tsx:124-126`
3. `handleCreate()` → `/t3000/eez?new=<wizardType>&name=&location=&createDirectory=` — `LvglCreateDialog.tsx:176-199`
4. `wizardType` from the registry (`'LVGL'`, `'LVGL with EEZ Flow'`) — `drawingTypes.ts:73`, `:86`
5. `EezStudioApp` reads `location.search`, fills `wizardModelTemplates` — `src/t3-react/app/EezStudioApp.tsx:207-219`, `:300-310`
6. Auto-create is **implicit** (`name && location` present) → `createProjectFromTemplate()`; else `showNewProjectWizard()` — `EezStudioApp.tsx:375-383`
   *There is no `autoCreate` query param (only log strings at `:330-342`).*
7. `WizardModel.createProject()`: validate → `mkdir` → template download → `lvglVersion = "9.5.0"` → `writeFile` → `openProject` — `Wizard.tsx:1240`, `:1553`, `:1567`, `:1655-1660`, `:1690`, `:1746`
8. FS via browser shim → `/api/eez-studio/{make-folder,write-text-file,read-text-file}` — `stubs/fs/index.ts:257-306`, `api/src/eez_studio/mod.rs:1500-1510`
9. Disk: `<cwd>/T3Web/t3-eez/project/<name>/<name>.eez-project` — `mod.rs:121`, `:1312-1320`
10. Open: `openProject` → `addProjectTab` → `loadProject` → `ProjectStore.openFile` → `setProject` — `home/tabs-store.tsx:1458,573,465`, `project-editor/store/index.ts:768`
11. First page: `ensureFirstPageVisible` → `openEditor(userPages[0])` — `home/tabs-store.tsx:511-550`

### 1.2 Load from device (JSON)

Two entries, one shared pipeline: `importProjectFromDevice()` — `project-editor/build/device-import.ts:52`

- **A** Design Hub → LVGL → “Load from Device” — `LvglCreateDialog.tsx:203` (`runImport`)
- **B** EEZ home → “Import from Device” — `home/open-projects-v2.tsx:654` (`startImport`)

Pipeline (identical for both):

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
(`api/src/eez_studio/mod.rs:426,1515`; device port 80, 120 s budget, no CORS on device). BACnet fallback is
commented out (dead). **The editor renders purely from the on-disk project — it never re-fetches the device.**

### 1.3 The choke point (the page surface — the only one that becomes SVG)

```
… → ProjectStore.setProject
    → ensureFirstPageVisible
    → Page.renderWidgetComponents()            features/page/page.tsx:904
        isRuntimeSelectedPage → WasmRuntime.renderPage()      (run mode; page.tsx:905-920)
        else isLVGL           → <LVGLPage/>                   (design mode; page.tsx:923-931, mount at :930)
            → LVGLPage.createPageRuntime()                     lvgl/Page.tsx:26-46
            → LVGLPageEditorRuntime | LVGLNonActivePageViewerRuntime   lvgl/page-runtime.ts:736 / :1066
            → tick(): wasm._mainLoop() → getSyncedBuffer() → ImageData → ctx.putImageData()   :2009-2040
```

Run mode is a separate path: `flow/runtime/wasm-runtime.tsx:302` creates `LVGLPageViewerRuntime` and
`renderPage()` paints it — that path is **out of scope** for the first phase.

**There is a second canvas surface in design mode.** The styles-editor preview
(`LVGLStylesEditorRuntime`, `page-runtime.ts:1777`) builds a synthetic page containing *every* registered
widget and paints a 400×400 preview to a canvas of its own (`:2030` `getContext("2d")` → `:2033`
`putImageData`). It is reached through `setSelectedStyle(style, canvas)` (`:2076-2080`) rather than a
constructor argument, and never through `features/page/page.tsx`. It therefore stays on canvas for P1–P6
(consistent with the "canvas remains for previews" policy in [decisions D1](./decisions.md)); converting it
is a later additive subclass. See [runtime integration §1](./runtime-integration.md#1-the-seam-verified).

---

## 2. Additive architecture

### 2.1 New files only

```
studio-wasm-libs/lvgl-runtime/common/src/studio_api.cpp      ← NEW FUNCTIONS APPENDED (no edits to existing ones)
    lvglDumpScene(root, out, outLen)                         ← new EM_PORT_API
    (new file-local helpers, e.g. svgSceneEmit*, svgSceneEscape*)

src/lib/t3-eez-studio/project-editor/lvgl/svg/               ← NEW FOLDER
    feature-flag.ts            isSvgRendererEnabled()        (default OFF; localStorage override)
    scene.ts                   Scene types (dumped contract)
    scene-dump.ts              wasm.lvglDumpScene() → parsed Scene (guarded, frees the buffer)
    svg-sink.ts                owns <svg> root, <defs> (clipPaths/filters/gradients), DOM patching
    svg-renderer.ts            Scene → SVG elements (primitive renderer — not per-widget)
    page-runtime-svg.ts        LVGLSvgPageEditorRuntime       extends LVGLPageEditorRuntime
                               LVGLSvgNonActivePageViewerRuntime extends LVGLNonActivePageViewerRuntime
    svg-context.ts             createSvgContext(dims, onFrame)  (proxy 2D context — the only ctx hook)
    LVGLSvgPage.tsx            React host: <svg>, same props as LVGLPage
    svg-diff.ts                dev-only canvas-vs-SVG comparator (enabled by ?svgDiff=1)

docs/t3000/architecture/lvgl-svg/plan.md                ← this file
    (README.md = index; primitives.md, scene-contract.md, wasm-bridge.md, rendering.md,
     runtime-integration.md, editor-integration.md, fidelity-harness.md, decisions.md)
```

**No changes to:** `lvgl/Page.tsx`, `lvgl/page-runtime.ts` (bases are *subclassed*, not edited),
`firmware-loader.ts`, `device-import.ts`, `device-rest-client.ts`, `Wizard.tsx`, `home/**`,
`api/src/eez_studio/**`, docs nav.

### 2.2 The one existing-code touch point

| Site | Change | Why unavoidable | With flag OFF |
|---|---|---|---|
| `features/page/page.tsx:930` | `<LVGLPage/>` → `isSvgRendererEnabled() ? <LVGLSvgPage/> : <LVGLPage/>` | `LVGLPage` is imported directly (line 73); there is no registry indirection to override | identical code path |

**Strictly-zero-source-edit alternative** (if preferred): a build-time alias / barrel swap so
`project-editor/lvgl/Page` resolves to the new component. That is a config-only diff but global (no
per-user toggle) and harder to A/B. Recommendation: the flagged branch above.

### 2.3 Why subclassing works

- `lvgl/widget-common.tsx:70` and `widgets/Keyboard.tsx:234` do `instanceof` checks against the runtime
  classes, and the **base class itself branches on subclass identity** — `page-runtime.ts:554`
  (`this instanceof LVGLPageViewerRuntime`) and `:587` (`this instanceof LVGLNonActivePageViewerRuntime`).
  A **subclass passes every one of these**, so all existing behaviour is preserved unchanged.
- The TS side already builds the LVGL object tree itself (`widgets/Base.tsx:1524 lvglCreate`,
  `:1552 children.map(...)`), so the mapping **widget → lv_obj_t*** exists at runtime. The SVG node can
  carry the widget's objID for hit-testing/selection without any new mapping infrastructure.
- Only the *frame output* is overridden (`tick()` → dump scene → patch SVG) instead of
  `getSyncedBuffer()` → `putImageData()`. Inherited code that touches `ctx` gets `createSvgContext(dims, onFrame)`,
  which swallows every canvas call and reacts only to `putImageData` / `clearRect`
  ([runtime integration §4](./runtime-integration.md)).

### 2.4 Scene contract (dumped per object)

```
Scene = { w, h, bg, objects: SceneObject[] }            // flat, parents before children
SceneObject = {
  ptr,            // lv_obj_t*  (used to map back to the widget → data-objid)
  index, name,    // lvgl index / object name where available
  type,           // SubType
  area:   { x, y, w, h },
  radius: number | {tl,tr,br,bl},
  bg:     { color, opacity, grad? },
  border: { color, width, side, opacity, radius },
  shadow: { color, width, spread, offsetX, offsetY, opacity },
  text?:  { str, fontId, size, color, align, letterSpace, lineSpace, longMode, overflow },
  image?: { srcId, w, h, tint, tintOpacity, rotation, zoom, pivotX, pivotY },
  line?:  { points[], width, dash, cap, rounded },
  arc?:   { start, end, width, rounded, indicatorColor, bgColor },
  parts?: { main?: {...}, indicator?: {...}, knob?: {...} },   // slider/switch/checkbox/bar/arc
  clip?:  { x, y, w, h, radius },
  transform?: { angle, zoom, pivotX, pivotY },
  scroll?: { x, y },
  state:  'default'|'pressed'|'checked'|'focused'|…,
  hidden, opacity
}
```

Source of every field: the **already-exported** bridge getters
(`lvglObjGetStylePropColor/Num`, `lvglObjGetStylePropBuiltInFont`, `lvglObjGetStylePropFontAddr`) plus the
LVGL 9.5 object/child/area/label/image accessors. Nothing new is needed for style introspection.

---

## 3. Existing assets this reuses

| Asset | Use |
|---|---|
| `studio_api.cpp` style getters | scene values (colour, numeric props, fonts) |
| `getLvglObjectFromIndex` — **exported** (`flow.cpp:493`) | object identity in the dump (`lv_obj_t*` from index) |
| object **names** — `getLvglObjectNameFromIndex` is `static` (`flow.cpp:618`), *not* exported | reach it via the Flow hooks (`flow.cpp:707`, `:748`) or add a tiny reader in `studio_api.cpp`; `objId` alone is enough for P1 |
| `widgets/Base.tsx lvglCreate` | widget ↔ lv_obj_t* mapping for `data-objid` |
| Imported bitmaps already `data:image/png;base64,…` | straight into `<image href>` — no conversion needed |
| `lvgl-versions.ts` runtime loading | unchanged; we still boot WASM for layout truth |
| `features/page/page.tsx` `eezGuiDraw` thumbnails | unaffected — no LVGL-page screenshot path exists |

---

## 4. Widget × primitive inventory

> **Measured companion doc:** [primitives.md](./primitives.md) — P0 output.
> It contains the per-widget parts table (40 widgets, the 8 LVGL-9 parts + `ANY`), all **115 `LV_STYLE_*`
> constants** categorised into direct-SVG / layout-only / behaviour / approximate, and the T1–T3 difficulty
> tiers (31 T1 style-only, 4 T2 animated/layered, 5 T3 procedural).
> Headline: the renderer is a **style-property renderer over parts**, not a per-widget renderer — and
> `widgets/*.tsx` needs no changes.

**Legend:** ✅ primitives cover it · ⚠️ needs parts/layers care · 🚫 procedural draw (see §7 decision)

| Group | Widgets | Primitives needed | Risk |
|---|---|---|---|
| Text | `Label`, `Span` | `<text>` (+ font mapping, long mode, overflow) | ⚠️ fonts |
| Boxes | `Panel`, `Container`, `Screen`, `Window`, `MessageBox`, `Menu`, `List` | rect+radius, border, shadow, gradient, clip | ✅ |
| Buttons | `Button`, `Imgbutton`, `ButtonMatrix`, `Tab`, `Tabview` | rect+radius, text, image, per-cell rects, checked state | ✅ |
| Indicators | `Bar`, `Slider`, `Arc`, `Switch`, `Checkbox`, `Led`, `Spinner` | rect/path/arc + `parts` (indicator/knob), animate | ⚠️ spinner/animation |
| Inputs | `Dropdown`, `Roller`, `Textarea`, `Spinbox`, `Keyboard`, `Calendar` | rects + text + cursor/selection rects | ⚠️ offset/text metrics |
| Media | `Image`, `AnimationImage`, `Lottie` | `<image>`; frames/animation; Lottie needs JS runtime | 🚫 animation/lottie |
| Data-viz | `Chart`, `Meter`, `Scale`, `Colorwheel`, `QRCode`, `Table`, `TileView` | paths, ticks, labels, gradients; QR/table composition | 🚫 chart/meter/scale/qrcode/colorwheel |
| Composition | `UserWidget`, `Base`, `internal` | group/transform/clip | ✅ |

**P0 deliverable:** confirm this table against each `lvgl/widgets/*.tsx` and move 🚫 items into the §7 decision.

---

## 5. Phases, deliverables, acceptance

| Phase | Deliverable | Acceptance |
|---|---|---|
| **P0** Recon (2–3 d) | Confirmed widget×primitive matrix; 5 fixture pages (text-heavy, buttons, indicators, images, dashboard) | Matrix reviewed; fixtures render identically on canvas today |
| **P1** Scene dump (1 wk) | `lvglDumpScene` appended to `studio_api.cpp`; `scene.ts` + `scene-dump.ts`; 9.5 runtime built | Dump contains every object of a fixture with correct area/order; no heap growth over 1000 dumps |
| **P2** SVG renderer (1–2 wk) | `svg-renderer.ts` + `svg-sink.ts` for the ✅ primitive set | Fixtures visually match canvas screenshots; DOM node count sane |
| **P3** Swap behind flag (2–3 d) | `LVGLSvgPage.tsx`, `page-runtime-svg.ts`, `svg-context.ts`, 1-line conditional at `page.tsx:930` | Flag OFF → unchanged; flag ON → SVG surface, canvas untouched |
| **P4** Selection/interaction (1–1.5 wk) | `data-objid` on nodes; hit-test/select/drag/resize/rotate/zoom via SVG | Parity with canvas editor for select, move, resize, align; overlay stays in SVG |
| **P5** Fidelity gate (1 wk) | `svg-diff.ts` + per-widget scorecard; ⚠️/🚫 list resolved | Every ✅ widget passes a threshold; ⚠️/🚫 documented or excluded |
| **P6** Default-on (2–3 d) | Flag default ON for 9.5 design mode only | Run mode, other versions, pixel-preview toggle all still work |

**Estimated:** 4–6 weeks to a gated 9.5 SVG design surface.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Font fidelity (LVGL built-ins + FreeType vs `<text>`) | Start with the same TTFs via `@font-face`; per-glyph outline `<path>` only where the diff demands it |
| Gradients / shadows / blends | Map to `<linearGradient>` / `<filter>`; where unmappable, keep the canvas pixel island for that object |
| Clip / scroll / transform | `clipPath` + `<g transform>`; verify against canvas per fixture |
| Procedural widgets (§7) | Decide canvas-island vs draw-layer dump before P2 ends |
| Per-frame cost (`_mainLoop` loop) | Design mode: re-dump on model change only; animation/run: throttled re-dump; later, limit to LVGL invalidation areas |
| WASM export visibility | **resolved** — `EM_PORT_API` = `extern "C" … EMSCRIPTEN_KEEPALIVE` (`os.h:71`), so the new functions auto-export; no export-list edit |
| Heap churn from dumping | Single reused scratch buffer, or dump-to-pointer + free; asserted in P1 |
| Regression to canvas editor | Flag default OFF; canvas path never edited; pixel-preview toggle retained permanently |

---

## 7. Open decisions (need answers before P2 ends)

1. **Run mode** — keep canvas for `LVGLPageViewerRuntime` (recommended) or extend SVG there too?
2. **Procedural widgets** (`Chart`, `Meter`, `Scale`, `QRCode`, `Colorwheel`, `Lottie`, `AnimationImage`) —
   (a) canvas island per widget, or (b) hook LVGL 9's draw dispatch to emit primitives (deeper C work)?
3. **Text fidelity target** — same-TTF `<text>` (fast, close) vs glyph outlines (exact, heavier)?
4. **Touch point** — the flagged 1-line conditional at `page.tsx:930`, or the config-only alias swap?

---

## 8. Guardrails (carry-over from this repo)

- Never edit or copy into `api/target/` — build artifacts only.
- WASM changes: edit `studio-wasm-libs/lvgl-runtime/**` → `build-all.bat` → Rust `api/build.rs` copies.
- Never run `npm install` inside `src/lib/t3-eez-studio/**` (creates a vendored Vite that breaks resolution).
- The Vite 2.9.18 `overrides` pin, alias ordering (`eez-studio-shared/util-electron` before
  `eez-studio-shared`) and the first-boot `eez-polyfill` are load-bearing — do not disturb.
- Only **9.5** is built/enabled for the SVG path; other versions keep the canvas path untouched.

---

## 9. Appendix — facts verified while writing this plan

- `USE_MOCK = false`; BACnet fallback commented out; `loadAllScreens()` and `screensToProject()` unused.
- Timeouts: 10 s probe, 30 s request, 120 s deploy, 120 s proxy budget.
- `autoCreate` does not exist as a query param.
- **Stale code comments to fix later (not in scope):** `device-rest-client.ts` header claims the browser
  talks straight to the device with no proxy (it uses `/api/device-rest/…`), and several of its doc
  comments still say `/api/v1/...` although `REST_BASE = "/api/eez-device"`; `bacnet_api_mock.rs:682`
  claims `lv_img_conv_v9` is used on pull (it is `lvgl_img_extract`, PNG).
