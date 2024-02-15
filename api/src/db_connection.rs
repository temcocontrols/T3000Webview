use dotenvy_macro::dotenv;
use sqlx::SqlitePool;

pub async fn establish_connection() -> SqlitePool {
    let database_url = dotenv!("DATABASE_URL");
    SqlitePool::connect(&database_url)
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}
