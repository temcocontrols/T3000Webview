# LVGL WASM Browser Build Migration

**Date:** 2025-06-25 (updated 2026-07-10)  
**Project:** T3000 Webview — EEZ Studio Migration (Electron → Browser)  
**Branch:** WASM runtime for LVGL project editor

---

## Overview

Migrated the EEZ Studio LVGL flow runtime WASM from Electron/Node.js target to browser (Vite/Quasar). The original `studio-wasm-libs` produces WASM modules targeting Node.js APIs (`__dirname`, `NODEJS_CATCH_EXIT`). These were rebuilt with Emscripten targeting `ENVIRONMENT=web` and deployed as static assets served by the Rust backend.

Two WASM runtimes are now served:

| Runtime | Served at | Used by |
|---------|-----------|---------|
| **LVGL per-version** | `/eez-studio-wasm/wasm/lvgl/{version}/` | LVGL project page rendering (lvgl-versions.ts) |
| **Dashboard (eez_runtime)** | `/eez-studio-wasm/wasm/` | Flow runtime for dashboards + GUI lite (wasm-worker.ts) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Browser (Vite/Quasar)                           │
│                                                 │
│  lvgl-versions.ts                               │
│    │ detect window !== undefined                │
│    │ construct URL:                             │
│    │   /eez-studio-wasm/wasm/lvgl/{v}/...       │
│    ▼                                            │
│  <script src=...> → WebAssembly.instantiate()  │
│    │                                            │
│  LVGL Runtime (Module._lvglInit, _lvglTick...)  │
│                                                 │
│  wasm-worker.ts (Web Worker)                    │
│    │ eez_runtime.js, eez_runtime.wasm           │
│    │   /eez-studio-wasm/wasm/                   │
│    ▼                                            │
│  Flow Runtime (dashboard + GUI lite)            │
└─────────────────────────────────────────────────┘
         │
         │ HTTP GET (dev: Vite proxy → Rust; prod: Rust serve)
         ▼
┌─────────────────────────────────────────────────┐
│ Rust Backend (port 9103)                        │
│                                                 │
│  routes_wasm() — ServeDir at:                   │
│    T3Web/t3-eez/resources/eez-studio-wasm/      │
│                                                 │
│  Contents (copied by build.rs):                 │
│   wasm/                                         │
│   ├── eez_runtime.{js,wasm}                     │
│   ├── eez_gui_lite_runtime.{js,wasm}            │
│   ├── lz4.{js,wasm}                             │
│   └── lvgl/                                     │
│       ├── 8.4.0/lvgl_runtime_v8.4.0.{js,wasm}  │
│       ├── 9.2.2/lvgl_runtime_v9.2.2.{js,wasm}  │
│       ├── 9.3.0/lvgl_runtime_v9.3.0.{js,wasm}  │
│       ├── 9.4.0/lvgl_runtime_v9.4.0.{js,wasm}  │
│       └── 9.5.0/lvgl_runtime_v9.5.0.{js,wasm}  │
└─────────────────────────────────────────────────┘
```

---

## Source Repository

**`https://github.com/eez-open/studio-wasm-libs`**

Local clone: `C:\QN\temcocontrols\studio-wasm-libs`

### Submodules

| Submodule | Path | Version |
|-----------|------|---------|
| `eez-framework` | `eez-framework/` | master |
| `lvgl` | `lvgl-runtime/v8.4.0/lvgl` | v8.4.0 |
| `lvgl` | `lvgl-runtime/v9.2.2/lvgl` | v9.2.2 |
| `lvgl` | `lvgl-runtime/v9.3.0/lvgl` | v9.3.0 |
| `lvgl` | `lvgl-runtime/v9.4.0/lvgl` | v9.4.0 |
| `lvgl` | `lvgl-runtime/v9.5.0/lvgl` | v9.5.0 |

---

## Patches Applied

### 1. `lvgl-runtime/common/pre.js` — Browser file resolution

```diff
- return __dirname + "/" + path;
+ return new URL(path, import.meta.url).href;
```

`__dirname` is a Node.js global. Browsers use `import.meta.url`.

### 2. All 5 `lv_conf.h` files — Disable FreeType

```diff
- #define LV_USE_FREETYPE 1
+ #define LV_USE_FREETYPE 0
```

FreeType requires system font loading (`/home/mvladic/freetype-2.14.1`) not available in browser WASM.

Files: `lvgl-runtime/{v8.4.0,v9.2.2,v9.3.0,v9.4.0,v9.5.0}/lv_conf.h`

### 3. All 5 `CMakeLists.txt` — Remove hardcoded FreeType paths

Removed:
- `-L/home/mvladic/freetype-2.14.1/build -lfreetype` from linker flags
- `include_directories(/home/mvladic/freetype-2.14.1/include)` line

Files: `lvgl-runtime/{v8.4.0,v9.2.2,v9.3.0,v9.4.0,v9.5.0}/CMakeLists.txt`

### 4. `lvgl-runtime/common/src/studio_api.cpp` — Guard FreeType code

Wrapped `lvglCreateFreeTypeFont()` with `#if LV_USE_FREETYPE` / `#endif` preprocessor guards to prevent compilation errors from `lv_ft_info_t` usage in v8.x code path.

### 5. `lvgl-runtime/v9.5.0/exported-functions.txt` — Remove FreeType exports

Removed 17 `_lv_freetype_*` symbols from the Emscripten export list. These functions don't exist when FreeType is disabled, causing `wasm-ld` linker errors.

### 6. `lvgl-runtime/common/src/flow.cpp` — Remove `setNotStopped()`

Removed `eez::flow::setNotStopped()` call. Upstream `eez-framework` removed this function; `g_isStopped` defaults to `true` and is set to `false` by `start()` (called during `_init()`), making the call redundant.

---

## Build Environment

| Tool | Version | Path |
|------|---------|------|
| Emscripten SDK | 6.0.1 | `C:\QN\temcocontrols\emsdk` |
| CMake | 4.3.3 | `C:\Program Files\CMake\bin` |
| Ninja | 1.13.2 | `C:\QN\temcocontrols\ninja` |

### Build Command

```cmd
call C:\QN\temcocontrols\emsdk\emsdk_env.bat
set PATH=C:\Program Files\CMake\bin;C:\QN\temcocontrols\ninja;%PATH%
cd lvgl-runtime\<version>
mkdir build && cd build
emcmake cmake ..
emmake ninja -j4
```

### Build Results

| Version | JS | WASM | Files |
|---------|-----|------|-------|
| v8.4.0 | 608 KB | 1.96 MB | 238 source files |
| v9.2.2 | 763 KB | 1.97 MB | 476 source files |
| v9.3.0 | 815 KB | 2.10 MB | 584 source files |
| v9.4.0 | 856 KB | 2.14 MB | 691 source files |
| v9.5.0 | 889 KB | 2.18 MB | 694 source files |

---

## Build & Deploy Pipeline

```
1. Edit C++ source in studio-wasm-libs/
       │
2. Build all: cd studio-wasm-libs && .\build-all.bat
       │  Output → studio-wasm-libs/release/wasm/
       │    eez_runtime.{js,wasm}
       │    eez_gui_lite_runtime.{js,wasm}
       │    lz4.{js,wasm}
       │    lvgl_runtime_v{8.4.0,9.2.2,9.3.0,9.4.0,9.5.0}.{js,wasm}
       │
3. cargo build (or cargo build --release)
       │  build.rs auto-copies from studio-wasm-libs/release/wasm/
       │  → target/<profile>/T3Web/t3-eez/resources/eez-studio-wasm/wasm/
       │
4. Rust server serves at runtime
       │  /eez-studio-wasm/wasm/... → T3Web/t3-eez/resources/eez-studio-wasm/
```

> **Never manually copy files into `api/target/`.** The pipeline is: edit in `studio-wasm-libs` → `build-all.bat` → `cargo build` (auto-copy) → serve.

---

## Frontend Code Changes

### `lvgl-versions.ts` — LVGL runtime URL

```diff
- const jsUrl = `/t3-eez-studio/wasm/lvgl/${version}/${fileName}`;
+ const jsUrl = `/eez-studio-wasm/wasm/lvgl/${version}/${fileName}`;
```

Also the v8.4.0 hardcoded fallback path:
```diff
- wasmFlowRuntime: "project-editor/flow/runtime/wasm/lvgl_runtime_v8.4.0.js",
+ wasmFlowRuntime: "/eez-studio-wasm/wasm/lvgl/8.4.0/lvgl_runtime_v8.4.0.js",
```

### `wasm-worker.ts` — Dashboard flow runtime (Web Worker)

```typescript
const wasmPath = "/eez-studio-wasm/wasm/eez_runtime.wasm";
(g as any).__dirname = "/eez-studio-wasm/wasm";
s.src = `/eez-studio-wasm/wasm/eez_runtime.js?v=${EEZ_RUNTIME_CACHE_BUSTER}`;
```

---

## Vite Configuration

### Dev proxy (`quasar.config.js`)

In development, Vite (port 3003) proxies WASM requests to the Rust backend (port 9103):

```javascript
viteConf.server.proxy = {
  "/eez-studio-wasm": {
    target: "http://localhost:9103",
    changeOrigin: true,
  },
  "/eez-studio-assets": {
    target: "http://localhost:9103",
    changeOrigin: true,
  },
};
```

### WASM MIME type

```javascript
viteConf.server.headers = { "*.wasm": { "Content-Type": "application/wasm" } };
```

Ensures Vite dev server serves `.wasm` files with correct MIME type for `WebAssembly.instantiateStreaming()`.

---

## Runtime Loading Flow

### LVGL Runtime (lvgl-versions.ts)

1. User opens an LVGL project page in the EEZ Studio editor
2. `page-runtime.ts` creates a runtime instance
3. `lvgl-versions.ts:getLvglWasmFlowRuntimeConstructor()` is called
4. Detects `typeof window !== "undefined"` (browser environment)
5. Extracts version from `wasmFlowRuntime` property (e.g., `"9.5.0"`)
6. Constructs URL: `/eez-studio-wasm/wasm/lvgl/<version>/lvgl_runtime_v<version>.js`
7. Loads Emscripten JS glue via `<script>` tag → sets `globalThis.LVGLWasmRuntime`
8. WASM module exports LVGL functions (`_lvglInit`, `_lvglTick`, etc.)
9. Fallback: Proxy-based no-op if WASM fails to load (prevents crashes)

### Dashboard Flow Runtime (wasm-worker.ts)

1. Web Worker loads `eez_runtime.js` via `importScripts()`
2. `__dirname` set to `/eez-studio-wasm/wasm` for Emscripten's `locateFile`
3. `WebAssembly.instantiateStreaming(fetch(wasmPath))` loads `eez_runtime.wasm`
4. Worker communicates with main thread via `postMessage` (action-based protocol)
5. Flow runtime executes dashboard logic in the worker, sends rendering commands to main thread

---

## Path Rename: `t3-eez-studio` → `eez-studio-wasm`

All WASM-related URLs were renamed to match the Rust-side naming:

| File | Change |
|------|--------|
| `lvgl-versions.ts` (line 199) | Hardcoded v8.4.0 path |
| `lvgl-versions.ts` (line 613) | Dynamic URL construction |
| `wasm-worker.ts` (lines 51, 82, 85) | `wasmPath`, `__dirname`, script `src` |
| `quasar.config.js` (line 231) | Vite proxy entry |
| `api/build.rs` (3 calls) | `copy_selected_files` dest_rel → `"eez-studio-wasm"` |
| `api/src/server.rs` (lines 131, 254) | `ServeDir` path + `.nest("/eez-studio-wasm", ...)` |

---

## Known Limitations

1. **FreeType disabled** — Custom TTF/OTF fonts not supported. Only built-in LVGL bitmap fonts (Montserrat).
2. **No file system** — Emscripten FS not initialized in browser. Image loading via memory buffers only.

---

## Future Rebuilds

When `studio-wasm-libs` upstream updates:

1. `git pull` + `git submodule update --init --recursive`
2. Re-apply patches 1-6 above
3. Run `build-all.bat` (builds all 5 LVGL versions + eez_runtime + eez_gui_lite_runtime + lz4)
4. `cargo build` — `build.rs` auto-copies WASM files to target
5. Restart Rust backend to serve updated files
