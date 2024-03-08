use std::error::Error;

use sea_orm::DatabaseConnection;

use crate::db_connection::establish_connection;

#[derive(Clone)]
pub struct AppState {
    pub conn: DatabaseConnection,
}

pub async fn app_state() -> Result<AppState, Box<dyn Error>> {
    let conn = establish_connection().await?;
    Ok(AppState { conn })
}
