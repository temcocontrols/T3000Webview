use std::time::Duration;

use crate::utils::DATABASE_URL;

use sea_orm::{ConnectOptions, Database, DatabaseConnection};

pub async fn establish_connection() -> Result<DatabaseConnection, Box<dyn std::error::Error>> {
    let mut opt = ConnectOptions::new(DATABASE_URL.as_str());
    opt.max_connections(4)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(3))
        .max_lifetime(Duration::from_secs(60))
        .sqlx_logging(false);

    Database::connect(opt).await.map_err(|error| error.into())
}
