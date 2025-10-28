# Trendlog Data Flow Analysis

## Problem Statement
Data is not being saved to `TRENDLOG_DATA` and `TRENDLOG_DATA_DETAIL` tables despite FFI sync service running.

## Current Database State
```sql
SELECT COUNT(*) FROM TRENDLOG_DATA;        -- Result: 0
SELECT COUNT(*) FROM TRENDLOG_DATA_DETAIL; -- Result: 0
```

## Correct Data Flow (Expected Behavior)

### Step 1: FFI Sync Service Initialization
**File**: `api/src/t3_device/t3_ffi_sync_service.rs`
**Function**: `sync_logging_data_static()`
**Location**: Lines ~668-900

```
1. Service starts every N minutes (configurable 5-20 min)
2. Opens database transaction
3. Calls GET_PANELS_LIST via FFI (Action 4)
4. Gets list of devices from C++
```

### Step 2: Sequential Device Processing
```
FOR EACH device in panel_list:
    5. Call LOGGING_DATA via FFI (Action 15) for specific device
    6. Parse JSON response into DeviceWithPoints structure
    7. Process device data within transaction
    8. Wait 30 seconds before next device
```

### Step 3: Device Data Processing (Per Device)
**Location**: Lines ~770-850

```
FOR EACH device in response:
    9. Validate serial_number != 0 ✓ MISSING!
    10. Validate panel_id != 0 ✓ MISSING!
    11. Sync device basic info (UPSERT into T3_DEVICE table)
    12. Sync input points (UPSERT into INPUT_POINT table)
    13. Sync output points (UPSERT into OUTPUT_POINT table)
    14. Sync variable points (UPSERT into VARIABLE_POINT table)
    15. **INSERT trend log data** ← THIS IS THE CRITICAL STEP
```

### Step 4: Trend Log Insertion
**Function**: `insert_trend_logs()`
**Location**: Lines ~1095-1280

```
IF total_points > 0:
    FOR EACH input_point:
        16. Create ParentKey (serial, panel_id, point_id, point_index, point_type)
        17. Call get_or_create_parent() → Returns parent_id
        18. Insert into TRENDLOG_DATA_DETAIL with parent_id

    FOR EACH output_point:
        19. Create ParentKey
        20. Call get_or_create_parent() → Returns parent_id
        21. Insert into TRENDLOG_DATA_DETAIL with parent_id

    FOR EACH variable_point:
        22. Create ParentKey
        23. Call get_or_create_parent() → Returns parent_id
        24. Insert into TRENDLOG_DATA_DETAIL with parent_id
```

### Step 5: Parent Cache Management
**File**: `api/src/t3_device/trendlog_parent_cache.rs`
**Function**: `get_or_create_parent()`

```
25. Check in-memory cache for parent_id by ParentKey
26. IF found: return cached parent_id
27. IF NOT found:
    a. Query TRENDLOG_DATA for existing parent
    b. IF exists: cache and return parent_id
    c. IF NOT exists: INSERT into TRENDLOG_DATA, cache parent_id, return it
```

### Step 6: Transaction Commit
```
28. After processing all devices, COMMIT transaction
29. Clear parent cache
30. Log summary statistics
```

## Potential Problems - What Could Prevent Data Insertion

### Problem 1: ❌ Validation Blocks All Devices
**Symptom**: If all devices have serial_number=0 or panel_id=0, they get skipped
**Location**: Lines ~775-792 (validation code)
**Check**: Look for warning logs: "⚠️ Device has SerialNumber=0" or "⚠️ Device has PanelId=0"

### Problem 2: ❌ Empty Response from C++
**Symptom**: C++ returns 0 devices in LOGGING_DATA response
**Location**: Lines ~758-767
**Check**: Look for log: "⚠️ Device X returned 0 devices (C++ validation failed)"

### Problem 3: ❌ Transaction Rollback
**Symptom**: Transaction fails and rolls back before commit
**Location**: Lines ~635-645 (transaction error handling)
**Check**: Look for error logs indicating database errors

### Problem 4: ❌ Parse Failure
**Symptom**: JSON parsing fails, skips device
**Location**: Lines ~743-755
**Check**: Look for log: "❌ JSON parse failed for device"

### Problem 5: ❌ Points Array Empty
**Symptom**: Device parsed successfully but has 0 points
**Location**: Line ~827
**Check**: `total_trend_points = input + output + variable = 0`
**Result**: `insert_trend_logs()` never called because `if total_trend_points > 0` fails

### Problem 6: ❌ insert_trend_logs() Returns Error
**Symptom**: Function called but returns Err()
**Location**: Lines ~831-836
**Check**: Look for log: "❌ Trend log insertion failed"

## Diagnostic Steps

### 1. Check Recent Sync Logs
**Path**: `D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\T3WebLog\YYYY-MM\MMDD\T3_FFI_*_HHMM.txt`

**Look for**:
- "🚀 Sequential FFI sync cycle starting" ← Service started
- "📋 GET_PANELS_LIST returned N panels" ← How many devices found
- "📝 Processing device data - Serial: X" ← Device processing started
- "✅ Device X data sync completed" ← Device completed successfully
- "📊 Trend logs inserted (N entries)" ← Trend log insertion attempted
- "❌ Trend log insertion failed" ← Insertion error
- "⚠️ Device has SerialNumber=0" ← Validation blocked device

### 2. Check C++ Export Logs
**Path**: `T3WebLog\YYYY-MM\MMDD\T3_CppMsg_BacnetWebView_Exports_HHMM.txt`

**Look for**:
- LOGGING_DATA JSON response content
- Check if `panel_serial_number` is 0 or valid
- Check if `panel_id` is 0 or valid
- Check if point arrays are empty

### 3. Check Database Tables
```sql
-- Check if devices were synced (should have entries)
SELECT COUNT(*) FROM T3_DEVICE;

-- Check if points were synced (should have entries)
SELECT COUNT(*) FROM INPUT_POINT;
SELECT COUNT(*) FROM OUTPUT_POINT;
SELECT COUNT(*) FROM VARIABLE_POINT;

-- Check parent records (should have entries if insert_trend_logs ran)
SELECT COUNT(*) FROM TRENDLOG_DATA;

-- Check detail records (should have entries if insert_trend_logs ran)
SELECT COUNT(*) FROM TRENDLOG_DATA_DETAIL;
```

### 4. Check Sync Service Status
```sql
SELECT * FROM DATABASE_CONFIG WHERE config_key = 'ffi_sync_enabled';
SELECT * FROM DATABASE_CONFIG WHERE config_key = 'ffi_sync_interval_minutes';
```

## Most Likely Root Causes

### Scenario A: Validation Blocking Everything
**Evidence**: No TRENDLOG_DATA/DETAIL records, but T3_DEVICE/INPUT_POINT/OUTPUT_POINT have records
**Cause**: Devices have serial_number=0 or panel_id=0, validation skips them
**Solution**: Either fix C++ to provide valid values OR temporarily disable validation

### Scenario B: Empty Points Arrays
**Evidence**: T3_DEVICE has records, but INPUT_POINT/OUTPUT_POINT/VARIABLE_POINT are empty
**Cause**: C++ returns devices but with empty point arrays
**Result**: `total_trend_points = 0`, `insert_trend_logs()` never called
**Solution**: Fix C++ LOGGING_DATA to include points

### Scenario C: Transaction Rollback
**Evidence**: Logs show "📊 Trend logs inserted" but database is empty
**Cause**: Transaction commits but then gets rolled back due to error
**Solution**: Check for transaction errors after trend log insertion

### Scenario D: Service Not Running
**Evidence**: No recent log files in T3WebLog
**Cause**: FFI sync service disabled or not started
**Solution**: Check DATABASE_CONFIG table, restart service

## Next Steps to Diagnose

1. **Find the latest FFI sync log file** and read last 100 lines
2. **Count records in T3_DEVICE, INPUT_POINT tables** to see if device sync worked
3. **Check if `insert_trend_logs()` was called** by searching logs for "📊 Trend logs inserted"
4. **Identify which scenario matches** the evidence
5. **Apply targeted fix** based on root cause
