// Holidays Batch Save API Routes
// Provides batch update endpoint for multiple holiday points

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::app_state::T3AppState;
use crate::entity::t3_device::holidays;
use sea_orm::*;
use sea_orm::sea_query::Expr;

/// Request payload for batch updating holidays
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveHolidaysRequest {
    pub holidays: Vec<HolidayUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayUpdate {
    #[serde(rename = "Holiday_ID")]
    pub holiday_id: Option<String>,
    pub auto_manual: Option<String>,
    pub value: Option<String>,
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

/// Creates and returns the holiday batch save routes
pub fn create_holidays_batch_routes() -> Router<T3AppState> {
    Router::new()
        .route("/holidays/:serial/batch_save", axum::routing::post(batch_save_holidays))
}

/// Batch update multiple holidays in a transaction
/// POST /api/t3_device/holidays/:serial/batch_save
pub async fn batch_save_holidays(
    State(state): State<T3AppState>,
    Path(serial): Path<i32>,
    Json(payload): Json<BatchSaveHolidaysRequest>,
) -> Result<Json<BatchSaveResponse>, (StatusCode, String)> {
    info!("BATCH_SAVE: Updating {} holidays for serial: {}", payload.holidays.len(), serial);

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
    payload: &BatchSaveHolidaysRequest,
) -> Result<BatchSaveResponse, String> {
    let mut updated_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    let txn = db_connection.begin().await
        .map_err(|e| format!("Transaction start error: {}", e))?;

    for holiday_update in &payload.holidays {
        let holiday_id = holiday_update.holiday_id.as_deref().unwrap_or("UNKNOWN");

        let existing = holidays::Entity::find()
            .filter(holidays::Column::SerialNumber.eq(serial))
            .filter(holidays::Column::HolidayId.eq(holiday_id))
            .one(&txn)
            .await;

        match existing {
            Ok(Some(_)) => {
                let update_result = holidays::Entity::update_many()
                    .filter(holidays::Column::SerialNumber.eq(serial))
                    .filter(holidays::Column::HolidayId.eq(holiday_id))
                    .col_expr(holidays::Column::AutoManual, Expr::value(holiday_update.auto_manual.clone()))
                    .col_expr(holidays::Column::HolidayValue, Expr::value(holiday_update.value.clone()))
                    .col_expr(holidays::Column::Status, Expr::value(holiday_update.status.clone()))
                    .exec(&txn)
                    .await;

                match update_result {
                    Ok(res) => {
                        if res.rows_affected > 0 {
                            updated_count += 1;
                        } else {
                            failed_count += 1;
                            errors.push(format!("Holiday {}: No rows updated", holiday_id));
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Holiday {}: {}", holiday_id, error_msg));
                    }
                }
            }
            Ok(None) => {
                let new_holiday = holidays::ActiveModel {
                    serial_number: Set(serial),
                    holiday_id: Set(Some(holiday_id.to_string())),
                    auto_manual: Set(holiday_update.auto_manual.clone()),
                    holiday_value: Set(holiday_update.value.clone()),
                    status: Set(holiday_update.status.clone()),
                    ..Default::default()
                };

                match holidays::Entity::insert(new_holiday).exec(&txn).await {
                    Ok(_) => updated_count += 1,
                    Err(e) => {
                        let error_msg = format!("{}", e);
                        if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                            return Err(error_msg);
                        }
                        failed_count += 1;
                        errors.push(format!("Holiday {}: {}", holiday_id, error_msg));
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                if error_msg.contains("database is locked") || error_msg.contains("code: 5") {
                    return Err(error_msg);
                }
                failed_count += 1;
                errors.push(format!("Holiday {}: {}", holiday_id, error_msg));
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
