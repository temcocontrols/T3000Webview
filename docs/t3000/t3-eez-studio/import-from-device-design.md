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

### Step 3 — Open Import Drawer

Clicking Import replaces right column content with a step-by-step log drawer:

```tsx
async function startImport(device: DeviceInfo) {
    setImporting(true);
    setImportLog([`📋 Importing from ${device.panel_name}`]);
    
    try {
        // Step 3a: connect
        appendLog("Connecting to device...");
        
        // Step 3b: fetch screens
        appendLog("Fetching screens...");
        const response = await fetch(`/api/devices/${device.panel_id}/import-screens`, { method: 'POST' });
        const { screens } = await response.json();
        appendLog(`Fetched ${screens.length} screens`);
        
        // Step 3c: create project
        appendLog("Creating project...");
        const project = firmwareToProject(screens, device);
        
        // Step 3d: save
        const projectPath = await saveProject(device.panel_name, project);
        appendLog(`Project saved: ${projectPath}`);
        
        // Step 3e: open editor
        appendLog("Opening editor...");
        openProject(projectPath);
        appendLog("✅ Done");
    } catch (err) {
        appendLog(`❌ Failed: ${err.message}`);
    } finally {
        setImporting(false);
    }
}
```

### Step 4 — Rust Endpoint

**File:** `api/src/t3_device/firmware_import_routes.rs` (NEW)

Loop over screens, calling FFI once per screen (action 17 fetches one at a time):

```rust
// POST /api/devices/:id/import-screens
async fn import_screens(
    State(state): State<T3AppState>,
    Path(device_id): Path<i32>,
) -> Result<Json<Value>, StatusCode> {
    // 1. Get device info to find serial number
    let device = get_device_by_id(&state, device_id)?;
    
    // 2. For each screen (0-7 max), call action=17
    let mut screens = Vec::new();
    for screen_index in 0..8 {
        let json = json!({
            "action": WebViewMessageType::GET_WEBVIEW_LIST as i32,
            "panelId": device_id,
            "serialNumber": device.serial_number,
            "entryType": 7,  // GRP = screen
            "entryIndexStart": screen_index,
            "entryIndexEnd": screen_index,
            "objectinstance": device.object_instance,
        });
        
        let mut buffer = vec![0u8; 65536];
        let json_str = json.to_string();
        buffer[..json_str.len()].copy_from_slice(json_str.as_bytes());
        
        match call_handle_webview_msg(
            WebViewMessageType::GET_WEBVIEW_LIST as i32, &mut buffer
        ) {
            Ok(0) => {
                let result: Value = serde_json::from_slice(&buffer).unwrap_or_default();
                if let Some(data) = result["data"]["data"].as_str() {
                    // data is the screen JSON string (unzipped by C++)
                    let screen_json: Value = serde_json::from_str(data).unwrap_or_default();
                    screens.push(json!({
                        "name": format!("Screen {}", screen_index + 1),
                        "json": screen_json,
                    }));
                }
            }
            _ => break, // no more screens
        }
    }
    
    Ok(Json(json!({ "screens": screens })))
}
```

Register in `api/src/t3_device/routes.rs`:
```rust
use crate::t3_device::firmware_import_routes::create_firmware_import_routes;
// in Router builder:
.merge(create_firmware_import_routes())
```

### Step 5 — Convert Firmware JSON → .eez-project

**File:** `src/lib/t3-eez-studio/project-editor/build/firmware-loader.ts` (NEW)

```typescript
// firmware-loader.ts
import type { DeviceScreen } from './firmware-export';

const SUB_TYPE_MAP: Record<string, string> = {
    label: 'LVGLLabelWidget',
    button: 'LVGLButtonWidget',
    arc: 'LVGLArcWidget',
    bar: 'LVGLBarWidget',
    image: 'LVGLImageWidget',
    switch: 'LVGLSwitchWidget',
    slider: 'LVGLSliderWidget',
    dropdown: 'LVGLDropdownWidget',
    panel: 'LVGLPanelWidget',
    user_widget: 'LVGLUserWidgetWidget',
};

interface FirmwareWidget {
    type: string;
    sub_type: string;
    x_pos: number; y_pos: number;
    width: number; height: number;
    obj_text: string; text_type: string;
    style?: Record<string, any>;
    events?: Record<string, any>;
    children?: Record<string, FirmwareWidget>;
    // type-specific
    min?: number; max?: number; value?: string; value_type?: string;
    src?: string;
    long_mode?: string; recolor?: boolean;
    checked?: string; checked_type?: string;
    options?: string[]; selected?: string;
    widget?: string;
    disabled?: string; hidden?: string;
}

export function firmwareToProject(
    screens: { name: string; json: any }[],
    device: { panel_name: string; serial_number: number }
) {
    return {
        settings: {
            general: {
                projectType: 'LVGL',
                lvglVersion: '9.5.0',
                hasFlowSupport: true,
            }
        },
        importedFrom: {
            device: device.panel_name,
            serialNumber: device.serial_number,
            importedAt: new Date().toISOString(),
        },
        userPages: screens.map(s => ({
            name: s.name,
            components: Object.entries(s.json.widgets || {}).map(
                ([id, w]) => firmwareWidgetToComponent(id, w as FirmwareWidget)
            ),
        })),
        fonts: (screens[0]?.json?.fonts || []).map((f: any) => ({
            name: f.name,
            source: { size: f.size },
        })),
        bitmaps: screens.flatMap(s => s.json?.bitmaps || []).map((b: string) => ({
            name: b,
            image: '',
        })),
        lvglStyles: [],
        lvglGroups: [],
        variables: {},
        actions: [],
        userWidgets: [],
    };
}

function firmwareWidgetToComponent(id: string, w: FirmwareWidget) {
    const type = SUB_TYPE_MAP[w.sub_type] || 'LVGLPanelWidget';
    const comp: any = {
        objID: id,
        type,
        left: w.x_pos, top: w.y_pos,
        width: w.width, height: w.height,
    };

    if (type === 'LVGLLabelWidget') {
        comp.text = w.obj_text;
        comp.textType = w.text_type;
        if (w.long_mode) comp.longMode = w.long_mode;
        if (w.recolor) comp.recolor = w.recolor;
    }
    if (type === 'LVGLArcWidget' || type === 'LVGLBarWidget' || type === 'LVGLSliderWidget') {
        comp.min = w.min ?? 0;
        comp.max = w.max ?? 100;
        comp.value = w.value || '';
        comp.valueType = w.value_type || 'literal';
    }
    if (type === 'LVGLImageWidget' && w.src) {
        comp.image = w.src;
    }
    if (w.style) comp.localStyles = { definition: w.style };
    if (w.events) comp.eventHandlers = Object.entries(w.events).map(([name, e]) => ({
        eventName: name,
        handlerType: e.action,
        userData: e.user_data,
    }));

    // Children (panel/dropdown)
    if (w.children) {
        comp.components = Object.entries(w.children).map(
            ([cid, cw]) => firmwareWidgetToComponent(cid, cw)
        );
    }

    return comp;
}
```

### Step 6 — Save Project to Disk

```typescript
async function saveProject(deviceName: string, project: any): Promise<string> {
    const dir = `${deviceName}`;
    const fileName = `${deviceName}.eez-project`;
    await fetch(`/api/files/write?path=project/${dir}/${fileName}`, {
        method: 'PUT',
        body: JSON.stringify(project),
    });
    return `project/${dir}/${fileName}`;
}
```

### Step 7 — Open Project in Editor

```typescript
function openProject(projectPath: string) {
    // Load via existing editor bootstrap
    const fullUrl = `/api/files/read?path=${projectPath}`;
    fetch(fullUrl)
        .then(r => r.json())
        .then(json => {
            initProjectEditor(tabs, ProjectEditorTab);
            const store = ProjectStore.create({ type: 'read-only' });
            const project = loadProject(store, JSON.stringify(json), false);
            store.setProject(project, projectPath);
            tabs.openTab(ProjectEditorTab, { store });
        });
}
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
| Save path | `<data_root>/project/<DeviceName>/<DeviceName>.eez-project` |
| Metadata | `importedFrom: { device, serialNumber, importedAt }` |

---

## 4. Files

| # | File | Action |
|---|------|--------|
| 1 | `src/.../home/open-projects.tsx` | Add 2-column layout, device list, import button, drawer, history |
| 2 | `src/.../build/firmware-loader.ts` | **NEW** — `firmwareToProject()` + widget type mapping |
| 3 | `api/src/t3_device/firmware_import_routes.rs` | **NEW** — `POST /api/devices/:id/import-screens` |
| 4 | `api/src/t3_device/routes.rs` | Register new route |
| 5 | `src/.../build/firmware-export.ts` | Reference — existing reverse (editor → firmware) |
| 6 | `api/src/t3_device/t3_ffi_sync_service.rs` | No changes — reuses `call_handle_webview_msg(action=17)` |
