// Graphics Batch Save API Routes
// Provides batch update endpoint for multiple graphic points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::graphics;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating graphics
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveGraphicsRequest {
    pub graphics: Vec<GraphicUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphicUpdate {
    #[serde(rename = "Graphic_ID")]
    pub graphic_id: Option<String>,
    pub panel: Option<String>,
    pub label: Option<String>,
    pub full_label: Option<String>,
    pub picture_file: Option<String>,
    pub total_point: Option<String>,
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

/// Creates and returns the graphic batch save routes
pub fn create_graphics_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/graphics/:serial/batch_save", axum::routing::post(batch_save_graphics))
}

/// Batch update multiple graphics in a transaction
/// POST /api/t3_device/graphics/:serial/batch_save
pub async fn batch_save_graphics(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveGraphicsRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} graphics for serial: {}", payload.graphics.len(), serial);

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

/// Helper to convert Option<String> to proper database value
/// Empty strings should be stored as empty strings, not NULL
fn to_db_value(opt: &Option<String>) -> Option<String> {
    opt.clone()
}

async fn execute_batch_save(
    db_connection: &DatabaseConnection,
    serial: i32,
    payload: &BatchSaveGraphicsRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    for graphic_update in &payload.graphics {
        let graphic_id = graphic_update.graphic_id.as_deref().unwrap_or("UNKNOWN");

        let existing = graphics::Entity::find()
            .filter(graphics::Column::SerialNumber.eq(serial))
            .filter(graphics::Column::GraphicId.eq(graphic_id))
            .one(&txn)
            .await;

        match existing {
            Ok(Some(_)) => {
                let update_result = graphics::Entity::update_many()
                    .filter(graphics::Column::SerialNumber.eq(serial))
                    .filter(graphics::Column::GraphicId.eq(graphic_id))
                    .col_expr(graphics::Column::SwitchNode, Expr::value(graphic_update.panel.clone().unwrap_or_default()))
                    .col_expr(graphics::Column::GraphicLabel, Expr::value(graphic_update.label.clone().unwrap_or_default()))
                    .col_expr(graphics::Column::GraphicFullLabel, Expr::value(graphic_update.full_label.clone().unwrap_or_default()))
                    .col_expr(graphics::Column::GraphicPictureFile, Expr::value(graphic_update.picture_file.clone().unwrap_or_default()))
                    .col_expr(graphics::Column::GraphicTotalPoint, Expr::value(graphic_update.total_point.clone().unwrap_or_default()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                        } else {
                            failed_count += 1;
                            errors.push(format!("Graphic {}: No rows updated", graphic_id));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Graphic {}: {}", graphic_id, error_msg));
                    }
                }
            }
            Ok(None) => {
                let new_graphic = graphics::ActiveModel {
                    serial_number: Set(serial),
                    graphic_id: Set(Some(graphic_id.to_string())),
                    switch_node: Set(Some(graphic_update.panel.as_deref().unwrap_or("").to_string())),
                    graphic_label: Set(Some(graphic_update.label.as_deref().unwrap_or("").to_string())),
                    graphic_full_label: Set(Some(graphic_update.full_label.as_deref().unwrap_or("").to_string())),
                    graphic_picture_file: Set(Some(graphic_update.picture_file.as_deref().unwrap_or("").to_string())),
                    graphic_total_point: Set(Some(graphic_update.total_point.as_deref().unwrap_or("").to_string())),
                };

                match graphics::Entity::insert(new_graphic).exec(&txn).await {
                    Ok(_) => updated_count += 1,
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Graphic {}: {}", graphic_id, error_msg));
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("Graphic {}: {}", graphic_id, error_msg));
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
