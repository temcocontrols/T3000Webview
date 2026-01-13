// Schedules Batch Save API Routes
// Provides batch update endpoint for multiple schedule points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::schedules;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating schedules
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveSchedulesRequest {
    pub schedules: Vec<ScheduleUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleUpdate {
    #[serde(rename = "Schedule_ID")]
    pub schedule_id: Option<String>,
    pub auto_manual: Option<String>,
    pub output: Option<String>,
    pub status: Option<String>,
    pub holiday1: Option<String>,
    pub holiday2: Option<String>,
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

/// Creates and returns the schedule batch save routes
pub fn create_schedules_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/schedules/:serial/batch_save", axum::routing::post(batch_save_schedules))
}

/// Batch update multiple schedules in a transaction
/// POST /api/t3_device/schedules/:serial/batch_save
pub async fn batch_save_schedules(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveSchedulesRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} schedules for serial: {}", payload.schedules.len(), serial);

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
    payload: &BatchSaveSchedulesRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    for schedule_update in &payload.schedules {
        let schedule_id = schedule_update.schedule_id.as_deref().unwrap_or("UNKNOWN");

        let existing = schedules::Entity::find()
            .filter(schedules::Column::SerialNumber.eq(serial))
            .filter(schedules::Column::ScheduleId.eq(schedule_id))
            .one(&txn)
            .await;

        match existing {
            Ok(Some(_)) => {
                let update_result = schedules::Entity::update_many()
                    .filter(schedules::Column::SerialNumber.eq(serial))
                    .filter(schedules::Column::ScheduleId.eq(schedule_id))
                    .col_expr(schedules::Column::AutoManual, Expr::value(schedule_update.auto_manual.clone()))
                    .col_expr(schedules::Column::OutputField, Expr::value(schedule_update.output.clone()))
                    .col_expr(schedules::Column::Holiday1, Expr::value(schedule_update.holiday1.clone()))
                    .col_expr(schedules::Column::Holiday2, Expr::value(schedule_update.holiday2.clone()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                        } else {
                            failed_count += 1;
                            errors.push(format!("Schedule {}: No rows updated", schedule_id));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Schedule {}: {}", schedule_id, error_msg));
                    }
                }
            }
            Ok(None) => {
                let new_schedule = schedules::ActiveModel {
                    serial_number: Set(serial),
                    schedule_id: Set(Some(schedule_id.to_string())),
                    auto_manual: Set(schedule_update.auto_manual.clone()),
                    output_field: Set(schedule_update.output.clone()),
                    holiday1: Set(schedule_update.holiday1.clone()),
                    holiday2: Set(schedule_update.holiday2.clone()),
                    ..Default::default()
                };

                match schedules::Entity::insert(new_schedule).exec(&txn).await {
                    Ok(_) => updated_count += 1,
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Schedule {}: {}", schedule_id, error_msg));
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("Schedule {}: {}", schedule_id, error_msg));
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
