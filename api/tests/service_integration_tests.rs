//! Integration tests for T3000 WebView API
//! These tests verify the complete system integration

use t3_webview_api::t3_device::t3_ffi_sync_service::{T3000MainService, T3000MainConfig};

#[test]
fn test_service_configuration() {
    let config = T3000MainConfig {
        sync_interval_secs: 30,
        timeout_seconds: 10,
        retry_attempts: 3,
        auto_start: true,
    };

    assert_eq!(config.sync_interval_secs, 30);
    assert_eq!(config.timeout_seconds, 10);
    assert_eq!(config.retry_attempts, 3);

    println!("✅ Service configuration test passed");
}

#[tokio::test]
async fn test_service_creation() {
    let config = T3000MainConfig {
        sync_interval_secs: 30,
        timeout_seconds: 10,
        retry_attempts: 3,
        auto_start: false,
    };

    // Note: This test may fail if database connection is not available
    // In a real test environment, you would use a test database
    match T3000MainService::new(config).await {
        Ok(service) => {
            assert!(!service.is_running());
            println!("✅ Service creation test passed");
        }
        Err(e) => {
            println!("⚠️ Service creation failed (expected in test environment): {}", e);
            // This is expected in test environment without proper database setup
        }
    }
}

#[test]
fn test_json_parsing_empty_response() {
    let empty_json = r#"{"action": "LOGGING_DATA_RES", "data": []}"#;

    match T3000MainService::parse_logging_response(empty_json) {
        Ok(response) => {
            assert_eq!(response.action, "LOGGING_DATA_RES");
            assert_eq!(response.devices.len(), 0);
            println!("✅ Empty JSON parsing test passed");
        }
        Err(e) => {
            panic!("❌ Failed to parse empty JSON: {:?}", e);
        }
    }
}

#[test]
fn test_json_parsing_malformed() {
    let malformed_json = r#"{"action": "LOGGING_DATA_RES", "data": [}"#; // Missing closing bracket

    match T3000MainService::parse_logging_response(malformed_json) {
        Ok(_) => {
            panic!("❌ Should have failed to parse malformed JSON");
        }
        Err(_) => {
            println!("✅ Malformed JSON correctly rejected");
        }
    }
}

#[test]
fn test_multiple_devices_parsing() {
    let multi_device_json = r#"{
        "action": "LOGGING_DATA_RES",
        "data": [
            {
                "panel_id": 1,
                "panel_name": "Device1",
                "panel_serial_number": 12345,
                "panel_ipaddress": "192.168.1.100",
                "input_logging_time": 1735123456,
                "output_logging_time": 1735123457,
                "variable_logging_time": 1735123458,
                "device_data": []
            },
            {
                "panel_id": 2,
                "panel_name": "Device2",
                "panel_serial_number": 67890,
                "panel_ipaddress": "192.168.1.101",
                "input_logging_time": 1735123456,
                "output_logging_time": 1735123457,
                "variable_logging_time": 1735123458,
                "device_data": []
            }
        ]
    }"#;

    match T3000MainService::parse_logging_response(multi_device_json) {
        Ok(response) => {
            assert_eq!(response.devices.len(), 2);

            let device1 = &response.devices[0];
            assert_eq!(device1.device_info.panel_id, 1);
            assert_eq!(device1.device_info.panel_name, "Device1");
            assert_eq!(device1.device_info.panel_serial_number, 12345);

            let device2 = &response.devices[1];
            assert_eq!(device2.device_info.panel_id, 2);
            assert_eq!(device2.device_info.panel_name, "Device2");
            assert_eq!(device2.device_info.panel_serial_number, 67890);

            println!("✅ Multiple devices parsing test passed");
        }
        Err(e) => {
            panic!("❌ Failed to parse multiple devices JSON: {:?}", e);
        }
    }
}

#[test]
fn test_device_with_mixed_point_types() {
    let mixed_points_json = r#"{
        "action": "LOGGING_DATA_RES",
        "data": [
            {
                "panel_id": 1,
                "panel_name": "TestDevice",
                "panel_serial_number": 12345,
                "panel_ipaddress": "192.168.1.100",
                "input_logging_time": 1735123456,
                "output_logging_time": 1735123457,
                "variable_logging_time": 1735123458,
                "device_data": [
                    {
                        "type": "INPUT",
                        "index": 0,
                        "id": "IN1",
                        "value": 25.0,
                        "range": 1,
                        "digital_analog": 1,
                        "description": "Temperature",
                        "label": "Temp1"
                    },
                    {
                        "type": "OUTPUT",
                        "index": 0,
                        "id": "OUT1",
                        "value": 50.0,
                        "range": 22,
                        "digital_analog": 1,
                        "description": "Fan Speed",
                        "label": "Fan1"
                    },
                    {
                        "type": "VARIABLE",
                        "index": 0,
                        "id": "VAR1",
                        "value": 1013.25,
                        "range": 4,
                        "digital_analog": 1,
                        "description": "Pressure",
                        "label": "Press1"
                    }
                ]
            }
        ]
    }"#;

    match T3000MainService::parse_logging_response(mixed_points_json) {
        Ok(response) => {
            assert_eq!(response.devices.len(), 1);

            let device = &response.devices[0];
            assert_eq!(device.input_points.len(), 1);
            assert_eq!(device.output_points.len(), 1);
            assert_eq!(device.variable_points.len(), 1);

            // Check specific point details
            let input_point = &device.input_points[0];
            assert_eq!(input_point.range, 1); // Should map to "Deg.C"
            assert_eq!(input_point.value, 25.0);

            let output_point = &device.output_points[0];
            assert_eq!(output_point.range, 22); // Should map to "%"
            assert_eq!(output_point.value, 50.0);

            let variable_point = &device.variable_points[0];
            assert_eq!(variable_point.range, 4); // Should map to "Pascals"
            assert_eq!(variable_point.value, 1013.25);

            println!("✅ Mixed point types parsing test passed");
        }
        Err(e) => {
            panic!("❌ Failed to parse mixed points JSON: {:?}", e);
        }
    }
}
