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

    // Process each output update
    for output_update in payload.outputs {
        let index = &output_update.output_index;

        // Find existing output record
        let existing_output = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(serial))
            .filter(output_points::Column::OutputIndex.eq(index))
            .one(&txn)
            .await;

        match existing_output {
            Ok(Some(output_model)) => {
                let mut output: output_points::ActiveModel = output_model.into();

                // Update fields if provided
                if let Some(v) = output_update.full_label {
                    output.full_label = Set(Some(v));
                }
                if let Some(v) = output_update.label {
                    output.label = Set(Some(v));
                }
                if let Some(v) = output_update.f_value {
                    output.f_value = Set(Some(v));
                }
                if let Some(v) = output_update.range_field {
                    output.range_field = Set(Some(v));
                }
                if let Some(v) = output_update.auto_manual {
                    output.auto_manual = Set(Some(v));
                }
                if let Some(v) = output_update.filter_field {
                    output.filter_field = Set(Some(v));
                }
                if let Some(v) = output_update.digital_analog {
                    output.digital_analog = Set(Some(v));
                }
                if let Some(v) = output_update.calibration {
                    output.calibration = Set(Some(v));
                }
                if let Some(v) = output_update.sign {
                    output.sign = Set(Some(v));
                }
                if let Some(v) = output_update.status {
                    output.status = Set(Some(v));
                }
                if let Some(v) = output_update.units {
                    output.units = Set(Some(v));
                }

                // Save to database
                match output.update(&txn).await {
                    Ok(_) => {
                        updated_count += 1;
                    }
                    Err(e) => {
                        failed_count += 1;
                        errors.push(format!("Output {}: {}", index, e));
                        error!("Failed to update output {}: {:?}", index, e);
                    }
                }
            }
            Ok(None) => {
                failed_count += 1;
                errors.push(format!("Output {} not found", index));
            }
            Err(e) => {
                failed_count += 1;
                errors.push(format!("Output {}: Database error", index));
                error!("Database error for output {}: {:?}", index, e);
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
