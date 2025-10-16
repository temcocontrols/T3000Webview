# TRENDLOG_DATA Field Type Migration - TEXT to INTEGER

## Overview
This document describes the migration of `DataSource` and `CreatedBy` fields in the `TRENDLOG_DATA` table from TEXT to INTEGER types for improved performance and space efficiency.

## Migration Date
2025-01-XX (Implementation Complete)

## Motivation
- **Space Optimization**: 1.2M+ records × 2 fields × 10-20 bytes/field = significant storage savings
- **Performance**: Integer comparisons are faster than string comparisons in queries
- **Type Safety**: Enum-based constants prevent invalid string values
- **Database Size**: Reduces database size by ~20-40MB

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
-- Step 1: Add new integer columns (temporary migration)
ALTER TABLE TRENDLOG_DATA ADD COLUMN DataSource_New INTEGER;
ALTER TABLE TRENDLOG_DATA ADD COLUMN CreatedBy_New INTEGER;

-- Step 2: Migrate data
UPDATE TRENDLOG_DATA SET DataSource_New = 1 WHERE DataSource = 'FFI_SYNC';
UPDATE TRENDLOG_DATA SET DataSource_New = 2 WHERE DataSource = 'REALTIME';
UPDATE TRENDLOG_DATA SET CreatedBy_New = 1 WHERE CreatedBy = 'FFI_SYNC_SERVICE';
UPDATE TRENDLOG_DATA SET CreatedBy_New = 2 WHERE CreatedBy = 'FRONTEND';

-- Step 3: Drop old columns
ALTER TABLE TRENDLOG_DATA DROP COLUMN DataSource;
ALTER TABLE TRENDLOG_DATA DROP COLUMN CreatedBy;

-- Step 4: Rename new columns
ALTER TABLE TRENDLOG_DATA RENAME COLUMN DataSource_New TO DataSource;
ALTER TABLE TRENDLOG_DATA RENAME COLUMN CreatedBy_New TO CreatedBy;

-- Step 5: Add defaults
ALTER TABLE TRENDLOG_DATA ALTER COLUMN DataSource SET DEFAULT 2;    -- REALTIME
ALTER TABLE TRENDLOG_DATA ALTER COLUMN CreatedBy SET DEFAULT 2;     -- FRONTEND
```

**Note**: SQLite does not support ALTER COLUMN directly. You may need to:
1. Create a new table with corrected schema
2. Copy data with transformations
3. Drop old table
4. Rename new table

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
**File**: `api/src/entity/t3_device/trendlog_data.rs` (UPDATED)
```rust
// OLD:
pub data_source: Option<String>,
pub created_by: Option<String>,

// NEW:
pub data_source: Option<i32>,
pub created_by: Option<i32>,
```

### 4. Service Updates

#### t3000_ffi_sync_service.rs (UPDATED)
```rust
// OLD:
data_source: Set(Some("FFI_SYNC".to_string())),
created_by: Set(Some("FFI_SYNC_SERVICE".to_string())),

// NEW:
use crate::t3_device::constants::{DATA_SOURCE_FFI_SYNC, CREATED_BY_FFI_SYNC_SERVICE};
data_source: Set(Some(DATA_SOURCE_FFI_SYNC)),
created_by: Set(Some(CREATED_BY_FFI_SYNC_SERVICE)),
```

#### trendlog_data_service.rs (UPDATED)
```rust
// OLD:
data_source: Set(Some("REALTIME".to_string())),
created_by: Set(Some("FRONTEND".to_string())),

// NEW:
use crate::t3_device::constants::{DATA_SOURCE_REALTIME, CREATED_BY_FRONTEND};
data_source: Set(Some(DATA_SOURCE_REALTIME)),
created_by: Set(Some(CREATED_BY_FRONTEND)),
```

**Query consolidation** (priority sorting):
```rust
// OLD:
match point.data_source.as_deref() {
    Some("FFI_SYNC") => 1,
    Some("REALTIME") => 2,
    ...
}

// NEW:
match point.data_source {
    Some(1) => 1,  // DATA_SOURCE_FFI_SYNC
    Some(2) => 2,  // DATA_SOURCE_REALTIME
    ...
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
- **Before**: TEXT fields ~10-20 bytes each
- **After**: INTEGER fields 4 bytes each
- **Savings per record**: ~12-32 bytes × 2 fields = 24-64 bytes
- **Total savings**: 24-64 bytes × 1.2M records = **~28-76 MB**

### Query Performance
- Integer comparisons: **~2-5x faster** than string comparisons
- Index efficiency: Integers are more compact and faster to index
- Memory usage: Reduced memory footprint for query results

## API Compatibility

### Request Structs (Backward Compatible)
The `CreateTrendlogDataRequest` struct still accepts `Option<String>` for `data_source` and `created_by` to maintain API compatibility. The service layer converts strings to integers internally.

Future versions can update the API contract to accept integers directly.

### Response Data
JSON responses will now return integer values:
```json
{
  "data_source": 1,  // was "FFI_SYNC"
  "created_by": 1    // was "FFI_SYNC_SERVICE"
}
```

Frontend code should use `T3Constant.DataSource` and `T3Constant.CreatedBy` for comparisons.

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
