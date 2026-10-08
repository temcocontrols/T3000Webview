# TRENDLOG Split-Table Implementation Status

**Status**: Phase 1-3 Complete, Compilation Errors Expected

---

## Completed Work

### Phase 1: Database Schema
- Created `TRENDLOG_DATA` (parent table) with 13 fields
- Created `TRENDLOG_DATA_DETAIL` (child table) with 7 fields
- Renamed old table to `TRENDLOG_DATA_OLD` for migration
- Added 15 new indexes for optimized queries
- Updated schema file: `api/migration/sql/webview_t3_device_schema.sql`

### Phase 2: SeaORM Entities
- Created `trendlog_data.rs` (parent entity with id primary key)
- Created `trendlog_data_detail.rs` (child entity with parent_id FK)
- Created `trendlog_data_old.rs` (legacy entity for migration)
- Added parent-child relations (one-to-many / many-to-one)
- Updated `mod.rs` to export all entities

### Phase 3: Migration Infrastructure
- Created `migrate_trendlog_split.rs` with batch migration logic
- Created `trendlog_parent_cache.rs` with LRU-like caching
- Added parent_id lookup/create with cache support
- Batch operations for efficient bulk inserts

---

## Current State: Compilation Errors (EXPECTED)

The code currently has **45 compilation errors** because:
- Service layer still uses old single-table structure
- FFI sync service references old fields (logging_time, value, etc.)
- Routes expect old entity structure

**This is INTENTIONAL** - we haven't updated the service layer yet.

---

## Service Layer Update Plan

### File 1: `trendlog_data_service.rs`

**Changes Required**:
1. Add parent cache as service state
2. Update `save_realtime_data()`:
   ```rust
   // OLD: Direct insert with all fields
   let model = trendlog_data::ActiveModel {
       serial_number: Set(...),
       value: Set(...),
       logging_time: Set(...),
       ...
   };

   // NEW: Get parent_id, insert detail only
   let parent_id = cache.get_or_create_parent(db, key, ...).await?;
   let detail = trendlog_data_detail::ActiveModel {
       parent_id: Set(parent_id),
       value: Set(...),
       logging_time: Set(...),
       ...
   };
   ```

3. Update `save_realtime_batch()`:
   - Batch get all parent_ids
   - Batch insert details with `insert_many()`

4. Update all query methods to use JOINs:
   ```rust
   // OLD: Single table query
   trendlog_data::Entity::find()
       .filter(...)
       .all(db).await?

   // NEW: JOIN query
   trendlog_data_detail::Entity::find()
       .inner_join(trendlog_data::Entity)
       .filter(trendlog_data::Column::SerialNumber.eq(...))
       .all(db).await?
   ```

### File 2: `t3_ffi_sync_service.rs`

**Changes Required**:
Lines 988-1090 (3 insert blocks for inputs/outputs/variables):

```rust
// OLD: Direct insert
let trendlog = trendlog_data::ActiveModel { ... };

// NEW: Use cache + detail insert
let key = ParentKey { ... };
let parent_id = cache.get_or_create_parent(db, key, ...).await?;
let detail = trendlog_data_detail::ActiveModel {
    parent_id: Set(parent_id),
    ...
};
```

### File 3: `routes.rs`

**Changes Required**:
Lines 1462-1478 (endpoint that accesses `.value` and `.logging_time_fmt`):

```rust
// Update to access joined detail fields
// Or change query to return detail records
```

---

## Recommended Action Plan

**I recommend we proceed step-by-step:**

1. **First, let me know**:
   - Do you have existing data in TRENDLOG_DATA that must be migrated?
   - Or can we start fresh with empty tables?

2. **Based on your answer, I will**:
   - Create the migration binary (if needed)
   - Update all 3 service files with split-table logic
   - Fix all 45 compilation errors
   - Test the complete flow

3. **Then you can**:
   - Run the migration (if needed)
   - Test the new system
   - Verify space savings
   - Confirm performance improvements

---

## Expected Results After Completion

- Database size reduced by 41-55%
- Insert operations 2-3× faster
- Query operations maintain/improve speed
- All API endpoints work unchanged
- Frontend sees no difference

---

## What Would You Like Me to Do Next?

Please choose:

**A)** Proceed with service layer updates (I'll fix all 45 errors)
**B)** Create migration binary first
**C)** Start fresh - recreate database and update code together
**D)** Something else (specify)

I'm ready to continue once you confirm which approach you prefer!
