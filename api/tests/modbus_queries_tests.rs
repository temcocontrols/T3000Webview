use axum::{
    extract::{Path, Query, State},
    Json,
};
use t3_webview_api::{
    app_state::app_state,
    modbus_register::{
        models::{
            CreateModbusRegisterItemInput, ModbusRegisterQueryParams, UpdateModbusRegisterItemInput,
        },
        queries::{create, delete, generate_filter_query, list, update},
    },
};

#[tokio::test]
async fn test_modbus_register_generate_filter_query() {
    let base_query = "SELECT * FROM modbus_register".to_string();
    let filter = Some("test".to_string());
    let result = generate_filter_query(&filter, base_query.clone());
    println!("Result: {}", result);
    assert!(result.contains(base_query.as_str()));
}

#[tokio::test]
async fn test_modbus_register_list() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = t3_webview_api::db_connection::establish_connection().await;
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();
    let params = ModbusRegisterQueryParams {
        local_only: None,
        filter: None,
        order_by: None,
        limit: Some(1),
        offset: None,
        order_dir: None,
    };
    let result = list(State(app_state().await), Query(params)).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_modbus_register_create() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = t3_webview_api::db_connection::establish_connection().await;
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();
    let payload = CreateModbusRegisterItemInput {
        register_name: Some("test".to_string()),
        register_address: 1,
        operation: Some("test".to_string()),
        description: Some("test".to_string()),
        device_name: "test".to_string(),
        data_format: "test".to_string(),
        unit: Some("test".to_string()),
        register_length: 1,
    };
    let result = create(State(app_state().await), Json(payload)).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_modbus_register_update() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = t3_webview_api::db_connection::establish_connection().await;
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();
    let payload = CreateModbusRegisterItemInput {
        register_name: Some("test".to_string()),
        register_address: 1,
        operation: Some("test".to_string()),
        description: Some("test".to_string()),
        device_name: "test".to_string(),
        data_format: "test".to_string(),
        unit: Some("test".to_string()),
        register_length: 1,
    };
    let item = create(State(app_state().await), Json(payload))
        .await
        .unwrap();

    let id = Path(item.id);
    let payload = UpdateModbusRegisterItemInput {
        register_address: Some(2),
        operation: Some(Some("updated".to_string())),
        register_length: Some(2),
        register_name: Some(Some("updated".to_string())),
        data_format: Some("updated".to_string()),
        description: Some(Some("updated".to_string())),
        device_name: Some("updated".to_string()),
        unit: Some(Some("updated".to_string())),
    };
    let result = update(State(app_state().await), id, Json(payload)).await;
    println!("Result: {:?}", result);
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_modbus_register_delete() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = t3_webview_api::db_connection::establish_connection().await;
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();

    let payload = CreateModbusRegisterItemInput {
        register_name: Some("test".to_string()),
        register_address: 1,
        operation: Some("test".to_string()),
        description: Some("test".to_string()),
        device_name: "test".to_string(),
        data_format: "test".to_string(),
        unit: Some("test".to_string()),
        register_length: 1,
    };
    let item = create(State(app_state().await), Json(payload))
        .await
        .unwrap();

    let id = Path(item.id);
    let result = delete(State(app_state().await), id).await;
    println!("Result: {:?}", result);
    assert!(result.is_ok());
}
