# Import from Device — Design

Import firmware screens from a T3000 hardware controller, convert to `.eez-project`, and open in EEZ Studio.

---

## 1. UI Layout

Two-column layout on the Open tab:

```
┌──────────────────────────────────┬───────────────────────────────────────┐
│  📂 Recent Projects              │  🔌 Load from Device                  │
│                                  │                                       │
│  [Search...]  [Sort A-Z]         │  ┌────────────────────────────────┐   │
│  ┌────────────────────────────┐  │  │ ○ Device A  192.168.1.10       │   │
│  │ 🏠 Smart Home   .eez-proj  │  │  │ ○ Device B  192.168.1.11       │   │
│  │ 📁 .../project/            │  │  │ ● Device C  192.168.1.12       │   │
│  │ 📊 Dashboard    .eez-dash  │  │  └────────────────────────────────┘   │
│  │ 📁 HVAC Control .eez-proj  │  │                                       │
│  │   🔌 Device C (imported)   │  │  [Import from Device]                │
│  └────────────────────────────┘  │                                       │
│                                  │  ─────────────────────────────────── │
│  [Open Project]                  │  📋 History                           │
│                                  │  Device C · 3 screens · 2 min ago     │
└──────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Step-by-Step Implementation

### Step 1 — List Devices

**File:** `src/lib/t3-eez-studio/home/open-projects.tsx`

Add a 2-column layout. Right column fetches device list from `/api/devices`:

```tsx
// New state for right column
const [devices, setDevices] = useState<DeviceInfo[]>([]);
const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
const [importLog, setImportLog] = useState<string[]>([]);
const [importing, setImporting] = useState(false);

// Fetch devices on mount
useEffect(() => {
    fetch('/api/devices')
        .then(r => r.json())
        .then(setDevices)
        .catch(() => setDevices([]));
}, []);
```

### Step 2 — Select Device & Click Import

Right column shows radio list of devices. User selects one, clicks [Import from Device]:

```tsx
<button
    disabled={!selectedDevice || importing}
    onClick={() => startImport(selectedDevice)}
>
    Import from Device
</button>
```

### Step 3 — Create Project Skeleton

Create the project folder and `device-import/` staging directory before any network I/O. This ensures the project container exists on disk even if the device never responds.

```tsx
// Step 3 — Create project skeleton
const projectDir = `project/${device.panel_name}`;
const stagingDir = `${projectDir}/device-import`;
await fetch(`/api/files/mkdir?path=${encodeURIComponent(stagingDir)}`, { method: "POST" });
```

### Step 4 — Fetch Screens (One-by-One, Save-as-You-Go)

Each screen is fetched individually over BACnet (200-byte chunks, slow). The screen JSON is written to `device-import/<name>.json` immediately — if the connection drops on screen 3 of 5, screens 1-2 are already safe on disk.

The `device-import/` folder is **kept after import** — it's a local cache. Re-import reads from disk, skipping already-fetched screens (no BACnet re-fetch needed).

**TODO:** Needs C++ `READ_FIRMWARE = 19` in `HandleWebViewMsg()` and Rust `POST /api/devices/:id/read-firmware` calling `call_handle_webview_msg(19, &mut buffer)`. See [device-interface-deployment-via-bacnet-design.md](./device-interface-deployment-via-bacnet-design.md).

```tsx
// Step 4 — Fetch screens one-by-one, save each to device-import/ immediately
const stagingScreens: { name: string; json: any }[] = [];
let screenIndex = 0;

while (true) {
    const resp = await fetch(
        `/api/devices/${device.panel_id}/read-firmware`,
        { method: "POST", body: JSON.stringify({ screenIndex }) }
    );
    if (resp.status === 404) break; // no more screens on device
    const result = await resp.json();
    const screen = result.screen;
    if (!screen) break;
    // Save to device-import/ NOW — safe if next fetch fails
    const screenPath = `${stagingDir}/${screen.name}.json`;
    await fetch(`/api/files/write?path=${encodeURIComponent(screenPath)}`,
        { method: "PUT", body: JSON.stringify(screen.json) });
    stagingScreens.push(screen);
    screenIndex++;
}
```

### Step 5 — Build .eez-project from device-import/

Read the raw device JSONs from `device-import/`, convert to `.eez-project` format, save to project root.

```tsx
// Step 5 — Build .eez-project from staging
const { firmwareToProject } = await import("project-editor/build/firmware-loader");
const project = firmwareToProject(stagingScreens, {
    panel_name: device.panel_name,
    serial_number: device.panel_serial_number,
});

const projectPath = `${projectDir}/${device.panel_name}.eez-project`;
await fetch(`/api/files/write?path=${encodeURIComponent(projectPath)}`,
    { method: "PUT", body: JSON.stringify(project, null, 2) });
```

### Step 6 — Open in Editor

```tsx
// Step 6 — Open project in EEZ editor
settingsController.addItemToMRU(projectPath, { projectType: "LVGL", hasFlowSupport: true });
const readResp = await fetch(`/api/files/read?path=${encodeURIComponent(projectPath)}`);
const projectJson = await readResp.json();
await initProjectEditor(tabs, ProjectEditorTab);
```

### Step 7 — Rust Endpoint (TODO: depends on C++ READ_FIRMWARE = 19)

Standard action-route pattern — identical to all existing BACnet bridge endpoints. Copy any existing action route, swap the action number to 19.

```rust
// POST /api/devices/:id/read-firmware
async fn read_firmware(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let device = get_device_by_id(&state, device_id)?;
    let screen_index = body.get("screenIndex").and_then(|v| v.as_u64()).unwrap_or(0);

    let json = json!({
        "action": WebViewMessageType::READ_FIRMWARE as i32,   // = 19
        "panelId": device_id,
        "serialNumber": device.panel_serial_number,
        "objectinstance": device.object_instance,
        "screenIndex": screen_index,
    });

    let mut buffer = vec![0u8; 65536];
    let json_str = json.to_string();
    buffer[..json_str.len()].copy_from_slice(json_str.as_bytes());

    match call_handle_webview_msg(WebViewMessageType::READ_FIRMWARE as i32, &mut buffer) {
        Ok(0) => {
            let result: Value = serde_json::from_slice(&buffer).unwrap_or_default();
            Ok(Json(result))
        }
        Ok(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        Err(_) => Err(StatusCode::SERVICE_UNAVAILABLE),
    }
}
```

Register in `api/src/t3_device/routes.rs`:
```rust
// TODO: .route("/:id/read-firmware", post(read_firmware))
```

### Step 8 — Import History

After import, save a history entry so the user can reopen the drawer:

```typescript
interface ImportHistoryEntry {
    deviceName: string;
    serialNumber: number;
    screenCount: number;
    timestamp: Date;
    log: string[];
}

// Save to localStorage after import
const history = JSON.parse(localStorage.getItem('importHistory') || '[]');
history.unshift({
    deviceName: device.panel_name,
    serialNumber: device.serial_number,
    screenCount: screens.length,
    timestamp: new Date(),
    log: importLog,
});
localStorage.setItem('importHistory', JSON.stringify(history.slice(0, 20)));
```

### Step 9 — Badge on Imported Projects

Show `🔌 Device C (imported)` badge in the left column for projects with `importedFrom` metadata:

```tsx
// In open-projects.tsx renderNode
const hasImportMeta = mruItem.filePath && /* check project JSON for importedFrom */;
{hasImportMeta && (
    <span className="import-badge" title={`From ${meta.device} · ${meta.importedAt}`}>
        🔌 {meta.device} (imported)
    </span>
)}
```

---

## 3. Project Template

| Setting | Value |
|---------|-------|
| Project type | LVGL with flow support |
| LVGL version | `9.5.0` (fixed, matches hardware) |
| File extension | `.eez-project` |
| Project root | `<data_root>/project/<DeviceName>/` |
| Project file | `<data_root>/project/<DeviceName>/<DeviceName>.eez-project` |
| Staging cache | `<data_root>/project/<DeviceName>/device-import/*.json` (kept, never deleted) |
| Metadata | `importedFrom: { device, serialNumber, importedAt }` |

```
project/<DeviceName>/
  ├── <DeviceName>.eez-project     ← built from device-import/
  └── device-import/               ← raw device JSONs (cache, kept)
        ├── Screen1.json
        ├── Screen2.json
        └── Screen3.json
```

---

## 4. Flow Summary

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│  Browser │     │     Rust     │     │   C++    │     │  Device  │
│  (EEZ)   │     │   (api/)     │     │ (T3000)  │     │  (HW)    │
└────┬─────┘     └──────┬───────┘     └────┬─────┘     └────┬─────┘
     │                   │                 │                 │
     │  1. mkdir         │                 │                 │
     │  project/<name>/  │                 │                 │
     │  device-import/   │                 │                 │
     │──────────────────→│                 │                 │
     │                   │                 │                 │
     │  2. POST /devices │                 │                 │
     │  /:id/read-firmware                │                 │
     │  { screenIndex: 0 }                │                 │
     │──────────────────→│                 │                 │
     │                   │  call_handle_   │                 │
     │                   │  webview_msg(19)│                 │
     │                   │────────────────→│                 │
     │                   │                 │  BACnet 200B    │
     │                   │                 │  chunks          │
     │                   │                 │────────────────→│
     │                   │                 │←────────────────│
     │                   │←────────────────│  screen JSON    │
     │←──────────────────│                 │                 │
     │  { screen }       │                 │                 │
     │                   │                 │                 │
     │  3. Save to       │                 │                 │
     │  device-import/   │                 │                 │
     │  Screen1.json     │                 │                 │
     │──────────────────→│                 │                 │
     │                   │                 │                 │
     │  ... repeat for screenIndex 1..N ...                   │
     │  404 → no more    │                 │                 │
     │                   │                 │                 │
     │  4. firmwareToProject()             │                 │
     │  device-import/*.json → .eez-project│                 │
     │                   │                 │                 │
     │  5. Save .eez-project               │                 │
     │  to project/<name>/                 │                 │
     │──────────────────→│                 │                 │
     │                   │                 │                 │
     │  6. Open in EEZ Editor              │                 │
     │                   │                 │                 │
     ▼                   ▼                 ▼                 ▼
```

**Key behaviors:**
- `device-import/` folder is created before any BACnet I/O (safe if device offline)
- Each screen saved to `device-import/` immediately on arrival (survives connection drop)
- `device-import/` is never deleted — re-import rebuilds `.eez-project` from cache
- `READ_FIRMWARE = 19` is the only C++ TODO blocking this feature
