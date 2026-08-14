//! Rust domain types for T3000 LAN scan results.
//!
//! Mirrors the C++ `refresh_net_device` struct from
//! `T3000-Source/T3000/global_function.cpp:AddNetDeviceForRefreshList`.

use serde::Serialize;

/// A device discovered via UDP broadcast scan (command 0x64/0x65 protocol).
#[derive(Debug, Clone, Serialize)]
pub struct DiscoveredDevice {
    /// Unique serial number (u32)
    pub serial_number: u32,
    /// Product model ID (see ProductModel.h)
    pub product_id: u8,
    /// Product name string lookup from product_id
    pub product_name: String,
    /// Modbus device address
    pub modbus_id: u8,
    /// IPv4 address as dotted string
    pub ip_address: String,
    /// Modbus TCP port
    pub modbus_port: u16,
    /// Firmware version (already adjusted: /10 for certain products)
    pub firmware_version: f32,
    /// Hardware revision
    pub hardware_version: u16,
    /// Parent device serial (0 = top-level device)
    pub parent_serial: u32,
    /// BACnet object instance
    pub object_instance: u32,
    /// Panel/station number (1-254)
    pub panel_number: u8,
    /// Device label/name from the device itself (max 20 chars)
    pub panel_name: String,
    /// BACnet/IP port
    pub bacnetip_port: u16,
    /// Hardware info flag (1 = present)
    pub hardware_info: u8,
    /// Subnet protocol: 0=old modbus, 10=bacnet mstp, 12=mstp-to-modbus
    pub subnet_protocol: u8,
    /// ISP/bootloader mode: 0=app, 1=bootloader, 2=corrupted
    pub isp_mode: u8,
    /// Command protocol version
    pub command_version: Option<u8>,
    /// Subnet serial port number (if parent_serial != 0)
    pub subnet_port: Option<u8>,
    /// Subnet baud rate index (if parent_serial != 0)
    pub subnet_baudrate: Option<u8>,
    /// Minitype / sub-product variant
    pub minitype: Option<u8>,
}

/// Result of a full network scan pass.
#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    /// All discovered (and deduplicated) devices
    pub devices: Vec<DiscoveredDevice>,
    /// Number of network adapters scanned
    pub adapters_scanned: usize,
    /// Local IPs used for scanning
    pub local_ips: Vec<String>,
    /// Non-fatal errors encountered during scan
    pub warnings: Vec<String>,
}

/// Sub-device info parsed from a RESPONSE_TOTAL_SUB_INFO (0x2f) packet.
#[derive(Debug, Clone, Serialize)]
pub struct SubDeviceInfo {
    pub parent_serial: u32,
    pub sub_devices: Vec<SubDeviceStatus>,
}

/// Status of one sub-device connected to a parent.
#[derive(Debug, Clone, Serialize)]
pub struct SubDeviceStatus {
    pub status: u8,
    pub modbus_id: u8,
}

// ── Product name lookup ───────────────────────────────────────────
// Mirrors C++ `Inial_Product_map()` in global_function.cpp

pub fn product_name(product_id: u8) -> &'static str {
    match product_id {
        1 => "TStat5B",
        2 => "TStat5A",
        3 => "TStat5B2",
        4 => "TStat5C",
        6 => "TStat6",
        7 => "TStat7",
        8 => "TStat5i",
        9 => "TStat8",
        10 => "TStat10",
        12 => "TStat5D",
        13 => "Air Quality",
        14 => "HUM Sensor",
        15 => "TStatRunar",
        16 => "TStat5E",
        17 => "TStat5F",
        18 => "TStat5G",
        19 => "TStat5H",
        20 => "T3-8I13O",
        21 => "T3-8O",
        22 => "T3-32AI",
        23 => "T3-8AI16O",
        26 => "T3-PT10",
        27 => "T3-Performance",
        28 => "T3-4AO",
        29 => "T3-6CT",
        32 => "CO2",
        33 => "CO2",
        34 => "CO2 Node",
        35 => "T3Controller",
        40 => "Pressure Sensor",
        41 => "PM5E",
        42 => "HUM-R",
        43 => "T3-22I",
        44 => "T3-8AI8AO6DO",
        45 => "Pressure",
        46 => "T3-PT12",
        50 => "CM5",
        51 => "PM5E_ARM",
        52 => "PM2.5",
        53 => "T3-32I",
        59 => "TStat9",
        60 => "Multi Sensor",
        62 => "Airlab",
        64 => "HumChamber",
        65 => "Airlab-E32",
        72 => "T3_LC",
        73 => "Power_Meter",
        74 => "T3Controller",
        75 => "Weather Station",
        87 => "T3-8AI8AO6DO-E32",
        88 => "T3Controller",
        89 => "T3-22I-E32",
        90 => "XDUCER",
        91 => "TStat8_Wifi",
        92 => "TStat8_Occ",
        93 => "TStat7_ARM",
        94 => "TStat8_220V",
        95 => "T3-6CTA",
        96 => "AirFlow",
        97 => "Fan Moudle",
        100 => "NC",
        101 => "TStat8_Program",
        104 => "PWM_Tranducer",
        120 => "LC",
        121 => "BTU_Meter",
        210 => "CO2",
        211 => "CO2",
        212 => "Hum",
        213 => "Hum",
        214 => "Pressure",
        215 => "Pressure",
        216 => "CO2 Node",
        254 => "Third Party",
        _ => "Unknown",
    }
}

/// Products whose firmware version needs to be divided by 10.
/// Mirrors the C++ logic in `AddNetDeviceForRefreshList`.
pub fn firmware_divided_by_10(product_id: u8) -> bool {
    matches!(product_id, 10 | 35 | 50 | 62 | 74 | 88)
}
