// Output Batch Save API Routes
// Provides batch update endpoint for multiple output points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::output_points;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating outputs
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveOutputsRequest {
    pub outputs: Vec<OutputUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputUpdate {
    pub output_index: String,
    pub output_id: Option<String>,
    pub panel: Option<String>,
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub f_value: Option<String>,
    pub range_field: Option<String>,
    pub auto_manual: Option<String>,
    pub filter_field: Option<String>,
    pub digital_analog: Option<String>,
    pub calibration: Option<String>,
    pub sign: Option<String>,
    pub status: Option<String>,
    pub units: Option<String>,
    pub calibration_h: Option<i32>,
    pub calibration_l: Option<i32>,
    pub control: Option<String>,
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

/// Creates and returns the output batch save routes
pub fn create_output_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/outputs/:serial/batch_save", axum::routing::post(batch_save_outputs))
}

/// Batch update multiple outputs in a transaction
/// POST /api/t3_device/outputs/:serial/batch_save
pub async fn batch_save_outputs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveOutputsRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} outputs for serial: {}", payload.outputs.len(), serial);

    // Get database connection — fall back to fresh local SQLite when center DB (MSSQL)
    // is active and t3_device_conn is None.
    let db_connection = if let Some(conn) = &state.t3_device_conn {
        conn.lock().await.clone()
    } else {
        match crate::db_connection::establish_t3_device_connection().await {
            Ok(conn) => conn,
            Err(e) => {
                error!("❌ T3000 local device database unavailable: {}", e);
                return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
            }
        }
    };

    // Retry entire transaction up to 10 times with exponential backoff
    let max_retries = 10;
    let mut last_error = String::new();

    for attempt in 1..=max_retries {
        match execute_output_batch_save(&db_connection, serial, &payload).await {
            Ok(response) => {
                if attempt > 1 {
                    info!("✅ Batch save succeeded on attempt {}/{}", attempt, max_retries);
                }
                return Ok(Json(response));
            }
            Err(e) => {
                last_error = e.clone();

                // Check if it's a database lock error
                if e.contains("database is locked") {
                    if attempt < max_retries {
                        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms, 12800ms, 25600ms
                        let delay_ms = 100 * (2_u64.pow(attempt - 1));
                        info!("⏳ Database locked (attempt {}/{}), retrying in {}ms", attempt, max_retries, delay_ms);
                        tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
                        continue;
                    }
                }

                // Non-retryable error or max retries reached
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

/// Execute the batch save operation within a transaction
async fn execute_output_batch_save(
    db_connection: &DatabaseConnection,
    serial: i32,
    payload: &BatchSaveOutputsRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    // Start transaction
    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    // Delete all existing rows for this serial to clean up corrupted data
    // (Refresh from Device always sends ALL points, so replacing all rows is safe)
    output_points::Entity::delete_many()
        .filter(output_points::Column::SerialNumber.eq(serial))
        .exec(&txn)
        .await
        .map_err(|e| format!("Failed to clean existing output data: {}", e))?;

    // Insert all output points fresh
    for output_update in &payload.outputs {
        let index = &output_update.output_index;

        // Find existing output record
        let existing_output = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(serial))
            .filter(output_points::Column::OutputIndex.eq(index))
            .one(&txn)
            .await;

        match existing_output {
            Ok(Some(_existing)) => {
                // UPDATE using update_many() with explicit filters
                // (Can't use ActiveModel.update() because PK doesn't include Output_Index)
                let update_result = output_points::Entity::update_many()
                    .filter(output_points::Column::SerialNumber.eq(serial))
                    .filter(output_points::Column::OutputIndex.eq(index))
                    .col_expr(output_points::Column::OutputId, Expr::value(output_update.output_id.clone()))
                    .col_expr(output_points::Column::Panel, Expr::value(output_update.panel.clone()))
                    .col_expr(output_points::Column::FullLabel, Expr::value(output_update.full_label.clone()))
                    .col_expr(output_points::Column::Label, Expr::value(output_update.label.clone()))
                    .col_expr(output_points::Column::FValue, Expr::value(output_update.f_value.clone()))
                    .col_expr(output_points::Column::RangeField, Expr::value(output_update.range_field.clone()))
                    .col_expr(output_points::Column::AutoManual, Expr::value(output_update.auto_manual.clone()))
                    .col_expr(output_points::Column::FilterField, Expr::value(output_update.filter_field.clone()))
                    .col_expr(output_points::Column::DigitalAnalog, Expr::value(output_update.digital_analog.clone()))
                    .col_expr(output_points::Column::Calibration, Expr::value(output_update.calibration.clone()))
                    .col_expr(output_points::Column::Sign, Expr::value(output_update.sign.clone()))
                    .col_expr(output_points::Column::Status, Expr::value(output_update.status.clone()))
                    .col_expr(output_points::Column::Units, Expr::value(output_update.units.clone()))
                    .col_expr(output_points::Column::CalibrationH, Expr::value(output_update.calibration_h.map(|v| v.to_string())))
                    .col_expr(output_points::Column::CalibrationL, Expr::value(output_update.calibration_l.map(|v| v.to_string())))
                    .col_expr(output_points::Column::CalibrationSign, Expr::value(output_update.sign.clone()))
                    .col_expr(output_points::Column::Control, Expr::value(output_update.control.clone()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                        } else {
                            failed_count += 1;
                            errors.push(format!("Output {}: No rows updated", index));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        // If database is locked, abort immediately to trigger retry
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            error!("🔒 Database locked during output {} update, aborting transaction", index);
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Output {}: {}", index, error_msg));
                        error!("Failed to update output {}: {:?}", index, e);
                    }
                }
            }
            Ok(None) => {
                // INSERT new record
                let new_output = output_points::ActiveModel {
                    serial_number: Set(serial),
                    output_index: Set(Some(index.clone())),
                    output_id: Set(output_update.output_id.clone()),
                    panel: Set(output_update.panel.clone()),
                    full_label: Set(output_update.full_label.clone()),
                    label: Set(output_update.label.clone()),
                    f_value: Set(output_update.f_value.clone()),
                    range_field: Set(output_update.range_field.clone()),
                    auto_manual: Set(output_update.auto_manual.clone()),
                    filter_field: Set(output_update.filter_field.clone()),
                    digital_analog: Set(output_update.digital_analog.clone()),
                    calibration: Set(output_update.calibration.clone()),
                    sign: Set(output_update.sign.clone()),
                    status: Set(output_update.status.clone()),
                    units: Set(output_update.units.clone()),
                    calibration_h: Set(output_update.calibration_h.map(|v| v.to_string())),
                    calibration_l: Set(output_update.calibration_l.map(|v| v.to_string())),
                    calibration_sign: Set(output_update.sign.clone()),
                    control: Set(output_update.control.clone()),
                    ..Default::default()
                };

                match new_output.insert(&txn).await {
                    Ok(_) => {
                        updated_count += 1;
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        // If database is locked, abort immediately to trigger retry
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            error!("🔒 Database locked during output {} insert, aborting transaction", index);
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Output {}: {}", index, error_msg));
                        error!("Failed to insert output {}: {:?}", index, e);
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                // If database is locked, abort immediately to trigger retry
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    error!("🔒 Database locked during output {} find, aborting transaction", index);
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("Output {}: Database error", index));
                error!("Database error for output {}: {:?}", index, e);
            }
        }
    }

    // Commit transaction
    txn.commit().await
        .map_err(|e| format!("{}", e))?;

    info!("✅ Batch save complete: {} updated, {} failed", updated_count, failed_count);

    Ok(BatchSaveResponse {
        success: failed_count == 0,
        updated_count,
        failed_count,
        errors,
    })
}
