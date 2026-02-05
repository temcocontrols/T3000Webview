// Programs Batch Save API Routes
// Provides batch update endpoint for multiple program points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::programs;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating programs
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveProgramsRequest {
    pub programs: Vec<ProgramUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgramUpdate {
    #[serde(rename = "Program_ID")]
    pub program_id: Option<String>,
    pub panel: Option<String>,
    pub label: Option<String>,
    pub full_label: Option<String>,
    pub status: Option<String>,
    pub auto_manual: Option<String>,
    pub size: Option<String>,
    pub execution_time: Option<String>,
    pub program_code: Option<String>,
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

/// Creates and returns the program batch save routes
pub fn create_programs_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/programs/:serial/batch_save", axum::routing::post(batch_save_programs))
}

/// Batch update multiple programs in a transaction
/// POST /api/t3_device/programs/:serial/batch_save
pub async fn batch_save_programs(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveProgramsRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} programs for serial: {}", payload.programs.len(), serial);

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
    payload: &BatchSaveProgramsRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    // Start transaction
    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    // Process each program update
    for program_update in &payload.programs {
        let program_id = program_update.program_id.as_deref().unwrap_or("UNKNOWN");

        info!("Processing program {}: label={:?}, status={:?}",
              program_id,
              program_update.label,
              program_update.status);

        // Find existing program record
        let existing_program = programs::Entity::find()
            .filter(programs::Column::SerialNumber.eq(serial))
            .filter(programs::Column::ProgramId.eq(program_id))
            .one(&txn)
            .await;

        match existing_program {
            Ok(Some(_existing)) => {
                // UPDATE using update_many + filter
                let update_result = programs::Entity::update_many()
                    .filter(programs::Column::SerialNumber.eq(serial))
                    .filter(programs::Column::ProgramId.eq(program_id))
                    .col_expr(programs::Column::SwitchNode, Expr::value(program_update.panel.clone()))
                    .col_expr(programs::Column::ProgramLabel, Expr::value(program_update.label.clone()))
                    .col_expr(programs::Column::ProgramList, Expr::value(program_update.full_label.clone()))
                    .col_expr(programs::Column::ProgramStatus, Expr::value(program_update.status.clone()))
                    .col_expr(programs::Column::AutoManual, Expr::value(program_update.auto_manual.clone()))
                    .col_expr(programs::Column::ProgramSize, Expr::value(program_update.size.clone()))
                    .col_expr(programs::Column::ProgramPointer, Expr::value(program_update.execution_time.clone()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                            info!("  → Updated program {}", program_id);
                        } else {
                            failed_count += 1;
                            errors.push(format!("Program {}: No rows updated", program_id));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        // If database is locked, abort immediately to trigger retry
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            error!("🔒 Database locked during program {} update, aborting transaction", program_id);
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Program {}: {}", program_id, error_msg));
                        error!("Failed to update program {}: {:?}", program_id, e);
                    }
                }
            }
            Ok(None) => {
                // INSERT new record
                let new_program = programs::ActiveModel {
                    serial_number: Set(serial),
                    program_id: Set(Some(program_id.to_string())),
                    switch_node: Set(program_update.panel.clone()),
                    program_label: Set(program_update.label.clone()),
                    program_list: Set(program_update.full_label.clone()),
                    program_status: Set(program_update.status.clone()),
                    auto_manual: Set(program_update.auto_manual.clone()),
                    program_size: Set(program_update.size.clone()),
                    program_pointer: Set(program_update.execution_time.clone()),
                };

                let insert_result = programs::Entity::insert(new_program)
                    .exec(&txn)
                    .await;

                match insert_result {
                    Ok(_) => {
                        updated_count += 1;
                        info!("  → Inserted new program {}", program_id);
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            error!("🔒 Database locked during program {} insert, aborting transaction", program_id);
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Program {}: {}", program_id, error_msg));
                        error!("Failed to insert program {}: {:?}", program_id, e);
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    error!("🔒 Database locked during program {} query, aborting transaction", program_id);
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("Program {}: {}", program_id, error_msg));
                error!("Failed to query program {}: {:?}", program_id, e);
            }
        }
    }

    // Commit transaction
    txn.commit().await
        .map_err(|e| format!("Transaction commit error: {}", e))?;

    info!("✅ Batch save completed: {} updated, {} failed", updated_count, failed_count);

    Ok(BatchSaveResponse {
        success: true,
        updated_count,
        failed_count,
        errors,
    })
}
