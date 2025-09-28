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

        Ok(CleanupResult {
            partitions_cleaned: cleaned_up,
            records_removed: total_records_removed,
            bytes_freed: total_bytes_freed,
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
    pub partitions_cleaned: i32,
    pub records_removed: i64,
    pub bytes_freed: i64,
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

    /// Apply partitioning strategy to create new database files
    pub async fn apply_partitioning_strategy(
        db: &DatabaseConnection,
        config: &database_partition_config::DatabasePartitionConfig
    ) -> Result<Vec<database_files::DatabaseFileInfo>> {
        // This would implement the actual partitioning logic
        // For now, we'll create mock partitions based on the strategy

        let now = Utc::now().naive_utc();
        let partition_id = config.generate_partition_identifier(&now);

        // Create new database file entry
        let new_file = database_files::ActiveModel {
            file_name: Set(format!("trendlog_{}.db", partition_id)),
            file_path: Set(format!("./Database/trendlog_{}.db", partition_id)),
            partition_identifier: Set(Some(partition_id)),
            file_size_bytes: Set(0),
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

        // Insert new active file
        let saved_file = new_file.insert(db).await?;

        // Return updated file list
        Self::get_database_files(db).await
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
                        "Cannot delete active database file".to_string()
                    ));
                }

                // Delete file record
                database_files::Entity::delete_by_id(file_id).exec(db).await?;

                // Here you would also delete the actual file from filesystem
                // std::fs::remove_file(&file_model.file_path)?;

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

        let mut partitions_cleaned = 0;
        let mut records_removed = 0;
        let mut bytes_freed = 0;

        for file in old_files {
            records_removed += file.record_count;
            bytes_freed += file.file_size_bytes;
            partitions_cleaned += 1;

            // Delete file record
            database_files::Entity::delete_by_id(file.id).exec(db).await?;

            // Here you would also delete the actual file from filesystem
            // std::fs::remove_file(&file.file_path)?;
        }

        Ok(CleanupResult {
            partitions_cleaned,
            records_removed,
            bytes_freed,
        })
    }

    /// Cleanup all database files (except active ones)
    pub async fn cleanup_all_files(db: &DatabaseConnection) -> Result<CleanupResult> {
        let files_to_delete = database_files::Entity::find()
            .filter(database_files::Column::IsActive.eq(false))
            .all(db)
            .await?;

        let mut partitions_cleaned = 0;
        let mut records_removed = 0;
        let mut bytes_freed = 0;

        for file in files_to_delete {
            records_removed += file.record_count;
            bytes_freed += file.file_size_bytes;
            partitions_cleaned += 1;

            // Delete file record
            database_files::Entity::delete_by_id(file.id).exec(db).await?;

            // Here you would also delete the actual file from filesystem
            // std::fs::remove_file(&file.file_path)?;
        }

        Ok(CleanupResult {
            partitions_cleaned,
            records_removed,
            bytes_freed,
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
