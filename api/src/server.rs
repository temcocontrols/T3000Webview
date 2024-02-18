use axum::{
    http::{Method, StatusCode},
    routing::get_service,
    Router,
};
use dotenvy_macro::dotenv;

use tokio::{net::TcpListener, signal};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use super::{db_connection::establish_connection, modbus_register::routes::modbus_register_routes};

pub async fn server_start() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    let conn = establish_connection().await;

    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(Any)
        // allow requests from any origin
        .allow_origin(Any);

    // build our application with a route
    let app = Router::new()
        .nest("/api", modbus_register_routes())
        .layer(cors)
        .with_state(conn)
        .fallback_service(routes_static());

    let server_port = dotenv!("PORT");

    // run our app with hyper
    let listener = TcpListener::bind(format!("0.0.0.0:{}", &server_port))
        .await
        .unwrap();
    println!("->> LISTENING on {:?}\n", listener.local_addr());
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
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
    let spa_dir = dotenv!("SPA_DIR");
    Router::new().nest_service(
        "/",
        get_service(ServeDir::new(&spa_dir)).handle_error(|_| async move {
            (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
        }),
    )
}
