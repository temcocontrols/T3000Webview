use std::{env, error::Error};

use axum::{
    http::StatusCode,
    routing::{get, get_service},
    Router,
};

use tokio::{net::TcpListener, signal, suse crate::t3_device::routes::t3_device_routes;

/// Abstracted application router with only T3000 device routes (separate from original API)
pub async fn create_t3_app(app_state: AppState) -> Result<Router, Box<dyn Error>> {
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    Ok(Router::new()
        .nest(
            "/api",
            Router::new()
                .nest("/t3device", t3_device_routes())
                .route("/health", get(health_check_handler)),
        )
        .with_state(app_state)
        .fallback_service(routes_static())
        .layer(cors))
}

/// Abstracted WebSocket service for port 9104
pub async fn start_websocket_service() -> Result<(), Box<dyn Error>> {
    t3_server_logging("🔌 Starting WebSocket Service on port 9104...");

    let clients = crate::t3_socket::create_clients();
    crate::t3_socket::start_websocket_server(clients.clone()).await;
    tokio::spawn(crate::t3_socket::monitor_clients_status(clients));

    t3_server_logging("✅ WebSocket Service started successfully on port 9104");
    Ok(())
}

/// Abstracted logging for server operations
pub fn t3_server_logging(message: &str) {
    println!("{}", message);
}

/// Abstracted WebSocket service startup (can be used alongside original server_start)
pub async fn start_t3_server() -> Result<(), Box<dyn Error>> {
    t3_server_logging("🚀 Starting T3000 WebSocket service...");

    // Start only the WebSocket server on port 9104
    start_websocket_service().await?;

    t3_server_logging("✅ T3000 WebSocket service started successfully");
    Ok(())
}
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use crate::{
    app_state::{self, AppState},
    file::routes::file_routes,
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
    println!("->> Health check");
    "OK"
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

pub async fn server_start() -> Result<(), Box<dyn Error>> {
    // Initialize tracing
    if let Err(_) = tracing_subscriber::fmt().try_init() {
        // Handle the error or ignore it if reinitialization is not needed
    }

    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Run database migrations
    run_migrations().await?;

    // Create the application state
    let state = app_state::app_state().await?;

    // Create the application state
    let app = create_app(state.clone()).await?;

    // Get the server port from environment variable or default to 9103
    let server_port = env::var("PORT").unwrap_or_else(|_| "9103".to_string());

    // Bind the server to the specified port
    let listener = TcpListener::bind(format!("0.0.0.0:{}", &server_port)).await?;

    // Print the server address
    println!("->> LISTENING on {:?}\n", listener.local_addr());

    // Start the server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(state))
        .await?;

    Ok(())
}

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

// ============================================================================
// ABSTRACTED FUNCTIONS - All new functionality separated from original code
// ============================================================================

use crate::t3_device::routes::t3_device_routes;

/// Abstracted enhanced application router with T3000 device routes
pub async fn create_enhanced_app(app_state: AppState) -> Result<Router, Box<dyn Error>> {
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
                .nest("/t3device", t3_device_routes())
                .route("/health", get(health_check_handler)),
        )
        .with_state(app_state)
        .fallback_service(routes_static())
        .layer(cors))
}

/// Abstracted WebSocket service for port 9104
pub async fn start_websocket_service() -> Result<(), Box<dyn Error>> {
    t3_enhanced_server_logging("� Starting WebSocket Service on port 9104...");

    let clients = crate::t3_socket::create_clients();
    crate::t3_socket::start_websocket_server(clients.clone()).await;
    tokio::spawn(crate::t3_socket::monitor_clients_status(clients));

    t3_enhanced_server_logging("✅ WebSocket Service started successfully on port 9104");
    Ok(())
}

/// Abstracted enhanced logging for server operations
pub fn t3_enhanced_server_logging(message: &str) {
    println!("{}", message);
}

/// Abstracted WebSocket service startup (can be used alongside original server_start)
pub async fn enhanced_server_start() -> Result<(), Box<dyn Error>> {
    t3_enhanced_server_logging("🚀 Starting enhanced WebSocket service...");

    // Start only the WebSocket server on port 9104
    start_websocket_service().await?;

    t3_enhanced_server_logging("✅ Enhanced WebSocket service started successfully");
    Ok(())
}
