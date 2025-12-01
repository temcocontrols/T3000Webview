# Action 17 - REFRESH_WEBVIEW_LIST

**Complete Documentation for Message 17 Implementation**

**Status:** ✅ Backend Complete (Inputs, Outputs, Variables) | ⏳ C++ Pending | 🎯 Ready for Testing
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Reference](#quick-reference)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [C++ Integration](#cpp-integration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
Action 17 (REFRESH_WEBVIEW_LIST) reads data **FROM** devices to update the web interface with current values, complementing Action 16 (UPDATE_WEBVIEW_LIST) which writes data **TO** devices.

### Two-API Design Pattern
```
Frontend              Rust Backend           C++ Legacy
   |                       |                      |
   |--1. POST /refresh---->|                      |
   |                       |--HandleWebViewMsg--->|
   |                       |<--raw device data----|
   |<--{items, count}------|                      |
   |                       |                      |
   |--2. POST /save------->|                      |
   |                       |--SQL UPDATE--------->|
   |<--{savedCount}--------|                      |
   |                       |                      |
   |--3. GET /points------>|                      |
   |<--fresh DB data-------|                      |
```

**Why Two APIs?**
- **Separation of concerns:** Device communication vs. database persistence
- **Frontend control:** Inspect/validate data before saving
- **Better error handling:** Distinguish device errors from DB errors
- **Flexibility:** Can refresh without saving, or retry save without re-reading device

### Key Differences: Action 16 vs Action 17

| Aspect | Action 16 (UPDATE) | Action 17 (REFRESH) |
|--------|-------------------|---------------------|
| **Direction** | Frontend → Device | Device → Frontend |
| **Purpose** | Write changes TO device | Read current values FROM device |
| **Trigger** | User edits a field | Page load, manual refresh |
| **Data Flow** | UI → Rust → C++ → BACnet → Device | Device → BACnet → C++ → Rust → UI |
| **Database** | Updated after successful write | Updated after successful read |

---

## Quick Reference

### API Endpoints (6 total)

#### Inputs
```http
POST /api/t3-device/inputs/:serial/refresh
POST /api/t3-device/inputs/:serial/save-refreshed
```

#### Outputs
```http
POST /api/t3-device/outputs/:serial/refresh
POST /api/t3-device/outputs/:serial/save-refreshed
```

#### Variables
```http
POST /api/t3-device/variables/:serial/refresh
POST /api/t3-device/variables/:serial/save-refreshed
```

### Entry Type Constants
```rust
const BAC_IN: i32 = 1;   // Inputs
const BAC_OUT: i32 = 0;  // Outputs
const BAC_VAR: i32 = 2;  // Variables
```

### Quick Start Examples

#### Refresh Single Item
```bash
curl -X POST http://localhost:3000/api/t3-device/inputs/1234567/refresh \
  -H "Content-Type: application/json" \
  -d '{"index": 5}'
```

#### Refresh All Items
```bash
curl -X POST http://localhost:3000/api/t3-device/inputs/1234567/refresh \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Save to Database
```bash
curl -X POST http://localhost:3000/api/t3-device/inputs/1234567/save-refreshed \
  -H "Content-Type: application/json" \
  -d '{"items": [...]}'  # Items from refresh response
```

---

## Architecture

### Request/Response Flow

#### 1. Refresh Endpoint
**Request:**
```json
POST /api/t3-device/inputs/1234567/refresh
{
  "index": 5  // Optional: omit for all items
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refreshed 1 inputs from device",
  "items": [
    {
      "index": 5,
      "full_label": "Zone 1 Temp",
      "label": "Z1_TEMP",
      "value": 72.5,
      "range": 10,
      "units": 62,
      "auto_manual": 0,
      "filter": 3
    }
  ],
  "count": 1,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 2. Save Endpoint
**Request:**
```json
POST /api/t3-device/inputs/1234567/save-refreshed
{
  "items": [...]  // Array from step 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Saved 1 inputs to database",
  "savedCount": 1,
  "timestamp": "2025-01-15T10:30:01Z"
}
```

### Database Schema

All entity types store values as strings:

**Inputs:** `input_points` table
```sql
UPDATE input_points SET
  full_label = ?,
  label = ?,
  f_value = ?,           -- Stored as string
  range_field = ?,       -- Stored as string
  auto_manual = ?,       -- Stored as string
  filter_field = ?       -- Stored as string
WHERE serial_number = ? AND InputIndex = ?
```

**Outputs:** `output_points.OutputIndex`
**Variables:** `variable_points.VariableIndex`

---

## API Endpoints

### Complete Endpoint List

| Entity | Refresh Endpoint | Save Endpoint |
|--------|-----------------|---------------|
| **Inputs** | `POST /api/t3-device/inputs/:serial/refresh` | `POST /api/t3-device/inputs/:serial/save-refreshed` |
| **Outputs** | `POST /api/t3-device/outputs/:serial/refresh` | `POST /api/t3-device/outputs/:serial/save-refreshed` |
| **Variables** | `POST /api/t3-device/variables/:serial/refresh` | `POST /api/t3-device/variables/:serial/save-refreshed` |

### Request Parameters

#### Refresh Request
```typescript
interface RefreshRequest {
  index?: number;  // Optional: specific item index
                   // Omit for batch refresh (all items)
}
```

#### Save Request
```typescript
interface SaveRequest {
  items: Array<{
    index: number;
    full_label: string;
    label: string;
    value: number;
    range: number;
    // ... entity-specific fields
  }>;
}
```

### Response Types

#### Refresh Response
```typescript
interface RefreshResponse {
  success: boolean;
  message: string;
  items: any[];      // Array of refreshed items
  count: number;     // Number of items refreshed
  timestamp: string; // ISO 8601 timestamp
}
```

#### Save Response
```typescript
interface SaveResponse {
  success: boolean;
  message: string;
  savedCount: number;  // Number of items saved
  timestamp: string;   // ISO 8601 timestamp
}
```

---

## Backend Implementation

### File Structure

```
api/src/t3_device/
├── mod.rs                         # Module exports
├── routes.rs                      # Route registration
├── input_refresh_routes.rs        # Inputs (370 lines) ✅
├── output_refresh_routes.rs       # Outputs (370 lines) ✅
└── variable_refresh_routes.rs     # Variables (370 lines) ✅
```

### Rust Route Implementation

Each entity type has identical structure with different constants:

```rust
// Entry type constants
const BAC_IN: i32 = 1;   // For inputs
const BAC_OUT: i32 = 0;  // For outputs
const BAC_VAR: i32 = 2;  // For variables

// Refresh endpoint handler
pub async fn refresh_inputs(
    Path(serial): Path<u32>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<RefreshInputRequest>,
) -> Result<Json<RefreshResponse>, Error> {
    // 1. Call C++ via FFI
    let response = call_refresh_ffi(serial, BAC_IN, request.index)?;

    // 2. Parse C++ response
    let items: Vec<InputItem> = serde_json::from_str(&response)?;

    // 3. Return to frontend
    Ok(Json(RefreshResponse {
        success: true,
        items,
        count: items.len(),
    }))
}

// Save endpoint handler
pub async fn save_refreshed_inputs(
    Path(serial): Path<u32>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<SaveRefreshedInputsRequest>,
) -> Result<Json<SaveResponse>, Error> {
    let saved = save_inputs_to_db(&state.db, serial, &request.items).await?;

    Ok(Json(SaveResponse {
        success: true,
        savedCount: saved,
    }))
}
```

### FFI Call to C++

```rust
fn call_refresh_ffi(
    serial: u32,
    entry_type: i32,  // BAC_IN=1, BAC_OUT=0, BAC_VAR=2
    index: Option<i32>, // None = all items
) -> Result<String, String> {
    let index_val = index.unwrap_or(-1); // -1 means "all"

    let result = unsafe {
        HandleWebViewMsg(
            serial,
            17,  // REFRESH_WEBVIEW_LIST action
            entry_type,
            index_val,
            0,   // panel (unused)
            json_params_ptr,
            json_params_len,
            result_buffer.as_mut_ptr(),
            BUFFER_SIZE,
        )
    };

    // Parse and return result
}
```

### Database Save Logic

```rust
async fn save_inputs_to_db(
    db: &DatabaseConnection,
    serial: u32,
    items: &[InputItem],
) -> Result<usize, Error> {
    let mut saved_count = 0;

    for item in items {
        sqlx::query(
            "UPDATE input_points SET
             full_label = ?, label = ?, f_value = ?,
             range_field = ?, auto_manual = ?, filter_field = ?
             WHERE serial_number = ? AND InputIndex = ?"
        )
        .bind(&item.full_label)
        .bind(&item.label)
        .bind(item.value.to_string())      // Convert to string
        .bind(item.range.to_string())
        .bind(item.auto_manual.to_string())
        .bind(item.filter.to_string())
        .bind(serial as i32)
        .bind(item.index as i32)
        .execute(&db.conn)
        .await?;

        saved_count += 1;
    }

    Ok(saved_count)
}
```

### Route Registration

**mod.rs:**
```rust
pub mod input_refresh_routes;
pub mod output_refresh_routes;
pub mod variable_refresh_routes;
```

**routes.rs:**
```rust
use input_refresh_routes::create_input_refresh_routes;
use output_refresh_routes::create_output_refresh_routes;
use variable_refresh_routes::create_variable_refresh_routes;

pub fn create_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(create_input_refresh_routes())
        .merge(create_output_refresh_routes())
        .merge(create_variable_refresh_routes())
        // ... other routes
        .with_state(state)
}
```

---

## Frontend Implementation

### TypeScript API Services

#### Service Files
```
src/t3-react/services/
├── index.ts                  # Exports
├── inputRefreshApi.ts        # Inputs service ✅
├── outputRefreshApi.ts       # Outputs service ✅
└── variableRefreshApi.ts     # Variables service ✅
```

#### Service Implementation

```typescript
// inputRefreshApi.ts
export class InputRefreshApiService {
  private static baseUrl = '/api/t3-device';

  /**
   * Refresh single input from device
   */
  static async refreshInput(
    serialNumber: number,
    index: number
  ): Promise<RefreshResponse> {
    const response = await fetch(
      `${this.baseUrl}/inputs/${serialNumber}/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      }
    );
    return await response.json();
  }

  /**
   * Refresh all inputs from device
   */
  static async refreshAllInputs(
    serialNumber: number
  ): Promise<RefreshResponse> {
    const response = await fetch(
      `${this.baseUrl}/inputs/${serialNumber}/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty = all items
      }
    );
    return await response.json();
  }

  /**
   * Save refreshed data to database
   */
  static async saveRefreshedInputs(
    serialNumber: number,
    items: any[]
  ): Promise<SaveResponse> {
    const response = await fetch(
      `${this.baseUrl}/inputs/${serialNumber}/save-refreshed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }
    );
    return await response.json();
  }
}
```

### React Component Integration

#### Three Refresh Triggers

Each page (Inputs, Outputs, Variables) implements three refresh mechanisms:

1. **Auto-refresh** - Runs once 500ms after page load
2. **Manual all** - Toolbar "Refresh from Device" button
3. **Per-row** - Individual item refresh icons

#### Component State

```typescript
const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
const [autoRefreshed, setAutoRefreshed] = useState(false);
```

#### Trigger 1: Auto-refresh (useEffect)

```typescript
useEffect(() => {
  if (loading || !selectedDevice || autoRefreshed) return;

  const timer = setTimeout(async () => {
    try {
      console.log('[InputsPage] Auto-refreshing from device...');

      // Step 1: Refresh
      const refreshResponse = await InputRefreshApiService.refreshAllInputs(
        selectedDevice.serialNumber
      );

      // Step 2: Save
      if (refreshResponse.items && refreshResponse.items.length > 0) {
        await InputRefreshApiService.saveRefreshedInputs(
          selectedDevice.serialNumber,
          refreshResponse.items
        );
      }

      // Step 3: Reload
      await fetchInputs();
      setAutoRefreshed(true);
    } catch (error) {
      console.error('[InputsPage] Auto-refresh failed:', error);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [loading, selectedDevice, autoRefreshed, fetchInputs]);
```

#### Trigger 2: Manual Refresh All (Toolbar Button)

```typescript
const handleRefreshFromDevice = async () => {
  if (!selectedDevice) return;

  setRefreshing(true);
  try {
    // Step 1: Refresh
    const refreshResponse = await InputRefreshApiService.refreshAllInputs(
      selectedDevice.serialNumber
    );

    // Step 2: Save
    if (refreshResponse.items && refreshResponse.items.length > 0) {
      await InputRefreshApiService.saveRefreshedInputs(
        selectedDevice.serialNumber,
        refreshResponse.items
      );
    }

    // Step 3: Reload
    await fetchInputs();
  } catch (error) {
    console.error('Failed to refresh:', error);
    setError(error.message);
  } finally {
    setRefreshing(false);
  }
};
```

#### Trigger 3: Single Item Refresh (Per-row Icon)

```typescript
const handleRefreshSingleInput = async (inputIndex: string) => {
  if (!selectedDevice) return;

  const index = parseInt(inputIndex, 10);
  setRefreshingItems(prev => new Set(prev).add(inputIndex));

  try {
    // Step 1: Refresh
    const refreshResponse = await InputRefreshApiService.refreshInput(
      selectedDevice.serialNumber,
      index
    );

    // Step 2: Save
    if (refreshResponse.items && refreshResponse.items.length > 0) {
      await InputRefreshApiService.saveRefreshedInputs(
        selectedDevice.serialNumber,
        refreshResponse.items
      );
    }

    // Step 3: Reload
    await fetchInputs();
  } catch (error) {
    console.error(`Failed to refresh input ${index}:`, error);
  } finally {
    setRefreshingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(inputIndex);
      return newSet;
    });
  }
};
```

#### UI Components

**Toolbar Button:**
```tsx
<button
  className={styles.toolbarButton}
  onClick={handleRefreshFromDevice}
  disabled={refreshing}
  title="Refresh all inputs from device"
>
  <ArrowSyncRegular />
  <span>{refreshing ? 'Refreshing...' : 'Refresh from Device'}</span>
</button>
```

**Per-row Refresh Icon:**
```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    handleRefreshSingleInput(item.inputIndex);
  }}
  className={`${styles.saveButton} ${isRefreshing ? styles.rotating : ''}`}
  disabled={isRefreshing}
  title="Refresh this input from device"
>
  <ArrowSyncRegular style={{ fontSize: '14px' }} />
</button>
```

#### CSS Animation

```css
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.rotating {
  animation: rotate 1s linear infinite;
}
```

---

## C++ Integration

### Current Status
⏳ **Pending** - C++ team needs to implement Action 17 handler

### Required C++ Implementation

#### 1. Add Enum Value
```cpp
// BacnetWebView.cpp or equivalent
enum WEBVIEW_MESSAGE_TYPE {
    // ... existing values
    UPDATE_WEBVIEW_LIST = 16,
    REFRESH_WEBVIEW_LIST = 17,  // ← Add this
};
```

#### 2. Implement Case 17 Handler

```cpp
case 17: // REFRESH_WEBVIEW_LIST
{
    int entry_type = params["entry_type"];  // 0=OUT, 1=IN, 2=VAR
    int index = params["index"];            // -1 for all, specific for single

    std::vector<EntityData> items;

    if (index == -1) {
        // Read all items from device
        items = ReadAllFromDevice(serialNumber, entry_type);
    } else {
        // Read single item
        EntityData item = ReadSingleFromDevice(serialNumber, entry_type, index);
        items.push_back(item);
    }

    // Format response
    json response = {
        {"success", true},
        {"items", items},
        {"count", items.size()}
    };

    return response.dump();
}
```

#### 3. BACnet Communication

The C++ code should:
1. Connect to device via BACnet/IP
2. Read current values for requested points
3. Handle device offline scenarios
4. Format response as JSON

#### 4. Expected Response Format

```json
{
  "success": true,
  "items": [
    {
      "index": 0,
      "full_label": "Zone 1 Temperature",
      "label": "Z1_TEMP",
      "value": 72.5,
      "range": 10,
      "units": 62,
      "auto_manual": 0,
      "filter": 3,
      // ... entity-specific fields
    }
  ],
  "count": 1
}
```

#### 5. Error Responses

```json
{
  "success": false,
  "error": "Device offline",
  "code": "DEVICE_OFFLINE"
}
```

### FFI Interface

The Rust code calls C++ via this signature:

```cpp
extern "C" int HandleWebViewMsg(
    unsigned int serial,      // Device serial number
    int action,               // 17 for REFRESH_WEBVIEW_LIST
    int entry_type,           // 0=OUT, 1=IN, 2=VAR
    int index,                // -1 for all, specific index for single
    int panel,                // Panel ID (usually 0)
    const char* json_params,  // JSON parameters
    size_t json_params_len,   // Length of JSON
    char* result_buffer,      // Buffer for response
    size_t result_buffer_size // Buffer size
);
```

---

## Testing

### Backend Testing

#### 1. Compilation
```bash
cd api
cargo build
# Expected: Success with existing warnings
```

#### 2. Unit Tests (Pending C++ implementation)
```bash
cargo test --test input_refresh_tests
cargo test --test output_refresh_tests
cargo test --test variable_refresh_tests
```

### API Testing

#### Using curl

**Refresh single item:**
```bash
curl -X POST http://localhost:3000/api/t3-device/inputs/1234567/refresh \
  -H "Content-Type: application/json" \
  -d '{"index": 5}'
```

**Refresh all items:**
```bash
curl -X POST http://localhost:3000/api/t3-device/inputs/1234567/refresh \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Save to database:**
```bash
curl -X POST http://localhost:3000/api/t3-device/inputs/1234567/save-refreshed \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "index": 5,
        "full_label": "Test",
        "value": 72.5,
        "range": 10
      }
    ]
  }'
```

#### Using Postman

1. Import collection from `docs/postman/T3000_API.postman_collection.json`
2. Set environment variable: `baseUrl = http://localhost:3000`
3. Run "Action 17 - Refresh" folder

### Frontend Testing

#### Manual UI Testing

1. **Auto-refresh:**
   - Navigate to Inputs/Outputs/Variables page
   - Wait 500ms after load
   - Check browser console for refresh logs
   - Verify data appears

2. **Manual refresh:**
   - Click toolbar "Refresh from Device" button
   - Verify button shows "Refreshing..." state
   - Check data updates after completion

3. **Per-row refresh:**
   - Click refresh icon on individual row
   - Verify icon spins during refresh
   - Check that only that row updates

#### Browser Console Logs

Look for these logs:
```
[InputsPage] Auto-refreshing from device...
[InputsPage] Refresh response: {success: true, items: [...], count: 64}
[InputsPage] Save response: {success: true, savedCount: 64}
```

### Integration Testing

#### End-to-End Flow

1. Start backend: `cd api && cargo run`
2. Start frontend: `npm run dev`
3. Open browser to `http://localhost:5173`
4. Navigate to Inputs page
5. Monitor network tab for API calls:
   - `/inputs/:serial/refresh` should fire
   - `/inputs/:serial/save-refreshed` should follow
   - `/devices/:serial/input-points` should reload data

#### With Mock C++ Response

If C++ isn't ready, modify Rust to return mock data:

```rust
// Temporarily replace FFI call with mock
fn call_refresh_ffi(serial: u32, entry_type: i32, index: Option<i32>)
    -> Result<String, String>
{
    // Mock response for testing
    Ok(r#"{
        "success": true,
        "items": [
            {
                "index": 0,
                "full_label": "Test Input",
                "value": 72.5,
                "range": 10
            }
        ],
        "count": 1
    }"#.to_string())
}
```

---

## Troubleshooting

### Common Issues

#### Issue: "C++ function not found"
**Symptoms:**
- Error: `HandleWebViewMsg symbol not found`
- Backend crashes on refresh

**Solution:**
1. Verify C++ library is compiled and linked
2. Check that Action 17 is implemented in C++
3. Ensure FFI signatures match between Rust and C++

#### Issue: "Device offline"
**Symptoms:**
- Refresh returns empty items array
- Error message: "Unable to reach device"

**Solution:**
1. Verify device is powered on and connected
2. Check network connectivity
3. Verify serial number is correct
4. Test with T3000 desktop app to confirm device responds

#### Issue: "Save failed"
**Symptoms:**
- Refresh succeeds but save returns error
- Data not persisting to database

**Solution:**
1. Check database connection
2. Verify table schema matches expected format
3. Check for constraint violations (foreign keys, etc.)
4. Review database logs for SQL errors

#### Issue: "No items returned"
**Symptoms:**
- Refresh returns `{"items": [], "count": 0}`

**Solution:**
1. Verify entry_type constant is correct (0=OUT, 1=IN, 2=VAR)
2. Check index parameter (should be -1 for all items)
3. Test C++ function directly with test harness
4. Verify device actually has configured points

#### Issue: "Auto-refresh runs multiple times"
**Symptoms:**
- Console shows multiple refresh attempts
- Network tab shows duplicate API calls

**Solution:**
1. Check that `autoRefreshed` flag is set correctly
2. Verify useEffect dependencies are correct
3. Ensure cleanup function returns from useEffect

#### Issue: "Infinite spinning icon"
**Symptoms:**
- Refresh icon keeps spinning
- `refreshingItems` Set never clears

**Solution:**
1. Add try/finally block to ensure cleanup
2. Check that error handling clears the Set
3. Verify item index matches between request and cleanup

### Debugging Tips

#### Enable Verbose Logging

**Rust:**
```rust
env_logger::init();
log::debug!("Refresh request: {:?}", request);
log::debug!("FFI response: {}", response);
```

**TypeScript:**
```typescript
console.log('[InputsPage] Refresh request:', { serial, index });
console.log('[InputsPage] Refresh response:', refreshResponse);
console.log('[InputsPage] Save response:', saveResponse);
```

#### Check Network Traffic

Use browser DevTools Network tab:
1. Filter by "Fetch/XHR"
2. Look for `/refresh` and `/save-refreshed` calls
3. Inspect request/response payloads
4. Check timing and status codes

#### Verify Database Updates

```sql
-- Check last updated time
SELECT InputIndex, full_label, f_value, updated_at
FROM input_points
WHERE serial_number = 1234567
ORDER BY updated_at DESC
LIMIT 10;

-- Verify specific input
SELECT * FROM input_points
WHERE serial_number = 1234567 AND InputIndex = 5;
```

---

## Implementation Checklist

### ✅ Completed

- [x] Rust backend routes for all 3 entity types (Inputs, Outputs, Variables)
- [x] Module and route registration
- [x] TypeScript API services for all 3 entity types
- [x] React component integration (3 triggers each)
- [x] CSS animations for refresh icons
- [x] Service exports registration
- [x] Backend compilation successful
- [x] TypeScript compilation (no errors in services)
- [x] Documentation consolidated

### ⏳ Pending

- [ ] C++ Action 17 implementation in `HandleWebViewMsg()`
- [ ] End-to-end testing with real devices
- [ ] Integration testing with C++ FFI
- [ ] Performance testing (batch refresh with 64+ items)
- [ ] Error handling edge cases
- [ ] Extend to other entity types (Programs, Schedules, etc.)

### 🎯 Next Steps

1. **C++ Team:**
   - Implement `case 17` handler
   - Test BACnet device reading
   - Return proper JSON structure

2. **Testing Team:**
   - Test all 3 refresh triggers on each page
   - Verify animations work
   - Test error scenarios (device offline, invalid index)
   - Load test with large batches

3. **Future Enhancements:**
   - Add progress indicators for batch refresh
   - Implement retry logic for failed refreshes
   - Add refresh history/audit log
   - Support partial batch refresh (continue on error)

---

## File Reference

### Backend Files
- Routes: `api/src/t3_device/{input,output,variable}_refresh_routes.rs`
- Registration: `api/src/t3_device/{mod,routes}.rs`

### Frontend Files
- Services: `src/t3-react/services/{input,output,variable}RefreshApi.ts`
- Pages: `src/t3-react/features/{inputs,outputs,variables}/pages/*Page.tsx`
- Styles: `src/t3-react/features/{inputs,outputs,variables}/pages/*Page.module.css`

### Documentation
- This file: `docs/api/ACTION_17_REFRESH_WEBVIEW_LIST.md`

---

## Support

For questions or issues:
- Backend: Review route files in `api/src/t3_device/`
- Frontend: Check service files in `src/t3-react/services/`
- C++ Integration: Contact C++ team lead
- Database: Check schema in `migration/` directory
