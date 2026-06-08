use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ── haystack_tags: tag definitions ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS haystack_tags (
                tag_name   TEXT PRIMARY KEY,
                doc        TEXT,
                category   TEXT NOT NULL DEFAULT 'custom',
                deprecated INTEGER NOT NULL DEFAULT 0,
                source     TEXT DEFAULT 'user'
            )",
        )
        .await?;

        // ── haystack_tag_relations: multi-parent inheritance ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS haystack_tag_relations (
                tag_name   TEXT NOT NULL,
                parent_tag TEXT NOT NULL,
                PRIMARY KEY (tag_name, parent_tag)
            )",
        )
        .await?;

        // ── haystack_point_tags: point ↔ tag mapping ──
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS haystack_point_tags (
                serial_number INTEGER NOT NULL,
                point_type    TEXT NOT NULL,
                point_index   TEXT NOT NULL,
                point_id      TEXT NOT NULL,
                tag_name      TEXT NOT NULL,
                PRIMARY KEY (serial_number, point_type, point_index, tag_name)
            )",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_hpt_serial ON haystack_point_tags (serial_number)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_hpt_tag ON haystack_point_tags (tag_name)",
        )
        .await?;

        // ── Seed: Haystack v4 standard tags ──
        seed_standard_tags(db).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS haystack_point_tags").await?;
        db.execute_unprepared("DROP TABLE IF EXISTS haystack_tag_relations").await?;
        db.execute_unprepared("DROP TABLE IF EXISTS haystack_tags").await?;
        Ok(())
    }
}

/// Seed the standard Haystack v4 tag library.
async fn seed_standard_tags(db: &SchemaManagerConnection<'_>) -> Result<(), DbErr> {
    let tags: &[(&str, &str)] = &[
        // ── Fundamental markers ──
        ("marker", "Base marker tag"),
        ("point", "Data point"),
        ("his", "Historized point"),
        ("cur", "Current value"),
        ("write", "Writable point"),
        ("cmd", "Command"),
        ("schedule", "Scheduled entity"),
        // ── Sensor types ──
        ("sensor", "Sensor point"),
        ("temp", "Temperature"),
        ("humidity", "Humidity"),
        ("co2", "CO2 level"),
        ("pressure", "Pressure"),
        ("flow", "Flow rate"),
        ("velocity", "Air velocity"),
        ("power", "Electrical power"),
        ("energy", "Energy consumption"),
        ("current", "Electrical current"),
        ("voltage", "Electrical voltage"),
        ("frequency", "Frequency"),
        ("enthalpy", "Enthalpy"),
        ("occupancy", "Occupancy"),
        ("switch", "Binary switch state"),
        ("level", "Level measurement"),
        ("position", "Position feedback"),
        // ── Actuator types ──
        ("actuator", "Actuator"),
        ("damper", "Damper"),
        ("valve", "Valve"),
        ("fan", "Fan"),
        ("pump", "Pump"),
        ("heater", "Heater"),
        ("cooler", "Cooler"),
        ("compressor", "Compressor"),
        ("vfd", "Variable frequency drive"),
        // ── Equipment ──
        ("equip", "Equipment"),
        ("ahu", "Air handling unit"),
        ("vav", "Variable air volume box"),
        ("chiller", "Chiller"),
        ("boiler", "Boiler"),
        ("tower", "Cooling tower"),
        ("rtu", "Rooftop unit"),
        ("fcu", "Fan coil unit"),
        ("heatpump", "Heat pump"),
        ("hvac", "HVAC equipment"),
        ("plant", "Central plant"),
        ("mau", "Makeup air unit"),
        ("erv", "Energy recovery ventilator"),
        // ── Spatial ──
        ("site", "Building site"),
        ("space", "Physical space"),
        ("zone", "HVAC zone"),
        ("floor", "Floor level"),
        ("room", "Room"),
        // ── Air/water sides ──
        ("air", "Air"),
        ("water", "Water"),
        ("glycol", "Glycol"),
        ("refrigerant", "Refrigerant"),
        ("steam", "Steam"),
        ("fuel", "Fuel"),
        ("gas", "Natural gas"),
        ("oil", "Fuel oil"),
        // ── Flow direction ──
        ("discharge", "Discharge side"),
        ("suction", "Suction/return side"),
        ("supply", "Supply"),
        ("return", "Return"),
        ("exhaust", "Exhaust"),
        ("outside", "Outside air"),
        ("mixed", "Mixed air"),
        ("enter", "Entering"),
        ("leave", "Leaving"),
        // ── Process ──
        ("cooling", "Cooling process"),
        ("heating", "Heating process"),
        ("dehumidify", "Dehumidification"),
        ("humidify", "Humidification"),
        ("economizer", "Economizer mode"),
        ("freeze", "Freeze protection"),
        ("smoke", "Smoke detection"),
        ("fire", "Fire alarm"),
        ("filter", "Filter status"),
        ("bypass", "Bypass"),
        // ── Control ──
        ("setpoint", "Setpoint"),
        ("sp", "Setpoint (abbreviated)"),
        ("effective", "Effective value"),
        ("min", "Minimum"),
        ("max", "Maximum"),
        ("enable", "Enable command"),
        ("alarm", "Alarm condition"),
        ("fault", "Fault condition"),
        ("status", "Status indication"),
        ("run", "Run status"),
        ("speed", "Speed"),
        ("percent", "Percentage"),
        ("cmd", "Command"),
        // ── Measurement units ──
        ("degF", "Degrees Fahrenheit"),
        ("degC", "Degrees Celsius"),
        ("percentRelativeHumidity", "Percent RH"),
        ("partsPerMillion", "Parts per million"),
        ("pascal", "Pascals"),
        ("kilopascal", "Kilopascals"),
        ("inchesWater", "Inches of water column"),
        ("psi", "Pounds per square inch"),
        ("cfm", "Cubic feet per minute"),
        ("cubicMeterPerHour", "Cubic meters per hour"),
        ("gpm", "Gallons per minute"),
        ("literPerHour", "Liters per hour"),
        ("feetPerMinute", "Feet per minute"),
        ("meterPerSecond", "Meters per second"),
        ("kilowatt", "Kilowatts"),
        ("watt", "Watts"),
        ("kilowattHour", "Kilowatt-hours"),
        ("volt", "Volts"),
        ("amp", "Amperes"),
        ("milliampere", "Milliamperes"),
        ("ohm", "Ohms"),
        ("btu", "BTU"),
        ("tonRefrigeration", "Tons of refrigeration"),
        ("second", "Seconds"),
        ("minute", "Minutes"),
        ("hour", "Hours"),
        ("day", "Days"),
        ("count", "Counts"),
        ("percentOpen", "Percent open"),
        ("kilogram", "Kilograms"),
        ("gallon", "Gallons"),
        ("cubicFoot", "Cubic feet"),
    ];

    for (name, doc) in tags {
        db.execute_unprepared(&format!(
            "INSERT OR IGNORE INTO haystack_tags (tag_name, doc, category, deprecated, source) VALUES ('{}', '{}', 'haystack', 0, 'v4')",
            name, doc
        ))
        .await?;
    }

    // ── Seed: parent relationships ──
    let relations: &[(&str, &str)] = &[
        ("point", "marker"),
        ("his", "marker"),
        ("cur", "marker"),
        ("write", "marker"),
        ("sensor", "point"),
        ("actuator", "point"),
        ("cmd", "point"),
        ("setpoint", "point"),
        ("sp", "setpoint"),
        ("temp", "sensor"),
        ("humidity", "sensor"),
        ("co2", "sensor"),
        ("pressure", "sensor"),
        ("flow", "sensor"),
        ("velocity", "sensor"),
        ("power", "sensor"),
        ("energy", "sensor"),
        ("current", "sensor"),
        ("voltage", "sensor"),
        ("frequency", "sensor"),
        ("enthalpy", "sensor"),
        ("occupancy", "sensor"),
        ("switch", "sensor"),
        ("level", "sensor"),
        ("position", "sensor"),
        ("damper", "actuator"),
        ("valve", "actuator"),
        ("fan", "actuator"),
        ("pump", "actuator"),
        ("heater", "actuator"),
        ("cooler", "actuator"),
        ("compressor", "actuator"),
        ("vfd", "actuator"),
        ("ahu", "equip"),
        ("vav", "equip"),
        ("chiller", "equip"),
        ("boiler", "equip"),
        ("tower", "equip"),
        ("rtu", "equip"),
        ("fcu", "equip"),
        ("heatpump", "equip"),
        ("hvac", "equip"),
        ("plant", "equip"),
        ("mau", "equip"),
        ("erv", "equip"),
        ("air", "marker"),
        ("water", "marker"),
        ("discharge", "air"),
        ("suction", "air"),
        ("supply", "air"),
        ("return", "air"),
        ("exhaust", "air"),
        ("outside", "air"),
        ("mixed", "air"),
        ("enter", "water"),
        ("leave", "water"),
        ("cooling", "marker"),
        ("heating", "marker"),
        ("alarm", "marker"),
        ("fault", "marker"),
        ("status", "marker"),
        ("run", "status"),
        ("enable", "cmd"),
        ("speed", "cmd"),
        ("effective", "setpoint"),
        ("min", "setpoint"),
        ("max", "setpoint"),
    ];

    for (child, parent) in relations {
        db.execute_unprepared(&format!(
            "INSERT OR IGNORE INTO haystack_tag_relations (tag_name, parent_tag) VALUES ('{}', '{}')",
            child, parent
        ))
        .await?;
    }

    Ok(())
}
