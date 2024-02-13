use axum::{
    extract::{Path, Query, State},
    routing::{get, patch},
    Json, Router,
};
use sqlx::{Pool, Sqlite};
use tokio::net::TcpListener;

use modbus_register_api::{
    db_connection::establish_connection,
    error::Result,
    models::{
        CreateModbusRegisterItemInput, ModbusRegister, ModbusRegisterPagination,
        UpdateModbusRegisterItemInput,
    },
    queries::{
        create_modbus_register_item, delete_modbus_register_item, list_modbus_register_items,
        update_modbus_register_item,
    },
};

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    let conn = establish_connection().await;

    // build our application with a route
    let app = Router::new()
        .route("/modbus-register", get(list).post(create))
        .route("/modbus-register/:id", patch(update).delete(delete))
        .with_state(conn);

    // run our app with hyper, listening globally on port 3000
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("->> LISTENING on {:?}\n", listener.local_addr());
    axum::serve(listener, app).await.unwrap();
}

async fn list(
    State(conn): State<Pool<Sqlite>>,
    Query(pagination): Query<ModbusRegisterPagination>,
) -> Result<Json<Vec<ModbusRegister>>> {
    let items = list_modbus_register_items(&conn, pagination).await?;

    Ok(Json(items))
}

async fn create(
    State(conn): State<Pool<Sqlite>>,
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegister>> {
    let item = create_modbus_register_item(&conn, payload).await?;

    Ok(Json(item))
}

async fn update(
    State(conn): State<Pool<Sqlite>>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegister>> {
    let item = update_modbus_register_item(&conn, id, payload).await?;

    Ok(Json(item))
}

async fn delete(
    State(conn): State<Pool<Sqlite>>,
    Path(id): Path<i32>,
) -> Result<Json<ModbusRegister>> {
    let item = delete_modbus_register_item(&conn, id).await?;

    Ok(Json(item))
}
