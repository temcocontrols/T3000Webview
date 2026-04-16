//! Database Backend Configuration REST API
//!
//! 7 endpoints under `/api/database/backend/`:
//!
//! | Method | Path           | Purpose                                    |
//! |--------|----------------|--------------------------------------------|
//! | GET    | /config        | Read all backend configs (passwords masked) |
//! | POST   | /config        | Save config for one backend type            |
//! | POST   | /test          | Test connection without saving              |
//! | GET    | /scan          | Scan LAN for SQL Server instances (UDP)     |
//! | GET    | /status        | Current runtime backend status              |
//! | POST   | /switch        | Set active backend (restart required)       |
//! | POST   | /init-schema   | Create 46 device tables on remote DB        |

use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use sea_orm::*;
use serde::Deserialize;

use crate::app_state::T3AppState;

use super::db_backend_config::{
    self, BackendType, SaveBackendConfigRequest,
};
use super::network_scan;

/// Create the backend config router — mounted at `/api/database/backend`.
pub fn db_backend_routes() -> Router<T3AppState> {
    Router::new()
        .route("/api/database/backend/config", get(get_config))
        .route("/api/database/backend/config", post(save_config))
        .route("/api/database/backend/test", post(test_connection))
        .route("/api/database/backend/scan", get(scan_network))
        .route("/api/database/backend/status", get(get_status))
        .route("/api/database/backend/switch", post(switch_backend))
        .route("/api/database/backend/init-schema", post(init_schema))
}

// ============================================================================
// Helper: extract the local config connection or return 503
// ============================================================================

fn no_config_conn() -> (axum::http::StatusCode, String) {
    (
        axum::http::StatusCode::SERVICE_UNAVAILABLE,
        "Local config database unavailable".to_string(),
    )
}

// ============================================================================
// 1. GET /config — read all backend configs
// ============================================================================

async fn get_config(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let local_conn = state
        .local_config_conn
        .as_ref()
        .ok_or_else(no_config_conn)?;
    let db = local_conn.lock().await;

    let configs = db_backend_config::load_all_configs(&*db)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load configs: {}", e),
            )
        })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "backends": configs,
    })))
}

// ============================================================================
// 2. POST /config — save config for one backend type
// ============================================================================

async fn save_config(
    State(state): State<T3AppState>,
    Json(req): Json<SaveBackendConfigRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let local_conn = state
        .local_config_conn
        .as_ref()
        .ok_or_else(no_config_conn)?;
    let db = local_conn.lock().await;

    db_backend_config::save_config(&*db, req)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save config: {}", e),
            )
        })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Configuration saved",
    })))
}

// ============================================================================
// 3. POST /test — test connection without saving or switching
// ============================================================================

#[derive(Debug, Deserialize)]
struct TestConnectionRequest {
    backend_type: String,
    host: Option<String>,
    port: Option<i32>,
    instance: Option<String>,
    database_name: Option<String>,
    username: Option<String>,
    password: Option<String>,
    extra_options: Option<serde_json::Value>,
}

async fn test_connection(
    Json(req): Json<TestConnectionRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let backend = BackendType::from_str(&req.backend_type).ok_or_else(|| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            format!("Unknown backend type: {}", req.backend_type),
        )
    })?;

    let config = db_backend_config::BackendConfig {
        backend_type: backend,
        is_active: false,
        host: req.host,
        port: req.port,
        instance: req.instance,
        database_name: req.database_name,
        username: req.username,
        password: req.password,
        connection_url: None,
        extra_options: req.extra_options,
    };

    // Validate required fields first
    db_backend_config::validate_config(&config).map_err(|e| {
        (axum::http::StatusCode::BAD_REQUEST, e)
    })?;

    match backend {
        BackendType::Sqlite => {
            Ok(Json(serde_json::json!({
                "success": true,
                "message": "SQLite is always available locally",
            })))
        }
        BackendType::Postgres | BackendType::Mysql => {
            let url = db_backend_config::build_seaorm_url(&config).map_err(|e| {
                (axum::http::StatusCode::BAD_REQUEST, e)
            })?;

            match Database::connect(&url).await {
                Ok(conn) => {
                    // Try a simple query to verify
                    let version_result = conn
                        .query_one(Statement::from_string(
                            if backend == BackendType::Postgres {
                                DatabaseBackend::Postgres
                            } else {
                                DatabaseBackend::MySql
                            },
                            "SELECT 1 AS alive".to_string(),
                        ))
                        .await;

                    match version_result {
                        Ok(_) => Ok(Json(serde_json::json!({
                            "success": true,
                            "message": format!("Connected to {} successfully", backend),
                        }))),
                        Err(e) => Ok(Json(serde_json::json!({
                            "success": false,
                            "error": format!("Connected but query failed: {}", e),
                        }))),
                    }
                }
                Err(e) => Ok(Json(serde_json::json!({
                    "success": false,
                    "error": format!("Connection failed: {}", e),
                }))),
            }
        }
        BackendType::Mssql => {
            // Phase 5: test via tiberius
            let tib_config = db_backend_config::build_mssql_config(&config).map_err(|e| {
                (axum::http::StatusCode::BAD_REQUEST, e)
            })?;

            // Attempt TCP connection with tiberius
            match test_mssql_connection(tib_config).await {
                Ok(msg) => Ok(Json(serde_json::json!({
                    "success": true,
                    "message": msg,
                }))),
                Err(e) => Ok(Json(serde_json::json!({
                    "success": false,
                    "error": e,
                }))),
            }
        }
    }
}

/// Test an MSSQL connection using tiberius.
async fn test_mssql_connection(config: tiberius::Config) -> Result<String, String> {
    use tokio::net::TcpStream;
    use tokio_util::compat::TokioAsyncWriteCompatExt;

    let tcp = TcpStream::connect(config.get_addr())
        .await
        .map_err(|e| format!("TCP connection failed: {}", e))?;

    tcp.set_nodelay(true)
        .map_err(|e| format!("Failed to set TCP_NODELAY: {}", e))?;

    let mut client = tiberius::Client::connect(config, tcp.compat_write())
        .await
        .map_err(|e| format!("MSSQL authentication failed: {}", e))?;

    // Simple test query
    let _row = client
        .simple_query("SELECT 1 AS alive")
        .await
        .map_err(|e| format!("MSSQL query failed: {}", e))?
        .into_row()
        .await
        .map_err(|e| format!("MSSQL row fetch failed: {}", e))?;

    Ok("Connected to SQL Server successfully".to_string())
}

// ============================================================================
// 4. GET /scan — scan LAN for SQL Server instances
// ============================================================================

async fn scan_network() -> Json<serde_json::Value> {
    // Run the UDP scan in a blocking task (it uses std::net::UdpSocket)
    let instances = tokio::task::spawn_blocking(|| {
        network_scan::scan_sql_server_instances(3000) // 3 second timeout
    })
    .await
    .unwrap_or_default();

    Json(serde_json::json!({
        "success": true,
        "instances": instances,
    }))
}

// ============================================================================
// 5. GET /status — current runtime backend status
// ============================================================================

async fn get_status(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // Read the active config from local DB
    let active_backend = if let Some(ref local_conn) = state.local_config_conn {
        let db = local_conn.lock().await;
        match db_backend_config::load_active_config(&*db).await {
            Ok(cfg) => Some(cfg),
            Err(_) => None,
        }
    } else {
        None
    };

    let backend_type = active_backend
        .as_ref()
        .map(|c| c.backend_type.as_str())
        .unwrap_or("unknown");

    // Check if t3_device_conn is available (i.e. the device DB is connected)
    // For MSSQL, check the mssql_pool instead
    let connected = state.t3_device_conn.is_some() || state.mssql_pool.is_some();

    // Count tables if connected
    let table_count = if let Some(ref pool) = state.mssql_pool {
        // MSSQL path: count via tiberius
        super::mssql_queries::count_tables(pool).await.unwrap_or(0) as i64
    } else if let Some(ref t3_conn) = state.t3_device_conn {
        let db = t3_conn.lock().await;
        count_tables(&*db, backend_type).await.unwrap_or(0)
    } else {
        0
    };

    Ok(Json(serde_json::json!({
        "success": true,
        "active_backend": backend_type,
        "connected": connected,
        "table_count": table_count,
        "host": active_backend.as_ref().and_then(|c| c.host.clone()),
        "database_name": active_backend.as_ref().and_then(|c| c.database_name.clone()),
    })))
}

/// Count the number of user tables in the connected database.
async fn count_tables(conn: &DatabaseConnection, backend_type: &str) -> Result<i64, DbErr> {
    let sql = match backend_type {
        "postgres" => {
            "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        }
        "mysql" => {
            "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
        }
        "mssql" => {
            "SELECT COUNT(*) AS cnt FROM sys.tables"
        }
        _ => {
            // SQLite
            "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        }
    };

    let db_backend = match backend_type {
        "postgres" => DatabaseBackend::Postgres,
        "mysql" => DatabaseBackend::MySql,
        _ => DatabaseBackend::Sqlite,
    };

    let result = conn
        .query_one(Statement::from_string(db_backend, sql.to_string()))
        .await?;

    if let Some(row) = result {
        let count: i64 = row.try_get_by_index(0).unwrap_or(0);
        Ok(count)
    } else {
        Ok(0)
    }
}

// ============================================================================
// 6. POST /switch — set active backend (restart required)
// ============================================================================

#[derive(Debug, Deserialize)]
struct SwitchRequest {
    backend_type: String,
}

async fn switch_backend(
    State(state): State<T3AppState>,
    Json(req): Json<SwitchRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let local_conn = state
        .local_config_conn
        .as_ref()
        .ok_or_else(no_config_conn)?;
    let db = local_conn.lock().await;

    db_backend_config::switch_backend(&*db, &req.backend_type)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to switch backend: {}", e),
            )
        })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("Active backend set to '{}'. Restart required to apply.", req.backend_type),
        "restart_required": true,
    })))
}

// ============================================================================
// 7. POST /init-schema — create 46 device tables on remote DB
// ============================================================================

#[derive(Debug, Deserialize)]
struct InitSchemaRequest {
    backend_type: String,
}

async fn init_schema(
    State(state): State<T3AppState>,
    Json(req): Json<InitSchemaRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let backend = BackendType::from_str(&req.backend_type).ok_or_else(|| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            format!("Unknown backend type: {}", req.backend_type),
        )
    })?;

    if backend == BackendType::Sqlite {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            "SQLite uses built-in schema, no remote init needed".to_string(),
        ));
    }

    // For PG/MySQL: read saved config → connect → run init
    // For MSSQL: need tiberius path (Phase 5)
    let local_conn = state
        .local_config_conn
        .as_ref()
        .ok_or_else(no_config_conn)?;
    let db = local_conn.lock().await;

    // Load the config for the requested backend type
    let all_configs = db_backend_config::load_all_configs(&*db)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load configs: {}", e),
            )
        })?;

    let _target_cfg = all_configs
        .iter()
        .find(|c| c.backend_type == req.backend_type)
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                format!("No saved config for backend: {}", req.backend_type),
            )
        })?;

    // We need the full config (with decrypted password) to make a connection
    let full_config = load_full_config_for_type(&*db, &req.backend_type)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load full config: {}", e),
            )
        })?;

    // Validate
    db_backend_config::validate_config(&full_config).map_err(|e| {
        (axum::http::StatusCode::BAD_REQUEST, e)
    })?;

    match backend {
        BackendType::Postgres | BackendType::Mysql => {
            let url = db_backend_config::build_seaorm_url(&full_config).map_err(|e| {
                (axum::http::StatusCode::BAD_REQUEST, e)
            })?;

            let conn = Database::connect(&url).await.map_err(|e| {
                (
                    axum::http::StatusCode::BAD_GATEWAY,
                    format!("Cannot connect to {} for schema init: {}", backend, e),
                )
            })?;

            let result =
                db_backend_config::initialize_remote_schema(&conn, backend)
                    .await
                    .map_err(|e| {
                        (
                            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                            format!("Schema init failed: {}", e),
                        )
                    })?;

            Ok(Json(serde_json::json!({
                "success": result.is_success(),
                "total_statements": result.total_statements,
                "executed": result.executed,
                "errors": result.errors,
                "message": if result.is_success() {
                    format!("Schema initialized on {} ({} statements)", backend, result.executed)
                } else {
                    format!("{} of {} statements succeeded, {} errors",
                        result.executed, result.total_statements, result.errors.len())
                },
            })))
        }
        BackendType::Mssql => {
            let tib_config = db_backend_config::build_mssql_config(&full_config).map_err(|e| {
                (axum::http::StatusCode::BAD_REQUEST, e)
            })?;

            let pool =
                super::mssql_queries::create_mssql_pool(tib_config, 5)
                    .await
                    .map_err(|e| {
                        (
                            axum::http::StatusCode::BAD_GATEWAY,
                            format!("Cannot connect to MSSQL for schema init: {}", e),
                        )
                    })?;

            let (executed, errors) =
                super::mssql_queries::initialize_mssql_schema(&pool)
                    .await
                    .map_err(|e| {
                        (
                            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                            format!("MSSQL schema init failed: {}", e),
                        )
                    })?;

            let success = errors.is_empty();
            let total = executed + errors.len();
            Ok(Json(serde_json::json!({
                "success": success,
                "total_statements": total,
                "executed": executed,
                "errors": errors,
                "message": if success {
                    format!("Schema initialized on MSSQL ({} statements)", executed)
                } else {
                    format!("{} of {} statements succeeded, {} errors",
                        executed, total, errors.len())
                },
            })))
        }
        BackendType::Sqlite => unreachable!(),
    }
}

/// Load a full BackendConfig (with decrypted password) for a given type.
async fn load_full_config_for_type(
    local_conn: &DatabaseConnection,
    backend_type: &str,
) -> Result<db_backend_config::BackendConfig, DbErr> {
    use crate::entity::db_backend_config as entity;

    let row = entity::Entity::find()
        .filter(entity::Column::BackendType.eq(backend_type))
        .one(local_conn)
        .await?
        .ok_or_else(|| DbErr::Custom(format!("Config not found for: {}", backend_type)))?;

    let bt = BackendType::from_str(&row.backend_type).unwrap_or(BackendType::Sqlite);

    let decrypted_pw = row
        .password
        .as_ref()
        .and_then(|pw| db_backend_config::decrypt_password(pw).ok());

    Ok(db_backend_config::BackendConfig {
        backend_type: bt,
        is_active: row.is_active != 0,
        host: row.host,
        port: row.port,
        instance: row.instance,
        database_name: row.database_name,
        username: row.username,
        password: decrypted_pw,
        connection_url: row.connection_url,
        extra_options: row
            .extra_options
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok()),
    })
}
