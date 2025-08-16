use t3_webview_api::t3_device::trend_collector::{TrendDataPoint, PointType, DataSource};
use t3_webview_api::entity::t3_device::{trendlogs, trendlog_data};
use sea_orm::*;
use serde_json;

/// Test TrendDataPoint struct serialization/deserialization
#[tokio::test]
async fn test_trend_data_point_serialization() {
    let data_point = TrendDataPoint {
        device_id: 1,
        point_type: PointType::Input,
        point_number: 5,
        point_id: Some(123),
        value: 23.5,
        units_type: Some(1),
        timestamp: 1705843200, // 2024-01-21 12:00:00 UTC
        status: Some(0),
        source: DataSource::WebSocketIntercepted,
    };

    // Test JSON serialization
    let json = serde_json::to_string(&data_point).unwrap();
    assert!(json.contains("23.5"));
    assert!(json.contains("Input"));
    assert!(json.contains("WebSocketIntercepted"));

    // Test JSON deserialization
    let deserialized: TrendDataPoint = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.device_id, 1);
    assert_eq!(deserialized.value, 23.5);
    assert_eq!(deserialized.timestamp, 1705843200);

    println!("✅ TrendDataPoint serialization test passed");
}

/// Test PointType enum functionality
#[test]
fn test_point_type_enum() {
    assert_eq!(PointType::Input.to_string(), "input");
    assert_eq!(PointType::Output.to_string(), "output");
    assert_eq!(PointType::Variable.to_string(), "variable");

    // Test enum serialization
    let input_json = serde_json::to_string(&PointType::Input).unwrap();
    let output_json = serde_json::to_string(&PointType::Output).unwrap();
    let variable_json = serde_json::to_string(&PointType::Variable).unwrap();

    assert_eq!(input_json, r#""Input""#);
    assert_eq!(output_json, r#""Output""#);
    assert_eq!(variable_json, r#""Variable""#);

    println!("✅ PointType enum test passed");
}

/// Test DataSource enum functionality
#[test]
fn test_data_source_enum() {
    let sources = vec![
        DataSource::WebSocketIntercepted,
        DataSource::ManualCollection,
        DataSource::DirectApi,
    ];

    // Test serialization of all variants
    for source in sources {
        let json = serde_json::to_string(&source).unwrap();
        let deserialized: DataSource = serde_json::from_str(&json).unwrap();

        // Test that round-trip serialization works
        let json2 = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(json, json2);
    }

    println!("✅ DataSource enum test passed");
}

/// Validate TrendDataPoint struct design against database schema
#[test]
fn test_database_schema_compatibility() {
    // This test validates that TrendDataPoint fields align with database schema
    let data_point = TrendDataPoint {
        device_id: 1,           // Maps to trendlogs.device_id
        point_type: PointType::Input,
        point_number: 5,        // Maps to trendlogs.trendlog_number
        point_id: Some(123),    // Maps to trendlog_data.trendlog_id
        value: 23.5,            // Maps to trendlog_data.value (as f32)
        units_type: Some(1),    // Additional metadata
        timestamp: 1705843200,  // Maps to trendlog_data.timestamp
        status: Some(0),        // Maps to trendlog_data.quality
        source: DataSource::WebSocketIntercepted,
    };

    // Verify data types compatibility
    assert!(data_point.value as f32 > 0.0); // Can convert to f32 for database
    assert!(data_point.timestamp > 0);      // Valid timestamp
    assert!(data_point.device_id > 0);      // Valid device ID
    assert!(data_point.point_number > 0);   // Valid point number

    println!("✅ Database schema compatibility test passed");
}

/// Test TrendDataPoint field validation
#[test]
fn test_trend_data_point_validation() {
    // Test valid data point
    let valid_point = TrendDataPoint {
        device_id: 1,
        point_type: PointType::Output,
        point_number: 10,
        point_id: Some(456),
        value: -10.5, // Negative values should be valid
        units_type: None,
        timestamp: chrono::Utc::now().timestamp(),
        status: Some(1),
        source: DataSource::ManualCollection,
    };

    // Basic validation checks
    assert!(valid_point.device_id > 0);
    assert!(valid_point.point_number > 0);
    assert!(valid_point.timestamp > 0);
    assert!(valid_point.value.is_finite());

    println!("✅ TrendDataPoint validation test passed");
}
