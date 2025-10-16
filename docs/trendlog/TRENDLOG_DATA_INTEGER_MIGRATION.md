# TRENDLOG_DATA Field Type Migration - TEXT to INTEGER

## Overview
This document describes the migration of `DataSource` and `CreatedBy` fields in the `TRENDLOG_DATA` table from storing TEXT values like "FFI_SYNC" to storing integer values as strings like "1", "2" for improved performance and space efficiency.

## Migration Date
2025-01-XX (Implementation Complete)

## Motivation
- **Space Optimization**: 1.2M+ records × 2 fields - storing "1" or "2" instead of "FFI_SYNC" or "REALTIME" saves 6-16 bytes per field
- **Performance**: String comparison of "1" vs "2" is faster than comparing longer strings
- **Type Safety**: Enum-based constants prevent invalid values
- **Database Size**: Reduces database size by ~15-30MB
- **No Schema Change**: Keeps TEXT field type, only changes stored values (simpler migration)

## Field Mappings

### DataSource Field
| Old Value (TEXT) | New Value (INTEGER) | Constant Name | Description |
|-----------------|---------------------|---------------|-------------|
| "FFI_SYNC"      | 1                   | DATA_SOURCE_FFI_SYNC | Data synchronized from FFI/C++ layer |
| "REALTIME"      | 2                   | DATA_SOURCE_REALTIME | Real-time data from frontend |
| "HISTORICAL"    | 3                   | (Reserved)    | Historical import data |
| "MANUAL"        | 4                   | (Reserved)    | Manually entered data |

### CreatedBy Field
| Old Value (TEXT) | New Value (INTEGER) | Constant Name | Description |
|-----------------|---------------------|---------------|-------------|
| "FFI_SYNC_SERVICE" | 1                | CREATED_BY_FFI_SYNC_SERVICE | Created by FFI sync service |
| "FRONTEND"         | 2                | CREATED_BY_FRONTEND | Created by frontend application |
| "BACKEND"          | 3                | (Reserved)    | Created by backend service |
| "API"              | 4                | (Reserved)    | Created via API endpoint |

## Database Impact Analysis

### Current Data Distribution (Pre-Migration)
```sql
SELECT DataSource, CreatedBy, COUNT(*) FROM TRENDLOG_DATA GROUP BY DataSource, CreatedBy;
```
Results:
- FFI_SYNC | FFI_SYNC_SERVICE: 1,179,136 records
- REALTIME | FRONTEND: 88,176 records
- **Total Records**: 1,267,312

### Schema Changes Required
```sql
-- Simple in-place migration (NO schema changes needed!)
-- Just update the string values from text to integer strings

-- Step 1: Migrate DataSource values
UPDATE TRENDLOG_DATA SET DataSource = '1' WHERE DataSource = 'FFI_SYNC';
UPDATE TRENDLOG_DATA SET DataSource = '2' WHERE DataSource = 'REALTIME';

-- Step 2: Migrate CreatedBy values
UPDATE TRENDLOG_DATA SET CreatedBy = '1' WHERE CreatedBy = 'FFI_SYNC_SERVICE';
UPDATE TRENDLOG_DATA SET CreatedBy = '2' WHERE CreatedBy = 'FRONTEND';

-- Step 3: Update defaults (optional, for new records)
-- SQLite: Modify CREATE TABLE statement or handle in application
-- Application code already sets defaults to "2" for both fields

-- Verify migration
SELECT DataSource, COUNT(*) FROM TRENDLOG_DATA GROUP BY DataSource;
SELECT CreatedBy, COUNT(*) FROM TRENDLOG_DATA GROUP BY CreatedBy;
```

**Benefits of this approach:**
- ✅ No schema changes needed (TEXT fields remain TEXT)
- ✅ Simple UPDATE statements (no table recreation)
- ✅ Can be rolled back easily
- ✅ Works with existing indexes
- ✅ No downtime required

## Code Changes Implemented

### 1. Constants Module
**File**: `api/src/t3_device/constants.rs` (NEW)
```rust
// DataSource constants
pub const DATA_SOURCE_FFI_SYNC: i32 = 1;       // Currently used
pub const DATA_SOURCE_REALTIME: i32 = 2;       // Currently used
pub const DATA_SOURCE_HISTORICAL: i32 = 3;     // Reserved for future use
pub const DATA_SOURCE_MANUAL: i32 = 4;         // Reserved for future use

// CreatedBy constants
pub const CREATED_BY_FFI_SYNC_SERVICE: i32 = 1; // Currently used
pub const CREATED_BY_FRONTEND: i32 = 2;         // Currently used
pub const CREATED_BY_BACKEND: i32 = 3;          // Reserved for future use
pub const CREATED_BY_API: i32 = 4;              // Reserved for future use

// Helper functions for string ↔ integer conversion (supports all values)
pub fn data_source_to_int(source: &str) -> Option<i32>
pub fn data_source_to_string(source: i32) -> Option<&'static str>
pub fn created_by_to_int(created: &str) -> Option<i32>
pub fn created_by_to_string(created: i32) -> Option<&'static str>
```

### 2. TypeScript Constants
**File**: `src/lib/T3000/Hvac/Data/Constant/T3Constant.ts` (UPDATED)
```typescript
static DataSource = {
  FFI_SYNC: 1,      // Currently used
  REALTIME: 2,      // Currently used
  HISTORICAL: 3,    // Reserved for future use
  MANUAL: 4         // Reserved for future use
}

static CreatedBy = {
  FFI_SYNC_SERVICE: 1,  // Currently used
  FRONTEND: 2,          // Currently used
  BACKEND: 3,           // Reserved for future use
  API: 4                // Reserved for future use
}
```

### 3. Entity Definition
**File**: `api/src/entity/t3_device/trendlog_data.rs` (NO CHANGE - Still uses String)
```rust
// Field types remain as Option<String>
pub data_source: Option<String>,   // Stores "1", "2", "3", "4" as strings
pub created_by: Option<String>,    // Stores "1", "2", "3", "4" as strings

// Comments updated to reflect new values:
// data_source: (stores "1"=FFI_SYNC, "2"=REALTIME as strings)
// created_by: (stores "1"=FFI_SYNC_SERVICE, "2"=FRONTEND as strings)
```

### 4. Service Updates

#### t3000_ffi_sync_service.rs (UPDATED)
```rust
// OLD:
data_source: Set(Some("FFI_SYNC".to_string())),
created_by: Set(Some("FFI_SYNC_SERVICE".to_string())),

// NEW: Convert integer constants to strings
use crate::t3_device::constants::{DATA_SOURCE_FFI_SYNC, CREATED_BY_FFI_SYNC_SERVICE};
data_source: Set(Some(DATA_SOURCE_FFI_SYNC.to_string())),  // Stores "1"
created_by: Set(Some(CREATED_BY_FFI_SYNC_SERVICE.to_string())),  // Stores "1"
```

#### trendlog_data_service.rs (UPDATED)
```rust
// OLD:
data_source: Set(Some("REALTIME".to_string())),
created_by: Set(Some("FRONTEND".to_string())),

// NEW: Convert integer constants to strings
use crate::t3_device::constants::{DATA_SOURCE_REALTIME, CREATED_BY_FRONTEND};
data_source: Set(Some(DATA_SOURCE_REALTIME.to_string())),  // Stores "2"
created_by: Set(Some(CREATED_BY_FRONTEND.to_string())),    // Stores "2"
```

**Query consolidation** (priority sorting):
```rust
// OLD:
match point.data_source.as_deref() {
    Some("FFI_SYNC") => 1,
    Some("REALTIME") => 2,
    ...
}

// NEW: Compare integer strings
match point.data_source.as_deref() {
    Some("1") => 1,  // DATA_SOURCE_FFI_SYNC - Highest priority
    Some("2") => 2,  // DATA_SOURCE_REALTIME - Second priority
    Some("3") => 3,  // HISTORICAL - Third priority
    Some("4") => 4,  // MANUAL - Lowest priority
    _ => 999,        // Unknown sources last
}
```

## Testing Strategy

### 1. Unit Tests
- [ ] Test constant values match expected integers
- [ ] Test helper functions (string ↔ int conversion)
- [ ] Test entity serialization/deserialization

### 2. Integration Tests
- [ ] Test FFI sync service insertion with integer values
- [ ] Test frontend data insertion with integer values
- [ ] Test query filtering by data_source (is_in with integers)
- [ ] Test consolidation/deduplication logic

### 3. Migration Testing
- [ ] Backup production database before migration
- [ ] Test migration script on development database
- [ ] Verify data integrity after migration (record counts)
- [ ] Test all API endpoints with migrated data

### 4. Frontend Testing
- [ ] Update frontend to use T3Constant.DataSource/CreatedBy
- [ ] Test chart rendering with integer data_source values
- [ ] Test filtering by data source in UI

## Rollback Plan
If issues arise:
1. Revert code changes to use string types
2. Restore database from backup
3. Re-deploy previous version

## Performance Expectations

### Storage Savings
- **Before**: TEXT fields storing "FFI_SYNC" (8 bytes), "REALTIME" (8 bytes), "FFI_SYNC_SERVICE" (16 bytes), "FRONTEND" (8 bytes)
- **After**: TEXT fields storing "1" or "2" (1 byte each)
- **DataSource savings**: 7 bytes per record on average
- **CreatedBy savings**: 7-15 bytes per record on average
- **Total savings per record**: ~14-22 bytes × 1.2M records = **~17-26 MB**

### Query Performance
- String comparison "1" vs "2": Faster than comparing longer strings like "FFI_SYNC" vs "REALTIME"
- Index efficiency: Shorter strings are more compact in indexes
- Memory usage: Reduced memory footprint for query results (shorter strings)
- Still uses string comparison (no native integer performance, but shorter = faster)

## API Compatibility

### Request Structs (Backward Compatible)
The `CreateTrendlogDataRequest` struct still accepts `Option<String>` for `data_source` and `created_by` to maintain API compatibility. The service layer converts strings to integers internally.

Future versions can update the API contract to accept integers directly.

### Response Data
JSON responses will now return string values containing integers:
```json
{
  "data_source": "1",  // was "FFI_SYNC", now stores "1"
  "created_by": "1"    // was "FFI_SYNC_SERVICE", now stores "1"
}
```

Frontend code should:
1. Parse the string value: `parseInt(data.data_source)`
2. Compare with `T3Constant.DataSource` values
3. Example: `parseInt(data.data_source) === T3Constant.DataSource.FFI_SYNC`

## Deployment Steps
1. ✅ Deploy code changes (constants, entity, services)
2. ⏳ Run database migration script (scheduled maintenance window)
3. ⏳ Verify data integrity post-migration
4. ⏳ Update frontend to use new constants (optional, backward compatible)
5. ⏳ Monitor logs for any errors related to data_source/created_by

## Status
- **Code Changes**: ✅ Complete (compiled successfully)
- **Database Migration**: ⏳ Pending (requires maintenance window)
- **Testing**: ⏳ In Progress
- **Frontend Updates**: ⏳ Optional (backward compatible)

## References
- Entity: `api/src/entity/t3_device/trendlog_data.rs`
- Constants: `api/src/t3_device/constants.rs`
- FFI Service: `api/src/t3_device/t3000_ffi_sync_service.rs`
- Data Service: `api/src/t3_device/trendlog_data_service.rs`
- TypeScript: `src/lib/T3000/Hvac/Data/Constant/T3Constant.ts`
