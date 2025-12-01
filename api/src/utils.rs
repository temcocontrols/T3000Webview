use lazy_static::lazy_static;
use migration::{Migrator, MigratorTrait};
use std::{env, fs, path::Path, sync::Arc};
use tokio::sync::{mpsc, Mutex};

use crate::db_connection::establish_connection;

// ============================================================================
// DATABASE CREATION MODE CONFIGURATION
// ============================================================================
// This constant controls which database initialization method to use:
// - false: Option 1 (Current) - Copy pre-built database from ResourceFile
// - true:  Option 2 (Dynamic) - Create database from embedded SQL schema
//
// 🔧 CHANGE THIS VALUE WHEN DOING RELEASE:
// For production: Set to `false` (use pre-built database - faster, tested)
// For development/testing: Set to `true` (dynamic creation - clean state)
// ============================================================================
pub const USE_DYNAMIC_DATABASE_CREATION: bool = false;

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
        println!("Created destination directory: {:?}", destination_dir);
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
        println!(
            "Copied database file from {:?} to {:?}",
            source_db_path, destination_db_path
        );
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
    println!("{}", message);
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
                    fs::copy(alt_path, &destination_db_path)?;
                    t3_enhanced_logging(&format!("Copied webview_t3_device database from {:?} to {:?}", alt_path, destination_db_path));
                    source_found = true;
                    break;
                }
            }

            if !source_found {
                t3_enhanced_logging("No source webview_t3_device database found in any expected location");
                return Err(From::from(format!(
                    "Source webview_t3_device database file does not exist: {:?}",
                    source_db_path
                )));
            }
        } else {
            fs::copy(&source_db_path, &destination_db_path)?;
            t3_enhanced_logging(&format!(
                "Copied webview_t3_device database file from {:?} to {:?}",
                source_db_path, destination_db_path
            ));
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

// ============================================================================
// OPTION 2: DYNAMIC DATABASE CREATION FROM EMBEDDED SQL
// ============================================================================

/// Create T3000 device database dynamically from embedded SQL schema
/// This is Option 2 - creates database from SQL embedded in the binary
/// SQL is embedded at compile time from migration/sql/webview_t3_device_schema.sql
pub fn create_t3_device_database_from_embedded_sql() -> Result<(), Box<dyn std::error::Error>> {
    let destination_db_path = Path::new(
        T3_DEVICE_DATABASE_URL
            .strip_prefix("sqlite://")
            .ok_or("Invalid webview_t3_device database url")?,
    );

    t3_enhanced_logging(&format!("📦 Creating T3000 device database dynamically from embedded SQL schema"));
    t3_enhanced_logging(&format!("  Destination: {:?}", destination_db_path));

    // Create destination directory if it doesn't exist
    let destination_dir = destination_db_path
        .parent()
        .ok_or("Invalid destination webview_t3_device database path")?;

    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
        t3_enhanced_logging(&format!("  Created destination directory: {:?}", destination_dir));
    }

    // Check if database already exists
    if destination_db_path.exists() {
        t3_enhanced_logging(&format!("  ✅ Database already exists at: {:?}", destination_db_path));
        return Ok(());
    }

    // Create new database and execute embedded schema
    t3_enhanced_logging("  Creating new database file...");
    let conn = rusqlite::Connection::open(&destination_db_path)?;

    t3_enhanced_logging("  Executing embedded SQL schema...");
    let schema_version = crate::db_schema::get_embedded_schema_version();
    t3_enhanced_logging(&format!("  Schema version: {}", schema_version));

    // Execute the embedded SQL (all CREATE TABLE, CREATE INDEX statements)
    conn.execute_batch(crate::db_schema::EMBEDDED_SCHEMA)?;

    t3_enhanced_logging(&format!("  ✅ Database created successfully from embedded schema"));
    t3_enhanced_logging(&format!("  Database location: {:?}", destination_db_path));

    Ok(())
}

/// Dynamic database service startup (Option 2)
/// Creates database from embedded SQL schema instead of copying pre-built file
pub async fn start_database_service_dynamic() -> Result<(), Box<dyn std::error::Error>> {
    t3_enhanced_logging("📂 Starting T3000 Device Database Service (Dynamic Creation Mode)...");

    match create_t3_device_database_from_embedded_sql() {
        Ok(_) => {
            t3_enhanced_logging("✅ T3000 device database ready (created from embedded schema)");
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("❌ T3000 device database dynamic creation failed: {}", e);
            t3_enhanced_logging(&error_msg);

            Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("T3000 device database dynamic creation failed: {}", e)
            )))
        }
    }
}

// ============================================================================
// UNIFIED DATABASE INITIALIZATION - SWITCHES BETWEEN OPTION 1 AND OPTION 2
// ============================================================================

/// Unified database initialization function
/// Automatically selects Option 1 (copy) or Option 2 (dynamic) based on USE_DYNAMIC_DATABASE_CREATION
pub async fn initialize_t3_device_database() -> Result<(), Box<dyn std::error::Error>> {
    if USE_DYNAMIC_DATABASE_CREATION {
        // Option 2: Dynamic creation from embedded SQL
        t3_enhanced_logging("🔧 Using Option 2: Dynamic database creation from embedded SQL");
        start_database_service_dynamic().await
    } else {
        // Option 1: Copy pre-built database from ResourceFile
        t3_enhanced_logging("🔧 Using Option 1: Copy pre-built database from ResourceFile");
        start_database_service().await
    }
}

/// Abstracted database service startup orchestration
/// NOTE: This is Option 1 (Copy pre-built database) - KEPT UNCHANGED
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
        println!("{}", formatted_message);
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

    println!("🧹 Cleaning up orphaned migration records...");

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

    println!("   Applied migrations: {}", applied_migrations.len());
    println!("   Available migration files: {}", available_migrations.len());

    // Find orphaned migrations (applied but file missing)
    let orphaned: Vec<String> = applied_migrations
        .iter()
        .filter(|version| !available_versions.contains(*version))
        .map(|s| s.clone())
        .collect();

    if orphaned.is_empty() {
        println!("   ✅ No orphaned migration records found");
    } else {
        println!("   🗑️  Found {} orphaned migration(s):", orphaned.len());
        for version in &orphaned {
            println!("      - {}", version);
        }

        // Remove orphaned migrations
        for version in &orphaned {
            let result = conn.execute(
                Statement::from_string(
                    DatabaseBackend::Sqlite,
                    format!("DELETE FROM seaql_migrations WHERE version = '{}'", version)
                )
            ).await?;

            println!("      ✅ Removed migration record: {} ({} row(s) affected)",
                     version, result.rows_affected());
        }
    }

    drop(conn);
    println!("✅ Migration cleanup completed");
    Ok(())
}

/// Run migrations only if there are pending migrations, with error handling
pub async fn run_migrations_if_pending() -> Result<(), Box<dyn std::error::Error>> {
    // First, cleanup any orphaned migration records
    if let Err(e) = cleanup_orphaned_migrations().await {
        println!("⚠️  Could not cleanup orphaned migrations: {}", e);
        println!("   Continuing with migration check...");
    }

    match has_pending_migrations().await {
        Ok(true) => {
            println!("🔄 New migrations detected, running...");
            match run_migrations().await {
                Ok(_) => println!("✅ Database migrations completed"),
                Err(e) => {
                    println!("⚠️  Migration error encountered: {}", e);
                    println!("   This might be due to missing migration files or schema inconsistencies.");
                    println!("   The system will continue without applying migrations.");
                }
            }
        },
        Ok(false) => {
            println!("✅ Database schema up to date, no migrations needed");
        },
        Err(e) => {
            println!("⚠️  Could not check migration status: {}", e);
            println!("   This might be due to missing migration files or database issues.");
            println!("   The system will continue without applying migrations.");
        }
    }
    Ok(())
}
