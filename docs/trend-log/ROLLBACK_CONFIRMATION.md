# Rollback Confirmation: Data Management Schema Migration

## Overview
This document confirms all files that need to be rolled back to the state before the January 22, 2025 data management schema implementation.

## Files to be REMOVED (Complete Rollback)

### 1. Migration File
- **File**: `api/migration/src/m20250122_000000_data_management_schema.rs`
- **Size**: 350 lines
- **Purpose**: Data management schema migration
- **Action**: DELETE this file completely

### 2. Entity Module Directory
- **Directory**: `api/src/entity/data_management/`
- **Action**: DELETE entire directory and all contents

#### Files in data_management directory:
- `api/src/entity/data_management/mod.rs`
- `api/src/entity/data_management/devices.rs`
- `api/src/entity/data_management/monitoring_points.rs`
- `api/src/entity/data_management/realtime_data_cache.rs`
- `api/src/entity/data_management/timeseries_data.rs`
- `api/src/entity/data_management/trend_logs.rs`
- `api/src/entity/data_management/trend_log_points.rs`

### 3. Module References to REMOVE

#### In `api/src/lib.rs`
**Remove line 6:**
```rust
pub mod data_management;  // <- DELETE this line
```

#### In `api/migration/src/lib.rs`
**Remove line 7:**
```rust
mod m20250122_000000_data_management_schema;  // <- DELETE this line
```

**Remove from migrations vector (line 20):**
```rust
Box::new(m20250122_000000_data_management_schema::Migration),  // <- DELETE this line
```

## Post-Rollback State

After rollback, the following files should remain unchanged:

### Migration Files (KEEP)
- `api/migration/src/m20240401_215840_create_tables.rs`
- `api/migration/src/m20240404_213650_update_tables.rs`
- `api/migration/src/m20240418_145628_add_devices_table.rs`
- `api/migration/src/m20240519_114859_update_files_table.rs`

### Entity Modules (KEEP)
- `api/src/entity/mod.rs`
- `api/src/entity/files.rs`
- `api/src/entity/modbus_register.rs`
- `api/src/entity/users.rs`

### Core API Modules (KEEP)
- `api/src/lib.rs` (after removing data_management reference)
- `api/src/server.rs`
- `api/src/app_state.rs`
- All other existing modules

## Verification Steps

After performing the rollback:

1. **Compile Test**
   ```bash
   cd api
   cargo check
   ```

2. **Migration Test**
   ```bash
   cargo run --bin migration
   ```

3. **API Server Test**
   ```bash
   cargo run
   ```

## Rollback Justification

The data_management schema was implemented on January 22, 2025, but needs to be rolled back because:

1. **Scope Mismatch**: The original implementation was too broad for trendlog-specific requirements
2. **Database Separation**: New design requires separate trendlog_database.db
3. **Clean Slate**: Fresh implementation needed for optimized trendlog functionality
4. **Timeline**: Return to July 28th state as baseline for new development

## New Implementation Plan

After rollback completion:

1. **Phase 1**: Implement trendlog-specific database schema
2. **Phase 2**: Create background collection services
3. **Phase 3**: Build trendlog-focused API endpoints
4. **Phase 4**: Integrate with Vue.js frontend for real-time trending

## Rollback Command Summary

To perform the rollback:

```bash
# Remove migration file
rm api/migration/src/m20250122_000000_data_management_schema.rs

# Remove entity directory
rm -rf api/src/entity/data_management/

# Edit api/src/lib.rs - remove line 6: "pub mod data_management;"
# Edit api/migration/src/lib.rs - remove line 7 and line 20 references

# Verify compilation
cd api && cargo check
```

## Confirmation ✅

**CONFIRMED**: All files listed above require rollback to restore the system to the pre-January 22nd state, providing a clean foundation for the new trendlog database implementation.

---

**Rollback Date**: January 25, 2025
**Approved By**: GitHub Copilot
**Status**: Ready for Execution
