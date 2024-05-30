use std::{env, error::Error};

use axum::{
    http::StatusCode,
    routing::{get, get_service},
    Router,
};

use tokio::{net::TcpListener, signal};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use crate::{
    app_state,
    file::routes::file_routes,
    utils::{run_migrations, SPA_DIR},
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
pub async fn create_app() -> Result<Router, Box<dyn Error>> {
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    let app_state = app_state::app_state().await?;

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
    tracing_subscriber::fmt::init();

    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Run database migrations
    run_migrations().await?;

    // Create the application state
    let app = create_app().await?;

    // Get the server port from environment variable or default to 9103
    let server_port = env::var("PORT").unwrap_or_else(|_| "9103".to_string());

    // Bind the server to the specified port
    let listener = TcpListener::bind(format!("0.0.0.0:{}", &server_port)).await?;

    // Print the server address
    println!("->> LISTENING on {:?}\n", listener.local_addr());

    // Start the server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
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
    }
}
