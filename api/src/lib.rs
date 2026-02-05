use std::panic;
use utils::{copy_database_if_not_exists, SHUTDOWN_CHANNEL};
use db_connection::establish_t3_device_connection;
use database_management::partition_monitor_service;

pub mod app_state;
pub mod auth;
pub mod constants;
pub mod db_connection;
pub mod db_schema;  // NEW: Embedded SQL schema for dynamic database creation
pub mod entity;
pub mod error;
pub mod file;
pub mod log;
pub mod logger;
pub mod modbus_register;
pub mod server;
pub mod user;
pub mod utils;

// Database management modules
pub mod database_management;

// T3000 device modules
pub mod t3_device;
pub mod t3_socket;

// Developer tools modules
pub mod t3_develop;

#[repr(C)]
pub enum RustError {
    Ok = 0,
    Error = 1,
}

// Externally callable function to shut down the server for using from C++.
#[no_mangle]
pub extern "C" fn shutdown_server() {
    // Send a shutdown signal to the server
    let _ = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let sender = SHUTDOWN_CHANNEL.lock().await;
            sender.send(()).await.ok();
        });
}

// Externally callable function to run the server for using from C++, returning a RustError.
#[no_mangle]
pub extern "C" fn run_server() -> RustError {
    // Use panic::catch_unwind to catch any panic and prevent it from unwinding across FFI boundaries.
    let result = panic::catch_unwind(|| {
        // Create a new Tokio runtime for asynchronous operations.
        let runtime = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,                      // Successfully created the runtime.
            Err(_) => return RustError::Error, // Failed to create the runtime.
        };

        // Run the server logic in a blocking thread within the Tokio runtime.
        runtime.block_on(async {
            dotenvy::dotenv().ok(); // Load environment variables from a .env file, if it exists.
            copy_database_if_not_exists().ok(); // Copy the database if it doesn't already exist.

            // Start both HTTP (8000) and WebSocket (8001) services
            match start_all_services().await {
                Ok(_) => RustError::Ok, // Both servers started successfully.
                Err(err) => {
                    // Handle server errors (log the error and return RustError::Error).
                    eprintln!("Server error: {:?}", err);
                    RustError::Error
                }
            }
        })
    });

    // If the closure inside catch_unwind ran without panicking, return the result.
    // If a panic occurred, return an error.
    match result {
        Ok(res) => res,             // Normal execution, return the server result.
        Err(_) => RustError::Error, // A panic occurred, return RustError::Error.
    }
}

// ============================================================================
// ABSTRACTED FUNCTIONS - All new functionality separated from original code
// ============================================================================

use t3_device::t3_ffi_sync_service::{initialize_logging_service, start_logging_sync, T3000MainConfig};

/// Load Sampling Interval from APPLICATION_CONFIG table
async fn load_ffi_sync_interval_from_db() -> Result<u64, Box<dyn std::error::Error>> {
    use crate::entity::application_settings;
    use sea_orm::*;

    let db = establish_t3_device_connection().await?;

    // Query APPLICATION_CONFIG for ffi.sync_interval_secs
    let config = application_settings::Entity::find()
        .filter(application_settings::Column::ConfigKey.eq("ffi.sync_interval_secs"))
        .one(&db)
        .await?;

    match config {
        Some(cfg) => {
            // Parse config_value as JSON to handle both Number and String formats
            // New format: 300 (JSON number)
            // Old format: "300" (JSON string with quotes)
            let json_value: serde_json::Value = serde_json::from_str(&cfg.config_value)
                .unwrap_or_else(|_| {
                    // Fallback: treat as plain string if not valid JSON
                    serde_json::Value::String(cfg.config_value.clone())
                });

            let interval = match json_value {
                serde_json::Value::Number(n) => n.as_u64().unwrap_or(300),
                serde_json::Value::String(s) => s.parse::<u64>().unwrap_or(300),
                _ => 300,
            };

            Ok(interval)
        }
        None => {
            // Config not found, insert default value
            let default_config = application_settings::ActiveModel {
                config_key: Set("ffi.sync_interval_secs".to_string()),
                config_value: Set("300".to_string()),
                config_type: Set("number".to_string()),
                description: Set(Some("FFI Sync Service interval in seconds (default: 300 = 5 minutes)".to_string())),
                is_system: Set(false),
                user_id: Set(None),
                device_serial: Set(None),
                panel_id: Set(None),
                version: Set(None),
                size_bytes: Set(Some(3)), // "300" = 3 bytes
                created_at: Set(chrono::Utc::now().naive_utc()),
                updated_at: Set(chrono::Utc::now().naive_utc()),
                ..Default::default()
            };

            application_settings::Entity::insert(default_config)
                .exec(&db)
                .await?;

            Ok(300) // Return default
        }
    }
}

/// Start all T3000 services (HTTP + WebSocket)
pub async fn start_all_services() -> Result<(), Box<dyn std::error::Error>> {
    // Log to file for headless service
    let startup_msg = format!("T3000 WebView Service initializing - HTTP (9103) + WebSocket (9104) + Auto-Sync (T3000.db → webview_t3_device.db)");

    // Write to structured log file - new Initialize category
    use crate::logger::{write_structured_log_with_level, LogLevel};
    let _ = write_structured_log_with_level("T3_Webview_Initialize", &startup_msg, LogLevel::Info);

    // Initialize T3000 device database (webview_t3_device.db)
    // Automatically switches between Option 1 (copy) and Option 2 (dynamic) based on USE_DYNAMIC_DATABASE_CREATION constant
    if let Err(e) = crate::utils::initialize_t3_device_database().await {
        let error_msg = format!("T3000 webview database (webview_t3_device.db) initialization failed: {} - Core services will continue", e);
        let _ = write_structured_log_with_level("T3_Webview_Initialize", &error_msg, LogLevel::Error);
        println!("⚠️  Warning: T3000 webview database unavailable - Core services starting anyway");
    } else {
        let success_msg = "T3000 webview database (webview_t3_device.db) ready";
        let _ = write_structured_log_with_level("T3_Webview_Initialize", &success_msg, LogLevel::Info);
    }

    // Initialize T3000 Main Service with dynamic sync interval from database
    let sync_interval_secs = load_ffi_sync_interval_from_db().await.unwrap_or(300); // Default 5 minutes

    let _ = write_structured_log_with_level(
        "T3_Webview_Initialize",
        &format!("Sampling Interval loaded: {} seconds ({} minutes)", sync_interval_secs, sync_interval_secs / 60),
        LogLevel::Info
    );

    let main_service_config = T3000MainConfig {
        sync_interval_secs,
        auto_start: false,  // We'll start it manually in background task below
        ..T3000MainConfig::default()
    };
    if let Err(e) = initialize_logging_service(main_service_config).await {
        let error_msg = format!("T3000 FFI Sync Service initialization failed: {} - Core services will continue", e);
        let _ = write_structured_log_with_level("T3_Webview_Initialize", &error_msg, LogLevel::Warn);
        println!("⚠️  Warning: T3000 FFI Sync Service unavailable - Core services starting anyway");
    } else {
        let _ = write_structured_log_with_level("T3_Webview_Initialize", "T3000 FFI Sync Service initialized (Primary T3000 FFI integration service)", LogLevel::Info);
    }

    // Start T3000 FFI Sync Service in background with immediate trigger
    let main_service_handle = if crate::constants::ENABLE_FFI_SYNC_SERVICE {
        let handle = tokio::spawn(async move {
            if let Err(e) = start_logging_sync().await {
                let error_msg = format!("T3000 FFI Sync Service (FFI + DeviceSync + WebSocket) failed: {}", e);
                let _ = write_structured_log_with_level("T3_Webview_Initialize", &error_msg, LogLevel::Error);
            }
        });

        let _ = write_structured_log_with_level("T3_Webview_Initialize", "✅ T3000 FFI Sync Service started in background (15-minute sync intervals with immediate startup sync)", LogLevel::Info);
        Some(handle)
    } else {
        let _ = write_structured_log_with_level("T3_Webview_Initialize", "⏸️  T3000 FFI Sync Service DISABLED by constant (ENABLE_FFI_SYNC_SERVICE = false)", LogLevel::Warn);
        None
    };

    // Start partition monitor service (hourly background checks)
    if crate::constants::ENABLE_PARTITION_MONITOR_SERVICE {
        if let Err(e) = partition_monitor_service::start_partition_monitor_service().await {
            let error_msg = format!("Partition monitor service initialization failed: {}", e);
            let _ = write_structured_log_with_level("T3_Webview_Initialize", &error_msg, LogLevel::Warn);
        } else {
            let _ = write_structured_log_with_level("T3_Webview_Initialize", "✅ Partition monitor service started (hourly checks)", LogLevel::Info);
        }
    } else {
        let _ = write_structured_log_with_level("T3_Webview_Initialize", "⏸️  Partition monitor service DISABLED by constant (ENABLE_PARTITION_MONITOR_SERVICE = false)", LogLevel::Warn);
    }

    // Schedule startup partition migration check (5 minute delay to allow database stabilization)
    tokio::spawn(async {
        let wait_secs = 300; // 5 minutes
        let _ = write_structured_log_with_level(
            "T3_Webview_Initialize",
            &format!("⏳ Scheduled partition check in {} seconds ({} minutes) to allow database stabilization...", wait_secs, wait_secs / 60),
            LogLevel::Info
        );

        tokio::time::sleep(tokio::time::Duration::from_secs(wait_secs)).await;

        let _ = write_structured_log_with_level(
            "T3_Webview_Initialize",
            "🔍 Starting scheduled partition migration check (after 5-minute stabilization period)...",
            LogLevel::Info
        );

        if let Err(e) = partition_monitor_service::check_startup_migrations().await {
            let _ = write_structured_log_with_level(
                "T3_Webview_Initialize",
                &format!("⚠️ Startup partition migration check failed: {}", e),
                LogLevel::Warn
            );
        } else {
            let _ = write_structured_log_with_level(
                "T3_Webview_Initialize",
                "✅ Startup partition migration check completed",
                LogLevel::Info
            );
        }
    });

    // Start WebSocket service in background
    let websocket_handle = tokio::spawn(async move {
        if let Err(e) = crate::t3_socket::start_websocket_service().await {
            // Log WebSocket errors to structured log
            let error_msg = format!("WebSocket service failed: {}", e);
            let _ = write_structured_log_with_level("T3_Webview_Socket", &error_msg, LogLevel::Error);
        }
    });

    // Give WebSocket a moment to start
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Start HTTP server (this will block and run the main server)
    let http_result = server::server_start().await;

    // If HTTP server stops, we should stop background services too
    websocket_handle.abort();
    if let Some(handle) = main_service_handle {
        handle.abort();
    }

    http_result
}

/// Start all T3000 services with optional migration support
pub async fn start_all_services_with_options(run_migrations: bool) -> Result<(), Box<dyn std::error::Error>> {
    // Run migrations first if requested (force migration regardless of pending status)
    if run_migrations {
        println!("🔄 Force running database migrations...");
        match utils::run_migrations().await {
            Ok(_) => println!("✅ Database migrations completed"),
            Err(e) => {
                eprintln!("❌ Database migration failed: {:?}", e);
                return Err(e);
            }
        }
    }

    // Start all services normally (which will auto-detect pending migrations)
    start_all_services().await
}/// Abstracted T3000 server startup for DLL entry point
#[no_mangle]
pub extern "C" fn run_t3_server() -> RustError {
    let result = panic::catch_unwind(|| {
        let runtime = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(_) => return RustError::Error,
        };

        runtime.block_on(async {
            println!("🔗 T3000 DLL Entry Point: Starting all services...");

            match start_all_services().await {
                Ok(_) => {
                    println!("✅ T3000 WebView API services started from DLL");
                    RustError::Ok
                }
                Err(err) => {
                    eprintln!("❌ DLL service startup failed: {:?}", err);
                    RustError::Error
                }
            }
        })
    });

    match result {
        Ok(res) => res,
        Err(_) => RustError::Error,
    }
}
