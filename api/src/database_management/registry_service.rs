// ============================================================================
// Server / Client Registry Service
// ============================================================================
//
// Background heartbeat task + REST endpoints for tracking which PCs
// participate in centralized database mode.
//
// - Server PC: writes its own entry every 30s, marks stale clients offline.
// - Client PC: POSTs heartbeat to server every 30s.
// - GET /api/database/server/registry → returns all entries.
// - POST /api/database/server/heartbeat → client heartbeat receiver.
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
/// - On the server: upserts own entry + marks stale clients offline.
/// - On the client: does nothing (clients POST to the server instead).
pub fn start_heartbeat_task(state: T3AppState) {
    if !state.server_db_enabled || state.server_db_role != "server" {
        return; // Only the server runs the background task
    }

    tokio::spawn(async move {
        // Wait a bit for everything to initialise
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop {
            interval.tick().await;

            if let Some(ref conn) = state.t3_device_conn {
                let db = conn.lock().await;
                let _ = upsert_self_entry(&*db, &state).await;
                let _ = mark_stale_clients_offline(&*db).await;
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

    // Try to find existing entry
    let existing = server_client_registry::Entity::find()
        .filter(server_client_registry::Column::Hostname.eq(&hostname))
        .filter(server_client_registry::Column::IpAddress.eq(&ip))
        .one(db)
        .await?;

    if let Some(row) = existing {
        // Update last_seen
        let mut active: server_client_registry::ActiveModel = row.into();
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

    // Upsert
    let existing = server_client_registry::Entity::find()
        .filter(server_client_registry::Column::Hostname.eq(&req.hostname))
        .filter(server_client_registry::Column::IpAddress.eq(&req.ip_address))
        .one(&*db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(row) = existing {
        let mut active: server_client_registry::ActiveModel = row.into();
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
    state.t3_device_conn.as_ref().ok_or((
        StatusCode::SERVICE_UNAVAILABLE,
        "Device database not available".to_string(),
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

/// Get the local IP address of this machine by connecting a UDP socket.
fn get_local_ip() -> String {
    // Connect a UDP socket to a public address (doesn't actually send data)
    // to determine which local interface would be used.
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}
