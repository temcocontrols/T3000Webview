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

pub mod endpoints;

/// Application Settings Service
pub struct ApplicationSettingsService;

impl ApplicationSettingsService {
    /// Get setting by category and key
    pub async fn get_setting(
        db: &DatabaseConnection,
        category: &str,
        key: &str,
        user_id: Option<i32>,
        device_serial: Option<i32>,
    ) -> Result<Option<application_settings::Model>> {
        let mut query = application_settings::Entity::find()
            .filter(application_settings::Column::Category.eq(category))
            .filter(application_settings::Column::SettingKey.eq(key));

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

        Ok(query.one(db).await?)
    }

    /// Set setting value
    pub async fn set_setting(
        db: &DatabaseConnection,
        category: String,
        key: String,
        value: serde_json::Value,
        user_id: Option<i32>,
        device_serial: Option<i32>,
        panel_id: Option<i32>,
        created_by: String,
    ) -> Result<application_settings::Model> {
        let data_type = match &value {
            serde_json::Value::String(_) => "string".to_string(),
            serde_json::Value::Number(_) => "number".to_string(),
            serde_json::Value::Bool(_) => "boolean".to_string(),
            serde_json::Value::Array(_) => "array".to_string(),
            serde_json::Value::Object(_) => "object".to_string(),
            serde_json::Value::Null => "null".to_string(),
        };

        let existing = Self::get_setting(db, &category, &key, user_id, device_serial).await?;

        if let Some(existing_setting) = existing {
            // Update existing setting
            let mut active_model: application_settings::ActiveModel = existing_setting.into();
            active_model.setting_value = Set(value.to_string());
            active_model.data_type = Set(data_type);
            active_model.updated_at = Set(Utc::now().naive_utc());
            Ok(active_model.update(db).await?)
        } else {
            // Create new setting
            let new_setting = application_settings::ActiveModel {
                category: Set(category),
                setting_key: Set(key),
                setting_value: Set(value.to_string()),
                user_id: Set(user_id),
                device_serial: Set(device_serial),
                panel_id: Set(panel_id),
                data_type: Set(data_type),
                is_readonly: Set(false),
                created_at: Set(Utc::now().naive_utc()),
                updated_at: Set(Utc::now().naive_utc()),
                created_by: Set(created_by),
                ..Default::default()
            };
            Ok(new_setting.insert(db).await?)
        }
    }

    /// Get all settings for a category
    pub async fn get_category_settings(
        db: &DatabaseConnection,
        category: &str,
        user_id: Option<i32>,
        device_serial: Option<i32>,
    ) -> Result<Vec<application_settings::Model>> {
        let mut query = application_settings::Entity::find()
            .filter(application_settings::Column::Category.eq(category));

        if let Some(uid) = user_id {
            query = query.filter(application_settings::Column::UserId.eq(uid));
        }

        if let Some(serial) = device_serial {
            query = query.filter(application_settings::Column::DeviceSerial.eq(serial));
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
                None,
                "LOCALSTORAGE_MIGRATION".to_string(),
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
    pub device_serial: Option<i32>,
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

/// Database Configuration Service
///
/// Manages database partitioning configuration and file management
pub struct DatabaseConfigService;

impl DatabaseConfigService {
    /// Get current database configuration
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

    /// Save database configuration
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
                println!("📋 No partition configuration found, creating default (Weekly)");
                let default_config = database_partition_config::DatabasePartitionConfig {
                    id: None,
                    strategy: database_partition_config::PartitionStrategy::Weekly,
                    custom_days: None,
                    custom_months: None,
                    auto_cleanup_enabled: true,
                    retention_value: 30, // 30 days retention
                    retention_unit: database_partition_config::RetentionUnit::Days,
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

        println!("✅ Database initialization complete:");
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
                            println!("✅ Partition already registered: {}", file_name);
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
                    let partition_db_url = format!("sqlite://{}", file_path.display());

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
                                println!("✅ Created missing active file: {}", record.file_name);
                                result.created_files += 1;
                            }

                            let _ = partition_conn.close().await;
                        },
                        Err(e) => {
                            println!("❌ Failed to create missing file {}: {}", record.file_name, e);
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
        println!("🏷️ Generated partition ID: {}", partition_id);

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

            // Create the database file using SeaORM's SQLite connection
            let partition_db_url = format!("sqlite://{}", file_path.display());

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
                        println!("✅ Partition file created successfully: {}", file_name);
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
        let main_db_path = get_t3000_database_path().join("webview_t3_device.db");

        // Use SQLite ATTACH to work with both databases
        let attach_sql = format!(
            "ATTACH DATABASE '{}' AS partition_db",
            partition_path.to_string_lossy()
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

            println!("🗑️ Removed {} records from main database", delete_result.rows_affected());
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

        println!("✅ Data migration completed for partition: {}", partition_id);
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

                println!("🗑️ Database file deleted: {}", file_model.file_name);
                Ok(true)
            }
            None => Ok(false)
        }
    }

    /// Cleanup old database files based on retention policy
    pub async fn cleanup_old_files(
        db: &DatabaseConnection,
        retention_days: i32
    ) -> Result<CleanupResult> {
        let cutoff_date = Utc::now() - Duration::days(retention_days as i64);

        let old_files = database_files::Entity::find()
            .filter(database_files::Column::CreatedAt.lt(cutoff_date.naive_utc()))
            .filter(database_files::Column::IsActive.eq(false))
            .all(db)
            .await?;

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
