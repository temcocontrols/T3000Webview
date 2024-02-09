use axum::{
    extract::{Path, Query},
    routing::{get, patch},
    Json, Router,
};
use diesel::prelude::*;
use modbus_register_api::{
    db_connection::establish_connection,
    error::{Error, Result},
    extra_models::{CreateModbusRegisterItemInput, UpdateModbusRegisterItemInput},
    models::ModbusRegisterItem,
    queries::{
        create_modbus_register_item, delete_modbus_register_item, update_modbus_register_item,
        Pagination,
    },
};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    // build our application with a route
    let app = Router::new()
        .route("/", get(list).post(create))
        .route("/:id", patch(update).delete(delete));

    // run our app with hyper, listening globally on port 3000
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("->> LISTENING on {:?}\n", listener.local_addr());
    axum::serve(listener, app).await.unwrap();
}

async fn list(pagination: Query<Pagination>) -> Result<Json<Vec<ModbusRegisterItem>>> {
    use modbus_register_api::schema::modbus_register_items::dsl::*;

    let connection = &mut establish_connection();
    let order_by = pagination.order_by.clone().unwrap_or("id".to_string())
        + " "
        + &pagination.order_dir.clone().unwrap_or("asc".to_string());
    let order_by = diesel::dsl::sql::<diesel::sql_types::Text>(&order_by);
    let filter = pagination.filter.clone().unwrap_or("%".to_string());
    let filter_num = pagination
        .filter
        .clone()
        .unwrap_or("0".to_string())
        .parse::<i32>()
        .unwrap_or(0);
    let results = modbus_register_items
        .limit(pagination.limit.unwrap_or(100))
        .offset(pagination.offset.unwrap_or(0))
        .order_by(order_by)
        .or_filter(register_name.like(&format!("%{}%", filter)))
        .or_filter(description.like(&format!("%{}%", filter)))
        .or_filter(data_format.like(&format!("%{}%", filter)))
        .or_filter(device_name.like(&format!("%{}%", filter)))
        .or_filter(unit.like(&format!("%{}%", filter)))
        .or_filter(id.eq(filter_num))
        .or_filter(register_address.eq(filter_num))
        .select(ModbusRegisterItem::as_select())
        .load(connection);

    match results {
        Ok(items) => Ok(Json(items)),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

async fn create(
    Json(payload): Json<CreateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegisterItem>> {
    let connection = &mut establish_connection();

    let item = create_modbus_register_item(connection, payload)?;

    Ok(Json(item))
}

async fn update(
    Path(id): Path<i32>,
    Json(payload): Json<UpdateModbusRegisterItemInput>,
) -> Result<Json<ModbusRegisterItem>> {
    let connection = &mut establish_connection();

    let item = update_modbus_register_item(connection, id, payload)?;

    Ok(Json(item))
}

async fn delete(Path(id): Path<i32>) -> Result<Json<ModbusRegisterItem>> {
    let connection = &mut establish_connection();

    let item = delete_modbus_register_item(connection, id)?;

    Ok(Json(item))
}
