// Variable Batch Save API Routes
// Provides batch update endpoint for multiple variable points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::variable_points;
use sea_orm::*;

/// Request payload for batch updating variables
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveVariablesRequest {
    pub variables: Vec<VariableUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariableUpdate {
    pub variable_index: String,
    pub full_label: Option<String>,
    pub label: Option<String>,
    pub f_value: Option<String>,
    pub range_field: Option<String>,
    pub auto_manual: Option<String>,
    pub filter_field: Option<String>,
    pub digital_analog: Option<String>,
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

/// Creates and returns the variable batch save routes
pub fn create_variable_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/variables/:serial/batch_save", axum::routing::post(batch_save_variables))
}

/// Batch update multiple variables in a transaction
/// POST /api/t3_device/variables/:serial/batch_save
pub async fn batch_save_variables(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveVariablesRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} variables for serial: {}", payload.variables.len(), serial);

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

    // Process each variable update
    for variable_update in payload.variables {
        let index = &variable_update.variable_index;

        // Find existing variable record
        let existing_variable = variable_points::Entity::find()
            .filter(variable_points::Column::SerialNumber.eq(serial))
            .filter(variable_points::Column::VariableIndex.eq(index))
            .one(&txn)
            .await;

        match existing_variable {
            Ok(Some(variable_model)) => {
                let mut variable: variable_points::ActiveModel = variable_model.into();

                // Update fields if provided
                if let Some(v) = variable_update.full_label {
                    variable.full_label = Set(Some(v));
                }
                if let Some(v) = variable_update.label {
                    variable.label = Set(Some(v));
                }
                if let Some(v) = variable_update.f_value {
                    variable.f_value = Set(Some(v));
                }
                if let Some(v) = variable_update.range_field {
                    variable.range_field = Set(Some(v));
                }
                if let Some(v) = variable_update.auto_manual {
                    variable.auto_manual = Set(Some(v));
                }
                if let Some(v) = variable_update.filter_field {
                    variable.filter_field = Set(Some(v));
                }
                if let Some(v) = variable_update.digital_analog {
                    variable.digital_analog = Set(Some(v));
                }
                if let Some(v) = variable_update.status {
                    variable.status = Set(Some(v));
                }
                if let Some(v) = variable_update.units {
                    variable.units = Set(Some(v));
                }

                // Save to database
                match variable.update(&txn).await {
                    Ok(_) => {
                        updated_count += 1;
                    }
                    Err(e) => {
                        failed_count += 1;
                        errors.push(format!("Variable {}: {}", index, e));
                        error!("Failed to update variable {}: {:?}", index, e);
                    }
                }
            }
            Ok(None) => {
                failed_count += 1;
                errors.push(format!("Variable {} not found", index));
            }
            Err(e) => {
                failed_count += 1;
                errors.push(format!("Variable {}: Database error", index));
                error!("Database error for variable {}: {:?}", index, e);
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
