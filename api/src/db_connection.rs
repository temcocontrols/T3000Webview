use dotenvy::dotenv;
use sqlx::SqlitePool;
use std::env;

pub async fn establish_connection() -> SqlitePool {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    SqlitePool::connect(&database_url)
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}
