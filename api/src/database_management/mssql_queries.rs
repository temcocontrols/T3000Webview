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

/// Type alias for a bb8-managed tiberius connection pool.
pub type MssqlPool = Pool<ConnectionManager>;

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

// ============================================================================
// DEVICES — MERGE (upsert by SerialNumber)
// ============================================================================

/// Upsert a single device row.
pub async fn upsert_device(
    pool: &MssqlPool,
    serial_number: i32,
    panel_id: Option<i32>,
    building_name: Option<&str>,
    product_name: Option<&str>,
    address: Option<&str>,
    status: Option<&str>,
    ip_address: Option<&str>,
    port: Option<i32>,
    modbus_address: Option<i32>,
    modbus_port: Option<i32>,
    bacnet_ip_port: Option<i32>,
    connection_type: Option<&str>,
) -> Result<(), String> {
    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    conn.execute(
        "MERGE INTO DEVICES AS target \
         USING (SELECT @P1 AS SerialNumber) AS source \
         ON target.SerialNumber = source.SerialNumber \
         WHEN MATCHED THEN UPDATE SET \
           PanelId = @P2, Building_Name = @P3, Product_Name = @P4, \
           Address = @P5, Status = @P6, ip_address = @P7, port = @P8, \
           modbus_address = @P9, modbus_port = @P10, bacnet_ip_port = @P11, \
           connection_type = @P12 \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, PanelId, Building_Name, Product_Name, Address, Status, \
            ip_address, port, modbus_address, modbus_port, bacnet_ip_port, connection_type) \
         VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12);",
        &[
            &serial_number,          // @P1
            &panel_id,               // @P2
            &building_name,          // @P3
            &product_name,           // @P4
            &address,                // @P5
            &status,                 // @P6
            &ip_address,             // @P7
            &port,                   // @P8
            &modbus_address,         // @P9
            &modbus_port,            // @P10
            &bacnet_ip_port,         // @P11
            &connection_type,        // @P12
        ],
    )
    .await
    .map_err(|e| format!("DEVICES MERGE failed: {}", e))?;

    Ok(())
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
    let (table, id_col) = validate_point_table(table_name, id_column)?;

    let mut conn = pool.get().await.map_err(|e| format!("Pool error: {}", e))?;

    let sql = format!(
        "MERGE INTO [{table}] AS target \
         USING (SELECT @P1 AS SerialNumber, @P2 AS [{id_col}]) AS source \
         ON target.SerialNumber = source.SerialNumber AND target.[{id_col}] = source.[{id_col}] \
         WHEN MATCHED THEN UPDATE SET \
           Input_Index = @P3, Panel = @P4, Full_Label = @P5, Auto_Manual = @P6, \
           fValue = @P7, Units = @P8, Range_Field = @P9, Status = @P10, \
           Digital_Analog = @P11, Label = @P12 \
         WHEN NOT MATCHED THEN INSERT \
           (SerialNumber, [{id_col}], Input_Index, Panel, Full_Label, Auto_Manual, \
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
fn validate_point_table<'a>(table: &'a str, id_col: &'a str) -> Result<(&'a str, &'a str), String> {
    match (table, id_col) {
        ("INPUTS", "InputId") => Ok(("INPUTS", "InputId")),
        ("OUTPUTS", "OutputId") => Ok(("OUTPUTS", "OutputId")),
        ("VARIABLES", "VariableId") => Ok(("VARIABLES", "VariableId")),
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
// Schema Init — execute the embedded MSSQL SQL script
// ============================================================================

/// Execute the MSSQL schema SQL against a raw tiberius connection.
///
/// Splits on `;` boundaries and executes each statement individually.
/// Returns (executed, errors).
pub async fn initialize_mssql_schema(pool: &MssqlPool) -> Result<(usize, Vec<String>), String> {
    let script = include_str!("../../migration/sql/webview_t3_device_mssql.sql");

    let statements: Vec<&str> = script
        .split(';')
        .map(|s| s.trim())
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
        match conn.execute(*stmt, &[]).await {
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
