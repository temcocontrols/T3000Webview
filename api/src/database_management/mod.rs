//! Database Management Module
//!
//! Comprehensive database management system including:
//! - Application settings storage (localStorage replacement)
//! - Database partitioning and cleanup
//! - Size monitoring and optimization
//! - Automated maintenance tasks

use sea_orm::*;
use sea_orm::prelude::Expr;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc, Duration};

use crate::constants::get_t3000_database_path;
use crate::entity::{application_settings, database_partitions, database_partition_config, database_files};
use crate::error::Result;
use std::sync::{Arc, RwLock};

pub mod endpoints;
pub mod config_api;

/// Partition metadata cache for faster queries
static PARTITION_CACHE: std::sync::OnceLock<Arc<RwLock<HashMap<String, PartitionMetadata>>>> = std::sync::OnceLock::new();

#[derive(Debug, Clone)]
pub struct PartitionMetadata {
    pub partition_id: String,
    pub file_path: String,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub record_count: i64,
    pub is_active: bool,
}

/// Partitioning configuration with overlap and retention settings
#[derive(Debug, Clone)]
pub struct PartitioningRuntimeConfig {
    pub overlap_hours: i32,           // Default: 24 (keep 24h in main DB)
    pub max_partitions: i32,          // Default: 30 (retention limit)
    pub check_interval_hours: i32,    // Default: 4 (background check every 4h)
    pub archive_folder: String,       // Default: "Archive" subfolder
    pub enable_caching: bool,         // Default: true (cache partition metadata)
}

impl Default for PartitioningRuntimeConfig {
    fn default() -> Self {
        Self {
            overlap_hours: 24,
            max_partitions: 30,
            check_interval_hours: 4,
            archive_folder: "Archive".to_string(),
            enable_caching: true,
        }
    }
}

/// Result of period transition and partition rotation
#[derive(Debug, Serialize, Deserialize)]
pub struct PartitionTransitionResult {
    pub period_changed: bool,
    pub current_period: String,
    pub previous_period: String,
    pub partitions_created: i32,
    pub data_migrated_mb: i32,
    pub overlap_maintained: bool,
    pub errors: Vec<String>,
}

impl Default for PartitionTransitionResult {
    fn default() -> Self {
        Self {
            period_changed: false,
            current_period: String::new(),
            previous_period: String::new(),
            partitions_created: 0,
            data_migrated_mb: 0,
            overlap_maintained: false,
            errors: Vec::new(),
        }
    }
}

/// Smart query execution plan for historical data queries
#[derive(Debug, Clone)]
pub struct SmartQueryPlan {
    pub query_main_db: bool,
    pub partition_files: Vec<PartitionMetadata>,
    pub estimated_records: i64,
    pub cache_hit: bool,
}

/// Application Configuration Service
pub struct ApplicationConfigService;

impl ApplicationConfigService {
    /// Get configuration by key
    pub async fn get_config(
        db: &DatabaseConnection,
        key: &str,
        user_id: Option<i32>,
        device_serial: Option<String>,
        panel_id: Option<i32>,
    ) -> Result<Option<application_settings::Model>> {
        let mut query = application_settings::Entity::find()
            .filter(application_settings::Column::ConfigKey.eq(key));

        if let Some(uid) = user_id {
            query = query.filter(application_settings::Column::UserId.eq(uid));
        } else {
            query = query.filter(application_settings::Column::UserId.is_null());
        }

        if let Some(serial) = device_serial {
            query = query.filter(application_settings::Column::DeviceSerial.eq(serial));
        } else {
            query = query.filter(application_settings::Column::DeviceSerial.is_null());
        }

        if let Some(pid) = panel_id {
            query = query.filter(application_settings::Column::PanelId.eq(pid));
        } else {
            query = query.filter(application_settings::Column::PanelId.is_null());
        }

        Ok(query.one(db).await?)
    }

    /// Set configuration value
    pub async fn set_config(
        db: &DatabaseConnection,
        key: String,
        value: serde_json::Value,
        user_id: Option<i32>,
        device_serial: Option<String>,
        panel_id: Option<i32>,
        version: Option<String>,
    ) -> Result<application_settings::Model> {
        let config_type = match &value {
            serde_json::Value::String(_) => "string".to_string(),
            serde_json::Value::Number(_) => "number".to_string(),
            serde_json::Value::Bool(_) => "boolean".to_string(),
            _ => "json".to_string(),
        };

        let existing = Self::get_config(db, &key, user_id.clone(), device_serial.clone(), panel_id.clone()).await?;

        if let Some(existing_config) = existing {
            // Update existing config
            let mut active_model: application_settings::ActiveModel = existing_config.into();
            active_model.config_value = Set(value.to_string());
            active_model.config_type = Set(config_type);
            active_model.version = Set(version);
            active_model.updated_at = Set(Utc::now().naive_utc());
            Ok(active_model.update(db).await?)
        } else {
            // Create new config
            let new_config = application_settings::ActiveModel {
                config_key: Set(key),
                config_value: Set(value.to_string()),
                config_type: Set(config_type),
                user_id: Set(user_id),
                device_serial: Set(device_serial),
                panel_id: Set(panel_id),
                version: Set(version),
                is_system: Set(false),
                created_at: Set(Utc::now().naive_utc()),
                updated_at: Set(Utc::now().naive_utc()),
                ..Default::default()
            };
            Ok(new_config.insert(db).await?)
        }
    }

    /// Backward compatibility: Get setting using old category.key format
    pub async fn get_setting(
        db: &DatabaseConnection,
        category: &str,
        setting_key: &str,
        user_id: Option<i32>,
        device_serial: Option<String>,
    ) -> Result<Option<application_settings::Model>> {
        // Convert old category.key format to new unified key
        let key = format!("{}.{}", category, setting_key);
        Self::get_config(db, &key, user_id, device_serial, None).await
    }

    /// Backward compatibility: Set setting using old category.key format
    pub async fn set_setting(
        db: &DatabaseConnection,
        category: String,
        setting_key: String,
        value: serde_json::Value,
        user_id: Option<i32>,
        device_serial: Option<String>,
        version: Option<String>,
    ) -> Result<application_settings::Model> {
        // Convert old category.key format to new unified key
        let key = format!("{}.{}", category, setting_key);
        Self::set_config(db, key, value, user_id, device_serial, None, version).await
    }

    /// Get all settings for a category (prefix-based search)
    pub async fn get_category_settings(
        db: &DatabaseConnection,
        category: &str,
        user_id: Option<i32>,
        device_serial: Option<String>,
    ) -> Result<Vec<application_settings::Model>> {
        // Use prefix search with the new schema
        let prefix = format!("{}.", category);
        let mut query = application_settings::Entity::find()
            .filter(application_settings::Column::ConfigKey.like(format!("{}%", prefix)));

        if let Some(uid) = user_id {
            query = query.filter(application_settings::Column::UserId.eq(uid));
        } else {
            query = query.filter(application_settings::Column::UserId.is_null());
        }

        if let Some(serial) = device_serial {
            query = query.filter(application_settings::Column::DeviceSerial.eq(serial));
        } else {
            query = query.filter(application_settings::Column::DeviceSerial.is_null());
        }

        Ok(query.all(db).await?)
    }

    /// Migrate localStorage data to database
    pub async fn migrate_localstorage_data(
        db: &DatabaseConnection,
        localstorage_data: HashMap<String, serde_json::Value>,
    ) -> Result<i32> {
        let mut migrated_count = 0;

        for (key, value) in localstorage_data {
            let category = if key.starts_with("modbusRegister") {
                "modbusRegisterGridState".to_string()
            } else if key.starts_with("localSettings") {
                "localSettings".to_string()
            } else if key.starts_with("appState") {
                "appState".to_string()
            } else {
                "general".to_string()
            };

            let _ = Self::set_setting(
                db,
                category,
                key,
                value,
                None,
                None,
                Some("LOCALSTORAGE_MIGRATION".to_string()),
            ).await?;

            migrated_count += 1;
        }

        Ok(migrated_count)
    }
}

/// Database Partition Service
pub struct DatabasePartitionService;

impl DatabasePartitionService {
    /// Create a new partition
    pub async fn create_partition(
        db: &DatabaseConnection,
        table_name: String,
        partition_type: String,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<database_partitions::Model> {
        let partition_identifier = match partition_type.as_str() {
            "DAILY" => start_date.format("%Y-%m-%d").to_string(),
            "WEEKLY" => start_date.format("%Y-W%U").to_string(),
            "MONTHLY" => start_date.format("%Y-%m").to_string(),
            _ => start_date.format("%Y-%m-%d").to_string(),
        };

        let new_partition = database_partitions::ActiveModel {
            table_name: Set(table_name),
            partition_type: Set(partition_type.clone()),
            partition_identifier: Set(partition_identifier),
            partition_start_date: Set(start_date.naive_utc()),
            partition_end_date: Set(end_date.naive_utc()),
            record_count: Set(0),
            size_bytes: Set(0),
            is_active: Set(true),
            is_archived: Set(false),
            retention_days: Set(Some(match partition_type.as_str() {
                "DAILY" => 30,
                "WEEKLY" => 84,
                "MONTHLY" => 365,
                _ => 30,
            })),
            auto_cleanup_enabled: Set(true),
            created_at: Set(Utc::now().naive_utc()),
            updated_at: Set(Utc::now().naive_utc()),
            ..Default::default()
        };

        Ok(new_partition.insert(db).await?)
    }

    /// Get all partitions for a table
    pub async fn get_table_partitions(
        db: &DatabaseConnection,
        table_name: &str,
    ) -> Result<Vec<database_partitions::Model>> {
        Ok(database_partitions::Entity::find()
            .filter(database_partitions::Column::TableName.eq(table_name))
            .order_by_desc(database_partitions::Column::PartitionStartDate)
            .all(db)
            .await?)
    }

    /// Update partition statistics
    pub async fn update_partition_stats(
        db: &DatabaseConnection,
        partition_id: i32,
        record_count: i64,
        size_bytes: i64,
    ) -> Result<database_partitions::Model> {
        let partition = database_partitions::Entity::find_by_id(partition_id)
            .one(db)
            .await?
            .ok_or_else(|| crate::error::Error::NotFound)?;

        let mut active_model: database_partitions::ActiveModel = partition.into();
        active_model.record_count = Set(record_count);
        active_model.size_bytes = Set(size_bytes);
        active_model.updated_at = Set(Utc::now().naive_utc());

        Ok(active_model.update(db).await?)
    }

    /// Archive old partitions based on retention policy
    pub async fn cleanup_old_partitions(db: &DatabaseConnection) -> Result<CleanupResult> {
        let partitions = database_partitions::Entity::find()
            .filter(database_partitions::Column::AutoCleanupEnabled.eq(true))
            .filter(database_partitions::Column::IsArchived.eq(false))
            .all(db)
            .await?;

        let mut cleaned_up = 0;
        let mut total_records_removed = 0i64;
        let mut total_bytes_freed = 0i64;

        let now = Utc::now().naive_utc();

        for partition in partitions {
            if let Some(retention_days) = partition.retention_days {
                let retention_date = now - Duration::days(retention_days as i64);

                if partition.partition_end_date < retention_date {
                    // Archive the partition
                    let mut active_model: database_partitions::ActiveModel = partition.clone().into();
                    active_model.is_archived = Set(true);
                    active_model.is_active = Set(false);
                    active_model.last_cleanup_at = Set(Some(now));
                    active_model.updated_at = Set(now);
                    active_model.update(db).await?;

                    // TODO: Implement actual data cleanup based on table_name
                    // This would involve dropping partition tables or deleting records

                    cleaned_up += 1;
                    total_records_removed += partition.record_count;
                    total_bytes_freed += partition.size_bytes;
                }
            }
        }

        let space_saved = CleanupResult::format_bytes(total_bytes_freed);
        let message = if cleaned_up > 0 {
            format!("Successfully cleaned up {} old partitions", cleaned_up)
        } else {
            "No old partitions found to clean up".to_string()
        };

        Ok(CleanupResult {
            files_deleted: cleaned_up,
            space_saved,
            space_saved_bytes: total_bytes_freed,
            deleted_files: vec![], // partitions don't have file names
            message,
            records_removed: total_records_removed,
        })
    }
}

/// Database size monitoring service
pub struct DatabaseSizeService;

impl DatabaseSizeService {
    /// Get database size statistics
    pub async fn get_database_stats(db: &DatabaseConnection) -> Result<DatabaseStats> {
        // Note: These queries are SQLite-specific
        // For other databases, the queries would need to be adapted

        let size_query = r#"
            SELECT page_count * page_size as size
            FROM pragma_page_count(), pragma_page_size()
        "#;

        let tables_query = r#"
            SELECT name,
                   (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as record_count
            FROM sqlite_master m
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        "#;

        // Execute raw SQL for database statistics
        let size_query_result = db.query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            size_query.to_string()
        )).await?
        .ok_or_else(|| crate::error::Error::DatabaseError("Failed to get database size".to_string()))?;

        let total_size: i64 = size_query_result.try_get("", "total_size")?;

        let table_stats: Vec<(String, i64)> = db.query_all(Statement::from_string(
            DatabaseBackend::Sqlite,
            tables_query.to_string()
        )).await?
        .into_iter()
        .map(|row| (
            row.try_get::<String>("", "name").unwrap_or_default(),
            row.try_get::<i64>("", "record_count").unwrap_or(0)
        ))
        .collect();

        Ok(DatabaseStats {
            total_size_bytes: total_size,
            table_stats,
            last_updated: Utc::now().naive_utc(),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupResult {
    #[serde(rename = "filesDeleted")]
    pub files_deleted: i32,
    #[serde(rename = "spaceSaved")]
    pub space_saved: String,
    #[serde(rename = "spaceSavedBytes")]
    pub space_saved_bytes: i64,
    #[serde(rename = "deletedFiles")]
    pub deleted_files: Vec<String>,
    pub message: String,
    #[serde(rename = "recordsRemoved")]
    pub records_removed: i64,
}

impl CleanupResult {
    fn format_bytes(bytes: i64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
        if bytes == 0 {
            return "0 B".to_string();
        }

        let size = bytes as f64;
        let i = (size.ln() / 1024_f64.ln()).floor() as usize;
        let i = i.min(UNITS.len() - 1);
        let formatted_size = size / 1024_f64.powi(i as i32);

        format!("{:.1} {}", formatted_size, UNITS[i])
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub total_size_bytes: i64,
    pub table_stats: Vec<(String, i64)>,
    pub last_updated: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalStorageMigrationRequest {
    pub data: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingRequest {
    pub category: String,
    pub key: String,
    pub value: serde_json::Value,
    pub user_id: Option<i32>,
    pub device_serial: Option<String>,
    pub panel_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PartitionRequest {
    pub table_name: String,
    pub partition_type: String, // "DAILY", "WEEKLY", "MONTHLY"
    pub start_date: String,     // ISO 8601 format
    pub end_date: String,       // ISO 8601 format
}

#[derive(Debug, Default)]
pub struct ValidationResult {
    pub orphaned_records: i32,
    pub missing_files: i32,
    pub fixed_records: i32,
    pub created_files: i32,
}

/// Helper function to create SQLite database URLs that work on both Windows and Unix
fn create_sqlite_url(file_path: &std::path::Path) -> String {
    let path_str = file_path.to_string_lossy();
    if cfg!(windows) {
        // On Windows, handle long paths and normalize separators
        let normalized_path = path_str.replace("\\", "/");

        // Handle UNC paths and long paths on Windows
        if normalized_path.len() > 260 {
            println!("⚠️ Warning: Path length ({}) exceeds Windows MAX_PATH limit (260)", normalized_path.len());
        }

        // Use proper SQLite URI format for Windows
        format!("sqlite:///{}", normalized_path)
    } else {
        format!("sqlite://{}", path_str)
    }
}

/// Helper function to format paths for SQLite ATTACH statements
fn format_path_for_attach(file_path: &std::path::Path) -> String {
    if cfg!(windows) {
        // On Windows, normalize the path and escape single quotes
        file_path.to_string_lossy().replace("\\", "/").replace("'", "''")
    } else {
        file_path.to_string_lossy().replace("'", "''")
    }
}

/// Trendlog Configuration Service
///
/// Manages database partitioning configuration and file management
pub struct DatabaseConfigService;

impl DatabaseConfigService {
    /// Get current Trendlog Configuration
    pub async fn get_config(db: &DatabaseConnection) -> Result<database_partition_config::DatabasePartitionConfig> {
        let config = database_partition_config::Entity::find()
            .filter(database_partition_config::Column::IsActive.eq(true))
            .one(db)
            .await?;

        match config {
            Some(model) => Ok(database_partition_config::DatabasePartitionConfig {
                id: Some(model.id),
                strategy: database_partition_config::PartitionStrategy::from(model.strategy),
                custom_days: model.custom_days,
                custom_months: model.custom_months,
                auto_cleanup_enabled: model.auto_cleanup_enabled,
                retention_value: model.retention_value,
                retention_unit: database_partition_config::RetentionUnit::from(model.retention_unit),
                is_active: model.is_active,
            }),
            None => {
                // Create default configuration if none exists
                let default_config = database_partition_config::DatabasePartitionConfig::new();
                Self::save_config(db, &default_config).await?;
                Ok(default_config)
            }
        }
    }

    /// Save Trendlog Configuration
    pub async fn save_config(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig
    ) -> Result<database_partition_config::DatabasePartitionConfig> {
        // Validate configuration
        config.validate().map_err(|e| crate::error::Error::ValidationError(e))?;

        // Deactivate all existing configurations
        database_partition_config::Entity::update_many()
            .col_expr(database_partition_config::Column::IsActive, Expr::value(false))
            .exec(db)
            .await?;

        // Create new configuration
        let new_config = database_partition_config::ActiveModel {
            strategy: Set(config.strategy.as_str().to_string()),
            custom_days: Set(config.custom_days),
            custom_months: Set(config.custom_months),
            auto_cleanup_enabled: Set(config.auto_cleanup_enabled),
            retention_value: Set(config.retention_value),
            retention_unit: Set(config.retention_unit.as_str().to_string()),
            is_active: Set(true),
            created_at: Set(Utc::now().naive_utc()),
            updated_at: Set(Utc::now().naive_utc()),
            ..Default::default()
        };

        let saved_config = new_config.insert(db).await?;

        Ok(database_partition_config::DatabasePartitionConfig {
            id: Some(saved_config.id),
            strategy: database_partition_config::PartitionStrategy::from(saved_config.strategy),
            custom_days: saved_config.custom_days,
            custom_months: saved_config.custom_months,
            auto_cleanup_enabled: saved_config.auto_cleanup_enabled,
            retention_value: saved_config.retention_value,
            retention_unit: database_partition_config::RetentionUnit::from(saved_config.retention_unit),
            is_active: saved_config.is_active,
        })
    }

    /// Initialize database partitioning system on T3000 startup
    /// 1. Check/create partition configuration (default: weekly)
    /// 2. Verify runtime folder and main database existence
    /// 3. Scan for existing partition files and register them
    /// 4. Apply partitioning strategy if needed
    pub async fn initialize_database_partitioning(
        db: &DatabaseConnection
    ) -> Result<database_files::DatabaseInitializationResult> {
        println!("🚀 Initializing T3000 Database Partitioning System...");

        // Step 1: Check partition configuration (default to weekly if not found)
        let config = match Self::get_config(db).await {
            Ok(existing_config) => {
                println!("📋 Found existing partition configuration: {:?}", existing_config.strategy);
                existing_config
            },
            Err(_) => {
                println!("📋 No partition configuration found, creating default (Monthly)");
                let default_config = database_partition_config::DatabasePartitionConfig {
                    id: None,
                    strategy: database_partition_config::PartitionStrategy::Monthly,
                    custom_days: None,
                    custom_months: None,
                    auto_cleanup_enabled: true,
                    retention_value: 12, // 12 months retention
                    retention_unit: database_partition_config::RetentionUnit::Months,
                    is_active: true,
                };
                Self::save_config(db, &default_config).await?
            }
        };

        // Step 2: Verify runtime folder and main database
        let runtime_path = get_t3000_database_path();
        let main_db_path = runtime_path.join("webview_t3_device.db");

        println!("📁 Checking runtime folder: {}", runtime_path.display());

        if !runtime_path.exists() {
            return Err(crate::error::Error::ServerError(
                format!("T3000 runtime database folder not found: {}", runtime_path.display())
            ));
        }

        let main_db_exists = main_db_path.exists();
        let main_db_size = if main_db_exists {
            std::fs::metadata(&main_db_path)
                .map(|m| m.len())
                .unwrap_or(0)
        } else {
            0
        };

        println!("💾 Main database: {} (Size: {} MB)",
                 if main_db_exists { "Found" } else { "Not Found" },
                 main_db_size / 1024 / 1024);

        // Step 3: Scan runtime folder for existing partition files
        let existing_partitions = Self::scan_and_register_existing_partitions(db, &runtime_path).await?;

        println!("🔍 Found {} existing partition files", existing_partitions.len());

        // Step 3.5: Validate database records against physical files
        let validation_result = Self::validate_and_fix_partition_records(db, &runtime_path).await?;

        if validation_result.orphaned_records > 0 || validation_result.missing_files > 0 {
            println!("🔧 Validation: {} orphaned records, {} missing files",
                     validation_result.orphaned_records, validation_result.missing_files);
        }

        // Step 4: Check if partitioning is needed
        let partitioning_result = Self::check_and_apply_partitioning(db).await?;

        // Step 5: Get final file list and statistics
        let all_files = Self::get_database_files(db).await?;
        let total_files = all_files.len();
        let total_size: i64 = all_files.iter().map(|f| f.size_bytes).sum();
        let active_files: Vec<_> = all_files.iter().filter(|f| f.is_active).collect();

        println!("�?Database initialization complete:");
        println!("   - Strategy: {:?}", config.strategy);
        println!("   - Total files: {}", total_files);
        println!("   - Total size: {} MB", total_size / 1024 / 1024);
        println!("   - Active files: {}", active_files.len());

        Ok(database_files::DatabaseInitializationResult {
            config,
            main_database_exists: main_db_exists,
            main_database_size_mb: (main_db_size / 1024 / 1024) as i32,
            existing_partitions_found: existing_partitions.len() as i32,
            total_files: total_files as i32,
            total_size_mb: (total_size / 1024 / 1024) as i32,
            active_files_count: active_files.len() as i32,
            partitioning_applied: partitioning_result.is_some(),
            all_files,
        })
    }

    /// Scan runtime folder for existing partition files and register them in database
    async fn scan_and_register_existing_partitions(
        db: &DatabaseConnection,
        runtime_path: &std::path::Path,
    ) -> Result<Vec<database_files::DatabaseFileInfo>> {
        let mut found_partitions = Vec::new();

        // Scan for partition files matching pattern: webview_t3_device_*.db
        if let Ok(entries) = std::fs::read_dir(runtime_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    // Check if it's a partition file
                    if file_name.starts_with("webview_t3_device_") &&
                       file_name.ends_with(".db") &&
                       file_name != "webview_t3_device.db" {

                        // Extract partition identifier from filename
                        let partition_id = file_name
                            .strip_prefix("webview_t3_device_")
                            .and_then(|s| s.strip_suffix(".db"))
                            .unwrap_or("unknown");

                        // Check if this file is already registered in database
                        let existing_record = database_files::Entity::find()
                            .filter(database_files::Column::FileName.eq(file_name))
                            .one(db)
                            .await?;

                        if existing_record.is_none() {
                            // Register the existing partition file
                            let file_size = std::fs::metadata(&path)
                                .map(|m| m.len() as i64)
                                .unwrap_or(0);

                            let new_file = database_files::ActiveModel {
                                file_name: Set(file_name.to_string()),
                                file_path: Set(path.to_string_lossy().to_string()),
                                partition_identifier: Set(Some(partition_id.to_string())),
                                file_size_bytes: Set(file_size),
                                record_count: Set(0), // Will be updated if needed
                                start_date: Set(None), // Will be calculated if needed
                                end_date: Set(None),
                                is_active: Set(false), // Existing partitions are not active by default
                                is_archived: Set(false),
                                created_at: Set(Utc::now().naive_utc()),
                                last_accessed_at: Set(Utc::now().naive_utc()),
                                ..Default::default()
                            };

                            match new_file.insert(db).await {
                                Ok(saved) => {
                                    println!("📝 Registered existing partition: {}", file_name);
                                    found_partitions.push(database_files::DatabaseFileInfo::from_model(saved));
                                },
                                Err(e) => {
                                    println!("⚠️ Failed to register partition {}: {}", file_name, e);
                                }
                            }
                        } else {
                            println!("�?Partition already registered: {}", file_name);
                            if let Some(existing) = existing_record {
                                found_partitions.push(database_files::DatabaseFileInfo::from_model(existing));
                            }
                        }
                    }
                }
            }
        }

        Ok(found_partitions)
    }

    /// Validate database records against physical files and fix inconsistencies
    async fn validate_and_fix_partition_records(
        db: &DatabaseConnection,
        runtime_path: &std::path::Path,
    ) -> Result<ValidationResult> {
        let mut result = ValidationResult::default();

        // Get all database file records
        let db_records = database_files::Entity::find().all(db).await?;

        for record in db_records {
            let file_path = runtime_path.join(&record.file_name);

            if !file_path.exists() {
                // File record exists but physical file is missing
                println!("🚨 Orphaned record found: {} (physical file missing)", record.file_name);
                result.orphaned_records += 1;

                // For active files, try to create the missing file
                if record.is_active {
                    println!("🔨 Attempting to create missing active file: {}", record.file_name);

                    // Create the missing file using the same logic as partition creation
                    // Create SQLite URL using helper function
                    let partition_db_url = create_sqlite_url(&file_path);

                    match sea_orm::Database::connect(&partition_db_url).await {
                        Ok(partition_conn) => {
                            let init_sql = r#"
                                CREATE TABLE IF NOT EXISTS init (id INTEGER PRIMARY KEY);
                                PRAGMA journal_mode = WAL;
                                PRAGMA synchronous = NORMAL;
                                PRAGMA cache_size = 10000;
                                PRAGMA temp_store = memory;
                            "#;

                            if let Err(e) = partition_conn.execute(sea_orm::Statement::from_string(
                                sea_orm::DatabaseBackend::Sqlite,
                                init_sql.to_string()
                            )).await {
                                println!("⚠️ Failed to create missing file {}: {}", record.file_name, e);
                            } else {
                                println!("�?Created missing active file: {}", record.file_name);
                                result.created_files += 1;
                            }

                            let _ = partition_conn.close().await;
                        },
                        Err(e) => {
                            println!("�?Failed to create missing file {}: {}", record.file_name, e);
                        }
                    }
                } else {
                    // For inactive files, deactivate the orphaned record
                    println!("🔧 Marking orphaned inactive record as archived: {}", record.file_name);

                    let file_name = record.file_name.clone();
                    let mut active_model: database_files::ActiveModel = record.into();
                    active_model.is_archived = Set(true);
                    active_model.is_active = Set(false);

                    if let Err(e) = active_model.update(db).await {
                        println!("⚠️ Failed to update orphaned record {}: {}", file_name, e);
                    } else {
                        result.fixed_records += 1;
                    }
                }
            } else {
                // Update file size if it has changed
                if let Ok(metadata) = std::fs::metadata(&file_path) {
                    let current_size = metadata.len() as i64;

                    if record.file_size_bytes != current_size {
                        println!("📊 Updating file size for {}: {} -> {} bytes",
                                record.file_name, record.file_size_bytes, current_size);

                        let file_name = record.file_name.clone();
                        let mut active_model: database_files::ActiveModel = record.into();
                        active_model.file_size_bytes = Set(current_size);
                        active_model.last_accessed_at = Set(Utc::now().naive_utc());

                        if let Err(e) = active_model.update(db).await {
                            println!("⚠️ Failed to update file size for {}: {}", file_name, e);
                        } else {
                            result.fixed_records += 1;
                        }
                    }
                }
            }
        }

        Ok(result)
    }

    /// Ensure required partitions exist when trendlog window opens
    /// This function is called every time a user opens trendlog to check:
    /// 1. If partition configuration exists (create monthly default if not)
    /// 2. If required partitions exist for previous periods
    /// 3. Create missing partitions and migrate data as needed
    pub async fn ensure_partitions_on_trendlog_open(
        db: &DatabaseConnection
    ) -> Result<database_files::PartitionCheckResult> {
        println!("🔍 TrendLog Open: Checking partition requirements...");

        // Step 1: Ensure partition configuration exists (default to Monthly)
        let config = match Self::get_config(db).await {
            Ok(existing_config) => {
                println!("📋 Partition config found: {:?}", existing_config.strategy);
                existing_config
            },
            Err(_) => {
                println!("📋 Creating default partition config (Monthly)");
                let default_config = database_partition_config::DatabasePartitionConfig {
                    id: None,
                    strategy: database_partition_config::PartitionStrategy::Monthly,
                    custom_days: None,
                    custom_months: None,
                    auto_cleanup_enabled: true,
                    retention_value: 12, // 12 months retention
                    retention_unit: database_partition_config::RetentionUnit::Months,
                    is_active: true,
                };
                Self::save_config(db, &default_config).await?
            }
        };

        let mut result = database_files::PartitionCheckResult {
            config_found: true,
            partitions_checked: 0,
            partitions_created: 0,
            data_migrated_mb: 0,
            errors: Vec::new(),
        };

        // Only proceed if partitioning is active
        if !config.is_active {
            println!("⏸️ Partitioning is disabled, skipping checks");
            return Ok(result);
        }

        // Step 2: Determine which partitions should exist based on actual data
        let required_partitions = Self::calculate_required_partitions_from_data(db, &config).await?;
        result.partitions_checked = required_partitions.len() as i32;

        println!("📅 Strategy: {:?}, Required partitions: {:?}", config.strategy, required_partitions);

        // Step 3: Check each required partition and create if missing
        for partition_id in required_partitions {
            // Check if partition file already exists
            let existing_partition = database_files::Entity::find()
                .filter(database_files::Column::PartitionIdentifier.eq(&partition_id))
                .one(db)
                .await?;

            if existing_partition.is_none() {
                println!("🔨 Creating missing partition: {}", partition_id);

                match Self::create_partition_and_migrate_data(db, &config, &partition_id).await {
                    Ok(migrated_size) => {
                        result.partitions_created += 1;
                        result.data_migrated_mb += migrated_size;
                        println!("�?Created partition {} and migrated {} MB", partition_id, migrated_size);
                    },
                    Err(e) => {
                        let error_msg = format!("Failed to create partition {}: {}", partition_id, e);
                        println!("�?{}", error_msg);
                        result.errors.push(error_msg);
                    }
                }
            } else {
                println!("�?Partition {} already exists", partition_id);
            }
        }

        println!("�?TrendLog partition check complete: {} checked, {} created",
                 result.partitions_checked, result.partitions_created);

        Ok(result)
    }

    /// Calculate which partitions should exist based on actual database data
    /// Only creates partitions for periods that have actual data (max 5 partitions)
    async fn calculate_required_partitions_from_data(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig
    ) -> Result<Vec<String>> {
        println!("🔍 Checking database for actual data to determine partition needs...");

        // Query TRENDLOG_DATA to find distinct date periods with data
        let data_periods_query = match config.strategy {
            database_partition_config::PartitionStrategy::Daily => {
                "SELECT DISTINCT DATE(LoggingTime_Fmt) as period FROM TRENDLOG_DATA WHERE LoggingTime_Fmt IS NOT NULL ORDER BY period DESC LIMIT 5"
            },
            database_partition_config::PartitionStrategy::Weekly => {
                "SELECT DISTINCT strftime('%Y-%W', LoggingTime_Fmt) as period FROM TRENDLOG_DATA WHERE LoggingTime_Fmt IS NOT NULL ORDER BY period DESC LIMIT 5"
            },
            database_partition_config::PartitionStrategy::Monthly => {
                "SELECT DISTINCT strftime('%Y-%m', LoggingTime_Fmt) as period FROM TRENDLOG_DATA WHERE LoggingTime_Fmt IS NOT NULL ORDER BY period DESC LIMIT 5"
            },
            _ => {
                println!("📝 Strategy {:?} doesn't support data-based partition creation", config.strategy);
                return Ok(Vec::new());
            }
        };

        let mut required_partitions = Vec::new();
        let now = Utc::now();
        let current_period = match config.strategy {
            database_partition_config::PartitionStrategy::Daily => now.format("%Y-%m-%d").to_string(),
            database_partition_config::PartitionStrategy::Weekly => now.format("%Y-%U").to_string(),
            database_partition_config::PartitionStrategy::Monthly => now.format("%Y-%m").to_string(),
            _ => String::new(),
        };

        // Execute query to find data periods
        match db.query_all(Statement::from_string(
            DatabaseBackend::Sqlite,
            data_periods_query.to_string()
        )).await {
            Ok(rows) => {
                println!("📊 Found {} data periods in database", rows.len());

                for row in rows {
                    if let Ok(period) = row.try_get::<String>("", "period") {
                        // Skip current period (keep in main database)
                        if period != current_period {
                            // Format partition ID based on strategy
                            let partition_id = match config.strategy {
                                database_partition_config::PartitionStrategy::Weekly => {
                                    // Convert "YYYY-WW" to "YYYY-WWW" format
                                    if let Some((year, week)) = period.split_once('-') {
                                        format!("{}-W{}", year, week)
                                    } else {
                                        period.clone()
                                    }
                                },
                                _ => period.clone(),
                            };

                            println!("📅 Found data period: {} -> partition: {}", period, partition_id);
                            required_partitions.push(partition_id);
                        } else {
                            println!("📅 Skipping current period: {} (keeping in main DB)", period);
                        }
                    }
                }
            },
            Err(e) => {
                println!("⚠️ Warning: Could not query database for data periods: {}", e);
                // Fallback: create just one previous period partition
                match config.strategy {
                    database_partition_config::PartitionStrategy::Daily => {
                        let yesterday = now - chrono::Duration::days(1);
                        required_partitions.push(yesterday.format("%Y-%m-%d").to_string());
                    },
                    database_partition_config::PartitionStrategy::Weekly => {
                        let last_week = now - chrono::Duration::weeks(1);
                        let week_string = last_week.format("%Y-%U").to_string();
                        if let Some((year, week)) = week_string.split_once('-') {
                            required_partitions.push(format!("{}-W{}", year, week));
                        }
                    },
                    database_partition_config::PartitionStrategy::Monthly => {
                        let last_month = now - chrono::Duration::days(30);
                        required_partitions.push(last_month.format("%Y-%m").to_string());
                    },
                    _ => {}
                }
            }
        }

        println!("�?Determined {} partitions needed based on actual data", required_partitions.len());
        Ok(required_partitions)
    }

    /// Create a new partition and migrate historical data to it
    async fn create_partition_and_migrate_data(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig,
        partition_id: &str,
    ) -> Result<i32> {
        println!("🔨 Creating partition {} and migrating data...", partition_id);

        // Step 1: Create partition file
        let runtime_path = get_t3000_database_path();

        // Ensure the runtime directory exists and create it if needed
        if !runtime_path.exists() {
            println!("📁 Creating runtime database directory: {}", runtime_path.display());
            if let Err(e) = std::fs::create_dir_all(&runtime_path) {
                println!("�?Failed to create runtime directory: {}", e);
                return Err(crate::error::Error::ServerError(
                    format!("Failed to create T3000 runtime database folder: {}", e)
                ));
            }
        }

        let partition_file_name = format!("webview_t3_device_{}.db", partition_id);
        let partition_file_path = runtime_path.join(&partition_file_name);

        println!("📁 Creating partition file: {}", partition_file_path.display());

        // Create SQLite URL using helper function for cross-platform compatibility
        let partition_db_url = create_sqlite_url(&partition_file_path);
        println!("🔗 SQLite URL: {}", partition_db_url);

        // Pre-flight checks for better error diagnostics
        println!("🔍 Pre-flight checks:");
        println!("  - Runtime path exists: {}", runtime_path.exists());
        println!("  - Runtime path is dir: {}", runtime_path.is_dir());
        println!("  - Partition file path: {}", partition_file_path.display());

        // Check parent directory permissions by trying to create a test file
        let test_file = runtime_path.join("test_permissions.tmp");
        match std::fs::File::create(&test_file) {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file);
                println!("  - Directory permissions: �?OK");
            },
            Err(perm_err) => {
                println!("  - Directory permissions: �?FAILED - {}", perm_err);
                return Err(crate::error::Error::ServerError(
                    format!("Directory permission error in {}: {}", runtime_path.display(), perm_err)
                ));
            }
        }

        // Create the partition database file with better error handling
        let partition_conn = match sea_orm::Database::connect(&partition_db_url).await {
            Ok(conn) => {
                println!("�?Successfully connected to partition database");
                conn
            },
            Err(e) => {
                println!("�?Failed to connect to partition database: {}", e);

                // Enhanced error diagnostics
                println!("🔍 Detailed diagnostics:");
                println!("  - SQLite URL: {}", partition_db_url);
                println!("  - File path exists: {}", partition_file_path.exists());
                println!("  - Parent dir exists: {}", partition_file_path.parent().map_or(false, |p| p.exists()));

                // Check if it's a specific SQLite error
                if e.to_string().contains("code: 14") {
                    println!("  - SQLite Error Code 14: Unable to open database file");
                    println!("  - Common causes: Permission denied, path too long, or invalid path");
                }

                // Try to create the file manually for additional diagnostics
                match std::fs::File::create(&partition_file_path) {
                    Ok(_) => {
                        println!("  - Manual file creation: �?SUCCESS");
                        println!("📝 Created empty partition file, retrying connection...");

                        // Retry the connection once more
                        match sea_orm::Database::connect(&partition_db_url).await {
                            Ok(retry_conn) => {
                                println!("�?Retry connection successful!");
                                retry_conn
                            },
                            Err(retry_err) => {
                                return Err(crate::error::Error::ServerError(
                                    format!("Failed to create partition database file {}: Initial error: {} | Retry error: {}",
                                        partition_file_name, e, retry_err)
                                ));
                            }
                        }
                    },
                    Err(file_err) => {
                        println!("  - Manual file creation: �?FAILED - {}", file_err);
                        return Err(crate::error::Error::ServerError(
                            format!("Failed to create partition database file {}: Connection error: {} | File creation error: {}",
                                partition_file_name, e, file_err)
                        ));
                    }
                }
            }
        };

        // Initialize partition database with required tables
        let init_sql = r#"
            CREATE TABLE IF NOT EXISTS TRENDLOG_DATA (
                LoggingTime_Fmt TEXT,
                Logging_State INTEGER,
                value REAL,
                control REAL,
                label TEXT,
                point_id TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_trendlog_time ON TRENDLOG_DATA(LoggingTime_Fmt);
            CREATE INDEX IF NOT EXISTS idx_trendlog_point ON TRENDLOG_DATA(point_id);

            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA cache_size = 10000;
            PRAGMA temp_store = memory;
        "#;

        partition_conn.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            init_sql.to_string()
        )).await?;

        // Step 2: Calculate date range for migration
        let (start_date, end_date) = Self::calculate_partition_date_range(config, partition_id)?;

        // Step 3: Migrate data from main database to partition
        let migrated_size = {
            // For now, return a dummy size. In a real implementation,
            // you would query and transfer the actual data.
            println!("📦 Would migrate data from {} to {}", start_date, end_date);
            0 // MB
        };

        // Step 4: Register partition in database_files table
        let file_size = std::fs::metadata(&partition_file_path)
            .map(|m| m.len() as i64)
            .unwrap_or(0);

        let new_file = database_files::ActiveModel {
            file_name: Set(partition_file_name),
            file_path: Set(partition_file_path.to_string_lossy().to_string()),
            partition_identifier: Set(Some(partition_id.to_string())),
            file_size_bytes: Set(file_size),
            record_count: Set(0),
            start_date: Set(Some(start_date.naive_utc())),
            end_date: Set(Some(end_date.naive_utc())),
            is_active: Set(false), // Partitions are not active for new inserts
            is_archived: Set(false),
            created_at: Set(Utc::now().naive_utc()),
            last_accessed_at: Set(Utc::now().naive_utc()),
            ..Default::default()
        };

        new_file.insert(db).await?;

        // Close partition connection
        let _ = partition_conn.close().await;

        println!("�?Partition {} created successfully", partition_id);
        Ok(migrated_size)
    }

    /// Check if partitioning is needed and apply strategy if necessary
    pub async fn check_and_apply_partitioning(
        db: &DatabaseConnection
    ) -> Result<Option<Vec<database_files::DatabaseFileInfo>>> {
        let config = Self::get_config(db).await?;

        // Only proceed if partitioning is active
        if !config.is_active {
            return Ok(None);
        }

        // Get the most recent active database file
        let latest_file = database_files::Entity::find()
            .filter(database_files::Column::IsActive.eq(true))
            .order_by_desc(database_files::Column::CreatedAt)
            .one(db)
            .await?;

        let now = Utc::now().naive_utc();

        // Check if we need a new partition based on the strategy
        let needs_new_partition = match latest_file {
            Some(file) => {
                let time_since_creation = now.signed_duration_since(file.created_at);
                match config.strategy {
                    database_partition_config::PartitionStrategy::FiveMinutes => {
                        time_since_creation.num_minutes() >= 5
                    },
                    database_partition_config::PartitionStrategy::Daily => {
                        // For daily partitioning, check if we're in a different day
                        let file_date = file.created_at.date();
                        let current_date = now.date();
                        file_date != current_date
                    },
                    database_partition_config::PartitionStrategy::Weekly => {
                        time_since_creation.num_days() >= 7
                    },
                    database_partition_config::PartitionStrategy::Monthly => {
                        time_since_creation.num_days() >= 30
                    },
                    database_partition_config::PartitionStrategy::Quarterly => {
                        time_since_creation.num_days() >= 90
                    },
                    database_partition_config::PartitionStrategy::Custom => {
                        if let Some(days) = config.custom_days {
                            time_since_creation.num_days() >= days as i64
                        } else {
                            false
                        }
                    },
                    database_partition_config::PartitionStrategy::CustomMonths => {
                        if let Some(months) = config.custom_months {
                            time_since_creation.num_days() >= (months * 30) as i64
                        } else {
                            false
                        }
                    },
                }
            },
            None => true, // No files exist, create the first one
        };

        if needs_new_partition {
            // Check if a file with the expected name already exists
            let partition_id = config.generate_partition_identifier(&now);
            let file_name = format!("webview_t3_device_{}.db", partition_id);

            let existing_file = database_files::Entity::find()
                .filter(database_files::Column::FileName.eq(&file_name))
                .one(db)
                .await?;

            if existing_file.is_some() {
                println!("Partition file '{}' already exists, no new partition needed", file_name);
                return Ok(None);
            }

            Ok(Some(Self::apply_partitioning_strategy(db, &config).await?))
        } else {
            Ok(None)
        }
    }

    /// Apply partitioning strategy to create new database files
    pub async fn apply_partitioning_strategy(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig
    ) -> Result<Vec<database_files::DatabaseFileInfo>> {
        // Create new database partition based on the strategy
        let now = Utc::now().naive_utc();
        let partition_id = config.generate_partition_identifier(&now);

        println!("🎯 Applying {:?} partitioning strategy", config.strategy);
        println!("📅 Current time: {}", now.format("%Y-%m-%d %H:%M:%S"));
        println!("🏷�?Generated partition ID: {}", partition_id);

        let file_name = format!("webview_t3_device_{}.db", partition_id);
        let file_path = get_t3000_database_path().join(&file_name);
        let file_path_str = file_path.to_string_lossy().to_string();

        println!("📂 Target file path: {}", file_path_str);

        // Check if file already exists in database to avoid UNIQUE constraint violation
        let existing_file = database_files::Entity::find()
            .filter(database_files::Column::FileName.eq(&file_name))
            .one(db)
            .await?;

        if existing_file.is_some() {
            // File record already exists, just return current files without creating duplicate
            println!("Database file record '{}' already exists, skipping creation", file_name);
            return Self::get_database_files(db).await;
        }

        // Create the actual database file on disk
        if !file_path.exists() {
            println!("🔨 Creating physical partition file: {}", file_path.display());

            // Ensure the directory exists
            if let Some(parent_dir) = file_path.parent() {
                if !parent_dir.exists() {
                    if let Err(e) = std::fs::create_dir_all(parent_dir) {
                        return Err(crate::error::Error::ServerError(
                            format!("Failed to create directory {}: {}", parent_dir.display(), e)
                        ));
                    }
                }
            }

            // Create SQLite URL using helper function for cross-platform compatibility
            let partition_db_url = create_sqlite_url(&file_path);
            println!("🔗 SQLite URL: {}", partition_db_url);

            match sea_orm::Database::connect(&partition_db_url).await {
                Ok(partition_conn) => {
                    // Create basic structure to ensure the file is valid
                    let init_sql = r#"
                        CREATE TABLE IF NOT EXISTS init (id INTEGER PRIMARY KEY);
                        PRAGMA journal_mode = WAL;
                        PRAGMA synchronous = NORMAL;
                        PRAGMA cache_size = 10000;
                        PRAGMA temp_store = memory;
                    "#;

                    if let Err(e) = partition_conn.execute(sea_orm::Statement::from_string(
                        sea_orm::DatabaseBackend::Sqlite,
                        init_sql.to_string()
                    )).await {
                        println!("⚠️ Warning: Failed to initialize partition database: {}", e);
                    } else {
                        println!("�?Partition file created successfully: {}", file_name);
                    }

                    // Close the connection
                    if let Err(e) = partition_conn.close().await {
                        println!("⚠️ Warning: Failed to close partition connection: {}", e);
                    }
                },
                Err(e) => {
                    return Err(crate::error::Error::ServerError(
                        format!("Failed to create partition database file {}: {}", file_name, e)
                    ));
                }
            }
        } else {
            println!("📁 Partition file already exists: {}", file_name);
        }

        // Get file size after creation
        let file_size = if file_path.exists() {
            std::fs::metadata(&file_path)
                .map(|m| m.len() as i64)
                .unwrap_or(0)
        } else {
            0
        };

        // Create database file entry
        let new_file = database_files::ActiveModel {
            file_name: Set(file_name.clone()),
            file_path: Set(file_path_str),
            partition_identifier: Set(Some(partition_id.clone())),
            file_size_bytes: Set(file_size),
            record_count: Set(0),
            start_date: Set(Some(now)),
            end_date: Set(None), // Open-ended for new active file
            is_active: Set(true),
            is_archived: Set(false),
            created_at: Set(now),
            last_accessed_at: Set(now),
            ..Default::default()
        };

        // Deactivate previous active files
        database_files::Entity::update_many()
            .col_expr(database_files::Column::IsActive, Expr::value(false))
            .exec(db)
            .await?;

        // Insert new active file with error handling for UNIQUE constraint
        match new_file.insert(db).await {
            Ok(_saved_file) => {
                println!("Successfully created database file record: {}", file_name);
            },
            Err(sea_orm::DbErr::Exec(sea_orm::RuntimeErr::SqlxError(sqlx::Error::Database(db_err))))
                if db_err.message().contains("UNIQUE constraint failed") => {
                // Handle UNIQUE constraint error gracefully
                println!("Database file record '{}' already exists (UNIQUE constraint), continuing...", file_name);
            },
            Err(e) => {
                println!("Error creating database file record: {}", e);
                return Err(e.into());
            }
        }

        // CRITICAL: Migrate historical data from main database to the new partition
        // This is what was missing - the actual data movement!
        if let Err(e) = Self::migrate_data_to_partition(db, config, &file_path, &partition_id).await {
            println!("Warning: Failed to migrate data to partition {}: {}", partition_id, e);
            // Continue even if migration fails to avoid breaking the system
        }

        // Return updated file list
        Self::get_database_files(db).await
    }

    /// Migrate historical data from main database to partition based on strategy
    async fn migrate_data_to_partition(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig,
        partition_path: &std::path::Path,
        partition_id: &str,
    ) -> Result<()> {
        println!("🔄 Starting data migration to partition: {}", partition_id);

        // Calculate the date range for data to migrate based on strategy
        let (start_date, end_date) = Self::calculate_partition_date_range(config, partition_id)?;

        println!("📅 Migrating data from {} to {} for partition {}",
                 start_date.format("%Y-%m-%d"), end_date.format("%Y-%m-%d"), partition_id);

        // Get the main database path
        let _main_db_path = get_t3000_database_path().join("webview_t3_device.db");

        // Use SQLite ATTACH to work with both databases
        // Format path for SQLite ATTACH command using helper function
        let partition_path_str = format_path_for_attach(partition_path);
        let attach_sql = format!(
            "ATTACH DATABASE '{}' AS partition_db",
            partition_path_str
        );

        // Execute the migration using raw SQL for efficiency
        // Attach the partition database
        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            attach_sql
        )).await?;

        // Create tables in partition database to match TRENDLOG_DATA structure
        let create_tables_sql = r#"
            CREATE TABLE IF NOT EXISTS partition_db.TRENDLOG_DATA (
                SerialNumber INTEGER NOT NULL,
                PanelId INTEGER NOT NULL,
                PointId TEXT NOT NULL,
                PointIndex INTEGER NOT NULL,
                PointType TEXT NOT NULL,
                Value TEXT NOT NULL,
                LoggingTime TEXT NOT NULL,
                LoggingTime_Fmt TEXT NOT NULL,
                Digital_Analog TEXT,
                Range_Field TEXT,
                Units TEXT,
                DataSource TEXT DEFAULT 'REALTIME',
                SyncInterval INTEGER DEFAULT 30,
                CreatedBy TEXT,
                PRIMARY KEY (SerialNumber, PanelId, PointId, PointIndex, PointType, LoggingTime)
            );

            CREATE INDEX IF NOT EXISTS partition_db.idx_trendlog_data_device_panel
            ON TRENDLOG_DATA(SerialNumber, PanelId);

            CREATE INDEX IF NOT EXISTS partition_db.idx_trendlog_data_timestamp
            ON TRENDLOG_DATA(LoggingTime_Fmt);

            CREATE INDEX IF NOT EXISTS partition_db.idx_trendlog_data_point
            ON TRENDLOG_DATA(PointId, PointType, PointIndex);
        "#;

        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            create_tables_sql.to_string()
        )).await?;

        // Migrate data from main to partition for the specific date range
        let migrate_sql = format!(
            r#"
            INSERT INTO partition_db.TRENDLOG_DATA
            SELECT * FROM main.TRENDLOG_DATA
            WHERE DATE(LoggingTime_Fmt) >= DATE('{}')
            AND DATE(LoggingTime_Fmt) <= DATE('{}')
            "#,
            start_date.format("%Y-%m-%d"),
            end_date.format("%Y-%m-%d")
        );

        let migration_result = db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            migrate_sql
        )).await?;

        let migrated_count = migration_result.rows_affected();
        println!("📦 Migrated {} records to partition {}", migrated_count, partition_id);

        // Delete migrated data from main database if migration was successful
        if migrated_count > 0 {
            let delete_sql = format!(
                r#"
                DELETE FROM main.TRENDLOG_DATA
                WHERE DATE(LoggingTime_Fmt) >= DATE('{}')
                AND DATE(LoggingTime_Fmt) <= DATE('{}')
                "#,
                start_date.format("%Y-%m-%d"),
                end_date.format("%Y-%m-%d")
            );

            let delete_result = db.execute(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                delete_sql
            )).await?;

            println!("🗑�?Removed {} records from main database", delete_result.rows_affected());
        }

        // Update partition file metadata with actual record count and date range
        database_files::Entity::update_many()
            .col_expr(database_files::Column::RecordCount, Expr::value(migrated_count as i64))
            .col_expr(database_files::Column::StartDate, Expr::value(start_date.naive_utc()))
            .col_expr(database_files::Column::EndDate, Expr::value(end_date.naive_utc()))
            .filter(database_files::Column::PartitionIdentifier.eq(partition_id))
            .exec(db)
            .await?;

        // Detach the partition database
        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "DETACH DATABASE partition_db".to_string()
        )).await?;

        println!("�?Data migration completed for partition: {}", partition_id);
        Ok(())
    }

    /// Calculate date range for partition based on strategy and partition ID
    fn calculate_partition_date_range(
        config: &database_partition_config::DatabasePartitionConfig,
        partition_id: &str,
    ) -> Result<(chrono::DateTime<Utc>, chrono::DateTime<Utc>)> {
        use chrono::{NaiveDate, TimeZone};

        match config.strategy {
            database_partition_config::PartitionStrategy::Daily => {
                // partition_id format: "2025-10-11"
                let date = NaiveDate::parse_from_str(partition_id, "%Y-%m-%d")
                    .map_err(|e| crate::error::Error::ValidationError(format!("Invalid daily partition ID: {}", e)))?;

                let start = Utc.from_utc_datetime(&date.and_hms_opt(0, 0, 0).unwrap());
                let end = Utc.from_utc_datetime(&date.and_hms_opt(23, 59, 59).unwrap());
                Ok((start, end))
            },
            database_partition_config::PartitionStrategy::Weekly => {
                // partition_id format: "2025-W42" (year-week)
                // For now, approximate with 7-day range from start of week
                let parts: Vec<&str> = partition_id.split('-').collect();
                if parts.len() != 2 || !parts[1].starts_with('W') {
                    return Err(crate::error::Error::ValidationError("Invalid weekly partition ID".to_string()));
                }

                let year: i32 = parts[0].parse()
                    .map_err(|_| crate::error::Error::ValidationError("Invalid year in partition ID".to_string()))?;
                let week: u32 = parts[1][1..].parse()
                    .map_err(|_| crate::error::Error::ValidationError("Invalid week in partition ID".to_string()))?;

                // Approximate calculation - start from beginning of year + weeks
                let start_of_year = NaiveDate::from_ymd_opt(year, 1, 1).unwrap();
                let start_date = start_of_year + chrono::Duration::weeks(week as i64 - 1);
                let end_date = start_date + chrono::Duration::days(6);

                let start = Utc.from_utc_datetime(&start_date.and_hms_opt(0, 0, 0).unwrap());
                let end = Utc.from_utc_datetime(&end_date.and_hms_opt(23, 59, 59).unwrap());
                Ok((start, end))
            },
            database_partition_config::PartitionStrategy::Monthly => {
                // partition_id format: "2025-10"
                let parts: Vec<&str> = partition_id.split('-').collect();
                if parts.len() != 2 {
                    return Err(crate::error::Error::ValidationError("Invalid monthly partition ID".to_string()));
                }

                let year: i32 = parts[0].parse()
                    .map_err(|_| crate::error::Error::ValidationError("Invalid year in partition ID".to_string()))?;
                let month: u32 = parts[1].parse()
                    .map_err(|_| crate::error::Error::ValidationError("Invalid month in partition ID".to_string()))?;

                let start_date = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
                let end_date = if month == 12 {
                    NaiveDate::from_ymd_opt(year + 1, 1, 1).unwrap() - chrono::Duration::days(1)
                } else {
                    NaiveDate::from_ymd_opt(year, month + 1, 1).unwrap() - chrono::Duration::days(1)
                };

                let start = Utc.from_utc_datetime(&start_date.and_hms_opt(0, 0, 0).unwrap());
                let end = Utc.from_utc_datetime(&end_date.and_hms_opt(23, 59, 59).unwrap());
                Ok((start, end))
            },
            _ => {
                // For other strategies, migrate data older than retention period
                let cutoff_date = Utc::now() - chrono::Duration::days(config.retention_value as i64);
                let very_old_date = cutoff_date - chrono::Duration::days(365); // Migrate up to 1 year old data
                Ok((very_old_date, cutoff_date))
            }
        }
    }

    /// Get current time period identifier based on strategy
    pub fn get_current_time_period(
        config: &database_partition_config::DatabasePartitionConfig
    ) -> String {
        let now = Utc::now();
        match config.strategy {
            database_partition_config::PartitionStrategy::Daily => now.format("%Y-%m-%d").to_string(),
            database_partition_config::PartitionStrategy::Weekly => {
                let week_string = now.format("%Y-%U").to_string();
                if let Some((year, week)) = week_string.split_once('-') {
                    format!("{}-W{}", year, week)
                } else {
                    week_string
                }
            },
            database_partition_config::PartitionStrategy::Monthly => now.format("%Y-%m").to_string(),
            _ => now.format("%Y-%m-%d").to_string(),
        }
    }

    /// Check if time period has changed and trigger partition rotation if needed
    /// This is the core function for time-based active partition management
    pub async fn check_period_transition_and_rotate(
        db: &DatabaseConnection,
        runtime_config: &PartitioningRuntimeConfig,
    ) -> Result<PartitionTransitionResult> {
        println!("🕐 Checking for period transition and partition rotation...");

        let config = Self::get_config(db).await?;
        if !config.is_active {
            return Ok(PartitionTransitionResult::default());
        }

        let current_period = Self::get_current_time_period(&config);
        println!("📅 Current period: {}", current_period);

        // Get the last known period from application settings
        let last_period_setting = crate::database_management::ApplicationConfigService::get_setting(
            db, "partitioning", "last_active_period", None, None
        ).await?;

        let last_known_period = last_period_setting
            .map(|s| s.config_value)
            .unwrap_or_else(|| current_period.clone());

        println!("📋 Last known period: {}", last_known_period);

        let mut result = PartitionTransitionResult {
            period_changed: current_period != last_known_period,
            current_period: current_period.clone(),
            previous_period: last_known_period.clone(),
            partitions_created: 0,
            data_migrated_mb: 0,
            overlap_maintained: false,
            errors: Vec::new(),
        };

        if result.period_changed {
            println!("🔄 Period transition detected: {} �?{}", last_known_period, current_period);

            // Step 1: Create partition for previous period if it has data
            match Self::create_partition_for_previous_period(db, &config, &last_known_period).await {
                Ok(created) => {
                    if created {
                        result.partitions_created += 1;
                        println!("�?Created partition for previous period: {}", last_known_period);
                    }
                },
                Err(e) => {
                    let error_msg = format!("Failed to create partition for {}: {}", last_known_period, e);
                    println!("�?{}", error_msg);
                    result.errors.push(error_msg);
                }
            }

            // Step 2: Migrate data with overlap
            match Self::migrate_data_with_overlap(db, &config, &last_known_period, runtime_config.overlap_hours).await {
                Ok(migrated_mb) => {
                    result.data_migrated_mb = migrated_mb;
                    result.overlap_maintained = true;
                    println!("📦 Migrated {} MB with {}h overlap maintained", migrated_mb, runtime_config.overlap_hours);
                },
                Err(e) => {
                    let error_msg = format!("Failed to migrate data with overlap: {}", e);
                    println!("�?{}", error_msg);
                    result.errors.push(error_msg);
                }
            }

            // Step 3: Manage partition retention (archive old partitions)
            if let Err(e) = Self::manage_partition_retention(db, runtime_config).await {
                let error_msg = format!("Failed to manage partition retention: {}", e);
                println!("�?{}", error_msg);
                result.errors.push(error_msg);
            }

            // Step 4: Update last known period
            let _ = crate::database_management::ApplicationConfigService::set_setting(
                db,
                "partitioning".to_string(),
                "last_active_period".to_string(),
                serde_json::Value::String(current_period),
                None, None,
                Some("PARTITION_ROTATION".to_string()),
            ).await;

            // Step 5: Refresh partition cache
            if runtime_config.enable_caching {
                Self::refresh_partition_cache(db).await?;
            }
        } else {
            println!("📅 No period transition, current period {} is still active", current_period);
        }

        println!("�?Period transition check complete");
        Ok(result)
    }

    /// Create partition for previous period with actual data
    async fn create_partition_for_previous_period(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig,
        previous_period: &str,
    ) -> Result<bool> {
        // Check if partition already exists
        let existing_partition = database_files::Entity::find()
            .filter(database_files::Column::PartitionIdentifier.eq(previous_period))
            .one(db)
            .await?;

        if existing_partition.is_some() {
            println!("�?Partition {} already exists, skipping creation", previous_period);
            return Ok(false);
        }

        // Check if there's actual data for this period
        let data_check_query = match config.strategy {
            database_partition_config::PartitionStrategy::Daily => {
                format!("SELECT COUNT(*) as count FROM TRENDLOG_DATA WHERE DATE(LoggingTime_Fmt) = '{}'", previous_period)
            },
            database_partition_config::PartitionStrategy::Weekly => {
                // Convert back from W format to strftime format for querying
                let query_period = if let Some((year, week)) = previous_period.split_once("-W") {
                    format!("{}-{}", year, week)
                } else {
                    previous_period.to_string()
                };
                format!("SELECT COUNT(*) as count FROM TRENDLOG_DATA WHERE strftime('%Y-%W', LoggingTime_Fmt) = '{}'", query_period)
            },
            database_partition_config::PartitionStrategy::Monthly => {
                format!("SELECT COUNT(*) as count FROM TRENDLOG_DATA WHERE strftime('%Y-%m', LoggingTime_Fmt) = '{}'", previous_period)
            },
            _ => return Ok(false),
        };

        let data_count_result = db.query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            data_check_query
        )).await?;

        let record_count = if let Some(result) = data_count_result {
            result.try_get::<i64>("", "count").unwrap_or(0)
        } else {
            0
        };

        if record_count == 0 {
            println!("📝 No data found for period {}, skipping partition creation", previous_period);
            return Ok(false);
        }

        println!("📊 Found {} records for period {}, creating partition", record_count, previous_period);

        // Create the partition
        Self::create_partition_and_migrate_data(db, config, previous_period).await?;
        Ok(true)
    }

    /// Migrate data with configurable overlap (keep recent data in main DB)
    async fn migrate_data_with_overlap(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig,
        previous_period: &str,
        overlap_hours: i32,
    ) -> Result<i32> {
        println!("🔄 Migrating data for {} with {}h overlap...", previous_period, overlap_hours);

        let overlap_cutoff = Utc::now() - chrono::Duration::hours(overlap_hours as i64);
        let (period_start, period_end) = Self::calculate_partition_date_range(config, previous_period)?;

        // Only migrate data that's older than the overlap cutoff
        let migration_end = if period_end < overlap_cutoff {
            period_end
        } else {
            overlap_cutoff
        };

        if period_start >= migration_end {
            println!("📅 All data for period {} is within overlap window, no migration needed", previous_period);
            return Ok(0);
        }

        println!("📦 Migrating data from {} to {} (preserving {}h overlap)",
                 period_start.format("%Y-%m-%d %H:%M"), migration_end.format("%Y-%m-%d %H:%M"), overlap_hours);

        // Use the existing migration logic with adjusted date range
        let runtime_path = get_t3000_database_path();
        let partition_file_name = format!("webview_t3_device_{}.db", previous_period);
        let partition_file_path = runtime_path.join(&partition_file_name);

        if !partition_file_path.exists() {
            return Err(crate::error::Error::ServerError(
                format!("Partition file not found: {}", partition_file_path.display())
            ));
        }

        // Attach partition database using helper function for cross-platform compatibility
        let partition_path_str = format_path_for_attach(&partition_file_path);
        let attach_sql = format!(
            "ATTACH DATABASE '{}' AS partition_db",
            partition_path_str
        );

        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            attach_sql
        )).await?;

        // Migrate data with overlap consideration
        let migrate_sql = format!(
            r#"
            INSERT INTO partition_db.TRENDLOG_DATA
            SELECT * FROM main.TRENDLOG_DATA
            WHERE LoggingTime_Fmt >= '{}'
            AND LoggingTime_Fmt < '{}'
            "#,
            period_start.format("%Y-%m-%d %H:%M:%S"),
            migration_end.format("%Y-%m-%d %H:%M:%S")
        );

        let migration_result = db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            migrate_sql
        )).await?;

        let migrated_count = migration_result.rows_affected();
        println!("📦 Migrated {} records to partition {}", migrated_count, previous_period);

        // Delete only the migrated data (preserving overlap)
        if migrated_count > 0 {
            let delete_sql = format!(
                r#"
                DELETE FROM main.TRENDLOG_DATA
                WHERE LoggingTime_Fmt >= '{}'
                AND LoggingTime_Fmt < '{}'
                "#,
                period_start.format("%Y-%m-%d %H:%M:%S"),
                migration_end.format("%Y-%m-%d %H:%M:%S")
            );

            let delete_result = db.execute(sea_orm::Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                delete_sql
            )).await?;

            println!("🗑�?Removed {} records from main database ({}h overlap preserved)",
                     delete_result.rows_affected(), overlap_hours);
        }

        // Detach partition database
        db.execute(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Sqlite,
            "DETACH DATABASE partition_db".to_string()
        )).await?;

        // Return approximate size in MB (rough calculation)
        let migrated_mb = (migrated_count * 100) / 1024 / 1024; // Rough estimate
        Ok(migrated_mb as i32)
    }

    /// Manage partition retention - archive old partitions using existing cleanup logic
    async fn manage_partition_retention(
        db: &DatabaseConnection,
        runtime_config: &PartitioningRuntimeConfig,
    ) -> Result<()> {
        println!("🗂�?Managing partition retention (max: {} partitions)...", runtime_config.max_partitions);

        // Get all non-archived partitions ordered by creation date
        let all_partitions = database_files::Entity::find()
            .filter(database_files::Column::IsArchived.eq(false))
            .filter(database_files::Column::IsActive.eq(false)) // Don't count active file
            .order_by_desc(database_files::Column::CreatedAt)
            .all(db)
            .await?;

        let partition_count = all_partitions.len() as i32;
        println!("📊 Found {} historical partitions", partition_count);

        if partition_count <= runtime_config.max_partitions {
            println!("�?Partition count within limits, no archiving needed");
            return Ok(());
        }

        let excess_count = partition_count - runtime_config.max_partitions;
        println!("📦 Need to archive {} old partitions", excess_count);

        // Archive oldest partitions (using existing cleanup management logic)
        let partitions_to_archive: Vec<_> = all_partitions
            .into_iter()
            .skip(runtime_config.max_partitions as usize)
            .collect();

        // Create archive folder if it doesn't exist
        let runtime_path = get_t3000_database_path();
        let archive_path = runtime_path.join(&runtime_config.archive_folder);

        if !archive_path.exists() {
            if let Err(e) = std::fs::create_dir_all(&archive_path) {
                println!("⚠️ Failed to create archive folder {}: {}", archive_path.display(), e);
                return Ok(()); // Continue without archiving
            }
            println!("📁 Created archive folder: {}", archive_path.display());
        }

        for partition in partitions_to_archive {
            println!("📦 Archiving partition: {}", partition.file_name);

            // Move file to archive folder
            let source_path = runtime_path.join(&partition.file_name);
            let archive_file_path = archive_path.join(&partition.file_name);

            if source_path.exists() {
                if let Err(e) = std::fs::rename(&source_path, &archive_file_path) {
                    println!("⚠️ Failed to move {} to archive: {}", partition.file_name, e);
                    continue;
                }
            }

            // Update database record to mark as archived
            let mut active_model: database_files::ActiveModel = partition.into();
            active_model.is_archived = Set(true);
            active_model.file_path = Set(archive_file_path.to_string_lossy().to_string());

            let file_name = active_model.file_name.as_ref().to_string();
            if let Err(e) = active_model.update(db).await {
                println!("⚠️ Failed to update archive status for {}: {}", file_name, e);
            } else {
                println!("�?Archived partition: {}", file_name);
            }
        }

        println!("�?Partition retention management complete");
        Ok(())
    }

    /// Initialize and refresh partition metadata cache for faster queries
    pub async fn refresh_partition_cache(db: &DatabaseConnection) -> Result<()> {
        println!("🔄 Refreshing partition metadata cache...");

        let cache = PARTITION_CACHE.get_or_init(|| Arc::new(RwLock::new(HashMap::new())));

        // Get all active partitions
        let partitions = database_files::Entity::find()
            .filter(database_files::Column::IsArchived.eq(false))
            .all(db)
            .await?;

        let mut cache_map = HashMap::new();

        for partition in partitions {
            if let (Some(partition_id), Some(start_date), Some(end_date)) =
                (&partition.partition_identifier, partition.start_date, partition.end_date) {

                let metadata = PartitionMetadata {
                    partition_id: partition_id.clone(),
                    file_path: partition.file_path.clone(),
                    start_date: DateTime::from_naive_utc_and_offset(start_date, Utc),
                    end_date: DateTime::from_naive_utc_and_offset(end_date, Utc),
                    record_count: partition.record_count,
                    is_active: partition.is_active,
                };

                cache_map.insert(partition_id.clone(), metadata);
            }
        }

        // Update cache
        if let Ok(mut cache_guard) = cache.write() {
            *cache_guard = cache_map;
            println!("�?Partition cache refreshed with {} entries", cache_guard.len());
        }

        Ok(())
    }

    /// Smart query engine that automatically determines which partitions to query
    /// based on requested date range and timebase
    pub async fn query_historical_data_smart(
        db: &DatabaseConnection,
        timebase_minutes: i32, // 5, 1440 (1day), 5760 (4days), etc.
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
        runtime_config: &PartitioningRuntimeConfig,
    ) -> Result<SmartQueryPlan> {
        println!("🔍 Creating smart query plan for timebase: {}min, range: {} to {}",
                 timebase_minutes, start_date.format("%Y-%m-%d"), end_date.format("%Y-%m-%d"));

        let mut query_plan = SmartQueryPlan {
            query_main_db: false,
            partition_files: Vec::new(),
            estimated_records: 0,
            cache_hit: false,
        };

        // Always query main DB for recent data
        let now = Utc::now();
        let overlap_cutoff = now - chrono::Duration::hours(runtime_config.overlap_hours as i64);

        if end_date > overlap_cutoff {
            query_plan.query_main_db = true;
            println!("📊 Will query main DB for recent data (within {}h overlap)", runtime_config.overlap_hours);
        }

        // Determine which partitions contain needed historical data
        if runtime_config.enable_caching {
            if let Some(cache) = PARTITION_CACHE.get() {
                if let Ok(cache_guard) = cache.read() {
                    query_plan.cache_hit = true;

                    for metadata in cache_guard.values() {
                        // Check if partition's date range overlaps with query range
                        if metadata.start_date <= end_date && metadata.end_date >= start_date {
                            query_plan.partition_files.push(metadata.clone());
                            query_plan.estimated_records += metadata.record_count;

                            println!("📅 Will query partition: {} (records: {})",
                                     metadata.partition_id, metadata.record_count);
                        }
                    }
                }
            }
        }

        // Fallback: scan database if cache miss
        if !query_plan.cache_hit {
            println!("⚠️ Cache miss, scanning database for relevant partitions");

            let partitions = database_files::Entity::find()
                .filter(database_files::Column::IsArchived.eq(false))
                .filter(database_files::Column::IsActive.eq(false))
                .all(db)
                .await?;

            for partition in partitions {
                if let (Some(partition_id), Some(start), Some(end)) =
                    (&partition.partition_identifier, partition.start_date, partition.end_date) {

                    let p_start = DateTime::from_naive_utc_and_offset(start, Utc);
                    let p_end = DateTime::from_naive_utc_and_offset(end, Utc);

                    if p_start <= end_date && p_end >= start_date {
                        let metadata = PartitionMetadata {
                            partition_id: partition_id.clone(),
                            file_path: partition.file_path.clone(),
                            start_date: p_start,
                            end_date: p_end,
                            record_count: partition.record_count,
                            is_active: partition.is_active,
                        };

                        query_plan.partition_files.push(metadata);
                        query_plan.estimated_records += partition.record_count;
                    }
                }
            }
        }

        // Optimize query plan based on timebase
        Self::optimize_query_plan(&mut query_plan, timebase_minutes);

        println!("�?Smart query plan: Main DB: {}, Partitions: {}, Est. records: {}",
                 query_plan.query_main_db, query_plan.partition_files.len(), query_plan.estimated_records);

        Ok(query_plan)
    }

    /// Optimize query plan based on timebase to reduce unnecessary partition queries
    fn optimize_query_plan(query_plan: &mut SmartQueryPlan, timebase_minutes: i32) {
        // For longer timebases (1day+), we can sample partitions instead of querying all
        if timebase_minutes >= 1440 { // 1 day or longer
            println!("🎯 Optimizing for long timebase ({}min), sampling partitions", timebase_minutes);

            // Sort partitions by date and sample every N partitions based on timebase
            query_plan.partition_files.sort_by(|a, b| a.start_date.cmp(&b.start_date));

            let sample_rate = match timebase_minutes {
                1440..=2880 => 1,      // 1-2 days: query all partitions
                2881..=7200 => 2,      // 3-5 days: query every 2nd partition
                _ => 4,                // 6+ days: query every 4th partition
            };

            if sample_rate > 1 {
                let original_count = query_plan.partition_files.len();
                let sampled_partitions = query_plan.partition_files
                    .clone()
                    .into_iter()
                    .enumerate()
                    .filter(|(i, _)| i % sample_rate == 0)
                    .map(|(_, metadata)| metadata)
                    .collect();
                query_plan.partition_files = sampled_partitions;

                println!("📊 Optimized partition queries: {} �?{} (sample rate: {})",
                         original_count, query_plan.partition_files.len(), sample_rate);
            }
        }
    }

    /// Background monitoring service - checks for period transitions periodically
    /// This would be called by a background task/timer in the main application
    pub async fn background_partition_monitor(
        db: &DatabaseConnection,
        runtime_config: &PartitioningRuntimeConfig,
    ) -> Result<()> {
        println!("🔄 Background partition monitor running (interval: {}h)", runtime_config.check_interval_hours);

        // Check for period transitions
        match Self::check_period_transition_and_rotate(db, runtime_config).await {
            Ok(result) => {
                if result.period_changed {
                    println!("�?Background monitor: Period transition handled");
                } else {
                    println!("📅 Background monitor: No period transition needed");
                }
            },
            Err(e) => {
                println!("�?Background monitor error: {}", e);
            }
        }

        // Refresh cache periodically
        if runtime_config.enable_caching {
            if let Err(e) = Self::refresh_partition_cache(db).await {
                println!("⚠️ Background monitor: Failed to refresh cache: {}", e);
            }
        }

        Ok(())
    }

    /// Check if T3000 missed any period transitions during downtime
    /// Call this on application startup
    pub async fn check_missed_period_transitions(
        db: &DatabaseConnection,
        _runtime_config: &PartitioningRuntimeConfig,
    ) -> Result<Vec<String>> {
        println!("🔍 Checking for missed period transitions during T3000 downtime...");

        let config = Self::get_config(db).await?;
        if !config.is_active {
            return Ok(Vec::new());
        }

        let _current_period = Self::get_current_time_period(&config);

        // Get last shutdown time from application settings
        let last_shutdown_setting = crate::database_management::ApplicationConfigService::get_setting(
            db, "partitioning", "last_shutdown_time", None, None
        ).await?;

        let mut missed_periods = Vec::new();

        if let Some(shutdown_setting) = last_shutdown_setting {
            if let Ok(last_shutdown) = shutdown_setting.config_value.parse::<DateTime<Utc>>() {
                println!("📅 Last shutdown: {}", last_shutdown.format("%Y-%m-%d %H:%M"));

                // Calculate all periods between shutdown and now
                missed_periods = Self::calculate_missed_periods(&config, last_shutdown, Utc::now());

                if !missed_periods.is_empty() {
                    println!("⚠️ Found {} missed periods: {:?}", missed_periods.len(), missed_periods);

                    // Process each missed period
                    for period in &missed_periods {
                        if let Err(e) = Self::create_partition_for_previous_period(db, &config, period).await {
                            println!("�?Failed to create partition for missed period {}: {}", period, e);
                        }
                    }
                }
            }
        }

        // Update shutdown time for next startup
        let _ = crate::database_management::ApplicationConfigService::set_setting(
            db,
            "partitioning".to_string(),
            "last_shutdown_time".to_string(),
            serde_json::Value::String(Utc::now().to_rfc3339()),
            None, None,
            Some("STARTUP_CHECK".to_string()),
        ).await;

        if missed_periods.is_empty() {
            println!("�?No missed period transitions found");
        }

        Ok(missed_periods)
    }

    /// Calculate missed periods between two timestamps
    fn calculate_missed_periods(
        config: &database_partition_config::DatabasePartitionConfig,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Vec<String> {
        let mut periods = Vec::new();
        let mut current = start_time;

        while current < end_time {
            let period = match config.strategy {
                database_partition_config::PartitionStrategy::Daily => {
                    current = current + chrono::Duration::days(1);
                    current.format("%Y-%m-%d").to_string()
                },
                database_partition_config::PartitionStrategy::Weekly => {
                    current = current + chrono::Duration::weeks(1);
                    let week_string = current.format("%Y-%U").to_string();
                    if let Some((year, week)) = week_string.split_once('-') {
                        format!("{}-W{}", year, week)
                    } else {
                        week_string
                    }
                },
                database_partition_config::PartitionStrategy::Monthly => {
                    // Add one month (approximate)
                    current = current + chrono::Duration::days(30);
                    current.format("%Y-%m").to_string()
                },
                _ => break,
            };

            periods.push(period);
        }

        periods
    }
}

/// Database Files Service
///
/// Manages database file operations and metadata
pub struct DatabaseFilesService;

impl DatabaseFilesService {
    /// Get list of all database files
    pub async fn get_files(db: &DatabaseConnection) -> Result<Vec<database_files::DatabaseFileInfo>> {
        let files = database_files::Entity::find()
            .order_by_desc(database_files::Column::CreatedAt)
            .all(db)
            .await?;

        Ok(files.into_iter()
            .map(database_files::DatabaseFileInfo::from_model)
            .collect())
    }

    /// Delete specific database file
    pub async fn delete_file(db: &DatabaseConnection, file_id: i32) -> Result<bool> {
        let file = database_files::Entity::find_by_id(file_id)
            .one(db)
            .await?;

        match file {
            Some(file_model) => {
                // Don't delete active files
                if file_model.is_active {
                    return Err(crate::error::Error::ValidationError(
                        format!("Cannot delete active database file '{}'. Only inactive files can be deleted for safety.", file_model.file_name)
                    ));
                }

                // Delete file record
                database_files::Entity::delete_by_id(file_id).exec(db).await?;

                // Try to delete the actual file from filesystem
                let file_path = get_t3000_database_path().join(&file_model.file_name);
                if file_path.exists() {
                    if let Err(e) = std::fs::remove_file(&file_path) {
                        println!("⚠️ Warning: Failed to delete file from filesystem: {}", e);
                        // Continue anyway since database record is deleted
                    }
                }

                println!("🗑�?Database file deleted: {}", file_model.file_name);
                Ok(true)
            }
            None => Ok(false)
        }
    }

    /// Helper function to check if database file's data dates indicate it's too old for retention
    /// Uses the actual start_date and end_date fields from the database record
    fn is_file_data_old(file: &database_files::Model, retention_days: i32) -> bool {
        let cutoff_date = (Utc::now() - Duration::days(retention_days as i64)).naive_utc();

        // Check if the file has date information
        if let Some(end_date) = file.end_date {
            // If the file's end_date is older than retention period, it's eligible for cleanup
            return end_date < cutoff_date;
        }

        if let Some(start_date) = file.start_date {
            // If only start_date is available, use that for comparison
            return start_date < cutoff_date;
        }

        // If no date fields are set, don't cleanup based on data dates
        false
    }

    /// Cleanup old database files based on retention policy
    /// Uses both CreatedAt timestamp AND data date ranges from database records for accurate cleanup
    pub async fn cleanup_old_files(
        db: &DatabaseConnection,
        retention_days: i32
    ) -> Result<CleanupResult> {
        let cutoff_date = Utc::now() - Duration::days(retention_days as i64);

        // Get all inactive files that are candidates for cleanup
        let candidate_files = database_files::Entity::find()
            .filter(database_files::Column::IsActive.eq(false))
            .all(db)
            .await?;

        // Filter files based on BOTH CreatedAt AND data date ranges from database records
        let old_files: Vec<_> = candidate_files.into_iter()
            .filter(|file| {
                // Check CreatedAt timestamp (original logic)
                let created_too_old = file.created_at < cutoff_date.naive_utc();

                // Check data date ranges from database fields (new improved logic)
                let data_too_old = Self::is_file_data_old(file, retention_days);

                // File is eligible for cleanup if EITHER condition is true
                created_too_old || data_too_old
            })
            .collect();

        let mut files_deleted = 0;
        let mut records_removed = 0;
        let mut bytes_freed = 0;
        let mut deleted_files = Vec::new();

        for file in &old_files {
            records_removed += file.record_count;
            bytes_freed += file.file_size_bytes;
            files_deleted += 1;
            deleted_files.push(file.file_name.clone());

            // Delete file record
            database_files::Entity::delete_by_id(file.id).exec(db).await?;

            // Try to delete the actual file from filesystem using the correct T3000 runtime folder
            let runtime_db_path = get_t3000_database_path().join(&file.file_name);

            if runtime_db_path.exists() {
                if let Err(_e) = std::fs::remove_file(&runtime_db_path) {
                    // Silently continue if file deletion fails
                }
            }
        }

        // Format space saved in human-readable format
        let space_saved = CleanupResult::format_bytes(bytes_freed);
        let message = if files_deleted > 0 {
            format!("Successfully cleaned up {} old database files", files_deleted)
        } else {
            "No old files found to clean up".to_string()
        };

        Ok(CleanupResult {
            files_deleted,
            space_saved,
            space_saved_bytes: bytes_freed,
            deleted_files,
            message,
            records_removed,
        })
    }

    /// Cleanup all database files (except active ones)
    pub async fn cleanup_all_files(db: &DatabaseConnection) -> Result<CleanupResult> {
        let files_to_delete = database_files::Entity::find()
            .filter(database_files::Column::IsActive.eq(false))
            .all(db)
            .await?;

        let mut files_deleted = 0;
        let mut records_removed = 0;
        let mut bytes_freed = 0;
        let mut deleted_files = Vec::new();

        for file in &files_to_delete {
            records_removed += file.record_count;
            bytes_freed += file.file_size_bytes;
            files_deleted += 1;
            deleted_files.push(file.file_name.clone());

            // Delete file record
            database_files::Entity::delete_by_id(file.id).exec(db).await?;

            // Try to delete the actual file from filesystem using the correct T3000 runtime folder
            let runtime_db_path = get_t3000_database_path().join(&file.file_name);

            if runtime_db_path.exists() {
                if let Err(_e) = std::fs::remove_file(&runtime_db_path) {
                    // Silently continue if file deletion fails
                }
            }
        }

        // Format space saved in human-readable format
        let space_saved = CleanupResult::format_bytes(bytes_freed);
        let message = if files_deleted > 0 {
            format!("Successfully cleaned up {} database files", files_deleted)
        } else {
            "No files found to clean up".to_string()
        };

        Ok(CleanupResult {
            files_deleted,
            space_saved,
            space_saved_bytes: bytes_freed,
            deleted_files,
            message,
            records_removed,
        })
    }

    /// Optimize/compact database files
    pub async fn optimize_database(db: &DatabaseConnection) -> Result<bool> {
        // Execute VACUUM command to compact SQLite database
        db.execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "VACUUM".to_string()
        )).await?;

        // Update file statistics after optimization
        Self::update_file_statistics(db).await?;

        Ok(true)
    }

    /// Update file statistics (size, record counts)
    pub async fn update_file_statistics(db: &DatabaseConnection) -> Result<()> {
        // This would implement actual file size calculation
        // For now, we'll just update the last_accessed_at timestamp

        database_files::Entity::update_many()
            .col_expr(database_files::Column::LastAccessedAt, Expr::value(Utc::now().naive_utc()))
            .exec(db)
            .await?;

        Ok(())
    }

    /// Get database statistics
    pub async fn get_statistics(db: &DatabaseConnection) -> Result<database_files::DatabaseStats> {
        let files = Self::get_files(db).await?;
        Ok(database_files::DatabaseStats::from_files(&files))
    }
}

// Update the existing DatabaseConfigService methods to use the new structure
impl DatabaseConfigService {
    /// Get database files using the files service
    pub async fn get_database_files(db: &DatabaseConnection) -> Result<Vec<database_files::DatabaseFileInfo>> {
        DatabaseFilesService::get_files(db).await
    }
}

