use std::{env, error::Error};
use std::sync::atomic::{AtomicBool, Ordering};

use axum::{
    http::{HeaderName, StatusCode},
    middleware,
    middleware::Next,
    extract::Request,
    response::Response,
    routing::{get, get_service},
    Json,
    Router,
};

use tokio::{net::TcpListener, signal, sync::mpsc};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use crate::{
    app_state::{AppState, T3AppState, create_t3_app_state},
    file::routes::file_routes,
    t3_device::routes::t3_device_routes,
    utils::{SHUTDOWN_CHANNEL, SPA_DIR},
};

use super::modbus_register::routes::modbus_register_routes;
use super::user::routes::user_routes;

/// Writes to two outputs simultaneously — console + file.
struct TeeWriter<A: std::io::Write, B: std::io::Write> {
    a: A,
    b: B,
}

impl<A: std::io::Write, B: std::io::Write> TeeWriter<A, B> {
    fn new(a: A, b: B) -> Self {
        Self { a, b }
    }
}

impl<A: std::io::Write, B: std::io::Write> std::io::Write for TeeWriter<A, B> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let n = self.a.write(buf)?;
        let _ = self.b.write_all(&buf[..n]);
        Ok(n)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.a.flush()?;
        self.b.flush()
    }
}

/// Axum middleware that propagates an incoming `X-Flow-Id` header to the response.
/// If the request carries no such header, the response is unchanged.
async fn propagate_flow_id(req: Request, next: Next) -> Response {
    static X_FLOW_ID: HeaderName = HeaderName::from_static("x-flow-id");

    let flow_id = req
        .headers()
        .get(&X_FLOW_ID)
        .cloned();

    let mut resp = next.run(req).await;

    if let Some(v) = flow_id {
        resp.headers_mut().insert(X_FLOW_ID.clone(), v);
    }

    resp
}

/// Returns the server's current local time as an ISO-8601 string (no timezone suffix).
/// The frontend uses this to align query windows with the server's clock, regardless
/// of whether the client is in a different timezone.
async fn server_time_handler() -> Json<serde_json::Value> {
    let now = chrono::Local::now();
    Json(serde_json::json!({
        "server_time": now.format("%Y-%m-%dT%H:%M:%S").to_string(),
        "utc_offset_seconds": now.offset().local_minus_utc(),
    }))
}

fn routes_static() -> Router {
    Router::new().nest_service(
        "/",
        get_service(ServeDir::new(SPA_DIR.as_str())).handle_error(|_| async move {
            (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
        }),
    )
}

async fn health_check_handler() -> &'static str {
    "T3000 WebView Service OK"
}

static SKIP_GENERAL_MIGRATIONS: AtomicBool = AtomicBool::new(false);

pub fn set_skip_general_migrations(skip: bool) {
    SKIP_GENERAL_MIGRATIONS.store(skip, Ordering::SeqCst);
}

// This function creates the application state and returns a router with all of the routes for the API.
pub async fn create_app(app_state: AppState) -> Result<Router, Box<dyn Error>> {
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    Ok(Router::new()
        .nest(
            "/api",
            modbus_register_routes()
                .merge(user_routes())
                .merge(file_routes())
                .merge(crate::log::log_routes())
                .route("/health", get(health_check_handler)),
        )
        .with_state(app_state)
        .fallback_service(routes_static())
        .layer(cors))
}

// Enhanced T3000 application router with both original and T3000 device routes
pub async fn create_t3_app(app_state: T3AppState) -> Result<Router, Box<dyn Error>> {
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    // Create original AppState from T3AppState for compatibility with original routes
    let original_state = AppState {
        conn: app_state.conn.clone(),
    };

    // Start heartbeat task for server/client registry
    crate::database_management::registry_service::start_heartbeat_task(app_state.clone());

    Ok(Router::new()
        .nest(
            "/api",
            // Original routes with original AppState
            modbus_register_routes()
                .merge(user_routes())
                .merge(file_routes())
                .merge(crate::log::log_routes())
                .route("/health", get(health_check_handler))
                .with_state(original_state)
                .merge(
                    // Data Sync Metadata API routes with T3AppState
                    crate::database_management::data_sync_endpoints::create_sync_status_routes()
                        .with_state(app_state.clone())
                )
        )
        // T3000 device routes with T3AppState
        .nest("/api/t3_device", t3_device_routes())
        // T3000 FFI API routes with T3AppState
        .merge(crate::t3_device::t3_ffi_api_service::create_ffi_api_routes())
        // Database Management routes with T3AppState
        .merge(crate::database_management::endpoints::database_management_routes())
        // Application Configuration API routes
        .merge(crate::database_management::config_api::config_routes())
        // Database Backend Configuration API routes
        .merge(crate::database_management::db_backend_routes::db_backend_routes())
        // Server DB Status route (server/client mode)
        .merge(crate::web_routing::server_db_routes())
        // Server/Client Registry routes (heartbeat + listing)
        .merge(crate::database_management::registry_service::registry_routes())
        // Sync Health + Event Log routes
        .merge(crate::database_management::sync_health::sync_health_routes())
        // Developer Tools routes
        .nest("/api/develop", crate::t3_develop::create_develop_routes())
        // Flow log routes
        .merge(crate::logging::flow_api::flow_routes())
        // Haystack API routes
        .merge(crate::t3_device::haystack_routes::create_haystack_routes())
        // Point Sets API routes (DB-backed)
        .merge(crate::t3_device::point_sets_routes::create_point_sets_routes())
        // Server local-time endpoint (for client timezone alignment)
        .route("/api/server/time", get(server_time_handler))
        // Real-time trend data routes - TEMPORARILY DISABLED
        // .nest("/api", crate::t3_device::trend_routes::trend_data_routes())
        .with_state(app_state)
        .fallback_service(routes_static())
        .layer(middleware::from_fn(propagate_flow_id))
        .layer(cors))
}

pub async fn server_start(
    flow_opt: Option<(crate::logging::flow::FlowHandle, sea_orm::DatabaseConnection)>,
) -> Result<(), Box<dyn Error>> {
    use crate::logger::ServiceLogger;

    // Initialize service logger - route to API log category
    let mut logger = ServiceLogger::new("T3_Webview_API")
        .unwrap_or_else(|_| ServiceLogger::new("fallback_service").unwrap());

    logger.info("T3000 WebView HTTP API Service Starting on port 9103...");

    // Initialize basic tracing — always console, optionally + file.
    // Set debug_log=1 in setting.ini (any section) to enable file logging.
    let enable_debug_log = crate::ini_config::read_debug_log_flag();

    if enable_debug_log {
        match std::fs::File::create("t3-webview-api-dll.log") {
            Ok(log_file) => {
                let tee = TeeWriter::new(std::io::stdout(), log_file);
                tracing_subscriber::fmt()
                    .with_ansi(false)
                    .with_writer(std::sync::Mutex::new(tee))
                    .try_init()
                    .ok();
                logger.info("Tracing initialized — console + t3-webview-api-dll.log");
            }
            Err(e) => {
                // File log failed — fall back to console only, do not crash
                tracing_subscriber::fmt()
                    .with_ansi(false)
                    .with_writer(std::io::stdout)
                    .try_init()
                    .ok();
                logger.warn(&format!(
                    "File log unavailable ({}), tracing initialized — console only",
                    e
                ));
            }
        }
    } else {
        tracing_subscriber::fmt()
            .with_ansi(false)
            .with_writer(std::io::stdout)
            .try_init()
            .ok();
        logger.info("Tracing initialized — console only");
    }

    // Load environment variables from .env file
    dotenvy::dotenv().ok();
    logger.info("Environment variables loaded");

    if SKIP_GENERAL_MIGRATIONS.load(Ordering::SeqCst) {
        logger.info("Skipping general migrations (T3-only startup mode)");
    } else {
        // Smart migration system: only run if there are pending migrations
        let t_mig = std::time::Instant::now();
        match crate::utils::run_migrations_if_pending().await {
            Ok(_) => {
                if let Some((ref fh, ref db)) = flow_opt {
                    fh.step(db, "migrations", "info", "db", "ok",
                        t_mig.elapsed().as_millis() as i64, "schema verified — all migrations applied", None).await;
                }
            },
            Err(e) => {
                logger.error(&format!("Migration check/execution failed: {:?}", e));
                if let Some((ref fh, ref db)) = flow_opt {
                    fh.step(db, "migrations", "error", "db", "error",
                        t_mig.elapsed().as_millis() as i64, &e.to_string(), None).await;
                    fh.done(db, "error").await;
                }
                return Err(e);
            }
        }
    }

    // Create the enhanced T3000 application state
    let t_state = std::time::Instant::now();
    let state = match create_t3_app_state().await {
        Ok(state) => {
            logger.info("T3000 application state created");
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "app_state", "info", "db", "ok",
                    t_state.elapsed().as_millis() as i64,
                    &format!("center_db={} role={}", state.server_db_connected, state.server_db_role),
                    None).await;
            }
            // Emit a STARTUP activity-log entry now that the DB is ready
            {
                use crate::logging::service::emit_app_log;
                let db = state.conn.lock().await;
                emit_app_log(
                    &*db,
                    "info",
                    "STARTUP",
                    Some("server"),
                    None,
                    "T3000 WebView server started",
                    None,
                ).await;
            }
            state
        },
        Err(e) => {
            logger.error(&format!("Failed to create T3000 application state: {:?}", e));
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "app_state", "error", "db", "error",
                    t_state.elapsed().as_millis() as i64, &e.to_string(), None).await;
                fh.done(db, "error").await;
            }
            return Err(e);
        }
    };

    // Initialize global server DB writer for FFI dual-write support
    // Use server_db_connected (not server_db_enabled) — only activate replication
    // when the actual server DB connection succeeded. If MSSQL timed out and
    // we fell back to local SQLite, server_db_connected=false, so replication
    // is skipped to prevent self-replication and SQLite deadlocks.
    crate::server_db_writer::init_server_db_writer(
        state.t3_device_conn.clone(),
        state.mssql_pool.clone(),
        state.server_db_role.clone(),
        state.server_db_connected, // only true when center DB actually connected
    );
    if state.server_db_connected {
        logger.info(&format!(
            "Server DB writer initialized (role={}, center DB connected)",
            state.server_db_role
        ));
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "server_db_writer", "info", "lib", "ok", 0,
                &format!("server DB writer active, role={}", state.server_db_role), None).await;
        }
    } else if state.server_db_enabled {
        logger.warn(&format!(
            "Server DB enabled in INI but center DB unreachable — replication disabled (role={})",
            state.server_db_role
        ));
        // Pause FFI sampling so no data is written to SQLite when center DB is expected
        crate::app_state::set_sampling_paused("Center DB unreachable at startup");
        logger.warn("Sampling paused: center DB unreachable at startup");
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "server_db_writer", "warn", "lib", "warn", 0,
                &format!("center DB unreachable, replication disabled, role={}", state.server_db_role), None).await;
        }
    } else {
        if let Some((ref fh, ref db)) = flow_opt {
            fh.step(db, "server_db_writer", "info", "lib", "skip", 0,
                "center DB not enabled, local-only mode", None).await;
        }
    }

    // Create the application with T3000 device routes
    let t_router = std::time::Instant::now();
    let app = match create_t3_app(state.clone()).await {
        Ok(app) => {
            logger.info("Application router created");
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "router_create", "info", "lib", "ok",
                    t_router.elapsed().as_millis() as i64, "HTTP routes registered — device, auth, trendlog, users, logs", None).await;
            }
            app
        },
        Err(e) => {
            logger.error(&format!("Failed to create application router: {:?}", e));
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "router_create", "error", "lib", "error",
                    t_router.elapsed().as_millis() as i64, &e.to_string(), None).await;
                fh.done(db, "error").await;
            }
            return Err(e);
        }
    };

    // Get the server port from environment variable or default to 9103
    let server_port = env::var("PORT").unwrap_or_else(|_| "9103".to_string());
    logger.info(&format!("Server will bind to port: {}", server_port));

    // Bind the server to the specified port
    let t_bind = std::time::Instant::now();
    let listener = match TcpListener::bind(format!("0.0.0.0:{}", &server_port)).await {
        Ok(listener) => {
            logger.info(&format!("Server bound to 0.0.0.0:{}", server_port));
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "bind_port", "info", "lib", "ok",
                    t_bind.elapsed().as_millis() as i64,
                    &format!("port {} open — API ready to accept requests", server_port), None).await;
                fh.done(db, "ok").await;
            }
            listener
        },
        Err(e) => {
            logger.error(&format!("Failed to bind server to port {}: {:?}", server_port, e));
            if let Some((ref fh, ref db)) = flow_opt {
                fh.step(db, "bind_port", "error", "lib", "error",
                    t_bind.elapsed().as_millis() as i64, &e.to_string(), None).await;
                fh.done(db, "error").await;
            }
            return Err(e.into());
        }
    };

    logger.info(&format!("T3000 WebView Service listening on {:?}", listener.local_addr()));

    // Print visible confirmation so user knows server is ready
    println!("✅ Server is READY — listening on {:?}", listener.local_addr());
    println!("   Open http://localhost:{} in your browser", server_port);

    // Start the server with graceful shutdown
    match axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal_t3(state))
        .await {
        Ok(_) => {
            logger.info("Server stopped gracefully");
            Ok(())
        },
        Err(e) => {
            logger.error(&format!("Server error: {:?}", e));
            Err(e.into())
        }
    }
}
#[allow(dead_code)]
async fn shutdown_signal(state: AppState) {
    let (shutdown_tx, mut shutdown_rx) = mpsc::channel(1);

    // Store the sender in the SHUTDOWN_CHANNEL
    *SHUTDOWN_CHANNEL.lock().await = shutdown_tx;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
        _ = shutdown_rx.recv() => {}, // Listen for the shutdown signal
    }

    // Drop the database connection gracefully
    println!("->> SHUTTING DOWN: Closing database connection...");
    let _ = state.conn.lock().await; // Lock and drop the connection
}

async fn shutdown_signal_t3(state: T3AppState) {
    let (shutdown_tx, mut shutdown_rx) = mpsc::channel(1);

    // Store the sender in the SHUTDOWN_CHANNEL
    *SHUTDOWN_CHANNEL.lock().await = shutdown_tx;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
        _ = shutdown_rx.recv() => {}, // Listen for the shutdown signal
    }

    // Drop the database connections gracefully
    println!("->> SHUTTING DOWN: Closing database connections...");
    let _ = state.conn.lock().await; // Lock and drop the original connection
    if let Some(ref t3_device_conn) = state.t3_device_conn {
        let _ = t3_device_conn.lock().await; // Lock and drop the T3 device connection if available
    }
}
