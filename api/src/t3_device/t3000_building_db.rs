//! Import the device tree that T3000 itself knows about.
//!
//! ## Why this exists
//!
//! The FFI `GET_PANELS_LIST` bridge (action 4) only reports devices held in the
//! C++ `g_bacnet_panel_info` vector, and the engine fills that vector **only**
//! from UDP 0x65 replies (`AddNetDeviceForRefreshList`, global_function.cpp).
//! Devices reached over an RS485 bus — the usual Tstat10 / TSTAT7 install, e.g.
//! COM8 — never appear there, and neither do configured-but-idle devices. Yet
//! T3000's own tree lists them, because it reads them from its building
//! database instead (MainFrm.cpp `ALL_NODE` query).
//!
//! The WebView must never open the COM port itself: T3000 owns it for the whole
//! session, and a second opener gets `Access is denied` (os error 5). Point data
//! for those devices flows through T3000 via FFI action 17; only the *device
//! identities* are missing, and they live here.
//!
//! ## Layout
//!
//! ```text
//! <runtime>/Database/T3000.db                             Building (protocol, COM port, Building_Path)
//! <runtime>/Database/Buildings/<b>/<b>.db                 ALL_NODE (one row per device)
//! <runtime>/Database/Buildings/<b>/DeviceDatabase.mdb     legacy Access DB, not read
//! ```
//!
//! `Building_Path` is relative to the runtime root and uses Windows separators.

use std::path::{Path, PathBuf};
use std::time::Duration;

use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, EntityTrait,
    Set, Statement,
};
use serde::{Deserialize, Serialize};

use crate::entity::t3_device::devices;

/// Master database beside the T3000 executable.
pub const MASTER_DB: &str = "T3000.db";
/// Table T3000 builds its device tree from.
pub const NODE_TABLE: &str = "ALL_NODE";

/// One device row from T3000's `ALL_NODE` table.
///
/// Also the wire format of `BacnetWebView_GetTreeDevices`, which reports the
/// same fields from T3000's in-memory tree (`m_product`) — see
/// [`crate::t3_device::t3000_tree`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllNode {
    pub serial_number: i32,
    #[serde(default)]
    pub product_name: String,
    #[serde(default)]
    pub panel_number: Option<i32>,
    #[serde(default)]
    pub object_instance: Option<i32>,
    #[serde(default)]
    pub parent_serial_number: Option<i32>,
    #[serde(default)]
    pub product_class_id: Option<i32>,
    #[serde(default)]
    pub product_id: Option<i32>,
    #[serde(default)]
    pub screen_name: Option<String>,
    #[serde(default)]
    pub ip_address: Option<String>,
    #[serde(default)]
    pub port: Option<i32>,
    /// T3000 protocol code: 0 Modbus 485, 1 Modbus TCP, 2 BACnet MSTP,
    /// 3 BACnet IP, 5 Auto, 6 Remote.
    #[serde(default)]
    pub protocol: Option<i32>,
    #[serde(default)]
    pub online: bool,
    /// `Background_imgID` doubles as the connection description
    /// ("Sub Device RS485", "Modbus_and_Bacnet") in T3000's schema.
    #[serde(default)]
    pub connection_type: Option<String>,
    #[serde(default)]
    pub baudrate: Option<String>,
    #[serde(default)]
    pub hardware_version: Option<i32>,
    #[serde(default)]
    pub firmware_version: Option<f64>,
    #[serde(default)]
    pub main_building_name: Option<String>,
    #[serde(default)]
    pub building_name: Option<String>,
    #[serde(default)]
    pub floor_name: Option<String>,
    #[serde(default)]
    pub room_name: Option<String>,
}

#[derive(Debug, Default, Clone, Serialize)]
pub struct ImportSummary {
    /// Rows read from `ALL_NODE`.
    pub total: usize,
    pub inserted: usize,
    pub updated: usize,
    /// Rows without a usable serial number.
    pub skipped: usize,
    /// Building database the rows came from.
    pub source: Option<String>,
}

// ── Locating the database ────────────────────────────────────────────

/// Candidate `Database` folders, best first.
///
/// `constants::get_t3000_database_path()` resolves the live runtime in a dev
/// build only when the process cwd is the repo root, so the ancestors are
/// searched as well (covers starting from `api/`, `api/target/debug`, or the
/// repo root).
fn database_dir_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![crate::constants::get_t3000_database_path()];

    if let Ok(cwd) = std::env::current_dir() {
        for ancestor in cwd.ancestors() {
            let root = ancestor.join("T3000_Building_Automation_System");
            candidates.push(root.join("T3000 Output").join("Debug").join("Database"));
            candidates.push(root.join("T3000 Output").join("Release").join("Database"));
            candidates.push(root.join("Database"));
        }
    }

    candidates
}

/// First candidate folder that actually holds a `T3000.db`.
pub fn resolve_database_dir() -> Option<PathBuf> {
    database_dir_candidates()
        .into_iter()
        .find(|dir| dir.join(MASTER_DB).exists())
}

/// Run-time root that `Building_Path` is relative to (parent of `Database`).
fn runtime_root(database_dir: &Path) -> PathBuf {
    database_dir
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| database_dir.to_path_buf())
}

/// SQLite URL for a file that already exists; `mode=ro` keeps T3000's file
/// untouched and lets SQLite share it in WAL mode.
fn sqlite_url(path: &Path, readonly: bool) -> String {
    let normalized = path.to_string_lossy().replace('\\', "/");
    let mode = if readonly { "ro" } else { "rw" };
    if cfg!(windows) {
        format!("sqlite:///{}?mode={}", normalized, mode)
    } else {
        format!("sqlite://{}?mode={}", normalized, mode)
    }
}

/// How long *we* wait for T3000's writer before giving up on this attempt.
///
/// Deliberately short: T3000 is the main application and runs with a 60 s
/// `sqlite3_busy_timeout` (`CppSQLite3DB::open`). If a read collides with its
/// write, we must yield quickly and retry later, never the other way round.
const READ_BUSY_TIMEOUT_MS: u32 = 750;

/// Attempts per read (SQLITE_BUSY is transient — T3000's transactions are short).
const READ_ATTEMPTS: u32 = 4;

fn is_busy(err: &str) -> bool {
    let e = err.to_ascii_lowercase();
    e.contains("database is locked") || e.contains("database table is locked") || e.contains("busy")
}

/// Open one short-lived read-only connection to a T3000 database.
///
/// ## Why this is safe for T3000
///
/// T3000's databases are in SQLite's default **`delete` (rollback journal)**
/// mode — verified with `PRAGMA journal_mode` on the live files — which means a
/// reader holding a shared lock *can* block its writer. Measured on the real
/// file: a reader that keeps a transaction open makes the writer fail with
/// `database is locked`. So this function:
///
/// * opens with `mode=ro` — the process *cannot* write, even by accident;
/// * sets `PRAGMA query_only = 1` — second line of defence;
/// * sets a short `busy_timeout` so a collision makes **us** back off;
/// * is used for a single statement and dropped immediately (in autocommit each
///   statement releases its lock when it finishes), so the shared lock is held
///   for the duration of one small `SELECT`, not for the life of the process.
async fn open_readonly(url: &str) -> Result<DatabaseConnection, String> {
    let mut opt = sea_orm::ConnectOptions::new(url);
    opt.max_connections(1)
        .min_connections(0)
        .connect_timeout(Duration::from_secs(5))
        .acquire_timeout(Duration::from_secs(2))
        .idle_timeout(Duration::from_secs(2))
        .sqlx_logging(false);
    let conn = Database::connect(opt)
        .await
        .map_err(|e| format!("{}: {}", url, e))?;
    for pragma in [
        format!("PRAGMA busy_timeout = {};", READ_BUSY_TIMEOUT_MS),
        "PRAGMA query_only = 1;".to_string(),
    ] {
        let _ = conn
            .execute(Statement::from_string(DatabaseBackend::Sqlite, pragma))
            .await;
    }
    Ok(conn)
}

/// Run `attempt` up to `READ_ATTEMPTS` times, backing off only when the
/// database is momentarily busy.
async fn with_busy_retry<T, F, Fut>(what: &str, attempt: F) -> Result<T, String>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    let mut last = String::new();
    for n in 0..READ_ATTEMPTS {
        match attempt().await {
            Ok(v) => return Ok(v),
            Err(e) => {
                let busy = is_busy(&e);
                last = e;
                if !busy {
                    // Missing file, hot journal, corrupt header, … — retrying
                    // cannot help.
                    return Err(last);
                }
                if n + 1 < READ_ATTEMPTS {
                    tokio::time::sleep(Duration::from_millis(
                        50 * (n as u64 + 1) * (n as u64 + 1),
                    ))
                    .await;
                }
            }
        }
    }
    Err(format!("{} (still busy after {} attempts): {}", what, READ_ATTEMPTS, last))
}

async fn count_nodes(conn: &DatabaseConnection) -> i64 {
    conn.query_one(Statement::from_string(
        DatabaseBackend::Sqlite,
        format!("SELECT COUNT(*) AS cnt FROM {}", NODE_TABLE),
    ))
    .await
    .ok()
    .flatten()
    .and_then(|r| r.try_get::<i64>("", "cnt").ok())
    .unwrap_or(0)
}

/// `(Building_Path, is_default)` rows from the master database.
///
/// Retried like the main read: if T3000 is mid-write this must back off, not
/// fall through to the heavier folder scan.
async fn master_building_rows(database_dir: &Path) -> Vec<(String, bool)> {
    let master = database_dir.join(MASTER_DB);
    let rows = with_busy_retry("read Building", || async {
        let conn = open_readonly(&sqlite_url(&master, true)).await?;
        let rows = conn
            .query_all(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT Building_Path, Default_SubBuilding FROM Building",
            ))
            .await
            .map_err(|e| format!("{}: {}", master.display(), e))?;
        Ok(rows)
    })
    .await
    .unwrap_or_default();

    rows.iter()
        .filter_map(|row| {
            let rel = row.try_get::<String>("", "Building_Path").ok()?;
            let rel = rel.trim().replace('\\', "/");
            if rel.is_empty() {
                return None;
            }
            let is_default = row
                .try_get::<String>("", "Default_SubBuilding")
                .map(|v| {
                    let v = v.trim().to_string();
                    !v.is_empty() && v != "0"
                })
                .unwrap_or(false);
            Some((rel, is_default))
        })
        .collect()
}

/// Resolve the building database from the master `Building` table, falling back
/// to the `Buildings/*/*.db` folder when `Building_Path` is stale (T3000 renames
/// the file on some upgrades).
async fn resolve_building_db(database_dir: &Path) -> Result<PathBuf, String> {
    let root = runtime_root(database_dir);
    let rows = master_building_rows(database_dir).await;

    // Default building first, then the others.
    let mut ordered: Vec<String> = Vec::new();
    for want_default in [true, false] {
        ordered.extend(
            rows.iter()
                .filter(|(_, is_default)| *is_default == want_default)
                .map(|(rel, _)| rel.clone()),
        );
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    for rel in ordered {
        let path = root.join(&rel);
        if path.exists() {
            candidates.push(path.clone());
        }
        // Same building, different file extension.
        for alt in ["db", "sqlite", "mdb"] {
            let alt = path.with_extension(alt);
            if alt.exists() && !candidates.contains(&alt) {
                candidates.push(alt);
            }
        }
    }

    // Only when `Building_Path` did not yield a usable file (stale path, or no
    // master row) fall back to scanning the folder. Doing it unconditionally
    // would open every building database on every import — pointless extra
    // contact with files T3000 owns.
    if candidates.is_empty() {
        if let Some(best) = best_building_db_in_dir(database_dir).await {
            candidates.push(best);
        }
    }

    candidates
        .into_iter()
        .next()
        .ok_or_else(|| format!("no building database found under {}", database_dir.display()))
}

/// Newest building `.db` under `Buildings/*/` that holds `ALL_NODE` rows.
async fn best_building_db_in_dir(database_dir: &Path) -> Option<PathBuf> {
    let buildings = database_dir.join("Buildings");
    let entries = std::fs::read_dir(&buildings).ok()?;

    let mut best: Option<(i64, std::time::SystemTime, PathBuf)> = None;
    for entry in entries.flatten() {
        let folder = entry.path();
        if !folder.is_dir() {
            continue;
        }
        let Ok(files) = std::fs::read_dir(&folder) else { continue };
        for file in files.flatten() {
            let path = file.path();
            if path.extension().and_then(|e| e.to_str()) != Some("db") {
                continue;
            }
            let Ok(conn) = open_readonly(&sqlite_url(&path, true)).await else { continue };
            let cnt = count_nodes(&conn).await;
            if cnt == 0 {
                continue;
            }
            let mtime = file
                .metadata()
                .and_then(|m| m.modified())
                .unwrap_or(std::time::UNIX_EPOCH);
            let better = match &best {
                None => true,
                Some((best_cnt, best_time, _)) => cnt > *best_cnt || (cnt == *best_cnt && mtime > *best_time),
            };
            if better {
                best = Some((cnt, mtime, path));
            }
        }
    }
    best.map(|(_, _, p)| p)
}

// ── Reading ALL_NODE ─────────────────────────────────────────────────

fn parse_i32(value: Option<String>) -> Option<i32> {
    let raw = value?;
    let raw = raw.trim();
    if raw.is_empty() {
        return None;
    }
    raw.parse::<i32>()
        .ok()
        .or_else(|| raw.parse::<f64>().ok().map(|f| f.round() as i32))
}

fn looks_like_ip(value: &str) -> bool {
    let parts: Vec<&str> = value.split('.').collect();
    parts.len() == 4 && parts.iter().all(|p| p.parse::<u8>().is_ok())
}

fn looks_like_baud(value: &str) -> bool {
    matches!(value, "1200" | "2400" | "4800" | "9600" | "19200" | "38400" | "57600" | "115200")
}

fn trim_opt(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

/// Read every device T3000 knows about from the given `Database` folder.
pub async fn read_all_nodes_from(database_dir: &Path) -> Result<Vec<AllNode>, String> {
    let building_db = resolve_building_db(database_dir).await?;

    // One short read-only statement per attempt; see `open_readonly` for why the
    // shared lock must never outlive a single small SELECT.
    let rows = with_busy_retry("read ALL_NODE", || async {
        let conn = open_readonly(&sqlite_url(&building_db, true)).await?;
        let rows = conn
            .query_all(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT Serial_ID, Product_name, Product_class_ID, Product_ID, Screen_Name, \
                        Bautrate, Com_Port, Protocol, Online_Status, NetworkCard_Address, \
                        Parent_SerialNum, Panal_Number, Object_Instance, Hardware_Ver, Software_Ver, \
                        MainBuilding_Name, Building_Name, Floor_name, Room_name, Background_imgID \
                 FROM ALL_NODE",
            ))
            .await
            .map_err(|e| format!("{}: {}", building_db.display(), e))?;
        Ok(rows)
    })
    .await?;

    let mut nodes = Vec::with_capacity(rows.len());
    for row in rows {
        let Some(serial_number) = parse_i32(row.try_get::<Option<String>>("", "Serial_ID").ok().flatten()) else {
            continue;
        };
        if serial_number <= 0 {
            continue;
        }

        let bautrate = trim_opt(row.try_get::<Option<String>>("", "Bautrate").ok().flatten());
        let network_card = trim_opt(row.try_get::<Option<String>>("", "NetworkCard_Address").ok().flatten());
        // Older rows keep the IP in `Bautrate`; the real baud rate is also there
        // for serial-only devices, so only treat it as an address when it looks
        // like one.
        let ip_address = network_card
            .filter(|ip| looks_like_ip(ip))
            .or_else(|| bautrate.clone().filter(|v| looks_like_ip(v)));

        let online = match row.try_get::<Option<String>>("", "Online_Status").ok().flatten() {
            Some(v) => v.trim() == "1" || v.eq_ignore_ascii_case("true"),
            None => row
                .try_get::<Option<i64>>("", "Online_Status")
                .ok()
                .flatten()
                .map(|v| v != 0)
                .unwrap_or(false),
        };

        let firmware_version = row
            .try_get::<Option<String>>("", "Software_Ver")
            .ok()
            .flatten()
            .and_then(|v| v.trim().parse::<f64>().ok());
        let hardware_version = row
            .try_get::<Option<String>>("", "Hardware_Ver")
            .ok()
            .flatten()
            .and_then(|v| v.trim().parse::<f64>().ok())
            .map(|v| (v * 10.0).round() as i32);

        nodes.push(AllNode {
            serial_number,
            product_name: trim_opt(row.try_get::<Option<String>>("", "Product_name").ok().flatten())
                .unwrap_or_else(|| format!("Device {}", serial_number)),
            panel_number: parse_i32(row.try_get::<Option<String>>("", "Panal_Number").ok().flatten()),
            object_instance: parse_i32(row.try_get::<Option<String>>("", "Object_Instance").ok().flatten()),
            parent_serial_number: parse_i32(row.try_get::<Option<String>>("", "Parent_SerialNum").ok().flatten()),
            product_class_id: parse_i32(row.try_get::<Option<String>>("", "Product_class_ID").ok().flatten()),
            product_id: parse_i32(row.try_get::<Option<String>>("", "Product_ID").ok().flatten()),
            screen_name: trim_opt(row.try_get::<Option<String>>("", "Screen_Name").ok().flatten()),
            ip_address,
            port: parse_i32(row.try_get::<Option<String>>("", "Com_Port").ok().flatten()),
            protocol: parse_i32(row.try_get::<Option<String>>("", "Protocol").ok().flatten()),
            online,
            connection_type: trim_opt(row.try_get::<Option<String>>("", "Background_imgID").ok().flatten()),
            baudrate: bautrate.filter(|v| looks_like_baud(v)),
            hardware_version,
            firmware_version,
            main_building_name: trim_opt(row.try_get::<Option<String>>("", "MainBuilding_Name").ok().flatten()),
            building_name: trim_opt(row.try_get::<Option<String>>("", "Building_Name").ok().flatten()),
            floor_name: trim_opt(row.try_get::<Option<String>>("", "Floor_name").ok().flatten()),
            room_name: trim_opt(row.try_get::<Option<String>>("", "Room_name").ok().flatten()),
        });
    }

    Ok(nodes)
}

/// Read `ALL_NODE` from whichever `Database` folder resolves.
pub async fn read_all_nodes() -> Result<Vec<AllNode>, String> {
    let dir = resolve_database_dir()
        .ok_or_else(|| "T3000 database folder (Database/T3000.db) not found".to_string())?;
    read_all_nodes_from(&dir).await
}

/// COM ports T3000 is configured to use (`Building.Com_Port`, e.g. `"COM8"`).
///
/// These are the ports T3000 owns while it runs. Probing them from the WebView
/// can only fail with `Access is denied`, so the serial scan skips them — the
/// devices behind them arrive from this database instead, and T3000 refreshes
/// them with its own `Scan All` (`CTStatScanner::ScanAll`, which closes and
/// reopens the handle).
pub async fn t3000_serial_ports() -> Vec<String> {
    if !crate::lan_scan::serial::hosted_by_t3000() {
        // Standalone WebView (T3000 not hosting us): the port may be free.
        return Vec::new();
    }

    match resolve_database_dir() {
        Some(dir) => t3000_serial_ports_from(&dir).await,
        None => Vec::new(),
    }
}

/// `Building.Com_Port` values from the given `Database` folder.
pub async fn t3000_serial_ports_from(database_dir: &Path) -> Vec<String> {
    let master = database_dir.join(MASTER_DB);
    let Ok(conn) = open_readonly(&sqlite_url(&master, true)).await else {
        return Vec::new();
    };
    let Ok(rows) = conn
        .query_all(Statement::from_string(
            DatabaseBackend::Sqlite,
            "SELECT Com_Port FROM Building",
        ))
        .await
    else {
        return Vec::new();
    };

    let mut ports: Vec<String> = rows
        .iter()
        .filter_map(|r| r.try_get::<String>("", "Com_Port").ok())
        .map(|p| p.trim().to_string())
        .filter(|p| p.to_ascii_uppercase().starts_with("COM") && p.len() > 3)
        .collect();
    ports.sort_unstable();
    ports.dedup();
    ports
}

// ── Import into the WebView DEVICES table ────────────────────────────

/// Upsert T3000's devices into the WebView `DEVICES` table.
///
/// Identity/config columns are taken from T3000 (it is the authority on what
/// exists). **Runtime status is not**: `ALL_NODE.Online_Status` is only written
/// in bulk by `CMainFrame::OnDestroy` ("so the next open shows the state from
/// the last close") plus a few per-protocol-group updates, and in practice 35 of
/// 38 rows read `0` while T3000's own tree shows those devices green. So only
/// `1` is trusted; `0` means *unknown*, and `is_online` is left alone so the UDP
/// scan / FFI panel list stay the authority on liveness.
///
/// Columns the LAN scan fills better (Modbus id, live IP, BACnet object instance
/// for IP devices, …) are only overwritten when T3000 has a value.
pub async fn import_devices(db: &DatabaseConnection) -> ImportSummary {
    let nodes = match read_all_nodes().await {
        Ok(nodes) => nodes,
        Err(e) => {
            tracing::warn!("[t3000_db] device import skipped: {}", e);
            return ImportSummary::default();
        }
    };

    let source = resolve_database_dir().map(|d| d.display().to_string());
    import_nodes(db, &nodes, source).await
}

/// Upsert an already-obtained device list into `DEVICES`.
///
/// Shared by both sources: T3000's in-memory tree over FFI (preferred) and its
/// building database (fallback).
pub async fn import_nodes(
    db: &DatabaseConnection,
    nodes: &[AllNode],
    source: Option<String>,
) -> ImportSummary {
    let summary = import_nodes_into(db, nodes, source).await;
    tracing::info!(
        "[t3000_db] imported {} device(s) from T3000 ({}, {} new, {} updated){}",
        summary.total,
        summary.source.as_deref().unwrap_or("?"),
        summary.inserted,
        summary.updated,
        if summary.skipped > 0 {
            format!(", {} skipped", summary.skipped)
        } else {
            String::new()
        }
    );
    summary
}

async fn import_nodes_into(
    db: &DatabaseConnection,
    nodes: &[AllNode],
    source: Option<String>,
) -> ImportSummary {
    let now = chrono::Utc::now().to_rfc3339();
    let mut summary = ImportSummary {
        total: nodes.len(),
        source,
        ..Default::default()
    };

    // A sub-device whose parent row is gone would be orphaned by the tree
    // builder and never render, so those are promoted to top level.
    let known: std::collections::HashSet<i32> = nodes.iter().map(|n| n.serial_number).collect();
    let effective_parent = |node: &AllNode| -> Option<i32> {
        match node.parent_serial_number {
            Some(p) if p > 0 && known.contains(&p) => Some(p),
            _ => Some(0),
        }
    };

    for node in nodes {
        let existing = devices::Entity::find_by_id(node.serial_number).one(db).await;

        match existing {
            Ok(Some(model)) => {
                let mut active: devices::ActiveModel = model.into();
                active.product_name = Set(Some(node.product_name.clone()));
                active.show_label_name = Set(Some(node.product_name.clone()));
                if node.panel_number.is_some() {
                    active.panel_number = Set(node.panel_number);
                    active.panel_id = Set(node.panel_number);
                }
                if node.object_instance.is_some() {
                    active.object_instance = Set(node.object_instance);
                }
                if node.parent_serial_number.is_some() {
                    active.parent_serial_number = Set(effective_parent(node));
                }
                if node.product_class_id.is_some() {
                    active.product_class_id = Set(node.product_class_id);
                }
                if node.product_id.is_some() {
                    active.product_id = Set(node.product_id);
                }
                if node.screen_name.is_some() {
                    active.screen_name = Set(node.screen_name.clone());
                }
                if node.ip_address.is_some() {
                    active.ip_address = Set(node.ip_address.clone());
                    active.bautrate = Set(node.ip_address.clone());
                }
                if node.port.is_some() {
                    active.port = Set(node.port);
                }
                if node.protocol.is_some() {
                    active.subnet_protocol = Set(node.protocol);
                }
                if node.connection_type.is_some() {
                    active.connection_type = Set(node.connection_type.clone());
                }
                if node.baudrate.is_some() {
                    active.bautrate = Set(node.baudrate.clone());
                }
                if node.hardware_version.is_some() {
                    active.hardware_version = Set(node.hardware_version);
                }
                if node.firmware_version.is_some() {
                    active.firmware_version = Set(node.firmware_version);
                }
                if node.main_building_name.is_some() {
                    active.main_building_name = Set(node.main_building_name.clone());
                }
                if node.building_name.is_some() {
                    active.building_name = Set(node.building_name.clone());
                }
                if node.floor_name.is_some() {
                    active.floor_name = Set(node.floor_name.clone());
                }
                if node.room_name.is_some() {
                    active.room_name = Set(node.room_name.clone());
                }
                // Only trust a positive online flag; see `import_devices`.
                if node.online {
                    active.is_online = Set(Some(1));
                    active.last_checked = Set(Some(now.clone()));
                }

                match active.update(db).await {
                    Ok(_) => summary.updated += 1,
                    Err(e) => {
                        tracing::warn!("[t3000_db] update {} failed: {:?}", node.serial_number, e);
                        summary.skipped += 1;
                    }
                }
            }
            Ok(None) => {
                let active = devices::ActiveModel {
                    serial_number: Set(node.serial_number),
                    panel_id: Set(node.panel_number),
                    panel_number: Set(node.panel_number),
                    product_name: Set(Some(node.product_name.clone())),
                    show_label_name: Set(Some(node.product_name.clone())),
                    screen_name: Set(node.screen_name.clone()),
                    product_class_id: Set(node.product_class_id),
                    product_id: Set(node.product_id),
                    object_instance: Set(node.object_instance),
                    parent_serial_number: Set(effective_parent(node)),
                    ip_address: Set(node.ip_address.clone()),
                    port: Set(node.port),
                    subnet_protocol: Set(node.protocol),
                    connection_type: Set(node.connection_type.clone()),
                    bautrate: Set(node.baudrate.clone().or_else(|| node.ip_address.clone())),
                    hardware_version: Set(node.hardware_version),
                    firmware_version: Set(node.firmware_version),
                    main_building_name: Set(node.main_building_name.clone()),
                    building_name: Set(node.building_name.clone()),
                    floor_name: Set(node.floor_name.clone()),
                    room_name: Set(node.room_name.clone()),
                    is_online: Set(if node.online { Some(1) } else { None }),
                    last_checked: Set(if node.online { Some(now.clone()) } else { None }),
                    ..Default::default()
                };
                match devices::Entity::insert(active).exec(db).await {
                    Ok(_) => summary.inserted += 1,
                    Err(e) => {
                        tracing::warn!("[t3000_db] insert {} failed: {:?}", node.serial_number, e);
                        summary.skipped += 1;
                    }
                }
            }
            Err(e) => {
                tracing::warn!("[t3000_db] lookup {} failed: {:?}", node.serial_number, e);
                summary.skipped += 1;
            }
        }
    }

    summary
}
