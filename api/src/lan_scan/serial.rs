//! Serial (COM/USB) Modbus RTU scanner for T3000 devices.
//!
//! Port of the C++ serial scan path:
//! - `GetSerialComPortNumber1()`        (global_function.cpp:989)  COM enumeration via registry
//! - `ScanComDevice()` / `ScanComThreadNoCritical` (TStatScanner.cpp:351/518)
//! - `binarySearchforComDevice()`       (TStatScanner.cpp:1324)    Modbus ID search
//! - `read_multi2_nocretical()`         (common.cpp:6982)          read device info
//!
//! Devices on a serial/RS485 line (including USB virtual COM ports) do NOT
//! answer the UDP broadcast, so they can only be found by polling each COM
//! port at the supported baud rates and scanning the Modbus address range.

use std::time::Duration;

use super::modbus::{self, OnlineCheckError};
use super::types::DiscoveredDevice;

/// Baud rates probed on each COM port — mirrors C++ `ArrayBaudate`.
pub const PROBE_BAUDRATES: [u32; 6] = [9600, 19200, 38400, 57600, 76800, 115200];

/// Min Modbus device address to probe (inclusive).
const DEV_ID_MIN: u8 = 1;
/// Max Modbus device address to probe (inclusive).
const DEV_ID_MAX: u8 = 254;

/// Serial transaction latency (ms) — mirrors C++ `LATENCY_TIME_COM`.
const LATENCY_MS: u64 = 75;
/// Timeout for one read after sending a frame.
const READ_TIMEOUT_MS: u64 = 200;

/// A device discovered on a serial port.
#[derive(Debug, Clone)]
pub struct SerialDeviceResult {
    /// The COM port name, e.g. "COM3".
    pub com_port: String,
    /// Baud rate at which the device answered.
    pub baudrate: u32,
    /// The device as a `DiscoveredDevice` (ip_address holds the COM name).
    pub device: DiscoveredDevice,
    /// Whether BACnet MSTP data was detected on the line at this port.
    pub mstp_detected: bool,
}

/// Summary of a serial scan pass.
#[derive(Debug, Clone)]
pub struct SerialScanResult {
    /// Devices found across all COM ports.
    pub devices: Vec<SerialDeviceResult>,
    /// COM ports that were enumerated but could not be opened.
    pub port_open_failures: Vec<String>,
    /// Non-fatal warnings.
    pub warnings: Vec<String>,
}

/// Enumerate available serial ports.
///
/// On Windows this reads `HKLM\HARDWARE\DEVICEMAP\SERIALCOMM` (same source as
/// the C++ `GetSerialComPortNumber1`), so USB virtual COM ports are included.
pub fn list_com_ports() -> Vec<String> {
    let mut ports: Vec<String> = Vec::new();
    if let Ok(list) = serialport::available_ports() {
        for p in list {
            ports.push(p.port_name);
        }
    }
    ports.sort();
    ports
}

/// Scan every available COM port for T3000 devices.
pub fn scan_all_serial_ports(
    baudrates: Option<&[u32]>,
    dev_lo: u8,
    dev_hi: u8,
) -> SerialScanResult {
    let baudrates: &[u32] = baudrates.unwrap_or(&PROBE_BAUDRATES);
    let ports = list_com_ports();
    let mut devices = Vec::new();
    let mut port_open_failures = Vec::new();
    let warnings = Vec::new();

    for port in &ports {
        match scan_com_port(port, baudrates, dev_lo, dev_hi) {
            Ok(mut found) => {
                devices.append(&mut found);
            }
            Err(e) => {
                port_open_failures.push(format!("{}: {}", port, e));
            }
        }
    }

    SerialScanResult { devices, port_open_failures, warnings }
}

/// Scan a single COM port at each baud rate, polling Modbus IDs `dev_lo..=dev_hi`.
pub fn scan_com_port(
    port: &str,
    baudrates: &[u32],
    dev_lo: u8,
    dev_hi: u8,
) -> Result<Vec<SerialDeviceResult>, String> {
    let mut results = Vec::new();
    let mut mstp_checked = false;
    let mut mstp_detected = false;

    for &baud in baudrates {
        let open_res = serialport::new(port, baud)
            .timeout(Duration::from_millis(READ_TIMEOUT_MS))
            .open();
        let mut port_handle = match open_res {
            Ok(p) => p,
            Err(_) => continue, // next baud; if all fail we treat as open failure
        };
        // Flush stale RX data.
        let _ = port_handle.clear(serialport::ClearBuffer::All);
        std::thread::sleep(Duration::from_millis(20));

        // First baud: detect BACnet MSTP data on the line (mirror Test_Comport).
        if !mstp_checked {
            mstp_detected = probe_mstp(&mut port_handle, baud);
            mstp_checked = true;
        }

        // Scan the Modbus ID range (binary-search style like the C++).
        let found_ids = scan_modbus_ids(&mut port_handle, dev_lo, dev_hi, baud);
        for id in found_ids {
            if let Some(dev) = read_device_info(&mut port_handle, id, port, baud) {
                results.push(SerialDeviceResult {
                    com_port: port.to_string(),
                    baudrate: baud,
                    device: dev,
                    mstp_detected,
                });
            }
        }
        drop(port_handle);
    }

    if results.is_empty() {
        // No device answered on any baud — verify the port actually opens once.
        let any_open = baudrates.iter().any(|&b| {
            serialport::new(port, b)
                .timeout(Duration::from_millis(READ_TIMEOUT_MS))
                .open()
                .is_ok()
        });
        if !any_open {
            return Err("cannot open COM port".to_string());
        }
    }
    Ok(results)
}

/// Send the broadcast online-check probe and collect all responding Modbus IDs.
///
/// Mirrors `binarySearchforComDevice` + `CheckTstatOnline2`: broadcast a probe
/// covering `dev_lo..=dev_hi`; a single responder returns its address; a
/// collision (more than one device) is resolved by splitting the range in half.
fn scan_modbus_ids(
    port: &mut Box<dyn serialport::SerialPort>,
    dev_lo: u8,
    dev_hi: u8,
    _baud: u32,
) -> Vec<u8> {
    let mut found = Vec::new();
    let mut stack = vec![(dev_lo, dev_hi)];
    while let Some((lo, hi)) = stack.pop() {
        if lo > hi || lo < DEV_ID_MIN || hi > DEV_ID_MAX {
            continue;
        }
        match online_check(port, lo, hi) {
            Ok(Some(id)) => {
                if id >= lo && id <= hi {
                    found.push(id);
                } else {
                    // Responder reported an address outside the range we probed;
                    // probe it directly.
                    found.push(id);
                }
            }
            Ok(None) => { /* no device in range */ }
            Err(OnlineCheckError::Collision) => {
                if lo == hi {
                    // Still colliding on a single ID — device ID conflict; skip.
                    continue;
                }
                let mid = lo + (hi - lo) / 2;
                stack.push((lo, mid));
                stack.push((mid + 1, hi));
            }
            Err(_) => { /* CRC / format / transient — skip range */ }
        }
    }
    found.sort_unstable();
    found.dedup();
    found
}

/// Send one online-check probe for `dev_lo..=dev_hi` and parse the response.
fn online_check(
    port: &mut Box<dyn serialport::SerialPort>,
    dev_lo: u8,
    dev_hi: u8,
) -> Result<Option<u8>, OnlineCheckError> {
    let frame = modbus::build_online_check(dev_lo, dev_hi);
    if !write_frame(port, &frame) {
        return Err(OnlineCheckError::PortClosed);
    }
    std::thread::sleep(Duration::from_millis(LATENCY_MS));

    let mut buf = [0u8; 13];
    let n = match port.read(&mut buf) {
        Ok(n) => n,
        Err(_) => return Err(OnlineCheckError::NoResponse),
    };
    if n == 0 {
        return Err(OnlineCheckError::NoResponse);
    }
    modbus::parse_online_check(&frame, &buf[..n.min(13)])
}

/// Read device info registers for a confirmed Modbus ID.
///
/// Registers 0..=9 (C++ `SerialNum[10]`):
/// - [0..3] serial number (little-endian u32)
/// - [4]    software version (may be /10)
/// - [5]    software version high byte (old devices)
/// - [7]    product type
/// - [8]    hardware version
/// Register 714+ carries an optional device label.
fn read_device_info(
    port: &mut Box<dyn serialport::SerialPort>,
    id: u8,
    com_port: &str,
    baud: u32,
) -> Option<DiscoveredDevice> {
    // Read registers 0..9
    let frame = modbus::build_read_multiple(id, 0, modbus::DEVICE_INFO_REG_COUNT);
    let resp = read_frame(port, &frame, 3 + modbus::DEVICE_INFO_REG_COUNT as usize * 2 + 2)?;
    let regs = modbus::parse_read_multiple(id, modbus::DEVICE_INFO_REG_COUNT, &resp)?;

    let serial_number = regs[0] as u32
        | (regs[1] as u32) << 8
        | (regs[2] as u32) << 16
        | (regs[3] as u32) << 24;
    let product_id = regs[7] as u8;
    let hardware_version = regs[8] as u16;

    // Software version (mirror C++ logic)
    let sw_ver_raw = regs[4];
    let sw_ver_f = if (240..250).contains(&sw_ver_raw) {
        sw_ver_raw as f32 / 10.0
    } else {
        ((regs[5] as u32 * 256 + regs[4] as u32) as f32) / 10.0
    };

    // Try to read the device label at register 714 (10 regs).
    let panel_name = read_device_label(port, id, product_id);

    let device = DiscoveredDevice {
        serial_number,
        product_id,
        product_name: super::types::product_name(product_id).to_string(),
        modbus_id: id,
        ip_address: com_port.to_string(), // COM port instead of IP for serial devices
        modbus_port: 0,
        firmware_version: sw_ver_f,
        hardware_version,
        parent_serial: 0,
        object_instance: 0,
        panel_number: id,
        panel_name,
        bacnetip_port: 0,
        hardware_info: 0,
        subnet_protocol: 0,
        isp_mode: 0,
        command_version: None,
        subnet_port: None,
        subnet_baudrate: None,
        minitype: None,
    };
    // Track the baud used in the diagnostic-free side channel (not stored).
    let _ = baud;
    Some(device)
}

/// Read and decode the device label register block (714..=723).
fn read_device_label(
    port: &mut Box<dyn serialport::SerialPort>,
    id: u8,
    product_id: u8,
) -> String {
    let frame = modbus::build_read_multiple(id, modbus::DEVICE_NAME_REG, modbus::DEVICE_NAME_REG_COUNT);
    if let Some(resp) = read_frame(port, &frame, 3 + modbus::DEVICE_NAME_REG_COUNT as usize * 2 + 2) {
        if let Some(regs) = modbus::parse_read_multiple(id, modbus::DEVICE_NAME_REG_COUNT, &resp) {
            // Marker 0x56 in reg[0] means the label is a string.
            if regs.first() == Some(&0x56) {
                let mut bytes: Vec<u8> = Vec::new();
                for &r in &regs[1..] {
                    let hi = (r >> 8) as u8;
                    let lo = (r & 0xFF) as u8;
                    // C++ swaps hi/lo per word.
                    bytes.push(lo);
                    bytes.push(hi);
                }
                // Trim at first NUL.
                if let Some(nul) = bytes.iter().position(|&b| b == 0) {
                    bytes.truncate(nul);
                }
                let s = String::from_utf8_lossy(&bytes).trim().to_string();
                if !s.is_empty() {
                    return s.chars().take(16).collect();
                }
            }
        }
    }
    super::types::product_name(product_id).to_string()
}

/// Write a frame and read exactly the expected response length.
fn read_frame(
    port: &mut Box<dyn serialport::SerialPort>,
    frame: &[u8],
    expected_len: usize,
) -> Option<Vec<u8>> {
    if !write_frame(port, frame) {
        return None;
    }
    std::thread::sleep(Duration::from_millis(LATENCY_MS));

    let mut buf = Vec::with_capacity(expected_len);
    let mut chunk = [0u8; 64];
    let deadline = std::time::Instant::now() + Duration::from_millis(READ_TIMEOUT_MS);
    while buf.len() < expected_len && std::time::Instant::now() < deadline {
        match port.read(&mut chunk) {
            Ok(0) => break,
            Ok(n) => {
                buf.extend_from_slice(&chunk[..n]);
                if buf.len() >= expected_len {
                    break;
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => break,
            Err(_) => break,
        }
    }
    if buf.len() < expected_len {
        return None;
    }
    Some(buf)
}

/// Write a frame to the port.
///
/// When `RTS_TOGGLE` is enabled (default for RS485 adapters), RTS is driven
/// high during transmission and released afterward — many USB-RS485 dongles
/// (FT232R + MAX485) use RTS to flip the transceiver to transmit mode. Without
/// this the probe is written to the chip but never driven onto the bus.
pub static RTS_TOGGLE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);

fn write_frame(port: &mut Box<dyn serialport::SerialPort>, frame: &[u8]) -> bool {
    let _ = port.clear(serialport::ClearBuffer::Input);
    if RTS_TOGGLE.load(std::sync::atomic::Ordering::Relaxed) {
        let _ = port.write_request_to_send(true); // drive bus for TX
        std::thread::sleep(Duration::from_millis(1));
    }
    let written = port.write(frame).unwrap_or(0);
    // Let the last byte shift out before releasing the bus.
    std::thread::sleep(Duration::from_millis(2));
    if RTS_TOGGLE.load(std::sync::atomic::Ordering::Relaxed) {
        let _ = port.write_request_to_send(false); // back to RX
    }
    written == frame.len()
}

/// Detect BACnet MSTP data on the line (mirror `Test_Comport` / `check_bacnet_data`).
///
/// Listens briefly and counts occurrences of the `0x55 0xFF` MSTP preamble;
/// >= 3 indicates BACnet MSTP is present on the bus at this baud rate.
fn probe_mstp(
    port: &mut Box<dyn serialport::SerialPort>,
    _baud: u32,
) -> bool {
    let _ = port.clear(serialport::ClearBuffer::All);
    // Wait for any traffic.
    let deadline = std::time::Instant::now() + Duration::from_millis(300);
    let mut bytes: Vec<u8> = Vec::new();
    let mut chunk = [0u8; 64];
    while std::time::Instant::now() < deadline && bytes.len() < 400 {
        match port.read(&mut chunk) {
            Ok(0) => continue,
            Ok(n) => {
                bytes.extend_from_slice(&chunk[..n]);
                if bytes.len() >= 400 {
                    break;
                }
            }
            Err(_) => break,
        }
    }
    check_mstp_data(&bytes)
}

/// Count `0x55 0xFF` token pairs; >= 3 ⇒ MSTP (mirror C++ `check_bacnet_data`).
pub fn check_mstp_data(bytes: &[u8]) -> bool {
    let mut token_count = 0u32;
    let mut no_token = 0u32;
    let mut i = 0usize;
    while i + 1 < bytes.len() {
        if no_token > 100 {
            return false;
        }
        if bytes[i] != 0x55 {
            no_token += 1;
            i += 1;
            continue;
        }
        if bytes[i + 1] != 0xFF {
            no_token += 1;
            i += 1;
            continue;
        }
        i += 1;
        token_count += 1;
        if token_count >= 3 {
            return true;
        }
    }
    false
}
