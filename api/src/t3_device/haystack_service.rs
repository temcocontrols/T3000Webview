use crate::entity::t3_device::{
    haystack_entity, input_points, output_points, variable_points,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    QueryFilter, QueryOrder, Set, Statement,
};
use serde::Serialize;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HaystackEntityRow {
    pub id: String,
    pub kind: String,
    pub dis: String,
    pub serial_number: i32,
    pub point_table: String,
    pub point_index: String,
    pub tags: Value,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HaystackHisRow {
    pub ts: String,
    pub val: String,
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn semantic_tags_from_units(units: &str) -> Vec<&'static str> {
    match units.to_ascii_lowercase().as_str() {
        "f" | "c" => vec!["temp"],
        "%" => vec!["humidity"],
        "ppm" => vec!["co2"],
        "v" => vec!["volt", "elec"],
        "a" => vec!["current", "elec"],
        _ => vec![],
    }
}

fn make_id(serial: i32, point_table: &str, point_index: &str) -> String {
    match point_table {
        "INPUTS" => format!("dev{}.in{}", serial, point_index),
        "OUTPUTS" => format!("dev{}.out{}", serial, point_index),
        "VARIABLES" => format!("dev{}.var{}", serial, point_index),
        _ => format!("dev{}.pt{}", serial, point_index),
    }
}

fn compute_tags(
    serial: i32,
    digital_analog: Option<&str>,
    units: Option<&str>,
    f_value: Option<&str>,
) -> Value {
    let mut tags = Map::new();

    tags.insert("point".into(), Value::String("M".into()));
    tags.insert("sensor".into(), Value::String("M".into()));
    tags.insert("his".into(), Value::String("M".into()));

    let kind = if digital_analog.unwrap_or("1") == "1" {
        "Number"
    } else {
        "Bool"
    };
    tags.insert("kind".into(), Value::String(kind.to_string()));

    if let Some(unit) = units {
        let unit_trim = unit.trim();
        if !unit_trim.is_empty() {
            tags.insert("unit".into(), Value::String(unit_trim.to_string()));
            for semantic in semantic_tags_from_units(unit_trim) {
                tags.insert(semantic.into(), Value::String("M".into()));
            }
        }
    }

    if let Some(raw) = f_value {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            if let Ok(v) = trimmed.parse::<f64>() {
                if let Some(n) = serde_json::Number::from_f64(v) {
                    tags.insert("curVal".into(), Value::Number(n));
                }
            }
        }
    }

    tags.insert(
        "equipRef".into(),
        Value::String(format!("dev{}", serial)),
    );

    Value::Object(tags)
}

pub async fn upsert_point_entity(
    conn: &impl ConnectionTrait,
    serial: i32,
    point_table: &str,
    point_index: &str,
    dis: Option<&str>,
    digital_analog: Option<&str>,
    units: Option<&str>,
    f_value: Option<&str>,
) -> Result<(), DbErr> {
    let id = make_id(serial, point_table, point_index);
    let dis_value = dis
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| format!("{} {}", point_table, point_index));

    let tags_json = compute_tags(serial, digital_analog, units, f_value).to_string();
    let timestamp = now_ms();

    let existing = haystack_entity::Entity::find_by_id(id.clone())
        .one(conn)
        .await?;

    if let Some(model) = existing {
        let mut active: haystack_entity::ActiveModel = model.into();
        active.kind = Set("point".to_string());
        active.dis = Set(Some(dis_value));
        active.tags = Set(tags_json);
        active.serial_number = Set(Some(serial));
        active.point_table = Set(Some(point_table.to_string()));
        active.point_index = Set(Some(point_index.to_string()));
        active.updated_at = Set(Some(timestamp));
        active.update(conn).await?;
    } else {
        let active = haystack_entity::ActiveModel {
            id: Set(id),
            kind: Set("point".to_string()),
            dis: Set(Some(dis_value)),
            tags: Set(tags_json),
            serial_number: Set(Some(serial)),
            point_table: Set(Some(point_table.to_string())),
            point_index: Set(Some(point_index.to_string())),
            updated_at: Set(Some(timestamp)),
        };
        active.insert(conn).await?;
    }

    Ok(())
}

pub async fn upsert_from_point_data(
    conn: &impl ConnectionTrait,
    point_table: &str,
    serial: i32,
    point_index: u32,
    dis: Option<&str>,
    digital_analog: Option<i32>,
    units: Option<&str>,
    f_value: Option<f64>,
) -> Result<(), DbErr> {
    let da_str = digital_analog.map(|v| v.to_string());
    let val_str = f_value.map(|v| v.to_string());
    upsert_point_entity(
        conn,
        serial,
        point_table,
        &point_index.to_string(),
        dis,
        da_str.as_deref(),
        units,
        val_str.as_deref(),
    )
    .await
}

pub async fn seed_device(conn: &impl ConnectionTrait, serial: i32) -> Result<(), DbErr> {
    let inputs = input_points::Entity::find()
        .filter(input_points::Column::SerialNumber.eq(serial))
        .all(conn)
        .await?;

    for point in inputs {
        if let Some(index) = point.input_index.clone() {
            let dis = point
                .full_label
                .as_deref()
                .or(point.label.as_deref())
                .or(Some("Input"));
            upsert_point_entity(
                conn,
                serial,
                "INPUTS",
                &index,
                dis,
                point.digital_analog.as_deref(),
                point.units.as_deref(),
                point.f_value.as_deref(),
            )
            .await?;
        }
    }

    let outputs = output_points::Entity::find()
        .filter(output_points::Column::SerialNumber.eq(serial))
        .all(conn)
        .await?;

    for point in outputs {
        if let Some(index) = point.output_index.clone() {
            let dis = point
                .full_label
                .as_deref()
                .or(point.label.as_deref())
                .or(Some("Output"));
            upsert_point_entity(
                conn,
                serial,
                "OUTPUTS",
                &index,
                dis,
                point.digital_analog.as_deref(),
                point.units.as_deref(),
                point.f_value.as_deref(),
            )
            .await?;
        }
    }

    let variables = variable_points::Entity::find()
        .filter(variable_points::Column::SerialNumber.eq(serial))
        .all(conn)
        .await?;

    for point in variables {
        if let Some(index) = point.variable_index.clone() {
            let dis = point
                .full_label
                .as_deref()
                .or(point.label.as_deref())
                .or(Some("Variable"));
            upsert_point_entity(
                conn,
                serial,
                "VARIABLES",
                &index,
                dis,
                point.digital_analog.as_deref(),
                point.units.as_deref(),
                point.f_value.as_deref(),
            )
            .await?;
        }
    }

    Ok(())
}

fn parse_model(model: haystack_entity::Model) -> Option<HaystackEntityRow> {
    let tags: Value = serde_json::from_str(&model.tags).ok()?;
    Some(HaystackEntityRow {
        id: model.id,
        kind: model.kind,
        dis: model.dis.unwrap_or_default(),
        serial_number: model.serial_number.unwrap_or_default(),
        point_table: model.point_table.unwrap_or_default(),
        point_index: model.point_index.unwrap_or_default(),
        tags,
        updated_at: model.updated_at.unwrap_or_default(),
    })
}

pub async fn read_entities(
    conn: &impl ConnectionTrait,
    filter: Option<&str>,
    ids: Option<&[String]>,
    serial_numbers: Option<&[i32]>,
) -> Result<Vec<HaystackEntityRow>, DbErr> {
    let mut query = haystack_entity::Entity::find();

    if let Some(id_list) = ids {
        if !id_list.is_empty() {
            query = query.filter(haystack_entity::Column::Id.is_in(id_list.to_vec()));
        }
    }

    if let Some(serials) = serial_numbers {
        if !serials.is_empty() {
            query = query.filter(haystack_entity::Column::SerialNumber.is_in(serials.to_vec()));
        }
    }

    let mut rows: Vec<HaystackEntityRow> = query
        .order_by_asc(haystack_entity::Column::Id)
        .all(conn)
        .await?
        .into_iter()
        .filter_map(parse_model)
        .collect();

    if let Some(raw_filter) = filter {
        let f = raw_filter.trim().to_ascii_lowercase();
        if !f.is_empty() {
            rows.retain(|row| {
                row.id.to_ascii_lowercase().contains(&f)
                    || row.dis.to_ascii_lowercase().contains(&f)
                    || row.point_table.to_ascii_lowercase().contains(&f)
                    || row.tags.to_string().to_ascii_lowercase().contains(&f)
            });
        }
    }

    Ok(rows)
}

fn parse_entity_id(entity_id: &str) -> Option<(i32, String, i32)> {
    let without_prefix = entity_id.strip_prefix("dev")?;
    let (serial_part, point_part) = without_prefix.split_once('.')?;
    let serial = serial_part.parse::<i32>().ok()?;

    if let Some(idx) = point_part.strip_prefix("in") {
        return idx.parse::<i32>().ok().map(|n| (serial, "INPUT".to_string(), n));
    }
    if let Some(idx) = point_part.strip_prefix("out") {
        return idx.parse::<i32>().ok().map(|n| (serial, "OUTPUT".to_string(), n));
    }
    if let Some(idx) = point_part.strip_prefix("var") {
        return idx.parse::<i32>().ok().map(|n| (serial, "VARIABLE".to_string(), n));
    }

    None
}

fn escape_sql_string(input: &str) -> String {
    input.replace('\'', "''")
}

pub async fn his_read(
    conn: &impl ConnectionTrait,
    entity_id: &str,
    start: Option<&str>,
    end: Option<&str>,
) -> Result<Vec<HaystackHisRow>, DbErr> {
    let Some((serial, point_type, point_index)) = parse_entity_id(entity_id) else {
        return Ok(Vec::new());
    };

    let mut sql = format!(
        "SELECT d.LoggingTime_Fmt, d.Value \
         FROM TRENDLOG_DATA_DETAIL d \
         INNER JOIN TRENDLOG_DATA p ON d.ParentId = p.id \
         WHERE p.SerialNumber = {} AND p.PointType = '{}' AND p.PointIndex = {}",
        serial,
        escape_sql_string(&point_type),
        point_index
    );

    if let Some(start_ts) = start {
        if !start_ts.trim().is_empty() {
            sql.push_str(&format!(
                " AND d.LoggingTime_Fmt >= '{}'",
                escape_sql_string(start_ts)
            ));
        }
    }

    if let Some(end_ts) = end {
        if !end_ts.trim().is_empty() {
            sql.push_str(&format!(
                " AND d.LoggingTime_Fmt <= '{}'",
                escape_sql_string(end_ts)
            ));
        }
    }

    sql.push_str(" ORDER BY d.LoggingTime_Fmt ASC");

    let rows = conn
        .query_all(Statement::from_string(conn.get_database_backend(), sql))
        .await?;

    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        let ts: String = row.try_get("", "LoggingTime_Fmt").unwrap_or_default();
        let val: String = row.try_get("", "Value").unwrap_or_default();
        result.push(HaystackHisRow { ts, val });
    }

    Ok(result)
}

pub async fn refresh_entities_for_serials(
    conn: &impl ConnectionTrait,
    serial_numbers: &[i32],
) -> Result<(), DbErr> {
    for serial in serial_numbers {
        seed_device(conn, *serial).await?;
    }
    Ok(())
}
