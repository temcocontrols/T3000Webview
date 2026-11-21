//! Read T3000's device tree **from its memory**, not from its database.
//!
//! ## Why this is the right bridge
//!
//! T3000 already holds the complete device tree it draws in
//! `CMainFrame::m_product` (`vector<tree_product>`): every device it discovered
//! — UDP, RS485/COM, BACnet-MSTP, third-party BACnet/IP, remote, virtual,
//! manually added — plus its **live** online status. `ScanTstatInDB()` fills it
//! at start-up, `CheckDeviceStatus()` refreshes it roughly every 8 s, and the
//! tree view renders it.
//!
//! Asking T3000 for that vector:
//!
//! * reads **no database file** — no SQLite lock, so T3000 can never be blocked;
//! * performs **no device I/O** — no COM port, no BACnet round trip;
//! * returns live status, which `ALL_NODE.Online_Status` cannot (it is only
//!   persisted on application close).
//!
//! ## Contract
//!
//! ```c
//! int BacnetWebView_GetTreeDevices(char* buffer, int buffer_size);
//! ```
//!
//! Writes a NUL-terminated JSON body and returns its length:
//!
//! ```json
//! { "devices": [ { "serial_number": 237853, "panel_number": 99,
//!                  "object_instance": 237853, "parent_serial_number": 212375,
//!                  "product_name": "Tstat10-99", "product_class_id": 10,
//!                  "product_id": 99, "screen_name": "", "ip_address": "",
//!                  "port": 8, "protocol": 10, "online": true,
//!                  "connection_type": "Sub Device RS485",
//!                  "baudrate": "19200", "hardware_version": 10,
//!                  "firmware_version": 68.8,
//!                  "main_building_name": "Default_Building",
//!                  "building_name": "Default_Building",
//!                  "floor_name": "floor1", "room_name": "room1" } ] }
//! ```
//!
//! If the buffer is too small the return value is the required length (the
//! caller retries with a bigger buffer); a negative value means "not available".
//!
//! When the export is missing (older T3000.exe) [`fetch_tree_devices`] returns
//! `Ok(None)`, so the caller can fall back — nothing breaks.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;

use crate::t3_device::t3000_building_db::AllNode;

/// Export name in T3000.exe.
pub const TREE_DEVICES_EXPORT: &str = "BacnetWebView_GetTreeDevices";

/// Generous first attempt (≈ 1300 devices at ~400 bytes each).
const INITIAL_BUFFER: usize = 512 * 1024;
const MAX_BUFFER: usize = 4 * 1024 * 1024;

#[cfg(windows)]
type GetTreeDevicesFn = unsafe extern "C" fn(*mut c_char, i32) -> i32;

#[cfg(windows)]
fn resolve_export() -> Option<GetTreeDevicesFn> {
    use std::sync::OnceLock;
    use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryA};

    static RESOLVED: OnceLock<Option<usize>> = OnceLock::new();

    let addr = *RESOLVED.get_or_init(|| {
        // The API runs as a DLL inside T3000.exe, so it is already loaded; this
        // only bumps the reference count.
        for candidate in ["T3000.exe", "./T3000.exe", "../T3000.exe"] {
            let Ok(name) = CString::new(candidate) else { continue };
            let module = unsafe { LoadLibraryA(name.as_ptr()) };
            if module.is_null() {
                continue;
            }
            let Ok(sym) = CString::new(TREE_DEVICES_EXPORT) else { continue };
            let ptr = unsafe { GetProcAddress(module, sym.as_ptr()) };
            if !ptr.is_null() {
                return Some(ptr as usize);
            }
        }
        None
    });

    addr.map(|a| unsafe { std::mem::transmute::<usize, GetTreeDevicesFn>(a) })
}

#[cfg(not(windows))]
fn resolve_export() -> Option<()> {
    None
}

/// Read the device tree T3000 holds in memory.
///
/// * `Ok(Some(devices))` — T3000 answered
/// * `Ok(None)` — the export does not exist (older T3000.exe); caller falls back
/// * `Err(_)` — the call failed or the payload could not be parsed
#[cfg(windows)]
pub async fn fetch_tree_devices() -> Result<Option<Vec<AllNode>>, String> {
    let Some(func) = resolve_export() else {
        return Ok(None);
    };

    // The call is a pure memory read on T3000's side, but it must not run on the
    // async runtime thread: if T3000 is momentarily busy the caller still gets a
    // responsive API.
    let raw = tokio::task::spawn_blocking(move || call_export(func)).await;
    let text = match raw {
        Ok(Ok(text)) => text,
        Ok(Err(e)) => return Err(e),
        Err(e) => return Err(format!("{} call panicked: {}", TREE_DEVICES_EXPORT, e)),
    };

    #[derive(serde::Deserialize)]
    struct Body {
        #[serde(default)]
        devices: Vec<AllNode>,
    }

    let body: Body = serde_json::from_str(&text)
        .map_err(|e| format!("{} returned invalid JSON: {} — {}", TREE_DEVICES_EXPORT, e, truncate(&text)))?;
    Ok(Some(body.devices))
}

#[cfg(not(windows))]
pub async fn fetch_tree_devices() -> Result<Option<Vec<AllNode>>, String> {
    Ok(None)
}

#[cfg(windows)]
fn call_export(func: GetTreeDevicesFn) -> Result<String, String> {
    let mut size = INITIAL_BUFFER;
    loop {
        let mut buffer = vec![0u8; size];
        let written = unsafe { func(buffer.as_mut_ptr() as *mut c_char, size as i32) };

        if written < 0 {
            return Err(format!("{} returned {}", TREE_DEVICES_EXPORT, written));
        }
        let written = written as usize;

        // Buffer too small: the export reports the required length.
        if written >= size {
            if size >= MAX_BUFFER {
                return Err(format!(
                    "{} needs {} bytes, above the {} byte limit",
                    TREE_DEVICES_EXPORT, written, MAX_BUFFER
                ));
            }
            size = (written + 1024).min(MAX_BUFFER);
            continue;
        }

        // Prefer the reported length; fall back to the NUL terminator.
        let text = match std::str::from_utf8(&buffer[..written]) {
            Ok(t) if !t.is_empty() => t.to_string(),
            _ => {
                let cstr = unsafe { CStr::from_ptr(buffer.as_ptr() as *const c_char) };
                cstr.to_string_lossy().into_owned()
            }
        };
        if text.trim().is_empty() {
            return Err(format!("{} returned an empty payload", TREE_DEVICES_EXPORT));
        }
        return Ok(text);
    }
}

fn truncate(text: &str) -> String {
    const MAX: usize = 200;
    if text.chars().count() <= MAX {
        text.to_string()
    } else {
        // Slice on a char boundary — `&text[..MAX]` panics on multi-byte UTF-8.
        format!("{}…", text.chars().take(MAX).collect::<String>())
    }
}
