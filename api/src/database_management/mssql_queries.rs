//! MSSQL Raw SQL Queries — tiberius-based operations for SQL Server
//!
//! Provides parameterized T-SQL equivalents for the key SeaORM operations
//! used in FFI sync and trendlog services:
//! - DEVICES: upsert (MERGE)
//! - INPUTS, OUTPUTS, VARIABLES: upsert (MERGE)
//! - PROGRAMS, SCHEDULES: upsert (MERGE)
//! - TRENDLOG_DATA: get-or-create parent
//! - TRENDLOG_DATA_DETAIL: insert detail row
//! - TRENDLOGS: upsert metadata
//! - TRENDLOG_INPUTS: upsert input mapping
//! - DATA_SYNC_METADATA: insert sync record
//!
//! All queries use parameterized `@P1, @P2, …` syntax to prevent SQL injection.

use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use serde_json::{json, Value};

/// Type alias for a bb8-managed tiberius connection pool.
pub type MssqlPool = Pool<ConnectionManager>;

fn category_filter_variants(category: &str) -> Vec<String> {
    let upper = category.trim().to_ascii_uppercase();
    match upper.as_str() {
        "CONFIG" | "DB_CONFIG" => vec!["CONFIG".to_string(), "DB_CONFIG".to_string()],
        "STARTUP" | "SERVER_EVENT" => vec!["STARTUP".to_string(), "SERVER_EVENT".to_string()],
        "POLL" | "TRENDLOG_BACKEND" | "SAMPLING" | "FFI_POLL" => vec![
            "POLL".to_string(),
            "TRENDLOG_BACKEND".to_string(),
            "SAMPLING".to_string(),
            "FFI_POLL".to_string(),
        ],
        "DEVICE" | "DEVICE_SYNC" => vec!["DEVICE".to_string(), "DEVICE_SYNC".to_string()],
        "TRENDLOG" | "TREND_LOG" | "TD_READ" | "TD_WRITE" | "TD_INPUTS" | "TD_FFI" | "TD_SYNC" => vec![
            "TRENDLOG".to_string(),
            "TREND_LOG".to_string(),
            "TD_READ".to_string(),
            "TD_WRITE".to_string(),
            "TD_INPUTS".to_string(),
            "TD_FFI".to_string(),
            "TD_SYNC".to_string(),
        ],
        _ => vec![upper],
    }
}

fn normalize_level_filter(level: Option<&str>) -> Option<&'static str> {
    let lowered = level?.trim().to_ascii_lowercase();
    match lowered.as_str() {
        "error" | "err" => Some("error"),
        "warn" | "warning" => Some("warn"),
        "info" => Some("info"),
        "debug" => Some("debug"),
        _ => None,
    }
}

/// Build a bb8 connection pool for SQL Server.
///
/// Uses the tiberius Config already built by `db_backend_config::build_mssql_config()`.
pub async fn create_mssql_pool(
    config: tiberius::Config,
    max_size: u32,
) -> Result<MssqlPool, String> {
    let mgr = ConnectionManager::build(config)
        .map_err(|e| format!("Failed to create MSSQL connection manager: {}", e))?;

    Pool::builder()
        .max_size(max_size)
        .min_idle(Some(1))
        .build(mgr)
        .await
        .map_err(|e| format!("Failed to create MSSQL pool: {}", e))
}

/// Verify that the connected SQL Server database contains the minimum T3000 schema.
pub async fn validate_t3000_schema(pool: &MssqlPool) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query(
            "SELECT COUNT(*) \
             FROM sys.tables \
             WHERE name IN ('DEVICES', 'DATA_SYNC_METADATA')",
            &[],
        )
        .await
        .map_err(|e| format!("Schema validation query failed: {}", e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("Schema validation row fetch failed: {}", e))?;

    let table_count = row
        .and_then(|r| r.get::<i32, _>(0))
        .unwrap_or(0);

    if table_count >= 2 {
        Ok(())
    } else {
        Err("Connected to SQL Server, but the T3000 database is not initialized".to_string())
    }
}

// ============================================================================
// DEVICES — MERGE (upsert by SerialNumber)
// ============================================================================

/// Upsert a single device row.
pub async fn upsert_device(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: Option<i32>,
    main_building_name: Option<&str>,
    building_name: Option<&str>,
    floor_name: Option<&str>,
    room_name: Option<&str>,
    panel_number: Option<i32>,
    network_number: Option<i32>,
    product_name: Option<&str>,
    product_class_id: Option<i32>,
    product_id: Option<i32>,
    bautrate: Option<&str>,
    address: Option<&str>,
    description: Option<&str>,
    status: Option<&str>,
    ip_address: Option<&str>,
    port: Option<i32>,
    bacnet_mstp_mac_id: Option<i32>,
    modbus_address: Option<i32>,
    pc_ip_address: Option<&str>,
    modbus_port: Option<i32>,
    bacnet_ip_port: Option<i32>,
    show_label_name: Option<&str>,
    connection_type: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "MERGE INTO DEVICES AS target \
         USING (SELECT @P1 AS SerialNumber) AS source \
         ON target.SerialNumber = source.SerialNumber \
         WHEN MATCHED THEN UPDATE SET \
           PanelId = @P2, MainBuilding_Name = @P3, Building_Name = @P4, Floor_Name = @P5, \
           Room_Name = @P6, Panel_Number = @P7, Network_Number = @P8, Product_Name = @P9, \
           Product_Class_ID = @P10, Product_ID = @P11, Bautrate = @P12, Address = @P13, \
           Description = @P14, Status = @P15, ip_address = @P16, port = @P17, \
           bacnet_mstp_mac_id = @P18, modbus_address = @P19, pc_ip_address = @P20, \
           modbus_port = @P21, bacnet_ip_port = @P22, show_label_name = @P23, \
           connection_type = @P24 \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, PanelId, MainBuilding_Name, Building_Name, Floor_Name, Room_Name, \
            Panel_Number, Network_Number, Product_Name, Product_Class_ID, Product_ID, Bautrate, \
            Address, Description, Status, ip_address, port, bacnet_mstp_mac_id, modbus_address, \
            pc_ip_address, modbus_port, bacnet_ip_port, show_label_name, connection_type) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12, \
                 @P13, @P14, @P15, @P16, @P17, @P18, @P19, @P20, @P21, @P22, @P23, @P24);",
        &[
            &serial_number,          // @P1
            &panel_id,               // @P2
            &main_building_name,     // @P3
            &building_name,          // @P4
            &floor_name,             // @P5
            &room_name,              // @P6
            &panel_number,           // @P7
            &network_number,         // @P8
            &product_name,           // @P9
            &product_class_id,       // @P10
            &product_id,             // @P11
            &bautrate,               // @P12
            &address,                // @P13
            &description,            // @P14
            &status,                 // @P15
            &ip_address,             // @P16
            &port,                   // @P17
            &bacnet_mstp_mac_id,     // @P18
            &modbus_address,         // @P19
            &pc_ip_address,          // @P20
            &modbus_port,            // @P21
            &bacnet_ip_port,         // @P22
            &show_label_name,        // @P23
            &connection_type,        // @P24
        ],
    )
    .await
    .map_err(|e| format!("DEVICES MERGE failed: {}", e))?;

    Ok(())
}

fn clean_cpp_string(value: Option<&str>) -> Option<String> {
    value.and_then(|raw| {
        let cleaned = raw.split('\0').next().unwrap_or("").trim().to_string();
        if cleaned.is_empty() {
            None
        } else {
            Some(cleaned)
        }
    })
}

pub async fn list_devices_with_stats(pool: &MssqlPool) -> Result<Vec<Value>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query(
            "SELECT SerialNumber, PanelId, MainBuilding_Name, Building_Name, Floor_Name, Room_Name, \
                    Panel_Number, Network_Number, Product_Name, Product_Class_ID, Product_ID, \
                    Bautrate, Address, Description, Status, ip_address, port, bacnet_mstp_mac_id, \
                    modbus_address, pc_ip_address, modbus_port, bacnet_ip_port, show_label_name, \
                    connection_type \
             FROM DEVICES \
             ORDER BY SerialNumber",
            &[],
        )
        .await
        .map_err(|e| format!("DEVICES SELECT failed: {}", e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("DEVICES row fetch failed: {}", e))?;

    let mut devices = Vec::new();
    for result_set in result_sets {
        for row in result_set {
            let serial_number = row.get::<i32, _>(0).unwrap_or(0);
            let product_name = clean_cpp_string(row.get::<&str, _>(8));
            let show_label_name = clean_cpp_string(row.get::<&str, _>(22))
                .or_else(|| Some(format!("Device {}", serial_number)));

            devices.push(json!({
                "device": {
                    "serialNumber": serial_number,
                    "panelId": row.get::<i32, _>(1),
                    "mainBuildingName": clean_cpp_string(row.get::<&str, _>(2)),
                    "buildingName": clean_cpp_string(row.get::<&str, _>(3)),
                    "floorName": clean_cpp_string(row.get::<&str, _>(4)),
                    "roomName": clean_cpp_string(row.get::<&str, _>(5)),
                    "panelNumber": row.get::<i32, _>(6),
                    "networkNumber": row.get::<i32, _>(7),
                    "productName": product_name,
                    "productClassId": row.get::<i32, _>(9),
                    "productId": row.get::<i32, _>(10),
                    "screenName": Value::Null,
                    "bautrate": clean_cpp_string(row.get::<&str, _>(11)),
                    "address": clean_cpp_string(row.get::<&str, _>(12)),
                    "register": Value::Null,
                    "function": Value::Null,
                    "description": clean_cpp_string(row.get::<&str, _>(13)),
                    "highUnits": Value::Null,
                    "lowUnits": Value::Null,
                    "updateField": Value::Null,
                    "status": clean_cpp_string(row.get::<&str, _>(14)),
                    "rangeField": Value::Null,
                    "calibration": Value::Null,
                    "ipAddress": clean_cpp_string(row.get::<&str, _>(15)),
                    "port": row.get::<i32, _>(16),
                    "bacnetMstpMacId": row.get::<i32, _>(17),
                    "modbusAddress": row.get::<i32, _>(18),
                    "pcIpAddress": clean_cpp_string(row.get::<&str, _>(19)),
                    "modbusPort": row.get::<i32, _>(20),
                    "bacnetIpPort": row.get::<i32, _>(21),
                    "showLabelName": show_label_name,
                    "connectionType": clean_cpp_string(row.get::<&str, _>(23))
                },
                "input_count": 0,
                "output_count": 0,
                "variable_count": 0,
                "total_points": 0
            }));
        }
    }

    Ok(devices)
}

// ============================================================================
// INPUTS / OUTPUTS / VARIABLES — MERGE by (SerialNumber, InputId/OutputId/VariableId)
// ============================================================================

/// Generic upsert for point tables (INPUTS, OUTPUTS, VARIABLES).
///
/// All three tables share the same column layout except for the ID column name.
/// `table_name` must be one of: "INPUTS", "OUTPUTS", "VARIABLES"
/// `id_column` is the primary identifier: "InputId", "OutputId", "VariableId"
pub async fn upsert_point(
    pool: &MssqlPool,
    table_name: &str,
    id_column: &str,
    serial_number: i32,
    point_id: &str,
    point_index: Option<&str>,
    panel: Option<&str>,
    full_label: Option<&str>,
    auto_manual: Option<&str>,
    value: Option<&str>,
    units: Option<&str>,
    range_field: Option<&str>,
    status: Option<&str>,
    digital_analog: Option<&str>,
    label: Option<&str>,
) -> Result<(), String> {
    // Validate table_name to prevent SQL injection (whitelist approach)
    let (table, id_col, index_col) = validate_point_table(table_name, id_column)?;

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!(
        "MERGE INTO [{table}] AS target \
         USING (SELECT @P1 AS SerialNumber, @P2 AS [{id_col}]) AS source \
         ON target.SerialNumber = source.SerialNumber AND target.[{id_col}] = source.[{id_col}] \
         WHEN MATCHED THEN UPDATE SET \
           [{index_col}] = @P3, Panel = @P4, Full_Label = @P5, Auto_Manual = @P6, \
           fValue = @P7, Units = @P8, Range_Field = @P9, Status = @P10, \
           Digital_Analog = @P11, Label = @P12 \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, [{id_col}], [{index_col}], Panel, Full_Label, Auto_Manual, \
            fValue, Units, Range_Field, Status, Digital_Analog, Label) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12);"
    );

    conn.execute(
        sql.as_str(),
        &[
            &serial_number,   // @P1
            &point_id,        // @P2
            &point_index,     // @P3
            &panel,           // @P4
            &full_label,      // @P5
            &auto_manual,     // @P6
            &value,           // @P7
            &units,           // @P8
            &range_field,     // @P9
            &status,          // @P10
            &digital_analog,  // @P11
            &label,           // @P12
        ],
    )
    .await
    .map_err(|e| format!("{} MERGE failed: {}", table, e))?;

    Ok(())
}

/// Whitelist valid point table/column names to prevent injection.
fn validate_point_table<'a>(table: &'a str, id_col: &'a str) -> Result<(&'a str, &'a str, &'a str), String> {
    match (table, id_col) {
        ("INPUTS", "InputId") => Ok(("INPUTS", "InputId", "Input_Index")),
        ("OUTPUTS", "OutputId") => Ok(("OUTPUTS", "OutputId", "Output_Index")),
        ("VARIABLES", "VariableId") => Ok(("VARIABLES", "VariableId", "Variable_Index")),
        _ => Err(format!("Invalid point table/column: {}/{}", table, id_col)),
    }
}

// ============================================================================
// PROGRAMS — MERGE by (SerialNumber, Program_ID)
// ============================================================================

pub async fn upsert_program(
    pool: &MssqlPool,
    serial_number: i32,
    program_id: &str,
    program_label: Option<&str>,
    program_status: Option<&str>,
    auto_manual: Option<&str>,
    program_size: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "MERGE INTO PROGRAMS AS target \
         USING (SELECT @P1 AS SerialNumber, @P2 AS Program_ID) AS source \
         ON target.SerialNumber = source.SerialNumber AND target.Program_ID = source.Program_ID \
         WHEN MATCHED THEN UPDATE SET \
           Program_Label = @P3, Program_Status = @P4, Auto_Manual = @P5, Program_Size = @P6 \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, Program_ID, Program_Label, Program_Status, Auto_Manual, Program_Size) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6);",
        &[
            &serial_number,    // @P1
            &program_id,       // @P2
            &program_label,    // @P3
            &program_status,   // @P4
            &auto_manual,      // @P5
            &program_size,     // @P6
        ],
    )
    .await
    .map_err(|e| format!("PROGRAMS MERGE failed: {}", e))?;

    Ok(())
}

// ============================================================================
// SCHEDULES — MERGE by (SerialNumber, Schedule_ID)
// ============================================================================

pub async fn upsert_schedule(
    pool: &MssqlPool,
    serial_number: i32,
    schedule_id: &str,
    auto_manual: Option<&str>,
    output_field: Option<&str>,
    status1: Option<&str>,
    status2: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "MERGE INTO SCHEDULES AS target \
         USING (SELECT @P1 AS SerialNumber, @P2 AS Schedule_ID) AS source \
         ON target.SerialNumber = source.SerialNumber AND target.Schedule_ID = source.Schedule_ID \
         WHEN MATCHED THEN UPDATE SET \
           Auto_Manual = @P3, Output_Field = @P4, Status1 = @P5, Status2 = @P6 \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, Schedule_ID, Auto_Manual, Output_Field, Status1, Status2) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6);",
        &[
            &serial_number,    // @P1
            &schedule_id,      // @P2
            &auto_manual,      // @P3
            &output_field,     // @P4
            &status1,          // @P5
            &status2,          // @P6
        ],
    )
    .await
    .map_err(|e| format!("SCHEDULES MERGE failed: {}", e))?;

    Ok(())
}

// ============================================================================
// TRENDLOG_DATA (Parent) — get-or-create by unique key
// ============================================================================

/// Find an existing TRENDLOG_DATA parent row or create one.
/// Returns the parent row ID.
pub async fn get_or_create_trendlog_parent(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    point_id: &str,
    point_index: i32,
    point_type: &str,
    digital_analog: Option<&str>,
    range_field: Option<&str>,
    units: Option<&str>,
    description: Option<&str>,
) -> Result<i32, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    // Try to find existing
    let result = conn
        .query(
            "SELECT id FROM TRENDLOG_DATA \
             WHERE SerialNumber = @P1 AND PanelId = @P2 AND PointId = @P3 \
               AND PointIndex = @P4 AND PointType = @P5",
            &[
                &serial_number,
                &panel_id,
                &point_id,
                &point_index,
                &point_type,
            ],
        )
        .await
        .map_err(|e| format!("TRENDLOG_DATA SELECT failed: {}", e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("TRENDLOG_DATA row fetch failed: {}", e))?;

    if let Some(row) = row {
        let id: i32 = row.get(0).ok_or("Missing id column")?;
        return Ok(id);
    }

    // Insert new parent and return the IDENTITY id
    let insert_result = conn
        .query(
            "INSERT INTO TRENDLOG_DATA \
               (SerialNumber, PanelId, PointId, PointIndex, PointType, \
                Digital_Analog, Range_Field, Units, Description, IsActive) \
             OUTPUT INSERTED.id \
             VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, 1)",
            &[
                &serial_number,
                &panel_id,
                &point_id,
                &point_index,
                &point_type,
                &digital_analog,
                &range_field,
                &units,
                &description,
            ],
        )
        .await
        .map_err(|e| format!("TRENDLOG_DATA INSERT failed: {}", e))?;

    let new_row = insert_result
        .into_row()
        .await
        .map_err(|e| format!("TRENDLOG_DATA IDENTITY fetch failed: {}", e))?
        .ok_or("No IDENTITY returned from insert")?;

    let id: i32 = new_row.get(0).ok_or("Missing IDENTITY value")?;
    Ok(id)
}

// ============================================================================
// TRENDLOG_DATA_DETAIL — insert detail row
// ============================================================================

/// Insert a single trendlog detail (value + timestamp).
pub async fn insert_trendlog_detail(
    pool: &MssqlPool,
    parent_id: i32,
    value: &str,
    logging_time_fmt: &str,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "INSERT INTO TRENDLOG_DATA_DETAIL (ParentId, Value, LoggingTime_Fmt) \
         VALUES (@P1, @P2, @P3)",
        &[&parent_id, &value, &logging_time_fmt],
    )
    .await
    .map_err(|e| format!("TRENDLOG_DATA_DETAIL INSERT failed: {}", e))?;

    Ok(())
}

// ============================================================================
// TRENDLOGS — upsert metadata
// ============================================================================

pub async fn upsert_trendlog(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    trendlog_id: &str,
    trendlog_label: Option<&str>,
    interval_seconds: Option<i32>,
    status: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "MERGE INTO TRENDLOGS AS target \
         USING (SELECT @P1 AS SerialNumber, @P2 AS PanelId, @P3 AS Trendlog_ID) AS source \
         ON target.SerialNumber = source.SerialNumber \
            AND target.PanelId = source.PanelId \
            AND target.Trendlog_ID = source.Trendlog_ID \
         WHEN MATCHED THEN UPDATE SET \
           Trendlog_Label = @P4, Interval_Seconds = @P5, Status = @P6, \
           updated_at = GETUTCDATE() \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, PanelId, Trendlog_ID, Trendlog_Label, Interval_Seconds, Status) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6);",
        &[
            &serial_number,      // @P1
            &panel_id,           // @P2
            &trendlog_id,        // @P3
            &trendlog_label,     // @P4
            &interval_seconds,   // @P5
            &status,             // @P6
        ],
    )
    .await
    .map_err(|e| format!("TRENDLOGS MERGE failed: {}", e))?;

    Ok(())
}

// ============================================================================
// TRENDLOG_INPUTS — upsert input mapping
// ============================================================================

pub async fn upsert_trendlog_input(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: i32,
    trendlog_id: &str,
    point_type: &str,
    point_index: &str,
    point_label: Option<&str>,
    status: Option<&str>,
    view_type: &str,
    view_number: Option<i32>,
    is_selected: i32,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "MERGE INTO TRENDLOG_INPUTS AS target \
         USING (SELECT @P1 AS SerialNumber, @P2 AS PanelId, @P3 AS Trendlog_ID, \
                       @P4 AS Point_Type, @P5 AS Point_Index, @P8 AS view_type, @P9 AS view_number) AS source \
         ON target.SerialNumber = source.SerialNumber \
            AND target.PanelId = source.PanelId \
            AND target.Trendlog_ID = source.Trendlog_ID \
            AND target.Point_Type = source.Point_Type \
            AND target.Point_Index = source.Point_Index \
            AND target.view_type = source.view_type \
            AND (target.view_number = source.view_number OR (target.view_number IS NULL AND source.view_number IS NULL)) \
         WHEN MATCHED THEN UPDATE SET \
           Point_Label = @P6, Status = @P7, is_selected = @P10, updated_at = GETUTCDATE() \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, PanelId, Trendlog_ID, Point_Type, Point_Index, \
            Point_Label, Status, view_type, view_number, is_selected) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10);",
        &[
            &serial_number,    // @P1
            &panel_id,         // @P2
            &trendlog_id,      // @P3
            &point_type,       // @P4
            &point_index,      // @P5
            &point_label,      // @P6
            &status,           // @P7
            &view_type,        // @P8
            &view_number,      // @P9
            &is_selected,      // @P10
        ],
    )
    .await
    .map_err(|e| format!("TRENDLOG_INPUTS MERGE failed: {}", e))?;

    Ok(())
}

// ============================================================================
// TRENDLOG_DATA_SYNC_METADATA — insert sync record (MSSQL mirror of local SQLite table)
// ============================================================================

pub async fn insert_trendlog_sync_metadata(
    pool: &MssqlPool,
    sync_time_fmt: &str,
    message_type: &str,
    panel_id: Option<i32>,
    serial_number: Option<i32>,
    records_inserted: i32,
    sync_interval: i32,
    success: i32,
    error_message: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "INSERT INTO TRENDLOG_DATA_SYNC_METADATA \
           (SyncTime_Fmt, MessageType, PanelId, SerialNumber, RecordsInserted, \
            SyncInterval, Success, ErrorMessage) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8)",
        &[
            &sync_time_fmt,      // @P1
            &message_type,       // @P2
            &panel_id,           // @P3
            &serial_number,      // @P4
            &records_inserted,   // @P5
            &sync_interval,      // @P6
            &success,            // @P7
            &error_message,      // @P8
        ],
    )
    .await
    .map_err(|e| format!("TRENDLOG_DATA_SYNC_METADATA INSERT failed: {}", e))?;

    Ok(())
}

// ============================================================================
// DATA_SYNC_METADATA — insert sync record
// ============================================================================

pub async fn insert_sync_metadata(
    pool: &MssqlPool,
    sync_time: i32,
    sync_time_fmt: &str,
    data_type: &str,
    serial_number: &str,
    panel_id: Option<i32>,
    records_synced: i32,
    sync_method: &str,
    success: i32,
    error_message: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "INSERT INTO DATA_SYNC_METADATA \
           (sync_time, sync_time_fmt, data_type, serial_number, panel_id, \
            records_synced, sync_method, success, error_message) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)",
        &[
            &sync_time,         // @P1
            &sync_time_fmt,     // @P2
            &data_type,         // @P3
            &serial_number,     // @P4
            &panel_id,          // @P5
            &records_synced,    // @P6
            &sync_method,       // @P7
            &success,           // @P8
            &error_message,     // @P9
        ],
    )
    .await
    .map_err(|e| format!("DATA_SYNC_METADATA INSERT failed: {}", e))?;

    Ok(())
}

// ============================================================================
// T3_APP_LOG — insert one row / query rows
// ============================================================================

/// Insert one row into MSSQL T3_APP_LOG.
/// Called fire-and-forget from `write_app_log` when the MSSQL pool is active.
pub async fn insert_app_log(
    pool: &MssqlPool,
    ts_unix: i64,
    ts_fmt: &str,
    level: &str,
    category: &str,
    source: Option<&str>,
    hostname: &str,
    device_serial: Option<&str>,
    message: &str,
    details: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "INSERT INTO T3_APP_LOG \
           (ts_unix, ts_fmt, level, category, source, hostname, device_serial, message, details) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)",
        &[
            &ts_unix,       // @P1
            &ts_fmt,        // @P2
            &level,         // @P3
            &category,      // @P4
            &source,        // @P5
            &hostname,      // @P6
            &device_serial, // @P7
            &message,       // @P8
            &details,       // @P9
        ],
    )
    .await
    .map_err(|e| format!("T3_APP_LOG INSERT failed: {}", e))?;

    Ok(())
}

/// Fetch at most `fetch_count` recent rows from MSSQL T3_APP_LOG,
/// optionally filtered by level and/or category.
/// Returns rows as `serde_json::Value` objects so `sync_health` can merge
/// them with SQLite rows without coupling the query types.
pub async fn query_app_log(
    pool: &MssqlPool,
    level_filter: Option<&str>,
    category_filter: Option<&str>,
    fetch_count: u32,
) -> Result<Vec<serde_json::Value>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let mut where_parts: Vec<String> = Vec::new();
    if let Some(lvl) = normalize_level_filter(level_filter) {
        where_parts.push(format!("level = '{}'", lvl));
    }
    if let Some(cat) = category_filter {
        let variants = category_filter_variants(cat);
        let in_list = variants
            .iter()
            .map(|v| format!("'{}'", v.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        where_parts.push(format!("category IN ({})", in_list));
    }
    let where_sql = if where_parts.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_parts.join(" AND "))
    };

    // Guard with IF OBJECT_ID so that if T3_APP_LOG hasn't been created yet in
    // this MSSQL instance, SQL Server returns an empty result set instead of an
    // "Invalid object name" error that can cause tiberius to panic in 0.12.x.
    let sql = format!(
        "IF OBJECT_ID('T3_APP_LOG', 'U') IS NOT NULL \
         SELECT TOP {} id, ts_unix, ts_fmt, level, category, source, \
                hostname, device_serial, message, details \
         FROM T3_APP_LOG{} ORDER BY ts_unix DESC",
        fetch_count, where_sql
    );

    let result = conn
        .query(&sql, &[])
        .await
        .map_err(|e| format!("T3_APP_LOG SELECT failed: {}", e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("T3_APP_LOG row fetch failed: {}", e))?;

    let mut rows = Vec::new();
    for result_set in result_sets {
        for row in result_set {
            let id: i64 = row.get::<i32, _>(0).unwrap_or(0) as i64; // INT in MSSQL, cast to i64
            let ts_unix: i64 = row.get::<i64, _>(1).unwrap_or(0);
            let ts_fmt = clean_cpp_string(row.get::<&str, _>(2)).unwrap_or_default();
            let level = clean_cpp_string(row.get::<&str, _>(3))
                .unwrap_or_else(|| "info".to_string());
            let category = clean_cpp_string(row.get::<&str, _>(4))
                .unwrap_or_else(|| "SERVER_EVENT".to_string());
            let source: Option<String> = clean_cpp_string(row.get::<&str, _>(5));
            let hostname: Option<String> = clean_cpp_string(row.get::<&str, _>(6));
            let device_serial: Option<String> = clean_cpp_string(row.get::<&str, _>(7));
            let message = clean_cpp_string(row.get::<&str, _>(8)).unwrap_or_default();
            let details: Option<String> = clean_cpp_string(row.get::<&str, _>(9));

            rows.push(serde_json::json!({
                "id":            id,
                "ts_unix":       ts_unix,
                "ts_fmt":        ts_fmt,
                "level":         level,
                "category":      category,
                "sink":          "MSSQL",
                "source":        source,
                "hostname":      hostname,
                "role":          serde_json::Value::Null,
                "device_serial": device_serial,
                "message":       message,
                "details":       details,
            }));
        }
    }

    Ok(rows)
}

/// Count rows in MSSQL T3_APP_LOG with optional level/category filters.
pub async fn count_app_log(
    pool: &MssqlPool,
    level_filter: Option<&str>,
    category_filter: Option<&str>,
) -> Result<i64, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let mut where_parts: Vec<String> = Vec::new();
    if let Some(lvl) = normalize_level_filter(level_filter) {
        where_parts.push(format!("level = '{}'", lvl));
    }
    if let Some(cat) = category_filter {
        let variants = category_filter_variants(cat);
        let in_list = variants
            .iter()
            .map(|v| format!("'{}'", v.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        where_parts.push(format!("category IN ({})", in_list));
    }
    let where_sql = if where_parts.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_parts.join(" AND "))
    };

    let sql = format!(
        "IF OBJECT_ID('T3_APP_LOG', 'U') IS NOT NULL \
         SELECT COUNT(*) AS cnt FROM T3_APP_LOG{}",
        where_sql
    );

    let result = conn
        .query(&sql, &[])
        .await
        .map_err(|e| format!("T3_APP_LOG COUNT failed: {}", e))?;

    // Use into_results() (not into_row()) to fully drain ALL result sets produced
    // by the IF ... SELECT batch. into_row() only reads the first result set and
    // leaves any trailing done-tokens unconsumed; when the bb8 connection is
    // returned to the pool, tiberius 0.12.x panics on the unread data, which
    // silently drops the HTTP connection (0 B response on the client).
    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("T3_APP_LOG COUNT row fetch failed: {}", e))?;

    // COUNT(*) returns INT (i32) in SQL Server, not BIGINT, so try i32 first.
    let mut total: i64 = 0;
    'outer: for result_set in result_sets {
        for row in result_set {
            if let Some(v) = row.get::<i32, _>(0) {
                total = v as i64;
                break 'outer;
            }
            if let Some(v) = row.get::<i64, _>(0) {
                total = v;
                break 'outer;
            }
        }
    }
    Ok(total)
}

/// Return distinct category values from MSSQL T3_APP_LOG.
pub async fn query_app_log_categories(
    pool: &MssqlPool,
) -> Result<Vec<String>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = "IF OBJECT_ID('T3_APP_LOG', 'U') IS NOT NULL \
               SELECT DISTINCT category FROM T3_APP_LOG \
               WHERE category IS NOT NULL AND category <> ''";

    let result = conn
        .query(sql, &[])
        .await
        .map_err(|e| format!("T3_APP_LOG DISTINCT category failed: {}", e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("T3_APP_LOG DISTINCT category row fetch failed: {}", e))?;

    let mut cats = Vec::new();
    for result_set in result_sets {
        for row in result_set {
            if let Some(cat) = clean_cpp_string(row.get::<&str, _>(0)) {
                if !cat.is_empty() {
                    cats.push(cat);
                }
            }
        }
    }

    cats.sort();
    cats.dedup();
    Ok(cats)
}

/// Return grouped category counts from MSSQL T3_APP_LOG with optional filters.
pub async fn query_app_log_category_counts(
    pool: &MssqlPool,
    level_filter: Option<&str>,
    category_filter: Option<&str>,
) -> Result<Vec<(String, i64)>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let mut where_parts: Vec<String> = Vec::new();
    if let Some(lvl) = normalize_level_filter(level_filter) {
        where_parts.push(format!("level = '{}'", lvl));
    }
    if let Some(cat) = category_filter {
        let variants = category_filter_variants(cat);
        let in_list = variants
            .iter()
            .map(|v| format!("'{}'", v.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        where_parts.push(format!("category IN ({})", in_list));
    }
    let where_sql = if where_parts.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_parts.join(" AND "))
    };

    let sql = format!(
        "IF OBJECT_ID('T3_APP_LOG', 'U') IS NOT NULL \
         SELECT category, COUNT(*) AS cnt FROM T3_APP_LOG{} GROUP BY category",
        where_sql
    );

    let result = conn
        .query(&sql, &[])
        .await
        .map_err(|e| format!("T3_APP_LOG grouped COUNT failed: {}", e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("T3_APP_LOG grouped COUNT row fetch failed: {}", e))?;

    let mut rows: Vec<(String, i64)> = Vec::new();
    for result_set in result_sets {
        for row in result_set {
            if let Some(category) = clean_cpp_string(row.get::<&str, _>(0)) {
                // COUNT(*) returns INT (i32) in SQL Server; try i32 first, then i64.
                let count = row.get::<i32, _>(1).map(|v| v as i64)
                    .or_else(|| row.get::<i64, _>(1))
                    .unwrap_or(0);
                rows.push((category, count));
            }
        }
    }

    Ok(rows)
}

/// Return grouped level counts from MSSQL T3_APP_LOG with optional category filter.
pub async fn query_app_log_level_counts(
    pool: &MssqlPool,
    category_filter: Option<&str>,
) -> Result<Vec<(String, i64)>, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let where_sql = if let Some(cat) = category_filter {
        let variants = category_filter_variants(cat);
        let in_list = variants
            .iter()
            .map(|v| format!("'{}'", v.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        format!(" WHERE category IN ({})", in_list)
    } else {
        String::new()
    };

    let sql = format!(
        "IF OBJECT_ID('T3_APP_LOG', 'U') IS NOT NULL \
         SELECT level, COUNT(*) AS cnt FROM T3_APP_LOG{} GROUP BY level",
        where_sql
    );

    let result = conn
        .query(&sql, &[])
        .await
        .map_err(|e| format!("T3_APP_LOG level COUNT failed: {}", e))?;

    let result_sets = result
        .into_results()
        .await
        .map_err(|e| format!("T3_APP_LOG level COUNT row fetch failed: {}", e))?;

    let mut rows: Vec<(String, i64)> = Vec::new();
    for result_set in result_sets {
        for row in result_set {
            if let Some(level) = clean_cpp_string(row.get::<&str, _>(0)) {
                let count = row.get::<i32, _>(1).map(|v| v as i64)
                    .or_else(|| row.get::<i64, _>(1))
                    .unwrap_or(0);
                rows.push((level.to_lowercase(), count));
            }
        }
    }

    Ok(rows)
}

// ============================================================================
// Schema Init — execute the embedded MSSQL SQL script
// ============================================================================

/// Execute the MSSQL schema SQL against a raw tiberius connection.
///
/// Splits on `;` boundaries and executes each statement individually.
/// Returns (executed, errors).
pub async fn initialize_mssql_schema(pool: &MssqlPool) -> Result<(usize, Vec<String>), String> {
    let script = include_str!("../../migration/sql/webview_t3_device_mssql.sql");

    let statements: Vec<String> = script
        .split(';')
        .map(|s| {
            // Strip leading comment-only lines so a stray `;` inside a comment
            // doesn't produce a fragment that starts with real SQL keywords.
            s.lines()
                .skip_while(|l| {
                    let t = l.trim();
                    t.is_empty() || t.starts_with("--")
                })
                .collect::<Vec<_>>()
                .join("\n")
        })
        .map(|s| s.trim().to_string())
        .filter(|s| {
            !s.is_empty()
                && s.lines()
                    .any(|l| {
                        let t = l.trim();
                        !t.is_empty() && !t.starts_with("--")
                    })
        })
        .collect();

    let mut executed = 0usize;
    let mut errors = Vec::new();

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    for stmt in &statements {
        match conn.execute(stmt.as_str(), &[]).await {
            Ok(_) => executed += 1,
            Err(e) => {
                let preview: String = stmt.chars().take(120).collect();
                let preview = preview.replace('\n', " ");
                let msg = format!("Statement failed: {}… — {}", preview, e);
                eprintln!("[mssql_queries] WARN: {}", msg);
                errors.push(msg);
            }
        }
    }

    Ok((executed, errors))
}

// ============================================================================
// Utility: count tables (for status endpoint)
// ============================================================================

/// Count user tables in the connected SQL Server database.
pub async fn count_tables(pool: &MssqlPool) -> Result<i32, String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let result = conn
        .query("SELECT COUNT(*) FROM sys.tables", &[])
        .await
        .map_err(|e| format!("Table count query failed: {}", e))?;

    let row = result
        .into_row()
        .await
        .map_err(|e| format!("Row fetch failed: {}", e))?;

    match row {
        Some(r) => {
            let count: i32 = r.get(0).unwrap_or(0);
            Ok(count)
        }
        None => Ok(0),
    }
}
