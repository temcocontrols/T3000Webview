//! Tests for `lan_scan::protocol` — binary parsing of the 0x64/0x65 UDP scan protocol.
//!
//! These verify the Rust parser matches the C++ `AddNetDeviceForRefreshList()` behavior.

use t3_webview_api::lan_scan::protocol::{self, RESPONSE_MSG};

#[test]
fn test_parse_minimal_valid_response() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 0x78; buf[6] = 0x56; buf[8] = 0x34; buf[10] = 0x12; // serial = 0x12345678
    buf[12] = 88;  // product_id = ESP32_T3_SERIES
    buf[14] = 5;
    buf[16] = 192; buf[18] = 168; buf[20] = 1; buf[22] = 100;
    buf[24] = 0x10; buf[25] = 0x0F; // port 0x0F10 = 3856
    buf[26] = 0x25; buf[27] = 0x00; // firmware 37 -> /10 = 3.7
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
    buf[4] = 0x01; buf[6] = 0x00; buf[8] = 0x00; buf[10] = 0x00;
    buf[12] = 35;  // MINIPANEL
    buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[24] = 0x50; buf[25] = 0xC3;
    buf[26] = 0x2C; buf[27] = 0x01; // firmware 300 -> /10 = 30.0
    buf[28] = 0x02; buf[29] = 0x00;
    buf[34] = 0x34; buf[35] = 0x12; // object_instance low
    buf[36] = 5;                     // panel_number
    let name = b"MyT3Device";
    buf[37..37 + name.len()].copy_from_slice(name);
    buf[57] = 0xBC; buf[58] = 0x9A; // object_instance high
    buf[59] = 0;                     // isp_mode = app
    buf[60] = 0xB0; buf[61] = 0xC0;
    buf[64] = 2;                     // command_version
    buf[67] = 1;                     // minitype (always at 67)

    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.serial_number, 1);
    assert_eq!(dev.product_name, "T3Controller");
    assert!((dev.firmware_version - 30.0).abs() < 0.01);
    assert_eq!(dev.panel_number, 5);
    assert_eq!(dev.panel_name, "MyT3Device");
    assert_eq!(dev.object_instance, 0xBC9A3412);
    assert_eq!(dev.command_version, Some(2));
    assert_eq!(dev.minitype, Some(1));
}

#[test]
fn test_isp_mode_bootloader_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 35;
    buf[16] = 192; buf[18] = 168; buf[20] = 1; buf[22] = 1;
    buf[59] = 1; // isp_mode = bootloader -> skip
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_isp_mode_corrupted_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 35;
    buf[16] = 192; buf[18] = 168; buf[20] = 1; buf[22] = 1;
    buf[59] = 2; // isp_mode = corrupted -> skip
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_wrong_command_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = 0x2f; // RESPONSE_TOTAL_SUB_INFO
    buf[4] = 1; buf[12] = 35;
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_zero_serial_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[12] = 35;
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_build_scan_query() {
    let q = protocol::build_scan_query();
    assert_eq!(q, [100, 0, 0, 0, 0]);
}

#[test]
fn test_subnet_protocol_maps_rs485_to_tcp() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 35; buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[63] = 0; // MODBUS_RS485 -> should become MODBUS_TCPIP(1)
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.subnet_protocol, 1);
}

#[test]
fn test_product_id_zero_skipped() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 0; // product_id = 0 -> skip
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_parent_serial_airlab_bug_zeroed() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 88; buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[30] = 0x42; buf[31] = 0x42; buf[32] = 0x42; buf[33] = 0x42;
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.parent_serial, 0);
}

#[test]
fn test_firmware_not_divided_for_standard_product() {
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 9; buf[14] = 1; // TStat8
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[26] = 0xC8; buf[27] = 0x00; // raw = 200
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert!((dev.firmware_version - 200.0).abs() < 0.01);
}

#[test]
fn test_child_device_with_parent_and_subnet_info() {
    let mut buf = vec![0u8; 70];
    buf[0] = RESPONSE_MSG;
    buf[4] = 0x02; buf[12] = 88; buf[14] = 3;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 2;
    buf[30] = 0x01; // parent_serial = 1
    buf[36] = 0; buf[59] = 0;
    buf[64] = 2;   // command_version
    buf[65] = 3;   // subnet_port (parent!=0)
    buf[66] = 5;   // subnet_baudrate
    buf[67] = 0;   // minitype
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.parent_serial, 1);
    assert_eq!(dev.serial_number, 2);
    assert_eq!(dev.command_version, Some(2));
    assert_eq!(dev.subnet_port, Some(3));
    assert_eq!(dev.subnet_baudrate, Some(5));
    assert_eq!(dev.minitype, Some(0));
}

#[test]
fn test_too_short_buffer_rejected() {
    let buf = vec![0u8; 10];
    assert!(protocol::parse_scan_response(&buf).is_none());
}

#[test]
fn test_unknown_product_id_skipped() {
    // product_id 24 is <220 and not in product_map → skipped (same as C++)
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 24; buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    assert!(protocol::parse_scan_response(&buf).is_none());
}
#[test]
fn test_esp32_airlab_product_name_override() {
    // product_id=88 (ESP32) + minitype=15 (T3_AIRLAB) → "Airlab"
    let mut buf = vec![0u8; 70];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 88; buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[64] = 2; buf[67] = 15; // command_version=2, minitype=T3_AIRLAB
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.product_name, "Airlab");
    assert_eq!(dev.product_id, 88);
}

#[test]
fn test_subnet_protocol_12_to_10_for_bacnet_device() {
    // product_id=35 (MINIPANEL) is BACnet-capable; subnet_protocol=12 → 10
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 35; buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[63] = 12; // PROTOCOL_BIP_T0_MSTP_TO_MODBUS
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.subnet_protocol, 10, "BACnet device protocol 12 should map to 10");
}

#[test]
fn test_subnet_protocol_12_stays_for_non_bacnet_device() {
    // product_id=9 (TStat8) is NOT BACnet-capable; subnet_protocol=12 stays
    let mut buf = vec![0u8; 64];
    buf[0] = RESPONSE_MSG;
    buf[4] = 1; buf[12] = 9; buf[14] = 1;
    buf[16] = 10; buf[18] = 0; buf[20] = 0; buf[22] = 1;
    buf[63] = 12;
    let dev = protocol::parse_scan_response(&buf).expect("should parse");
    assert_eq!(dev.subnet_protocol, 12, "Non-BACnet device protocol 12 should stay as 12");
}

#[test]
fn test_parse_sub_device_info() {
    // RESPONSE_TOTAL_SUB_INFO (0x2f) with 2 sub-devices
    let mut buf = vec![0u8; 30];
    buf[0] = 0x2f;
    buf[1] = 2;  // device_count = 2
    buf[2] = 0x78; buf[3] = 0x56; buf[4] = 0x34; buf[5] = 0x12; // parent_sn = 0x12345678
    // buf[6..21] = reserved
    buf[21] = 1; buf[22] = 5; // sub[0]: status=1, modbus_id=5
    buf[23] = 0; buf[24] = 7; // sub[1]: status=0, modbus_id=7

    let info = protocol::parse_sub_device_info(&buf).expect("should parse");
    assert_eq!(info.parent_serial, 0x12345678);
    assert_eq!(info.sub_devices.len(), 2);
    assert_eq!(info.sub_devices[0].status, 1);
    assert_eq!(info.sub_devices[0].modbus_id, 5);
    assert_eq!(info.sub_devices[1].status, 0);
    assert_eq!(info.sub_devices[1].modbus_id, 7);
}

// ═══════════════════════════════════════════════════════════════════
// Real network scan test — requires T3000 devices on the LAN.
// Run with: cargo test --test lan_scan test_real_network_scan -- --ignored --nocapture
// ═══════════════════════════════════════════════════════════════════

#[tokio::test]
#[ignore = "requires T3000 devices on the local network"]
async fn test_real_network_scan() {
    use t3_webview_api::lan_scan::scanner;
    use t3_webview_api::lan_scan::protocol;

    println!("\n=== T3000 LAN Scan (8s timeout) ===");

    let result = scanner::scan_network(8).await;

    println!("Adapters scanned:  {}", result.adapters_scanned);
    println!("Local IPs: {:?}", result.local_ips);
    for w in &result.warnings {
        println!("  ⚠  {}", w);
    }
    println!("Devices found: {}", result.devices.len());
    if result.devices.is_empty() {
        println!("(No devices responded — expected if no T3000 hardware on this LAN)");
    }
    for dev in &result.devices {
        println!(
            "  SN={:<12}  IP={:<16}  Name={:<20}  FW={:<6}  PID={:<3}  ModbusID={}",
            dev.serial_number,
            dev.ip_address,
            dev.product_name,
            format!("{:.1}", dev.firmware_version),
            dev.product_id,
            dev.modbus_id,
        );
    }

    // Show what was sent
    let q = protocol::build_scan_query();
    println!("\nQuery sent: {:02X?}", q);
    println!("Broadcast:  255.255.255.255:1234");
    println!("Bind ports: 57619..57623");
    println!("=== Scan complete ===\n");
}