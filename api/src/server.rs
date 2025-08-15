use std::{env, error::Error};

use axum::{
    http::StatusCode,
    routing::{get, get_service},
    Router,
};

use tokio::{net::TcpListener, signal, sync::mpsc};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use crate::{
    app_state::{self, AppState, T3AppState, create_t3_app_state},
    file::routes::file_routes,
    t3_device::routes::t3_device_routes,
    utils::{run_migrations, SHUTDOWN_CHANNEL, SPA_DIR},
};

use super::modbus_register::routes::modbus_register_routes;
use super::user::routes::user_routes;

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

    Ok(Router::new()
        .nest(
            "/api",
            // Original routes with original AppState
            modbus_register_routes()
                .merge(user_routes())
                .merge(file_routes())
                .route("/health", get(health_check_handler))
                .with_state(original_state)
        )
        // T3000 device routes with T3AppState
        .nest("/api/t3_device", t3_device_routes())
        .with_state(app_state)
        .fallback_service(routes_static())
        .layer(cors))
}

pub async fn server_start() -> Result<(), Box<dyn Error>> {
    use crate::logger::ServiceLogger;

    // Initialize service logger
    let mut logger = ServiceLogger::new("t3000_webview_service")
        .unwrap_or_else(|_| ServiceLogger::new("fallback_service").unwrap());

    logger.info("T3000 WebView Service Starting...");

    // Initialize basic tracing
    if let Err(_) = tracing_subscriber::fmt()
        .with_ansi(false)
        .try_init() {
        logger.warn("Tracing already initialized");
    } else {
        logger.info("Tracing initialized");
    }

    // Load environment variables from .env file
    dotenvy::dotenv().ok();
    logger.info("Environment variables loaded");

    // Run database migrations
    match run_migrations().await {
        Ok(_) => logger.info("Database migrations completed"),
        Err(e) => {
            logger.error(&format!("Database migration failed: {:?}", e));
            return Err(e);
        }
    }

    // Create the enhanced T3000 application state
    let state = match create_t3_app_state().await {
        Ok(state) => {
            logger.info("T3000 application state created");
            state
        },
        Err(e) => {
            logger.error(&format!("Failed to create T3000 application state: {:?}", e));
            return Err(e);
        }
    };

    // Create the application with T3000 device routes
    let app = match create_t3_app(state.clone()).await {
        Ok(app) => {
            logger.info("Application router created");
            app
        },
        Err(e) => {
            logger.error(&format!("Failed to create application router: {:?}", e));
            return Err(e);
        }
    };

    // Get the server port from environment variable or default to 9103
    let server_port = env::var("PORT").unwrap_or_else(|_| "9103".to_string());
    logger.info(&format!("Server will bind to port: {}", server_port));

    // Bind the server to the specified port
    let listener = match TcpListener::bind(format!("0.0.0.0:{}", &server_port)).await {
        Ok(listener) => {
            logger.info(&format!("Server bound to 0.0.0.0:{}", server_port));
            listener
        },
        Err(e) => {
            logger.error(&format!("Failed to bind server to port {}: {:?}", server_port, e));
            return Err(e.into());
        }
    };

    logger.info(&format!("T3000 WebView Service listening on {:?}", listener.local_addr()));

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
}async fn shutdown_signal(state: AppState) {
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
