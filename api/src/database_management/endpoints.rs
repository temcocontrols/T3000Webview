//! Database Management API Endpoints
//!
//! REST API endpoints for comprehensive database management including
//! settings storage, partitioning, cleanup, and monitoring.

use axum::{
    extract::{Path, Query, State},
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use sea_orm::{EntityTrait, QueryOrder, ConnectionTrait};
use serde::{Deserialize};
use chrono::{DateTime, Utc};

use crate::app_state::T3AppState;
use crate::error::Result;
use crate::entity::{database_partitions, database_partition_config, database_files};
use super::{
    ApplicationConfigService, DatabasePartitionService, DatabaseSizeService,
    DatabaseConfigService, DatabaseFilesService, CleanupResult,
    LocalStorageMigrationRequest, SettingRequest, PartitionRequest,
};pub fn database_management_routes() -> Router<T3AppState> {
    Router::new()
        // Application Settings endpoints
        .route("/db_management/settings", post(create_setting))
        .route("/db_management/settings", get(get_settings))
        .route("/db_management/settings/:category", get(get_category_settings))
        .route("/db_management/settings/:category/:key", get(get_specific_setting))
        .route("/db_management/settings/:category/:key", put(update_setting))
        .route("/db_management/settings/:category/:key", delete(delete_setting))
        .route("/db_management/settings/migrate", post(migrate_localstorage))

        // Trendlog Configuration endpoints (NEW)
        .route("/api/database/config", get(get_database_config))
        .route("/api/database/config", put(update_database_config))
        .route("/api/database/initialize", post(initialize_database_partitioning))
        .route("/api/database/partition/apply", post(apply_partitioning_strategy))
        .route("/api/database/partition/check", post(check_and_apply_partitioning))
        .route("/api/database/partition/ensure", post(ensure_partitions_on_trendlog_open))

        // Database Files Management endpoints (NEW)
        .route("/api/database/files", get(get_database_files))
        .route("/api/database/files/:id", delete(delete_database_file))
        .route("/api/database/cleanup/old", post(cleanup_old_files))
        .route("/api/database/cleanup/all", post(cleanup_all_files))
        .route("/api/database/optimize", post(optimize_database))
        .route("/api/database/stats", get(get_database_file_stats))

        // Trendlog Query endpoints (multi-partition support)
        .route("/api/database/trendlog/query", post(query_trendlog_across_partitions))

        // Database Partition endpoints
        .route("/db_management/partitions", post(create_partition))
        .route("/db_management/partitions", get(get_partitions))
        .route("/db_management/partitions/:table_name", get(get_table_partitions))
        .route("/db_management/partitions/:id/stats", put(update_partition_stats))
        .route("/db_management/partitions/cleanup", post(cleanup_partitions))

        // Database Monitoring endpoints
        .route("/db_management/stats", get(get_database_stats))
        .route("/db_management/health", get(get_database_health))

        // Management Tools endpoints
        .route("/db_management/tools/vacuum", post(vacuum_database))
        .route("/db_management/tools/analyze", post(analyze_database))
        .route("/db_management/tools/backup", post(backup_database))
}

// ============================================================================
// Application Settings Endpoints
// ============================================================================

/// Create or update a setting
async fn create_setting(
    State(app_state): State<T3AppState>,
    Json(request): Json<SettingRequest>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let setting = ApplicationConfigService::set_setting(
        db,
        request.category,
        request.key,
        request.value,
        request.user_id,
        request.device_serial,
        Some("API_ENDPOINT".to_string()),
    ).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "setting": setting,
        "message": "Setting saved successfully"
    })))
}

#[derive(Deserialize)]
struct SettingsQuery {
    user_id: Option<i32>,
    device_serial: Option<i32>,
    category: Option<String>,
}

/// Get settings with optional filtering
async fn get_settings(
    State(app_state): State<T3AppState>,
    Query(query): Query<SettingsQuery>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    if let Some(category) = query.category {
        let settings = ApplicationConfigService::get_category_settings(
            db,
            &category,
            query.user_id,
            query.device_serial.map(|d| d.to_string()),
        ).await?;

        Ok(Json(serde_json::json!({
            "success": true,
            "settings": settings,
            "category": category
        })))
    } else {
        // Return all settings (with pagination in real implementation)
        Ok(Json(serde_json::json!({
            "success": true,
            "message": "Use category filter or specific endpoints for settings"
        })))
    }
}

/// Get settings for a specific category
async fn get_category_settings(
    State(app_state): State<T3AppState>,
    Path(category): Path<String>,
    Query(query): Query<SettingsQuery>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let settings = ApplicationConfigService::get_category_settings(
        db,
        &category,
        query.user_id,
        query.device_serial.map(|d| d.to_string()),
    ).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "settings": settings,
        "category": category
    })))
}

/// Get a specific setting
async fn get_specific_setting(
    State(app_state): State<T3AppState>,
    Path((category, key)): Path<(String, String)>,
    Query(query): Query<SettingsQuery>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let setting = ApplicationConfigService::get_setting(
        db,
        &category,
        &key,
        query.user_id,
        query.device_serial.map(|d| d.to_string()),
    ).await?;

    if let Some(setting) = setting {
        Ok(Json(serde_json::json!({
            "success": true,
            "setting": setting
        })))
    } else {
        Ok(Json(serde_json::json!({
            "success": false,
            "message": "Setting not found"
        })))
    }
}

/// Update a specific setting
async fn update_setting(
    State(app_state): State<T3AppState>,
    Path((category, key)): Path<(String, String)>,
    Json(mut request): Json<SettingRequest>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    // Override category and key from path
    request.category = category;
    request.key = key;

    let setting = ApplicationConfigService::set_setting(
        db,
        request.category,
        request.key,
        request.value,
        request.user_id,
        request.device_serial,
        Some("API_ENDPOINT".to_string()),
    ).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "setting": setting,
        "message": "Setting updated successfully"
    })))
}

/// Delete a specific setting
async fn delete_setting(
    State(app_state): State<T3AppState>,
    Path((category, key)): Path<(String, String)>,
    Query(query): Query<SettingsQuery>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    // Find and delete the setting
    if let Some(setting) = ApplicationConfigService::get_setting(
        db,
        &category,
        &key,
        query.user_id,
        query.device_serial.map(|d| d.to_string()),
    ).await? {
        use crate::entity::application_settings;
        application_settings::Entity::delete_by_id(setting.id).exec(db).await?;

        Ok(Json(serde_json::json!({
            "success": true,
            "message": "Setting deleted successfully"
        })))
    } else {
        Ok(Json(serde_json::json!({
            "success": false,
            "message": "Setting not found"
        })))
    }
}

/// Migrate localStorage data to database
async fn migrate_localstorage(
    State(app_state): State<T3AppState>,
    Json(request): Json<LocalStorageMigrationRequest>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let migrated_count = ApplicationConfigService::migrate_localstorage_data(
        db,
        request.data,
    ).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "migrated_count": migrated_count,
        "message": format!("Successfully migrated {} localStorage items to database", migrated_count)
    })))
}

// ============================================================================
// Database Partition Endpoints
// ============================================================================

/// Create a new partition
async fn create_partition(
    State(app_state): State<T3AppState>,
    Json(request): Json<PartitionRequest>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let start_date: DateTime<Utc> = request.start_date.parse()
        .map_err(|_| crate::error::Error::BadRequest("Invalid start_date format".to_string()))?;
    let end_date: DateTime<Utc> = request.end_date.parse()
        .map_err(|_| crate::error::Error::BadRequest("Invalid end_date format".to_string()))?;

    let partition = DatabasePartitionService::create_partition(
        db,
        request.table_name,
        request.partition_type,
        start_date,
        end_date,
    ).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "partition": partition,
        "message": "Partition created successfully"
    })))
}

/// Get all partitions
async fn get_partitions(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let partitions = database_partitions::Entity::find()
        .order_by_desc(database_partitions::Column::CreatedAt)
        .all(db)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "partitions": partitions
    })))
}

/// Get partitions for a specific table
async fn get_table_partitions(
    State(app_state): State<T3AppState>,
    Path(table_name): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let partitions = DatabasePartitionService::get_table_partitions(db, &table_name).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "partitions": partitions,
        "table_name": table_name
    })))
}

#[derive(Deserialize)]
struct PartitionStatsUpdate {
    record_count: i64,
    size_bytes: i64,
}

/// Update partition statistics
async fn update_partition_stats(
    State(app_state): State<T3AppState>,
    Path(id): Path<i32>,
    Json(stats): Json<PartitionStatsUpdate>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let partition = DatabasePartitionService::update_partition_stats(
        db,
        id,
        stats.record_count,
        stats.size_bytes,
    ).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "partition": partition,
        "message": "Partition statistics updated successfully"
    })))
}

/// Cleanup old partitions
async fn cleanup_partitions(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let result = DatabasePartitionService::cleanup_old_partitions(db).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "cleanup_result": result,
        "message": result.message
    })))
}

// ============================================================================
// Database Monitoring Endpoints
// ============================================================================

/// Get database statistics
async fn get_database_stats(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    let stats = DatabaseSizeService::get_database_stats(db).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "stats": stats
    })))
}

/// Get database health status
async fn get_database_health(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    // Simple health check - try to query a system table
    let health_check = db.query_one(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT 1 as health".to_string()
    )).await;

    let is_healthy = health_check.is_ok();

    Ok(Json(serde_json::json!({
        "success": true,
        "healthy": is_healthy,
        "timestamp": chrono::Utc::now(),
        "message": if is_healthy { "Database is healthy" } else { "Database connection issue" }
    })))
}

// ============================================================================
// Database Management Tools Endpoints
// ============================================================================

/// Vacuum database to reclaim space
async fn vacuum_database(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    // Execute VACUUM command
    let result = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "VACUUM".to_string()
    )).await;

    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "success": true,
            "message": "Database vacuum completed successfully"
        }))),
        Err(e) => Ok(Json(serde_json::json!({
            "success": false,
            "message": format!("Vacuum failed: {}", e)
        })))
    }
}

/// Analyze database for query optimization
async fn analyze_database(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = &*app_state.conn.lock().await;

    // Execute ANALYZE command
    let result = db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "ANALYZE".to_string()
    )).await;

    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "success": true,
            "message": "Database analysis completed successfully"
        }))),
        Err(e) => Ok(Json(serde_json::json!({
            "success": false,
            "message": format!("Analysis failed: {}", e)
        })))
    }
}

/// Create database backup
async fn backup_database(
    State(_app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    // For SQLite, this would involve copying the database file
    // Implementation would depend on deployment requirements

    Ok(Json(serde_json::json!({
        "success": false,
        "message": "Backup functionality not yet implemented - would copy database file"
    })))
}

// ============================================================================
// NEW Trendlog Configuration ENDPOINTS
// ============================================================================

/// Get current Trendlog Configuration
async fn get_database_config(
    State(app_state): State<T3AppState>,
) -> Result<Json<database_partition_config::DatabasePartitionConfig>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };
    let config = DatabaseConfigService::get_config(db).await?;
    Ok(Json(config))
}

/// Update Trendlog Configuration
async fn update_database_config(
    State(app_state): State<T3AppState>,
    Json(config): Json<database_partition_config::DatabasePartitionConfig>,
) -> Result<Json<database_partition_config::DatabasePartitionConfig>> {
    crate::logger::write_structured_log("T3_Database", &format!("[DatabaseConfig] Received update request: strategy={:?}, retention={}:{:?}", config.strategy, config.retention_value, config.retention_unit)).ok();

    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => {
            crate::logger::write_structured_log_with_level("T3_Database", "[DatabaseConfig] T3 device database not available", crate::logger::LogLevel::Error).ok();
            return Err(crate::error::Error::ServerError("T3 device database not available".to_string()));
        }
    };

    match DatabaseConfigService::save_config(db, &config).await {
        Ok(updated_config) => {
            crate::logger::write_structured_log("T3_Database", &format!("[DatabaseConfig] Configuration saved successfully: id={:?}", updated_config.id)).ok();
            Ok(Json(updated_config))
        },
        Err(e) => {
            crate::logger::write_structured_log_with_level("T3_Database", &format!("[DatabaseConfig] Failed to save configuration: {:?}", e), crate::logger::LogLevel::Error).ok();
            Err(e)
        }
    }
}

/// Initialize database partitioning system (called on T3000 startup)
async fn initialize_database_partitioning(
    State(app_state): State<T3AppState>,
) -> Result<Json<crate::entity::database_files::DatabaseInitializationResult>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let result = DatabaseConfigService::initialize_database_partitioning(db).await?;
    Ok(Json(result))
}

/// Apply partitioning strategy
async fn apply_partitioning_strategy(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };
    let config = DatabaseConfigService::get_config(db).await?;
    let files = DatabaseConfigService::apply_partitioning_strategy(db, &config).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Partitioning strategy applied successfully",
        "files": files
    })))
}

/// Check and apply partitioning strategy if needed
async fn check_and_apply_partitioning(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let result = DatabaseConfigService::check_and_apply_partitioning(db).await?;

    match result {
        Some(files) => Ok(Json(serde_json::json!({
            "success": true,
            "message": "New partition created",
            "partitioned": true,
            "files": files
        }))),
        None => Ok(Json(serde_json::json!({
            "success": true,
            "message": "No partitioning needed at this time",
            "partitioned": false
        })))
    }
}

/// Ensure required partitions exist when trendlog window opens
async fn ensure_partitions_on_trendlog_open(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let result = DatabaseConfigService::ensure_partitions_on_trendlog_open(db).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Partition check completed",
        "config_found": result.config_found,
        "partitions_checked": result.partitions_checked,
        "partitions_created": result.partitions_created,
        "data_migrated_mb": result.data_migrated_mb,
        "has_errors": !result.errors.is_empty(),
        "errors": result.errors
    })))
}

/// Get list of database files
async fn get_database_files(
    State(app_state): State<T3AppState>,
) -> Result<Json<Vec<database_files::DatabaseFileInfo>>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    let files = DatabaseFilesService::get_files(db).await?;
    Ok(Json(files))
}

/// Delete specific database file
async fn delete_database_file(
    State(app_state): State<T3AppState>,
    Path(file_id): Path<i32>,
) -> Result<Json<serde_json::Value>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };

    match DatabaseFilesService::delete_file(db, file_id).await {
        Ok(true) => Ok(Json(serde_json::json!({
            "success": true,
            "message": "Database file deleted successfully"
        }))),
        Ok(false) => Ok(Json(serde_json::json!({
            "success": false,
            "message": "Database file not found"
        }))),
        Err(crate::error::Error::ValidationError(msg)) => Ok(Json(serde_json::json!({
            "success": false,
            "error": "validation_error",
            "message": msg
        }))),
        Err(e) => Err(e)
    }
}

#[derive(Deserialize)]
struct CleanupQuery {
    retention_days: Option<i32>,
}

/// Cleanup old database files
async fn cleanup_old_files(
    State(app_state): State<T3AppState>,
    Query(params): Query<CleanupQuery>,
) -> Result<Json<CleanupResult>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };
    let retention_days = params.retention_days.unwrap_or(30);
    let result = DatabaseFilesService::cleanup_old_files(db, retention_days).await?;
    Ok(Json(result))
}

/// Cleanup all database files
async fn cleanup_all_files(
    State(app_state): State<T3AppState>,
) -> Result<Json<CleanupResult>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };
    let result = DatabaseFilesService::cleanup_all_files(db).await?;
    Ok(Json(result))
}

/// Optimize/compact database
async fn optimize_database(
    State(app_state): State<T3AppState>,
) -> Result<Json<serde_json::Value>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };
    let success = DatabaseFilesService::optimize_database(db).await?;

    Ok(Json(serde_json::json!({
        "success": success,
        "message": if success { "Database optimized successfully" } else { "Database optimization failed" }
    })))
}

/// Get database file statistics
async fn get_database_file_stats(
    State(app_state): State<T3AppState>,
) -> Result<Json<database_files::DatabaseStats>> {
    let db = match &app_state.t3_device_conn {
        Some(conn) => &*conn.lock().await,
        None => return Err(crate::error::Error::ServerError("T3 device database not available".to_string()))
    };
    let stats = DatabaseFilesService::get_statistics(db).await?;
    Ok(Json(stats))
}

// ============================================================================
// Trendlog Query Endpoints (Multi-Partition Support)
// ============================================================================

#[derive(Debug, Deserialize)]
struct TrendlogQueryRequest {
    start_date: String,  // ISO 8601 format: "2025-10-25T00:00:00"
    end_date: String,    // ISO 8601 format: "2025-10-26T23:59:59"
    serial_number: Option<i32>,
    panel_id: Option<i32>,
    point_id: Option<String>,
    point_type: Option<String>,
}

/// Query trendlog data across multiple partitions and main database
async fn query_trendlog_across_partitions(
    State(_app_state): State<T3AppState>,
    Json(request): Json<TrendlogQueryRequest>,
) -> Result<Json<Vec<super::partition_query_service::TrendlogDataRecord>>> {
    use super::partition_query_service::{query_trendlog_data, TrendlogFilters};
    use chrono::NaiveDateTime;

    // Parse datetime strings
    let start_date = NaiveDateTime::parse_from_str(&request.start_date, "%Y-%m-%dT%H:%M:%S")
        .map_err(|e| crate::error::Error::ValidationError(format!("Invalid start_date format: {}", e)))?;

    let end_date = NaiveDateTime::parse_from_str(&request.end_date, "%Y-%m-%dT%H:%M:%S")
        .map_err(|e| crate::error::Error::ValidationError(format!("Invalid end_date format: {}", e)))?;

    // Build filters
    let filters = TrendlogFilters {
        serial_number: request.serial_number,
        panel_id: request.panel_id,
        point_id: request.point_id,
        point_type: request.point_type,
    };

    // Query across all partitions
    let results = query_trendlog_data(start_date, end_date, filters).await?;

    Ok(Json(results))
}

