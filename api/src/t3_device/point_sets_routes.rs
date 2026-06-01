use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::entity::t3_device::trendlog_point_sets;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListPointSetsRequest {
    serial_number: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavePointSetRequest {
    serial_number: i32,
    name: String,
    selected_keys: Vec<String>,
    point_tags: Option<std::collections::HashMap<String, Vec<String>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeletePointSetRequest {
    serial_number: i32,
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenamePointSetRequest {
    serial_number: i32,
    old_name: String,
    new_name: String,
    replace_existing: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PointSetDto {
    name: String,
    selected_keys: Vec<String>,
    point_tags: std::collections::HashMap<String, Vec<String>>,
    updated_at: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ListPointSetsResponse {
    success: bool,
    sets: Vec<PointSetDto>,
}

fn now_epoch_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn get_db_conn<'a>(
    state: &'a T3AppState,
) -> impl std::future::Future<Output = Result<sea_orm::DatabaseConnection, (StatusCode, String)>> + 'a {
    async move {
        if let Some(conn) = &state.local_config_conn {
            Ok(conn.lock().await.clone())
        } else {
            match crate::db_connection::establish_t3_device_connection().await {
                Ok(conn) => Ok(conn),
                Err(e) => Err((
                    StatusCode::SERVICE_UNAVAILABLE,
                    format!("T3000 device database unavailable: {}", e),
                )),
            }
        }
    }
}

fn normalize_selected_keys(keys: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for key in keys {
        let trimmed = key.trim();
        if trimmed.is_empty() {
            continue;
        }
        let value = trimmed.to_string();
        if seen.insert(value.clone()) {
            out.push(value);
        }
    }
    out
}

fn normalize_point_tags(
    selected_keys: &[String],
    point_tags: Option<std::collections::HashMap<String, Vec<String>>>,
) -> std::collections::HashMap<String, Vec<String>> {
    let source = point_tags.unwrap_or_default();
    let selected: std::collections::HashSet<&str> = selected_keys.iter().map(|k| k.as_str()).collect();
    let mut out = std::collections::HashMap::new();

    for (key, tags) in source {
        if !selected.contains(key.as_str()) {
            continue;
        }
        let mut seen = std::collections::HashSet::new();
        let mut normalized = Vec::new();
        for tag in tags {
            let trimmed = tag.trim().to_lowercase();
            if trimmed.is_empty() {
                continue;
            }
            if seen.insert(trimmed.clone()) {
                normalized.push(trimmed);
            }
        }
        if !normalized.is_empty() {
            out.insert(key, normalized);
        }
    }

    out
}

async fn ensure_point_sets_table(db: &sea_orm::DatabaseConnection) -> Result<(), (StatusCode, String)> {
    db.execute_unprepared(
        "CREATE TABLE IF NOT EXISTS TRENDLOG_POINT_SETS (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            serial_number INTEGER NOT NULL,
            set_name      TEXT NOT NULL,
            selected_keys TEXT NOT NULL,
            point_tags    TEXT NOT NULL,
            created_at    INTEGER,
            updated_at    INTEGER
        )",
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to ensure point sets table: {}", e)))?;

    db.execute_unprepared(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_trendpointsets_serial_name ON TRENDLOG_POINT_SETS (serial_number, set_name)",
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to ensure point sets unique index: {}", e)))?;

    Ok(())
}

pub fn create_point_sets_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/point-sets/list", post(list_point_sets))
        .route("/api/point-sets/save", post(save_point_set))
        .route("/api/point-sets/rename", post(rename_point_set))
        .route("/api/point-sets/delete", post(delete_point_set))
}

async fn list_point_sets(
    State(state): State<T3AppState>,
    Json(payload): Json<ListPointSetsRequest>,
) -> Result<Json<ListPointSetsResponse>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;
    ensure_point_sets_table(&db).await?;

    let rows = trendlog_point_sets::Entity::find()
        .filter(trendlog_point_sets::Column::SerialNumber.eq(payload.serial_number))
        .order_by_desc(trendlog_point_sets::Column::UpdatedAt)
        .order_by_asc(trendlog_point_sets::Column::SetName)
        .all(&db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to list point sets: {}", e),
            )
        })?;

    let sets = rows
        .into_iter()
        .map(|row| {
            let selected_keys = serde_json::from_str::<Vec<String>>(&row.selected_keys).unwrap_or_default();
            let point_tags = serde_json::from_str::<std::collections::HashMap<String, Vec<String>>>(&row.point_tags).unwrap_or_default();
            PointSetDto {
                name: row.set_name,
                selected_keys,
                point_tags,
                updated_at: row.updated_at,
            }
        })
        .collect();

    Ok(Json(ListPointSetsResponse {
        success: true,
        sets,
    }))
}

async fn save_point_set(
    State(state): State<T3AppState>,
    Json(payload): Json<SavePointSetRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;
    ensure_point_sets_table(&db).await?;

    let normalized_name = payload.name.trim().to_string();
    if normalized_name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Set name is required".to_string()));
    }

    let selected_keys = normalize_selected_keys(payload.selected_keys);
    if selected_keys.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "At least one selected key is required".to_string(),
        ));
    }

    let point_tags = normalize_point_tags(&selected_keys, payload.point_tags);

    let selected_keys_json = serde_json::to_string(&selected_keys).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Failed to encode selectedKeys JSON: {}", e),
        )
    })?;

    let point_tags_json = serde_json::to_string(&point_tags).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Failed to encode pointTags JSON: {}", e),
        )
    })?;

    let now_ms = now_epoch_ms();

    let existing = trendlog_point_sets::Entity::find()
        .filter(trendlog_point_sets::Column::SerialNumber.eq(payload.serial_number))
        .filter(trendlog_point_sets::Column::SetName.eq(normalized_name.clone()))
        .one(&db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to query point set: {}", e),
            )
        })?;

    if let Some(existing) = existing {
        let mut model: trendlog_point_sets::ActiveModel = existing.into();
        model.selected_keys = Set(selected_keys_json);
        model.point_tags = Set(point_tags_json);
        model.updated_at = Set(Some(now_ms));
        model
            .update(&db)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to update point set: {}", e),
                )
            })?;
    } else {
        let model = trendlog_point_sets::ActiveModel {
            serial_number: Set(payload.serial_number),
            set_name: Set(normalized_name),
            selected_keys: Set(selected_keys_json),
            point_tags: Set(point_tags_json),
            created_at: Set(Some(now_ms)),
            updated_at: Set(Some(now_ms)),
            ..Default::default()
        };

        model
            .insert(&db)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to insert point set: {}", e),
                )
            })?;
    }

    Ok(Json(json!({
        "success": true,
        "message": "Set saved successfully.",
        "source": "local_sqlite"
    })))
}

async fn delete_point_set(
    State(state): State<T3AppState>,
    Json(payload): Json<DeletePointSetRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;
    ensure_point_sets_table(&db).await?;

    let normalized_name = payload.name.trim().to_string();
    if normalized_name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Set name is required".to_string()));
    }

    let result = trendlog_point_sets::Entity::delete_many()
        .filter(trendlog_point_sets::Column::SerialNumber.eq(payload.serial_number))
        .filter(trendlog_point_sets::Column::SetName.eq(normalized_name))
        .exec(&db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to delete point set: {}", e),
            )
        })?;

    Ok(Json(json!({
        "success": true,
        "deleted": result.rows_affected,
        "source": "local_sqlite",
    })))
}

async fn rename_point_set(
    State(state): State<T3AppState>,
    Json(payload): Json<RenamePointSetRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;
    ensure_point_sets_table(&db).await?;

    let old_name = payload.old_name.trim().to_string();
    let new_name = payload.new_name.trim().to_string();

    if old_name.is_empty() || new_name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Both oldName and newName are required".to_string()));
    }

    if old_name == new_name {
        return Ok(Json(json!({
            "success": true,
            "message": "No changes",
        })));
    }

    let replace_existing = payload.replace_existing.unwrap_or(false);
    let now_ms = now_epoch_ms();

    let txn = db.begin().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to start transaction: {}", e),
        )
    })?;

    let source = trendlog_point_sets::Entity::find()
        .filter(trendlog_point_sets::Column::SerialNumber.eq(payload.serial_number))
        .filter(trendlog_point_sets::Column::SetName.eq(old_name.clone()))
        .one(&txn)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load source point set: {}", e),
            )
        })?;

    let source = match source {
        Some(row) => row,
        None => {
            let _ = txn.rollback().await;
            return Err((StatusCode::NOT_FOUND, "Source set not found".to_string()));
        }
    };

    let target = trendlog_point_sets::Entity::find()
        .filter(trendlog_point_sets::Column::SerialNumber.eq(payload.serial_number))
        .filter(trendlog_point_sets::Column::SetName.eq(new_name.clone()))
        .one(&txn)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load target point set: {}", e),
            )
        })?;

    if let Some(existing_target) = target {
        if existing_target.id != source.id {
            if !replace_existing {
                let _ = txn.rollback().await;
                return Err((StatusCode::CONFLICT, "Target set name already exists".to_string()));
            }
            let existing_target_am: trendlog_point_sets::ActiveModel = existing_target.into();
            existing_target_am.delete(&txn).await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to remove existing target set: {}", e),
                )
            })?;
        }
    }

    let mut source_am: trendlog_point_sets::ActiveModel = source.into();
    source_am.set_name = Set(new_name.clone());
    source_am.updated_at = Set(Some(now_ms));
    source_am.update(&txn).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to rename point set: {}", e),
        )
    })?;

    txn.commit().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to commit rename transaction: {}", e),
        )
    })?;

    Ok(Json(json!({
        "success": true,
        "message": "Point set renamed",
        "name": new_name,
        "source": "local_sqlite",
    })))
}
