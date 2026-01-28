use lazy_static::lazy_static;
use migration::{Migrator, MigratorTrait};
use std::{env, fs, path::Path, sync::Arc};
use tokio::sync::{mpsc, Mutex};

use crate::db_connection::establish_connection;

// Define static references for environment variables using lazy_static.
lazy_static! {
    // DATABASE_URL is set from environment variable or defaults to a local SQLite database.
    pub static ref DATABASE_URL: String = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://Database/webview_database.db".to_string());
    // REMOTE_API_URL is set from environment variable or defaults to a given URL.
    pub static ref REMOTE_API_URL: String = env::var("REMOTE_API_URL")
        .unwrap_or_else(|_| "https://user-lib.temcocontrols.com".to_string());
    // SPA_DIR is set from environment variable or defaults to a local directory.
    pub static ref SPA_DIR: String =
        env::var("SPA_DIR").unwrap_or_else(|_| "./ResourceFile/webview/www".to_string());

    pub static ref SHUTDOWN_CHANNEL: Arc<Mutex<mpsc::Sender<()>>> = Arc::new(Mutex::new(mpsc::channel(1).0));
}

// Copies the database file to the destination if it does not already exist.
pub fn copy_database_if_not_exists() -> Result<(), Box<dyn std::error::Error>> {
    let source_db_path = Path::new("ResourceFile/webview_database.db"); // Source database file path.
    let destination_db_path = Path::new(
        DATABASE_URL
            .strip_prefix("sqlite://") // Remove the sqlite:// prefix to get the file path.
            .ok_or("Invalid database url")?,
    );

    let destination_dir = destination_db_path
        .parent() // Get the parent directory of the destination path.
        .ok_or("Invalid destination database path")?;

    // Create the destination directory if it doesn't exist.
    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
        crate::logger::write_structured_log_with_level("T3_Database_Migration", &format!("Created destination directory: {:?}", destination_dir), crate::logger::LogLevel::Info).ok();
    }

    // Copy the database file if it doesn't exist in the destination directory.
    if !destination_db_path.exists() {
        // Check if the source database file exists.
        if !source_db_path.exists() {
            return Err(From::from(format!(
                "Source database file does not exist: {:?}",
                source_db_path
            )));
        }
        // Copy the source database file to the destination.
        fs::copy(&source_db_path, &destination_db_path)?;
        crate::logger::write_structured_log("T3_Database_Migration", &format!("Copied database file from {:?} to {:?}", source_db_path, destination_db_path)).ok();
    }

    Ok(())
}

// Asynchronously runs the database migrations.
pub async fn run_migrations() -> Result<(), Box<dyn std::error::Error>> {
    let conn = establish_connection().await?; // Establish a database connection.
    Migrator::up(&conn, None).await?; // Run the migrations.
    drop(conn);
    Ok(())
}

// ============================================================================
// ABSTRACTED FUNCTIONS - All new functionality separated from original code
// ============================================================================

// Abstracted T3000 database URL configuration
lazy_static! {
    pub static ref T3_DEVICE_DATABASE_URL: String = env::var("T3_DEVICE_DATABASE_URL")
        .unwrap_or_else(|_| {
            let current_dir = env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = "sqlite://Database/webview_t3_device.db".to_string();
            let url = format!("{}", db_path);
            t3_enhanced_logging(&format!("Database URL (webview_t3_device): {}", url));
            t3_enhanced_logging(&format!("Current directory: {:?}", current_dir));
            t3_enhanced_logging(&format!("Database path (webview_t3_device): {:?}", db_path));
            url
        });
}

/// Abstracted enhanced logging for T3000 operations
pub fn t3_enhanced_logging(message: &str) {
    crate::logger::write_structured_log("T3_Database_Migration", &message).ok();
}

/// Check if a file is locked by another process
fn is_file_locked(path: &Path) -> bool {
    use std::fs::OpenOptions;

    // Try to open the file with write access
    match OpenOptions::new().write(true).open(path) {
        Ok(_) => false, // File is not locked
        Err(e) => {
            // Check if error is due to file being locked
            if let Some(os_error) = e.raw_os_error() {
                // Windows: ERROR_SHARING_VIOLATION (32) or ERROR_LOCK_VIOLATION (33)
                // Linux: EWOULDBLOCK (11) or EAGAIN (11)
                os_error == 32 || os_error == 33 || os_error == 11
            } else {
                false
            }
        }
    }
}

/// Format file size in human-readable format
fn format_file_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

/// Copy database file with retry logic and fast backoff
///
/// Attempts to copy a file with multiple retries if it fails.
/// Uses fast backoff optimized for small files (<1MB): 200ms, 500ms, 1s, 2s, 3s
///
/// Returns the number of bytes copied on success
fn copy_database_with_retry(
    source: &Path,
    destination: &Path,
    max_retries: u32,
) -> Result<u64, Box<dyn std::error::Error>> {
    use std::thread;
    use std::time::Duration;

    t3_enhanced_logging(&format!("🔄 Starting copy with retry (max {} attempts)...", max_retries));

    for attempt in 1..=max_retries {
        t3_enhanced_logging(&format!("   Attempt {}/{}", attempt, max_retries));

        // Check if source file is locked
        if is_file_locked(source) {
            t3_enhanced_logging(&format!("   ⚠️  Source file is locked by another process"));

            if attempt < max_retries {
                // Fast backoff for small files: 200ms, 500ms, 1000ms, 2000ms, 3000ms
                let delay_ms = match attempt {
                    1 => 200,
                    2 => 500,
                    3 => 1000,
                    4 => 2000,
                    _ => 3000,
                };
                t3_enhanced_logging(&format!("   ⏳ Waiting {} ms before retry...", delay_ms));
                thread::sleep(Duration::from_millis(delay_ms));
                continue;
            } else {
                return Err(From::from("Source file is locked after all retries"));
            }
        }

        // Check if destination is locked (if it exists)
        if destination.exists() && is_file_locked(destination) {
            t3_enhanced_logging(&format!("   ⚠️  Destination file is locked by another process"));

            if attempt < max_retries {
                // Fast backoff for small files: 200ms, 500ms, 1000ms, 2000ms, 3000ms
                let delay_ms = match attempt {
                    1 => 200,
                    2 => 500,
                    3 => 1000,
                    4 => 2000,
                    _ => 3000,
                };
                t3_enhanced_logging(&format!("   ⏳ Waiting {} ms before retry...", delay_ms));
                thread::sleep(Duration::from_millis(delay_ms));
                continue;
            } else {
                return Err(From::from("Destination file is locked after all retries"));
            }
        }

        // Get source file size for logging
        let source_size = match fs::metadata(source) {
            Ok(metadata) => metadata.len(),
            Err(e) => {
                t3_enhanced_logging(&format!("   ⚠️  Cannot read source file metadata: {}", e));
                0
            }
        };

        if source_size > 0 {
            t3_enhanced_logging(&format!("   📊 Source file size: {} ({})", source_size, format_file_size(source_size)));
        }

        // Attempt to copy
        match fs::copy(source, destination) {
            Ok(bytes_copied) => {
                t3_enhanced_logging(&format!("   ✅ Copy successful: {} bytes", bytes_copied));

                // Verify destination file exists and has correct size
                match fs::metadata(destination) {
                    Ok(dest_metadata) => {
                        let dest_size = dest_metadata.len();
                        if dest_size == bytes_copied {
                            t3_enhanced_logging(&format!("   ✅ Verification passed: destination size matches ({})", dest_size));
                            return Ok(bytes_copied);
                        } else {
                            t3_enhanced_logging(&format!("   ⚠️  Size mismatch: copied {} bytes but destination is {} bytes", bytes_copied, dest_size));

                            if attempt < max_retries {
                                // Fast backoff for small files: 200ms, 500ms, 1000ms, 2000ms, 3000ms
                                let delay_ms = match attempt {
                                    1 => 200,
                                    2 => 500,
                                    3 => 1000,
                                    4 => 2000,
                                    _ => 3000,
                                };
                                t3_enhanced_logging(&format!("   ⏳ Retrying after {} ms...", delay_ms));
                                thread::sleep(Duration::from_millis(delay_ms));
                                continue;
                            }
                        }
                    }
                    Err(e) => {
                        t3_enhanced_logging(&format!("   ⚠️  Cannot verify destination: {}", e));

                        if attempt < max_retries {
                            // Fast backoff for small files: 200ms, 500ms, 1000ms, 2000ms, 3000ms
                            let delay_ms = match attempt {
                                1 => 200,
                                2 => 500,
                                3 => 1000,
                                4 => 2000,
                                _ => 3000,
                            };
                            t3_enhanced_logging(&format!("   ⏳ Retrying after {} ms...", delay_ms));
                            thread::sleep(Duration::from_millis(delay_ms));
                            continue;
                        }
                    }
                }
            }
            Err(e) => {
                t3_enhanced_logging(&format!("   ❌ Copy failed: {}", e));

                if attempt < max_retries {
                    // Fast backoff for small files: 200ms, 500ms, 1000ms, 2000ms, 3000ms
                    let delay_ms = match attempt {
                        1 => 200,
                        2 => 500,
                        3 => 1000,
                        4 => 2000,
                        _ => 3000,
                    };
                    t3_enhanced_logging(&format!("   ⏳ Waiting {} ms before retry...", delay_ms));
                    thread::sleep(Duration::from_millis(delay_ms));
                } else {
                    return Err(From::from(format!("Copy failed after {} attempts: {}", max_retries, e)));
                }
            }
        }
    }

    Err(From::from(format!("Copy failed after {} retries", max_retries)))
}

/// Abstracted T3000 device database copy functionality
///
/// Version-controlled database update system:
/// - Reads database.need_update and database.update_status from ResourceFile database
/// - If need_update=1 AND update_status=0: Force copy, clean all files, set update_status=1
/// - If update_status=1: Skip force copy (update already applied)
/// - Otherwise: Only copy if destination doesn't exist
///
/// For new releases:
/// 1. Update ResourceFile/webview_t3_device.db with database.version="X.X"
/// 2. Set database.need_update=1 and database.update_status=0
/// 3. On first run: Database is force copied and update_status becomes 1
/// 4. Subsequent runs: update_status=1, no force copy
pub fn copy_t3_device_database_if_not_exists() -> Result<(), Box<dyn std::error::Error>> {
    use rusqlite::Connection;

    let source_db_path = Path::new("ResourceFile/webview_t3_device.db");
    let destination_db_path = Path::new(
        T3_DEVICE_DATABASE_URL
            .strip_prefix("sqlite://")
            .ok_or("Invalid webview_t3_device database url")?,
    );

    let destination_dir = destination_db_path
        .parent()
        .ok_or("Invalid destination webview_t3_device database path")?;

    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
    }

    t3_enhanced_logging(&format!("Attempting to copy webview_t3_device database:"));
    t3_enhanced_logging(&format!("  Source: {:?}", source_db_path));
    t3_enhanced_logging(&format!("  Destination: {:?}", destination_db_path));

    // Check version control settings from ResourceFile database
    let (db_version, need_update, update_status) = if source_db_path.exists() {
        match Connection::open(source_db_path) {
            Ok(conn) => {
                let version = conn.query_row(
                    "SELECT config_value FROM APPLICATION_CONFIG WHERE config_key = 'database.version'",
                    [],
                    |row| row.get::<_, String>(0)
                ).unwrap_or_else(|_| "unknown".to_string());

                let need_update = conn.query_row(
                    "SELECT config_value FROM APPLICATION_CONFIG WHERE config_key = 'database.need_update'",
                    [],
                    |row| row.get::<_, String>(0)
                ).unwrap_or_else(|_| "0".to_string()) == "1";

                let update_status = conn.query_row(
                    "SELECT config_value FROM APPLICATION_CONFIG WHERE config_key = 'database.update_status'",
                    [],
                    |row| row.get::<_, String>(0)
                ).unwrap_or_else(|_| "0".to_string()) == "1";

                (version, need_update, update_status)
            }
            Err(_) => ("unknown".to_string(), false, false)
        }
    } else {
        ("unknown".to_string(), false, false)
    };

    t3_enhanced_logging(&format!("  Database Version: {}", db_version));
    t3_enhanced_logging(&format!("  Need Update: {}", need_update));
    t3_enhanced_logging(&format!("  Update Status: {}", if update_status { "completed" } else { "pending" }));

    // Determine if force copy is needed
    let should_force_copy = need_update && !update_status;

    // Handle force copy mode - clean all database files and copy fresh
    if should_force_copy {
        t3_enhanced_logging("🔄 Force copy mode enabled - removing existing database files...");

        // Remove primary destination
        if destination_db_path.exists() {
            fs::remove_file(destination_db_path)?;
            t3_enhanced_logging(&format!("   ✅ Removed existing file: {:?}", destination_db_path));
        }

        // Remove WAL and SHM files for main database
        let wal_path = destination_db_path.with_extension("db-wal");
        let shm_path = destination_db_path.with_extension("db-shm");
        if wal_path.exists() {
            match fs::remove_file(&wal_path) {
                Ok(_) => t3_enhanced_logging(&format!("   ✅ Removed WAL file: {:?}", wal_path)),
                Err(e) => t3_enhanced_logging(&format!("   ⚠️  Could not remove WAL: {}", e)),
            }
        }
        if shm_path.exists() {
            match fs::remove_file(&shm_path) {
                Ok(_) => t3_enhanced_logging(&format!("   ✅ Removed SHM file: {:?}", shm_path)),
                Err(e) => t3_enhanced_logging(&format!("   ⚠️  Could not remove SHM: {}", e)),
            }
        }

        // Remove all files with prefix "webview_t3_device_" in destination directory (partition files)
        if let Some(dest_dir) = destination_db_path.parent() {
            if dest_dir.exists() {
                match fs::read_dir(dest_dir) {
                    Ok(entries) => {
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if let Some(filename) = path.file_name() {
                                if let Some(name_str) = filename.to_str() {
                                    if name_str.starts_with("webview_t3_device_") {
                                        match fs::remove_file(&path) {
                                            Ok(_) => t3_enhanced_logging(&format!("   ✅ Removed partition file: {:?}", path)),
                                            Err(e) => t3_enhanced_logging(&format!("   ⚠️  Could not remove {:?}: {}", path, e)),
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => t3_enhanced_logging(&format!("   ⚠️  Could not read directory {:?}: {}", dest_dir, e)),
                }
            }
        }

        // Remove alternative locations that might exist
        let alt_locations = [
            Path::new("Database/webview_t3_device.db"),
            Path::new("../Database/webview_t3_device.db"),
            Path::new("../../api/Database/webview_t3_device.db"),
        ];

        for alt_path in &alt_locations {
            if alt_path.exists() && alt_path.canonicalize().ok() != destination_db_path.canonicalize().ok() {
                match fs::remove_file(alt_path) {
                    Ok(_) => t3_enhanced_logging(&format!("   ✅ Removed existing file: {:?}", alt_path)),
                    Err(e) => t3_enhanced_logging(&format!("   ⚠️  Could not remove {:?}: {}", alt_path, e)),
                }
            }

            // Also remove files with prefix in alternative locations
            if let Some(alt_dir) = alt_path.parent() {
                if alt_dir.exists() {
                    match fs::read_dir(alt_dir) {
                        Ok(entries) => {
                            for entry in entries.flatten() {
                                let path = entry.path();
                                if let Some(filename) = path.file_name() {
                                    if let Some(name_str) = filename.to_str() {
                                        if name_str.starts_with("webview_t3_device_") {
                                            match fs::remove_file(&path) {
                                                Ok(_) => t3_enhanced_logging(&format!("   ✅ Removed file with prefix: {:?}", path)),
                                                Err(e) => t3_enhanced_logging(&format!("   ⚠️  Could not remove {:?}: {}", path, e)),
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Err(_) => {} // Silently skip if directory doesn't exist
                    }
                }
            }
        }

        t3_enhanced_logging("   All existing webview_t3_device.db and webview_t3_device_* files removed");
    } else if need_update && update_status {
        t3_enhanced_logging("ℹ️  Database update already completed");
        t3_enhanced_logging(&format!("   Version: {}", db_version));
        t3_enhanced_logging("   To force update again, set database.update_status=0 in ResourceFile database");
    }

    // Copy database if it doesn't exist (or if force copy removed it)
    if !destination_db_path.exists() {
        if !source_db_path.exists() {
            t3_enhanced_logging(&format!("Source webview_t3_device database file does not exist: {:?}", source_db_path));
            t3_enhanced_logging("Checking alternative source locations...");

            let alt_source_paths = [
                Path::new("Database/webview_t3_device.db"),
                Path::new("../Database/webview_t3_device.db"),
                Path::new("../../api/Database/webview_t3_device.db"),
            ];

            let mut source_found = false;
            for alt_path in &alt_source_paths {
                if alt_path.exists() {
                    t3_enhanced_logging(&format!("Found webview_t3_device database at alternative location: {:?}", alt_path));

                    // Retry logic for alternative path copy
                    match copy_database_with_retry(alt_path, &destination_db_path, 5) {
                        Ok(bytes) => {
                            t3_enhanced_logging(&format!("✅ Copied {} bytes from {:?} to {:?}", bytes, alt_path, destination_db_path));
                            source_found = true;
                            break;
                        }
                        Err(e) => {
                            t3_enhanced_logging(&format!("❌ Failed to copy from alternative location {:?}: {}", alt_path, e));
                            continue; // Try next alternative location
                        }
                    }
                }
            }

            if !source_found {
                t3_enhanced_logging("❌ No source webview_t3_device database found in any expected location");
                return Err(From::from(format!(
                    "Source webview_t3_device database file does not exist: {:?}",
                    source_db_path
                )));
            }
        } else {
            // Main database copy with retry logic
            t3_enhanced_logging(&format!("📂 Starting database copy with retry logic..."));
            t3_enhanced_logging(&format!("   Source: {:?}", source_db_path));
            t3_enhanced_logging(&format!("   Destination: {:?}", destination_db_path));

            match copy_database_with_retry(&source_db_path, &destination_db_path, 5) {
                Ok(bytes) => {
                    t3_enhanced_logging(&format!("✅ Successfully copied {} bytes ({})",
                        bytes, format_file_size(bytes)));
                }
                Err(e) => {
                    t3_enhanced_logging(&format!("❌ Database copy failed after all retries: {}", e));
                    return Err(From::from(format!(
                        "Failed to copy webview_t3_device database after retries: {}",
                        e
                    )));
                }
            }
        }

        // If this was a force copy due to version update, mark update as completed
        if should_force_copy {
            t3_enhanced_logging("🔄 Marking database update as completed...");

            // Update the update_status in both ResourceFile (source) and destination databases

            // 1. Update ResourceFile database (source)
            if let Ok(conn) = Connection::open(source_db_path) {
                match conn.execute(
                    "UPDATE APPLICATION_CONFIG SET config_value = '1' WHERE config_key = 'database.update_status'",
                    []
                ) {
                    Ok(_) => {
                        t3_enhanced_logging("   ✅ ResourceFile database update status set to completed");
                    }
                    Err(e) => {
                        t3_enhanced_logging(&format!("   ⚠️  Could not update ResourceFile status: {}", e));
                        t3_enhanced_logging("   WARNING: Force copy may repeat on next startup!");
                    }
                }
            } else {
                t3_enhanced_logging(&format!("   ⚠️  Could not open ResourceFile database: {:?}", source_db_path));
            }

            // 2. Update destination database (runtime)
            if let Ok(conn) = Connection::open(destination_db_path) {
                match conn.execute(
                    "UPDATE APPLICATION_CONFIG SET config_value = '1' WHERE config_key = 'database.update_status'",
                    []
                ) {
                    Ok(_) => {
                        t3_enhanced_logging("   ✅ Runtime database update status set to completed");
                        t3_enhanced_logging(&format!("   Version: {}", db_version));
                        t3_enhanced_logging("   Next startup will skip force copy");
                    }
                    Err(e) => {
                        t3_enhanced_logging(&format!("   ⚠️  Could not update runtime database status: {}", e));
                    }
                }
            } else {
                t3_enhanced_logging(&format!("   ⚠️  Could not open runtime database: {:?}", destination_db_path));
            }
        }
    } else {
        t3_enhanced_logging(&format!("webview_t3_device database already exists at destination: {:?}", destination_db_path));
    }

    Ok(())
}

/// Abstracted database service startup orchestration
pub async fn start_database_service() -> Result<(), Box<dyn std::error::Error>> {
    t3_enhanced_logging("📂 Starting T3000 Device Database Service...");

    // Try to copy t3_device database if it doesn't exist
    match copy_t3_device_database_if_not_exists() {
        Ok(_) => {
            t3_enhanced_logging("✅ T3000 device database ready");
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("❌ T3000 device database initialization failed: {}", e);
            t3_enhanced_logging(&error_msg);

            // Return the error to allow caller to handle gracefully
            Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("T3000 device database unavailable: {}", e)
            )))
        }
    }
}

/// Abstracted timestamped logging functionality
pub fn log_message(message: &str, log_to_file: bool) {
    use chrono::Local;

    let now = Local::now();
    let formatted_message = format!("{}:={}", now.format("%Y-%m-%d %H:%M:%S"), message);
    let print_to_console = true;

    if log_to_file {
        /* Temporary remove log to file
        // Function removed - unused
        */
    }

    if print_to_console {
        crate::logger::write_structured_log("T3_Database_Migration", &formatted_message).ok();
    }
}

/// Check if there are pending migrations without running them
pub async fn has_pending_migrations() -> Result<bool, Box<dyn std::error::Error>> {
    let conn = establish_connection().await?;

    // Get applied migrations from database
    match Migrator::get_applied_migrations(&conn).await {
        Ok(applied) => {
            // Get all available migrations
            let available = Migrator::get_migration_files();

            // Check if there are unapplied migrations
            let has_pending = available.len() > applied.len();

            drop(conn);
            Ok(has_pending)
        },
        Err(e) => {
            drop(conn);
            Err(e.into())
        }
    }
}

/// Clean up orphaned migration records (migrations applied but files missing)
pub async fn cleanup_orphaned_migrations() -> Result<(), Box<dyn std::error::Error>> {
    use sea_orm::*;

    let conn = establish_connection().await?;

    crate::logger::write_structured_log("T3_Database_Migration", "Cleaning up orphaned migration records...").ok();

    // Get applied migrations from database - using direct SQL to avoid missing file issues
    let applied_migrations: Vec<String> = {
        let rows = conn.query_all(
            Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT version FROM seaql_migrations ORDER BY applied_at".to_owned()
            )
        ).await?;

        rows.iter().map(|row| {
            row.try_get::<String>("", "version").unwrap_or_default()
        }).collect()
    };

    // Get available migration files
    let available_migrations = Migrator::get_migration_files();
    let available_versions: std::collections::HashSet<String> = available_migrations
        .iter()
        .map(|m| m.name().to_string())
        .collect();

    crate::logger::write_structured_log("T3_Database_Migration", &format!("   Applied migrations: {}", applied_migrations.len())).ok();
    crate::logger::write_structured_log("T3_Database_Migration", &format!("   Available migration files: {}", available_migrations.len())).ok();

    // Find orphaned migrations (applied but file missing)
    let orphaned: Vec<String> = applied_migrations
        .iter()
        .filter(|version| !available_versions.contains(*version))
        .map(|s| s.clone())
        .collect();

    if orphaned.is_empty() {
        crate::logger::write_structured_log("T3_Database_Migration", "   No orphaned migration records found").ok();
    } else {
        crate::logger::write_structured_log_with_level("T3_Database_Migration", &format!("   Found {} orphaned migration(s):", orphaned.len()), crate::logger::LogLevel::Warn).ok();
        for version in &orphaned {
            crate::logger::write_structured_log_with_level("T3_Database_Migration", &format!("      - {}", version), crate::logger::LogLevel::Warn).ok();
        }

        // Remove orphaned migrations
        for version in &orphaned {
            let result = conn.execute(
                Statement::from_string(
                    DatabaseBackend::Sqlite,
                    format!("DELETE FROM seaql_migrations WHERE version = '{}'", version)
                )
            ).await?;

            crate::logger::write_structured_log("T3_Database_Migration", &format!("      ✅ Removed migration record: {} ({} row(s) affected)", version, result.rows_affected())).ok();
        }
    }

    drop(conn);
    crate::logger::write_structured_log("T3_Database_Migration", "✅ Migration cleanup completed").ok();
    Ok(())
}

/// Run migrations only if there are pending migrations, with error handling
pub async fn run_migrations_if_pending() -> Result<(), Box<dyn std::error::Error>> {
    // First, cleanup any orphaned migration records
    if let Err(e) = cleanup_orphaned_migrations().await {
        crate::logger::write_structured_log_with_level("T3_Database_Migration", &format!("⚠️  Could not cleanup orphaned migrations: {}", e), crate::logger::LogLevel::Warn).ok();
        crate::logger::write_structured_log("T3_Database_Migration", "   Continuing with migration check...").ok();
    }

    match has_pending_migrations().await {
        Ok(true) => {
            crate::logger::write_structured_log("T3_Database_Migration", "🔄 New migrations detected, running...").ok();
            match run_migrations().await {
                Ok(_) => {
                    crate::logger::write_structured_log("T3_Database_Migration", "OK Database migrations completed").ok();
                },
                Err(e) => {
                    crate::logger::write_structured_log_with_level("T3_Database_Migration", &format!("WARNING Migration error encountered: {}", e), crate::logger::LogLevel::Warn).ok();
                    crate::logger::write_structured_log("T3_Database_Migration", "   This might be due to missing migration files or schema inconsistencies.").ok();
                    crate::logger::write_structured_log("T3_Database_Migration", "   The system will continue without applying migrations.").ok();
                }
            }
        },
        Ok(false) => {
            crate::logger::write_structured_log("T3_Database_Migration", "✅ Database schema up to date, no migrations needed").ok();
        },
        Err(e) => {
            crate::logger::write_structured_log_with_level("T3_Database_Migration", &format!("⚠️  Could not check migration status: {}", e), crate::logger::LogLevel::Warn).ok();
            crate::logger::write_structured_log("T3_Database_Migration", "   This might be due to missing migration files or database issues.").ok();
            crate::logger::write_structured_log("T3_Database_Migration", "   The system will continue without applying migrations.").ok();
        }
    }
    Ok(())
}
