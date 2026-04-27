//! Database Backend Configuration REST API
//!
//! 8 endpoints under `/api/database/backend/`:
//!
//! | Method | Path           | Purpose                                    |
//! |--------|----------------|--------------------------------------------|
//! | GET    | /config        | Read all backend configs (passwords masked) |
//! | POST   | /config        | Save config for one backend type            |
//! | POST   | /test          | Test connection without saving              |
//! | GET    | /scan          | Scan LAN for SQL Server instances           |
//! | GET    | /status        | Current runtime backend status              |
//! | POST   | /init-schema   | Create 46 device tables on remote DB        |
//! | GET    | /ini           | Read INI [ServerDatabase] config            |
//! | POST   | /ini           | Write INI [ServerDatabase] config           |

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
        .route("/api/database/backend/init-schema", post(init_schema))
        // INI config endpoints for server/client database
        .route("/api/database/backend/ini", get(get_ini_config))
        .route("/api/database/backend/ini", post(save_ini_config))
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

    let backend_type = req.backend_type.clone();

    db_backend_config::save_config(&*db, req)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to save config: {}", e),
            )
        })?;

    // Also activate this backend so it becomes the active one on next restart
    db_backend_config::switch_backend(&*db, &backend_type)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Config saved but failed to activate backend: {}", e),
            )
        })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("Configuration saved and {} set as active backend", backend_type),
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
    connection_url: Option<String>,
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
        connection_url: req.connection_url,
        extra_options: req.extra_options,
        role: None,
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
            // Test connection by connecting to 'master' first (target DB may not exist yet).
            // If that works, also try the target database if specified.
            let target_db = config.database_name.clone();

            // Connect to master to verify auth
            let mut master_config = config.clone();
            master_config.database_name = Some("master".to_string());
            let tib_config = db_backend_config::build_mssql_config(&master_config).map_err(|e| {
                (axum::http::StatusCode::BAD_REQUEST, e)
            })?;

            let t0 = std::time::Instant::now();
            match test_mssql_connection(tib_config).await {
                Ok(_) => {
                    let latency_ms = t0.elapsed().as_millis() as u64;
                    // Auth works. Now check if target database exists.
                    if let Some(ref db_name) = target_db {
                        if !db_name.is_empty() {
                            let tib_config2 = db_backend_config::build_mssql_config(&config).map_err(|e| {
                                (axum::http::StatusCode::BAD_REQUEST, e)
                            })?;
                            match test_mssql_connection(tib_config2).await {
                                Ok(_) => Ok(Json(serde_json::json!({
                                    "success": true,
                                    "message": format!("Connected to SQL Server — database '{}' exists and is accessible", db_name),
                                    "db_exists": true,
                                    "latency_ms": latency_ms,
                                }))),
                                Err(_) => Ok(Json(serde_json::json!({
                                    "success": true,
                                    "message": format!("Connected to SQL Server — authentication OK. Database '{}' does not exist yet. Click 'Init Schema' to create it.", db_name),
                                    "db_exists": false,
                                    "latency_ms": latency_ms,
                                }))),
                            }
                        } else {
                            Ok(Json(serde_json::json!({
                                "success": true,
                                "message": "Connected to SQL Server — authentication OK",
                                "db_exists": false,
                                "latency_ms": latency_ms,
                            })))
                        }
                    } else {
                        Ok(Json(serde_json::json!({
                            "success": true,
                            "message": "Connected to SQL Server — authentication OK",
                            "db_exists": false,
                            "latency_ms": latency_ms,
                        })))
                    }
                }
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

async fn scan_network() -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // Run the scan in a blocking task (it uses std::net sockets)
    let instances = tokio::task::spawn_blocking(|| {
        network_scan::scan_sql_server_instances(3000) // 3 second timeout
    })
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Scan task failed: {}", e),
        )
    })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "instances": instances,
    })))
}

// ============================================================================
// 5. GET /status — current runtime backend status
// ============================================================================

async fn get_status(
    State(state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let server_status = crate::web_routing::resolve_server_db_status(&state).await;
    let backend_type = server_status.configured_backend.clone();
    let connected = if state.server_db_enabled {
        server_status.server_connected
    } else {
        state.t3_device_conn.is_some() || state.mssql_pool.is_some()
    };

    let table_count = if state.server_db_enabled && !server_status.server_connected {
        0
    } else if let Some(ref pool) = state.mssql_pool {
        super::mssql_queries::count_tables(pool).await.unwrap_or(0) as i64
    } else if let Some(ref t3_conn) = state.t3_device_conn {
        let db = t3_conn.lock().await;
        count_tables(&*db, &backend_type).await.unwrap_or(0)
    } else {
        0
    };

    Ok(Json(serde_json::json!({
        "success": true,
        "active_backend": backend_type,
        "connected": connected,
        "table_count": table_count,
        "host": server_status.host,
        "database_name": server_status.database_name,
        "center_db_status": server_status.center_db_status,
        "center_db_message": server_status.center_db_message,
        "runtime_backend": server_status.runtime_backend,
        "writes_blocked": server_status.writes_blocked,
        "can_init_schema": server_status.can_init_schema,
    })))
}

/// Count the number of user tables in the connected database.
async fn count_tables(conn: &DatabaseConnection, backend_type: &str) -> Result<i64, DbErr> {
    // Note: MSSQL is handled separately via tiberius pool; this function only
    // handles SeaORM-backed connections (Postgres, MySQL, SQLite).
    let sql = match backend_type {
        "postgres" => {
            "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        }
        "mysql" => {
            "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
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
                db_backend_config::initialize_server_schema(&conn, backend)
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
            // Step 1: Connect to 'master' and CREATE DATABASE if needed
            let db_name = full_config.database_name.clone().unwrap_or_else(|| "T3000".to_string());
            {
                let mut master_cfg = full_config.clone();
                master_cfg.database_name = Some("master".to_string());
                let master_tib = db_backend_config::build_mssql_config(&master_cfg).map_err(|e| {
                    (axum::http::StatusCode::BAD_REQUEST, e)
                })?;

                let master_pool =
                    super::mssql_queries::create_mssql_pool(master_tib, 2)
                        .await
                        .map_err(|e| {
                            (
                                axum::http::StatusCode::BAD_GATEWAY,
                                format!("Cannot connect to SQL Server master: {}", e),
                            )
                        })?;

                // CREATE DATABASE IF NOT EXISTS (MSSQL syntax)
                let create_db_sql = format!(
                    "IF DB_ID(N'{0}') IS NULL CREATE DATABASE [{0}]",
                    db_name.replace('\'', "''").replace(']', "]]")
                );
                let mut conn = master_pool.get().await.map_err(|e| {
                    (axum::http::StatusCode::BAD_GATEWAY, format!("Pool error: {}", e))
                })?;
                conn.simple_query(&create_db_sql)
                    .await
                    .map_err(|e| {
                        (axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                         format!("Failed to create database '{}': {}", db_name, e))
                    })?
                    .into_results()
                    .await
                    .map_err(|e| {
                        (axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                         format!("Failed to finalize CREATE DATABASE '{}': {}", db_name, e))
                    })?;
            }

            // Step 2: Now connect to the target database and create tables
            let tib_config = db_backend_config::build_mssql_config(&full_config).map_err(|e| {
                (axum::http::StatusCode::BAD_REQUEST, e)
            })?;

            let pool =
                super::mssql_queries::create_mssql_pool(tib_config, 5)
                    .await
                    .map_err(|e| {
                        (
                            axum::http::StatusCode::BAD_GATEWAY,
                            format!("Cannot connect to MSSQL database '{}': {}", db_name, e),
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
        .and_then(|pw| {
            match db_backend_config::decrypt_password(pw) {
                Ok(p) => Some(p),
                Err(e) => {
                    tracing::warn!(
                        "Failed to decrypt password for backend '{}': {}",
                        backend_type, e
                    );
                    None
                }
            }
        });

    // Decrypt connection_url (may be plaintext for backward compat)
    let decrypted_url = row.connection_url.as_ref().and_then(|url| {
        if url.is_empty() {
            return Some(String::new());
        }
        match db_backend_config::decrypt_password(url) {
            Ok(plain) => Some(plain),
            Err(_) => Some(url.clone()), // backward compat
        }
    });

    Ok(db_backend_config::BackendConfig {
        backend_type: bt,
        is_active: row.is_active != 0,
        host: row.host,
        port: row.port,
        instance: row.instance,
        database_name: row.database_name,
        username: row.username,
        password: decrypted_pw,
        connection_url: decrypted_url,
        extra_options: row
            .extra_options
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok()),
        role: row.role,
    })
}

// ============================================================================
// INI Config Endpoints — setting.ini [ServerDatabase] management
// ============================================================================

/// Request body for saving INI config.
#[derive(Deserialize)]
struct SaveIniConfigRequest {
    enabled: bool,
    role: String,
}

/// GET /api/database/backend/ini — read current [ServerDatabase] settings from setting.ini
async fn get_ini_config(
    State(_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let ini_path = crate::ini_config::find_setting_ini_path();
    let cfg = crate::ini_config::read_server_db_config(&ini_path);

    Ok(Json(serde_json::json!({
        "enabled": cfg.enabled,
        "role": cfg.role,
        "ini_path": ini_path.display().to_string(),
    })))
}

/// POST /api/database/backend/ini — update [ServerDatabase] section in setting.ini
///
/// This only writes to the local setting.ini file. A service restart is required
/// for the changes to take effect.
async fn save_ini_config(
    State(state): State<T3AppState>,
    Json(request): Json<SaveIniConfigRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    // Validate role
    let role = request.role.to_lowercase();
    if role != "server" && role != "client" {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            format!("Invalid role '{}'. Must be 'server' or 'client'.", request.role),
        ));
    }

    let config = crate::ini_config::ServerDbIniConfig {
        enabled: request.enabled,
        role,
    };

    let ini_path = crate::ini_config::find_setting_ini_path();

    crate::ini_config::write_server_db_config(&ini_path, &config).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write setting.ini: {}", e),
        )
    })?;

    let mut local_db_mirror_saved = false;
    if let Some(ref local_conn) = state.local_config_conn {
        let db = local_conn.lock().await;
        let enabled_saved = crate::database_management::ApplicationConfigService::set_setting(
            &*db,
            "server_db".to_string(),
            "enabled".to_string(),
            serde_json::Value::Bool(config.enabled),
            None,
            None,
            None,
        )
        .await;
        let role_saved = crate::database_management::ApplicationConfigService::set_setting(
            &*db,
            "server_db".to_string(),
            "role".to_string(),
            serde_json::Value::String(config.role.clone()),
            None,
            None,
            None,
        )
        .await;
        local_db_mirror_saved = enabled_saved.is_ok() && role_saved.is_ok();
    }

    let _ = crate::logger::write_structured_log(
        "T3_Database",
        &format!(
            "INI config updated: enabled={}, role={} (restart required)",
            config.enabled, config.role,
        ),
    );

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "INI config saved. Service restart required for changes to take effect.",
        "config": {
            "enabled": config.enabled,
            "role": config.role,
        },
        "local_db_mirror_saved": local_db_mirror_saved,
        "ini_path": ini_path.display().to_string(),
    })))
}
