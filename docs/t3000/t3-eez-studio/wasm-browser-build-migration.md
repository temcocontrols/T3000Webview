# LVGL WASM Browser Build Migration

**Date:** 2025-06-25  
**Project:** T3000 Webview — EEZ Studio Migration (Electron → Browser)  
**Branch:** WASM runtime for LVGL project editor

---

## Overview

Migrated the EEZ Studio LVGL flow runtime WASM from Electron/Node.js target to browser (Vite/Quasar). The original `studio-wasm-libs` produces WASM modules targeting Node.js APIs (`__dirname`, `NODEJS_CATCH_EXIT`). These were rebuilt with Emscripten targeting `ENVIRONMENT=web` and deployed as static assets.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Browser (Vite/Quasar)                           │
│                                                 │
│  lvgl-versions.ts                               │
│    │ detect window !== undefined                │
│    │ construct URL: /t3-eez-studio/wasm/lvgl/   │
│    ▼                                            │
│  fetch(wasmUrl)                                 │
│    │                                            │
│    ▼                                            │
│  WebAssembly.instantiateStreaming()             │
│    │                                            │
│    ▼                                            │
│  LVGL Runtime (Module._lvglInit, _lvglTick...)  │
└─────────────────────────────────────────────────┘
         │
         │ HTTP GET
         ▼
┌─────────────────────────────────────────────────┐
│ public/t3-eez-studio/wasm/lvgl/                 │
│   ├── 8.4.0/lvgl_runtime_v8.4.0.{js,wasm}      │
│   ├── 9.2.2/lvgl_runtime_v9.2.2.{js,wasm}      │
│   ├── 9.3.0/lvgl_runtime_v9.3.0.{js,wasm}      │
│   ├── 9.4.0/lvgl_runtime_v9.4.0.{js,wasm}      │
│   └── 9.5.0/lvgl_runtime_v9.5.0.{js,wasm}      │
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

## Deployment

Output deployed to: `public/t3-eez-studio/wasm/lvgl/<version>/`

### Code Changes

**`src/lib/.../lvgl/lvgl-versions.ts`** (line 481):

```diff
- const jsUrl = `/wasm/${fileName}`;
+ const jsUrl = `/t3-eez-studio/wasm/lvgl/${fileName}`;
```

### Cleaned Up

- Removed old Electron WASM from `src/lib/.../flow/runtime/wasm/` (replaced with README.md)
- These were Node.js-targeted builds using `require()` — incompatible with browser

---

## Runtime Loading Flow

1. User opens an LVGL project page in the EEZ Studio editor
2. `page-runtime.ts` creates a runtime instance
3. `lvgl-versions.ts:getLvglWasmFlowRuntimeConstructor()` is called
4. Detects `typeof window !== "undefined"` (browser environment)
5. Extracts version from `wasmFlowRuntime` property (e.g., `"project-editor/flow/runtime/wasm/lvgl_runtime_v9.5.0.js"`)
6. Constructs URL: `/t3-eez-studio/wasm/lvgl/<version>/lvgl_runtime_v<version>.wasm`
7. Calls `WebAssembly.instantiateStreaming(fetch(wasmUrl), {})`
8. WASM module exports LVGL functions (`_lvglInit`, `_lvglTick`, etc.)
9. Fallback: Proxy-based no-op if WASM fails to load (prevents crashes)

---

## Vite Configuration

**`quasar.config.js`** — WASM MIME type:

```js
viteConf.server.headers = { "*.wasm": { "Content-Type": "application/wasm" } };
```

Ensures Vite dev server serves `.wasm` files with correct MIME type for `WebAssembly.instantiateStreaming()`.

---

## Known Limitations

1. **FreeType disabled** — Custom TTF/OTF fonts not supported. Only built-in LVGL bitmap fonts (Montserrat).
2. **No file system** — Emscripten FS not initialized in browser. Image loading via memory buffers only.
3. **`eez_runtime` / `eez_gui_lite_runtime` / `lz4`** — Not yet migrated to browser. Same pattern applies when needed.

---

## Future Rebuilds

When `studio-wasm-libs` upstream updates:

1. `git pull` + `git submodule update --init --recursive`
2. Re-apply patches 1-5 above
3. Run `build_version.bat <version>` for each version
4. Deploy to `public/t3-eez-studio/wasm/lvgl/`
