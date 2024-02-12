use axum::{
    extract::{Path, Query},
    routing::{get, patch},
    Json, Router,
};

use modbus_register_api::{
    db_connection::establish_connection,
    error::{Error, Result},
    models::{ModbusRegister, ModbusRegisterColumns, ModbusRegisterPagination, OrderByDirection},
    // queries::{
    //     create_modbus_register_item, delete_modbus_register_item, update_modbus_register_item
    // },
};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    // build our application with a route
    let app = Router::new().route(
        "/",
        get(list), /* .post(create) )
                   // .route("/:id", patch(update).delete(delete)*/
    );

    // run our app with hyper, listening globally on port 3000
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("->> LISTENING on {:?}\n", listener.local_addr());
    axum::serve(listener, app).await.unwrap();
}

async fn list(pagination: Query<ModbusRegisterPagination>) -> Result<Json<Vec<ModbusRegister>>> {
    let mut conn = establish_connection().await;

    let mut sql_query = "SELECT * FROM modbus_register_items".to_string();

    if pagination.filter.is_some() {
        let filter = pagination.filter.clone().unwrap();

        let filter_num = filter.parse::<i32>();
        sql_query = format!(
            "{sql_query} WHERE register_name LIKE '%{filter}%'
            OR operation LIKE '%{filter}%'
            OR description LIKE '%{filter}%'
            OR device_name LIKE '%{filter}%'
            OR unit LIKE '%{filter}%'",
            filter = filter,
            sql_query = sql_query
        );

        if filter_num.is_ok() {
            let filter_num = filter_num.unwrap();
            sql_query = format!(
                "{sql_query} OR id LIKE {filter_num}
                OR register_address LIKE {filter_num}",
                filter_num = filter_num,
                sql_query = sql_query
            );
        }
    }

    sql_query = format!(
        "{} ORDER BY {:?} {:?} LIMIT ? OFFSET ?",
        sql_query,
        pagination
            .order_by
            .as_ref()
            .unwrap_or(&ModbusRegisterColumns::Id),
        pagination
            .order_dir
            .as_ref()
            .unwrap_or(&OrderByDirection::Desc)
    );

    println!("query: {:?}", sql_query);
    let results = sqlx::query_as::<_, ModbusRegister>(&sql_query)
        .bind(&pagination.limit.clone().unwrap_or(100))
        .bind(&pagination.offset.clone().unwrap_or(0))
        .fetch_all(&mut conn)
        .await;

    match results {
        Ok(items) => Ok(Json(items)),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

// async fn create(
//     Json(payload): Json<CreateModbusRegisterInput>,
// ) -> Result<Json<ModbusRegister>> {
//     let connection = &mut establish_connection();

//     let item = create_modbus_register_item(connection, payload)?;

//     Ok(Json(item))
// }

// async fn update(
//     Path(id): Path<i32>,
//     Json(payload): Json<UpdateModbusRegisterInput>,
// ) -> Result<Json<ModbusRegister>> {
//     let connection = &mut establish_connection();

//     let item = update_modbus_register_item(connection, id, payload)?;

//     Ok(Json(item))
// }

// async fn delete(Path(id): Path<i32>) -> Result<Json<ModbusRegister>> {
//     let connection = &mut establish_connection();

//     let item = delete_modbus_register_item(connection, id)?;

//     Ok(Json(item))
// }
