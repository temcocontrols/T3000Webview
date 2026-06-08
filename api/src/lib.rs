use std::panic;
use utils::{copy_database_if_not_exists, SHUTDOWN_CHANNEL};
use db_connection::establish_t3_device_connection;
use database_management::partition_monitor_service;

pub mod app_state;
pub mod auth;
pub mod server_db_writer; // Global server DB state for server/client dual-write
pub mod constants;
pub mod db_connection;
pub mod db_schema;  // Embedded SQL schema for dynamic database creation
pub mod device_db_conn; // Multi-backend device DB connection adapter
pub mod ini_config; // setting.ini [ServerDatabase] reader for server/client config
pub mod web_routing; // Web routing helpers for server/client DB mode
pub mod entity;
pub mod error;
pub mod file;
pub mod log;
pub mod logging;
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
            // Config not found, insert unified default: 300 seconds (5 minutes)
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

            Ok(300) // Return unified default
        }
    }
}

async fn emit_service_log(level: &str, category: &str, message: &str) {
    let db = match establish_t3_device_connection().await {
        Ok(db) => db,
        Err(_) => return,
    };
    crate::logging::service::emit_app_log(&db, level, category, None, None, message, None).await;
}

/// Start all T3000 services (HTTP + WebSocket)
/// Helper for the daily cleanup scheduler — lives outside start_all_services
/// so it can be used in tokio::spawn (must be Send + 'static).
async fn run_flow_cleanup() {
    use sea_orm::ConnectionTrait;
    // Convert error to String immediately so the future is Send.
    let db = match establish_t3_device_connection().await.map_err(|e| e.to_string()) {
        Ok(db) => db,
        Err(_) => return,
    };
    let cutoff_ms = (chrono::Utc::now() - chrono::Duration::days(30)).timestamp_millis();
    // Delete child rows first to avoid orphans (no CASCADE in SQLite schema)
    let _ = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        format!("DELETE FROM T3_FLOW_PAYLOAD WHERE flow_id IN (SELECT flow_id FROM T3_FLOW WHERE started_at < {})", cutoff_ms),
    )).await;
    let _ = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        format!("DELETE FROM T3_FLOW_STEP WHERE flow_id IN (SELECT flow_id FROM T3_FLOW WHERE started_at < {})", cutoff_ms),
    )).await;
    let _ = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        format!("DELETE FROM T3_FLOW WHERE started_at < {}", cutoff_ms),
    )).await;
}

pub async fn start_all_services() -> Result<(), Box<dyn std::error::Error>> {
    crate::server::debug_log("start_all_services: ENTERED");
    crate::server::init_tracing();

    // Log to file for headless service
    let startup_msg = format!("T3000 WebView Service initializing - HTTP (9103) + WebSocket (9104) + Auto-Sync (T3000.db → webview_t3_device.db)");

    emit_service_log("info", "T3_Webview_Initialize", &startup_msg).await;

    // Open local SQLite for DLL_INIT flow logging (best-effort — None if DB not yet ready)
    let flow_db_opt = establish_t3_device_connection().await.ok();
    let flow_opt: Option<(crate::logging::flow::FlowHandle, sea_orm::DatabaseConnection)> =
        if let Some(ref db) = flow_db_opt {
            let fh = crate::logging::flow::FlowHandle::start(
                db, "DLL_INIT", "start_all_services", 0, None,
            ).await;
            Some((fh, db.clone()))
        } else {
            None
        };

    // Initialize T3000 device database (webview_t3_device.db)
    // Automatically switches between Option 1 (copy) and Option 2 (dynamic) based on USE_DYNAMIC_DATABASE_CREATION constant
    let t_db = std::time::Instant::now();
    if let Err(e) = crate::utils::initialize_t3_device_database().await {
        let error_msg = format!("T3000 webview database (webview_t3_device.db) initialization failed: {} - Core services will continue", e);
        emit_service_log("error", "T3_Webview_Initialize", &error_msg).await;
        println!("⚠️  Warning: T3000 webview database unavailable - Core services starting anyway");
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "db_init", "error", "lib", "error", t_db.elapsed().as_millis() as i64,
                    &format!("DB init failed: {}", e), None).await;
        }
    } else {
        let success_msg = "T3000 webview database (webview_t3_device.db) ready";
        emit_service_log("info", "T3_Webview_Initialize", success_msg).await;
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "db_init", "info", "lib", "ok", t_db.elapsed().as_millis() as i64,
                    "webview_t3_device.db initialized — device cache ready", None).await;
        }
    }

    // Initialize T3000 Main Service with dynamic sync interval from database
    let t_interval = std::time::Instant::now();
    let sync_interval_secs = load_ffi_sync_interval_from_db().await.unwrap_or(300); // Default 5 minutes

    emit_service_log(
        "info",
        "T3_Webview_Initialize",
        &format!(
            "Sampling Interval loaded: {} seconds ({} minutes)",
            sync_interval_secs,
            sync_interval_secs / 60
        ),
    )
    .await;
    if let Some((ref fh, ref db)) = flow_opt {
        fh.step(db, "load_sync_interval", "info", "lib", "ok",
                t_interval.elapsed().as_millis() as i64,
                &format!("poll every {}s ({}min) — from APPLICATION_CONFIG", sync_interval_secs, sync_interval_secs / 60), None).await;
    }

    let t_ffi = std::time::Instant::now();
    let main_service_config = T3000MainConfig {
        sync_interval_secs,
        auto_start: false,  // We'll start it manually in background task below
        ..T3000MainConfig::default()
    };
    if let Err(e) = initialize_logging_service(main_service_config).await {
        let error_msg = format!("T3000 FFI Sync Service initialization failed: {} - Core services will continue", e);
        emit_service_log("warn", "T3_Webview_Initialize", &error_msg).await;
        println!("⚠️  Warning: T3000 FFI Sync Service unavailable - Core services starting anyway");
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "init_ffi_service", "warn", "lib", "error",
                    t_ffi.elapsed().as_millis() as i64,
                    &format!("FFI service init failed: {}", e), None).await;
        }
    } else {
        emit_service_log(
            "info",
            "T3_Webview_Initialize",
            "T3000 FFI Sync Service initialized (Primary T3000 FFI integration service)",
        )
        .await;
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "init_ffi_service", "info", "lib", "ok",
                    t_ffi.elapsed().as_millis() as i64,
                    "T3000 FFI bridge loaded — panel polling ready", None).await;
        }
    }

    // Start T3000 FFI Sync Service in background with immediate trigger
    // Checks setting.ini [ServerDatabase] at runtime:
    //   - enabled=1 AND role=server → FFI sync runs
    //   - otherwise → FFI sync stays disabled
    let main_service_handle = {
        let ini_cfg = crate::ini_config::read_server_db_config_auto();
        emit_service_log(
            "info",
            "T3_Webview_Initialize",
            &format!(
                "FFI Sync runtime check: ini.enabled={}, ini.role={}",
                ini_cfg.enabled, ini_cfg.role
            ),
        )
        .await;

        if ini_cfg.enabled && ini_cfg.role == "server" {
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "start_ffi_sync", "info", "lib", "ok", 0,
                        "FFI sync service started (center DB active, role=server)", None).await;
            }
            let handle = tokio::spawn(async move {
                if let Err(e) = start_logging_sync().await {
                    let error_msg = format!("T3000 FFI Sync Service (FFI + DeviceSync + WebSocket) failed: {}", e);
                    emit_service_log("error", "T3_Webview_Initialize", &error_msg).await;
                }
            });
            emit_service_log(
                "info",
                "T3_Webview_Initialize",
                "✅ T3000 FFI Sync Service started (center DB active, role=server)",
            )
            .await;
            Some(handle)
        } else {
            let reason = if !ini_cfg.enabled {
                "center DB not enabled in setting.ini"
            } else {
                "role is client (only server syncs FFI data)"
            };
            emit_service_log(
                "info",
                "T3_Webview_Initialize",
                &format!("[PAUSE] T3000 FFI Sync Service DISABLED - {}", reason),
            )
            .await;
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "start_ffi_sync", "info", "lib", "skip", 0,
                        &format!("FFI sync disabled: {}", reason), None).await;
            }
            None
        }
    };

    // Start partition monitor service (hourly background checks)
    let t_pm = std::time::Instant::now();
    if crate::constants::ENABLE_PARTITION_MONITOR_SERVICE {
        if let Err(e) = partition_monitor_service::start_partition_monitor_service().await {
            let error_msg = format!("Partition monitor service initialization failed: {}", e);
            emit_service_log("warn", "T3_Webview_Initialize", &error_msg).await;
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "partition_monitor", "warn", "lib", "error",
                        t_pm.elapsed().as_millis() as i64,
                        &format!("partition monitor failed: {}", e), None).await;
            }
        } else {
            emit_service_log(
                "info",
                "T3_Webview_Initialize",
                "✅ Partition monitor service started (hourly checks)",
            )
            .await;
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "partition_monitor", "info", "lib", "ok",
                        t_pm.elapsed().as_millis() as i64,
                        "Partition monitor started", None).await;
            }
        }
    } else {
            emit_service_log(
                "warn",
                "T3_Webview_Initialize",
                "[PAUSE] Partition monitor service DISABLED by constant (ENABLE_PARTITION_MONITOR_SERVICE = false)",
            )
        .await;
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "partition_monitor", "info", "lib", "skip", 0,
                    "disabled — ENABLE_PARTITION_MONITOR_SERVICE=false", None).await;
        }
    }

    // Schedule startup partition migration check (5 minute delay to allow database stabilization)
    tokio::spawn(async {
        let wait_secs = 300; // 5 minutes
        emit_service_log(
            "info",
            "T3_Webview_Initialize",
            &format!(
                "[TIMER] Scheduled partition check in {} seconds ({} minutes) to allow database stabilization...",
                wait_secs,
                wait_secs / 60
            ),
        )
        .await;

        tokio::time::sleep(tokio::time::Duration::from_secs(wait_secs)).await;

        emit_service_log(
            "info",
            "T3_Webview_Initialize",
            "[CHECK] Starting scheduled partition migration check (after 5-minute stabilization period)...",
        )
        .await;

        if let Err(e) = partition_monitor_service::check_startup_migrations().await {
            emit_service_log(
                "warn",
                "T3_Webview_Initialize",
                &format!("[WARN] Startup partition migration check failed: {}", e),
            )
            .await;
        } else {
            emit_service_log(
                "info",
                "T3_Webview_Initialize",
                "✅ Startup partition migration check completed",
            )
            .await;
        }
    });

    // Start WebSocket service in background
    let websocket_handle = tokio::spawn(async move {
        let websocket_result = crate::t3_socket::start_websocket_service()
            .await
            .map_err(|e| e.to_string());
        if let Err(err_text) = websocket_result {
            // Log WebSocket errors to structured log
            let error_msg = format!("WebSocket service failed: {}", err_text);
            emit_service_log("error", "T3_Webview_Socket", &error_msg).await;
        }
    });

    // Give WebSocket a moment to start
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    if let Some((ref fh, ref db)) = flow_opt {
        fh.step(db, "start_websocket", "info", "lib", "ok", 0,
                "WebSocket push service started on port 9104", None).await;
    }

    // Daily flow-log cleanup scheduler — purges T3_FLOW rows older than 30 days
    // Runs once per 24 hours in the background; first run after 1 hour to avoid startup noise.
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
        loop {
            run_flow_cleanup().await;
            tokio::time::sleep(tokio::time::Duration::from_secs(86400)).await;
        }
    });

    // Start HTTP server (this will block); DLL_INIT flow completes inside server_start after port bind
    let http_result = server::server_start(flow_opt).await;

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
            println!("[RELOAD] Force running database migrations...");
        match utils::run_migrations().await {
            Ok(_) => println!("[OK] Database migrations completed"),
            Err(e) => {
                eprintln!("[ERROR] Database migration failed: {:?}", e);
                return Err(e);
            }
        }
    }

    // Start all services normally (which will auto-detect pending migrations)
    start_all_services().await
}

/// Start services while forcing only webview_t3_device migrations.
/// This mode avoids touching the general webview_database migration path.
pub async fn start_all_services_t3_migrations_only() -> Result<(), Box<dyn std::error::Error>> {
    println!("[RELOAD] Force running T3 device migrations only...");
    crate::server::debug_log("[RELOAD] Force running T3 device migrations only...");
    match utils::run_t3_device_migrations().await {
        Ok(_) => { println!("[OK] T3 device migrations completed"); crate::server::debug_log("[OK] T3 device migrations completed"); },
        Err(e) => {
            eprintln!("[ERROR] T3 device migration failed: {:?}", e);
            return Err(e);
        }
    }

    server::set_skip_general_migrations(true);
    let result = start_all_services().await;
    server::set_skip_general_migrations(false);
    result
}

/// Abstracted T3000 server startup for DLL entry point
#[no_mangle]
pub extern "C" fn run_t3_server() -> RustError {
    let result = panic::catch_unwind(|| {
        let runtime = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(_) => return RustError::Error,
        };

        runtime.block_on(async {
            println!("[LINK] T3000 DLL Entry Point: Starting all services...");
            crate::server::debug_log("[LINK] T3000 DLL Entry Point: Starting all services...");

            match start_all_services().await {
                Ok(_) => {
                    println!("[OK] T3000 WebView API services started from DLL");
                    crate::server::debug_log("[OK] T3000 WebView API services started from DLL");
                    RustError::Ok
                }
                Err(err) => {
                    eprintln!("[ERROR] DLL service startup failed: {:?}", err);
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
