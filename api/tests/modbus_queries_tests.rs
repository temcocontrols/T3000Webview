use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde_json::Value;
use sqlx::SqlitePool;
use t3_webview_api::{
    app_state::app_state,
    entity::modbus_register_settings,
    modbus_register::{
        models::{
            CreateModbusRegisterItemInput, ModbusRegisterQueryParams,
            UpdateModbusRegisterItemInput, UpdateSettingModel,
        },
        queries::{create, delete, list, update},
        settings_queries,
    },
    utils::DATABASE_URL,
};

#[tokio::test]
async fn test_modbus_register_crud() {
    dotenvy::from_filename("./tests/.test.env").ok();
    let conn = SqlitePool::connect(DATABASE_URL.as_str())
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", DATABASE_URL.as_str()));
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
    let conn = app_state().await.unwrap();
    let item = create(State(conn.clone()), Json(payload)).await;
    println!("item {:?}", item);
    assert!(item.is_ok());
    let item = item.unwrap();

    let params = ModbusRegisterQueryParams {
        local_only: None,
        filter: None,
        order_by: None,
        limit: Some(1),
        offset: None,
        order_dir: None,
    };
    let result = list(State(conn.clone()), Query(params)).await;
    assert!(result.is_ok());

    assert_eq!(result.unwrap().0.data[0].id, item.id);

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
    let result = update(State(conn.clone()), id, Json(payload)).await;
    assert!(result.is_ok());
    assert_ne!(result.unwrap().data_format, item.data_format);

    let id = Path(item.id);
    let result = delete(State(conn.clone()), id).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_modbus_register_settings_crud() {
    dotenvy::from_filename("./tests/.test.env").ok();

    let conn = SqlitePool::connect(DATABASE_URL.as_str())
        .await
        .unwrap_or_else(|_| panic!("Error connecting to {}", DATABASE_URL.as_str()));
    sqlx::migrate!("./migrations").run(&conn).await.unwrap();

    let conn = app_state().await.unwrap();

    let payload = modbus_register_settings::Model {
        name: "test".to_string(),
        value: Some("test".to_string()),
        json_value: Some(Value::String("test".to_string())),
    };
    let result = settings_queries::create(State(conn.clone()), Json(payload)).await;
    assert!(result.is_ok());

    let result = settings_queries::get_all(State(conn.clone())).await;
    assert!(result.is_ok());
    assert!(result.unwrap().len() == 1);

    let name = Path("test".to_string());
    let result = settings_queries::get_by_name(State(conn.clone()), name).await;
    assert!(result.is_ok());

    let name = Path("test".to_string());
    let payload = UpdateSettingModel {
        value: Some(Some("updated".to_string())),
        json_value: Some(Some(Value::String("updated".to_string()))),
    };
    let result = settings_queries::update(State(conn.clone()), name, Json(payload)).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().value, Some("updated".to_string()));

    let name = Path("test".to_string());
    let result = settings_queries::delete(State(conn.clone()), name).await;
    assert!(result.is_ok());
}
