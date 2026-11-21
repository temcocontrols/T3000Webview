//! Integration tests for the T3000 building-database (`ALL_NODE`) import.
//!
//! The WebView device tree cannot come from the LAN scan alone: devices on an
//! RS485 bus (`Tstat10`/`TSTAT7` on COM8) and idle configured devices never
//! answer the UDP 0x64 query, and `GET_PANELS_LIST` (FFI action 4) only reports
//! `g_bacnet_panel_info`, which is filled exclusively from UDP replies. T3000's
//! own tree reads its building database instead, so the WebView mirrors it.
//!
//! Run with: `cargo test --test t3000_db`

use t3_webview_api::t3_device::t3000_building_db;

type Node<'a> = (&'a str, &'a str, &'a str, &'a str, &'a str, &'a str, &'a str, &'a str);

/// Build a T3000-shaped database pair (master + building) in a temp folder and
/// return the `Database` directory.
fn make_t3000_db(suffix: &str, nodes: &[Node]) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("t3_t3000_db_{}_{}", suffix, std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("Buildings").join("Default_Building")).unwrap();

    // Master database: the `Building` table points at the per-building file.
    let master = dir.join("T3000.db");
    run_sql(
        &master,
        "CREATE TABLE Building (Main_BuildingName TEXT, Building_Name TEXT, Protocal TEXT, \
         Com_Port TEXT, Braudrate TEXT, Building_Path TEXT, Default_SubBuilding TEXT);\
         INSERT INTO Building VALUES ('Default_Building','Default_Building','Modbus 485','COM8','19200',\
         'Database/Buildings/Default_Building/Default_Building.db','1');",
    );

    let building = dir
        .join("Buildings")
        .join("Default_Building")
        .join("Default_Building.db");
    let mut sql = String::from(
        "CREATE TABLE ALL_NODE (MainBuilding_Name TEXT, Building_Name TEXT, Serial_ID TEXT, \
         Floor_name TEXT, Room_name TEXT, Product_name TEXT, Product_class_ID TEXT, Product_ID TEXT, \
         Screen_Name TEXT, Bautrate TEXT, Background_imgID TEXT, Hardware_Ver TEXT, Software_Ver TEXT, \
         Com_Port TEXT, EPsize TEXT, Protocol TEXT, Online_Status BOOLEAN, NetworkCard_Address TEXT, \
         Custom TEXT, Parent_SerialNum TEXT, Panal_Number TEXT, Object_Instance TEXT);",
    );
    for (serial, name, class_id, product_id, panel, parent, online, ip) in nodes {
        sql.push_str(&format!(
            "INSERT INTO ALL_NODE (MainBuilding_Name, Building_Name, Serial_ID, Floor_name, Room_name, \
             Product_name, Product_class_ID, Product_ID, Screen_Name, Bautrate, Background_imgID, \
             Hardware_Ver, Software_Ver, Com_Port, EPsize, Protocol, Online_Status, NetworkCard_Address, \
             Custom, Parent_SerialNum, Panal_Number, Object_Instance) VALUES \
             ('Default_Building','Default_Building','{s}','floor1','room1','{n}','{c}','{p}','','19200',\
             'Sub Device RS485','10.0','68.8','502','0','0',{on},'{ip}','0','{par}','{pn}','{s}');",
            s = serial,
            n = name,
            c = class_id,
            p = product_id,
            on = online,
            ip = ip,
            par = parent,
            pn = panel
        ));
    }
    run_sql(&building, &sql);

    dir
}

fn run_sql(path: &std::path::Path, sql: &str) {
    let output = std::process::Command::new("sqlite3")
        .arg(path)
        .arg(sql)
        .output();
    match output {
        Ok(out) if out.status.success() => {}
        Ok(out) => panic!("sqlite3 failed: {}", String::from_utf8_lossy(&out.stderr)),
        Err(e) => panic!("sqlite3 not available ({}); cannot build the fixture", e),
    }
}

#[tokio::test]
async fn reads_devices_t3000_lists_in_its_tree() {
    // A parent controller plus two RS485 sub-devices — the shape of a
    // "Local View → Tstat10 / TSTAT7" tree.
    let dir = make_t3000_db(
        "read",
        &[
            ("212375", "T3-TB", "74", "1", "39", "0", "1", "192.168.0.172"),
            ("237853", "Tstat10-99", "10", "99", "99", "212375", "1", ""),
            ("241396", "TSTAT7", "10", "100", "13", "212375", "0", ""),
        ],
    );

    let nodes = t3000_building_db::read_all_nodes_from(&dir)
        .await
        .expect("read_all_nodes_from failed");

    assert_eq!(nodes.len(), 3, "one row per device");

    let parent = nodes.iter().find(|n| n.serial_number == 212375).unwrap();
    assert_eq!(parent.product_name, "T3-TB");
    assert_eq!(parent.panel_number, Some(39));
    assert!(parent.online);
    assert_eq!(parent.ip_address.as_deref(), Some("192.168.0.172"));
    assert_eq!(parent.parent_serial_number, Some(0));

    let serial_dev = nodes.iter().find(|n| n.serial_number == 237853).unwrap();
    assert_eq!(serial_dev.product_name, "Tstat10-99");
    assert_eq!(serial_dev.panel_number, Some(99));
    assert_eq!(serial_dev.object_instance, Some(237853));
    assert_eq!(serial_dev.parent_serial_number, Some(212375));
    assert!(serial_dev.online, "Online_Status=1");
    assert_eq!(serial_dev.connection_type.as_deref(), Some("Sub Device RS485"));
    // No IP on an RS485 device: `Bautrate` holds the baud rate, not an address.
    assert_eq!(serial_dev.ip_address, None);
    assert_eq!(serial_dev.baudrate.as_deref(), Some("19200"));

    let offline = nodes.iter().find(|n| n.serial_number == 241396).unwrap();
    assert!(!offline.online, "red-X device in T3000's tree");

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn falls_back_when_building_path_is_stale() {
    // `Building_Path` points at a file that does not exist — T3000 does this
    // after a rename, so the fallback must still find the building database.
    let dir = make_t3000_db(
        "stale",
        &[("1028", "T3-TSTAT11-ESP", "88", "1", "1", "0", "1", "192.168.1.4")],
    );
    run_sql(
        &dir.join("T3000.db"),
        "UPDATE Building SET Building_Path='Database/Buildings/Gone/Gone.db';",
    );

    let nodes = t3000_building_db::read_all_nodes_from(&dir)
        .await
        .expect("fallback should find Buildings/*/*.db");
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].serial_number, 1028);

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn missing_database_reports_an_error_instead_of_panicking() {
    let dir = std::env::temp_dir().join(format!("t3_t3000_db_missing_{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();

    let result = t3000_building_db::read_all_nodes_from(&dir).await;
    assert!(result.is_err(), "no T3000.db → error, not an empty device list");

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn reads_the_t3000_configured_com_port() {
    // The serial scan must not probe the port T3000 polls — it would only get
    // "Access is denied". `Building.Com_Port` says which one that is.
    let dir = make_t3000_db("comport", &[]);

    let ports = t3000_building_db::t3000_serial_ports_from(&dir).await;
    assert_eq!(ports, vec!["COM8".to_string()]);

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn reading_never_blocks_the_t3000_writer() {
    // T3000's databases use SQLite's default `delete` journal mode, where a
    // reader holding a shared lock blocks the writer. Measured on a copy of the
    // real file: a reader that keeps its transaction open makes the writer fail
    // with "database is locked". The import must therefore never do that.
    //
    // This simulates T3000's background tree-refresh loop (writes continuously)
    // while the importer reads, and asserts both sides stay healthy.
    let dir = make_t3000_db(
        "nolock",
        &[
            ("212375", "T3-TB", "74", "1", "39", "0", "1", "192.168.0.172"),
            ("237853", "Tstat10-99", "10", "99", "99", "212375", "1", ""),
        ],
    );
    let building = dir
        .join("Buildings")
        .join("Default_Building")
        .join("Default_Building.db");

    // Writer: behaves like CheckDeviceStatus/DoFreshAll — short write
    // transactions, 60 s busy timeout (CppSQLite3DB::open).
    let writer_path = building.clone();
    let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let stop_w = stop.clone();
    let writer = std::thread::spawn(move || {
        use sea_orm::{ConnectionTrait, Database, DatabaseBackend, Statement};

        let url = format!("sqlite:///{}?mode=rw", writer_path.to_string_lossy().replace('\\', "/"));
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let (writes, failures, max_us) = rt.block_on(async move {
            let mut opt = sea_orm::ConnectOptions::new(&url);
            opt.max_connections(1).min_connections(1).sqlx_logging(false);
            let conn = Database::connect(opt).await.expect("writer connect");
            // T3000: CppSQLite3DB::open -> sqlite3_busy_timeout(60000)
            conn.execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "PRAGMA busy_timeout = 60000;".to_string(),
            ))
            .await
            .ok();

            let mut max_us: u128 = 0;
            let mut failures = 0usize;
            let mut writes = 0usize;
            while !stop_w.load(std::sync::atomic::Ordering::Relaxed) {
                let t0 = std::time::Instant::now();
                match conn
                    .execute(Statement::from_string(
                        DatabaseBackend::Sqlite,
                        "UPDATE ALL_NODE SET Online_Status = 1 - Online_Status;".to_string(),
                    ))
                    .await
                {
                    Ok(_) => {
                        writes += 1;
                        max_us = max_us.max(t0.elapsed().as_micros());
                    }
                    Err(_) => failures += 1,
                }
                tokio::time::sleep(std::time::Duration::from_millis(5)).await;
            }
            (writes, failures, max_us)
        });
        (writes, failures, max_us)
    });

    // Reader: the real importer, run repeatedly while the writer is active.
    let start = std::time::Instant::now();
    let mut reads = 0usize;
    let mut read_errors: Vec<String> = Vec::new();
    let mut max_read_us: u128 = 0;
    while start.elapsed() < std::time::Duration::from_millis(1500) {
        let t0 = std::time::Instant::now();
        match t3000_building_db::read_all_nodes_from(&dir).await {
            Ok(nodes) => {
                reads += 1;
                max_read_us = max_read_us.max(t0.elapsed().as_micros());
                assert_eq!(nodes.len(), 2, "reader must always see the full list");
            }
            Err(e) => read_errors.push(e),
        }
        tokio::time::sleep(std::time::Duration::from_millis(2)).await;
    }

    stop.store(true, std::sync::atomic::Ordering::Relaxed);
    let (writes, write_failures, max_write_us) = writer.join().unwrap();

    eprintln!(
        "{} reads ({} errors, max {} µs) vs {} writes ({} failures, max {} µs)",
        reads,
        read_errors.len(),
        max_read_us,
        writes,
        write_failures,
        max_write_us
    );

    assert!(writes > 20, "the writer should have run: {} writes", writes);
    assert!(reads > 10, "the reader should have run: {} reads", reads);
    assert!(
        read_errors.is_empty(),
        "importer failed while T3000 was writing: {:?}",
        &read_errors[..read_errors.len().min(3)]
    );
    assert_eq!(
        write_failures, 0,
        "the importer blocked T3000's writer {} time(s) — this must never happen",
        write_failures
    );
    // T3000 retries for 60 s, so anything above a few hundred ms of blocking
    // would mean we hold the lock far too long.
    assert!(
        max_write_us < 500_000,
        "a T3000 write took {} µs — the importer held a lock too long",
        max_write_us
    );

    let _ = std::fs::remove_dir_all(&dir);
}

/// Reads the developer machine's real T3000 database when it is present.
/// Skips silently elsewhere (CI, clean checkout).
#[tokio::test]
async fn reads_the_local_t3000_database_if_present() {
    let Some(dir) = t3000_building_db::resolve_database_dir() else {
        eprintln!("skipping: no T3000 Database folder found");
        return;
    };

    let nodes = t3000_building_db::read_all_nodes_from(&dir)
        .await
        .expect("reading the local T3000 database failed");

    eprintln!("{}: {} device(s) from ALL_NODE", dir.display(), nodes.len());
    for node in nodes.iter().take(10) {
        eprintln!(
            "  SN {:<9} panel {:<5} {:<24} online={} parent={:?}",
            node.serial_number,
            node.panel_number.unwrap_or(-1),
            node.product_name,
            node.online,
            node.parent_serial_number
        );
    }
}
