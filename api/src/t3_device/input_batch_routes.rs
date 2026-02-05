// Input Batch Save API Routes
// Provides batch update endpoint for multiple input points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::input_points;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating inputs
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveInputsRequest {
    pub inputs: Vec<InputUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputUpdate {
    pub input_index: String,
    pub panel: Option<String>,
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub f_value: Option<String>,
    pub range_field: Option<String>,
    pub auto_manual: Option<String>,
    pub filter_field: Option<String>,
    pub digital_analog: Option<String>,
    pub sign: Option<String>,
    pub calibration: Option<String>,
    pub status: Option<String>,
    pub units: Option<String>,
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

/// Creates and returns the input batch save routes
pub fn create_input_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/inputs/:serial/batch_save", axum::routing::post(batch_save_inputs))
}

/// Batch update multiple inputs in a transaction
/// POST /api/t3_device/inputs/:serial/batch_save
pub async fn batch_save_inputs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveInputsRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} inputs for serial: {}", payload.inputs.len(), serial);

    // Get database connection from state
    let db_connection = match &state.t3_device_conn {
        Some(conn) => conn.lock().await.clone(),
        None => {
            error!("❌ T3000 device database unavailable");
            return Err((StatusCode::SERVICE_UNAVAILABLE, "T3000 device database unavailable".to_string()));
        }
    };

    // Retry entire transaction up to 10 times with exponential backoff
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
async fn execute_batch_save(
    db_connection: &DatabaseConnection,
    serial: i32,
    payload: &BatchSaveInputsRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    // Start transaction
    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    // Process each input update
    for input_update in &payload.inputs {
        let index = &input_update.input_index;

        // DEBUG: Log what we're processing
        info!("Processing input {}: fullLabel={:?}, label={:?}",
              index,
              input_update.full_label,
              input_update.label);

        // Find existing input record
        let existing_input = input_points::Entity::find()
            .filter(input_points::Column::SerialNumber.eq(serial))
            .filter(input_points::Column::InputIndex.eq(index))
            .one(&txn)
            .await;

        match existing_input {
            Ok(Some(_existing)) => {
                // UPDATE using delete_many + filter to target specific row
                // (Can't use ActiveModel.update() because PK doesn't include Input_Index)
                let update_result = input_points::Entity::update_many()
                    .filter(input_points::Column::SerialNumber.eq(serial))
                    .filter(input_points::Column::InputIndex.eq(index))
                    .col_expr(input_points::Column::Panel, Expr::value(input_update.panel.clone()))
                    .col_expr(input_points::Column::FullLabel, Expr::value(input_update.full_label.clone()))
                    .col_expr(input_points::Column::Label, Expr::value(input_update.label.clone()))
                    .col_expr(input_points::Column::FValue, Expr::value(input_update.f_value.clone()))
                    .col_expr(input_points::Column::RangeField, Expr::value(input_update.range_field.clone()))
                    .col_expr(input_points::Column::AutoManual, Expr::value(input_update.auto_manual.clone()))
                    .col_expr(input_points::Column::FilterField, Expr::value(input_update.filter_field.clone()))
                    .col_expr(input_points::Column::DigitalAnalog, Expr::value(input_update.digital_analog.clone()))
                    .col_expr(input_points::Column::Sign, Expr::value(input_update.sign.clone()))
                    .col_expr(input_points::Column::Calibration, Expr::value(input_update.calibration.clone()))
                    .col_expr(input_points::Column::Status, Expr::value(input_update.status.clone()))
                    .col_expr(input_points::Column::Units, Expr::value(input_update.units.clone()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                            info!("  → Updated input {} with fullLabel={:?}", index, input_update.full_label);
                        } else {
                            failed_count += 1;
                            errors.push(format!("Input {}: No rows updated", index));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        // If database is locked, abort immediately to trigger retry
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            error!("🔒 Database locked during input {} update, aborting transaction", index);
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Input {}: {}", index, error_msg));
                        error!("Failed to update input {}: {:?}", index, e);
                    }
                }
            }
            Ok(None) => {
                // INSERT new record
                let new_input = input_points::ActiveModel {
                    serial_number: Set(serial),
                    input_index: Set(Some(index.clone())),
                    panel: Set(input_update.panel.clone()),
                    full_label: Set(input_update.full_label.clone()),
                    label: Set(input_update.label.clone()),
                    f_value: Set(input_update.f_value.clone()),
                    range_field: Set(input_update.range_field.clone()),
                    auto_manual: Set(input_update.auto_manual.clone()),
                    filter_field: Set(input_update.filter_field.clone()),
                    digital_analog: Set(input_update.digital_analog.clone()),
                    sign: Set(input_update.sign.clone()),
                    calibration: Set(input_update.calibration.clone()),
                    status: Set(input_update.status.clone()),
                    units: Set(input_update.units.clone()),
                    ..Default::default()
                };

                match new_input.insert(&txn).await {
                    Ok(_) => {
                        updated_count += 1;
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        // If database is locked, abort immediately to trigger retry
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            error!("🔒 Database locked during input {} insert, aborting transaction", index);
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Input {}: {}", index, error_msg));
                        error!("Failed to insert input {}: {:?}", index, e);
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                // If database is locked, abort immediately to trigger retry
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    error!("🔒 Database locked during input {} find, aborting transaction", index);
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("Input {}: Database error", index));
                error!("Database error for input {}: {:?}", index, e);
            }
        }
    }

    // Commit transaction
    txn.commit().await
        .map_err(|e| format!("database is locked: {}", e))?;

    info!("✅ Batch save complete: {} updated, {} failed", updated_count, failed_count);

    Ok(BatchSaveResponse {
        success: failed_count == 0,
        updated_count,
        failed_count,
        errors,
    })
}
