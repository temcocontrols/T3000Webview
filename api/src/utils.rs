use lazy_static::lazy_static;
use sqlx::SqlitePool;
use std::{env, fs, path::Path};

lazy_static! {
    pub static ref DATABASE_URL: String = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://Database/webview_database.db".to_string());
    pub static ref REMOTE_API_URL: String = env::var("REMOTE_API_URL")
        .unwrap_or_else(|_| "https://user-lib.temcocontrols.com".to_string());
}

pub fn copy_database_if_not_exists() -> Result<(), Box<dyn std::error::Error>> {
    let source_db_path = Path::new("ResourceFile/webview_database.db");
    let destination_db_path = Path::new(
        DATABASE_URL
            .strip_prefix("sqlite://")
            .ok_or("Invalid database url")?,
    );

    let destination_dir = destination_db_path
        .parent()
        .ok_or("Invalid destination database path")?;

    // Create the destination directory if it doesn't exist
    if !destination_dir.exists() {
        fs::create_dir_all(destination_dir)?;
        println!("Created destination directory: {:?}", destination_dir);
    }

    // Copy the database file if it doesn't exist in the destination directory
    if !destination_db_path.exists() {
        // Check if the source database file exists
        if !source_db_path.exists() {
            return Err(From::from(format!(
                "Source database file does not exist: {:?}",
                source_db_path
            )));
        }
        fs::copy(&source_db_path, &destination_db_path)?;
        println!(
            "Copied database file from {:?} to {:?}",
            source_db_path, destination_db_path
        );
    }

    Ok(())
}

pub async fn run_migrations() -> Result<(), Box<dyn std::error::Error>> {
    use sqlx::migrate::Migrator;

    static MIGRATOR: Migrator = sqlx::migrate!("./migrations");
    let conn = SqlitePool::connect(DATABASE_URL.as_str()).await?;
    MIGRATOR.run(&conn).await?;
    Ok(())
}
