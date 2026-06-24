# WASM Runtime Files

This directory was previously used for Electron/NW.js builds of the LVGL, EEZ, and LZ4 WASM modules. These have been **removed** because the project now targets the **browser** (Vite/Quasar) instead of Electron.

## Why the old files were removed

The old `.js` + `.wasm` files were compiled by Emscripten targeting **Node.js** (Electron's runtime):
- They used `__dirname` for file resolution (Node.js only)
- They relied on `require()` to load WASM modules
- They included `NODEJS_CATCH_EXIT` / `NODEJS_CATCH_REJECTION` linker flags
- They were bundled into the Electron app at build time

In the browser, these files **do not work** — the APIs they depend on don't exist outside Node.js.

## Where the new browser WASM lives

All browser-compatible WASM files are now served as static assets from:

```
public/t3-eez-studio/wasm/lvgl/
├── 8.4.0/
│   ├── lvgl_runtime_v8.4.0.js
│   └── lvgl_runtime_v8.4.0.wasm
├── 9.2.2/
├── 9.3.0/
├── 9.4.0/
└── 9.5.0/
```

## How the browser loads WASM

`src/lib/t3-eez-studio/project-editor/lvgl/lvgl-versions.ts` handles WASM loading:

1. Detects browser environment (`typeof window !== "undefined"`)
2. Constructs URL: `/t3-eez-studio/wasm/lvgl/<filename>`
3. Fetches and instantiates via `WebAssembly.instantiateStreaming()`

## How to rebuild

Source: `https://github.com/eez-open/studio-wasm-libs`

Patches needed for browser builds (see `C:\QN\temcocontrols\studio-wasm-libs`):
1. `lvgl-runtime/common/pre.js` — replace `__dirname` with `import.meta.url`
2. Each `lv_conf.h` — set `LV_USE_FREETYPE 0`
3. Each `CMakeLists.txt` — remove `/home/mvladic/freetype-2.14.1` paths
4. `lvgl-runtime/common/src/studio_api.cpp` — guard FreeType code

Build command:
```cmd
call C:\QN\temcocontrols\emsdk\emsdk_env.bat
cd lvgl-runtime\<version>
mkdir build && cd build
emcmake cmake ..
emmake ninja -j4
```

## Other WASM modules

The `eez_runtime`, `eez_gui_lite_runtime`, and `lz4` WASM modules (also from `studio-wasm-libs`) are not yet migrated to browser. When needed, follow the same pattern: build for browser, place in `public/t3-eez-studio/wasm/<module>/`, load via `fetch()`.
