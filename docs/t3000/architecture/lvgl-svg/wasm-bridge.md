# LVGL SVG Renderer — WASM Bridge

The C entry points that dump the LVGL object tree, the encoding rules, the JavaScript binding, and how the
build propagates.

Part of the [document set](./README.md). The bridge is a new translation unit; no existing function is
edited.

---

## 1. Where the code goes

| Item | Location | Change type |
|---|---|---|
| New dump functions + helpers | **new file** `studio-wasm-libs/lvgl-runtime/common/src/svg_scene_dump.cpp` | new translation unit; no existing file edited |
| Build | **new** `studio-wasm-libs/build-lvgl-95.bat` (9.5 only) | the v9.5 CMake globs `common/src`, so nothing else changes |
| Artifact propagation | CMake install → `studio-wasm-libs/release/wasm/` → `api/build.rs:99,109` → `wasm/lvgl/9.5.0/` | no source edit |
| JS binding | `project-editor/lvgl/svg/scene-dump.ts` | new file |
| Verification | `scripts/lvgl-svg-dump-smoke.mjs` — runs the real WASM in Node | also freezes `captured-9.5.0.json`, the real dump the tests replay |

`common/` is shared by v8.4.0 … v9.5.0, so every new function is wrapped in
`#if LVGL_VERSION_MAJOR >= 9` and returns a negative code otherwise. Only the **9.5** artifact is built
and used initially; the other versions keep using the canvas path untouched.

## 2. New C API

```c
// Append to studio_api.cpp (new functions only)

// Serialise the object tree rooted at `root` as Scene JSON (see scene-contract doc).
// returns bytes written (>=0), or -(requiredSize + 1) when outLen is too small.
EM_PORT_API(int32_t) lvglDumpScene(lv_obj_t *root, char *out, int32_t outLen);

// Number of objects in a subtree — lets the renderer size its scratch buffer cheaply.
EM_PORT_API(int32_t) lvglCountObjects(lv_obj_t *root);
```

**`lvglGetActiveScreen` was dropped** (it was in the original design). The TS runtime already holds the
LVGL screen pointer on the page (`page._lvglObj` — the same field `getObjects()` uses), so exposing it from
C would have duplicated the `current_screen` state that is private to `studio_api.cpp` for no gain.

New **file-local statics** (all new, no edits to existing ones):

```
svgScnWriter        bounds-checked JSON writer (cursor, remaining, error flag)
svgScnEscape        JSON string escaping (ASCII-safe, UTF-8 pass-through)
svgScnEmitObj       one SceneObject: identity, area, clip, transform, scroll, parts[]
svgScnEmitPart      one ScenePart: style reads for the given part/state
svgScnEmitText      label/span/textarea text + font + decor
svgScnEmitImage     image / bg-image source id
svgScnEmitArc       arc angles
```

Style values come from the **already-exported** getters (`lvglObjGetStylePropColor`,
`...PropNum`, `...PropBuiltInFont`, `...PropFontAddr`) — this is why the bridge is cheap to extend.

**Export mechanism — verified, no list edit needed.** `EM_PORT_API(rettype)` expands to
`extern "C" rettype EMSCRIPTEN_KEEPALIVE` (`eez-framework/src/eez/core/os.h:71`), so the three new
functions are exported automatically. `lvgl-runtime/v9.5.0/exported-functions.txt` (1948 entries,
**zero** `_lvgl*`) is not involved for these symbols.

**A new `.cpp` needs no CMake edit.** This design originally appended to `studio_api.cpp` because a new
translation unit was assumed to require touching the source list. Reading the v9.5 `CMakeLists.txt` showed
`file(GLOB_RECURSE SOURCES ... ../common/src/*.cpp)`, and the build script re-runs configure every time, so a
new file is picked up automatically — strictly *more* additive, and what was actually done
(`svg_scene_dump.cpp`). `EM_PORT_API` exports it with no edit to `exported-functions.txt`: that file lists
1948 symbols including **zero** `_lvgl*`, yet `Module['_lvglDumpScene']` is present in the built glue, which
confirms `EMSCRIPTEN_KEEPALIVE` is what exports these symbols.

## 3. Encoding decisions

| Decision | Choice | Why |
|---|---|---|
| Colour | emit the **raw uint32** from `lvglObjGetStylePropColor` (**wire** format) | zero C-side formatting; smaller payload. `scene-dump.ts` converts it to `#rrggbb` for the Scene, reusing the existing TS colour helpers, so LVGL's byte order is defined in exactly one place — the renderer only ever sees `#rrggbb` |
| Byte order | asserted against a known colour in the smoke test (round-trip) | LVGL stores colour in a 32-bit struct; it must not be assumed |
| Text | UTF-8 JSON string, escaped | labels are the only place with arbitrary bytes |
| Omission | absent field = LVGL default | payload size; renderer treats absence as "do not draw" |
| Numbers | integers where LVGL is integral; floats for `angle`/`zoom` | matches LVGL semantics |
| Order | parents before children, sibling index ascending | renderer nests in one pass, no lookahead |
| Parts | `p` is the **slot** (0..7 → MAIN, SCROLLBAR, INDICATOR, KNOB, SELECTED, ITEMS, CURSOR, TEXTAREA_PLACEHOLDER), emitted only when the part has something to draw | small on the wire and stable even if LVGL renumbers a part; `TICKS` has no slot (v8 only) |
| Text | C emits only the resolved `textColor` / `textOpa` / `fontSize`; the **string** comes from the EEZ widget model | the model is the design-time truth, and it removes any need for class-specific readers in C |
| Images | C emits **geometry only** — `imgW`, `imgH`, `imgAlign` — and **no source**; the model supplies the data URI | LVGL is the only side that knows the decoded bitmap size, the model is the only side that knows which asset was chosen. The asset name (`"wifisym"`) in the model is resolved to the bitmap data URI via `project._assets.maps.name`; both halves must be merged (see scene-contract §4) or images render as nothing. `imgW`/`imgH` are emitted only when *both* are > 0, which is exactly the bitmap case — a `LV_SYMBOL_*` source is a font glyph and reports 0, so no size is invented for it |
| `clip` | the **content box** (`lv_obj_get_content_coords`, `{x,y,w,h}`) of an object with `LV_OBJ_FLAG_SCROLLABLE` | that is the region LVGL clips children to. Emitted only when the flag is set, so a plain object costs no bytes. The widget model may override, and the MAIN radius is carried onto the clip so a rounded container clips rounded |
| Part `area` | `lv_obj_get_scrollbar_area` | emitted only when a part does not fill the object's box. A scrollbar is a thin strip, so without it the part would be painted as a filled box the size of the object |
| `SCROLLBAR` visibility | `lv_obj_get_scrollbar_area` returning non-empty areas | LVGL decides per frame whether a scrollbar is drawn (mode `OFF`/`ON`/`ACTIVE`/`AUTO` plus the content size) while the theme styles the part for every object. Emitting it from styles alone painted the theme's scrollbar — a full-size box with `RADIUS = LV_RADIUS_CIRCLE` — over each object, which reads as a large grey circle. The same query the draw path uses is the only correct test |
| Arc sweep | `lv_arc_get_angle_start` / `lv_arc_get_angle_end` on the `INDICATOR` part of `lv_arc_class` objects, emitted unconditionally | 0 is a meaningful angle for an arc, so these are not written through the "skip zero" helpers. Without them the renderer defaults to a full circle and every gauge is drawn as a ring |
| Arc `KNOB` | **not emitted** | LVGL places the knob with `get_knob_area()` in `lv_arc.c`, which derives the centre from the arc's rotation, internal mode and knob offset through two file-local helpers (`get_angle()`, `get_indicator_max_pad()`). No public API exposes that, while the theme does style the part, so emitting it from styles alone produced a filled circle the size of the arc painted over the arc |
| `index` | sibling z-order within the parent (`lv_obj_get_index`), **not** an app creation index | that is what paint order needs; stable identity comes from `ptr` + `objId` |
| Byte order | **resolved, no guessing**: the existing export already returns `(r<<16)|(g<<8)|b` for LVGL 9, so the wire value *is* `0xRRGGBB` | verified in `studio_api.cpp:88` and asserted by the smoke test (`bgColor=0xf5f5f5`) |

## 4. JS binding

New file `svg/scene-dump.ts` (no edits to `eez-studio-types`):

```ts
type DumpWasm = {
  _lvglDumpScene: (root: number, out: number, len: number) => number;
  _lvglGetActiveScreen: () => number;
  _malloc: (n: number) => number;
  _free: (p: number) => void;
  HEAPU8: Uint8Array;
};

export class SceneDump {
  private scratchPtr = 0; private scratchLen = 0;   // reused across frames
  constructor(private wasm: DumpWasm) {}
  dump(root: number): string | undefined            // JSON text, or undefined on failure
}
```

- Typings are **local** to the new module (cast from the runtime's `wasm`), so no shared type package is
  touched.
- Scratch buffer is allocated **once** and grown on `-(required)`; never per frame.

## 5. Build & propagation

1. Edit only the new `studio-wasm-libs/lvgl-runtime/common/src/svg_scene_dump.cpp`.
2. Build 9.5 only: `studio-wasm-libs\build-lvgl-95.bat` (new; mirrors `build-lvgl-9x.bat`). It needs the
   toolchain the other scripts already assume: `C:\QN\temcocontrols\emsdk`, CMake, ninja.
   **Do not** assign `PATH` with `set PATH=...` in the same `cmd` invocation — that discards the emsdk
   entries `emsdk_env.bat` just added and `emcmake` stops resolving.
3. Verify: `node scripts/lvgl-svg-dump-smoke.mjs` — runs the real WASM in Node (and rewrites the captured
   fixture the tests replay).
4. Propagation is automatic: CMake installs into `studio-wasm-libs/release/wasm/`, and `api/build.rs:99`
   copies `lvgl_runtime_v9.5.0.{js,wasm}` into `wasm/lvgl/9.5.0/` on the next Rust build.
   **Verified:** no LVGL runtime artifact is tracked in this repo (only `lz4.js/wasm` + a README under
   `project-editor/flow/runtime/wasm/`), so rebuilding requires **no tracked-file change here**.
   Still open: `lvgl-versions.ts:556` also references a relative dev/Electron path
   (`project-editor/flow/runtime/wasm/lvgl_runtime_v9.5.0.js`) that does not exist in the tree; the browser
   path resolves to the served folder (`lvgl-versions.ts:635`), which is the case that matters.
5. Serving the rebuilt files is enough **only if the browser does not still hold an old `.wasm`**: the glue JS
   is fetched with `cache: "no-store"`, but the binary is fetched from a plain URL served without
   `Cache-Control`/`ETag`, so it can be reused indefinitely under heuristic freshness. The client detects that
   (module booted, dump missing) and refreshes the cached artifacts itself — see
   [runtime integration §7a](./runtime-integration.md#7a-failure-modes-why-the-surface-can-be-blank-and-what-it-does-about-it).
4. Never edit or copy into `api/target/`.

## 6. Performance budget

| Metric | Target |
|---|---|
| `lvglDumpScene` for 30 objects | ≤ 2 ms |
| JSON size, 30 objects | ≤ 40 KB |
| Per-frame allocation | 0 bytes (reused scratch) |
| Dump frequency (design mode) | on scene change only (see runtime-integration doc) |

## 7. Failure modes

| Failure | Handling |
|---|---|
| `lvglDumpScene` returns negative | renderer keeps last scene, logs once with `[lvgl-svg]`, frame loop continues |
| Function missing (old artifact) | `scene-dump.ts` detects `typeof wasm._lvglDumpScene !== "function"`, disables SVG and falls back to canvas with one warning |
| Malformed JSON | parse in try/catch; on failure keep last scene |
| Buffer thrash | grow ×2; if > 1 MB, log and stop growing (dump skipped) |

## 8. Bridge requirements

- `_lvglDumpScene` and `_lvglCountObjects` are visible on the module object without editing the export list.
- The dump of a page contains every object, with correct `area` and correct parent/child order.
- A colour round-trip against a known colour is asserted, so the byte order is defined by a test rather
  than by assumption.
- Repeated dumps do not grow the heap and stay within the time budget of §6.
- Canvas rendering is unchanged by the added translation unit.
