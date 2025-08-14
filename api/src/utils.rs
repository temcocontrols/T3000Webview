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
            let db_path = current_dir.join("t3_device.db");
            let url = format!("sqlite://{}", db_path.to_string_lossy());
            t3_enhanced_logging(&format!("Database URL (t3_device): {}", url));
            t3_enhanced_logging(&format!("Current directory: {:?}", current_dir));
            t3_enhanced_logging(&format!("Database path (t3_device): {:?}", db_path));
            url
        });
}

/// Abstracted enhanced logging for T3000 operations
pub fn t3_enhanced_logging(message: &str) {
    println!("{}", message);
}

/// Abstracted T3000 device database copy functionality
pub fn copy_t3_device_database_if_not_exists() -> Result<(), Box<dyn std::error::Error>> {
    let source_db_path = Path::new("ResourceFile/t3_device.db");
    let destination_db_path = Path::new(
        T3_DEVICE_DATABASE_URL
            .strip_prefix("sqlite://")
            .ok_or("Invalid t3_device database url")?,
    );

    t3_enhanced_logging(&format!("Attempting to copy t3_device database:"));
    t3_enhanced_logging(&format!("  Source: {:?}", source_db_path));
    t3_enhanced_logging(&format!("  Destination: {:?}", destination_db_path));

    let destination_dir = destination_db_path
        .parent()
        .ok_or("Invalid destination t3_device database path")?;

    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
        t3_enhanced_logging(&format!("Created destination directory: {:?}", destination_dir));
    }

    if !destination_db_path.exists() {
        if !source_db_path.exists() {
            t3_enhanced_logging(&format!("Source t3_device database file does not exist: {:?}", source_db_path));
            t3_enhanced_logging("Checking alternative source locations...");

            let alt_source_paths = [
                Path::new("Database/t3_device.db"),
                Path::new("../Database/t3_device.db"),
                Path::new("../../api/Database/t3_device.db"),
            ];

            let mut source_found = false;
            for alt_path in &alt_source_paths {
                if alt_path.exists() {
                    t3_enhanced_logging(&format!("Found t3_device database at alternative location: {:?}", alt_path));
                    fs::copy(alt_path, &destination_db_path)?;
                    t3_enhanced_logging(&format!("Copied t3_device database from {:?} to {:?}", alt_path, destination_db_path));
                    source_found = true;
                    break;
                }
            }

            if !source_found {
                t3_enhanced_logging("No source t3_device database found in any expected location");
                return Err(From::from(format!(
                    "Source t3_device database file does not exist: {:?}",
                    source_db_path
                )));
            }
        } else {
            fs::copy(&source_db_path, &destination_db_path)?;
            t3_enhanced_logging(&format!(
                "Copied t3_device database file from {:?} to {:?}",
                source_db_path, destination_db_path
            ));
        }
    } else {
        t3_enhanced_logging(&format!("t3_device database already exists at destination: {:?}", destination_db_path));
    }

    Ok(())
}

/// Abstracted database service startup orchestration
pub async fn start_database_service() -> Result<(), Box<dyn std::error::Error>> {
    t3_enhanced_logging("📂 Starting Database Service...");

    // Copy t3_device database if it doesn't exist
    if let Err(e) = copy_t3_device_database_if_not_exists() {
        t3_enhanced_logging(&format!("⚠️  Warning: Failed to copy t3_device database: {}", e));
    } else {
        t3_enhanced_logging("✅ T3000 device database ready");
    }

    t3_enhanced_logging("✅ Database Service started successfully!");
    Ok(())
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
