// Specialized Features Routes
// Provides read-only access to supplementary T3000 data tables
// These tables contain reference data, configuration details, and supplementary information

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::ColumnTrait;
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::entity::t3_device::{
    variable_units, remote_points, email_alarms, extio_devices,
    tstat_schedules, graphic_labels, msv_data, alarm_settings, remote_tstat_db,
};

/// Create specialized features router
pub fn create_specialized_routes() -> Router<T3AppState> {
    Router::new()
        // Variable Units - custom unit assignments for variables
        .route(
            "/devices/:serial/variable-units",
            get(get_variable_units),
        )
        // Remote Points - remote device point mappings
        .route(
            "/devices/:serial/remote-points",
            get(get_remote_points),
        )
        // Email Alarms - email notification configurations
        .route(
            "/devices/:serial/email-alarms",
            get(get_email_alarms),
        )
        // Extended I/O Devices - external I/O device configurations
        .route(
            "/devices/:serial/extio-devices",
            get(get_extio_devices),
        )
        // Thermostat Schedules - thermostat-specific schedule data
        .route(
            "/devices/:serial/tstat-schedules",
            get(get_tstat_schedules),
        )
        // Graphic Labels - labels for graphic screens
        .route(
            "/devices/:serial/graphic-labels",
            get(get_graphic_labels),
        )
        // MSV Data - multi-state value data
        .route(
            "/devices/:serial/msv-data",
            get(get_msv_data),
        )
        // Alarm Settings - alarm configuration details
        .route(
            "/devices/:serial/alarm-settings",
            get(get_alarm_settings),
        )
        // Remote Thermostat Database - remote thermostat data
        .route(
            "/devices/:serial/remote-tstat-db",
            get(get_remote_tstat_db),
        )
}

// VARIABLE_UNITS: Custom unit assignments for variables
async fn get_variable_units(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match variable_units::Entity::find()
        .filter(variable_units::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(units) => Ok(Json(json!({
            "success": true,
            "count": units.len(),
            "data": units
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// REMOTE_POINTS: Remote device point mappings
async fn get_remote_points(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match remote_points::Entity::find()
        .filter(remote_points::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(points) => Ok(Json(json!({
            "success": true,
            "count": points.len(),
            "data": points
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// EMAIL_ALARMS: Email notification configurations
async fn get_email_alarms(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match email_alarms::Entity::find()
        .filter(email_alarms::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(alarms) => Ok(Json(json!({
            "success": true,
            "count": alarms.len(),
            "data": alarms
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// EXTIO_DEVICES: External I/O device configurations
async fn get_extio_devices(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match extio_devices::Entity::find()
        .filter(extio_devices::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(devices) => Ok(Json(json!({
            "success": true,
            "count": devices.len(),
            "data": devices
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// TSTAT_SCHEDULES: Thermostat-specific schedule data
async fn get_tstat_schedules(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match tstat_schedules::Entity::find()
        .filter(tstat_schedules::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(schedules) => Ok(Json(json!({
            "success": true,
            "count": schedules.len(),
            "data": schedules
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// GRAPHIC_LABELS: Labels for graphic screens
async fn get_graphic_labels(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match graphic_labels::Entity::find()
        .filter(graphic_labels::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(labels) => Ok(Json(json!({
            "success": true,
            "count": labels.len(),
            "data": labels
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// MSV_DATA: Multi-state value data
async fn get_msv_data(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match msv_data::Entity::find()
        .filter(msv_data::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(json!({
            "success": true,
            "count": data.len(),
            "data": data
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// ALARM_SETTINGS: Alarm configuration details
async fn get_alarm_settings(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match alarm_settings::Entity::find()
        .filter(alarm_settings::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(settings) => Ok(Json(json!({
            "success": true,
            "count": settings.len(),
            "data": settings
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}

// REMOTE_TSTAT_DB: Remote thermostat data
async fn get_remote_tstat_db(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => return Err((StatusCode::SERVICE_UNAVAILABLE, "Database unavailable".to_string())),
    };

    match remote_tstat_db::Entity::find()
        .filter(remote_tstat_db::Column::SerialNumber.eq(serial))
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(json!({
            "success": true,
            "count": data.len(),
            "data": data
        }))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))),
    }
}
