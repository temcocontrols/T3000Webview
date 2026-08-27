//! Modbus TCP sub-port scanner.
//!
//! Port of the C++ `ScanTCPSubPortThreadNoCritical` (TStatScanner.cpp:393) +
//! `modbusip_to_modbus485` (TStatScanner.cpp:906).
//!
//! Certain T3000 controllers (Minipanel/CM5/ESP32 T3 series) expose downward
//! RS485 sub-ports over Modbus TCP. Each such parent device is connected via
//! TCP, the sub-port and baud rate are programmed (registers 96/97), and then
//! the Modbus address range is scanned *through* the parent's gateway. Devices
//! discovered this way report the parent's serial as their `parent_serial`.

use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

use super::modbus::{self, OnlineCheckError};
use super::types::DiscoveredDevice;

/// Sub-port register (C++ writes 255, 96, sub_com).
const SUB_PORT_REG: u16 = 96;
/// Sub-port baud rate index register (C++ writes 255, 97, baudrate_idx).
const SUB_BAUD_REG: u16 = 97;
/// Broadcast write slave address (C++ uses 255).
const WRITE_SLAVE: u8 = 255;
/// Function 6 = write single register.
const FUNC_WRITE_SINGLE: u8 = 0x06;

/// TCP connect/read timeout.
const TCP_TIMEOUT: Duration = Duration::from_millis(1500);

/// Product IDs that support downward RS485 sub-ports (C++ PM_* constants).
pub const SUB_PORT_PRODUCT_IDS: [u8; 4] = [35, 74, 88, 50];

/// A device discovered via a parent's Modbus TCP sub-port gateway.
#[derive(Debug, Clone)]
pub struct TcpSubDeviceResult {
    /// Parent controller's IP address.
    pub parent_ip: String,
    /// Parent controller's Modbus TCP port.
    pub parent_port: u16,
    /// Sub-port index (0=RS485 Sub, 1=Zigbee, 2=RS485 Main).
    pub sub_port: u8,
    /// Baud rate used on the sub-port.
    pub baudrate: u32,
    /// The discovered device.
    pub device: DiscoveredDevice,
}

/// Summary of a TCP sub-port scan pass.
#[derive(Debug, Clone, Default)]
pub struct TcpSubScanResult {
    /// Devices found through parent gateways.
    pub devices: Vec<TcpSubDeviceResult>,
    /// Parent IPs that could not be connected.
    pub connect_failures: Vec<String>,
}

/// Baud rate indices (mirror C++ `UART_9600`..`UART_115200` enum 5..=9).
const SUB_BAUD_INDICES: [usize; 5] = [5, 6, 7, 8, 9]; // 9600, 19200, 38400, 57600, 115200

/// Scan sub-ports of a single parent controller.
pub fn scan_parent_sub_ports(
    parent: &DiscoveredDevice,
) -> Result<Vec<TcpSubDeviceResult>, String> {
    let ip = parent.ip_address.clone();
    let port = if parent.modbus_port == 0 { 502 } else { parent.modbus_port };

    let mut stream = TcpStream::connect((ip.as_str(), port)).map_err(|e| format!("{}:{} connect: {}", ip, port, e))?;
    stream.set_read_timeout(Some(TCP_TIMEOUT)).ok();
    stream.set_write_timeout(Some(TCP_TIMEOUT)).ok();

    let mut results = Vec::new();
    // C++ iterates sub_com in 0..3
    for sub_com in 0u8..3 {
        for &baud_idx in &SUB_BAUD_INDICES {
            // Program the sub-port and baud rate.
            if write_reg(&mut stream, WRITE_SLAVE, SUB_PORT_REG, sub_com as u16).is_err() {
                continue;
            }
            if write_reg(&mut stream, WRITE_SLAVE, SUB_BAUD_REG, baud_idx as u16).is_err() {
                continue;
            }
            let baud = sub_baud_value(baud_idx);
            let ids = scan_ids_over_tcp(&mut stream, 1, 254);
            for id in ids {
                if let Some(mut dev) = read_device_info_tcp(&mut stream, id) {
                    dev.parent_serial = parent.serial_number;
                    results.push(TcpSubDeviceResult {
                        parent_ip: ip.clone(),
                        parent_port: port,
                        sub_port: sub_com,
                        baudrate: baud,
                        device: dev,
                    });
                }
            }
        }
    }
    Ok(results)
}

/// Write a single register over Modbus TCP (function 6 + CRC, mirroring the DLL).
fn write_reg(
    stream: &mut TcpStream,
    slave: u8,
    addr: u16,
    value: u16,
) -> Result<(), String> {
    let mut frame = [0u8; 8];
    frame[0] = slave;
    frame[1] = FUNC_WRITE_SINGLE;
    frame[2] = (addr >> 8) as u8;
    frame[3] = (addr & 0xFF) as u8;
    frame[4] = (value >> 8) as u8;
    frame[5] = (value & 0xFF) as u8;
    let crc = modbus::crc16(&frame[..6]);
    frame[6] = (crc >> 8) as u8;
    frame[7] = (crc & 0xFF) as u8;
    stream.write_all(&frame).map_err(|e| e.to_string())?;
    // Give the gateway a moment to apply.
    std::thread::sleep(Duration::from_millis(30));
    // Drain any echo.
    let mut sink = [0u8; 32];
    stream.set_nonblocking(true).ok();
    loop {
        match stream.read(&mut sink) {
            Ok(0) | Err(_) => break,
            Ok(_) => continue,
        }
    }
    stream.set_nonblocking(false).ok();
    Ok(())
}

/// Scan Modbus IDs over TCP using the same online-check binary search.
fn scan_ids_over_tcp(stream: &mut TcpStream, dev_lo: u8, dev_hi: u8) -> Vec<u8> {
    let mut found = Vec::new();
    let mut stack = vec![(dev_lo, dev_hi)];
    while let Some((lo, hi)) = stack.pop() {
        if lo > hi {
            continue;
        }
        match online_check_tcp(stream, lo, hi) {
            Ok(Some(id)) => found.push(id),
            Ok(None) => {}
            Err(OnlineCheckError::Collision) => {
                if lo == hi {
                    continue;
                }
                let mid = lo + (hi - lo) / 2;
                stack.push((lo, mid));
                stack.push((mid + 1, hi));
            }
            Err(_) => {}
        }
    }
    found.sort_unstable();
    found.dedup();
    found
}

/// Send the TCP online-check probe and parse the response.
///
/// The TCP variant uses the raw 8-byte RTU-style probe (C++ `CheckTstatOnline`
/// sends `[1,2,3,4,5,6,255,25,devHi,devLo]` on TCP; we mirror the frame bytes
/// for the probe used by `CheckTstatOnline_nocretical` on a socket).
fn online_check_tcp(
    stream: &mut TcpStream,
    dev_lo: u8,
    dev_hi: u8,
) -> Result<Option<u8>, OnlineCheckError> {
    // C++ TCP probe: pval[0..6] = {1,2,3,4,5,6}, pval[6]=255, pval[7]=25, pval[8]=devHi, pval[9]=devLo
    let mut pval = [0u8; 10];
    pval[0] = 1;
    pval[1] = 2;
    pval[2] = 3;
    pval[3] = 4;
    pval[4] = 5;
    pval[5] = 6;
    pval[6] = 255;
    pval[7] = 25;
    pval[8] = dev_hi;
    pval[9] = dev_lo;

    let _ = stream.write_all(&pval);
    std::thread::sleep(Duration::from_millis(100));
    let mut buf = [0u8; 19];
    let mut gval = [0u8; 13];
    match stream.read(&mut buf) {
        Ok(n) if n >= 6 => {
            gval.copy_from_slice(&buf[6..19.min(n)]);
        }
        _ => return Err(OnlineCheckError::NoResponse),
    }
    // Reuse the same parsing as serial but with the TCP header offset handled
    // by the fact that gval[0..] is the meaningful payload. The C++ checks
    // gval[0]==pval[6] (255) and gval[1]==25.
    let p = [255u8, 25];
    let _ = p;
    if gval[0] != 255 || gval[1] != 25 {
        return Err(OnlineCheckError::BadFormat);
    }
    // old/new protocol checks (mirror CheckTstatOnline2)
    if gval[8] == 0 && gval[9] == 0 && gval[10] == 0 && gval[11] == 0 && gval[12] == 0 {
        if gval[0] == 0 && gval[1] == 0 && gval[2] == 0 && gval[3] == 0 && gval[4] == 0 {
            return Err(OnlineCheckError::NoResponse);
        }
        if gval[5] != 0 || gval[6] != 0 {
            return Err(OnlineCheckError::Collision);
        }
        let crc = modbus::crc16(&gval[..3]);
        if gval[3] != ((crc >> 8) as u8) || gval[4] != (crc & 0xFF) as u8 {
            return Err(OnlineCheckError::BadFormat);
        }
        Ok(Some(gval[2]))
    } else {
        if gval[9] != 0 || gval[10] != 0 || gval[11] != 0 || gval[12] != 0 {
            return Err(OnlineCheckError::Collision);
        }
        let crc = modbus::crc16(&gval[..7]);
        if gval[7] != ((crc >> 8) as u8) || gval[8] != (crc & 0xFF) as u8 {
            return Err(OnlineCheckError::BadFormat);
        }
        Ok(Some(gval[2]))
    }
}

/// Read device info registers over TCP.
fn read_device_info_tcp(stream: &mut TcpStream, id: u8) -> Option<DiscoveredDevice> {
    let frame = modbus::build_read_multiple(id, 0, modbus::DEVICE_INFO_REG_COUNT);
    let resp = read_frame_tcp(stream, &frame, 3 + modbus::DEVICE_INFO_REG_COUNT as usize * 2 + 2)?;
    let regs = modbus::parse_read_multiple(id, modbus::DEVICE_INFO_REG_COUNT, &resp)?;

    let serial_number = regs[0] as u32
        | (regs[1] as u32) << 8
        | (regs[2] as u32) << 16
        | (regs[3] as u32) << 24;
    let product_id = regs[7] as u8;
    let hardware_version = regs[8] as u16;
    let sw_ver_raw = regs[4];
    let sw_ver_f = if (240..250).contains(&sw_ver_raw) {
        sw_ver_raw as f32 / 10.0
    } else {
        ((regs[5] as u32 * 256 + regs[4] as u32) as f32) / 10.0
    };

    let mut dev = DiscoveredDevice {
        serial_number,
        product_id,
        product_name: super::types::product_name(product_id).to_string(),
        modbus_id: id,
        ip_address: String::new(), // filled by caller
        modbus_port: 0,
        firmware_version: sw_ver_f,
        hardware_version,
        parent_serial: 0,
        object_instance: 0,
        panel_number: id,
        panel_name: super::types::product_name(product_id).to_string(),
        bacnetip_port: 0,
        hardware_info: 0,
        subnet_protocol: 0,
        isp_mode: 0,
        command_version: None,
        subnet_port: None,
        subnet_baudrate: None,
        minitype: None,
    };

    // Try label at reg 714
    let name_frame = modbus::build_read_multiple(id, modbus::DEVICE_NAME_REG, modbus::DEVICE_NAME_REG_COUNT);
    if let Some(resp) = read_frame_tcp(stream, &name_frame, 3 + modbus::DEVICE_NAME_REG_COUNT as usize * 2 + 2) {
        if let Some(regs) = modbus::parse_read_multiple(id, modbus::DEVICE_NAME_REG_COUNT, &resp) {
            if regs.first() == Some(&0x56) {
                let mut bytes: Vec<u8> = Vec::new();
                for &r in &regs[1..] {
                    bytes.push((r & 0xFF) as u8);
                    bytes.push((r >> 8) as u8);
                }
                if let Some(nul) = bytes.iter().position(|&b| b == 0) {
                    bytes.truncate(nul);
                }
                let s = String::from_utf8_lossy(&bytes).trim().to_string();
                if !s.is_empty() {
                    dev.panel_name = s.chars().take(16).collect();
                }
            }
        }
    }
    Some(dev)
}

/// Write and read a frame over TCP.
fn read_frame_tcp(stream: &mut TcpStream, frame: &[u8], expected_len: usize) -> Option<Vec<u8>> {
    stream.write_all(frame).ok()?;
    std::thread::sleep(Duration::from_millis(80));
    let mut buf = Vec::with_capacity(expected_len);
    let mut chunk = [0u8; 64];
    let deadline = std::time::Instant::now() + TCP_TIMEOUT;
    while buf.len() < expected_len && std::time::Instant::now() < deadline {
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(n) => {
                buf.extend_from_slice(&chunk[..n]);
                if buf.len() >= expected_len {
                    break;
                }
            }
            Err(_) => break,
        }
    }
    if buf.len() < expected_len {
        return None;
    }
    Some(buf)
}

/// Convert a C++ UART baud index to a baud rate value.
fn sub_baud_value(idx: usize) -> u32 {
    match idx {
        5 => 9600,
        6 => 19200,
        7 => 38400,
        8 => 57600,
        _ => 115200,
    }
}

/// Whether a parent product supports downward sub-ports.
pub fn supports_sub_ports(product_id: u8) -> bool {
    SUB_PORT_PRODUCT_IDS.contains(&product_id)
}
