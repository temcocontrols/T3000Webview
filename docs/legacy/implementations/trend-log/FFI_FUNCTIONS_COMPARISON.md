# FFI Functions Flow and Data Comparison

## Current Implementation Status (Based on Logs - 2025-10-28 08:55:47)

### GET_PANELS_LIST (Action 4) - ✅ WORKING
**Log Evidence:**
```
[2025-10-28 08:55:47 UTC] [INFO] ✅ GET_PANELS_LIST completed - 289 bytes received
[2025-10-28 08:55:47 UTC] [INFO] 📋 Parsed 2 panels from GET_PANELS_LIST
[2025-10-28 08:55:47 UTC] [INFO] 📋 Found 2 devices to sync sequentially
[2025-10-28 08:55:47 UTC] [INFO]   Device 1/2: Panel #1, SN: 237219, Name: 'T3-XX-ESP'
[2025-10-28 08:55:47 UTC] [INFO]   Device 2/2: Panel #3, SN: 237451, Name: 'T3-TB'
```

### LOGGING_DATA (Action 15) - ❌ RETURNING ZEROS
**Log Evidence:**
```
Device 1: [INFO] 📋 Device 1 - Panel ID: 0, Serial: 0, Name: '', IP: 0.0.0.0
Device 2: [INFO] {"debug":"HandleWebViewMsg returned empty response"}
Result: [WARN] ⚠️ Device has SerialNumber=0 (invalid C++ data)
        [INFO] 📊 Summary: Total=2, Successful=0, Failed=0, Skipped=2
```

---

## Function Comparison Table

| Aspect | GET_PANELS_LIST (Action 4) | LOGGING_DATA (Action 15) |
|--------|---------------------------|-------------------------|
| **Purpose** | Get lightweight device list (metadata only) | Get full device data (points + values) |
| **C++ File** | `BacnetWebView.cpp` line 1873 | `BacnetWebView.cpp` line 2407 |
| **Rust File** | `t3_ffi_sync_service.rs` line 1467 | `t3_ffi_sync_service.rs` line 1296 |
| **Input Required** | None (no JSON needed) | **panelId** and **serialNumber** in JSON |
| **Buffer Size** | 10KB (lightweight) | 100MB (full data) |
| **Timeout** | 10 seconds | 30 seconds |
| **Data Source** | `g_bacnet_panel_info[]` array | `g_Device_Basic_Setting[npanel_id]` |
| **Array Index** | Loop through `g_bacnet_panel_info.size()` | **Uses npanel_id from input JSON** |
| **Current Status** | ✅ Working correctly | ❌ Getting zeros (Rust now fixed, C++ needs update) |

---

## Detailed Function Analysis

### 1. GET_PANELS_LIST (Action 4)

#### **Rust Side (`t3_ffi_sync_service.rs` lines 1467-1571)**

**Function:** `get_panels_list_via_ffi()`

**What Rust Does:**
```rust
1. Calls: call_handle_webview_msg(4, &mut buffer)
2. No JSON input needed (buffer is empty)
3. Receives JSON response from C++
4. Parses response into Vec<PanelInfo>
```

**Rust Expected Response Structure:**
```json
{
  "action": "GET_PANELS_LIST_RES",
  "data": [
    {
      "panel_number": 1,
      "serial_number": 237219,
      "panel_name": "T3-XX-ESP",
      "object_instance": 123,
      "online_time": 1730103347,
      "pid": 5
    },
    {
      "panel_number": 3,
      "serial_number": 237451,
      "panel_name": "T3-TB",
      "object_instance": 456,
      "online_time": 1730103347,
      "pid": 5
    }
  ]
}
```

**Rust Extracts:**
- `panel_number` → Used as array index for subsequent LOGGING_DATA calls
- `serial_number` → Used for identification and validation
- `panel_name` → Used for logging and display

#### **C++ Side (`BacnetWebView.cpp` lines 1873-1913)**

**What C++ Does:**
```cpp
1. Reads: case GET_PANELS_LIST (no input needed)
2. Loops through: g_bacnet_panel_info array
3. For each panel:
   - Validates: LoadOnlinePanelData(panel_number) > 0
   - Reads from: g_bacnet_panel_info[i] OR g_Device_Basic_Setting[panel_number]
4. Returns: JSON with panel metadata
```

**C++ Data Sources:**
```cpp
// Primary source: g_bacnet_panel_info (dynamic online device list)
tempjson["data"][i]["panel_number"] = g_bacnet_panel_info.at(i).panel_number;
tempjson["data"][i]["serial_number"] = g_bacnet_panel_info.at(i).nseiral_number;
tempjson["data"][i]["panel_name"] = g_Device_Basic_Setting[panel_number].reg.panel_name;

// Fallback source: g_Device_Basic_Setting (static configuration)
tempjson["data"][i]["panel_number"] = temp_panel;
tempjson["data"][i]["serial_number"] = g_Device_Basic_Setting[temp_panel].reg.n_serial_number;
```

**Status:** ✅ Working - Returns valid panel numbers and serial numbers

---

### 2. LOGGING_DATA (Action 15)

#### **Rust Side (`t3_ffi_sync_service.rs` lines 1296-1419)**

**Function:** `get_logging_data_via_direct_ffi(config, panel_id, serial_number)`

**What Rust SHOULD Do (After My Fix):**
```rust
1. Creates input JSON:
   {
     "action": "LOGGING_DATA",
     "panelId": 1,           // Panel number from GET_PANELS_LIST
     "serialNumber": 237219   // Serial number from GET_PANELS_LIST
   }
2. Writes JSON to buffer
3. Calls: call_handle_webview_msg(15, &mut buffer)
4. Receives full device data with all points
```

**Rust Expected Response Structure:**
```json
{
  "action": "LOGGING_DATA_RES",
  "data": [
    {
      "panel_id": 1,
      "panel_serial_number": 237219,
      "panel_name": "T3-XX-ESP",
      "panel_ipaddress": "192.168.1.100",
      "input_logging_time": 1730103347,
      "output_logging_time": 1730103347,
      "variable_logging_time": 1730103347,
      "device_data": [
        {"type": "INPUT", "index": 0, "value": 25.5, ...},
        {"type": "INPUT", "index": 1, "value": 30.2, ...},
        ...
      ]
    }
  ]
}
```

#### **C++ Side (`BacnetWebView.cpp` lines 2407-2570)**

**What C++ SHOULD Do:**
```cpp
1. Reads input JSON:
   int temp_panel_id = json.get("panelId").asInt();        // Gets: 1
   int temp_serial_number = json.get("serialNumber").asInt(); // Gets: 237219

2. Uses panel_id as array index:
   int npanel_id = temp_panel_id;  // ✅ CORRECT after your C++ fix

3. Reads device data:
   tempjson["panel_serial_number"] = g_Device_Basic_Setting[npanel_id].reg.n_serial_number;
   tempjson["panel_id"] = npanel_id;
   tempjson["panel_name"] = g_Device_Basic_Setting[npanel_id].reg.panel_name;

4. Reads point data:
   g_Input_data[npanel_id].at(index).value
   g_Output_data[npanel_id].at(index).value
   g_Variable_data[npanel_id].at(index).value
```

**THE BUG (Before Your C++ Fix):**
```cpp
// ❌ WRONG - Line 2436 (OLD CODE):
int npanel_id = temp_serial_number;  // Uses 237219 as array index! OUT OF BOUNDS!

// ✅ CORRECT - After your fix:
int npanel_id = temp_panel_id;  // Uses 1 as array index ✓
```

**Status:**
- ❌ Was broken - Rust wasn't sending JSON, C++ was reading zeros, using zero as index
- ✅ Rust NOW FIXED - Sends JSON with panelId and serialNumber
- ✅ C++ FIXED BY YOU - Uses temp_panel_id instead of temp_serial_number

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEQUENTIAL SYNC FLOW                         │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Get Device List
━━━━━━━━━━━━━━━━━━━━━━
Rust: get_panels_list_via_ffi()
  ↓
  call_handle_webview_msg(4, empty_buffer)  // No input needed
  ↓
C++: case GET_PANELS_LIST
  ↓
  Loop: g_bacnet_panel_info[0..N]
  ↓
  Return: [
    {panel_number: 1, serial_number: 237219, panel_name: "T3-XX-ESP"},
    {panel_number: 3, serial_number: 237451, panel_name: "T3-TB"}
  ]
  ↓
Rust: Parse into Vec<PanelInfo>
  ↓
Result: panels = [PanelInfo{panel_number:1, serial:237219, name:"T3-XX-ESP"},
                  PanelInfo{panel_number:3, serial:237451, name:"T3-TB"}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 2: For Each Device, Get Full Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOR panel in panels:

  Rust: get_logging_data_via_direct_ffi(config, panel.panel_number, panel.serial_number)
    ↓
    Create JSON: {"action":"LOGGING_DATA", "panelId":1, "serialNumber":237219}
    ↓
    Write JSON to buffer
    ↓
    call_handle_webview_msg(15, buffer_with_json)
    ↓
  C++: case LOGGING_DATA
    ↓
    Read: temp_panel_id = json["panelId"] = 1
    Read: temp_serial_number = json["serialNumber"] = 237219
    ↓
    Set: npanel_id = temp_panel_id  // ✅ Use 1 as array index (AFTER YOUR FIX)
    ↓
    Read: g_Device_Basic_Setting[1].reg.n_serial_number → 237219 ✅
    Read: g_Device_Basic_Setting[1].reg.panel_name → "T3-XX-ESP" ✅
    Read: g_Input_data[1][0..63].value → [25.5, 30.2, ...] ✅
    Read: g_Output_data[1][0..63].value → [0, 1, ...] ✅
    Read: g_Variable_data[1][0..127].value → [100, 200, ...] ✅
    ↓
    Return: Full JSON with 256 points
    ↓
  Rust: Parse DeviceWithPoints
    ↓
    Insert into database:
      - DEVICES table (panel info)
      - INPUTS/OUTPUTS/VARIABLES tables (point metadata)
      - TRENDLOG_DATA (parent records per point)
      - TRENDLOG_DATA_DETAIL (historical values)
    ↓
  Wait 30 seconds
    ↓
  Continue to next device...

END FOR
```

---

## What Was Wrong vs What Is Right

### ❌ BEFORE (Broken State)

| Component | Problem | Effect |
|-----------|---------|--------|
| **Rust Input** | Not sending JSON to C++ | C++ reads `json.get("panelId")` → null → 0 |
| **C++ Reading** | `temp_panel_id = 0, temp_serial_number = 0` | Uses zero values |
| **C++ Array Index** | `npanel_id = temp_serial_number = 0` | Reads `g_Device_Basic_Setting[0]` |
| **C++ Output** | `panel_serial_number = g_Device_Basic_Setting[0].reg.n_serial_number = 0` | Returns zeros |
| **Rust Validation** | Checks `serial_number == 0` | Correctly REJECTS invalid data |
| **Database** | No data inserted | TRENDLOG_DATA and TRENDLOG_DATA_DETAIL remain empty |

### ✅ AFTER (Fixed State)

| Component | Fix | Effect |
|-----------|-----|--------|
| **Rust Input** | ✅ NOW sends JSON: `{"panelId":1, "serialNumber":237219}` | C++ receives valid values |
| **C++ Reading** | ✅ `temp_panel_id = 1, temp_serial_number = 237219` | Uses correct values |
| **C++ Array Index** | ✅ YOU FIXED: `npanel_id = temp_panel_id = 1` | Reads `g_Device_Basic_Setting[1]` ✓ |
| **C++ Output** | ✅ `panel_serial_number = g_Device_Basic_Setting[1].reg.n_serial_number = 237219` | Returns valid serial |
| **Rust Validation** | ✅ Checks `serial_number == 237219` | PASSES validation ✓ |
| **Database** | ✅ Data will be inserted | TRENDLOG_DATA and TRENDLOG_DATA_DETAIL get populated |

---

## Summary of Changes

### Rust Changes (My Fix)
1. ✅ Modified `get_logging_data_via_direct_ffi()` signature to accept `panel_id` and `serial_number`
2. ✅ Create input JSON before FFI call: `{"action":"LOGGING_DATA", "panelId":1, "serialNumber":237219}`
3. ✅ Write JSON to buffer before calling C++
4. ✅ Updated all call sites to pass parameters from GET_PANELS_LIST result

### C++ Changes (Your Fix)
1. ✅ Changed `int npanel_id = temp_serial_number;` → `int npanel_id = temp_panel_id;`
2. ✅ Now uses panel_number (1, 2, 3...) as array index instead of serial_number (237219, 237451...)

### Why Both Fixes Are Needed
- **Rust fix:** Ensures C++ receives the correct input parameters
- **C++ fix:** Ensures C++ uses the correct value as array index
- **Together:** Complete the data flow from GET_PANELS_LIST → LOGGING_DATA → Database

---

## Testing Checklist

After both fixes deployed:

- [ ] Restart T3000.exe to unlock DLL
- [ ] Copy new `t3_webview_api.dll` to T3000 directory
- [ ] Check logs for: `"🔌 About to call HandleWebViewMsg with LOGGING_DATA action - Panel: 1, Serial: 237219"`
- [ ] Verify no more: `"⚠️ Device has SerialNumber=0"`
- [ ] Check database: `SELECT COUNT(*) FROM TRENDLOG_DATA;` should be > 0
- [ ] Check database: `SELECT COUNT(*) FROM TRENDLOG_DATA_DETAIL;` should be > 0
- [ ] Verify: `SELECT DISTINCT SerialNumber, PanelId FROM TRENDLOG_DATA;` shows 237219, 237451
