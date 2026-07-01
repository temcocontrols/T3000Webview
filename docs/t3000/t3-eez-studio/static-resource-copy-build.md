# Static Resource Copy — `eez-framework-amalgamation` & Beyond

**Date:** 2026-07-01  
**Project:** T3000 Webview — EEZ Studio Migration (Electron → Browser)  
**Topic:** Automatic resource copy from origin repos into Rust build output for release packaging

---

## Why

The EEZ Studio LVGL flow runtime needs C source files from `eez-framework-amalgamation` at runtime to compile user LVGL projects. These files are:

```
resources/eez-framework-amalgamation/
├── eez-flow.h
├── eez-flow.cpp
├── eez-flow-lz4.c
├── eez-flow-lz4.h
├── eez-flow-sha256.c
└── eez-flow-sha256.h
```

### Electron (original EEZ Studio)

Files live in the repo at `resources/eez-framework-amalgamation/`. At build time `build.ts` resolves them via `sourceRootDir()` (Node.js `__dirname`). They ship inside the Electron app bundle. **They exist on disk — `fs.readFileSync` works.**

### Browser (this project — T3000 Webview)

There is no Node.js, no `fs.readFileSync`, no `__dirname`. The browser build cannot access local filesystem paths. Instead the flow runs through:

```
Vite build (browser JS)
  → browser-stub fs.promises.readFile()
    → GET /api/eez-studio/read-text-file?path=...
      → Rust server: resolve_path(data_root(), path)
        → T3Web/t3-eez/resources/eez-framework-amalgamation/eez-flow.h
```

`data_root()` (defined in `api/src/t3_eez_studio/mod.rs`) resolves to `{current_dir}/T3Web/t3-eez/` in both dev and production.

**These files must exist on disk where the Rust server can read them — but they are NOT part of this repo.** They live in the original `eez-studio` repo.

---

## What we did

### `api/build.rs` — cargo build-time copy

The Rust build script copies static resource directories from their origin repos into the Cargo output tree. This runs automatically on every `cargo build` and `cargo build --release`.

```
Origin (other repo):
  ../../eez-studio/resources/eez-framework-amalgamation/

  cargo build
     ↓  build.rs copies files
  target/<profile>/T3Web/t3-eez/resources/eez-framework-amalgamation/
```

### Key design decisions

1. **No file duplication** — origin sources stay in their original repos. `build.rs` references them via relative paths (`../../eez-studio/...`).

2. **Extensible** — a single `copy_resource_dir()` helper function. Adding a new static resource directory is one line:

```rust
copy_resource_dir(
    &manifest_dir,
    profile_root,
    "../../path/to/source/repo/resources/whatever",
);
```

3. **Output structure matches `data_root()`** — files land under `T3Web/t3-eez/resources/`, which is exactly where `data_root()` looks at runtime.

---

## How — the release packaging flow

```
┌─ Dev machine ─────────────────────────────────────────┐
│                                                        │
│  1. vite build                                         │
│     → dist/spa/                                        │
│                                                        │
│  2. cargo build --release                              │
│     → target/release/*.dll                             │
│     → target/release/T3Web/t3-eez/resources/           │
│         eez-framework-amalgamation/                    │
│           eez-flow.h                                   │
│           eez-flow.cpp                                 │
│           ...                                          │
│                                                        │
│  3. Manual packaging:                                  │
│     copy target/release/*.dll          → package/      │
│     copy target/release/T3Web/         → package/T3Web/│
│     copy dist/spa/                     → package/www/  │
└────────────────────────────────────────────────────────┘
```

Both the DLL and its runtime resources originate from a single `target/release/` tree — no hunting through multiple repos or folders.

---

## Relevant files

| File | Role |
|------|------|
| `api/build.rs` | Copies static resources into `target/<profile>/T3Web/t3-eez/resources/` |
| `api/src/t3_eez_studio/mod.rs` | `data_root()` → `{cwd}/T3Web/t3-eez/`; `read_text_file` handler serves files |
| `api/src/utils.rs` | `SPA_DIR` default, database URL, etc. |
| `../../eez-studio/resources/eez-framework-amalgamation/` | Origin source (Electron repo, NOT in this workspace) |

---

## Adding more static resources

In `api/build.rs`, add a call inside `main()`:

```rust
copy_resource_dir(
    &manifest_dir,
    profile_root,
    "../../some-other-repo/resources/my-static-files",
);
```

The directory will appear at:
```
target/<profile>/T3Web/t3-eez/resources/my-static-files/
```
