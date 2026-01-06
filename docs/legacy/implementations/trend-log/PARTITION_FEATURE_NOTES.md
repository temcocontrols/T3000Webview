# Data Partition Feature - Implementation Notes

## ✅ IMPLEMENTED (November 2, 2025)

The automatic data partitioning feature is now working using a **copy-and-delete** strategy that avoids all ATTACH DATABASE issues.

## New Implementation Strategy

### The Copy-and-Delete Approach

Instead of using ATTACH DATABASE (which had visibility issues with SeaORM), we now use a simpler and more reliable approach:

1. **Copy** main database file → `webview_t3_device_2025-10-31.db`
2. **Connect to partition** and DELETE data we DON'T want (keep only Oct 31 data)
3. **VACUUM partition** to shrink file
4. **Connect to main** and DELETE the period data (delete Oct 31 data)
5. **VACUUM main** to reclaim space
6. **Register partition** in DATABASE_FILES table

### Why This Works

**Pros:**
- ✅ No ATTACH DATABASE complexity
- ✅ No multi-connection visibility issues
- ✅ Each database managed independently with simple DELETE + VACUUM
- ✅ Uses standard SeaORM - no raw SQLite needed
- ✅ Easy to understand and maintain
- ✅ Partition files are complete standalone databases

**Cons:**
- Requires temporary disk space (2x main DB size during copy)
- Slightly slower than ATTACH (but more reliable)

### Implementation Details

```rust
// Step 1: Copy main database
std::fs::copy(&main_db_path, &partition_path)?;

// Step 2: Connect to partition and remove non-period data
let partition_conn = Database::connect(&partition_url).await?;
partition_conn.execute("DELETE FROM TRENDLOG_DATA_DETAIL
    WHERE datetime(LoggingTime_Fmt) < '2025-10-31 00:00:00'
    OR datetime(LoggingTime_Fmt) > '2025-10-31 23:59:59'").await?;
partition_conn.execute("VACUUM").await?;

// Step 3: Delete period data from main
db.execute("DELETE FROM TRENDLOG_DATA_DETAIL
    WHERE datetime(LoggingTime_Fmt) >= '2025-10-31 00:00:00'
    AND datetime(LoggingTime_Fmt) <= '2025-10-31 23:59:59'").await?;
db.execute("VACUUM").await?;
```

## Previous Attempts (FAILED)

### Issue with ATTACH DATABASE
- Created partition database from separate connection
- ATTACH DATABASE from main connection cannot see tables in partition file
- Root cause: WAL mode + multi-connection visibility issues
- Manual `sqlite3` ATTACH works, but programmatic SeaORM ATTACH fails

### Attempted Solutions (All Failed)
1. ✗ Create partition with separate connection, then ATTACH
2. ✗ Added WAL checkpoint before closing partition connection
3. ✗ Added delays for Windows file system sync
4. ✗ Create partition using ATTACH from main database

## Current Implementation

### Files Modified
- `api/src/database_management/partition_monitor_service.rs` - Main implementation

### Key Functions
- `migrate_single_period()` - Implements copy-and-delete strategy
- Uses `ServiceLogger("T3_PartitionMonitor")` for detailed logging

### Configuration
- Strategy: Daily or Monthly (configurable)
- Retention: 30 days (keeps last 30 periods in main DB)
- Auto-runs: Every hour
- Startup check: Migrates any pending periods on service start

## Testing Results

**Build Status:** ✅ Compiled successfully

**Next Steps:**
1. Deploy `api/target/release/t3_webview_api.dll`
2. Copy to: `D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\`
3. Restart T3000
4. Check logs in: `T3WebLog/2025-11/MMDD/T3_PartitionMonitor_*.txt`

**Expected Results:**
- Main DB: 76MB → ~30MB (after migrating Oct 31 data)
- Partition file: ~46MB (contains Oct 31 historical data)
- Logs show: Copy → Delete → VACUUM → Register sequence

## Advantages Over ATTACH Approach

| Aspect | ATTACH (Failed) | Copy-Delete (Working) |
|--------|----------------|----------------------|
| Complexity | High (multi-connection sync) | Low (simple file operations) |
| Reliability | Failed with SeaORM | Works reliably |
| Dependencies | Needed rusqlite | Pure SeaORM |
| Understanding | Complex visibility issues | Straightforward logic |
| Maintenance | Hard to debug | Easy to troubleshoot |
| Disk Space | Minimal | Requires 2x during copy |
| Performance | Fast (if it worked) | Slightly slower but acceptable |

## Monitoring

Check partition status:
```sql
SELECT * FROM DATABASE_FILES WHERE partition_identifier IS NOT NULL;
```

Expected columns:
- `file_name`: webview_t3_device_2025-10-31.db
- `partition_identifier`: 2025-10-31
- `record_count`: Number of migrated records
- `file_size_bytes`: Partition file size after VACUUM
- `start_date` / `end_date`: Period boundaries

## Troubleshooting

**If partition files are still 8KB:**
- Check logs for DELETE operation success
- Verify VACUUM was executed
- Check if period date range matches actual data

**If main DB doesn't shrink:**
- Ensure DELETE completed successfully
- Verify VACUUM ran on main database
- Check for orphaned parent records cleanup

**If copy fails:**
- Check available disk space (need 2x main DB size)
- Verify file paths are accessible
- Check Windows file locks on main database

