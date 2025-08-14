use lazy_static::lazy_static;
use migration::{Migrator, MigratorTrait};
use std::{env, fs, path::Path, sync::Arc};
use tokio::sync::{mpsc, Mutex};

use crate::db_connection::establish_connection;

// Define static references for environment variables using lazy_static.
lazy_static! {
    // DATABASE_URL is set from environment variable or defaults to a local SQLite database.
    pub static ref DATABASE_URL: String = env::var("DATABASE_URL")
        .unwrap_or_else(|_| {
            let current_dir = env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = current_dir.join("webview_database.db");
            let url = format!("sqlite://{}", db_path.to_string_lossy());
            println!("Database URL (webview): {}", url);
            println!("Current directory: {:?}", current_dir);
            println!("Database path (webview): {:?}", db_path);
            url
        });
    // T3_DEVICE_DATABASE_URL is set from environment variable or defaults to the comprehensive T3000 device database.
    pub static ref T3_DEVICE_DATABASE_URL: String = env::var("T3_DEVICE_DATABASE_URL")
        .unwrap_or_else(|_| {
            let current_dir = env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = current_dir.join("t3_device.db");
            let url = format!("sqlite://{}", db_path.to_string_lossy());
            println!("Database URL (t3_device): {}", url);
            println!("Current directory: {:?}", current_dir);
            println!("Database path (t3_device): {:?}", db_path);
            url
        });
    // REMOTE_API_URL is set from environment variable or defaults to a given URL.
    pub static ref REMOTE_API_URL: String = env::var("REMOTE_API_URL")
        .unwrap_or_else(|_| "https://user-lib.temcocontrols.com".to_string());
    // SPA_DIR is set from environment variable or defaults to a local directory.
    pub static ref SPA_DIR: String =
        env::var("SPA_DIR").unwrap_or_else(|_| "./ResourceFile/webview/www".to_string());

    pub static ref SHUTDOWN_CHANNEL: Arc<Mutex<mpsc::Sender<()>>> = Arc::new(Mutex::new(mpsc::channel(1).0));
}

/// Start the database service - handles all database initialization
pub async fn start_database_service() -> Result<(), Box<dyn std::error::Error>> {
    println!("📂 Starting Database Service...");

    // Copy webview database if it doesn't exist
    if let Err(e) = copy_database_if_not_exists() {
        println!("⚠️  Warning: Failed to copy webview database: {}", e);
    } else {
        println!("✅ Webview database ready");
    }

    // Copy t3_device database if it doesn't exist
    if let Err(e) = copy_t3_device_database_if_not_exists() {
        println!("⚠️  Warning: Failed to copy t3_device database: {}", e);
    } else {
        println!("✅ T3000 device database ready");
    }

    // Run database migrations
    if let Err(e) = run_migrations().await {
        println!("⚠️  Warning: Database migrations failed: {}", e);
    } else {
        println!("✅ Database migrations completed");
    }

    // Initialize t3_device database
    if let Err(e) = initialize_t3_device_database().await {
        println!("⚠️  Warning: T3000 device database initialization failed: {}", e);
    } else {
        println!("✅ T3000 device database initialized");
    }

    println!("✅ Database Service started successfully!");
    Ok(())
}
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

// Copies the t3_device database file to the destination if it does not already exist.
pub fn copy_t3_device_database_if_not_exists() -> Result<(), Box<dyn std::error::Error>> {
    let source_db_path = Path::new("ResourceFile/t3_device.db"); // Source t3_device database file path.
    let destination_db_path = Path::new(
        T3_DEVICE_DATABASE_URL
            .strip_prefix("sqlite://") // Remove the sqlite:// prefix to get the file path.
            .ok_or("Invalid t3_device database url")?,
    );

    println!("Attempting to copy t3_device database:");
    println!("  Source: {:?}", source_db_path);
    println!("  Destination: {:?}", destination_db_path);

    let destination_dir = destination_db_path
        .parent() // Get the parent directory of the destination path.
        .ok_or("Invalid destination t3_device database path")?;

    // Create the destination directory if it doesn't exist.
    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
        println!("Created destination directory: {:?}", destination_dir);
    }

    // Copy the database file if it doesn't exist in the destination directory.
    if !destination_db_path.exists() {
        // Check if the source database file exists.
        if !source_db_path.exists() {
            println!("Source t3_device database file does not exist: {:?}", source_db_path);
            println!("Checking alternative source locations...");

            // Try alternative source paths
            let alt_source_paths = [
                Path::new("Database/t3_device.db"),
                Path::new("../Database/t3_device.db"),
                Path::new("../../api/Database/t3_device.db"),
            ];

            let mut source_found = false;
            for alt_path in &alt_source_paths {
                if alt_path.exists() {
                    println!("Found t3_device database at alternative location: {:?}", alt_path);
                    fs::copy(alt_path, &destination_db_path)?;
                    println!("Copied t3_device database from {:?} to {:?}", alt_path, destination_db_path);
                    source_found = true;
                    break;
                }
            }

            if !source_found {
                println!("No source t3_device database found in any expected location");
                return Err(From::from(format!(
                    "Source t3_device database file does not exist: {:?}",
                    source_db_path
                )));
            }
        } else {
            // Copy the source database file to the destination.
            fs::copy(&source_db_path, &destination_db_path)?;
            println!(
                "Copied t3_device database file from {:?} to {:?}",
                source_db_path, destination_db_path
            );
        }
    } else {
        println!("t3_device database already exists at destination: {:?}", destination_db_path);
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

// Asynchronously initializes the T3000 device database with the required schema.
pub async fn initialize_t3_device_database() -> Result<(), Box<dyn std::error::Error>> {
    use crate::db_connection::establish_t3_device_connection;
    use std::path::Path;

    println!("Starting T3000 device database initialization...");
    println!("T3_DEVICE_DATABASE_URL: {}", *T3_DEVICE_DATABASE_URL);

    // Extract the file path from the database URL
    let db_file_path = T3_DEVICE_DATABASE_URL
        .strip_prefix("sqlite://")
        .ok_or("Invalid T3_DEVICE_DATABASE_URL format")?;

    let db_path = Path::new(db_file_path);
    println!("Database file path: {:?}", db_path);

    // Create the directory if it doesn't exist
    if let Some(parent_dir) = db_path.parent() {
        if !parent_dir.exists() {
            std::fs::create_dir_all(parent_dir)?;
            println!("Created directory: {:?}", parent_dir);
        }
    }

    // Check if database file exists
    if db_path.exists() {
        println!("T3000 device database file already exists: {:?}", db_path);
    } else {
        println!("T3000 device database file does not exist, will be created: {:?}", db_path);
    }

    let conn = establish_t3_device_connection().await?;

    // Note: The comprehensive T3000 device database schema is created via SQL file
    // This function can be used for any additional initialization if needed
    println!("T3000 device database connection established successfully");

    drop(conn);

    // Verify the file was created
    if db_path.exists() {
        println!("T3000 device database file confirmed to exist: {:?}", db_path);
    } else {
        println!("WARNING: T3000 device database file was not created: {:?}", db_path);
    }

    Ok(())
}

/// Log a message with timestamp formatting
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
