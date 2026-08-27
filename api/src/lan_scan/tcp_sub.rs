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

/// TCP connect/read timeout for probes. The C++ uses SO_RCVTIMEO=3000ms; we
/// use 1s (T3 gateways respond in ms when a device is present, so this only
/// shortens the "no device" case).
const TCP_TIMEOUT: Duration = Duration::from_millis(1000);
/// Max wait for a write echo — a real Modbus TCP gateway echoes a write within
/// ms, so a gateway that doesn't echo is dead and is skipped fast.
const WRITE_ECHO_TIMEOUT: Duration = Duration::from_millis(500);

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
/// C++ `UART_19200` index (6) — the baud rate forced on sub-port 1 (Zigbee).
const UART_19200_IDX: usize = 6;

/// Scan sub-ports of a single parent controller.
pub fn scan_parent_sub_ports(
    parent: &DiscoveredDevice,
) -> Result<Vec<TcpSubDeviceResult>, String> {
    let ip = parent.ip_address.clone();
    let port = if parent.modbus_port == 0 { 502 } else { parent.modbus_port };

    let mut stream = match TcpStream::connect((ip.as_str(), port)) {
        Ok(s) => s,
        Err(e) => {
            tracing::info!(
                "[lan_scan] tcp-sub parent {}:{} (SN={} PID={}) connect failed: {}",
                ip,
                port,
                parent.serial_number,
                parent.product_id,
                e
            );
            return Err(format!("{}:{} connect: {}", ip, port, e));
        }
    };
    stream.set_read_timeout(Some(TCP_TIMEOUT)).ok();
    stream.set_write_timeout(Some(TCP_TIMEOUT)).ok();

    // Per-connection Modbus TCP transaction id (C++ keeps a global `trans_id`).
    let mut trans_id: u16 = 1;

    let mut results = Vec::new();
    // C++ iterates sub_com in 0..3
    for sub_com in 0u8..3 {
        for &baud_idx in &SUB_BAUD_INDICES {
            // C++ `ScanTCPSubPortThreadNoCritical`: sub-port 1 (Zigbee) is only
            // probed when the parent reports hardware_info == 0x74, and its baud
            // is forced to 19200.
            if sub_com == 1 {
                if parent.hardware_info != 0x74 {
                    break;
                }
            }
            // Program the sub-port and baud rate (C++ `write_one_multy_thread`).
            if write_reg(&mut stream, &mut trans_id, WRITE_SLAVE, SUB_PORT_REG, sub_com as u16).is_err() {
                continue;
            }
            if write_reg(&mut stream, &mut trans_id, WRITE_SLAVE, SUB_BAUD_REG, baud_idx as u16).is_err() {
                continue;
            }
            let baud = if sub_com == 1 {
                sub_baud_value(UART_19200_IDX)
            } else {
                sub_baud_value(baud_idx)
            };
            let ids = scan_ids_over_tcp(&mut stream, 1, 254);
            for id in ids {
                if let Some(mut dev) = read_device_info_tcp(&mut stream, &mut trans_id, id) {
                    dev.parent_serial = parent.serial_number;
                    tracing::info!(
                        "[lan_scan] tcp-sub parent {}:{} found SN={} PID={} ModbusID={} sub_port={} @{} baud",
                        ip,
                        port,
                        dev.serial_number,
                        dev.product_id,
                        dev.modbus_id,
                        sub_com,
                        baud
                    );
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
    tracing::info!(
        "[lan_scan] tcp-sub parent {}:{} (SN={} PID={}) scan done: {} devices found",
        ip,
        port,
        parent.serial_number,
        parent.product_id,
        results.len()
    );
    Ok(results)
}

/// Write a single register over Modbus TCP using a 12-byte MBAP frame
/// (function 6). Mirrors C++ `Write_One_Multy_Thread` (g_Commu_type==1):
/// `[trans_hi, trans_lo, 0, 0, 0, 6, slave, 6, addr_hi, addr_lo, val_hi, val_lo]`,
/// then waits for the echo and verifies the 6-byte PDU matches.
#[doc(hidden)]
pub fn write_reg(
    stream: &mut TcpStream,
    trans_id: &mut u16,
    slave: u8,
    addr: u16,
    value: u16,
) -> Result<(), String> {
    let (th, tl) = next_trans_id(trans_id);
    let mut frame = [0u8; 12];
    frame[0] = th;              // MBAP transaction id hi
    frame[1] = tl;              // MBAP transaction id lo
    frame[2] = 0;               // protocol id hi
    frame[3] = 0;               // protocol id lo
    frame[4] = 0;               // length hi
    frame[5] = 6;               // length lo (unit id + func + addr + val)
    frame[6] = slave;
    frame[7] = FUNC_WRITE_SINGLE;
    frame[8] = (addr >> 8) as u8;
    frame[9] = (addr & 0xFF) as u8;
    frame[10] = (value >> 8) as u8;
    frame[11] = (value & 0xFF) as u8;
    stream.write_all(&frame).map_err(|e| e.to_string())?;
    // Give the gateway a moment to apply.
    std::thread::sleep(Duration::from_millis(30));
    // Echo response is 6-byte MBAP + 6-byte PDU; C++ compares gval[0..5] to pval[0..5].
    let mut resp = [0u8; 12];
    let got = read_some(stream, &mut resp, 12, WRITE_ECHO_TIMEOUT);
    if got < 12 {
        return Err("write_reg: no echo response".to_string());
    }
    for i in 6..12 {
        if resp[i] != frame[i] {
            return Err("write_reg: echo mismatch".to_string());
        }
    }
    Ok(())
}

/// Scan Modbus IDs over TCP using the same online-check binary search.
///
/// C++ `modbusip_to_modbus485` splits on both -3 (collision) and -2 (CRC
/// error), so we do the same for the TCP variant.
fn scan_ids_over_tcp(
    stream: &mut TcpStream,
    dev_lo: u8,
    dev_hi: u8,
) -> Vec<u8> {
    let mut found = Vec::new();
    let mut stack = vec![(dev_lo, dev_hi)];
    while let Some((lo, hi)) = stack.pop() {
        if lo > hi {
            continue;
        }
        match online_check_tcp(stream, lo, hi) {
            Ok(Some(id)) => found.push(id),
            Ok(None) => {}
            Err(OnlineCheckError::Collision) | Err(OnlineCheckError::BadFormat) => {
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

/// Send the TCP online-check probe `[1,2,3,4,5,6,255,25,devHi,devLo]` and parse
/// the response.
///
/// Mirrors C++ `CheckTstatOnline2_a_nocretical` (bComm_Type==1): the response's
/// 6-byte MBAP prefix is skipped, and the CRC bytes are NOT validated (the C++
/// comments those checks out on the TCP path).
#[doc(hidden)]
pub fn online_check_tcp(
    stream: &mut TcpStream,
    dev_lo: u8,
    dev_hi: u8,
) -> Result<Option<u8>, OnlineCheckError> {
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

    if stream.write_all(&pval).is_err() {
        return Err(OnlineCheckError::PortClosed);
    }
    std::thread::sleep(Duration::from_millis(100));
    let mut rv = [0u8; 100];
    let n = match stream.read(&mut rv) {
        Ok(n) => n,
        Err(_) => return Err(OnlineCheckError::NoResponse),
    };
    if n < 6 {
        return Err(OnlineCheckError::NoResponse);
    }
    // The first 6 bytes are the MBAP prefix; the meaningful payload follows
    // (zero-padded to 13 so the checks below never index out of bounds).
    let mut gval = [0u8; 13];
    let avail = (n - 6).min(13);
    gval[..avail].copy_from_slice(&rv[6..6 + avail]);

    // old protocol is selected when gval[8..12] AND gval[3..6] are all zero
    // (mirror the C++ condition).
    if gval[8] == 0 && gval[9] == 0 && gval[10] == 0 && gval[11] == 0 && gval[12] == 0
        && gval[3] == 0 && gval[4] == 0 && gval[5] == 0 && gval[6] == 0
    {
        if gval[0] == 0 && gval[1] == 0 && gval[2] == 0 && gval[3] == 0 && gval[4] == 0 {
            return Err(OnlineCheckError::NoResponse);
        }
        if gval[5] != 0 || gval[6] != 0 {
            return Err(OnlineCheckError::Collision);
        }
        if gval[0] != 255 || gval[1] != 25 {
            return Err(OnlineCheckError::BadFormat);
        }
        Ok(Some(gval[2]))
    } else {
        if gval[9] != 0 || gval[10] != 0 || gval[11] != 0 || gval[12] != 0 {
            return Err(OnlineCheckError::Collision);
        }
        if gval[0] != 255 || gval[1] != 25 {
            return Err(OnlineCheckError::BadFormat);
        }
        Ok(Some(gval[2]))
    }
}

/// Read device info registers over TCP.
fn read_device_info_tcp(
    stream: &mut TcpStream,
    trans_id: &mut u16,
    id: u8,
) -> Option<DiscoveredDevice> {
    let regs = read_regs_tcp(stream, trans_id, id, 0, modbus::DEVICE_INFO_REG_COUNT)?;

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
    if let Some(regs) = read_regs_tcp(stream, trans_id, id, modbus::DEVICE_NAME_REG, modbus::DEVICE_NAME_REG_COUNT) {
        if regs.first() == Some(&0x56) {
            let mut bytes: Vec<u8> = Vec::new();
            for &r in &regs[1..] {
                // High byte first, then low byte — matches the C++ label decode.
                bytes.push((r >> 8) as u8);
                bytes.push((r & 0xFF) as u8);
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
    Some(dev)
}

/// Read `count` registers starting at `start_addr` (function 3) over Modbus TCP.
///
/// Mirrors C++ `read_multi2_nocretical` (g_Commu_type==1): sends a 12-byte MBAP
/// frame, strips the 6-byte MBAP header from the response, and — as in the C++
/// — does NOT validate the trailing CRC on TCP.
#[doc(hidden)]
pub fn read_regs_tcp(
    stream: &mut TcpStream,
    trans_id: &mut u16,
    slave: u8,
    start_addr: u16,
    count: u16,
) -> Option<Vec<u16>> {
    let (th, tl) = next_trans_id(trans_id);
    let mut frame = [0u8; 12];
    frame[0] = th;
    frame[1] = tl;
    frame[2] = 0;
    frame[3] = 0;
    frame[4] = 0;
    frame[5] = 6;
    frame[6] = slave;
    frame[7] = modbus::FUNC_READ_MULTIPLE;
    frame[8] = (start_addr >> 8) as u8;
    frame[9] = (start_addr & 0xFF) as u8;
    frame[10] = (count >> 8) as u8;
    frame[11] = (count & 0xFF) as u8;
    stream.write_all(&frame).ok()?;
    std::thread::sleep(Duration::from_millis(80));

    // Response = 6-byte MBAP header + [slave, 3, byte_count, data...] (+ CRC).
    let payload_len = 3 + count as usize * 2;
    let mut buf = vec![0u8; 6 + payload_len + 2];
    let got = read_some(stream, &mut buf, 6 + payload_len, TCP_TIMEOUT);
    if got < 6 + payload_len {
        return None;
    }
    let p = &buf[6..6 + payload_len];
    if p[0] != slave || p[1] != modbus::FUNC_READ_MULTIPLE || p[2] != (count * 2) as u8 {
        return None;
    }
    let mut regs = Vec::with_capacity(count as usize);
    for i in 0..count as usize {
        regs.push(((p[3 + 2 * i] as u16) << 8) | p[4 + 2 * i] as u16);
    }
    Some(regs)
}

/// Increment the Modbus TCP transaction id and return its two bytes.
fn next_trans_id(trans_id: &mut u16) -> (u8, u8) {
    *trans_id = trans_id.wrapping_add(1);
    if *trans_id == 0 {
        *trans_id = 1;
    }
    ((*trans_id >> 8) as u8, (*trans_id & 0xFF) as u8)
}

/// Read up to `need` bytes from the stream (or until `timeout`), returning how
/// many were actually read.
fn read_some(stream: &mut TcpStream, buf: &mut [u8], need: usize, timeout: Duration) -> usize {
    let mut got = 0usize;
    let deadline = std::time::Instant::now() + timeout;
    while got < need && std::time::Instant::now() < deadline {
        match stream.read(&mut buf[got..]) {
            Ok(0) => break,
            Ok(n) => got += n,
            Err(_) => break,
        }
    }
    got
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
