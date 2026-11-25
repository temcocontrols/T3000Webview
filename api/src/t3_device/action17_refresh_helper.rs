use axum::http::StatusCode;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::{json, Value};
use tracing::{error, warn};

use crate::entity::t3_device::{devices, protocol_settings};

/// Write Action 17 (`GET_WEBVIEW_LIST`) rows — `index`, `description`, `label`,
/// `value`, `range`, `unit`, … — into the device table for `point_type`, the same
/// way T3000's own refresh does. Fields a row does not carry keep their stored
/// value (`COALESCE`), because outputs report no `unit`, for example.
///
/// Returns the number of rows that matched an existing point.
pub async fn save_action17_rows(
    db: &DatabaseConnection,
    serial: i32,
    point_type: &str,
    rows: &[Value],
) -> Result<usize, String> {
    use sea_orm::{ConnectionTrait, DatabaseBackend, Statement, Value as SqlValue};

    let (table, index_column) = match point_type {
        "INPUT" => ("INPUTS", "Input_Index"),
        "OUTPUT" => ("OUTPUTS", "Output_Index"),
        _ => ("VARIABLES", "Variable_Index"),
    };

    // Every column is TEXT in the device schema.
    let sql = format!(
        "UPDATE {} SET
            Full_Label = COALESCE(?, Full_Label),
            Label = COALESCE(?, Label),
            fValue = COALESCE(?, fValue),
            Units = COALESCE(?, Units),
            Range_Field = COALESCE(?, Range_Field),
            Auto_Manual = COALESCE(?, Auto_Manual),
            Control = COALESCE(?, Control),
            Digital_Analog = COALESCE(?, Digital_Analog),
            Filter_Field = COALESCE(?, Filter_Field),
            Calibration_Sign = COALESCE(?, Calibration_Sign),
            Panel = COALESCE(?, Panel)
        WHERE SerialNumber = ? AND {} = ?",
        table, index_column
    );

    let mut updated = 0usize;
    for row in rows {
        let Some(index) = row.get("index").and_then(|v| v.as_i64()) else {
            continue;
        };
        // Inputs report the range twice (`range` and `unit`); outputs only `range`.
        let units = row.get("unit").or_else(|| row.get("range"));
        let params = vec![
            json_scalar_text(row.get("description")),
            json_scalar_text(row.get("label")),
            json_scalar_text(row.get("value")),
            json_scalar_text(units),
            json_scalar_text(row.get("range")),
            json_scalar_text(row.get("auto_manual")),
            json_scalar_text(row.get("control")),
            json_scalar_text(row.get("digital_analog")),
            json_scalar_text(row.get("filter")),
            json_scalar_text(row.get("calibration_sign")),
            json_scalar_text(row.get("pid")),
        ]
        .into_iter()
        .map(|v| v.map(SqlValue::from).unwrap_or(SqlValue::String(None)))
        .chain(vec![
            SqlValue::from(serial),
            SqlValue::from(index.to_string()),
        ])
        .collect::<Vec<_>>();

        let result = db
            .execute(Statement::from_sql_and_values(DatabaseBackend::Sqlite, &sql, params))
            .await
            .map_err(|e| format!("Failed to save {} points: {}", point_type, e))?;
        updated += result.rows_affected() as usize;
    }

    Ok(updated)
}

/// JSON number/string/bool as the TEXT the device tables store.
pub fn json_scalar_text(value: Option<&Value>) -> Option<String> {
    match value? {
        Value::String(s) => Some(s.trim().to_string()),
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(if *b { "1" } else { "0" }.to_string()),
        _ => None,
    }
}

/// Make an Action 17 (GET_WEBVIEW_LIST) response look like the `{ success, items }`
/// shape every refresh route expects.
///
/// The C++ answers `{ "data": { "device_data": [...] } }` on success and
/// `{ "error": "..." }` on rejection — it has no `success` field, so the routes
/// treated every good read as "Unknown error from device" and found no items.
pub fn normalise_action17_response(mut value: Value) -> Value {
    let device_error = value
        .get("error")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // Points can be nested per panel (`data: [...]`) or flat (`data.device_data`).
    let mut points: Vec<Value> = match value.get("data") {
        Some(Value::Object(_)) => value
            .get("data")
            .and_then(|d| d.get("device_data"))
            .and_then(|dd| dd.as_array())
            .cloned()
            .unwrap_or_default(),
        Some(Value::Array(panels)) => panels
            .iter()
            .flat_map(|panel| {
                panel
                    .get("device_data")
                    .and_then(|dd| dd.as_array())
                    .cloned()
                    .unwrap_or_default()
            })
            .collect(),
        _ => Vec::new(),
    };
    if points.is_empty() {
        points = value
            .get("items")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
    }

    if let Some(object) = value.as_object_mut() {
        object
            .entry("success".to_string())
            .or_insert_with(|| json!(device_error.is_none()));
        if !points.is_empty() {
            object.insert("items".to_string(), json!(points));
        }
        if let Some(device_error) = device_error {
            object
                .entry("message".to_string())
                .or_insert_with(|| json!(device_error));
        }
    }
    value
}

/// Ask T3000 for its live panel list (Action 4) and return the panel index and
/// object instance it holds for `serial`.
///
/// `DEVICES.Panel_Number` / `PanelId` are not reliable panel indices: after a
/// restart T3000 rewrote device 1028's to `1025`, and the C++ rejects any id
/// outside 1..254 with "Panel is invalid". Action 17 must use the value the C++
/// itself holds, which is what this returns.
pub async fn live_panel_for(serial: i32) -> Option<(i32, Option<i32>)> {
    use crate::t3_device::t3_ffi_api_service::T3000FfiApiService;

    let service = T3000FfiApiService::new();
    for attempt in 0..3 {
        // Action 4 has its own startup guard (`T3000_PANELS_WARMUP`).
        let response = match service.call_ffi(&serde_json::json!({ "action": 4 }).to_string()).await {
            Ok(response) => response,
            Err(e) => {
                warn!("[action17] panel lookup via GET_PANELS_LIST failed: {}", e);
                return None;
            }
        };
        let value: serde_json::Value = match serde_json::from_str(&response) {
            Ok(value) => value,
            Err(_) => return None,
        };
        let warming_up = matches!(
            value.get("code").and_then(|c| c.as_str()),
            Some("T3000_PANELS_WARMUP") | Some("T3000_WARMUP")
        );
        if warming_up {
            if attempt < 2 {
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                continue;
            }
            return None;
        }
        let panels = value.get("data")?.as_array()?;
        for panel in panels {
            if panel.get("serial_number").and_then(|v| v.as_i64()) == Some(serial as i64) {
                let number = panel.get("panel_number").and_then(|v| v.as_i64())? as i32;
                if !(1..254).contains(&number) {
                    return None;
                }
                let object_instance = panel
                    .get("object_instance")
                    .and_then(|v| v.as_i64())
                    .map(|n| n as i32)
                    .filter(|n| *n > 0);
                return Some((number, object_instance));
            }
        }
        return None;
    }
    None
}

pub async fn lookup_action17_target(
    db_connection: &DatabaseConnection,
    serial: i32,
) -> Result<(i32, i32), (StatusCode, String)> {
    let device = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(db_connection)
        .await
    {
        Ok(Some(device)) => device,
        Ok(None) => {
            error!("Device not found for serial: {}", serial);
            return Err((
                StatusCode::NOT_FOUND,
                format!("Device with serial {} not found", serial),
            ));
        }
        Err(e) => {
            error!("Database error querying device {}: {:?}", serial, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            ));
        }
    };

    let stored_panel_id = device.panel_number.or(device.panel_id).filter(|value| *value > 0);
    let stored_object_instance = match protocol_settings::Entity::find()
        .filter(protocol_settings::Column::SerialNumber.eq(serial))
        .one(db_connection)
        .await
    {
        Ok(Some(settings)) => settings.object_instance.filter(|value| *value > 0),
        Ok(None) => None,
        Err(e) => {
            error!("Database error querying protocol settings {}: {:?}", serial, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            ));
        }
    };

    // A stored panel id outside 1..254 can never be a C++ panel index, so ask
    // T3000 which panel actually holds this serial before failing.
    if !matches!(stored_panel_id, Some(id) if (1..254).contains(&id)) {
        if let Some((panel, live_instance)) = live_panel_for(serial).await {
            let object_instance = stored_object_instance
                .or(live_instance)
                .or_else(|| device.object_instance.filter(|value| *value > 0));
            match object_instance {
                Some(object_instance) => {
                    warn!(
                        "[action17] serial {}: stored panel id {:?} is not a T3000 panel index; using panel {} from GET_PANELS_LIST",
                        serial, stored_panel_id, panel
                    );
                    return Ok((panel, object_instance));
                }
                None => {
                    return Err((
                        StatusCode::CONFLICT,
                        format!(
                            "Device with serial {} has no object instance (needed for Action 17)",
                            serial
                        ),
                    ))
                }
            }
        }
    }

    let panel_id = match stored_panel_id {
        Some(panel_id) if (1..254).contains(&panel_id) => panel_id,
        Some(panel_id) => {
            return Err((
                StatusCode::CONFLICT,
                format!(
                    "Device with serial {} has panel id {} which is not a T3000 panel index, and it is not in T3000's live panel list",
                    serial, panel_id
                ),
            ))
        }
        None => {
            error!("Missing panelId for serial: {}", serial);
            return Err((
                StatusCode::CONFLICT,
                format!("Device with serial {} is missing panelId required for Action 17", serial),
            ));
        }
    };

    let object_instance = match stored_object_instance.or_else(|| device.object_instance.filter(|value| *value > 0)) {
        Some(object_instance) => object_instance,
        None => fallback_object_instance(&device, serial)?,
    };

    Ok((panel_id, object_instance))
}

/// Object instance from the DEVICES row when `PROTOCOL_SETTINGS` has none yet.
///
/// Serial (RS485) devices imported from T3000's building database carry their
/// instance in `ALL_NODE.Object_Instance`. Without this fallback those devices
/// could never be read (Action 17 would answer `CONFLICT`), because their
/// protocol settings are only learned from a device round trip that needs the
/// instance in the first place.
fn fallback_object_instance(
    device: &devices::Model,
    serial: i32,
) -> Result<i32, (StatusCode, String)> {
    match device.object_instance.filter(|value| *value > 0) {
        Some(object_instance) => Ok(object_instance),
        None => {
            error!("Missing object_instance for serial: {}", serial);
            Err((
                StatusCode::CONFLICT,
                format!(
                    "Device with serial {} is missing objectinstance required for Action 17",
                    serial
                ),
            ))
        }
    }
}
