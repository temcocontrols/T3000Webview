//! Database Backend Configuration Service
//!
//! Provides:
//! - `BackendType` enum for supported database backends
//! - Load/save backend configuration from local SQLite
//! - AES-256-GCM password encryption/decryption
//! - Connection string builders for each backend
//! - Configuration validation

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use sea_orm::*;
use sea_orm::prelude::Expr;
use serde::{Deserialize, Serialize};
use std::fmt;

use crate::entity::db_backend_config;

// ============================================================================
// BackendType Enum
// ============================================================================

/// Supported database backend types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackendType {
    Sqlite,
    Mssql,
    Postgres,
    Mysql,
}

impl BackendType {
    pub fn as_str(&self) -> &'static str {
        match self {
            BackendType::Sqlite => "sqlite",
            BackendType::Mssql => "mssql",
            BackendType::Postgres => "postgres",
            BackendType::Mysql => "mysql",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "sqlite" => Some(BackendType::Sqlite),
            "mssql" => Some(BackendType::Mssql),
            "postgres" => Some(BackendType::Postgres),
            "mysql" => Some(BackendType::Mysql),
            _ => None,
        }
    }

    pub fn default_port(&self) -> Option<i32> {
        match self {
            BackendType::Sqlite => None,
            BackendType::Mssql => Some(1433),
            BackendType::Postgres => Some(5432),
            BackendType::Mysql => Some(3306),
        }
    }
}

impl fmt::Display for BackendType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

// ============================================================================
// Configuration DTOs
// ============================================================================

/// Full backend configuration (for internal use, includes decrypted password)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendConfig {
    pub backend_type: BackendType,
    pub is_active: bool,
    pub host: Option<String>,
    pub port: Option<i32>,
    pub instance: Option<String>,
    pub database_name: Option<String>,
    pub username: Option<String>,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    pub connection_url: Option<String>,
    pub extra_options: Option<serde_json::Value>,
    /// PC role: "main" (writes FFI data to central DB) or "reader" (reads only)
    pub role: Option<String>,
    /// Whether to store system logs to the central DB
    pub store_logs: bool,
}

/// Backend configuration for API responses (password masked)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendConfigResponse {
    pub backend_type: String,
    pub is_active: bool,
    pub host: Option<String>,
    pub port: Option<i32>,
    pub instance: Option<String>,
    pub database_name: Option<String>,
    pub username: Option<String>,
    pub password_set: bool,
    pub connection_url: Option<String>,
    pub extra_options: Option<serde_json::Value>,
    pub role: Option<String>,
    pub store_logs: bool,
}

/// Request body for saving backend config
#[derive(Debug, Clone, Deserialize)]
pub struct SaveBackendConfigRequest {
    pub backend_type: String,
    pub host: Option<String>,
    pub port: Option<i32>,
    pub instance: Option<String>,
    pub database_name: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub connection_url: Option<String>,
    pub extra_options: Option<serde_json::Value>,
    pub role: Option<String>,
    pub store_logs: Option<bool>,
}

// ============================================================================
// Password Encryption (AES-256-GCM)
// ============================================================================

/// Derive an AES-256 key from machine identity.
/// Uses hostname as the seed, padded/truncated to 32 bytes.
fn derive_encryption_key() -> [u8; 32] {
    let machine_id = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "T3000-default-host".to_string());

    let mut key = [0u8; 32];
    let bytes = machine_id.as_bytes();
    for (i, byte) in key.iter_mut().enumerate() {
        *byte = bytes[i % bytes.len()];
    }
    key
}

/// Encrypt a plaintext password. Returns base64(nonce || ciphertext).
pub fn encrypt_password(plaintext: &str) -> Result<String, String> {
    let key = derive_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let nonce_bytes: [u8; 12] = {
        use aes_gcm::aead::rand_core::RngCore;
        let mut buf = [0u8; 12];
        OsRng.fill_bytes(&mut buf);
        buf
    };
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext, then base64 encode
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

/// Decrypt a base64(nonce || ciphertext) string back to plaintext.
pub fn decrypt_password(encrypted: &str) -> Result<String, String> {
    let key = derive_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if combined.len() < 13 {
        return Err("Encrypted data too short".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode failed: {}", e))
}

// ============================================================================
// Config Load / Save
// ============================================================================

/// Load the active backend configuration from local SQLite.
/// Returns the row where is_active = 1.
pub async fn load_active_config(
    local_conn: &DatabaseConnection,
) -> Result<BackendConfig, DbErr> {
    let row = db_backend_config::Entity::find()
        .filter(db_backend_config::Column::IsActive.eq(1))
        .one(local_conn)
        .await?
        .ok_or_else(|| DbErr::Custom("No active backend config found".to_string()))?;

    Ok(model_to_config(row))
}

/// Load all backend configurations (for the config page).
pub async fn load_all_configs(
    local_conn: &DatabaseConnection,
) -> Result<Vec<BackendConfigResponse>, DbErr> {
    let rows = db_backend_config::Entity::find()
        .all(local_conn)
        .await?;

    Ok(rows.into_iter().map(model_to_response).collect())
}

/// Save configuration for a specific backend type.
/// Encrypts password before storing.
pub async fn save_config(
    local_conn: &DatabaseConnection,
    req: SaveBackendConfigRequest,
) -> Result<(), DbErr> {
    let backend_type = BackendType::from_str(&req.backend_type)
        .ok_or_else(|| DbErr::Custom(format!("Unknown backend type: {}", req.backend_type)))?;

    let row = db_backend_config::Entity::find()
        .filter(db_backend_config::Column::BackendType.eq(backend_type.as_str()))
        .one(local_conn)
        .await?
        .ok_or_else(|| {
            DbErr::Custom(format!("Backend config not found: {}", req.backend_type))
        })?;

    let encrypted_password = if let Some(ref pw) = req.password {
        if pw.is_empty() {
            None
        } else {
            Some(encrypt_password(pw).map_err(|e| DbErr::Custom(e))?)
        }
    } else {
        // Keep existing password if not provided in request
        row.password.clone()
    };

    let mut active: db_backend_config::ActiveModel = row.into();
    active.host = Set(req.host);
    active.port = Set(req.port);
    active.instance = Set(req.instance);
    active.database_name = Set(req.database_name);
    active.username = Set(req.username);
    active.password = Set(encrypted_password);
    active.connection_url = Set(req.connection_url);
    active.extra_options = Set(req.extra_options.map(|v| v.to_string()));
    if let Some(ref role) = req.role {
        active.role = Set(Some(role.clone()));
    }
    if let Some(store_logs) = req.store_logs {
        active.store_logs = Set(Some(if store_logs { 1 } else { 0 }));
    }
    active.updated_at = Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()));

    active.update(local_conn).await?;
    Ok(())
}

/// Switch active backend: set is_active=0 on all, then is_active=1 on target.
pub async fn switch_backend(
    local_conn: &DatabaseConnection,
    backend_type: &str,
) -> Result<(), DbErr> {
    let _bt = BackendType::from_str(backend_type)
        .ok_or_else(|| DbErr::Custom(format!("Unknown backend type: {}", backend_type)))?;

    // Deactivate all
    db_backend_config::Entity::update_many()
        .col_expr(db_backend_config::Column::IsActive, Expr::value(0))
        .exec(local_conn)
        .await?;

    // Activate target
    let updated = db_backend_config::Entity::update_many()
        .col_expr(db_backend_config::Column::IsActive, Expr::value(1))
        .filter(db_backend_config::Column::BackendType.eq(backend_type))
        .exec(local_conn)
        .await?;

    if updated.rows_affected == 0 {
        return Err(DbErr::Custom(format!(
            "Backend type not found: {}",
            backend_type
        )));
    }

    Ok(())
}

// ============================================================================
// Connection Builders
// ============================================================================

/// Build a SeaORM connection URL for PostgreSQL or MySQL backends.
pub fn build_seaorm_url(config: &BackendConfig) -> Result<String, String> {
    match config.backend_type {
        BackendType::Postgres => {
            let host = config.host.as_deref().ok_or("PostgreSQL host required")?;
            let port = config.port.unwrap_or(5432);
            let db = config
                .database_name
                .as_deref()
                .ok_or("PostgreSQL database name required")?;
            let username = config.username.as_deref().unwrap_or("postgres");
            let password = config.password.as_deref().unwrap_or("");
            Ok(format!(
                "postgres://{}:{}@{}:{}/{}",
                username, password, host, port, db
            ))
        }
        BackendType::Mysql => {
            let host = config.host.as_deref().ok_or("MySQL host required")?;
            let port = config.port.unwrap_or(3306);
            let db = config
                .database_name
                .as_deref()
                .ok_or("MySQL database name required")?;
            let username = config.username.as_deref().unwrap_or("root");
            let password = config.password.as_deref().unwrap_or("");
            Ok(format!(
                "mysql://{}:{}@{}:{}/{}",
                username, password, host, port, db
            ))
        }
        BackendType::Sqlite => {
            Ok(config
                .connection_url
                .clone()
                .unwrap_or_else(|| "sqlite://Database/webview_t3_device.db".to_string()))
        }
        BackendType::Mssql => {
            Err("MSSQL uses tiberius directly, not a SeaORM URL".to_string())
        }
    }
}

/// Build a tiberius Config for MSSQL backend.
pub fn build_mssql_config(
    config: &BackendConfig,
) -> Result<tiberius::Config, String> {
    let host = config.host.as_deref().ok_or("MSSQL host required")?;
    let port = config.port.unwrap_or(1433) as u16;

    let mut tib_config = tiberius::Config::new();
    tib_config.host(host);
    tib_config.port(port);

    if let Some(ref instance) = config.instance {
        if !instance.is_empty() {
            tib_config.instance_name(instance);
        }
    }

    if let Some(ref db) = config.database_name {
        tib_config.database(db);
    }

    // Authentication
    match (&config.username, &config.password) {
        (Some(user), Some(pass)) => {
            tib_config.authentication(tiberius::AuthMethod::sql_server(user, pass));
        }
        _ => {
            // Windows authentication (no user/pass)
            tib_config.authentication(tiberius::AuthMethod::Integrated);
        }
    }

    // Trust certificate option from extra_options
    if let Some(ref opts) = config.extra_options {
        if let Some(trust) = opts.get("trust_cert").and_then(|v| v.as_bool()) {
            if trust {
                tib_config.trust_cert();
            }
        }
    }

    Ok(tib_config)
}

// ============================================================================
// Validation
// ============================================================================

// ============================================================================
// Schema Initialisation for Remote Backends
// ============================================================================

/// Embedded SQL schemas for each remote backend dialect.
const SCHEMA_POSTGRES: &str = include_str!("../../migration/sql/webview_t3_device_postgres.sql");
const SCHEMA_MYSQL: &str    = include_str!("../../migration/sql/webview_t3_device_mysql.sql");
// MSSQL schema is loaded directly in mssql_queries::initialize_mssql_schema()

/// Split a SQL script into individual statements on semicolons.
/// Ignores empty statements and comment-only lines.
fn split_sql_statements(script: &str) -> Vec<String> {
    script
        .split(';')
        .map(|s| s.trim().to_string())
        .filter(|s| {
            if s.is_empty() {
                return false;
            }
            // Skip pure comment blocks
            let non_comment: String = s
                .lines()
                .filter(|l| {
                    let trimmed = l.trim();
                    !trimmed.is_empty() && !trimmed.starts_with("--")
                })
                .collect::<Vec<_>>()
                .join(" ");
            !non_comment.trim().is_empty()
        })
        .collect()
}



/// Initialise the remote database schema for the given backend type.
///
/// Reads the embedded SQL dialect file, splits it into statements,
/// and executes each one against the provided SeaORM connection.
///
/// For MSSQL (Phase 5) this will need a tiberius connection instead.
///
/// Returns (statements_executed, errors) so the caller can report partial success.
pub async fn initialize_remote_schema(
    conn: &DatabaseConnection,
    backend: BackendType,
) -> Result<InitSchemaResult, String> {
    let (script, db_backend) = match backend {
        BackendType::Postgres => (SCHEMA_POSTGRES, sea_orm::DatabaseBackend::Postgres),
        BackendType::Mysql    => (SCHEMA_MYSQL,    sea_orm::DatabaseBackend::MySql),
        BackendType::Mssql    => {
            // Phase 5: will execute via tiberius pool instead
            return Err("MSSQL schema init requires tiberius (Phase 5)".to_string());
        }
        BackendType::Sqlite   => {
            return Err("SQLite uses static schema, not remote init".to_string());
        }
    };

    let statements = split_sql_statements(script);
    let total = statements.len();
    let mut executed = 0usize;
    let mut errors: Vec<String> = Vec::new();

    for stmt in &statements {
        let result = conn
            .execute(sea_orm::Statement::from_string(db_backend, stmt.clone()))
            .await;
        match result {
            Ok(_) => executed += 1,
            Err(e) => {
                let msg = format!("Statement failed: {} — {}", truncate_stmt(stmt, 120), e);
                eprintln!("[db_backend_config] WARN: {}", msg);
                errors.push(msg);
            }
        }
    }

    Ok(InitSchemaResult {
        total_statements: total,
        executed,
        errors,
    })
}

/// Result of a remote schema initialisation attempt.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitSchemaResult {
    pub total_statements: usize,
    pub executed: usize,
    pub errors: Vec<String>,
}

impl InitSchemaResult {
    pub fn is_success(&self) -> bool {
        self.errors.is_empty()
    }
}

/// Truncate a SQL statement for logging.
fn truncate_stmt(s: &str, max: usize) -> String {
    let one_line: String = s.chars().take(max).collect();
    let one_line = one_line.replace('\n', " ").replace('\r', "");
    if s.len() > max {
        format!("{}…", one_line)
    } else {
        one_line
    }
}

// ============================================================================
// Validation
// ============================================================================

/// Validate that a backend config has all required fields.
pub fn validate_config(config: &BackendConfig) -> Result<(), String> {
    match config.backend_type {
        BackendType::Sqlite => Ok(()),
        BackendType::Mssql => {
            if config.host.as_ref().map_or(true, |h| h.is_empty()) {
                return Err("MSSQL host is required".to_string());
            }
            if config.database_name.as_ref().map_or(true, |d| d.is_empty()) {
                return Err("MSSQL database name is required".to_string());
            }
            Ok(())
        }
        BackendType::Postgres => {
            if config.host.as_ref().map_or(true, |h| h.is_empty()) {
                return Err("PostgreSQL host is required".to_string());
            }
            if config.database_name.as_ref().map_or(true, |d| d.is_empty()) {
                return Err("PostgreSQL database name is required".to_string());
            }
            Ok(())
        }
        BackendType::Mysql => {
            if config.host.as_ref().map_or(true, |h| h.is_empty()) {
                return Err("MySQL host is required".to_string());
            }
            if config.database_name.as_ref().map_or(true, |d| d.is_empty()) {
                return Err("MySQL database name is required".to_string());
            }
            Ok(())
        }
    }
}

// ============================================================================
// Internal helpers
// ============================================================================

fn model_to_config(row: db_backend_config::Model) -> BackendConfig {
    let decrypted_pw = row.password.as_ref().and_then(|pw| {
        decrypt_password(pw).ok()
    });

    BackendConfig {
        backend_type: BackendType::from_str(&row.backend_type).unwrap_or(BackendType::Sqlite),
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
        role: row.role,
        store_logs: row.store_logs.unwrap_or(1) != 0,
    }
}

fn model_to_response(row: db_backend_config::Model) -> BackendConfigResponse {
    BackendConfigResponse {
        backend_type: row.backend_type.clone(),
        is_active: row.is_active != 0,
        host: row.host.clone(),
        port: row.port,
        instance: row.instance.clone(),
        database_name: row.database_name.clone(),
        username: row.username.clone(),
        password_set: row.password.is_some(),
        connection_url: row.connection_url.clone(),
        extra_options: row
            .extra_options
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok()),
        role: row.role.clone(),
        store_logs: row.store_logs.unwrap_or(1) != 0,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backend_type_roundtrip() {
        for bt in [BackendType::Sqlite, BackendType::Mssql, BackendType::Postgres, BackendType::Mysql] {
            assert_eq!(BackendType::from_str(bt.as_str()), Some(bt));
        }
        assert_eq!(BackendType::from_str("unknown"), None);
    }

    #[test]
    fn test_password_encrypt_decrypt() {
        let original = "my_secret_password!@#$%";
        let encrypted = encrypt_password(original).expect("encrypt");
        assert_ne!(encrypted, original);
        let decrypted = decrypt_password(&encrypted).expect("decrypt");
        assert_eq!(decrypted, original);
    }

    #[test]
    fn test_password_empty() {
        let encrypted = encrypt_password("").expect("encrypt empty");
        let decrypted = decrypt_password(&encrypted).expect("decrypt empty");
        assert_eq!(decrypted, "");
    }

    #[test]
    fn test_build_postgres_url() {
        let config = BackendConfig {
            backend_type: BackendType::Postgres,
            is_active: true,
            host: Some("192.168.1.100".to_string()),
            port: Some(5432),
            instance: None,
            database_name: Some("T3000_Devices".to_string()),
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            connection_url: None,
            extra_options: None,
        };
        let url = build_seaorm_url(&config).unwrap();
        assert_eq!(url, "postgres://admin:secret@192.168.1.100:5432/T3000_Devices");
    }

    #[test]
    fn test_build_mysql_url() {
        let config = BackendConfig {
            backend_type: BackendType::Mysql,
            is_active: true,
            host: Some("db.local".to_string()),
            port: None,
            instance: None,
            database_name: Some("t3000".to_string()),
            username: None,
            password: None,
            connection_url: None,
            extra_options: None,
        };
        let url = build_seaorm_url(&config).unwrap();
        assert_eq!(url, "mysql://root:@db.local:3306/t3000");
    }

    #[test]
    fn test_validate_sqlite() {
        let config = BackendConfig {
            backend_type: BackendType::Sqlite,
            is_active: true,
            host: None, port: None, instance: None,
            database_name: None, username: None, password: None,
            connection_url: None, extra_options: None,
        };
        assert!(validate_config(&config).is_ok());
    }

    #[test]
    fn test_validate_mssql_missing_host() {
        let config = BackendConfig {
            backend_type: BackendType::Mssql,
            is_active: false,
            host: None, port: Some(1433), instance: None,
            database_name: Some("T3000".to_string()),
            username: None, password: None,
            connection_url: None, extra_options: None,
        };
        assert!(validate_config(&config).is_err());
    }
}
