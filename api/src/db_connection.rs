use std::env;

use sea_orm::{Database, DatabaseConnection};
use sqlx::SqlitePool;

pub async fn establish_connection() -> SqlitePool {
    let database_url =
        env::var("DATABASE_URL").unwrap_or("sqlite://ResourceFile/webview_database.db".to_string());
    SqlitePool::connect(&database_url)
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

pub async fn sea_orm_establish_connection() -> DatabaseConnection {
    let database_url =
        env::var("DATABASE_URL").unwrap_or("sqlite://ResourceFile/webview_database.db".to_string());
    Database::connect(database_url)
        .await
        .expect("Database connection failed")
}
