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
    /// PC role: "server" (writes FFI data to server DB) or "client" (reads only)
    pub role: Option<String>,
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

    // Encrypt connection_url if provided; preserve existing if omitted
    // Must be computed before `row.into()` which moves `row`.
    let encrypted_url = if let Some(ref url) = req.connection_url {
        if url.is_empty() { Some(String::new()) } else {
            Some(encrypt_password(url).map_err(|e| DbErr::Custom(e))?)
        }
    } else {
        // Keep existing connection_url if not provided in request
        row.connection_url.clone()
    };

    let mut active: db_backend_config::ActiveModel = row.into();
    active.host = Set(req.host);
    active.port = Set(req.port);
    active.instance = Set(req.instance);
    active.database_name = Set(req.database_name);
    active.username = Set(req.username);
    active.password = Set(encrypted_password);
    active.connection_url = Set(encrypted_url);
    active.extra_options = Set(req.extra_options.map(|v| v.to_string()));
    if let Some(ref role) = req.role {
        active.role = Set(Some(role.clone()));
    }
    active.updated_at = Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()));

    active.update(local_conn).await?;
    Ok(())
}

/// Switch active backend: activate target first, then deactivate others.
/// This order prevents leaving all backends deactivated if any step fails.
pub async fn switch_backend(
    local_conn: &DatabaseConnection,
    backend_type: &str,
) -> Result<(), DbErr> {
    let _bt = BackendType::from_str(backend_type)
        .ok_or_else(|| DbErr::Custom(format!("Unknown backend type: {}", backend_type)))?;

    // 1. Activate target first (safe: if this fails, the old active stays)
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

    // 2. Deactivate all others
    db_backend_config::Entity::update_many()
        .col_expr(db_backend_config::Column::IsActive, Expr::value(0))
        .filter(db_backend_config::Column::BackendType.ne(backend_type))
        .exec(local_conn)
        .await?;

    Ok(())
}

// ============================================================================
// Connection Builders
// ============================================================================

/// Build a SeaORM connection URL for PostgreSQL or MySQL backends.
/// If `connection_url` is set, it takes precedence over individual fields.
pub fn build_seaorm_url(config: &BackendConfig) -> Result<String, String> {
    // If user provided a connection URL, use it directly (overrides individual fields)
    if let Some(ref url) = config.connection_url {
        if !url.is_empty() {
            return Ok(url.clone());
        }
    }

    match config.backend_type {
        BackendType::Postgres => {
            let host = config.host.as_deref().ok_or("PostgreSQL host required")?;
            let port = config.port.unwrap_or(5432);
            let db = config
                .database_name
                .as_deref()
                .ok_or("PostgreSQL database name required")?;
            let username = url_encode(config.username.as_deref().unwrap_or("postgres"));
            let password = url_encode(config.password.as_deref().unwrap_or(""));
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
            let username = url_encode(config.username.as_deref().unwrap_or("root"));
            let password = url_encode(config.password.as_deref().unwrap_or(""));
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
/// If `connection_url` is set, it is parsed as an ADO.NET connection string.
pub fn build_mssql_config(
    config: &BackendConfig,
) -> Result<tiberius::Config, String> {
    // If the user supplied a raw connection URL / ADO.NET string, use it directly.
    if let Some(ref url) = config.connection_url {
        if !url.is_empty() {
            return tiberius::Config::from_ado_string(url)
                .map_err(|e| format!("Failed to parse MSSQL connection string: {e}"));
        }
    }

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

    // Trust self-signed certificates by default — nearly all SQL Server
    // installations use a self-signed cert and will fail with
    // "invalid peer certificate: UnknownIssuer" without this.
    // Can be disabled via extra_options: {"trust_cert": false}
    let mut trust = true;
    if let Some(ref opts) = config.extra_options {
        let obj = if opts.is_string() {
            opts.as_str().and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        } else {
            Some(opts.clone())
        };
        if let Some(ref obj) = obj {
            if let Some(v) = obj.get("trust_cert").and_then(|v| v.as_bool()) {
                trust = v;
            }
        }
    }
    if trust {
        tib_config.trust_cert();
    }

    Ok(tib_config)
}

// ============================================================================
// Schema Initialisation for Server Backends
// ============================================================================

/// Embedded SQL schemas for each server backend dialect.
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



/// Initialise the server database schema for the given backend type.
///
/// Reads the embedded SQL dialect file, splits it into statements,
/// and executes each one against the provided SeaORM connection.
///
/// For MSSQL (Phase 5) this will need a tiberius connection instead.
///
/// Returns (statements_executed, errors) so the caller can report partial success.
pub async fn initialize_server_schema(
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
            return Err("SQLite uses static schema, not server init".to_string());
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

/// Percent-encode a string for use in a database connection URL (userinfo component).
/// Encodes characters that are reserved or meaningful in URLs: @ : / ? # [ ] %
fn url_encode(s: &str) -> String {
    let mut encoded = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '%' => encoded.push_str("%25"),
            '@' => encoded.push_str("%40"),
            ':' => encoded.push_str("%3A"),
            '/' => encoded.push_str("%2F"),
            '?' => encoded.push_str("%3F"),
            '#' => encoded.push_str("%23"),
            '[' => encoded.push_str("%5B"),
            ']' => encoded.push_str("%5D"),
            ' ' => encoded.push_str("%20"),
            c if c.is_ascii() => encoded.push(c),
            c => {
                // Percent-encode each byte of the UTF-8 representation
                let mut buf = [0u8; 4];
                for b in c.encode_utf8(&mut buf).bytes() {
                    use std::fmt::Write;
                    let _ = write!(encoded, "%{:02X}", b);
                }
            }
        }
    }
    encoded
}

// ============================================================================
// Validation
// ============================================================================

/// Validate that a backend config has all required fields.
/// If `connection_url` is set, individual host/database fields are not required.
pub fn validate_config(config: &BackendConfig) -> Result<(), String> {
    // connection_url overrides individual fields — skip field checks if set
    let has_url = config.connection_url.as_ref().map_or(false, |u| !u.is_empty());
    if has_url {
        return Ok(());
    }

    match config.backend_type {
        BackendType::Sqlite => Ok(()),
        BackendType::Mssql => {
            if config.host.as_ref().map_or(true, |h| h.is_empty()) {
                return Err("MSSQL host is required. Please save the configuration first.".to_string());
            }
            if config.database_name.as_ref().map_or(true, |d| d.is_empty()) {
                return Err("MSSQL database name is required. Please save the configuration first.".to_string());
            }
            Ok(())
        }
        BackendType::Postgres => {
            if config.host.as_ref().map_or(true, |h| h.is_empty()) {
                return Err("PostgreSQL host is required. Please save the configuration first.".to_string());
            }
            if config.database_name.as_ref().map_or(true, |d| d.is_empty()) {
                return Err("PostgreSQL database name is required. Please save the configuration first.".to_string());
            }
            Ok(())
        }
        BackendType::Mysql => {
            if config.host.as_ref().map_or(true, |h| h.is_empty()) {
                return Err("MySQL host is required. Please save the configuration first.".to_string());
            }
            if config.database_name.as_ref().map_or(true, |d| d.is_empty()) {
                return Err("MySQL database name is required. Please save the configuration first.".to_string());
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
        match decrypt_password(pw) {
            Ok(p) => Some(p),
            Err(e) => {
                tracing::warn!(
                    "Failed to decrypt password for backend '{}': {}. \
                     Password may need to be re-entered (hostname change?).",
                    row.backend_type, e
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
        // Try decryption first; fall back to raw value (pre-encryption data)
        match decrypt_password(url) {
            Ok(plain) => Some(plain),
            Err(_) => Some(url.clone()), // backward compat: stored before encryption was added
        }
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
        connection_url: decrypted_url,
        extra_options: row
            .extra_options
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok()),
        role: row.role,
    }
}

fn model_to_response(row: db_backend_config::Model) -> BackendConfigResponse {
    // Decrypt connection_url for masking (may be plaintext for backward compat)
    let decrypted_url = row.connection_url.as_ref().and_then(|url| {
        if url.is_empty() {
            return Some(String::new());
        }
        match decrypt_password(url) {
            Ok(plain) => Some(plain),
            Err(_) => Some(url.clone()), // backward compat
        }
    });

    BackendConfigResponse {
        backend_type: row.backend_type.clone(),
        is_active: row.is_active != 0,
        host: row.host.clone(),
        port: row.port,
        instance: row.instance.clone(),
        database_name: row.database_name.clone(),
        username: row.username.clone(),
        password_set: row.password.as_ref().map_or(false, |p| !p.is_empty()),
        connection_url: mask_url_password(decrypted_url.as_deref()),
        extra_options: row
            .extra_options
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok()),
        role: row.role.clone(),
    }
}

/// Strip password from a database connection URL for safe API responses.
/// Handles formats like `postgres://user:pass@host/db` and ADO.NET strings
/// like `Server=...;Password=secret;...`.
fn mask_url_password(url: Option<&str>) -> Option<String> {
    let url = url?;
    if url.is_empty() {
        return Some(url.to_string());
    }
    // Standard URL format: scheme://user:pass@host — use rfind to handle @ inside password
    if let Some(at_pos) = url.rfind('@') {
        if let Some(scheme_end) = url.find("://") {
            let userinfo_start = scheme_end + 3;
            if userinfo_start < at_pos {
                let userinfo = &url[userinfo_start..at_pos];
                if let Some(colon) = userinfo.find(':') {
                    let user = &userinfo[..colon];
                    return Some(format!("{}://{}:***@{}", &url[..scheme_end], user, &url[at_pos + 1..]));
                }
            }
        }
    }
    // ADO.NET format: mask Password=...; — iterate by char index for UTF-8 safety
    let lower = url.to_lowercase();
    if lower.contains("password=") {
        let mut result = String::with_capacity(url.len());
        let mut pos = 0;
        while pos < url.len() {
            if lower[pos..].starts_with("password=") {
                let key_end = pos + "password=".len();
                result.push_str(&url[pos..key_end]);
                result.push_str("***");
                // Skip until ';' or end
                if let Some(semi) = url[key_end..].find(';') {
                    pos = key_end + semi;
                } else {
                    pos = url.len();
                }
            } else {
                // Advance by one character (not one byte)
                let ch = url[pos..].chars().next().unwrap();
                result.push(ch);
                pos += ch.len_utf8();
            }
        }
        return Some(result);
    }
    Some(url.to_string())
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
            role: None,
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
            role: None,
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
            role: None,
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
            role: None,
        };
        assert!(validate_config(&config).is_err());
    }
}
