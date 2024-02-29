use std::{env, fs, path::Path};

use axum::{
    http::{Method, StatusCode},
    routing::get_service,
    Router,
};

use tokio::{net::TcpListener, signal};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use crate::app_state;

use super::modbus_register::routes::modbus_register_routes;
use super::user::routes::user_routes;

pub async fn server_start() -> Result<(), Box<dyn std::error::Error>> {
    // initialize tracing
    tracing_subscriber::fmt::init();

    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://Database/webview_database.db".to_string());

    let source_db_path = "ResourceFile/webview_database.db";
    let destination_db_path = database_url
        .strip_prefix("sqlite://")
        .ok_or("Invalid database url")?;

    let destination_dir = Path::new(destination_db_path)
        .parent()
        .ok_or("Invalid destination database path")?;

    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
    }

    if !Path::new(destination_db_path).exists() {
        fs::copy(source_db_path, destination_db_path)?;
    }

    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(Any)
        .allow_origin(Any);

    let app = Router::new()
        .nest("/api", modbus_register_routes().merge(user_routes()))
        .layer(cors)
        .with_state(app_state::app_state().await)
        .fallback_service(routes_static());

    let server_port = env::var("PORT").unwrap_or_else(|_| "9103".to_string());

    let listener = TcpListener::bind(format!("0.0.0.0:{}", &server_port)).await?;

    println!("->> LISTENING on {:?}\n", listener.local_addr());
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

fn routes_static() -> Router {
    let spa_dir = env::var("SPA_DIR").unwrap_or("./ResourceFile/webview/www".to_string());
    Router::new().nest_service(
        "/",
        get_service(ServeDir::new(&spa_dir)).handle_error(|_| async move {
            (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
        }),
    )
}
