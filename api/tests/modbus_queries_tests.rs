use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde_json::Value;
use t3_webview_api::{
    app_state::app_state,
    entity::modbus_register_settings,
    modbus_register::{
        inputs::{
            CreateModbusRegisterItemInput, ModbusRegisterQueryParams,
            UpdateModbusRegisterItemInput, UpdateSettingInput,
        },
        queries::{create, delete, list, update},
        settings,
    },
    utils::run_migrations,
};

#[tokio::test]
async fn test_modbus_register_crud() {
    dotenvy::from_filename("./tests/.test.env").ok();
    run_migrations().await.unwrap();
    let payload = CreateModbusRegisterItemInput {
        id: None,
        register_name: Some("test".to_string()),
        register_address: Some(1),
        operation: Some("test".to_string()),
        description: Some("test".to_string()),
        device_id: None,
        data_format: Some("test".to_string()),
        unit: Some("test".to_string()),
        status: None,
        private: None,
        register_length: 1,
        created_at: None,
        updated_at: None,
    };
    let conn = app_state().await.unwrap();
    let item = create(State(conn.clone()), Json(payload)).await;
    assert!(item.is_ok());
    let item = item.unwrap();

    let params = ModbusRegisterQueryParams {
        local_only: None,
        filter: None,
        order_by: None,
        limit: Some(1),
        offset: None,
        device_id: None,
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
        data_format: Some(Some("updated".to_string())),
        description: Some(Some("updated".to_string())),
        device_id: None,
        unit: Some(Some("updated".to_string())),
        status: None,
        private: None,
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

    run_migrations().await.unwrap();

    let conn = app_state().await.unwrap();

    let payload = modbus_register_settings::Model {
        name: "test".to_string(),
        value: Some("test".to_string()),
        json_value: Some(Value::String("test".to_string())),
    };
    let result = settings::create(State(conn.clone()), Json(payload)).await;
    assert!(result.is_ok());

    let result = settings::get_all(State(conn.clone())).await;
    assert!(result.is_ok());
    assert!(result.unwrap().len() == 1);

    let name = Path("test".to_string());
    let result = settings::get_by_name(State(conn.clone()), name).await;
    assert!(result.is_ok());

    let name = Path("test".to_string());
    let payload = UpdateSettingInput {
        value: Some(Some("updated".to_string())),
        json_value: Some(Some(Value::String("updated".to_string()))),
    };
    let result = settings::update(State(conn.clone()), name, Json(payload)).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().value, Some("updated".to_string()));

    let name = Path("test".to_string());
    let result = settings::delete(State(conn.clone()), name).await;
    assert!(result.is_ok());
}
