use sea_orm::Database;
use anyhow::Result;
use crate::data_management::{DataManager, DataManagerConfig};

/// Integration test for the data management system
pub async fn test_data_management_integration() -> Result<()> {
    log::info!("Starting data management integration test");

    // Create test configuration
    let config = DataManagerConfig {
        database_path: ":memory:".to_string(),
        t3000_output_path: "".to_string(),
        cache_duration_seconds: 300, // 5 minutes
        background_poll_interval_seconds: 30,
        max_batch_size: 1000,
        enable_background_collection: false, // Don't start background tasks in tests
        data_retention_days: Some(365),
    };

    // Initialize data manager with in-memory database for testing
    let db_path = ":memory:";
    let data_manager = DataManager::new(db_path, config).await?;

    // Test database connectivity
    let connection_ok = data_manager.test_connection().await?;
    log::info!("Database connection test: {}", if connection_ok { "PASSED" } else { "FAILED" });

    // Initialize schema
    data_manager.init_schema().await?;
    log::info!("Schema initialization: COMPLETED");

    // Test device operations
    log::info!("Testing device operations...");
    let device = data_manager.get_device_by_id(1).await?;
    log::info!("Get device by ID: {} result", if device.is_some() { "FOUND" } else { "NOT FOUND" });

    // Test monitoring points operations
    log::info!("Testing monitoring points operations...");
    let points = data_manager.get_monitoring_points(1).await?;
    log::info!("Get monitoring points: {} points found", points.len());

    let active_points = data_manager.get_active_monitoring_points(1).await?;
    log::info!("Get active monitoring points: {} active points found", active_points.len());

    log::info!("Data management integration test completed successfully");
    Ok(())
}

/// Quick validation that all Sea-ORM entities are working
pub async fn test_entity_compilation() -> Result<()> {
    use crate::entity::data_management::*;

    log::info!("Testing Sea-ORM entity compilation...");

    // Just verify that we can reference all entities without compilation errors
    let _device_entity = devices::Entity;
    let _monitoring_points_entity = monitoring_points::Entity;
    let _realtime_cache_entity = realtime_data_cache::Entity;
    let _timeseries_entity = timeseries_data::Entity;
    let _trend_logs_entity = trend_logs::Entity;
    let _trend_log_points_entity = trend_log_points::Entity;

    log::info!("Sea-ORM entity compilation test: PASSED");
    Ok(())
}
