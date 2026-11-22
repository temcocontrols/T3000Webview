# Import from device — reference

**Applies to:** shipped code — `importProjectFromDevice()`, `device-import.ts`.

The pipeline below is the current implementation; the original design is kept at the end as an
appendix.

Import the screens a T3 controller currently holds, convert them into an `.eez-project`, and
open the result in the editor.

- **Where:** EEZ home page → **Load from Device**, or the Design Hub → **LVGL tile** →
  **Load from Device** tab.
- **Entry points:** `src/lib/t3-eez-studio/home/open-projects-v2.tsx` (EEZ home) and
  `src/t3-react/features/design-hub/components/LvglCreateDialog.tsx` (Design Hub).
- **Shared pipeline:** `src/lib/t3-eez-studio/project-editor/build/device-import.ts` →
  `importProjectFromDevice()`. Both entry points call it and then handle their own UI
  (Recent Projects, editor tab, navigation).

The user-facing walkthrough is in the manual:
[manual/02-creating-projects.md](manual/02-creating-projects.md).

---

## 1. Device list

The device picker reads the T3000 **host** backend, not the device:

```
GET http://<host>:9103/api/t3_device/devices
```

Online devices are grouped by building; offline devices are listed separately. The device
selected in the Design Hub is pre-selected (from `localStorage["t3.lastSelectedDevice"]`).

---

## 2. Pipeline (`importProjectFromDevice`)

| Step | What happens | Real call |
|---|---|---|
| — | Project name | `` `${device.name}_SN${serialNumber}` `` — the serial is appended so two panels with the same name cannot collide |
| 0 | Create the folder skeleton | `POST /api/eez-studio/make-folder`, body `{ path: "project/<name>_SN<serial>/device-import" }` |
| 1 | Connect | `client.connect(ip, panelId, serialNumber)` — probes `GET device/info` through `/api/device-rest/<ip>/api/eez-device/…` |
| 2 | Device summary | `client.getDeviceInfo()` → screen / image counts and display size |
| 3 | Load screens **one at a time**, in the device's order | `client.loadScreen(name)` → `GET screens/:name`; each is written immediately via `POST /api/eez-studio/write-file?path=<stagingDir>/<name>.json` |
| 4 | Build the project | `firmwareToProject(screens, { panel_name, serial_number, ip_address, panel_id }, { displaySize, lvglVersion, darkTheme, colorFormat })` |
| 4.5 | Pull images and embed them | `client.pullImage(name)` → written to `device-import/imgs/<name>.png`, embedded as `data:image/png;base64,…` |
| 4.6 | Generate parameter grids | `GET /api/t3_device/devices/<serial>/input-points`, `…/output-points`, `…/variable-points` → `generateAllParameterGrids()` |
| 5 | Save the project | `POST /api/eez-studio/write-text-file?path=<projectDir>/<file>.eez-project` |
| — | Bind | `setDeviceBinding(projectPath, { ip, panelId, serialNumber, panelName, importedAt, status: "bound" })` |

Result: `{ project, projectPath, screenCount, loadedImageCount }`.

Progress is reported through the `onLog` callback using `=>` / `✔` / `X` / `→` markers;
`resolveImportLog()` turns that flat log into the per-step rows the dialogs display.

---

## 3. Files on disk

```
<data_root>/project/<name>_SN<serial>/
  ├── <name>_SN<serial>.eez-project     ← the imported project
  └── device-import/                    ← raw device JSON, kept as the first-deploy baseline
      ├── <screen>.json
      └── imgs/<bitmap>.png
```

`device-import/` is the baseline the **deploy** pipeline diffs against on a project's first
deploy — see
[device-interface-deployment-via-bacnet-design.md](device-interface-deployment-via-bacnet-design.md).

> **Every import re-fetches every screen** and rewrites the staging folder.

---

## 4. Behaviour worth knowing

- The project is **auto-bound** to the device it came from, so **Deploy to Device** works
  immediately.
- The caller registers the project in EEZ **Recent Projects** (`localStorage["eez-mru"]` plus the
  in-memory `settingsController.mru`); the Design Hub also records the path in
  `localStorage["importedProjectPaths"]` for its badge.
- A device that is offline cannot be imported: step 1 fails with the reachability error, and
  nothing beyond the (empty) project folder from step 0 is written.
- **Step 3 is strict.** `device/info` reports all 13 canonical screen slots whether or not the
  file exists, and `loadScreen()` throws on a 404, so one missing or truncated screen file aborts
  the whole import. This is an implemented limitation, not a design intent — tolerating a 404 per
  screen is item **F4** in
  [phase2-device-renderer-design.md §6.2](phase2-device-renderer-design.md#62-what-must-change-design-only-in-this-phase).

---
