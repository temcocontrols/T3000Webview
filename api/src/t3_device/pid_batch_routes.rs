// PID Controllers Batch Save API Routes
// Provides batch update endpoint for multiple PID controller points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::pid_controllers;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating PID controllers
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSavePidsRequest {
    pub pids: Vec<PidUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PidUpdate {
    #[serde(rename = "PID_ID")]
    pub pid_id: Option<String>,
    pub auto_manual: Option<String>,
    pub input: Option<String>,
    pub output: Option<String>,
    pub setpoint: Option<String>,
    pub proportional: Option<String>,
    pub integral: Option<String>,
    pub derivative: Option<String>,
    pub status: Option<String>,
}

/// Response for batch save operation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveResponse {
    pub success: bool,
    pub updated_count: i32,
    pub failed_count: i32,
    pub errors: Vec<String>,
}

/// Creates and returns the PID batch save routes
pub fn create_pid_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/pids/:serial/batch_save", axum::routing::post(batch_save_pids))
}

/// Batch update multiple PIDs in a transaction
/// POST /api/t3_device/pids/:serial/batch_save
pub async fn batch_save_pids(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSavePidsRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} PIDs for serial: {}", payload.pids.len(), serial);

    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    let max_retries = 10;
    let mut last_error = String::new();

    for attempt in 1..=max_retries {
        match execute_batch_save(&db_connection, serial, &payload).await {
            Ok(response) => {
                if attempt > 1 {
                    info!("✅ Batch save succeeded on attempt {}/{}", attempt, max_retries);
                }
                return Ok(Json(response));
            }
            Err(e) => {
                last_error = e.clone();
                if e.contains("database is locked") {
                    if attempt < max_retries {
                        let delay_ms = 100 * (2_u64.pow(attempt - 1));
                        info!("⏳ Database locked (attempt {}/{}), retrying in {}ms", attempt, max_retries, delay_ms);
                        tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
                        continue;
                    }
                }
                error!("❌ Batch save failed on attempt {}/{}: {}", attempt, max_retries, e);
                if attempt < max_retries {
                    break;
                } else {
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed after {} retries: {}", max_retries, last_error)));
                }
            }
        }
    }

    Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Transaction failed: {}", last_error)))
}

async fn execute_batch_save(
    db_connection: &DatabaseConnection,
    serial: i32,
    payload: &BatchSavePidsRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    for pid_update in &payload.pids {
        let pid_id = pid_update.pid_id.as_deref().unwrap_or("UNKNOWN");

        let existing = pid_controllers::Entity::find()
            .filter(pid_controllers::Column::SerialNumber.eq(serial))
            .filter(pid_controllers::Column::LoopField.eq(pid_id))
            .one(&txn)
            .await;

        match existing {
            Ok(Some(_)) => {
                let update_result = pid_controllers::Entity::update_many()
                    .filter(pid_controllers::Column::SerialNumber.eq(serial))
                    .filter(pid_controllers::Column::LoopField.eq(pid_id))
                    .col_expr(pid_controllers::Column::AutoManual, Expr::value(pid_update.auto_manual.clone()))
                    .col_expr(pid_controllers::Column::InputField, Expr::value(pid_update.input.clone()))
                    .col_expr(pid_controllers::Column::OutputField, Expr::value(pid_update.output.clone()))
                    .col_expr(pid_controllers::Column::SetValue, Expr::value(pid_update.setpoint.clone()))
                    .col_expr(pid_controllers::Column::Proportional, Expr::value(pid_update.proportional.clone()))
                    .col_expr(pid_controllers::Column::ResetField, Expr::value(pid_update.integral.clone()))
                    .col_expr(pid_controllers::Column::Rate, Expr::value(pid_update.derivative.clone()))
                    .col_expr(pid_controllers::Column::Status, Expr::value(pid_update.status.clone()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                        } else {
                            failed_count += 1;
                            errors.push(format!("PID {}: No rows updated", pid_id));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("PID {}: {}", pid_id, error_msg));
                    }
                }
            }
            Ok(None) => {
                let new_pid = pid_controllers::ActiveModel {
                    serial_number: Set(serial),
                    loop_field: Set(Some(pid_id.to_string())),
                    auto_manual: Set(pid_update.auto_manual.clone()),
                    input_field: Set(pid_update.input.clone()),
                    output_field: Set(pid_update.output.clone()),
                    set_value: Set(pid_update.setpoint.clone()),
                    proportional: Set(pid_update.proportional.clone()),
                    reset_field: Set(pid_update.integral.clone()),
                    rate: Set(pid_update.derivative.clone()),
                    status: Set(pid_update.status.clone()),
                    ..Default::default()
                };

                match pid_controllers::Entity::insert(new_pid).exec(&txn).await {
                    Ok(_) => updated_count += 1,
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("PID {}: {}", pid_id, error_msg));
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("PID {}: {}", pid_id, error_msg));
            }
        }
    }

    txn.commit().await
        .map_err(|e| format!("Transaction commit error: {}", e))?;

    Ok(BatchSaveResponse {
        success: true,
        updated_count,
        failed_count,
        errors,
    })
}
