use std::env;

use sqlx::SqlitePool;

pub async fn establish_connection() -> SqlitePool {
    let database_url =
        env::var("DATABASE_URL").unwrap_or("sqlite://ResourceFile/webview_database.db".to_string());
    SqlitePool::connect(&database_url)
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}
