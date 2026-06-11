use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::t3_device::haystack_tags_service;

/// Always use local SQLite for haystack operations.
async fn get_haystack_db(state: &T3AppState) -> Result<sea_orm::DatabaseConnection, (StatusCode, Json<Value>)> {
    if let Some(conn) = &state.local_config_conn {
        return Ok(conn.lock().await.clone());
    }
    Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Local database connection not available"}))))
}

// ── Request types ──

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListTagsQuery {
    filter: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PointTagsReadQuery {
    serial_numbers: Option<String>,
    point_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RebuildRequest {
    serial_numbers: Vec<i32>,
}

// ── Routes ──

pub fn create_haystack_tags_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/haystack/tags", get(list_tags).post(create_tag))
        .route("/api/haystack/tags/:name", put(update_tag).delete(delete_tag_handler))
        .route("/api/haystack/tag-tree", get(get_tag_tree))
        .route("/api/haystack/point-tags/read", post(read_point_tags))
        .route("/api/haystack/point-tags/write", post(write_point_tags))
        .route("/api/haystack/replace-tag", post(replace_tag))
        .route("/api/haystack/rebuild", post(rebuild_tags))
        .route("/api/haystack/sync", post(sync_official_tags))
}

// ── Handlers ──

async fn list_tags(
    State(state): State<T3AppState>,
    Query(query): Query<ListTagsQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    let tags = haystack_tags_service::list_tags(&db, query.filter.as_deref())
        .await
        .map_err(|e| {
            tracing::error!("list_tags failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to list tags: {}", e)})))
        })?;
    Ok(Json(json!({ "tags": tags, "total": tags.len() })))
}

async fn create_tag(
    State(state): State<T3AppState>,
    Json(payload): Json<haystack_tags_service::CreateTagRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    haystack_tags_service::create_tag(&db, &payload).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Tag created", "tag_name": payload.tag_name })))
}

async fn update_tag(
    State(state): State<T3AppState>,
    Path(name): Path<String>,
    Json(payload): Json<haystack_tags_service::UpdateTagRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    haystack_tags_service::update_tag(&db, &name, &payload).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Tag updated", "tag_name": name })))
}

async fn delete_tag_handler(
    State(state): State<T3AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    haystack_tags_service::delete_tag(&db, &name).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Tag deleted", "tag_name": name })))
}

async fn get_tag_tree(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    let tree = haystack_tags_service::get_tag_tree(&db).await.map_err(|e| {
        tracing::error!("get_tag_tree failed: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to get tag tree: {}", e)})))
    })?;
    Ok(Json(json!({ "tree": tree })))
}

async fn read_point_tags(
    State(state): State<T3AppState>,
    Json(payload): Json<PointTagsReadQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    let serial_numbers: Vec<i32> = payload.serial_numbers.as_deref().unwrap_or("")
        .split(',').filter_map(|s| s.trim().parse::<i32>().ok()).collect();
    let entries = haystack_tags_service::get_point_tags(&db, &serial_numbers, payload.point_type.as_deref())
        .await.map_err(|e| {
            tracing::error!("read_point_tags failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to read point tags: {}", e)})))
        })?;
    Ok(Json(json!({ "entries": entries, "total": entries.len() })))
}

async fn write_point_tags(
    State(state): State<T3AppState>,
    Json(payload): Json<Vec<haystack_tags_service::BatchPointTagUpdate>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    haystack_tags_service::batch_update_point_tags(&db, &payload).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Point tags updated", "count": payload.len() })))
}

async fn replace_tag(
    State(state): State<T3AppState>,
    Json(payload): Json<haystack_tags_service::ReplaceTagRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    haystack_tags_service::replace_tag(&db, &payload).await.map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "message": "Tag replaced" })))
}

async fn rebuild_tags(
    State(state): State<T3AppState>,
    Json(payload): Json<RebuildRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    if payload.serial_numbers.is_empty() {
        return Ok(Json(json!({ "success": true, "message": "No serial numbers provided", "updated": 0 })));
    }
    let tagged = haystack_tags_service::rebuild_tags_for_serials(&db, &payload.serial_numbers)
        .await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e }))))?;
    Ok(Json(json!({ "success": true, "message": "Haystack tags rebuilt", "updated": payload.serial_numbers.len(), "pointsTagged": tagged })))
}

async fn sync_official_tags(
    State(state): State<T3AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let db = get_haystack_db(&state).await?;
    let resp = reqwest::get("https://project-haystack.org/download/defs.json").await.map_err(|e| {
        (StatusCode::BAD_GATEWAY, Json(json!({"error": format!("Failed to fetch official defs: {}", e)})))
    })?;
    let defs: Value = resp.json().await.map_err(|e| {
        (StatusCode::BAD_GATEWAY, Json(json!({"error": format!("Failed to parse defs JSON: {}", e)})))
    })?;
    let count = haystack_tags_service::reseed_standard_tags(&db, &defs).await.map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e })))
    })?;
    Ok(Json(json!({ "success": true, "message": "Standard tags synced from official Project Haystack specification", "count": count })))
}
