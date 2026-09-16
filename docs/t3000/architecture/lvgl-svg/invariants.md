# LVGL SVG Renderer — Scope & Invariants

Normative rules for the SVG surface: what it covers, how it may touch existing code, and what the rest
of the editor is entitled to assume.

Part of the [document set](./README.md).

---

## 1. Scope boundaries

### 1.1 Run mode renders on the canvas

| Path | Renderer |
|---|---|
| Design mode, active page | `LVGLSvgPageEditorRuntime` (SVG) |
| Design mode, non-active pages of the same project | `LVGLSvgNonActivePageViewerRuntime` (SVG) |
| Run mode (`flow/runtime/wasm-runtime.tsx` → `LVGLPageViewerRuntime`) | canvas, unchanged |
| Styles-editor preview (`LVGLStylesEditorRuntime`) | canvas, unchanged |
| Every LVGL version other than the supported one | canvas, unchanged |

Flow execution drives animations, transitions and state changes per frame; keeping the framebuffer there
preserves behavioural truth and needs no per-frame dump. Extending the surface to run mode would be an
additional subclass and would not change the scene contract.

### 1.2 Procedural widgets are outside the surface

`Chart`, `QRCode`, `Colorwheel`, `Lottie` and `Canvas` draw through LVGL draw callbacks rather than style
properties, so a style dump cannot represent them. They are neither rendered nor measured: the fidelity
harness lists them as `excluded` rather than failing them. The measured tiers are in
[primitives](./primitives.md).

### 1.3 Text uses real text

Text is emitted as `<text>`/`<tspan>` with the same font families the LVGL build uses, sized and
positioned from the dump. Glyph outlines as `<path>` are not produced; if a specific font proves
inaccurate in the scorecard, outline emission would be an additional per-font emitter and would not
change the scene contract.

### 1.4 Surface selection

The surface is chosen by a runtime flag consulted **after** the version gate, so the version check is
authoritative:

| Priority | Control |
|---|---|
| 1 | URL: `?svg=0` / `&svg=0` (opt out), `?svg=1` / `&svg=1` (opt in) |
| 2 | `localStorage["t3.lvgl.svgRenderer"]` = `"0"` / `"1"` |
| 3 | Default: enabled for the supported version |

The flag is deliberately not a project setting: `.eez-project` is exchanged with the device tooling, and
keeping the choice out of the file means one project can be opened with or without the surface.

The version gate is a capability gate, not a version pin: the surface needs `_lvglDumpScene`, and only the
9.5.0 runtime exports it. So **`?svg=1` is never required** — a 9.5.0 project (what the wizard creates) is on
the SVG surface by default, and the choice names itself once per session in the console and on
`globalThis.__lvglSurface` (`surfaceChoice()` / `reportSurfaceChoice()`, [editor-integration §2](./editor-integration.md)).

---

## 2. Additive contract

### 2.1 What is never modified

- `lvgl/page-runtime.ts` — the runtime base classes are subclassed, not edited.
- `lvgl/Page.tsx` — the canvas component is untouched.
- Any widget (`lvgl/widgets/**`), any flow/runtime file, `firmware-loader.ts`, `device-import.ts`,
  `device-rest-client.ts`, `Wizard.tsx`, `home/**`, `api/src/eez_studio/**`.
- No document format change: `.eez-project` is untouched, so projects remain interchangeable with the
  device tooling.
- The canvas path is never removed; it stays as the pixel-preview oracle for the fidelity harness.

### 2.2 What is added

- New folder `project-editor/lvgl/svg/**` (see [architecture §2](./architecture.md)).
- New C translation unit `svg_scene_dump.cpp` and a 9.5-only build script.
- New fixtures, smoke script and unit tests.

### 2.3 The single pre-existing edit site

`features/page/page.tsx`, in the `isLVGL` branch of `renderWidgetComponents()`: one conditional choosing
between `<LVGLSvgPage>` and `<LVGLPage>`. `LVGLPage` is imported directly there and there is no registry
indirection for the page component, so this cannot be avoided without a build-time alias that would make
the choice global and invisible in the source.

---

## 3. Build integrity

| Rule | Reason |
|---|---|
| `api/target/` is never edited or copied into | build output |
| Vite is pinned to `2.9.18` via `overrides`; `vitest` is nested on Vite 5 | the test runner and the app use different Vite majors |
| Alias order: `eez-studio-shared/util-electron` before `eez-studio-shared` (`quasar.config.js:97-106`) | first match wins |
| `src/boot/eez-polyfill.ts` stays the first Quasar boot file | polyfills must load before app code |
| No `npm install` inside `src/lib/t3-eez-studio/**` | vendored subtree |
| The LVGL runtime is built in `studio-wasm-libs` and deployed to `eez-studio-wasm/wasm/lvgl/<version>/` | no runtime artifact is tracked in this repository |
| `-s EXPORTED_FUNCTIONS=@exported-functions.txt` is not edited | `EM_PORT_API` expands to `EMSCRIPTEN_KEEPALIVE`, so new functions are exported on their own |
| A new `.cpp` needs no CMake edit | the v9.5 `CMakeLists.txt` globs `common/src/*.cpp` and the build re-runs configure |

---

## 4. Behaviour guarantees

1. **Opt-out is byte-identical.** With the flag off, `features/page/page.tsx` renders `<LVGLPage>` through
   exactly the same code path as before the surface existed.
2. **Other versions are untouched.** The SVG surface is only reachable for the supported version; other
   versions render on the canvas.
3. **A broken runtime degrades safely.** If the scene dump is missing, the module never boots, or the
   payload is malformed, the surface reports the cause and the canvas path remains functional.
4. **No format or protocol change.** The dump is read-only introspection; nothing in it is written back to
   the project or sent to a device.
5. **Selection is the editor's own.** Hit-testing maps a DOM element back to a project widget and then
   uses the existing `viewState` selection actions, so undo/redo, the property panel and the widgets tree
   all observe the same state. No parallel selection model exists.
6. **The scene is data, not behaviour.** `renderScene` has no side effects, which is what makes it
   testable without a browser and what allows the same scene to be replayed from a frozen fixture.
