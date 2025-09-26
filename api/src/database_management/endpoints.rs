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
use crate::entity::database_partitions;
use super::{
    ApplicationSettingsService, DatabasePartitionService, DatabaseSizeService,
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

    let setting = ApplicationSettingsService::set_setting(
        db,
        request.category,
        request.key,
        request.value,
        request.user_id,
        request.device_serial,
        request.panel_id,
        "API_ENDPOINT".to_string(),
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
        let settings = ApplicationSettingsService::get_category_settings(
            db,
            &category,
            query.user_id,
            query.device_serial,
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

    let settings = ApplicationSettingsService::get_category_settings(
        db,
        &category,
        query.user_id,
        query.device_serial,
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

    let setting = ApplicationSettingsService::get_setting(
        db,
        &category,
        &key,
        query.user_id,
        query.device_serial,
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

    let setting = ApplicationSettingsService::set_setting(
        db,
        request.category,
        request.key,
        request.value,
        request.user_id,
        request.device_serial,
        request.panel_id,
        "API_ENDPOINT".to_string(),
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
    if let Some(setting) = ApplicationSettingsService::get_setting(
        db,
        &category,
        &key,
        query.user_id,
        query.device_serial,
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

    let migrated_count = ApplicationSettingsService::migrate_localstorage_data(
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
        "message": format!(
            "Cleaned up {} partitions, removed {} records, freed {} bytes",
            result.partitions_cleaned,
            result.records_removed,
            result.bytes_freed
        )
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
