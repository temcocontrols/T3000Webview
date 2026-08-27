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

#[cfg(windows)]
use winapi::shared::minwindef::DWORD;
#[cfg(windows)]
use winapi::um::commapi::{
    EscapeCommFunction, GetCommState, GetCommTimeouts, PurgeComm, SetCommState, SetCommTimeouts,
    SetupComm,
};
#[cfg(windows)]
use winapi::um::fileapi::{CreateFileW, ReadFile, WriteFile, OPEN_EXISTING};
#[cfg(windows)]
use winapi::um::handleapi::{CloseHandle, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use winapi::um::winbase::{
    CLRRTS, COMMTIMEOUTS, DCB, NOPARITY, ONESTOPBIT, PURGE_RXABORT, PURGE_RXCLEAR, PURGE_TXABORT,
    PURGE_TXCLEAR, SETRTS,
};
#[cfg(windows)]
use winapi::um::winnt::{GENERIC_READ, GENERIC_WRITE, HANDLE};

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

// ─────────────────────────────────────────────────────────────────────────────
// Raw Win32 serial port.
//
// Mirrors the C++ `open_com_nocretical` (ModbusDllforVc/common.cpp:5114) and
// `Change_BaudRate_NoCretical` (common.cpp:592) line-for-line.
//
// The `serialport` crate CANNOT be used for the probe: its default DCB forces
// `fRtsControl = RTS_CONTROL_DISABLE` and `fDtrControl = DTR_CONTROL_DISABLE`
// (serialport-4.10.0/src/windows/dcb.rs: `init()` + `set_flow_control(None)`).
// On FTDI/RS485 adapters RTS drives the transceiver direction, so with RTS
// disabled our TX never reaches the bus — T3000 keeps the driver's RTS/DTR
// defaults (RTS_CONTROL_TOGGLE) and finds the device, while we couldn't. This
// type gets the DCB via GetCommState and changes ONLY baud/8/N/1, exactly like
// the C++.
// ─────────────────────────────────────────────────────────────────────────────
#[cfg(windows)]
pub struct Win32Serial {
    handle: HANDLE,
    #[allow(dead_code)]
    name: String,
}

#[cfg(windows)]
impl Win32Serial {
    /// Open a COM port — mirrors C++ `open_com_nocretical`.
    pub fn open(name: &str, baud: u32) -> std::io::Result<Win32Serial> {
        use std::mem::{size_of, zeroed};
        use std::ptr::null_mut;
        unsafe {
            let path = format!("\\\\.\\{}", name);
            let wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
            let handle = CreateFileW(
                wide.as_ptr(),
                GENERIC_READ | GENERIC_WRITE,
                0,
                null_mut(),
                OPEN_EXISTING,
                0, // synchronous handle; the DCB (line state) is identical
                null_mut(),
            );
            if handle == INVALID_HANDLE_VALUE {
                return Err(std::io::Error::last_os_error());
            }
            // SetupComm(64K in, 32K out) — mirrors C++.
            if SetupComm(handle, 1024 * 64, 1024 * 32) == 0 {
                let e = std::io::Error::last_os_error();
                CloseHandle(handle);
                return Err(e);
            }
            let mut dcb: DCB = zeroed();
            dcb.DCBlength = size_of::<DCB>() as DWORD;
            if GetCommState(handle, &mut dcb) == 0 {
                let e = std::io::Error::last_os_error();
                CloseHandle(handle);
                return Err(e);
            }
            // Set baud/8/N/1.
            dcb.BaudRate = baud as DWORD;
            dcb.ByteSize = 8;
            dcb.Parity = NOPARITY as u8;
            dcb.StopBits = ONESTOPBIT as u8;
            // Force RTS_CONTROL_TOGGLE (bits 12-13) — auto-drive RTS during TX.
            // The persistent DCB on this port was left with fRtsControl=Disable
            // (earlier serialport-crate runs, which set RTS/DTR to Disable),
            // which holds the FTDI RS485 transceiver in RX so our TX never
            // reaches the bus. TOGGLE is the correct RS485 direction mode and
            // is what makes T3000's C++ path work.
            dcb.BitFields &= !(0b11 << 12);
            dcb.BitFields |= (0b11u32) << 12; // RTS_CONTROL_TOGGLE
            // Enable DTR too (harmless, and many USB-serial adapters need it
            // high for the far end to be ready).
            dcb.BitFields &= !(0b11 << 4);
            dcb.BitFields |= (0b01u32) << 4; // DTR_CONTROL_ENABLE
            if SetCommState(handle, &mut dcb) == 0 {
                let e = std::io::Error::last_os_error();
                CloseHandle(handle);
                return Err(e);
            }
            let mut ct: COMMTIMEOUTS = zeroed();
            if GetCommTimeouts(handle, &mut ct) == 0 {
                let e = std::io::Error::last_os_error();
                CloseHandle(handle);
                return Err(e);
            }
            ct.ReadIntervalTimeout = 160;
            ct.ReadTotalTimeoutMultiplier = 20;
            ct.ReadTotalTimeoutConstant = 360;
            ct.WriteTotalTimeoutMultiplier = 20;
            ct.WriteTotalTimeoutConstant = 200;
            if SetCommTimeouts(handle, &mut ct) == 0 {
                let e = std::io::Error::last_os_error();
                CloseHandle(handle);
                return Err(e);
            }
            Ok(Win32Serial {
                handle,
                name: name.to_string(),
            })
        }
    }

    /// Change the baud rate — mirrors C++ `Change_BaudRate_NoCretical`.
    pub fn set_baud(&mut self, baud: u32) -> std::io::Result<()> {
        use std::mem::{size_of, zeroed};
        unsafe {
            let mut dcb: DCB = zeroed();
            dcb.DCBlength = size_of::<DCB>() as DWORD;
            if GetCommState(self.handle, &mut dcb) == 0 {
                return Err(std::io::Error::last_os_error());
            }
            dcb.BaudRate = baud as DWORD;
            dcb.ByteSize = 8;
            dcb.Parity = NOPARITY as u8;
            dcb.StopBits = ONESTOPBIT as u8;
            if SetCommState(self.handle, &mut dcb) == 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        }
    }

    /// Purge buffers — mirrors the C++ `PurgeComm` calls before each frame.
    pub fn purge(&mut self, rx: bool, tx: bool) -> std::io::Result<()> {
        unsafe {
            let mut flags = 0u32;
            if rx {
                flags |= PURGE_RXABORT | PURGE_RXCLEAR;
            }
            if tx {
                flags |= PURGE_TXABORT | PURGE_TXCLEAR;
            }
            if PurgeComm(self.handle, flags) == 0 {
                Err(std::io::Error::last_os_error())
            } else {
                Ok(())
            }
        }
    }

    /// Drive the RTS line high/low (optional fallback; the C++ relies on the
    /// DCB, which on FTDI RS485 auto-toggles RTS during TX).
    pub fn set_rts(&mut self, high: bool) -> std::io::Result<()> {
        unsafe {
            let func = if high { SETRTS } else { CLRRTS };
            if EscapeCommFunction(self.handle, func) == 0 {
                Err(std::io::Error::last_os_error())
            } else {
                Ok(())
            }
        }
    }

    /// Read the current DCB line-control state (for diagnostics).
    ///
    /// fRtsControl bits 12-13: 0=Disable 1=Enable 2=Handshake 3=Toggle
    /// fDtrControl bits 4-5:   0=Disable 1=Enable 2=Handshake
    pub fn debug_dcb(&self) -> String {
        use std::mem::{size_of, zeroed};
        unsafe {
            let mut dcb: DCB = zeroed();
            dcb.DCBlength = size_of::<DCB>() as DWORD;
            if GetCommState(self.handle, &mut dcb) == 0 {
                return format!("GetCommState failed: {}", std::io::Error::last_os_error());
            }
            let f_rts = (dcb.BitFields >> 12) & 0b11;
            let f_dtr = (dcb.BitFields >> 4) & 0b11;
            let f_cts = (dcb.BitFields >> 2) & 1;
            let f_dsr = (dcb.BitFields >> 3) & 1;
            format!(
                "baud={} fRtsControl={} (0=Disable 1=Enable 2=Handshake 3=Toggle) fDtrControl={} fOutxCtsFlow={} fOutxDsrFlow={}",
                dcb.BaudRate, f_rts, f_dtr, f_cts, f_dsr
            )
        }
    }

    /// Write bytes (synchronous WriteFile).
    pub fn write(&mut self, data: &[u8]) -> std::io::Result<usize> {
        use std::ptr::null_mut;
        unsafe {
            let mut written: DWORD = 0;
            if WriteFile(
                self.handle,
                data.as_ptr() as *const _,
                data.len() as DWORD,
                &mut written,
                null_mut(),
            ) == 0
            {
                Err(std::io::Error::last_os_error())
            } else {
                Ok(written as usize)
            }
        }
    }

    /// Read bytes (synchronous ReadFile). A COMMTIMEOUTS timeout returns
    /// ERROR_TIMEOUT with any bytes read so far — map it to Ok(partial).
    pub fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        use std::ptr::null_mut;
        use winapi::shared::winerror::ERROR_TIMEOUT;
        unsafe {
            let mut got: DWORD = 0;
            if ReadFile(
                self.handle,
                buf.as_mut_ptr() as *mut _,
                buf.len() as DWORD,
                &mut got,
                null_mut(),
            ) == 0
            {
                let err = std::io::Error::last_os_error();
                if err.raw_os_error() == Some(ERROR_TIMEOUT as i32) {
                    return Ok(got as usize);
                }
                Err(err)
            } else {
                Ok(got as usize)
            }
        }
    }
}

#[cfg(windows)]
impl Drop for Win32Serial {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.handle);
        }
    }
}

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
                let n = found.len();
                for d in &found {
                    tracing::info!(
                        "[lan_scan] serial {} found SN={} PID={} ModbusID={} @{} baud name={}",
                        port,
                        d.device.serial_number,
                        d.device.product_id,
                        d.device.modbus_id,
                        d.baudrate,
                        d.device.panel_name,
                    );
                }
                tracing::info!("[lan_scan] serial {} scan done: {} devices found", port, n);
                devices.append(&mut found);
            }
            Err(e) => {
                tracing::info!("[lan_scan] serial {} scan failed: {}", port, e);
                port_open_failures.push(format!("{}: {}", port, e));
            }
        }
    }
    tracing::info!(
        "[lan_scan] serial scan done: {} devices found across {} COM port(s)",
        devices.len(),
        ports.len()
    );

    SerialScanResult { devices, port_open_failures, warnings }
}

/// Scan a single COM port at each baud rate, polling Modbus IDs `dev_lo..=dev_hi`.
pub fn scan_com_port(
    port: &str,
    baudrates: &[u32],
    dev_lo: u8,
    dev_hi: u8,
) -> Result<Vec<SerialDeviceResult>, String> {
    if baudrates.is_empty() {
        return Ok(Vec::new());
    }
    // Open once with the exact C++ DCB (driver RTS/DTR defaults preserved),
    // then change baud per iteration — mirrors `ScanComThreadNoCritical`.
    let mut port_handle = Win32Serial::open(port, baudrates[0])
        .map_err(|e| format!("cannot open {}: {}", port, e))?;

    let mut results = Vec::new();
    let mut mstp_checked = false;
    let mut mstp_detected = false;

    for &baud in baudrates {
        if port_handle.set_baud(baud).is_err() {
            continue;
        }
        // Flush stale RX data.
        let _ = port_handle.purge(true, true);
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
    }
    Ok(results)
}

/// Send the broadcast online-check probe and collect all responding Modbus IDs.
///
/// Mirrors `binarySearchforComDevice` + `CheckTstatOnline2`: broadcast a probe
/// covering `dev_lo..=dev_hi`; a single responder returns its address; a
/// collision (more than one device) is resolved by splitting the range in half.
fn scan_modbus_ids(
    port: &mut Win32Serial,
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
                found.push(id);
            }
            Ok(None) => { /* no device in range */ }
            Err(OnlineCheckError::Collision) | Err(OnlineCheckError::BadFormat) => {
                if lo == hi {
                    // Collision/CRC error on a single ID — device ID conflict; skip.
                    continue;
                }
                // C++ `binarySearchforComDevice` splits the range on both -3
                // (collision) AND -2 (CRC error) — mirror that so devices that
                // answer a broad probe with a CRC error are still found.
                let mid = lo + (hi - lo) / 2;
                stack.push((lo, mid));
                stack.push((mid + 1, hi));
            }
            Err(_) => { /* no response / transient — skip range */ }
        }
    }
    found.sort_unstable();
    found.dedup();
    found
}

/// Send one online-check probe for `dev_lo..=dev_hi` and parse the response.
fn online_check(
    port: &mut Win32Serial,
    dev_lo: u8,
    dev_hi: u8,
) -> Result<Option<u8>, OnlineCheckError> {
    let frame = modbus::build_online_check(dev_lo, dev_hi);
    if !write_frame(port, &frame) {
        return Err(OnlineCheckError::PortClosed);
    }
    std::thread::sleep(Duration::from_millis(LATENCY_MS));

    // Read into a fixed 13-byte buffer (like C++ `gval[13]`); a short read is
    // zero-padded so the parser never indexes out of bounds.
    let mut gval = [0u8; 13];
    let n = match port.read(&mut gval) {
        Ok(n) => n,
        Err(_) => return Err(OnlineCheckError::NoResponse),
    };
    if n == 0 {
        return Err(OnlineCheckError::NoResponse);
    }
    modbus::parse_online_check(&frame, &gval)
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
    port: &mut Win32Serial,
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
    port: &mut Win32Serial,
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
                    // High byte first, then low byte — matches the C++ label
                    // decode (htons() in `binarySearchforComDevice` and
                    // `GetTextFromRegLength()`).
                    bytes.push((r >> 8) as u8);
                    bytes.push((r & 0xFF) as u8);
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
    port: &mut Win32Serial,
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
/// Mirrors the C++ write path (ClearCommError/PurgeComm → WriteFile). The RS485
/// transceiver direction is handled by the DCB, which we leave at the driver
/// default (RTS_CONTROL_TOGGLE on FTDI adapters) — exactly like the C++.
/// An optional manual RTS toggle can be forced with env `T3_SCAN_RTS=1`.
fn write_frame(port: &mut Win32Serial, frame: &[u8]) -> bool {
    let _ = port.purge(true, false);
    if manual_rts_toggle() {
        let _ = port.set_rts(true);
        std::thread::sleep(Duration::from_millis(1));
    }
    let written = port.write(frame).unwrap_or(0);
    // Let the last byte shift out before releasing the bus.
    std::thread::sleep(Duration::from_millis(2));
    if manual_rts_toggle() {
        let _ = port.set_rts(false);
    }
    written == frame.len()
}

/// Read env `T3_SCAN_RTS=1` to manually toggle RTS around writes.
fn manual_rts_toggle() -> bool {
    std::env::var("T3_SCAN_RTS").map(|v| v == "1").unwrap_or(false)
}

/// Detect BACnet MSTP data on the line (mirror `Test_Comport` / `check_bacnet_data`).
///
/// Listens briefly and counts occurrences of the `0x55 0xFF` MSTP preamble;
/// >= 3 indicates BACnet MSTP is present on the bus at this baud rate.
fn probe_mstp(
    port: &mut Win32Serial,
    _baud: u32,
) -> bool {
    let _ = port.purge(true, true);
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
