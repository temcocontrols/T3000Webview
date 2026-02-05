use crate::db_connection::establish_t3_device_connection;
use crate::entity::database_files;
use crate::entity::database_partition_config;
use crate::database_management::DatabaseConfigService;
use crate::error::Result;
use crate::logger::ServiceLogger;
use crate::constants::get_t3000_database_path;
use sea_orm::*;
use chrono::{Utc, NaiveDate, Datelike, Duration};

/// Start background partition monitor service (checks every hour)
pub async fn start_partition_monitor_service() -> Result<()> {
    // Spawn hourly partition migration task
    tokio::spawn(async {
        let mut logger = match ServiceLogger::new("T3_PartitionMonitor") {
            Ok(l) => l,
            Err(e) => {
                // Logger creation failed during bootstrap - fall back to stderr
                eprintln!("Failed to create partition monitor logger: {}", e);
                return;
            }
        };

        logger.info("🚀 Starting partition monitor service (checks every hour)");

        loop {
            // Sleep for 1 hour
            tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;

            logger.info("🔍 Hourly partition check triggered");

            match check_and_migrate_if_needed().await {
                Ok(migrated) => {
                    if migrated {
                        logger.info("✅ Period transition detected and data migrated");
                    } else {
                        logger.info("✅ No migration needed - still in current period");
                    }
                }
                Err(e) => {
                    logger.error(&format!("❌ Partition check failed: {}", e));
                }
            }
        }
    });

    // Spawn periodic WAL/SHM cleanup task (every 5 minutes)
    tokio::spawn(async {
        use crate::logger::{write_structured_log_with_level, LogLevel};

        // Initial delay to let system stabilize
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;

        let _ = write_structured_log_with_level(
            "T3_PartitionMonitor",
            "🧹 Starting periodic WAL/SHM cleanup task (every 5 minutes)",
            LogLevel::Info
        );

        loop {
            // Sleep for 5 minutes
            tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;

            // Try to clean up WAL/SHM files
            cleanup_partition_wal_shm_files();
        }
    });

    // Spawn database size monitor task (checks every hour)
    tokio::spawn(async {
        use crate::logger::{write_structured_log_with_level, LogLevel};

        // Initial delay to let system stabilize
        tokio::time::sleep(tokio::time::Duration::from_secs(120)).await;

        let _ = write_structured_log_with_level(
            "T3_DatabaseSizeMonitor",
            "📊 Starting database size monitor (checks every hour)",
            LogLevel::Info
        );

        loop {
            // Sleep for 1 hour
            tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;

            // Check database size and create partition if needed
            match check_and_partition_by_size().await {
                Ok(created) => {
                    if created {
                        let _ = write_structured_log_with_level(
                            "T3_DatabaseSizeMonitor",
                            "✅ Size-based partition created successfully",
                            LogLevel::Info
                        );
                    }
                }
                Err(e) => {
                    let _ = write_structured_log_with_level(
                        "T3_DatabaseSizeMonitor",
                        &format!("⚠️ Database size check failed: {}", e),
                        LogLevel::Error
                    );
                }
            }
        }
    });

    Ok(())
}

/// Check on startup for any missing partitions (called with 10s delay after T3000 starts)
pub async fn check_startup_migrations() -> Result<()> {
    let mut logger = ServiceLogger::new("T3_PartitionMonitor")
        .unwrap_or_else(|_| ServiceLogger::new("fallback_partition").unwrap());

    logger.info("Checking for pending partition migrations on startup...");

    // First, clean up any orphaned WAL/SHM files for partition databases
    cleanup_partition_wal_shm_files();

    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;
    let config = DatabaseConfigService::get_config(&db).await?;

    if !config.is_active {
        logger.info("Partitioning is disabled - skipping migration check");
        return Ok(());
    }

    logger.info(&format!("Partition strategy: {:?}", config.strategy));

    // Check database size on startup - handle case where T3000 was off for long time
    logger.info("Checking database size on startup...");
    match check_and_partition_by_size().await {
        Ok(created) => {
            if created {
                logger.info("Size-based partition created on startup");
            } else {
                logger.info("Database size is within limit");
            }
        }
        Err(e) => {
            logger.warn(&format!("Startup size check failed: {}", e));
        }
    }

    // Get current date
    let current_date = Utc::now().date_naive();
    logger.info(&format!("Current date: {}", current_date));

    // Query DATABASE_FILES table for existing partitions
    let existing_partitions = database_files::Entity::find()
        .filter(database_files::Column::PartitionIdentifier.is_not_null())
        .filter(database_files::Column::IsActive.eq(false)) // Partitions are inactive
        .order_by_asc(database_files::Column::StartDate)
        .all(&db)
        .await?;

    logger.info(&format!("Found {} existing partition records", existing_partitions.len()));

    // Determine what needs to be migrated
    let periods_to_migrate = if existing_partitions.is_empty() {
        // DATABASE_FILES is empty - add 1 missing period (yesterday)
        logger.info("No partition records found - will migrate 1 previous period");
        vec![calculate_previous_period(&config, current_date)]
    } else {
        // DATABASE_FILES has records - find gaps between last partition and current date
        let last_partition_date = existing_partitions
            .last()
            .and_then(|p| p.end_date)
            .map(|dt| dt.date())
            .unwrap_or_else(|| current_date.pred_opt().unwrap());

        logger.info(&format!("Last partition date: {}", last_partition_date));

        // Generate all missing periods between last partition and current date
        generate_missing_periods(&config, last_partition_date, current_date)
    };

    if periods_to_migrate.is_empty() {
        logger.info("No migration needed - partitions are up to date");
        return Ok(());
    }

    logger.info(&format!("Need to migrate {} periods", periods_to_migrate.len()));

    // Migrate each missing period
    for (index, period_date) in periods_to_migrate.iter().enumerate() {
        let partition_id = generate_partition_identifier(&config, period_date);
        logger.info(&format!("Migrating period {}/{}: {} ({})",
                 index + 1, periods_to_migrate.len(), period_date, partition_id));

        match migrate_single_period(&db, &config, &partition_id, *period_date).await {
            Ok(count) => {
                logger.info(&format!("Migrated {} records for period {}", count, partition_id));
            }
            Err(e) => {
                logger.error(&format!("Failed to migrate period {}: {}", partition_id, e));
                // Continue with next period instead of failing completely
            }
        }
    }

    logger.info("Startup migration check completed");
    Ok(())
}

/// Check if current date crossed a period boundary and migrate if needed (called hourly)
async fn check_and_migrate_if_needed() -> Result<bool> {
    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;
    let config = DatabaseConfigService::get_config(&db).await?;

    if !config.is_active {
        return Ok(false); // Partitioning disabled
    }

    let current_date = Utc::now().date_naive();

    // Get last partition date
    let last_partition = database_files::Entity::find()
        .filter(database_files::Column::PartitionIdentifier.is_not_null())
        .filter(database_files::Column::IsActive.eq(false))
        .order_by_desc(database_files::Column::EndDate)
        .one(&db)
        .await?;

    let last_partition_date = last_partition
        .and_then(|p| p.end_date)
        .map(|dt| dt.date())
        .unwrap_or_else(|| calculate_previous_period(&config, current_date));

    // Check if we need to migrate based on strategy
    let should_migrate = match config.strategy {
        database_partition_config::PartitionStrategy::Daily => {
            // If last partition is 2025-10-24 and today is 2025-10-26,
            // we need to migrate 2025-10-25
            last_partition_date < current_date.pred_opt().unwrap()
        }
        database_partition_config::PartitionStrategy::Weekly => {
            // Check if we crossed Sunday -> Monday boundary
            let current_week = current_date.iso_week();
            let last_week = last_partition_date.iso_week();
            current_week.week() != last_week.week() || current_week.year() != last_week.year()
        }
        database_partition_config::PartitionStrategy::Monthly => {
            // Check if we're in a new month
            current_date.month() != last_partition_date.month() ||
            current_date.year() != last_partition_date.year()
        }
        _ => false
    };

    if should_migrate {
        let periods = generate_missing_periods(&config, last_partition_date, current_date);
        for period_date in periods {
            let partition_id = generate_partition_identifier(&config, &period_date);
            migrate_single_period(&db, &config, &partition_id, period_date).await?;
        }
        return Ok(true);
    }

    Ok(false)
}

/// Calculate the previous period based on strategy
fn calculate_previous_period(
    config: &database_partition_config::DatabasePartitionConfig,
    current_date: NaiveDate,
) -> NaiveDate {
    match config.strategy {
        database_partition_config::PartitionStrategy::Daily => {
            // Previous day (2025-10-25 if current is 2025-10-26)
            current_date.pred_opt().unwrap()
        }
        database_partition_config::PartitionStrategy::Weekly => {
            // Previous Monday (start of previous week)
            let days_from_monday = current_date.weekday().num_days_from_monday() as i64;
            let this_week_start = current_date - Duration::days(days_from_monday);
            this_week_start - Duration::days(7) // Previous week's Monday
        }
        database_partition_config::PartitionStrategy::Monthly => {
            // First day of previous month
            if current_date.month() == 1 {
                NaiveDate::from_ymd_opt(current_date.year() - 1, 12, 1).unwrap()
            } else {
                NaiveDate::from_ymd_opt(current_date.year(), current_date.month() - 1, 1).unwrap()
            }
        }
        _ => current_date.pred_opt().unwrap()
    }
}

/// Generate all missing periods between last_partition_date and current_date
fn generate_missing_periods(
    config: &database_partition_config::DatabasePartitionConfig,
    last_partition_date: NaiveDate,
    current_date: NaiveDate,
) -> Vec<NaiveDate> {
    let mut periods = Vec::new();

    match config.strategy {
        database_partition_config::PartitionStrategy::Daily => {
            // Generate each day between last and current (excluding current)
            let mut date = last_partition_date.succ_opt().unwrap();
            while date < current_date {
                periods.push(date);
                date = date.succ_opt().unwrap();
            }
        }
        database_partition_config::PartitionStrategy::Weekly => {
            // Generate each week's Monday between last and current
            let mut week_start = last_partition_date;
            loop {
                week_start = week_start + Duration::days(7);

                // Check if this week has already started
                let current_week_start = current_date - Duration::days(
                    current_date.weekday().num_days_from_monday() as i64
                );

                if week_start >= current_week_start {
                    break; // Don't migrate current week
                }

                periods.push(week_start);
            }
        }
        database_partition_config::PartitionStrategy::Monthly => {
            // Generate each month's 1st day between last and current
            let mut month_date = last_partition_date;
            loop {
                // Move to next month
                month_date = if month_date.month() == 12 {
                    NaiveDate::from_ymd_opt(month_date.year() + 1, 1, 1).unwrap()
                } else {
                    NaiveDate::from_ymd_opt(month_date.year(), month_date.month() + 1, 1).unwrap()
                };

                // Check if this month has started
                if month_date.year() > current_date.year() ||
                   (month_date.year() == current_date.year() && month_date.month() >= current_date.month()) {
                    break; // Don't migrate current month
                }

                periods.push(month_date);
            }
        }
        _ => {}
    }

    periods
}

/// Generate partition identifier based on strategy and date
fn generate_partition_identifier(
    config: &database_partition_config::DatabasePartitionConfig,
    date: &NaiveDate,
) -> String {
    match config.strategy {
        database_partition_config::PartitionStrategy::Daily => {
            date.format("%Y-%m-%d").to_string()
        }
        database_partition_config::PartitionStrategy::Weekly => {
            format!("{}-W{:02}", date.format("%Y"), date.iso_week().week())
        }
        database_partition_config::PartitionStrategy::Monthly => {
            date.format("%Y-%m").to_string()
        }
        _ => date.format("%Y-%m-%d").to_string()
    }
}

/// Calculate exact start and end datetime for a period
fn calculate_period_boundaries(
    config: &database_partition_config::DatabasePartitionConfig,
    period_date: NaiveDate,
) -> (chrono::NaiveDateTime, chrono::NaiveDateTime) {
    match config.strategy {
        database_partition_config::PartitionStrategy::Daily => {
            // Daily: 2025-10-25 00:00:00 to 2025-10-25 23:59:59
            let start = period_date.and_hms_opt(0, 0, 0).unwrap();
            let end = period_date.and_hms_opt(23, 59, 59).unwrap();
            (start, end)
        }
        database_partition_config::PartitionStrategy::Weekly => {
            // Weekly: Monday 00:00:00 to Sunday 23:59:59
            let days_from_monday = period_date.weekday().num_days_from_monday() as i64;
            let week_start = period_date - Duration::days(days_from_monday);
            let week_end = week_start + Duration::days(6);
            (week_start.and_hms_opt(0, 0, 0).unwrap(),
             week_end.and_hms_opt(23, 59, 59).unwrap())
        }
        database_partition_config::PartitionStrategy::Monthly => {
            // Monthly: 1st 00:00:00 to last day 23:59:59
            let month_start = NaiveDate::from_ymd_opt(
                period_date.year(),
                period_date.month(),
                1
            ).unwrap();
            let month_end = if period_date.month() == 12 {
                NaiveDate::from_ymd_opt(period_date.year() + 1, 1, 1).unwrap()
                    .pred_opt().unwrap()
            } else {
                NaiveDate::from_ymd_opt(period_date.year(), period_date.month() + 1, 1).unwrap()
                    .pred_opt().unwrap()
            };
            (month_start.and_hms_opt(0, 0, 0).unwrap(),
             month_end.and_hms_opt(23, 59, 59).unwrap())
        }
        _ => {
            let start = period_date.and_hms_opt(0, 0, 0).unwrap();
            let end = period_date.and_hms_opt(23, 59, 59).unwrap();
            (start, end)
        }
    }
}

/// Migrate a single completed period to its partition file
async fn migrate_single_period(
    db: &DatabaseConnection,
    config: &database_partition_config::DatabasePartitionConfig,
    partition_id: &str,
    period_date: NaiveDate,
) -> Result<u64> {
    // Create logger for detailed partition logging
    let mut logger = ServiceLogger::new("T3_PartitionMonitor")
        .map_err(|e| crate::error::Error::ServerError(format!("Logger creation failed: {}", e)))?;

    logger.info(&format!("🔨 Creating partition: {}", partition_id));

    // Step 1: Calculate date range for this period
    let (start_date, end_date) = calculate_period_boundaries(config, period_date);
    logger.info(&format!("📅 Period boundaries: {} to {}", start_date, end_date));

    // Step 2: Copy main database to create partition file
    let runtime_path = get_t3000_database_path();
    let main_db_path = runtime_path.join("webview_t3_device.db");
    let partition_file_name = format!("webview_t3_device_{}.db", partition_id);
    let partition_path = runtime_path.join(&partition_file_name);

    logger.info(&format!("📁 Creating partition by copying main database"));
    logger.info(&format!("   Source: {}", main_db_path.display()));
    logger.info(&format!("   Destination: {}", partition_path.display()));

    // Copy the main database file to partition location
    std::fs::copy(&main_db_path, &partition_path)
        .map_err(|e| crate::error::Error::ServerError(format!("Failed to copy database: {}", e)))?;

    let copied_size = std::fs::metadata(&partition_path)
        .map(|m| m.len())
        .unwrap_or(0);
    logger.info(&format!("✅ Database copied: {} bytes", copied_size));

    // Step 3: Connect to partition database and delete data we DON'T want (keep only this period's data)
    logger.info("🔗 Connecting to partition database to clean up non-period data");
    let partition_db_url = format!("sqlite://{}?mode=rwc", partition_path.display());
    let partition_conn = sea_orm::Database::connect(&partition_db_url).await
        .map_err(|e| crate::error::Error::ServerError(format!("Failed to connect to partition: {}", e)))?;

    // Delete all data OUTSIDE the target period from partition (keep only period data)
    logger.info(&format!("🗑️ Deleting non-period data from partition (keeping {} to {})", start_date, end_date));

    let delete_partition_detail_sql = format!(
        r#"
        DELETE FROM TRENDLOG_DATA_DETAIL
        WHERE datetime(LoggingTime_Fmt) < datetime('{}')
        OR datetime(LoggingTime_Fmt) > datetime('{}')
        "#,
        start_date.format("%Y-%m-%d %H:%M:%S"),
        end_date.format("%Y-%m-%d %H:%M:%S")
    );

    let partition_delete_result = partition_conn.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        delete_partition_detail_sql
    )).await?;

    let partition_deleted = partition_delete_result.rows_affected();
    logger.info(&format!("✅ Deleted {} non-period DETAIL records from partition", partition_deleted));

    // NOTE: We keep ALL TRENDLOG_DATA parent records (no orphan cleanup)
    // This ensures partition has complete device/point metadata
    logger.info("ℹ️ Keeping all TRENDLOG_DATA parent records in partition");

    // Count remaining records in partition (this is what we migrated)
    let count_sql = "SELECT COUNT(*) as count FROM TRENDLOG_DATA_DETAIL";
    let count_result: Option<i64> = partition_conn.query_one(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        count_sql.to_string()
    ))
    .await?
    .and_then(|row| row.try_get("", "count").ok());

    let migrated_count = count_result.unwrap_or(0) as u64;
    logger.info(&format!("📊 Partition contains {} period DETAIL records", migrated_count));

    // VACUUM partition to reclaim space
    logger.info("🧹 Running VACUUM on partition database to reclaim space");
    partition_conn.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "VACUUM".to_string()
    )).await?;

    partition_conn.close().await.ok();

    // Small delay to ensure connection is fully closed
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Check if partition has any data - skip if empty
    if migrated_count == 0 {
        logger.warn(&format!("⚠️ No data found for period {} - skipping partition creation", partition_id));
        logger.info("🗑️ Removing empty partition file");

        // Remove the empty partition file
        if let Err(e) = std::fs::remove_file(&partition_path) {
            logger.warn(&format!("⚠️ Could not remove empty partition file: {}", e));
        } else {
            logger.info("✅ Empty partition file removed");
        }

        // Also clean up any WAL/SHM files
        let wal_path = partition_path.with_extension("db-wal");
        let shm_path = partition_path.with_extension("db-shm");

        if wal_path.exists() {
            std::fs::remove_file(&wal_path).ok();
        }
        if shm_path.exists() {
            std::fs::remove_file(&shm_path).ok();
        }

        logger.info("ℹ️ Partition creation skipped - no data for this period");
        return Ok(0);
    }

    // Get partition file size after VACUUM
    let partition_size = std::fs::metadata(&partition_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let partition_size_mb = (partition_size as f64 / 1024.0 / 1024.0).round() as i32;
    logger.info(&format!("✅ Partition size after VACUUM: {} MB ({} bytes)", partition_size_mb, partition_size));

    // Clean up WAL and SHM files if they still exist
    let wal_path = partition_path.with_extension("db-wal");
    let shm_path = partition_path.with_extension("db-shm");

    if wal_path.exists() {
        if let Err(e) = std::fs::remove_file(&wal_path) {
            logger.warn(&format!("⚠️ Could not remove .db-wal file: {}", e));
        } else {
            logger.info("🧹 Removed .db-wal file");
        }
    }

    if shm_path.exists() {
        if let Err(e) = std::fs::remove_file(&shm_path) {
            logger.warn(&format!("⚠️ Could not remove .db-shm file: {}", e));
        } else {
            logger.info("🧹 Removed .db-shm file");
        }
    }

    // Step 4: Delete period data from main database (COMMENTED OUT FOR TESTING)
    // TODO: Uncomment this section when ready to actually remove old data from main DB
    logger.info("⚠️ Skipping deletion from main database (commented out for testing)");

    /*
    logger.info(&format!("🗑️ Deleting period data from main database ({} to {})", start_date, end_date));

    let delete_main_detail_sql = format!(
        r#"
        DELETE FROM TRENDLOG_DATA_DETAIL
        WHERE datetime(LoggingTime_Fmt) >= datetime('{}')
        AND datetime(LoggingTime_Fmt) <= datetime('{}')
        "#,
        start_date.format("%Y-%m-%d %H:%M:%S"),
        end_date.format("%Y-%m-%d %H:%M:%S")
    );

    let main_delete_result = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        delete_main_detail_sql
    )).await?;

    logger.info(&format!("✅ Deleted {} period records from main database", main_delete_result.rows_affected()));

    // Clean up orphaned parent records in main database
    let delete_main_orphans_sql = r#"
        DELETE FROM TRENDLOG_DATA
        WHERE id NOT IN (SELECT DISTINCT ParentId FROM TRENDLOG_DATA_DETAIL)
    "#;

    let main_orphan_result = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        delete_main_orphans_sql.to_string()
    )).await?;

    logger.info(&format!("✅ Cleaned up {} orphaned parent records from main database", main_orphan_result.rows_affected()));

    // VACUUM main database to reclaim space
    logger.info("🧹 Running VACUUM on main database to reclaim space");
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "VACUUM".to_string()
    )).await?;

    let main_size_after = std::fs::metadata(&main_db_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let main_size_mb = (main_size_after as f64 / 1024.0 / 1024.0).round() as i32;
    logger.info(&format!("✅ Main database size after VACUUM: {} MB", main_size_mb));
    */

    // Step 5: Register partition in DATABASE_FILES table
    logger.info("📝 Registering partition in DATABASE_FILES table");

    let file_size = std::fs::metadata(&partition_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    let new_file = database_files::ActiveModel {
        file_name: Set(partition_file_name),
        file_path: Set(partition_path.to_string_lossy().to_string()),
        partition_identifier: Set(Some(partition_id.to_string())),
        file_size_bytes: Set(file_size),
        record_count: Set(migrated_count as i64),
        start_date: Set(Some(start_date)),
        end_date: Set(Some(end_date)),
        is_active: Set(false), // Partitions are not active for new inserts
        is_archived: Set(false),
        created_at: Set(Utc::now().naive_utc()),
        last_accessed_at: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    new_file.insert(db).await?;

    logger.info(&format!("✅ Partition {} registered in DATABASE_FILES", partition_id));
    logger.info(&format!("🎉 Migration complete: {} records, {} MB partition (main DB unchanged for testing)",
        migrated_count, partition_size_mb));

    Ok(migrated_count)
}

/// Clean up orphaned WAL and SHM files for partition databases
fn cleanup_partition_wal_shm_files() {
    use crate::logger::{write_structured_log_with_level, LogLevel};

    let runtime_path = get_t3000_database_path();

    let _ = write_structured_log_with_level(
        "T3_PartitionMonitor",
        "🧹 Cleaning up orphaned WAL/SHM files for partition databases...",
        LogLevel::Info
    );

    // Find all partition database files (matching pattern webview_t3_device_YYYY-MM-DD.db)
    if let Ok(entries) = std::fs::read_dir(&runtime_path) {
        let mut cleaned_count = 0;
        let mut failed_count = 0;

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

            // Check if this is a partition database (has date pattern)
            if file_name.starts_with("webview_t3_device_")
                && file_name.ends_with(".db")
                && file_name.contains("-") // Date separator
                && file_name != "webview_t3_device.db" // Not the main DB
            {
                // Try to remove associated WAL file
                let wal_path = path.with_extension("db-wal");
                if wal_path.exists() {
                    match std::fs::remove_file(&wal_path) {
                        Ok(_) => {
                            let msg = format!("   🗑️ Removed: {}", wal_path.file_name().unwrap().to_string_lossy());
                            let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Info);
                            cleaned_count += 1;
                        }
                        Err(e) => {
                            let msg = format!("   ⚠️ Could not remove {}: {}", wal_path.file_name().unwrap().to_string_lossy(), e);
                            let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Warn);
                            failed_count += 1;
                        }
                    }
                }

                // Try to remove associated SHM file
                let shm_path = path.with_extension("db-shm");
                if shm_path.exists() {
                    match std::fs::remove_file(&shm_path) {
                        Ok(_) => {
                            let msg = format!("   🗑️ Removed: {}", shm_path.file_name().unwrap().to_string_lossy());
                            let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Info);
                            cleaned_count += 1;
                        }
                        Err(e) => {
                            let msg = format!("   ⚠️ Could not remove {}: {}", shm_path.file_name().unwrap().to_string_lossy(), e);
                            let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Warn);
                            failed_count += 1;
                        }
                    }
                }
            }
        }

        if cleaned_count > 0 {
            let msg = format!("✅ Cleaned up {} orphaned WAL/SHM file(s)", cleaned_count);
            let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Info);
        } else if failed_count == 0 {
            let _ = write_structured_log_with_level(
                "T3_PartitionMonitor",
                "✅ No orphaned WAL/SHM files found",
                LogLevel::Info
            );
        }

        if failed_count > 0 {
            let msg = format!("⏳ {} WAL/SHM file(s) still in use - will retry in 5 minutes", failed_count);
            let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Info);
        }
    } else {
        let msg = format!("⚠️ Could not read database directory: {}", runtime_path.display());
        let _ = write_structured_log_with_level("T3_PartitionMonitor", &msg, LogLevel::Error);
    }
}

/// Check database size and create partition if exceeds max_file_size
async fn check_and_partition_by_size() -> Result<bool> {
    use crate::logger::{write_structured_log_with_level, LogLevel};
    use rusqlite::Connection;
    use chrono::NaiveDateTime;

    let runtime_path = get_t3000_database_path();
    let db_path = runtime_path.join("webview_t3_device.db");

    // Read max file size from APPLICATION_CONFIG (default 2048 MB)
    let max_file_size_mb = match Connection::open(&db_path) {
        Ok(conn) => {
            match conn.query_row(
                "SELECT config_value FROM APPLICATION_CONFIG WHERE config_key = 'database.max_file_size'",
                [],
                |row| row.get::<_, String>(0)
            ) {
                Ok(value_str) => value_str.parse::<i64>().unwrap_or(2048),
                Err(_) => 2048
            }
        },
        Err(_) => 2048
    };

    // Get current file size in MB
    let file_size_mb = match std::fs::metadata(&db_path) {
        Ok(metadata) => (metadata.len() / 1024 / 1024) as i64,
        Err(e) => {
            let msg = format!("⚠️ Cannot read database file size: {}", e);
            let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Error);
            return Ok(false);
        }
    };

    // Calculate percentage
    let percentage = (file_size_mb as f64 / max_file_size_mb as f64 * 100.0) as i32;

    // Log size information
    let msg = format!(
        "📊 Database size: {} MB / {} MB ({}%)",
        file_size_mb, max_file_size_mb, percentage
    );
    let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Info);

    // Check if size exceeded
    if file_size_mb <= max_file_size_mb {
        if percentage >= 80 {
            let msg = format!(
                "⚠️ Database approaching size limit ({}%). Partition will be auto-created at 100%.",
                percentage
            );
            let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
        }
        return Ok(false);
    }

    // Size exceeded - check if MULTIPLE partitions needed (e.g., 6GB DB needs 3x 2GB partitions)
    let times_over_limit = (file_size_mb as f64 / max_file_size_mb as f64).ceil() as i32;

    if times_over_limit > 1 {
        let msg = format!(
            "⚠️ DATABASE SEVERELY EXCEEDED! {} MB is {}x over {} MB limit. Will create ONE partition per period as per split config.",
            file_size_mb, times_over_limit, max_file_size_mb
        );
        let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
    } else {
        let msg = format!(
            "⚠️ DATABASE SIZE EXCEEDED! {} MB > {} MB. Creating partition...",
            file_size_mb, max_file_size_mb
        );
        let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
    }

    // Get database connection and config
    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;

    let config = DatabaseConfigService::get_config(&db).await?;

    if !config.is_active {
        let _ = write_structured_log_with_level(
            "T3_DatabaseSizeMonitor",
            "⚠️ Partitioning is disabled. Cannot auto-partition. Please enable partitioning or increase max_file_size.",
            LogLevel::Warn
        );
        return Ok(false);
    }

    // Determine the base period identifier based on strategy
    let current_date = Utc::now().date_naive();
    let base_period_id = match config.strategy {
        database_partition_config::PartitionStrategy::Monthly => {
            current_date.format("%Y-%m").to_string()
        }
        database_partition_config::PartitionStrategy::Weekly => {
            format!("{}-W{:02}", current_date.format("%Y"), current_date.iso_week().week())
        }
        database_partition_config::PartitionStrategy::Daily => {
            current_date.format("%Y-%m-%d").to_string()
        }
        database_partition_config::PartitionStrategy::Quarterly => {
            let quarter = (current_date.month() - 1) / 3 + 1;
            format!("{}-Q{}", current_date.year(), quarter)
        }
        _ => current_date.format("%Y-%m").to_string()
    };

    // Find the next sequence number for this period
    let existing_partitions = database_files::Entity::find()
        .filter(database_files::Column::PartitionIdentifier.like(&format!("{}_%", base_period_id)))
        .all(&db)
        .await?;

    let next_sequence = if existing_partitions.is_empty() {
        1
    } else {
        // Find max sequence number and increment
        let max_seq = existing_partitions.iter()
            .filter_map(|p| {
                p.partition_identifier.as_ref()
                    .and_then(|id| id.split('_').last())
                    .and_then(|seq| seq.parse::<i32>().ok())
            })
            .max()
            .unwrap_or(0);
        max_seq + 1
    };

    let partition_id = format!("{}_{:02}", base_period_id, next_sequence);
    let partition_file_name = format!("webview_t3_device_{}.db", partition_id);
    let partition_path = runtime_path.join(&partition_file_name);

    let msg = format!(
        "🔄 Creating size-based partition: {} (sequence {}/{} for this period, size: {} MB)",
        partition_id, next_sequence, existing_partitions.len() + 1, file_size_mb
    );
    let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Info);

    // Step 1: Copy entire main database to partition file
    let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", "📋 Copying main database to partition file...", LogLevel::Info);

    if let Err(e) = std::fs::copy(&db_path, &partition_path) {
        let msg = format!("❌ Failed to copy database: {}", e);
        let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Error);
        return Err(crate::error::Error::ServerError(msg));
    }

    // Validate the copied file is not empty or corrupted
    match std::fs::metadata(&partition_path) {
        Ok(metadata) => {
            let copied_size = metadata.len();
            if copied_size == 0 {
                let msg = "❌ Copied database file is 0 bytes! Copy operation failed.";
                let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", msg, LogLevel::Error);
                // Clean up the invalid file
                let _ = std::fs::remove_file(&partition_path);
                return Err(crate::error::Error::ServerError(msg.to_string()));
            }
            // Verify file is at least 50% of original size (sanity check)
            let original_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
            if copied_size < original_size / 2 {
                let msg = format!(
                    "❌ Copied database file is suspiciously small ({} bytes vs {} bytes original). Possible corruption.",
                    copied_size, original_size
                );
                let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Error);
                // Clean up the suspicious file
                let _ = std::fs::remove_file(&partition_path);
                return Err(crate::error::Error::ServerError(msg));
            }
            let msg = format!("✅ Database copied successfully ({:.2} MB)", copied_size as f64 / 1024.0 / 1024.0);
            let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Info);
        }
        Err(e) => {
            let msg = format!("❌ Cannot verify copied database file: {}", e);
            let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Error);
            // Clean up if file exists
            let _ = std::fs::remove_file(&partition_path);
            return Err(crate::error::Error::ServerError(msg));
        }
    }

    // Step 2: Get record count and date range from copied partition
    let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", "📊 Querying partition metadata...", LogLevel::Info);

    let (record_count, start_datetime, end_datetime) = match Connection::open(&partition_path) {
        Ok(conn) => {
            // Verify database integrity
            if let Err(e) = conn.execute("PRAGMA integrity_check", []) {
                let msg = format!("❌ Partition database integrity check failed: {}", e);
                let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Error);
                // Clean up corrupted file
                let _ = std::fs::remove_file(&partition_path);
                return Err(crate::error::Error::ServerError(msg));
            }

            let count = conn.query_row(
                "SELECT COUNT(*) FROM TRENDLOG_DATA_DETAIL",
                [],
                |row| row.get::<_, i64>(0)
            ).unwrap_or(0);

            let start = conn.query_row(
                "SELECT MIN(LoggingTime_Fmt) FROM TRENDLOG_DATA_DETAIL",
                [],
                |row| row.get::<_, String>(0)
            ).ok().and_then(|s| NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S").ok());

            let end = conn.query_row(
                "SELECT MAX(LoggingTime_Fmt) FROM TRENDLOG_DATA_DETAIL",
                [],
                |row| row.get::<_, String>(0)
            ).ok().and_then(|s| NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S").ok());

            (count, start, end)
        }
        Err(e) => {
            let msg = format!("❌ Cannot open partition database file (possibly corrupted): {}", e);
            let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Error);
            // Clean up corrupted file
            let _ = std::fs::remove_file(&partition_path);
            return Err(crate::error::Error::ServerError(msg));
        }
    };

    // Step 3: Clear main database (delete child data and sync metadata only)
    let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", "🗑️ Clearing main database (TRENDLOG_DATA_DETAIL & TRENDLOG_DATA_SYNC_METADATA)...", LogLevel::Info);

    match Connection::open(&db_path) {
        Ok(conn) => {
            if let Err(e) = conn.execute("DELETE FROM TRENDLOG_DATA_DETAIL", []) {
                let msg = format!("⚠️ Failed to clear TRENDLOG_DATA_DETAIL table: {}", e);
                let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
            }
            // Clear sync metadata table
            if let Err(e) = conn.execute("DELETE FROM TRENDLOG_DATA_SYNC_METADATA", []) {
                let msg = format!("⚠️ Failed to clear TRENDLOG_DATA_SYNC_METADATA table: {}", e);
                let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
            }
            // Run VACUUM to reclaim space
            if let Err(e) = conn.execute("VACUUM", []) {
                let msg = format!("⚠️ Failed to vacuum database: {}", e);
                let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
            }
        }
        Err(e) => {
            let msg = format!("⚠️ Failed to open main database for clearing: {}", e);
            let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Warn);
        }
    }

    // Step 4: Register partition in database_files table
    let file_size_bytes = match std::fs::metadata(&partition_path) {
        Ok(metadata) => metadata.len() as i64,
        Err(_) => 0
    };

    let new_file = database_files::ActiveModel {
        file_name: Set(partition_file_name.clone()),
        file_path: Set(partition_path.to_string_lossy().to_string()),
        file_size_bytes: Set(file_size_bytes),
        partition_identifier: Set(Some(partition_id.clone())),
        start_date: Set(start_datetime),
        end_date: Set(end_datetime),
        is_active: Set(false),
        is_archived: Set(false),
        record_count: Set(record_count),
        created_at: Set(Utc::now().naive_utc()),
        last_accessed_at: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    database_files::Entity::insert(new_file)
        .exec(&db)
        .await?;

    let msg = format!(
        "✅ Size-based partition created: {} ({} records, {:.2} MB). Main database cleared and ready for new data.",
        partition_id, record_count, file_size_bytes as f64 / 1024.0 / 1024.0
    );
    let _ = write_structured_log_with_level("T3_DatabaseSizeMonitor", &msg, LogLevel::Info);

    Ok(true)
}
