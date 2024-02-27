use sea_orm::DatabaseConnection;
use sqlx::{Pool, Sqlite};

use crate::db_connection::{establish_connection, sea_orm_establish_connection};

#[derive(Clone)]
pub struct AppState {
    pub conn: Pool<Sqlite>,
    pub sea_orm_conn: DatabaseConnection,
}

pub async fn app_state() -> AppState {
    let conn = establish_connection().await;
    let sea_orm_conn = sea_orm_establish_connection().await;
    AppState { conn, sea_orm_conn }
}
