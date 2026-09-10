# Data Splitting Strategy - Documentation Overview

**Date**: November 2, 2025
**Status**: ✅ **UPDATED** - Reflects current working implementation

---

## 📚 Documentation Structure

### Current Implementation (Use These)

#### 1. **Data-Splitting-Implementation-Guide.md** ⭐ PRIMARY REFERENCE
**Purpose**: Comprehensive implementation guide with complete details
**Combines**: Previous Implementation.md + Flow-Diagrams.md
**Updated**: November 2, 2025

**Contents:**
- ✅ Copy-Delete strategy (current working approach)
- ✅ Complete flow diagrams
- ✅ Configuration guide
- ✅ Testing scenarios
- ✅ Troubleshooting
- ✅ Performance metrics
- ✅ API reference

**Use this for:**
- Understanding how the system works
- Implementing changes
- Troubleshooting issues
- Performance analysis
- Testing and deployment

---

#### 2. **Data-Splitting-Strategy-Analysis.md** 📊 ROOT CAUSE + RESOLUTION
**Purpose**: Problem analysis and solution evolution
**Updated**: November 2, 2025 (added resolution section)

**Contents:**
- 🔍 Root cause of 8KB partition files (ATTACH visibility issues)
- ❌ Original ATTACH approach problems
- ✅ Final Copy-Delete solution (Resolution section)
- 📝 Lessons learned
- 🔗 Links to current implementation

**Use this for:**
- Understanding why Copy-Delete was chosen
- Historical context
- Decision rationale

---

### Historical Documents (Archived)

#### 3. **Data-Splitting-Strategy-Fix-Summary.md** ⚠️ HISTORICAL
**Status**: SUPERSEDED - Documents failed ATTACH approach
**Updated**: November 2, 2025 (marked as historical)

**Contents:**
- Schema mismatch fixes (correct information)
- ATTACH DATABASE approach (abandoned)
- Warning headers added
- Links to current implementation

**Historical value:**
- Documents schema issues encountered
- Shows what didn't work
- Reference for future similar issues

---

#### 4. **Data-Splitting-Strategy-Implementation.md** ⚠️ REPLACED
**Status**: REPLACED by Data-Splitting-Implementation-Guide.md
**Note**: Can be deleted - content merged into Implementation Guide

---

#### 5. **Data-Splitting-Strategy-Flow-Diagrams.md** ⚠️ REPLACED
**Status**: REPLACED by Data-Splitting-Implementation-Guide.md
**Note**: Can be deleted - content merged into Implementation Guide

---

## 🔄 What Changed (November 2, 2025)

### Major Updates:

**1. Created Comprehensive Implementation Guide**
- Combined Implementation.md + Flow-Diagrams.md
- Updated all flows for Copy-Delete strategy
- Added WAL/SHM cleanup documentation
- Enhanced with testing mode details
- Complete troubleshooting section

**2. Updated Analysis Document**
- Added "RESOLUTION" section
- Explains why Copy-Delete works
- Documents new features (WAL cleanup, logging)
- Performance impact analysis
- Links to current implementation

**3. Archived Historical Documents**
- Fix-Summary marked as "HISTORICAL"
- Added warnings about superseded approach
- Maintained for reference value
- Original Implementation/Flow-Diagrams can be deleted

---

## 📖 Reading Guide

### For New Developers:
1. Start with: **Data-Splitting-Implementation-Guide.md**
2. Reference: **Data-Splitting-Strategy-Analysis.md** (Resolution section)
3. Skip: Historical documents unless interested in background

### For Troubleshooting:
1. Check: **Implementation Guide** → Troubleshooting section
2. Review: **Implementation Guide** → Flow diagrams
3. Compare: **Analysis** → Resolution section for approach differences

### For Performance Analysis:
1. See: **Implementation Guide** → Performance section
2. Reference: **Analysis** → Performance Impact (in Resolution)

---

## 🎯 Quick Reference

### Implementation Status

| Feature | Status | Document Reference |
|---------|--------|-------------------|
| Copy-Delete Strategy | ✅ Working | [Implementation Guide](Data-Splitting-Implementation-Guide.md) → **Migration Strategy** |
| Monthly Partitioning | ✅ Active | [Implementation Guide](Data-Splitting-Implementation-Guide.md) → **Configuration** |
| WAL/SHM Cleanup | ✅ Working | [Implementation Guide](Data-Splitting-Implementation-Guide.md) → **Flow Diagrams** → *WAL/SHM Cleanup Flow* |
| Query Service | ✅ Working | [Implementation Guide](Data-Splitting-Implementation-Guide.md) → **API Reference** |
| Query Logging | ✅ Enhanced | [Implementation Guide](Data-Splitting-Implementation-Guide.md) → **Flow Diagrams** → *Multi-Partition Query Flow* |
| Main DB Deletion | ⚠️ Testing Mode | [Implementation Guide](Data-Splitting-Implementation-Guide.md) → **Current Implementation Status** |

### Key Implementation Files

| File Path | Purpose | Lines |
|-----------|---------|-------|
| `api/src/database_management/partition_monitor_service.rs` | Partition creation | 538 |
| `api/src/database_management/partition_query_service.rs` | Multi-partition queries | 377 |
| `api/src/lib.rs` | Service initialization | ~51-53 |

### Configuration

```sql
-- Check current strategy
SELECT strategy, is_active, retention_days
FROM DATABASE_PARTITION_CONFIG WHERE id = 1;

-- Expected: strategy='monthly', is_active=1, retention_days=30
```

---

## 📝 Documentation Maintenance### Major Changes (Nov 2, 2025):

1. **ATTACH DATABASE Approach ABANDONED**
   - Old: Create partition with separate connection, then ATTACH
   - New: **Copy-and-Delete strategy**

2. **Copy-and-Delete Strategy Implemented**
   - Copy entire main database → partition file
   - Delete non-period data from partition
   - Keep main database unchanged (deletion commented out for testing)

3. **Simplified Table Cleanup**
   - Old: Delete from TRENDLOG_DATA_DETAIL + orphan cleanup
   - New: Delete ONLY from TRENDLOG_DATA_DETAIL, keep ALL TRENDLOG_DATA

4. **WAL/SHM Cleanup Added**
   - Automatic cleanup of orphaned .db-wal and .db-shm files
   - Runs at startup for all partition files
   - Runs after each partition creation

5. **Enhanced Query Logging**
   - Added ServiceLogger to partition_query_service.rs
   - Detailed ATTACH/DETACH logging
   - Record count reporting per partition

---

## 📝 Documents Requiring Updates

### 1. Data-Splitting-Strategy-Analysis.md

**Status**: ⚠️ OUTDATED - References ATTACH issues that are now solved

**Sections to Update:**

#### Remove/Replace:
- ❌ "Issue #1: Database Schema Mismatch" - This is fixed
- ❌ "Root Cause: ATTACH DATABASE visibility issues" - No longer using that approach
- ❌ All references to `logging_time_fmt`, `parent_id`, `value` column issues

#### Add New Sections:
- ✅ **Copy-and-Delete Strategy**
  - How it works
  - Why it's better than ATTACH
  - Disk space requirements (2x during copy)

- ✅ **WAL/SHM File Management**
  - What they are
  - Why they need cleanup
  - Automatic cleanup process

- ✅ **Testing Status**
  - Main DB deletion disabled (commented out)
  - Safe testing approach
  - How to enable full migration

#### Update:
- Migration flow diagrams (remove ATTACH complexity)
- File size expectations
- Testing procedures

---

### 2. Data-Splitting-Strategy-Fix-Summary.md

**Status**: ⚠️ OUTDATED - References old ATTACH approach

**Major Changes Needed:**

#### Section: "Root Cause"
**Old**:
```
Root Cause: SQL Column Name Mismatch
- Migration code expected: parent_id, logging_time_fmt
- Runtime database has: ParentId, LoggingTime_Fmt
```

**New**:
```
Original Issue: ATTACH DATABASE visibility problems with multi-connection SQLite/SeaORM

Final Solution: Copy-and-Delete Strategy
- Copy main database to partition location
- Delete non-period data from partition copy
- VACUUM to reclaim space
- No ATTACH needed during creation
```

#### Section: "Fixes Applied"
**Remove**:
- All SQL column fix details (no longer relevant)

**Add**:
```
### 1. Implemented Copy-and-Delete Strategy
- std::fs::copy() main database to partition file
- Connect to partition and DELETE outside-period records
- VACUUM partition to shrink file
- Clean up WAL/SHM files
- Keep main database unchanged for testing

### 2. Added WAL/SHM Cleanup
- cleanup_partition_wal_shm_files() function
- Runs at startup
- Scans for orphaned .db-wal/.db-shm files
- Only removes partition WAL/SHM (keeps main DB files)

### 3. Simplified Parent Record Management
- Keep ALL TRENDLOG_DATA records in partition
- Only clean TRENDLOG_DATA_DETAIL table
- No orphan cleanup (intentional)
```

#### Section: "Expected Results"
**Update**:
```
### Database State After Fix:
Main Database: webview_t3_device.db
├── Size: ~76 MB (UNCHANGED - deletion disabled for testing)
├── Total Records: 405,642 (all data retained)
└── Date Range: All historical data

Partition Files:
├── webview_t3_device_2025-10-31.db: ~46 MB (Oct 31 data only)
│   ├── TRENDLOG_DATA: ALL parent records
│   └── TRENDLOG_DATA_DETAIL: Oct 31 records only
├── (More partitions as created)
└── No .db-wal or .db-shm files (cleaned automatically)

Note: Main database deletion is COMMENTED OUT for testing.
To enable: Uncomment section in migrate_single_period()
```

---

### 3. data-splitting-strategy-implementation.md

**Status**: ⚠️ PARTIALLY OUTDATED - Core concepts OK, implementation details wrong

**Sections to Update:**

#### Migration Process Flow
**Old Flow**:
```
1. CREATE: webview_t3_device_2025-10-25.db
2. ATTACH DATABASE (partition)
3. INSERT INTO partition SELECT FROM main WHERE date=...
4. DELETE FROM main WHERE date=...
5. DETACH DATABASE
6. REGISTER in DATABASE_FILES table
```

**New Flow**:
```
1. COPY: Main DB → webview_t3_device_2025-10-25.db
2. CONNECT: Open partition database
3. DELETE: Remove non-period data from partition
4. VACUUM: Shrink partition file
5. CLEANUP: Remove .db-wal and .db-shm files
6. (SKIP): Don't delete from main DB (testing mode)
7. REGISTER: in DATABASE_FILES table
```

#### Add New Sections:
```
### Disk Space Requirements

**During Partition Creation:**
- Temporary space needed: 2x main database size
- Example: 76 MB main DB → needs 152 MB free space during copy
- After VACUUM: Partition shrinks to actual data size

**Permanent Storage:**
- Main DB: Unchanged (~76 MB)
- Each partition: 10-50 MB depending on data volume
- WAL/SHM: Cleaned automatically (0 bytes extra)

### Testing vs Production Mode

**Current (Testing):**
- Partitions created successfully
- Main database keeps all data
- Safe to test without data loss
- Can verify partition integrity

**Production (Future):**
- Uncomment deletion section in migrate_single_period()
- Main database will shrink after migration
- Old data only in partitions
- Enable in phases for safety
```

#### Update Query Service Section:
```
### Query Flow with Copy-Based Partitions

Each partition file is a complete standalone database:
- No ATTACH needed during migration (only during query)
- ATTACH works reliably because partition is fully committed
- Each partition has all device metadata
- Querying is fast and reliable
```

---

### 4. Data-Splitting-Strategy-Flow-Diagrams.md

**Status**: ⚠️ OUTDATED - Migration flow incorrect

**Diagrams to Update:**

#### Diagram: "Migration Process" (Current line ~200)
**Replace with:**
```
Migration Process (Copy-and-Delete Strategy)
┌─────────────────────────┐
│ calculate_period_boundaries() │
│ 2025-10-31 00:00:00    │
│ to 23:59:59            │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ std::fs::copy()         │
│ main.db → partition.db  │
│ (Full database copy)    │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Connect to partition DB │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ DELETE FROM TRENDLOG_   │
│ DATA_DETAIL WHERE       │
│ date < 2025-10-31 OR    │
│ date > 2025-10-31       │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ VACUUM (shrink file)    │
│ 76 MB → 46 MB          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Close connection        │
│ Wait 100ms for Windows  │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Delete .db-wal file     │
│ Delete .db-shm file     │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ (SKIP for testing)      │
│ Delete from main DB     │
│ VACUUM main DB          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Register in             │
│ DATABASE_FILES table    │
└─────────────────────────┘
```

#### Add New Diagram: "Startup WAL/SHM Cleanup"
```
T3000 Startup
      │
      ▼
┌─────────────────────────┐
│ check_startup_migrations() │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ cleanup_partition_wal_  │
│ shm_files()             │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Scan Database folder    │
│ Find all partition DBs  │
│ (match pattern *-*.db)  │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ For each partition:     │
│ Try delete .db-wal      │
│ Try delete .db-shm      │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Log results:            │
│ "Cleaned up X files"    │
│ OR "No orphaned files"  │
└─────────────────────────┘
```

---

## 🎯 Priority Update Order

### High Priority (Update Immediately):
1. **Data-Splitting-Strategy-Fix-Summary.md**
   - Most visible document
   - Contains "READY FOR PRODUCTION" status (misleading)
   - Should reflect current testing state

2. **data-splitting-strategy-implementation.md**
   - Technical reference for developers
   - Migration flow is completely different now

### Medium Priority:
3. **Data-Splitting-Strategy-Flow-Diagrams.md**
   - Visual reference
   - Migration diagram is wrong

### Low Priority:
4. **Data-Splitting-Strategy-Analysis.md**
   - Historical analysis document
   - Could add "Resolution" section instead of rewriting

---

## ✅ What's Still Accurate

These sections are still correct and don't need updates:

- Configuration structure (database_partition_config)
- Startup flow (hourly monitor + 10s delayed startup check)
- Strategy types (Daily, Weekly, Monthly)
- DATABASE_FILES tracking table
- Query service approach (ATTACH during read is fine)
- Retention logic
- Gap detection logic

---

## 📋 Suggested New Document

Consider creating:

### "Data-Splitting-Strategy-CURRENT-STATUS.md"

**Purpose**: Single source of truth for current implementation

**Contents**:
```
# Current Status - November 2, 2025

## ✅ Working Features
- Copy-based partition creation
- WAL/SHM cleanup
- Query across partitions
- Startup gap detection

## ⚠️ Testing Mode
- Main database deletion DISABLED
- Safe to test without data loss
- Partitions created successfully

## 🚀 Next Steps
- Verify partition integrity
- Enable main DB deletion in phases
- Monitor query performance

## 📊 Current Statistics
- Main DB: 76 MB (unchanged)
- Partitions created: X
- WAL/SHM files: Cleaned automatically
```

---

## 🔧 How to Apply Updates

1. **Create backup** of all 4 docs
2. **Update one document at a time**
3. **Test any code examples** mentioned in docs
4. **Cross-reference** between documents
5. **Add "Last Updated" dates** to each file

---

*Summary created: November 2, 2025*
*Documents analyzed: 4*
*Update priority: High*
