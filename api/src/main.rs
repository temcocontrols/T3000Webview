use std::env;

use axum::{
    http::{Method, StatusCode},
    routing::get_service,
    Router,
};
use dotenvy::dotenv;
use tokio::net::TcpListener;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

use modbus_register_api::{
    db_connection::establish_connection, modbus_register::routes::modbus_register_routes,
};

#[tokio::main]
async fn main() {
    dotenv().ok();
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

    let server_port = env::var("PORT").unwrap_or("9013".to_string());

    // run our app with hyper
    let listener = TcpListener::bind(format!("0.0.0.0:{}", &server_port))
        .await
        .unwrap();
    println!("->> LISTENING on {:?}\n", listener.local_addr());
    axum::serve(listener, app).await.unwrap();
}

fn routes_static() -> Router {
    let spa_dir = env::var("SPA_DIR").unwrap_or("./www".to_string());
    Router::new().nest_service(
        "/",
        get_service(ServeDir::new(&spa_dir)).handle_error(|_| async move {
            (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
        }),
    )
}
