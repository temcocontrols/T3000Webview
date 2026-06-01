use axum::{
    extract::{Query, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::app_state::T3AppState;
use crate::t3_device::haystack_service;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HaystackReadRequest {
    pub filter: Option<String>,
    pub ids: Option<Vec<String>>,
    pub serial_numbers: Option<Vec<i32>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HaystackHisReadRequest {
    pub id: String,
    pub start: Option<String>,
    pub end: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HaystackDownloadQuery {
    pub format: Option<String>,
    pub filter: Option<String>,
    pub ids: Option<String>,
    pub serial_numbers: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildRequest {
    pub serial_numbers: Vec<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagUpdate {
    pub serial: i32,
    pub point_table: String,
    pub point_index: String,
    pub tags: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagsRequest {
    pub updates: Vec<TagUpdate>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HaystackGridResponse<T>
where
    T: Serialize,
{
    meta: Value,
    cols: Vec<&'static str>,
    rows: Vec<T>,
}

fn parse_csv_list(value: Option<&str>) -> Vec<String> {
    value
        .unwrap_or("")
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

fn parse_csv_i32_list(value: Option<&str>) -> Vec<i32> {
    parse_csv_list(value)
        .into_iter()
        .filter_map(|v| v.parse::<i32>().ok())
        .collect()
}

fn get_db_conn<'a>(state: &'a T3AppState) -> impl std::future::Future<Output = Result<sea_orm::DatabaseConnection, (StatusCode, String)>> + 'a {
    async move {
        if let Some(conn) = &state.t3_device_conn {
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

pub fn create_haystack_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/haystack/about", post(haystack_about))
        .route("/api/haystack/read", post(haystack_read))
        .route("/api/haystack/hisRead", post(haystack_his_read))
        .route("/api/haystack/download", get(haystack_download))
        .route("/api/haystack/rebuild", post(haystack_rebuild))
        .route("/api/haystack/update-tags", post(haystack_update_tags))
}

async fn haystack_about() -> Json<Value> {
    Json(json!({
        "meta": {
            "ver": "4.0",
            "productName": "T3000 WebView Haystack",
            "moduleName": "haystack-ffi",
            "haystackVersion": "4.0"
        },
        "about": {
            "status": "ok",
            "supports": ["about", "read", "hisRead", "download"]
        }
    }))
}

async fn haystack_read(
    State(state): State<T3AppState>,
    Json(payload): Json<HaystackReadRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;

    if let Some(serials) = payload.serial_numbers.as_ref() {
        haystack_service::refresh_entities_for_serials(&db, serials)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to refresh Haystack entities: {}", e)))?;
    }

    let rows = haystack_service::read_entities(
        &db,
        payload.filter.as_deref(),
        payload.ids.as_deref(),
        payload.serial_numbers.as_deref(),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Haystack read failed: {}", e)))?;

    let response = HaystackGridResponse {
        meta: json!({ "ver": "4.0" }),
        cols: vec!["id", "kind", "dis", "serialNumber", "pointTable", "pointIndex", "tags", "updatedAt"],
        rows,
    };

    Ok(Json(json!(response)))
}

async fn haystack_his_read(
    State(state): State<T3AppState>,
    Json(payload): Json<HaystackHisReadRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;

    let rows = haystack_service::his_read(
        &db,
        &payload.id,
        payload.start.as_deref(),
        payload.end.as_deref(),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Haystack hisRead failed: {}", e)))?;

    Ok(Json(json!({
        "meta": { "ver": "4.0" },
        "cols": ["ts", "val"],
        "rows": rows
    })))
}

fn make_download_response(content_type: &str, filename: &str, body: String) -> Response {
    let mut response = body.into_response();

    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
    );

    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename))
            .unwrap_or_else(|_| HeaderValue::from_static("attachment")),
    );

    response
}

async fn haystack_download(
    State(state): State<T3AppState>,
    Query(query): Query<HaystackDownloadQuery>,
) -> Result<Response, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;

    let ids = parse_csv_list(query.ids.as_deref());
    let serial_numbers = parse_csv_i32_list(query.serial_numbers.as_deref());

    if !serial_numbers.is_empty() {
        haystack_service::refresh_entities_for_serials(&db, &serial_numbers)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to refresh Haystack entities: {}", e)))?;
    }

    let rows = haystack_service::read_entities(
        &db,
        query.filter.as_deref(),
        if ids.is_empty() { None } else { Some(ids.as_slice()) },
        if serial_numbers.is_empty() { None } else { Some(serial_numbers.as_slice()) },
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Haystack download failed: {}", e)))?;

    let format = query.format.as_deref().unwrap_or("json").to_ascii_lowercase();
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();

    if format == "csv" {
        let mut csv = String::from("id,kind,dis,serial_number,point_table,point_index,tags,updated_at\n");
        for row in rows {
            let line = format!(
                "\"{}\",\"{}\",\"{}\",{},\"{}\",\"{}\",\"{}\",{}\n",
                row.id.replace('"', "\"\""),
                row.kind.replace('"', "\"\""),
                row.dis.replace('"', "\"\""),
                row.serial_number,
                row.point_table.replace('"', "\"\""),
                row.point_index.replace('"', "\"\""),
                row.tags.to_string().replace('"', "\"\""),
                row.updated_at
            );
            csv.push_str(&line);
        }

        return Ok(make_download_response(
            "text/csv; charset=utf-8",
            &format!("haystack_export_{}.csv", ts),
            csv,
        ));
    }

    let payload = serde_json::to_string_pretty(&json!({
        "meta": { "ver": "4.0" },
        "cols": ["id", "kind", "dis", "serialNumber", "pointTable", "pointIndex", "tags", "updatedAt"],
        "rows": rows
    }))
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to encode JSON download: {}", e)))?;

    Ok(make_download_response(
        "application/json; charset=utf-8",
        &format!("haystack_export_{}.json", ts),
        payload,
    ))
}

async fn haystack_rebuild(
    State(state): State<T3AppState>,
    Json(payload): Json<RebuildRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;

    if payload.serial_numbers.is_empty() {
        return Ok(Json(json!({
            "success": true,
            "message": "No serial numbers provided",
            "updated": 0
        })));
    }

    haystack_service::refresh_entities_for_serials(&db, &payload.serial_numbers)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Haystack rebuild failed: {}", e)))?;

    Ok(Json(json!({
        "success": true,
        "message": "Haystack entities rebuilt",
        "updated": payload.serial_numbers.len()
    })))
}

async fn haystack_update_tags(
    State(state): State<T3AppState>,
    Json(payload): Json<UpdateTagsRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let db = get_db_conn(&state).await?;

    let mut updated = 0usize;
    for update in &payload.updates {
        let point_table = update.point_table.to_ascii_uppercase();
        haystack_service::update_entity_tags(
            &db,
            update.serial,
            &point_table,
            &update.point_index,
            update.tags.clone(),
        )
        .await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update tags for {}/{}: {}", update.point_table, update.point_index, e),
        ))?;
        updated += 1;
    }

    Ok(Json(json!({
        "success": true,
        "updated": updated
    })))
}
