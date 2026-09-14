# LVGL SVG Renderer — Runtime Integration Design

Part of the [design set](./README.md). Status: **design, no code yet**.
Additive-only: **`lvgl/page-runtime.ts` is not modified.** We extend it, and hook the frame through a proxy
context.

---

## 1. The seam (verified)

| Fact | Evidence |
|---|---|
| `LVGLPageRuntime` is an **abstract, exported** base with **public** methods | `page-runtime.ts:82` |
| Editor runtime: `LVGLPageEditorRuntime extends LVGLPageRuntime` | `:736` (`mount()` :776, `unmount()` :1038) |
| Viewer (non-active): `LVGLNonActivePageViewerRuntime extends LVGLPageRuntime` | `:1066` (`mount()` :1084, `unmount()` :1175) |
| Run-mode runtime: `LVGLPageViewerRuntime extends LVGLPageRuntime` | `:1201` (`mount()` :1303) |
| Styles-preview runtime: `LVGLStylesEditorRuntime extends LVGLPageRuntime` | `:1777` — 400×400 (`PREVIEW_WIDTH/HEIGHT`); own `canvas` field `:1784`, `getContext("2d")` inside `tick` `:2030` → `putImageData` `:2033`, mounted from its own constructor `:1869` |
| Frame loop is a **class-field arrow** `tick = () => { … }` that calls `wasm._mainLoop()` → `getSyncedBuffer()` → `ImageData` → `ctx.putImageData()` and re-schedules itself | `:998-1036` (blit :1001-1026, reschedule :1034) |
| `requestAnimationFrame(this.tick)` scheduled in `mount()` / cancelled in `unmount()` | `:877`, `:1044` |
| **Total canvas surface used by the page editor runtime** | `ctx.fillStyle` + `ctx.fillRect` (:982-983), `ctx.putImageData` (:1018), `ctx.clearRect` (:1030) |
| Viewer runtime canvas surface | `ctx.putImageData` (`:1161`) |
| Runtime exposes `ctx`, `wasm`, `isMounted`, `displayWidth`, `displayHeight` | `:743-756`, `:993`, `:760`, `:768` |

Because the canvas surface is **three operations**, a proxy context is a complete and safe hook — and it
needs **no method overrides at all**.

**A second surface uses a different seam (out of scope for P1–P6).** `LVGLStylesEditorRuntime` (`:1777`)
builds a synthetic page containing *every* registered widget and paints a 400×400 preview to a canvas — but
it is **not** reachable from `features/page/page.tsx`. It mounts itself from its own constructor (`:1869`)
and only receives its canvas later, via `setSelectedStyle(style, canvas)` (`:2076-2080`), so the canvas is
`null` throughout `mount()`: a proxy for it would have to be installed at `setSelectedStyle`, not at
construction. It therefore stays on canvas in this design (consistent with the preview policy in
[decisions D1](./decisions.md)) and is called out rather than silently missed.

## 2. Two integration options

| | **A. Proxy 2-D context (chosen)** | **B. `tick` override (later optimisation)** |
|---|---|---|
| Mechanism | pass a stub object where the runtime calls `getContext("2d")`; on `putImageData` → dump scene → patch SVG | subclass the runtime and replace the `tick` field to dump + patch instead of blitting |
| Existing code touched | **none** | none (new subclass only) |
| Base code still runs | yes — `_mainLoop()`, `ImageData` allocation, `ctxPage` bookkeeping | no — duplicated 4 lines of loop logic in the subclass |
| Cost | one wasted `Uint8ClampedArray` + `ImageData` per frame (≈614 KB memcpy at 480×320) | removes that waste |
| Risk | low | medium (must replicate error/scheduling semantics) |

**Plan:** ship A in P3; adopt B only if the frame cost shows up in the budget (`?svgStats=1`).

## 3. New classes (new file `svg/page-runtime-svg.ts`)

```ts
export class LVGLSvgPageEditorRuntime        extends LVGLPageEditorRuntime        {}
export class LVGLSvgNonActivePageViewerRuntime extends LVGLNonActivePageViewerRuntime {}
```

Both are thin: they accept the extra collaborators (sink, dumper, flag) and pass
`createSvgContext(…, onFrame)` as the context argument. Construction mirrors the existing call sites in
`lvgl/Page.tsx:28-38` so the argument lists stay compatible — note the two forms differ:
editor `(page, ctx, flowContext)` (`:35-38`) vs non-active viewer `(page, width, height, ctx)` (`:28-33`).

**Why subclassing is the right tool:** existing code performs `instanceof` checks against these classes —
`widget-common.tsx:70` (`ProjectEditor.LVGLPageEditorRuntimeClass`) and `Keyboard.tsx:234`
(`LVGLPageViewerRuntime`). A **subclass satisfies them**, so all widget behaviour is preserved with zero
edits to widget code.

## 4. The proxy context (`svg/svg-context.ts`)

```ts
createSvgContext(dims: {w:number; h:number}, onFrame: () => void): CanvasRenderingContext2D
```

| Member | Behaviour |
|---|---|
| `putImageData(...)` | **triggers `onFrame()`** (the scene dump + SVG patch). Image data is discarded. |
| `fillStyle` (set) | stored, ignored |
| `fillRect(x,y,w,h)` | page-switch clear → `sink.clearPage()` |
| `clearRect(x,y,w,h)` | error/empty state → `sink.clearPage()` |
| anything else | no-op; in **dev only** log once per member name (catches future base-code additions) |

Implementation: explicit methods for the five members above plus a `Proxy` fallback so that *any* future
canvas call is harmless rather than a crash. Cast at the call site
(`as unknown as CanvasRenderingContext2D`), confined to new code.

`ctxPage` (base writes at `:1027`) and other property sets must succeed → the proxy must be a **plain
object trap with `set` allowed**, not a frozen object.

## 5. Lifecycle

```
LVGLSvgPage.componentDidMount
  └─ new SceneDump(wasmRef)  +  new SvgSink(svgEl, {w,h})
     └─ new LVGLSvgPageEditorRuntime(page, ctx, flowContext)   // ctx = proxy
        └─ runtime.mount()      → boots WASM (unchanged), schedules base rAF
           every frame: base tick → our proxy.putImageData → onFrame()
                                   → (design mode) dump only if dirty → sink.update(scene)
componentWillUnmount → runtime.unmount()   // base cancels rAF; sink teardown is ours
```

- `mount()` still calls `preloadImages()` and the widget create pass (`widgets/Base.tsx lvglCreate`) —
  untouched, which is what guarantees layout truth.
- Base `tick` has a silent `catch { /* canvas detached during unmount */ }` (`:1035`) — therefore **our
  `onFrame()` must never throw**; all failures are caught inside the proxy and logged once.

## 6. Update strategy (dirty tracking)

The base calls `putImageData` every animation frame. Dumping + patching every frame is wasteful in design
mode, so `onFrame()` applies:

| Condition | Action |
|---|---|
| scene **dirty** (model changed since last dump) | dump + patch |
| not dirty, but first frame after `mount()`/page switch | dump + patch (initial paint) |
| not dirty, run/animation active | dump + patch at ≤ 30 Hz throttle |
| not dirty, idle | skip (no DOM work) |

Dirty sources (new code): a MobX reaction on the page/widget model registered by `LVGLSvgPage`, plus an
explicit `markDirty()` for editor actions (drag/resize). A cheap fallback when no reaction fires:
compare `lvglCountObjects(root)` and a frame counter, re-dump at a low rate (e.g. 4 Hz) to catch anything
missed, configurable via `?svgStats=1`.

## 7. What stays on the canvas

| Path | Reason |
|---|---|
| `LVGLPageViewerRuntime` (`:1201`, run mode via `flow/runtime/wasm-runtime.tsx:302`) | decision D1 — Flow execution + animations keep pixel truth initially |
| Other LVGL versions (8.4.0 … 9.4.0) | only 9.5 is built with the dump function |
| `LVGLStylesEditorRuntime` (`:1777`) | style-editor preview swatches — out of scope |
| Pixel-preview toggle | permanent regression oracle |

## 7a. Failure modes: why the surface can be blank, and what it does about it

A design surface that fails to paint looks exactly like an empty page, so every persistent failure is
reported (visible notice in `#overlay` + one `console.warn`). `SvgPaintPipeline` classifies the reason and
the component decides:

| Reason | Meaning | Handling |
|---|---|---|
| `no-root` | `page._lvglObj` is not set yet — WASM is still booting | transient; only complained about after ~2 s |
| `no-module` / `not-booted` | the runtime has not created its WASM module, or its exports are not assigned yet | transient, same |
| `no-dump` | module booted (its other wasm exports exist) but `_lvglDumpScene` is missing | **never** a boot race ⇒ stale artifact, see below |
| `bad-payload` | the dump returned something `parseScene` rejects | persistent; notice + console |

### The stale-artifact trap (verified in the wild)

The Emscripten glue JavaScript is always fetched fresh (`fetch(jsUrl, { cache: "no-store" })` then imported
from a blob URL, `lvgl-versions.ts`), but **the `.wasm` binary is fetched by that glue from a plain URL**
(`lvgl-versions.ts` sets `globalThis.__lvglWasmUrl`) and therefore goes through the ordinary HTTP cache.
That response is served with **no `Cache-Control` and no `ETag`** — only `Last-Modified`:

```
Content-Type: application/wasm
Last-Modified: <deploy time>
```

RFC 9111 §4.2.2 lets a browser treat such a response as fresh for a heuristic fraction of its age (and not
revalidate). For an artifact that is weeks old the window is days-to-weeks, so a browser can keep running an
**old `.wasm` beside a fresh glue** indefinitely. If that binary predates `lvglDumpScene`, the surface mounts
with an empty `#defs`/`#content`/`#overlay` — observed exactly like that in Firefox while the same URL
rendered normally in a browser whose cache had been refreshed.

Mitigation (`runtime-artifacts.ts`, additive):

1. **Pre-flight inspection, before `mount()`.** `inspectLvglRuntimeArtifacts(version)` downloads the
   `.wasm` twice — once with `cache: "reload"` (what the server has now; this also replaces the stored
   entry) and once with the default cache mode (read back *what the runtime's loader will actually get*).
   Both bodies are scanned for the ASCII export name `lvglDumpScene`. Only if both contain it is the
   surface allowed to mount.
2. A booted module without the dump is also diagnosed as `no-dump` by `SceneDump.diagnose()` — conclusive,
   because Emscripten assigns all wasm exports at once, so `_malloc` present + `_lvglDumpScene` absent
   cannot be a timing artefact.
3. `refreshLvglRuntimeArtifacts(version)` re-fetches the artifacts with `cache: "reload"`, latched per
   session so a per-frame failure cannot become a request storm.
4. The user is told to reload — we do **not** reload for them, because the editor can hold unsaved edits.
   After the refresh a plain F5 is enough; if the cache is refusing to update, the notice says to
   hard-reload (Ctrl+Shift+R).
5. A post-mount timeout (2.5 s) re-checks `diagnose()`. This matters because the frame loop is
   **idle-driven**: if it stops after a failed frame, the paint path alone would never report again.
6. A positive verification is latched per session, so later mounts skip the download entirely; bad results
   are never latched, so the next load re-checks.

### Why the check cannot be done after booting

When the glue is current but the binary is not, Emscripten's generated `assignWasmExports` asserts and
aborts:

```
Aborted(Assertion failed: missing Wasm export: lvglDumpScene)
  assignWasmExports -> receiveInstance -> createWasm -> runWasmModule -> LVGLWasmRuntime
```

`mount()` returns `undefined`, so that abort surfaces as an **uncaught promise rejection** inside the
glue's loader: it cannot be caught, and it happens before any runtime diagnostic can run. Inspecting the
bytes up front is the only way to explain it rather than crash. Verified end-to-end in a browser by
serving a modified `.wasm`:

| Condition | Result |
|---|---|
| every response lacks the export | notice “the **served** … has no scene dump. The deployed 9.5 runtime is older than this editor build.” — no abort, no mount |
| network copy good, cached copy old (the reported Firefox case) | notice “the **cached** … has no scene dump. Hard-reload the page (Ctrl+Shift+R)” — no abort, no mount |
| both good | mounts normally (`diagnose: "ok"`) |

### 7b. The cache guard — fixing it for *every* LVGL surface

The pre-flight above only protects the SVG component. The abort is **not** specific to it: the reported
trace went through `lvgl/Page.tsx:41` (the **canvas** `LVGLPage`), because that surface also mounts
(transiently, while `flowContext.projectStore.project.settings.general.lvglVersion` settles) and boots the
same runtime. In a browser whose cache was fresh that transient mount succeeds silently; with a stale
cached binary it aborts.

`runtime-cache-guard.ts` (new, installed at module scope of `LVGLSvgPage.tsx`, which `page.tsx` imports
statically ⇒ it is in place before any surface mounts) rewrites requests for
`/wasm/lvgl/<version>/lvgl_runtime_v<version>.{js,wasm}` to carry a **per-tab stamp**:

```
/wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.wasm  ->  …lvgl_runtime_v9.5.0.wasm?lvglrt=<per-tab stamp>
```

A fresh cache key cannot hold an old entry, so the runtime always receives the bytes the server currently
has — for the canvas path too, **without editing it**. Both `fetch` and `XMLHttpRequest` are wrapped,
because Emscripten's binary loader falls back to XHR, and XHR has no cache-bypass option (the URL is the
only lever). The server ignores the unknown parameter, so the same file is returned.

Verified by intercepting the `.wasm` and serving **old bytes to unstamped requests only**, reproducing the
reported failure exactly:

| Surface | Result |
|---|---|
| SVG (`&svg=1`) | 3 artifact requests, **all stamped**; zero unstamped; no abort; `diagnose: "ok"`, scene painted |
| canvas (`&svg=0`) | artifact request stamped; no abort; canvas 480×320 rendering (3600 non-transparent pixels sampled) |

Cost: within a tab the artifact is fetched once under the stamped key and reused after that; a new tab or
session picks a new stamp, which is what stops a stale entry being inherited. This is a cache-key change,
not a content change — and it is a workaround for a server-side omission, so adding
`Cache-Control: no-cache` (or an `ETag`) to those responses would make the guard unnecessary.

Operational consequence: after rebuilding the LVGL runtime, deploying the files is still required (see
[wasm-bridge §5](./wasm-bridge.md#5-build--propagation)), but no longer requires telling users to hard-reload.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Base code gains a new `ctx` call in future | Proxy fallback absorbs it; dev-mode unknown-member logging surfaces it |
| Frame cost of the (still-allocated) `ImageData` | `?svgStats=1` measures; escalate to option B |
| Errors swallowed by base `catch` | our `onFrame` never throws; own try/catch + `[lvgl-svg]` logging |
| Widget code relying on canvas pixels (e.g. reading back the context) | verified none: `widget-common.tsx:70` only uses `instanceof`; no `getImageData` on the page ctx |
| Page switch / re-mount | mirror `LVGLPage`'s `componentDidUpdate` re-create pattern; sink is re-created with the runtime |
