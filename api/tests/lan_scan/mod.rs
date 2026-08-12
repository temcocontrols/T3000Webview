//! Tests for `lan_scan::protocol` — binary parsing of the 0x64/0x65 UDP scan protocol.
//!
//! These verify the Rust parser matches the C++ `AddNetDeviceForRefreshList()` behavior.

use t3_webview_api::lan_scan::protocol::{self, RESPONSE_MSG};

#[test]
fn test_parse_minimal_valid_response() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;          // command
    buf[4] = 0x78;                  // serial_low
    buf[6] = 0x56;                  // serial_2
    buf[8] = 0x34;                  // serial_3
    buf[10] = 0x12;                 // serial_4 → serial = 0x12345678
    buf[12] = 88;                   // product_id = ESP32_T3_SERIES
    buf[14] = 5;                    // modbus_id
    buf[16] = 192; buf[18] = 168; buf[20] = 1; buf[22] = 100; // IP = 192.168.1.100
    buf[24] = 0x10; buf[25] = 0x0F; // port 0x0F10 = 3856
    buf[26] = 0x25; buf[27] = 0x00; // firmware 37 → /10 = 3.7 (ESP32)
    buf[28] = 0x01; buf[29] = 0x00; // hw = 1

    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.serial_number, 0x12345678);
    assert_eq!(dev.product_id, 88);
    assert_eq!(dev.modbus_id, 5);
    assert_eq!(dev.ip_address, "192.168.1.100");
    assert_eq!(dev.modbus_port, 0x0F10);
    assert!((dev.firmware_version - 3.7).abs() < 0.01);
    assert_eq!(dev.hardware_version, 1);
}

#[test]
fn test_parse_full_response_with_panel_name() {
    let mut buf = vec![0u8; 70];
    buf[0] = RESPONSE_MSG;
    buf[4] = 0x01; buf[6] = 0x00; buf[8] = 0x00; buf[10] = 0x00; // serial = 1
    buf[12] = 35;                   // product_id = MINIPANEL
    buf[14] = 1;                    // modbus_id
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1; // IP = 10.0.0.1
    buf[24] = 0x50; buf[25] = 0xC3; // modbus port = 50000
    buf[26] = 0x2C; buf[27] = 0x01; // firmware 300 → /10 = 30.0 (MINIPANEL)
    buf[28] = 0x02; buf[29] = 0x00; // hw = 2
    // bytes 30-33: parent_serial = 0
    buf[34] = 0x34; buf[35] = 0x12; // object_instance low = 0x1234
    buf[36] = 5;                     // panel_number = 5
    // bytes 37-56: panel_name = "MyT3Device"
    let name = b"MyT3Device";
    buf[37..37 + name.len()].copy_from_slice(name);
    buf[57] = 0xBC; buf[58] = 0x9A; // object_instance high = 0x9ABC
    buf[59] = 0;                     // isp_mode = app
    buf[60] = 0xB0; buf[61] = 0xC0; // bacnetip_port = 0xC0B0 = 49328
    buf[64] = 2;                     // command_version = 2
    buf[65] = 1;                     // minitype (no parent → offset 65)

    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.serial_number, 1);
    assert_eq!(dev.product_name, "T3Controller"); // MINIPANEL = 35
    assert!((dev.firmware_version - 30.0).abs() < 0.01);
    assert_eq!(dev.panel_number, 5);
    assert_eq!(dev.panel_name, "MyT3Device");
    assert_eq!(dev.object_instance, 0x9ABC1234);
    assert_eq!(dev.command_version, Some(2));
    assert_eq!(dev.minitype, Some(1));
}

#[test]
fn test_isp_mode_bootloader_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; // serial
    buf[12] = 35; // MINIPANEL
    buf[16] = 192; buf[18] = 168; buf[20] = 1; buf[22] = 1;
    buf[59] = 1; // isp_mode = bootloader → skip
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_isp_mode_corrupted_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; // serial
    buf[12] = 35;
    buf[16] = 192; buf[18] = 168; buf[20] = 1; buf[22] = 1;
    buf[59] = 2; // isp_mode = corrupted → skip
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_wrong_command_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = 0x2f; // RESPONSE_TOTAL_SUB_INFO, not RESPONSE_MSG
    buf[4] = 1;
    buf[12] = 35;
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_zero_serial_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    // serial = 0 (all zeros at 4,6,8,10)
    buf[12] = 35;
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_build_scan_query() {
    let q = protocol::build_scan_query();
    assert_eq!(q, [100, 0, 0, 0, 0]); // 0x64 + 4 zero bytes
}
