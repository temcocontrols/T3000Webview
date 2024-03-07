use crate::utils::DATABASE_URL;

use sea_orm::{Database, DatabaseConnection};

pub async fn establish_connection() -> DatabaseConnection {
    Database::connect(DATABASE_URL.as_str())
        .await
        .expect("Database connection failed")
}
