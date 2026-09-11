# LVGL SVG Renderer — WASM Bridge Design

Part of the [design set](./README.md). Status: **design, no code yet**.
Additive-only: **new functions appended** to the shared bridge file; no existing function is edited.

---

## 1. Where the code goes

| Item | Location | Change type |
|---|---|---|
| New dump functions + helpers | `studio-wasm-libs/lvgl-runtime/common/src/studio_api.cpp` | **append only** |
| Build | `studio-wasm-libs/lvgl-runtime/v9.5.0/**` + `build-all.bat` | no source edit |
| Artifact propagation | `api/build.rs` (existing) → app assets | no source edit |
| JS binding | **new** `project-editor/lvgl/svg/scene-dump.ts` | new file |

`common/` is shared by v8.4.0 … v9.5.0, so every new function is wrapped in
`#if LVGL_VERSION_MAJOR >= 9` and returns a negative code otherwise. Only the **9.5** artifact is built
and used initially; the other versions keep using the canvas path untouched.

## 2. New C API

```c
// Append to studio_api.cpp (new functions only)

// Serialise the object tree rooted at `root` as the Scene JSON (see scene-contract doc).
// returns bytes written (>=0), or -(required) if outLen is too small.
EM_PORT_API(int32_t) lvglDumpScene(lv_obj_t *root, char *out, int32_t outLen);

// Root screen pointer for the currently loaded page (avoids the TS side tracking it).
EM_PORT_API(lv_obj_t *) lvglGetActiveScreen(void);

// Number of objects in a subtree — lets the renderer size its scratch buffer cheaply.
EM_PORT_API(int32_t) lvglCountObjects(lv_obj_t *root);
```

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

**Why append rather than add a new .cpp:** a new translation unit would require editing the existing
`CMakeLists.txt` source list; appending new functions to `studio_api.cpp` is the strictly additive option.

## 3. Encoding decisions

| Decision | Choice | Why |
|---|---|---|
| Colour | emit the **raw uint32** from `lvglObjGetStylePropColor` | zero C-side formatting; TS converts once, reusing existing colour helpers; smaller payload |
| Byte order | **confirmed in P1** with a known-colour fixture (assert round-trip) | LVGL stores colour in a 32-bit struct; do not assume |
| Text | UTF-8 JSON string, escaped | labels are the only place with arbitrary bytes |
| Omission | absent field = LVGL default | payload size; renderer treats absence as "do not draw" |
| Numbers | integers where LVGL is integral; floats for `angle`/`zoom` | matches LVGL semantics |
| Order | parents before children, ascending index | renderer nests in one pass, no lookahead |

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

1. Edit only inside `studio-wasm-libs/lvgl-runtime/common/src/studio_api.cpp`.
2. Build 9.5: `cd studio-wasm-libs && .\build-all.bat` (or the v9.5-only script).
3. Output lands in `studio-wasm-libs/release/wasm/`; Rust `api/build.rs` copies it to the served folder
   `eez-studio-wasm/wasm/lvgl/{version}/` (build.rs:96), which is where the loader fetches it:
   `/eez-studio-wasm/wasm/lvgl/${version}/${fileName}` (`lvgl-versions.ts:635`).
   **Verified:** no LVGL runtime artifact is committed in this repo (only `lz4.js/wasm` + a README are
   tracked under `project-editor/flow/runtime/wasm/`), so rebuilding requires **no tracked-file change here** —
   with one caveat to confirm in P1: `lvgl-versions.ts:556` also references a relative dev/Electron path
   (`project-editor/flow/runtime/wasm/lvgl_runtime_v9.5.0.js`) that does not exist in the tree; confirm the
   browser 9.5 path resolves to the served folder.
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

## 8. P1 acceptance checklist

- [ ] `_lvglDumpScene`, `_lvglGetActiveScreen`, `_lvglCountObjects` are visible on the module object.
- [ ] Dump of a fixture page contains every object, correct `area`, correct parent/child order.
- [ ] Colour round-trip asserted against a known colour.
- [ ] 1000 consecutive dumps show no heap growth and stay within the time budget.
- [ ] Existing canvas rendering is byte-identical before/after the rebuild (no regression from the appended code).
