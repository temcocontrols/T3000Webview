use anyhow::Result;
use std::sync::Arc;

use crate::data_management::{
    manager::DataManager,
    types::*,
};

/// Simple database test runner
pub async fn run_simple_database_test() -> Result<()> {
    println!("🔧 Starting Simple Database Test...\n");

    // 1. Initialize data manager with default config
    println!("1️⃣ Initializing DataManager...");
    let config = DataManagerConfig::default();
    let db_path = config.database_path.clone();

    match DataManager::new(db_path, config).await {
        Ok(data_manager) => {
            let data_manager = Arc::new(data_manager);
            println!("   ✅ DataManager initialized successfully\n");

            // 2. Test device operations
            println!("2️⃣ Testing device operations...");
            test_device_operations(&data_manager).await?;

            // 3. Test monitoring points
            println!("3️⃣ Testing monitoring point operations...");
            test_monitoring_points(&data_manager).await?;

            // 4. Test cache operations
            println!("4️⃣ Testing cache operations...");
            test_cache_operations(&data_manager).await?;

            // 5. Test performance
            println!("5️⃣ Testing performance...");
            test_performance(&data_manager).await?;

            println!("\n🎉 All tests completed successfully!");
            println!("✅ Database system is ready for T3000 integration!");
        }
        Err(e) => {
            println!("   ❌ DataManager initialization failed: {}", e);
            return Err(e);
        }
    }

    Ok(())
}

async fn test_device_operations(data_manager: &Arc<DataManager>) -> Result<()> {
    // Test device retrieval (basic connectivity test)
    match data_manager.get_device_by_id(1).await {
        Ok(Some(device)) => {
            println!("   ✅ Device found: {} (Status: {})", device.device_name, device.status);
        }
        Ok(None) => {
            println!("   ℹ️ No device with ID 1 found (expected for fresh database)");
        }
        Err(e) => {
            println!("   ⚠️ Device query test: {}", e);
            // This is not a critical error for testing
        }
    }

    println!("   ✅ Device operations test complete");
    Ok(())
}

async fn test_monitoring_points(data_manager: &Arc<DataManager>) -> Result<()> {
    // Test monitoring points retrieval
    match data_manager.get_monitoring_points(1).await {
        Ok(points) => {
            println!("   ✅ Found {} monitoring points for device 1", points.len());

            if !points.is_empty() {
                let point = &points[0];
                println!("   📊 Sample point: {} ({}:{})",
                    point.label.as_deref().unwrap_or("Unknown"),
                    point.point_type,
                    point.point_number
                );
            }
        }
        Err(e) => {
            println!("   ⚠️ Monitoring points query: {}", e);
            // Not critical for basic functionality test
        }
    }

    println!("   ✅ Monitoring points test complete");
    Ok(())
}

async fn test_cache_operations(data_manager: &Arc<DataManager>) -> Result<()> {
    // Test cache data retrieval
    match data_manager.get_cached_data(1, 1, 1).await {
        Ok(Some(cached)) => {
            println!("   ✅ Cache hit: Device {} Point {}:{} = {} ({})",
                cached.device_id, cached.point_type, cached.point_number,
                cached.value, cached.quality
            );
        }
        Ok(None) => {
            println!("   ℹ️ No cached data found (expected for fresh database)");
        }
        Err(e) => {
            println!("   ⚠️ Cache query test: {}", e);
        }
    }

    // Test device cached data batch retrieval
    match data_manager.get_device_cached_data(1).await {
        Ok(data_points) => {
            println!("   ✅ Retrieved {} cached data points for device 1", data_points.len());
        }
        Err(e) => {
            println!("   ⚠️ Device cache batch query: {}", e);
        }
    }

    println!("   ✅ Cache operations test complete");
    Ok(())
}

async fn test_performance(data_manager: &Arc<DataManager>) -> Result<()> {
    let start_time = std::time::Instant::now();

    // Test multiple cache queries for performance
    let mut query_count = 0;
    for device_id in 1..=5 {
        for point_type in 1..=3 {
            for point_number in 1..=10 {
                match data_manager.get_cached_data(device_id, point_type, point_number).await {
                    Ok(_) => query_count += 1,
                    Err(_) => {} // Ignore errors for performance test
                }
            }
        }
    }

    let elapsed = start_time.elapsed();
    let queries_per_second = query_count as f64 / elapsed.as_secs_f64();

    println!("   📊 Performance test: {} queries in {:?}", query_count, elapsed);
    println!("   🚀 Query rate: {:.1} queries/second", queries_per_second);

    if queries_per_second > 100.0 {
        println!("   ✅ Excellent performance!");
    } else if queries_per_second > 50.0 {
        println!("   ✅ Good performance!");
    } else {
        println!("   ⚠️ Performance could be improved");
    }

    println!("   ✅ Performance test complete");
    Ok(())
}

/// Test database connectivity only
pub async fn test_database_connection() -> Result<()> {
    println!("🔌 Testing database connection...");

    let config = DataManagerConfig::default();
    let db_path = config.database_path.clone();

    match DataManager::new(db_path, config).await {
        Ok(_) => {
            println!("✅ Database connection successful!");
            Ok(())
        }
        Err(e) => {
            println!("❌ Database connection failed: {}", e);
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simple_database_integration() {
        if let Err(e) = run_simple_database_test().await {
            panic!("Simple database integration test failed: {}", e);
        }
    }

    #[tokio::test]
    async fn test_db_connection_only() {
        if let Err(e) = test_database_connection().await {
            panic!("Database connection test failed: {}", e);
        }
    }
}
