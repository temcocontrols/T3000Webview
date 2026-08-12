//! Wire-protocol constants and binary parsing for the T3000 UDP scan protocol.
//!
//! This is a straight port of the C++ parsing logic in:
//! - `RefreshNetWorkDeviceListByUDPFunc()`  (global_function.cpp:9796)
//! - `AddNetDeviceForRefreshList()`          (global_function.cpp, ~line 9800+)
//!
//! Protocol: The T3000 broadcasts a 5-byte query [0x64, 0,0,0,0] to 255.255.255.255
//! on ports 57619-57623. Devices respond with a binary packet whose first byte is
//! 0x65 (RESPONSE_MSG). The payload is interleaved: every data byte is followed by
//! a "reserve" byte (padding), so real fields are at even offsets.

use super::types::DiscoveredDevice;

// ── Protocol Constants ─────────────────────────────────────────────
// From T3000-Source/T3000/global_define.h

/// UDP broadcast query command byte sent by the scanner.
pub const UPD_BROADCAST_QRY_MSG: u8 = 100; // 0x64
/// Response command byte from devices answering the scan.
pub const RESPONSE_MSG: u8 = 101; // 0x65 = 100+1
/// Sub-device list info response (not yet parsed, but recognized).
pub const RESPONSE_TOTAL_SUB_INFO: u8 = 0x2f; // 47

/// Port range the scanner tries to bind to (57619..=57623).
pub const SCAN_PORT_RANGE: std::ops::RangeInclusive<u16> = 57619..=57623;

/// Build the 5-byte scan query packet: [0x64, 0x00, 0x00, 0x00, 0x00]
pub fn build_scan_query() -> [u8; 5] {
    [UPD_BROADCAST_QRY_MSG, 0, 0, 0, 0]
}

// ── Response Parser ─────────────────────────────────────────────────
//
// The C++ code reads from a raw byte buffer `BYTE buffer[512]` received via
// `recvfrom`. The layout is interleaved: data byte, reserve byte, data byte, ...
//
// Offsets below are 0-based indices into the raw buffer (not interleaved view).

/// Minimum response length we can parse (command + at least product_id).
const MIN_RESPONSE_LEN: usize = 14;

/// Parse a single device from a raw UDP response buffer.
///
/// Returns `None` if the buffer is too short, has the wrong command byte,
/// or the serial number is zero/invalid.
///
/// This mirrors `AddNetDeviceForRefreshList()` byte-for-byte.
pub fn parse_scan_response(buf: &[u8]) -> Option<DiscoveredDevice> {
    if buf.len() < MIN_RESPONSE_LEN {
        return None;
    }
    if buf[0] != RESPONSE_MSG {
        return None;
    }

    // ── Read interleaved fields ──────────────────────────────────
    // Each field occupies 2 bytes: [value, reserve]. We read only value bytes.

    // Bytes 4-11: serial number (4 u8 values, little-endian u32)
    let serial_low   = buf[4] as u32;
    let serial_2     = buf[6] as u32;
    let serial_3     = buf[8] as u32;
    let serial_4     = buf[10] as u32;
    let serial_number = serial_low | (serial_2 << 8) | (serial_3 << 16) | (serial_4 << 24);

    if serial_number == 0 {
        return None;
    }

    // Byte 12: product_id
    let product_id = buf[12];
    if product_id == 0 {
        return None;
    }

    // Byte 14: modbus_id
    let modbus_id = buf[14];

    // Bytes 16,18,20,22: IP address
    let ip_a = buf[16];
    let ip_b = buf[18];
    let ip_c = buf[20];
    let ip_d = buf[22];
    let ip_address = format!("{}.{}.{}.{}", ip_a, ip_b, ip_c, ip_d);

    // Bytes 24-25: modbus_port (u16 LE)
    let modbus_port = if buf.len() > 25 {
        u16::from_le_bytes([buf[24], buf[25]])
    } else {
        0
    };

    // Bytes 26-27: firmware version (u16 LE)
    let sw_version_raw = if buf.len() > 27 {
        u16::from_le_bytes([buf[26], buf[27]])
    } else {
        0
    };

    // Apply the /10 adjustment for certain products (mirrors C++ logic)
    let firmware_version: f32 = if super::types::firmware_divided_by_10(product_id) {
        sw_version_raw as f32 / 10.0
    } else {
        sw_version_raw as f32
    };

    // Bytes 28-29: hardware version (u16 LE)
    let hardware_version = if buf.len() > 29 {
        u16::from_le_bytes([buf[28], buf[29]])
    } else {
        0
    };

    // Bytes 30-33: parent_serial_number (u32 LE)
    // C++ bug workaround: if all 4 bytes are equal and non-zero (Airlab bug), zero them
    let parent_serial = if buf.len() > 33 {
        let b = [buf[30], buf[31], buf[32], buf[33]];
        if b[0] == b[1] && b[0] == b[2] && b[0] == b[3] && b[0] != 0 {
            0u32
        } else {
            u32::from_le_bytes(b)
        }
    } else {
        0
    };

    // Byte 34-35: object_instance bytes 2,1
    // Byte 36: station_number
    // Bytes 37-56: panel_name (20 bytes)
    // Byte 57-58: object_instance bytes 4,3
    let object_instance = if buf.len() > 35 {
        let oi2 = buf[34] as u32;
        let oi1 = buf[35] as u32;
        oi1 | (oi2 << 8)
    } else {
        0
    };

    let panel_number = if buf.len() > 36 { buf[36] } else { 0 };

    let panel_name = if buf.len() >= 57 {
        let end = 57usize.min(buf.len());
        let name_bytes = &buf[37..end];
        let len = name_bytes.iter().position(|&b| b == 0).unwrap_or(name_bytes.len());
        String::from_utf8_lossy(&name_bytes[..len])
            .trim_end_matches('\0')
            .trim()
            .to_string()
    } else {
        String::new()
    };

    // Upper 16 bits of object_instance
    let object_instance = if buf.len() > 58 {
        let oi4 = buf[57] as u32;
        let oi3 = buf[58] as u32;
        object_instance | (oi3 << 16) | (oi4 << 24)
    } else {
        object_instance
    };

    // Byte 59: isp_mode
    let isp_mode = if buf.len() > 59 { buf[59] } else { 0 };

    // ISP mode 1 (bootloader) or 2 (corrupted) — C++ skips these devices
    if isp_mode == 1 || isp_mode == 2 {
        return None;
    }

    // Bytes 60-61: bacnetip_port (u16 LE)
    let bacnetip_port = if buf.len() > 61 {
        u16::from_le_bytes([buf[60], buf[61]])
    } else {
        0
    };

    // Byte 62: hardware_info
    let hardware_info = if buf.len() > 62 { buf[62] } else { 0 };

    // Byte 63: subnet_protocol
    let subnet_protocol = if buf.len() > 63 { buf[63] } else { 0 };
    // Mirror C++: MODBUS_RS485 → MODBUS_TCPIP (when reported via 0x64, it's actually TCP)
    let subnet_protocol = if subnet_protocol == 6 { 0 } else { subnet_protocol };

    // Optional fields (require buf.len() >= 67)
    let mut command_version: Option<u8> = None;
    let mut subnet_port: Option<u8> = None;
    let mut subnet_baudrate: Option<u8> = None;
    let mut minitype: Option<u8> = None;

    if buf.len() >= 67 {
        command_version = Some(buf[64]);

        if parent_serial != 0 && buf.len() > 66 {
            subnet_port = Some(buf[65]);
            subnet_baudrate = Some(buf[66]);
        }
    }

    if buf.len() >= 68 {
        let minitype_offset = if parent_serial != 0 { 67 } else { 65 };
        if buf.len() > minitype_offset {
            minitype = Some(buf[minitype_offset]);
        }
    }

    Some(DiscoveredDevice {
        serial_number,
        product_id,
        product_name: super::types::product_name(product_id).to_string(),
        modbus_id,
        ip_address,
        modbus_port,
        firmware_version,
        hardware_version,
        parent_serial,
        object_instance,
        panel_number,
        panel_name,
        bacnetip_port,
        hardware_info,
        subnet_protocol,
        isp_mode,
        command_version,
        subnet_port,
        subnet_baudrate,
        minitype,
    })
}
