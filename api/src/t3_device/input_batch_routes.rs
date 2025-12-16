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

    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    // Start transaction
    let txn = match db_connection.begin().await {
        Ok(t) => t,
        Err(e) => {
            error!("Failed to start transaction: {:?}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Transaction error: {}", e)));
        }
    };

    // Process each input update
    for input_update in payload.inputs {
        let index = &input_update.input_index;

        // Find existing input record
        let existing_input = input_points::Entity::find()
            .filter(input_points::Column::SerialNumber.eq(serial))
            .filter(input_points::Column::InputIndex.eq(index))
            .one(&txn)
            .await;

        match existing_input {
            Ok(Some(input_model)) => {
                let mut input: input_points::ActiveModel = input_model.into();

                // Update fields if provided
                if let Some(v) = input_update.full_label {
                    input.full_label = Set(Some(v));
                }
                if let Some(v) = input_update.label {
                    input.label = Set(Some(v));
                }
                if let Some(v) = input_update.f_value {
                    input.f_value = Set(Some(v));
                }
                if let Some(v) = input_update.range_field {
                    input.range_field = Set(Some(v));
                }
                if let Some(v) = input_update.auto_manual {
                    input.auto_manual = Set(Some(v));
                }
                if let Some(v) = input_update.filter_field {
                    input.filter_field = Set(Some(v));
                }
                if let Some(v) = input_update.digital_analog {
                    input.digital_analog = Set(Some(v));
                }
                if let Some(v) = input_update.sign {
                    input.sign = Set(Some(v));
                }
                if let Some(v) = input_update.calibration {
                    input.calibration = Set(Some(v));
                }
                if let Some(v) = input_update.status {
                    input.status = Set(Some(v));
                }
                if let Some(v) = input_update.units {
                    input.units = Set(Some(v));
                }

                // Save to database
                match input.update(&txn).await {
                    Ok(_) => {
                        updated_count += 1;
                    }
                    Err(e) => {
                        failed_count += 1;
                        errors.push(format!("Input {}: {}", index, e));
                        error!("Failed to update input {}: {:?}", index, e);
                    }
                }
            }
            Ok(None) => {
                failed_count += 1;
                errors.push(format!("Input {} not found", index));
            }
            Err(e) => {
                failed_count += 1;
                errors.push(format!("Input {}: Database error", index));
                error!("Database error for input {}: {:?}", index, e);
            }
        }
    }

    // Commit transaction
    if let Err(e) = txn.commit().await {
        error!("Failed to commit transaction: {:?}", e);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Transaction commit error: {}", e)));
    }

    info!("✅ Batch save complete: {} updated, {} failed", updated_count, failed_count);

    Ok(Json(BatchSaveResponse {
        success: failed_count == 0,
        updated_count,
        failed_count,
        errors,
    }))
}
