use crate::utils::DATABASE_URL;

use sea_orm::{Database, DatabaseConnection};
use sqlx::SqlitePool;

pub async fn establish_connection() -> SqlitePool {
    SqlitePool::connect(DATABASE_URL.as_str())
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", DATABASE_URL.as_str()))
}

pub async fn sea_orm_establish_connection() -> DatabaseConnection {
    Database::connect(DATABASE_URL.as_str())
        .await
        .expect("Database connection failed")
}
