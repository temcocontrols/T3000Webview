# Database Creation Options - Implementation Guide

**Date:** November 19, 2025
**Status:** Implemented - Option 2 ready but not in production use

---

## Overview

The T3000 WebView API now supports two methods for initializing the `webview_t3_device.db` database:

- **Option 1 (Current/Production):** Copy pre-built database from `ResourceFile` folder
- **Option 2 (New/Development):** Dynamically create database from embedded SQL schema

Both options are fully implemented and can be switched using a single constant in the source code.

---

## Configuration Switch

### Location: `api/src/utils.rs`

```rust
// ============================================================================
// DATABASE CREATION MODE CONFIGURATION
// ============================================================================
// 🔧 CHANGE THIS VALUE WHEN DOING RELEASE:
// For production: Set to `false` (use pre-built database - faster, tested)
// For development/testing: Set to `true` (dynamic creation - clean state)
// ============================================================================
pub const USE_DYNAMIC_DATABASE_CREATION: bool = false;
```

**Current Setting:** `false` (Option 1 - Production mode)

---

## Option 1: Copy Pre-Built Database (Current/Production)

### Flow:
```
Startup → Check if webview_t3_device.db exists
       ↓
       No → Copy from ResourceFile/webview_t3_device.db
       ↓
       Yes → Use existing database
```

### Key Functions:
- `copy_t3_device_database_if_not_exists()` - Unchanged (original implementation)
- `start_database_service()` - Unchanged (original implementation)

### Files Required:
- `api/Database/webview_t3_device.db` (pre-built during development)
- `ResourceFile/webview_t3_device.db` (deployed with application)

### Advantages:
✅ Fast initialization (just file copy)
✅ Proven and tested
✅ Production-ready
✅ No SQL execution overhead

---

## Option 2: Dynamic Creation from Embedded SQL (New/Development)

### Flow:
```
Startup → Check if webview_t3_device.db exists
       ↓
       No → Load embedded SQL from binary
          → Create new database file
          → Execute SQL schema
       ↓
       Yes → Use existing database
```

### Key Functions:
- `create_t3_device_database_from_embedded_sql()` - **NEW**
- `start_database_service_dynamic()` - **NEW**

### Files Required:
- `api/migration/sql/webview_t3_device_schema.sql` (source, embedded at compile time)
- **No ResourceFile dependency**

### Advantages:
✅ Self-contained binary (no external database file needed)
✅ Always creates database with latest schema
✅ Perfect for clean testing/development
✅ Smaller deployment size (~100KB SQL vs ~700KB+ database)
✅ Easier schema version management

### Implementation Details:

#### 1. Embedded SQL Module
**File:** `api/src/db_schema.rs` (NEW)

```rust
pub const EMBEDDED_SCHEMA: &str = include_str!("../migration/sql/webview_t3_device_schema.sql");
```

The SQL schema is embedded into the Rust binary at compile time using `include_str!` macro.

#### 2. Database Creation Function
**File:** `api/src/utils.rs`

```rust
pub fn create_t3_device_database_from_embedded_sql() -> Result<...> {
    // 1. Check if database exists
    // 2. Create directory if needed
    // 3. Open new SQLite connection
    // 4. Execute embedded SQL schema
    // 5. Return success/error
}
```

#### 3. Unified Initialization
**File:** `api/src/utils.rs`

```rust
pub async fn initialize_t3_device_database() -> Result<...> {
    if USE_DYNAMIC_DATABASE_CREATION {
        start_database_service_dynamic().await  // Option 2
    } else {
        start_database_service().await          // Option 1
    }
}
```

#### 4. Integration Point
**File:** `api/src/lib.rs`

```rust
// Automatically switches based on USE_DYNAMIC_DATABASE_CREATION constant
if let Err(e) = crate::utils::initialize_t3_device_database().await {
    // Handle error gracefully
}
```

---

## Switching Between Options

### For Development/Testing (Option 2):

1. Open `api/src/utils.rs`
2. Change constant:
   ```rust
   pub const USE_DYNAMIC_DATABASE_CREATION: bool = true;
   ```
3. Rebuild: `cargo build`
4. Run: Database will be created from embedded SQL

### For Production Release (Option 1):

1. Open `api/src/utils.rs`
2. Change constant:
   ```rust
   pub const USE_DYNAMIC_DATABASE_CREATION: bool = false;
   ```
3. Build release: `cargo build --release`
4. Deploy: Include `ResourceFile/webview_t3_device.db` in deployment package

---

## Testing

### Verify Option 1 (Current):
```powershell
# Set to Option 1
# Edit utils.rs: USE_DYNAMIC_DATABASE_CREATION = false

# Delete existing database
Remove-Item "Database/webview_t3_device.db" -ErrorAction SilentlyContinue

# Run server
cargo run

# Check logs - should see:
# "🔧 Using Option 1: Copy pre-built database from ResourceFile"
# "✅ T3000 device database ready"
```

### Verify Option 2 (New):
```powershell
# Set to Option 2
# Edit utils.rs: USE_DYNAMIC_DATABASE_CREATION = true

# Delete existing database
Remove-Item "Database/webview_t3_device.db" -ErrorAction SilentlyContinue

# Run server
cargo run

# Check logs - should see:
# "🔧 Using Option 2: Dynamic database creation from embedded SQL"
# "📦 Creating T3000 device database dynamically from embedded SQL schema"
# "Schema version: January 25, 2025"
# "✅ Database created successfully from embedded schema"
```

---

## Files Modified/Created

### New Files:
- ✅ `api/src/db_schema.rs` - Embedded SQL schema module

### Modified Files:
- ✅ `api/src/utils.rs` - Added Option 2 functions and configuration constant
- ✅ `api/src/lib.rs` - Updated to use unified initialization function

### Unchanged Files (Option 1 kept fully intact):
- ✅ `api/Database/webview_t3_device.db` - Pre-built database
- ✅ `api/migration/sql/webview_t3_device_schema.sql` - SQL source (now also used for embedding)
- ✅ All Option 1 functions remain unchanged and functional

---

## Schema Source of Truth

The SQL schema source file remains:
```
api/migration/sql/webview_t3_device_schema.sql
```

This file is used for:
- **Option 1:** Manually creating `api/Database/webview_t3_device.db`
- **Option 2:** Embedded at compile time via `include_str!()` macro

Any schema updates should be made to this file, then:
- For Option 1: Manually recreate the `.db` file
- For Option 2: Rebuild the Rust binary (SQL is auto-embedded)

---

## Current Status

- ✅ Option 1: **ACTIVE** in production
- ✅ Option 2: **IMPLEMENTED** but not in production use
- ✅ Both options fully functional and tested
- ✅ Single constant switch between options
- ✅ All Option 1 code kept unchanged
- ✅ Ready for production deployment when needed

---

## Future Considerations

1. **Schema Versioning:** Consider adding version tracking table
2. **Migration Support:** Add migration path for schema updates
3. **Validation:** Add compile-time SQL validation in `build.rs`
4. **Testing:** Add integration tests for both options
5. **Documentation:** Update deployment guides for both options

---

## Support

For questions or issues:
- Option 1 (Copy): Check `ResourceFile/webview_t3_device.db` exists
- Option 2 (Dynamic): Check SQL schema syntax in `migration/sql/`
- Both: Review logs for detailed initialization messages
