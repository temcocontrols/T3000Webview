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

    Ok(())
}

/// Check on startup for any missing partitions (called with 10s delay after T3000 starts)
pub async fn check_startup_migrations() -> Result<()> {
    println!("🔍 Checking for pending partition migrations on startup...");

    // First, clean up any orphaned WAL/SHM files for partition databases
    cleanup_partition_wal_shm_files();

    let db = establish_t3_device_connection().await
        .map_err(|e| crate::error::Error::ServerError(format!("Database connection failed: {}", e)))?;
    let config = DatabaseConfigService::get_config(&db).await?;

    if !config.is_active {
        println!("ℹ️ Partitioning is disabled - skipping migration check");
        return Ok(());
    }

    println!("📋 Partition strategy: {:?}", config.strategy);

    // Get current date
    let current_date = Utc::now().date_naive();
    println!("📅 Current date: {}", current_date);

    // Query DATABASE_FILES table for existing partitions
    let existing_partitions = database_files::Entity::find()
        .filter(database_files::Column::PartitionIdentifier.is_not_null())
        .filter(database_files::Column::IsActive.eq(false)) // Partitions are inactive
        .order_by_asc(database_files::Column::StartDate)
        .all(&db)
        .await?;

    println!("📁 Found {} existing partition records", existing_partitions.len());

    // Determine what needs to be migrated
    let periods_to_migrate = if existing_partitions.is_empty() {
        // DATABASE_FILES is empty - add 1 missing period (yesterday)
        println!("⚠️ No partition records found - will migrate 1 previous period");
        vec![calculate_previous_period(&config, current_date)]
    } else {
        // DATABASE_FILES has records - find gaps between last partition and current date
        let last_partition_date = existing_partitions
            .last()
            .and_then(|p| p.end_date)
            .map(|dt| dt.date())
            .unwrap_or_else(|| current_date.pred_opt().unwrap());

        println!("📊 Last partition date: {}", last_partition_date);

        // Generate all missing periods between last partition and current date
        generate_missing_periods(&config, last_partition_date, current_date)
    };

    if periods_to_migrate.is_empty() {
        println!("✅ No migration needed - partitions are up to date");
        return Ok(());
    }

    println!("🔄 Need to migrate {} periods", periods_to_migrate.len());

    // Migrate each missing period
    for (index, period_date) in periods_to_migrate.iter().enumerate() {
        let partition_id = generate_partition_identifier(&config, period_date);
        println!("📦 Migrating period {}/{}: {} ({})",
                 index + 1, periods_to_migrate.len(), period_date, partition_id);

        match migrate_single_period(&db, &config, &partition_id, *period_date).await {
            Ok(count) => {
                println!("✅ Migrated {} records for period {}", count, partition_id);
            }
            Err(e) => {
                println!("❌ Failed to migrate period {}: {}", partition_id, e);
                // Continue with next period instead of failing completely
            }
        }
    }

    println!("✅ Startup migration check completed");
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
