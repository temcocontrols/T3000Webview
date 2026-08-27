//! Modbus RTU wire-protocol helpers ported from the C++ T3000 scanner.
//!
//! Mirrors:
//! - `CRC16()`                     (ModbusDllforVc/ModbusDllforVc/crc.cpp)
//! - `read_multi2_nocretical()`    (ModbusDllforVc/ModbusDllforVc/common.cpp:6982)
//! - `CheckTstatOnline2()`         (ModbusDllforVc/ModbusDllforVc/common.cpp)
//!
//! The T3000 serial scan uses standard Modbus RTU frames on RS485/USB:
//! - Read multiple registers (function 3): `[slave, 0x03, addr_hi, addr_lo, cnt_hi, cnt_lo, crc_hi, crc_lo]`
//! - Online-check probe: `[255, 25, devHi, devLo, crc_hi, crc_lo]`
//! CRC is Modbus CRC-16 (poly 0xA001, init 0xFFFF), transmitted high byte first.

/// Modbus read-multiple-registers function code.
pub const FUNC_READ_MULTIPLE: u8 = 0x03;
/// Modbus broadcast probe command byte (255) — matches C++ `CheckTstatOnline2`.
pub const PROBE_SLAVE_BROADCAST: u8 = 255;
/// Online-check command byte (25) — matches C++ `pval[1] = 25`.
pub const PROBE_CMD: u8 = 25;
/// Number of device-info registers read after finding a device.
pub const DEVICE_INFO_REG_COUNT: u16 = 10;
/// Register at which the device label/name lives (0x56 marker → name).
pub const DEVICE_NAME_REG: u16 = 714;
/// Number of registers read for the device name.
pub const DEVICE_NAME_REG_COUNT: u16 = 10;

/// Compute Modbus CRC-16 (poly 0xA001, init 0xFFFF).
/// Returns big-endian [crc_hi, crc_lo] as a u16 (hi in upper byte).
pub fn crc16(data: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;
    for &b in data {
        crc ^= b as u16;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    crc
}

/// Build a Modbus RTU read-multiple-registers request frame (function 3).
pub fn build_read_multiple(slave: u8, start_addr: u16, count: u16) -> [u8; 8] {
    let mut f = [0u8; 8];
    f[0] = slave;
    f[1] = FUNC_READ_MULTIPLE;
    f[2] = (start_addr >> 8) as u8;
    f[3] = (start_addr & 0xFF) as u8;
    f[4] = (count >> 8) as u8;
    f[5] = (count & 0xFF) as u8;
    let crc = crc16(&f[..6]);
    f[6] = (crc >> 8) as u8;
    f[7] = (crc & 0xFF) as u8;
    f
}

/// Build the T3000 online-check probe frame: `[255, 25, devHi, devLo, crc_hi, crc_lo]`.
pub fn build_online_check(dev_lo: u8, dev_hi: u8) -> [u8; 6] {
    let mut f = [0u8; 6];
    f[0] = PROBE_SLAVE_BROADCAST;
    f[1] = PROBE_CMD;
    f[2] = dev_hi;
    f[3] = dev_lo;
    let crc = crc16(&f[..4]);
    f[4] = (crc >> 8) as u8;
    f[5] = (crc & 0xFF) as u8;
    f
}

/// Result of parsing an online-check probe response.
///
/// Mirrors the C++ return semantics of `CheckTstatOnline2`:
/// - `Ok(Some(id))`   → a single device responded with Modbus address `id`
/// - `Ok(None)`       → no device in range (-4 in C++)
/// - `Err(Collision)` → more than one device in range (-3)
/// - `Err(CrcMismatch)`/`Err(BadFormat)` → try again (-2)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OnlineCheckError {
    /// No response / no connection.
    NoResponse,
    /// More than one device in the scanned range (collision).
    Collision,
    /// Response format or CRC invalid.
    BadFormat,
    /// Serial port not open.
    PortClosed,
}

/// Parse a 13-byte online-check response (the C++ `gval[13]`).
///
/// The probe is a broadcast to a *range* of Modbus IDs; a device echoes with
/// its own address in `gval[2]`. Two protocol variants are handled (old/new)
/// exactly like the C++ `CheckTstatOnline2`.
pub fn parse_online_check(pval: &[u8; 6], gval: &[u8; 13]) -> Result<Option<u8>, OnlineCheckError> {
    // old protocol: gval[7..12] all zero — mirrors C++ `CheckTstatOnline2_a_nocretical`.
    // gval[7] is included so a new-protocol reply whose CRC low byte happens to be
    // 0 isn't misdetected as the old protocol (the C++ bug fixed by "fance").
    if gval[7] == 0 && gval[8] == 0 && gval[9] == 0 && gval[10] == 0 && gval[11] == 0 && gval[12] == 0 {
        if gval[0] == 0 && gval[1] == 0 && gval[2] == 0 && gval[3] == 0 && gval[4] == 0 {
            return Err(OnlineCheckError::NoResponse);
        }
        // Echo of our own probe → port not wired to anything real.
        if gval[0] == pval[0] && gval[1] == pval[1] && gval[2] == pval[2]
            && gval[3] == pval[3] && gval[4] == pval[4] && gval[5] == pval[5]
        {
            return Err(OnlineCheckError::NoResponse);
        }
        if gval[5] != 0 || gval[6] != 0 {
            return Err(OnlineCheckError::Collision);
        }
        if gval[0] != pval[0] || gval[1] != PROBE_CMD {
            return Err(OnlineCheckError::BadFormat);
        }
        let crc = crc16(&gval[..3]);
        if gval[3] != ((crc >> 8) as u8) || gval[4] != (crc & 0xFF) as u8 {
            return Err(OnlineCheckError::BadFormat);
        }
        Ok(Some(gval[2]))
    } else {
        // new protocol
        if gval[9] != 0 || gval[10] != 0 || gval[11] != 0 || gval[12] != 0 {
            return Err(OnlineCheckError::Collision);
        }
        if gval[0] != pval[0] || gval[1] != PROBE_CMD {
            return Err(OnlineCheckError::BadFormat);
        }
        let crc = crc16(&gval[..7]);
        if gval[7] != ((crc >> 8) as u8) || gval[8] != (crc & 0xFF) as u8 {
            return Err(OnlineCheckError::BadFormat);
        }
        Ok(Some(gval[2]))
    }
}

/// Parse a read-multiple-registers response frame into register values (big-endian u16).
///
/// Response: `[slave, 0x03, byte_count, data..., crc_hi, crc_lo]`.
/// Returns the parsed registers, or an error if CRC/format invalid.
pub fn parse_read_multiple(slave: u8, count: u16, resp: &[u8]) -> Option<Vec<u16>> {
    let expect_len = 3 + count as usize * 2 + 2;
    if resp.len() < expect_len {
        return None;
    }
    if resp[0] != slave || resp[1] != FUNC_READ_MULTIPLE {
        return None;
    }
    let byte_count = resp[2] as usize;
    if byte_count != count as usize * 2 {
        return None;
    }
    let crc = crc16(&resp[..3 + byte_count]);
    if resp[3 + byte_count] != ((crc >> 8) as u8) || resp[4 + byte_count] != (crc & 0xFF) as u8 {
        return None;
    }
    let mut regs = Vec::with_capacity(count as usize);
    for i in 0..count as usize {
        regs.push(((resp[3 + 2 * i] as u16) << 8) | resp[4 + 2 * i] as u16);
    }
    Some(regs)
}
