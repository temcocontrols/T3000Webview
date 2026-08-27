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

// ═══════════════════════════════════════════════════════════════════
// Modbus RTU wire helpers (ported from the C++ scanner)
// ═══════════════════════════════════════════════════════════════════

use t3_webview_api::lan_scan::modbus::{self, OnlineCheckError};

#[test]
fn test_crc16_known_value() {
    // Modbus CRC16 of [0x01, 0x03, 0x00, 0x00, 0x00, 0x0A] is 0xCDC5
    assert_eq!(modbus::crc16(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x0A]), 0xCDC5);
}

#[test]
fn test_build_read_multiple_frame() {
    let f = modbus::build_read_multiple(1, 0, 10);
    assert_eq!(&f[..6], &[1, 3, 0, 0, 0, 10]);
    let crc = modbus::crc16(&f[..6]);
    assert_eq!(f[6], (crc >> 8) as u8);
    assert_eq!(f[7], (crc & 0xFF) as u8);
}

#[test]
fn test_parse_read_multiple_roundtrip() {
    let mut resp = vec![0u8; 3 + 4 + 2];
    resp[0] = 5;
    resp[1] = 3;
    resp[2] = 4;
    resp[3] = 0x12;
    resp[4] = 0x34;
    resp[5] = 0xAB;
    resp[6] = 0xCD;
    let crc = modbus::crc16(&resp[..7]);
    resp[7] = (crc >> 8) as u8;
    resp[8] = (crc & 0xFF) as u8;
    let regs = modbus::parse_read_multiple(5, 2, &resp).unwrap();
    assert_eq!(regs, vec![0x1234, 0xABCD]);
}

#[test]
fn test_parse_online_check_no_response() {
    let pval = modbus::build_online_check(1, 254);
    let gval = [0u8; 13];
    assert_eq!(
        modbus::parse_online_check(&pval, &gval),
        Err(OnlineCheckError::NoResponse)
    );
}

#[test]
fn test_parse_online_check_single_responder_old_protocol() {
    // Old protocol: gval[8..12] all zero. gval[2] = the responding device ID.
    let pval = modbus::build_online_check(1, 254);
    let mut gval = [0u8; 13];
    gval[0] = pval[0]; // 255 (probe slave)
    gval[1] = 25;      // probe cmd
    gval[2] = 42;      // device ID
    // CRC over gval[0..3]
    let crc = modbus::crc16(&gval[..3]);
    gval[3] = (crc >> 8) as u8;
    gval[4] = (crc & 0xFF) as u8;
    assert_eq!(modbus::parse_online_check(&pval, &gval), Ok(Some(42)));
}

#[test]
fn test_parse_online_check_collision() {
    let pval = modbus::build_online_check(1, 254);
    let mut gval = [0u8; 13];
    gval[0] = pval[0];
    gval[1] = 25;
    gval[2] = 7;
    // gval[5] or gval[6] non-zero → collision (more than one device)
    gval[5] = 1;
    assert_eq!(
        modbus::parse_online_check(&pval, &gval),
        Err(OnlineCheckError::Collision)
    );
}

// ═══════════════════════════════════════════════════════════════════
// Serial scanner helpers (BACnet MSTP detection)
// ═══════════════════════════════════════════════════════════════════

use t3_webview_api::lan_scan::serial::check_mstp_data;

#[test]
fn test_mstp_detection_positive() {
    // 3 x 55 FF → MSTP present
    assert!(check_mstp_data(&[0x55, 0xFF, 0x55, 0xFF, 0x55, 0xFF, 0x00]));
}

#[test]
fn test_mstp_detection_random_data() {
    assert!(!check_mstp_data(&[0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
}

#[test]
fn test_mstp_detection_too_few_pairs() {
    // only 2 pairs → no
    assert!(!check_mstp_data(&[0x55, 0xFF, 0x55, 0xFF, 0x00, 0x01]));
}

// ═══════════════════════════════════════════════════════════════════
// Modbus online-check protocol parsing (moved here from modbus.rs so the
// source file stays pure implementation)
// ═══════════════════════════════════════════════════════════════════

/// Build a valid new-protocol online-check reply whose CRC low byte
/// (gval[8]) is exactly 0 — the edge case the C++ "fance" fix guards.
fn new_protocol_reply_with_zero_crc_lo(dev_id: u8) -> [u8; 13] {
    let mut gval = [0u8; 13];
    gval[0] = 255;
    gval[1] = 25;
    gval[2] = dev_id;
    gval[3] = 0xAA;
    gval[4] = 0xBB;
    gval[5] = 0xCC;
    // Vary the tail until CRC16's low byte is 0 (guaranteed to exist:
    // CRC16 over two variable bytes covers the full 16-bit state space).
    'search: for g3 in 0u8..=255u8 {
        for g6 in 0u8..=255u8 {
            gval[3] = g3;
            gval[6] = g6;
            let crc = modbus::crc16(&gval[..7]);
            if (crc & 0xFF) as u8 == 0 {
                gval[7] = (crc >> 8) as u8;
                gval[8] = 0;
                break 'search;
            }
        }
    }
    gval
}

#[test]
fn new_protocol_with_zero_crc_low_byte_is_not_misdetected_as_old() {
    // New-protocol reply whose CRC low byte (gval[8]) is 0. The old
    // gval[8..12]-only check would misroute this into the old-protocol
    // branch and reject it; including gval[7] (the C++ "fance" fix) keeps
    // it in the new-protocol branch where the CRC is valid.
    let pval = modbus::build_online_check(1, 254);
    let gval = new_protocol_reply_with_zero_crc_lo(7);
    assert_eq!(modbus::parse_online_check(&pval, &gval), Ok(Some(7)));
}

#[test]
fn non_zero_gval7_routes_to_new_protocol() {
    // gval[7] != 0 → new-protocol branch even though gval[8..12] are 0.
    let pval = modbus::build_online_check(1, 254);
    let mut gval = [0u8; 13];
    gval[0] = 255;
    gval[1] = 25;
    gval[2] = 42;
    gval[3] = 1; // data byte → old-protocol condition fails
    let crc = modbus::crc16(&gval[..7]);
    gval[7] = (crc >> 8) as u8;
    gval[8] = (crc & 0xFF) as u8;
    assert_eq!(modbus::parse_online_check(&pval, &gval), Ok(Some(42)));
}

// ═══════════════════════════════════════════════════════════════════
// Modbus TCP sub-port framing (moved here from tcp_sub.rs)
// ═══════════════════════════════════════════════════════════════════

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;
use t3_webview_api::lan_scan::tcp_sub;

/// Read exactly `n` bytes (or until timeout) from a stream.
fn read_exact(s: &mut TcpStream, n: usize) -> Vec<u8> {
    let mut buf = vec![0u8; n];
    let mut got = 0;
    while got < n {
        match s.read(&mut buf[got..]) {
            Ok(0) => break,
            Ok(k) => got += k,
            Err(_) => break,
        }
    }
    buf.truncate(got);
    buf
}

#[test]
fn write_reg_sends_mbap_frame_and_verifies_echo() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let server = thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap();
        s.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
        let req = read_exact(&mut s, 12);
        assert_eq!(&req[2..6], &[0, 0, 0, 6], "MBAP protocol id + length");
        assert_eq!(req[6], 255, "slave");
        assert_eq!(req[7], 6, "func 6");
        assert_eq!(req[8], 0x00, "addr hi");
        assert_eq!(req[9], 96, "addr lo (reg 96)");
        assert_eq!(req[10], 0x00, "val hi");
        assert_eq!(req[11], 0x02, "val lo (sub_com=2)");
        // Echo the exact write frame back.
        s.write_all(&req).unwrap();
    });

    let mut client = TcpStream::connect(addr).unwrap();
    client.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
    let mut trans_id = 1u16;
    let r = tcp_sub::write_reg(&mut client, &mut trans_id, 255, 96, 2);
    assert!(r.is_ok(), "write_reg failed: {:?}", r);
    server.join().unwrap();
}

#[test]
fn read_regs_tcp_sends_mbap_frame_and_strips_header() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let server = thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap();
        s.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
        let req = read_exact(&mut s, 12);
        assert_eq!(&req[2..6], &[0, 0, 0, 6], "MBAP protocol id + length");
        assert_eq!(req[6], 7, "slave");
        assert_eq!(req[7], 3, "func 3");
        assert_eq!(req[10], 0x00, "count hi");
        assert_eq!(req[11], 10, "count lo");
        // Response: 6-byte MBAP header + [slave,3,20,data...] with NO CRC.
        let mut resp = vec![0u8; 6 + 3 + 20];
        resp[0] = req[0];
        resp[1] = req[1]; // echo transaction id
        resp[5] = (3 + 20) as u8; // MBAP length
        resp[6] = 7;
        resp[7] = 3;
        resp[8] = 20;
        resp[9] = 0x12; // reg0 hi
        resp[10] = 0x34; // reg0 lo → 0x1234
        resp[9 + 14] = 0x00; // reg7 hi
        resp[10 + 14] = 88; // reg7 lo → product 88
        s.write_all(&resp).unwrap();
    });

    let mut client = TcpStream::connect(addr).unwrap();
    client.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
    let mut trans_id = 1u16;
    let regs = tcp_sub::read_regs_tcp(&mut client, &mut trans_id, 7, 0, 10)
        .expect("read_regs_tcp failed");
    assert_eq!(regs.len(), 10);
    assert_eq!(regs[0], 0x1234);
    assert_eq!(regs[7], 88);
    server.join().unwrap();
}

#[test]
fn online_check_tcp_skips_mbap_and_parses_old_protocol() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let server = thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap();
        s.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
        let req = read_exact(&mut s, 10);
        assert_eq!(&req[..6], &[1, 2, 3, 4, 5, 6], "probe prefix");
        assert_eq!(&req[6..], &[255, 25, 0xFE, 0x01], "probe payload");
        // 6-byte MBAP prefix + old-protocol payload (no CRC bytes).
        let mut resp = [0u8; 6 + 13];
        resp[..6].copy_from_slice(&[1, 2, 3, 4, 5, 6]);
        resp[6] = 255;
        resp[7] = 25;
        resp[8] = 42; // device ID
        s.write_all(&resp).unwrap();
    });

    let mut client = TcpStream::connect(addr).unwrap();
    client.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
    assert_eq!(tcp_sub::online_check_tcp(&mut client, 1, 254), Ok(Some(42)));
    server.join().unwrap();
}

#[test]
fn online_check_tcp_new_protocol_with_zero_crc_lo() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let server = thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap();
        s.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
        let _ = read_exact(&mut s, 10);
        // 6-byte MBAP prefix + new-protocol payload; CRC low byte (gval[8]) is 0.
        let mut resp = [0u8; 6 + 13];
        resp[..6].copy_from_slice(&[1, 2, 3, 4, 5, 6]);
        resp[6] = 255;
        resp[7] = 25;
        resp[8] = 7; // device ID
        resp[9] = 0xAA;
        resp[10] = 0xBB;
        resp[11] = 0xCC;
        resp[12] = 0xDD;
        resp[13] = 0x12; // gval[7] CRC hi
        resp[14] = 0x00; // gval[8] CRC lo == 0
        s.write_all(&resp).unwrap();
    });

    let mut client = TcpStream::connect(addr).unwrap();
    client.set_read_timeout(Some(Duration::from_millis(2000))).unwrap();
    assert_eq!(tcp_sub::online_check_tcp(&mut client, 1, 254), Ok(Some(7)));
    server.join().unwrap();
}