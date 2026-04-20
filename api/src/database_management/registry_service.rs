// ============================================================================
// Server / Client Registry Service
// ============================================================================
//
// Background heartbeat task + REST endpoints for tracking which PCs
// participate in centralized database mode.
//
// Both server and client PCs share the same central DB via `t3_device_conn`.
// Each PC upserts its own entry into SERVER_CLIENT_REGISTRY every 30s.
// The server additionally marks stale entries (>2 min) as offline.
//
// - Server PC: writes own entry every 30s + marks stale clients offline.
// - Client PC: writes own entry every 30s (direct DB write, no HTTP needed).
// - GET  /api/database/server/registry  → returns all entries.
// - POST /api/database/server/heartbeat → (legacy) external heartbeat receiver.
// ============================================================================

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::app_state::T3AppState;
use crate::entity::server_client_registry;

// ============================================================================
// Types
// ============================================================================

/// A single entry in the registry, returned by the API.
#[derive(Debug, Clone, Serialize)]
pub struct RegistryEntry {
    pub id: i32,
    pub hostname: String,
    pub ip_address: String,
    pub role: String,
    pub is_self: bool,
    pub status: String,
    pub last_seen: String,
    pub db_backend: Option<String>,
    pub table_count: Option<i32>,
    pub version: Option<String>,
}

/// Heartbeat payload sent by client PCs.
#[derive(Debug, Deserialize)]
pub struct HeartbeatRequest {
    pub hostname: String,
    pub ip_address: String,
    pub role: String,
    pub version: Option<String>,
}

// ============================================================================
// Background heartbeat task (runs on server PC)
// ============================================================================

/// Starts the background heartbeat loop.
/// - Both server and client PCs upsert their own entry every 30s into the
///   shared central DB (which both roles connect to via `t3_device_conn`).
/// - Only the server additionally marks stale entries as offline.
pub fn start_heartbeat_task(state: T3AppState) {
    if !state.server_db_enabled {
        return; // Server DB mode not enabled — nothing to do
    }

    let is_server = state.server_db_role == "server";

    tokio::spawn(async move {
        // Wait a bit for everything to initialise
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop {
            interval.tick().await;

            // Prefer t3_device_conn (central DB); fall back to local_config_conn
            let conn_ref = state.t3_device_conn.as_ref().or(state.local_config_conn.as_ref());
            if let Some(ref conn) = conn_ref {
                let db = conn.lock().await;
                let _ = upsert_self_entry(&*db, &state).await;
                // Only the server marks stale clients offline
                if is_server {
                    let _ = mark_stale_clients_offline(&*db).await;
                }
            }
        }
    });
}

/// Upsert the server's own entry in SERVER_CLIENT_REGISTRY.
async fn upsert_self_entry(
    db: &DatabaseConnection,
    state: &T3AppState,
) -> Result<(), DbErr> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let ip = get_local_ip();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Try to find existing entry by hostname (not IP, which may change with DHCP)
    let existing = server_client_registry::Entity::find()
        .filter(server_client_registry::Column::Hostname.eq(&hostname))
        .one(db)
        .await?;

    if let Some(row) = existing {
        // Update last_seen and current IP
        let mut active: server_client_registry::ActiveModel = row.into();
        active.ip_address = Set(ip);
        active.status = Set("online".to_string());
        active.last_seen = Set(now);
        active.role = Set(state.server_db_role.clone());
        active.is_self = Set(1);
        active.update(db).await?;
    } else {
        // Insert new
        let entry = server_client_registry::ActiveModel {
            id: NotSet,
            hostname: Set(hostname),
            ip_address: Set(ip),
            role: Set(state.server_db_role.clone()),
            is_self: Set(1),
            status: Set("online".to_string()),
            last_seen: Set(now.clone()),
            db_backend: Set(Some("sqlite".to_string())),
            table_count: Set(None),
            version: Set(None),
            created_at: Set(Some(now)),
        };
        entry.insert(db).await?;
    }

    Ok(())
}

/// Mark clients as "offline" if their last_seen is older than 2 minutes.
async fn mark_stale_clients_offline(db: &DatabaseConnection) -> Result<(), DbErr> {
    let cutoff = (chrono::Utc::now() - chrono::Duration::seconds(120))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    // Update all entries where last_seen < cutoff AND status = 'online' AND is_self = 0
    server_client_registry::Entity::update_many()
        .col_expr(server_client_registry::Column::Status, Expr::value("offline"))
        .filter(server_client_registry::Column::Status.eq("online"))
        .filter(server_client_registry::Column::IsSelf.eq(0))
        .filter(server_client_registry::Column::LastSeen.lt(&cutoff))
        .exec(db)
        .await?;

    Ok(())
}

// ============================================================================
// REST Endpoints
// ============================================================================

/// GET /api/database/server/registry — returns all registered PCs.
async fn get_registry(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let conn = get_device_conn(&state)?;
    let db = conn.lock().await;

    let rows = server_client_registry::Entity::find()
        .order_by_asc(server_client_registry::Column::Role) // server first
        .order_by_asc(server_client_registry::Column::Hostname)
        .all(&*db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let entries: Vec<RegistryEntry> = rows.into_iter().map(model_to_entry).collect();

    Ok(Json(serde_json::json!({
        "success": true,
        "entries": entries,
        "count": entries.len(),
    })))
}

/// POST /api/database/server/heartbeat — receives heartbeat from a client PC.
async fn receive_heartbeat(
    State(state): State<T3AppState>,
    Json(req): Json<HeartbeatRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Validate role
    let role = req.role.to_lowercase();
    if role != "server" && role != "client" {
        return Err((StatusCode::BAD_REQUEST, "Invalid role".to_string()));
    }

    let conn = get_device_conn(&state)?;
    let db = conn.lock().await;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Upsert by hostname (not IP, which may change with DHCP)
    let existing = server_client_registry::Entity::find()
        .filter(server_client_registry::Column::Hostname.eq(&req.hostname))
        .one(&*db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(row) = existing {
        let mut active: server_client_registry::ActiveModel = row.into();
        active.ip_address = Set(req.ip_address.clone());
        active.status = Set("online".to_string());
        active.last_seen = Set(now);
        active.role = Set(role);
        active.is_self = Set(0);
        if let Some(ref ver) = req.version {
            active.version = Set(Some(ver.clone()));
        }
        active.update(&*db).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        let entry = server_client_registry::ActiveModel {
            id: NotSet,
            hostname: Set(req.hostname.clone()),
            ip_address: Set(req.ip_address.clone()),
            role: Set(role),
            is_self: Set(0),
            status: Set("online".to_string()),
            last_seen: Set(now.clone()),
            db_backend: Set(None),
            table_count: Set(None),
            version: Set(req.version.clone()),
            created_at: Set(Some(now)),
        };
        entry.insert(&*db).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Heartbeat received",
    })))
}

// ============================================================================
// Router
// ============================================================================

pub fn registry_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/database/server/registry", get(get_registry))
        .route("/api/database/server/heartbeat", post(receive_heartbeat))
}

// ============================================================================
// Helpers
// ============================================================================

fn get_device_conn(state: &T3AppState) -> Result<&Arc<Mutex<DatabaseConnection>>, (StatusCode, String)> {
    // Prefer t3_device_conn (SeaORM connection to active backend).
    // Fall back to local_config_conn (local SQLite) when device conn is
    // unavailable — e.g. when active backend is MSSQL (uses tiberius pool,
    // not SeaORM). This keeps registry endpoints functional in all modes.
    state
        .t3_device_conn
        .as_ref()
        .or(state.local_config_conn.as_ref())
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "No database connection available for registry".to_string(),
    ))
}

fn model_to_entry(row: server_client_registry::Model) -> RegistryEntry {
    RegistryEntry {
        id: row.id,
        hostname: row.hostname,
        ip_address: row.ip_address,
        role: row.role,
        is_self: row.is_self != 0,
        status: row.status,
        last_seen: row.last_seen,
        db_backend: row.db_backend,
        table_count: row.table_count,
        version: row.version,
    }
}

/// Re-export from network_scan to avoid duplication.
fn get_local_ip() -> String {
    super::network_scan::get_local_ip()
}
