// ============================================================================
// Server / Client Registry Service
// ============================================================================
//
// Background heartbeat task + REST endpoints for tracking which PCs
// participate in centralized database mode.
//
// Both server and client PCs share the same **center** DB. This table must
// never fall back to local SQLite — the whole point is cross-PC visibility.
//
// When the center DB is Postgres/MySQL, we use SeaORM via `t3_device_conn`.
// When the center DB is MSSQL, we use tiberius via `mssql_pool`.
//
// - Server PC: writes own entry every 30s + marks stale clients offline.
// - Client PC: writes own entry every 30s (direct DB write, no HTTP needed).
// - GET  /api/database/server/registry  → returns all entries.
// - POST /api/database/server/heartbeat → (legacy) external heartbeat receiver.
// ============================================================================

use axum::{
    extract::{Query as AxumQuery, State},
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
use super::mssql_queries::MssqlPool;

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
///   shared central DB.
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

            // Try MSSQL pool first, then SeaORM (t3_device_conn).
            // Never fall back to local_config_conn — registry is center-DB only.
            if let Some(ref pool) = state.mssql_pool {
                let _ = mssql_upsert_self(pool, &state).await;
                if is_server {
                    let _ = mssql_mark_stale_offline(pool).await;
                }
            } else if let Some(ref conn) = state.t3_device_conn {
                let db = conn.lock().await;
                let _ = upsert_self_entry(&*db, &state).await;
                if is_server {
                    let _ = mark_stale_clients_offline(&*db).await;
                }
            }
            // else: no center DB available — skip silently
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
    let backend = if state.mssql_pool.is_some() {
        "mssql".to_string()
    } else {
        "sqlite".to_string()
    };

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
        active.db_backend = Set(Some(backend.clone()));
        active.table_count = Set(None);
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
            db_backend: Set(Some(backend)),
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
    // Standalone mode — no shared registry, return empty list gracefully
    if !state.server_db_enabled {
        return Ok(Json(serde_json::json!({
            "success": true,
            "entries": [],
            "count": 0,
        })));
    }

    // MSSQL path
    if let Some(ref pool) = state.mssql_pool {
        let entries = mssql_get_all_entries(pool).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!({
            "success": true,
            "entries": entries,
            "count": entries.len(),
        })));
    }

    // SeaORM path (Postgres/MySQL)
    let conn = get_center_conn(&state)?;
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

    // MSSQL path
    if let Some(ref pool) = state.mssql_pool {
            mssql_upsert_entry(
                pool,
                &req.hostname,
                &req.ip_address,
                &role,
                0,
                "sqlite",
                req.version.as_deref(),
            )
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!({
            "success": true,
            "message": "Heartbeat received",
        })));
    }

    // SeaORM path
    let conn = get_center_conn(&state)?;
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
// Ping client relay
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct PingClientQuery {
    pub ip: String,
    pub port: Option<u16>,
}

#[derive(Debug, Serialize)]
pub struct PingClientResponse {
    pub reachable: bool,
    pub latency_ms: Option<u64>,
    pub message: String,
}

/// GET /api/database/server/ping-client?ip=x.x.x.x&port=9103
/// Server relays a TCP connect attempt to the target client's port.
async fn ping_client(
    AxumQuery(q): AxumQuery<PingClientQuery>,
) -> Json<PingClientResponse> {
    let port = q.port.unwrap_or(9103);
    let addr = format!("{}:{}", q.ip, port);
    let start = std::time::Instant::now();
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        tokio::net::TcpStream::connect(&addr),
    )
    .await;
    match result {
        Ok(Ok(_)) => {
            let latency = start.elapsed().as_millis() as u64;
            Json(PingClientResponse {
                reachable: true,
                latency_ms: Some(latency),
                message: format!("Reachable ({}ms)", latency),
            })
        }
        Ok(Err(e)) => Json(PingClientResponse {
            reachable: false,
            latency_ms: None,
            message: e.to_string(),
        }),
        Err(_) => Json(PingClientResponse {
            reachable: false,
            latency_ms: None,
            message: "Timed out".to_string(),
        }),
    }
}

// ============================================================================
// Router
// ============================================================================

pub fn registry_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/database/server/registry", get(get_registry))
        .route("/api/database/server/heartbeat", post(receive_heartbeat))
        .route("/api/database/server/ping-client", get(ping_client))
}

// ============================================================================
// Helpers
// ============================================================================

/// Get the center DB connection (SeaORM). Never falls back to local SQLite.
fn get_center_conn(state: &T3AppState) -> Result<&Arc<Mutex<DatabaseConnection>>, (StatusCode, String)> {
    state
        .t3_device_conn
        .as_ref()
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "Center database not connected. Configure and initialize a server database first.".to_string(),
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

// ============================================================================
// MSSQL helpers (tiberius raw SQL)
// ============================================================================

/// Upsert self entry via MSSQL pool (heartbeat task).
async fn mssql_upsert_self(pool: &MssqlPool, state: &T3AppState) -> Result<(), String> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    let ip = get_local_ip();
    let backend = if state.mssql_pool.is_some() {
        "mssql"
    } else {
        "sqlite"
    };
    mssql_upsert_entry(pool, &hostname, &ip, &state.server_db_role, 1, backend, None).await
}

/// Upsert a registry entry by hostname (MERGE).
async fn mssql_upsert_entry(
    pool: &MssqlPool,
    hostname: &str,
    ip_address: &str,
    role: &str,
    is_self: i32,
    db_backend: &str,
    version: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;
    let ver = version.unwrap_or("");

    conn.execute(
        "MERGE INTO SERVER_CLIENT_REGISTRY AS target \
         USING (SELECT @P1 AS hostname) AS source \
         ON target.hostname = source.hostname \
         WHEN MATCHED THEN UPDATE SET \
           ip_address = @P2, role = @P3, is_self = @P4, status = N'online', \
                     last_seen = GETDATE(), db_backend = @P5, table_count = NULL, version = @P6 \
         WHEN NOT MATCHED THEN INSERT \
                     (hostname, ip_address, role, is_self, status, last_seen, db_backend, table_count, version, created_at) \
                 VALUES (@P1, @P2, @P3, @P4, N'online', GETDATE(), @P5, NULL, @P6, GETDATE());",
                &[&hostname, &ip_address, &role, &is_self, &db_backend, &ver],
    )
    .await
    .map_err(|e| format!("MSSQL registry upsert failed: {}", e))?;

    Ok(())
}

/// Mark stale clients offline (MSSQL).
async fn mssql_mark_stale_offline(pool: &MssqlPool) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "UPDATE SERVER_CLIENT_REGISTRY \
         SET status = N'offline' \
         WHERE status = N'online' AND is_self = 0 \
           AND last_seen < DATEADD(SECOND, -120, GETDATE())",
        &[],
    )
    .await
    .map_err(|e| format!("MSSQL mark stale failed: {}", e))?;

    Ok(())
}

/// Get all registry entries (MSSQL).
async fn mssql_get_all_entries(pool: &MssqlPool) -> Result<Vec<RegistryEntry>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let stream = conn
        .query(
            "SELECT id, hostname, ip_address, role, is_self, status, \
                    CONVERT(VARCHAR(30), last_seen, 120) AS last_seen, \
                    db_backend, table_count, version \
             FROM SERVER_CLIENT_REGISTRY \
             ORDER BY role ASC, hostname ASC",
            &[],
        )
        .await
        .map_err(|e| format!("MSSQL registry query failed: {}", e))?;

    let rows = stream
        .into_results()
        .await
        .map_err(|e| format!("MSSQL result fetch failed: {}", e))?;

    let mut entries = Vec::new();
    for result_set in &rows {
        for row in result_set {
            entries.push(RegistryEntry {
                id: row.get::<i32, _>("id").unwrap_or(0),
                hostname: row.get::<&str, _>("hostname").unwrap_or("").to_string(),
                ip_address: row.get::<&str, _>("ip_address").unwrap_or("").to_string(),
                role: row.get::<&str, _>("role").unwrap_or("client").to_string(),
                is_self: row.get::<i32, _>("is_self").unwrap_or(0) != 0,
                status: row.get::<&str, _>("status").unwrap_or("unknown").to_string(),
                last_seen: row.get::<&str, _>("last_seen").unwrap_or("").to_string(),
                db_backend: row.get::<&str, _>("db_backend").map(|s| s.to_string()),
                table_count: row.get::<i32, _>("table_count"),
                version: row.get::<&str, _>("version").map(|s| s.to_string()),
            });
        }
    }

    Ok(entries)
}
