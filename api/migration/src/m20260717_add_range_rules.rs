use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(Debug, Clone)]
struct RangeSeed {
    rule_name: &'static str,
    point_type: &'static str,
    digital_analog: i32,
    range_value: i32,
    haystack_tags: Option<&'static str>,
    brick_class: Option<&'static str>,
    units: Option<&'static str>,
    object_types: Option<&'static str>,
    haystack_kind: Option<&'static str>,
    haystack_unit: Option<&'static str>,
}

fn range_rules() -> Vec<RangeSeed> {
    let mut rules = Vec::new();
    let mut add = |name, pt: &'static str, da, rv, tags: &'static str, bc: Option<&'static str>, u: Option<&'static str>, ot: Option<&'static str>, hk: Option<&'static str>, hu: Option<&'static str>| {
        rules.push(RangeSeed {
            rule_name: name,
            point_type: pt,
            digital_analog: da,
            range_value: rv,
            haystack_tags: if tags.is_empty() { None } else { Some(tags) },
            brick_class: bc,
            units: u,
            object_types: ot,
            haystack_kind: hk,
            haystack_unit: hu,
        });
    };

    // ═══ INPUTS ═══
    // Baseline (range=0, unconfigured)
    add("range:in-dig-0", "INPUT", 0, 0, "point,sensor,binary", None, None, None, None, None);
    add("range:in-ana-0", "INPUT", 1, 0, "point,sensor,analog", None, None, None, None, None);

    // Analog ranges
    add("range:in-ana-1", "INPUT", 1, 1, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.C"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-2", "INPUT", 1, 2, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.F"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-3", "INPUT", 1, 3, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.C"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-4", "INPUT", 1, 4, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.F"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-5", "INPUT", 1, 5, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.C"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-6", "INPUT", 1, 6, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.F"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-7", "INPUT", 1, 7, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.C"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-8", "INPUT", 1, 8, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.F"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-9", "INPUT", 1, 9, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.C"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-10", "INPUT", 1, 10, "point,sensor,air,temp", Some("Temperature_Sensor"), Some("Deg.F"), Some("Temperature"), Some("Number"), None);
    add("range:in-ana-11", "INPUT", 1, 11, "point,sensor,voltage", None, Some("Volts"), Some("Voltage"), Some("Number"), None);
    add("range:in-ana-12", "INPUT", 1, 12, "point,sensor,current", Some("Current_Sensor"), Some("Amps"), Some("Current"), Some("Number"), None);
    add("range:in-ana-13", "INPUT", 1, 13, "point,sensor,current", Some("Current_Sensor"), Some("ma"), Some("Current"), Some("Number"), None);
    add("range:in-ana-14", "INPUT", 1, 14, "point,sensor,pressure", Some("Pressure_Sensor"), Some("psi"), Some("Pressure"), Some("Number"), None);
    add("range:in-ana-15", "INPUT", 1, 15, "point,sensor,pulse,counter", None, Some("counts"), Some("Pulse"), Some("Number"), None);
    add("range:in-ana-16", "INPUT", 1, 16, "point,sensor,percent", Some("Percentage_Sensor"), Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:in-ana-17", "INPUT", 1, 17, "point,sensor,percent", Some("Percentage_Sensor"), Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:in-ana-18", "INPUT", 1, 18, "point,sensor,percent", Some("Percentage_Sensor"), Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:in-ana-19", "INPUT", 1, 19, "point,sensor,voltage", None, Some("Volts"), Some("Voltage"), Some("Number"), None);
    add("range:in-ana-20", "INPUT", 1, 20, "point,sensor,custom", None, None, Some("Custom Tables"), None, None);
    add("range:in-ana-21", "INPUT", 1, 21, "point,sensor,custom", None, None, Some("Custom Tables"), None, None);
    add("range:in-ana-22", "INPUT", 1, 22, "point,sensor,custom", None, None, Some("Custom Tables"), None, None);
    add("range:in-ana-23", "INPUT", 1, 23, "point,sensor,custom", None, None, Some("Custom Tables"), None, None);
    add("range:in-ana-24", "INPUT", 1, 24, "point,sensor,custom", None, None, Some("Custom Tables"), None, None);
    add("range:in-ana-25", "INPUT", 1, 25, "point,sensor,pulse,counter", None, Some("counts"), Some("Pulse"), Some("Number"), None);
    add("range:in-ana-26", "INPUT", 1, 26, "point,sensor,frequency", None, Some("Hz"), Some("Frequency"), Some("Number"), None);
    add("range:in-ana-27", "INPUT", 1, 27, "point,sensor,air,humidity", Some("Humidity_Sensor"), Some("%"), Some("Environmental"), Some("Number"), None);
    add("range:in-ana-28", "INPUT", 1, 28, "point,sensor,air,co2,concentration", Some("CO2_Sensor"), Some("PPM"), Some("Environmental"), Some("Number"), None);
    add("range:in-ana-29", "INPUT", 1, 29, "point,sensor,speed", None, Some("RPM"), Some("Speed"), Some("Number"), None);
    add("range:in-ana-30", "INPUT", 1, 30, "point,sensor,air,tvoc,concentration", None, Some("PPB"), Some("Environmental"), Some("Number"), None);
    add("range:in-ana-31", "INPUT", 1, 31, "point,sensor,air,pm,concentration", None, Some("ug/m3"), Some("Environmental"), Some("Number"), None);
    add("range:in-ana-32", "INPUT", 1, 32, "point,sensor,air,particle,concentration", None, Some("#/cm3"), Some("Environmental"), Some("Number"), None);
    add("range:in-ana-33", "INPUT", 1, 33, "point,sensor,sound,level", None, Some("dB"), Some("Sound"), Some("Number"), None);
    add("range:in-ana-34", "INPUT", 1, 34, "point,sensor,light,level", Some("Luminance_Sensor"), Some("Lux"), Some("Light"), Some("Number"), None);

    // Digital ranges
    add("range:in-dig-1", "INPUT", 0, 1, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-2", "INPUT", 0, 2, "point,sensor,contact,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-3", "INPUT", 0, 3, "point,sensor,run,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-4", "INPUT", 0, 4, "point,sensor,enable,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-5", "INPUT", 0, 5, "point,sensor,alarm,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-6", "INPUT", 0, 6, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-7", "INPUT", 0, 7, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-8", "INPUT", 0, 8, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-9", "INPUT", 0, 9, "point,sensor,mode,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-10", "INPUT", 0, 10, "point,sensor,occupancy,binary", Some("Occupancy_Sensor"), None, None, Some("Bool"), None);
    add("range:in-dig-11", "INPUT", 0, 11, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-12", "INPUT", 0, 12, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-13", "INPUT", 0, 13, "point,sensor,contact,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-14", "INPUT", 0, 14, "point,sensor,run,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-15", "INPUT", 0, 15, "point,sensor,enable,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-16", "INPUT", 0, 16, "point,sensor,alarm,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-17", "INPUT", 0, 17, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-18", "INPUT", 0, 18, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-19", "INPUT", 0, 19, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-20", "INPUT", 0, 20, "point,sensor,mode,binary", None, None, None, Some("Bool"), None);
    add("range:in-dig-21", "INPUT", 0, 21, "point,sensor,occupancy,binary", Some("Occupancy_Sensor"), None, None, Some("Bool"), None);
    add("range:in-dig-22", "INPUT", 0, 22, "point,sensor,status,binary", None, None, None, Some("Bool"), None);
    for i in 23..=30 {
        add("range:in-dig-custom", "INPUT", 0, i, "point,sensor,binary", None, None, None, Some("Bool"), None);
    }
    for i in 101..=104 {
        add("range:in-dig-msv", "INPUT", 0, i, "point,sensor,multistate", None, None, None, Some("Str"), None);
    }

    // ═══ OUTPUTS ═══
    add("range:out-dig-0", "OUTPUT", 0, 0, "point,cmd,binary", None, None, None, None, None);
    add("range:out-ana-0", "OUTPUT", 1, 0, "point,cmd,analog", None, None, None, None, None);

    // Analog (ranges 31-38)
    add("range:out-ana-31", "OUTPUT", 1, 31, "point,cmd,voltage", None, Some("Volts"), Some("Voltage"), Some("Number"), None);
    add("range:out-ana-32", "OUTPUT", 1, 32, "point,cmd,damper,position", Some("Damper_Position_Actuator"), Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:out-ana-33", "OUTPUT", 1, 33, "point,cmd,pressure", Some("Pressure_Actuator"), Some("psi"), Some("Pressure"), Some("Number"), None);
    add("range:out-ana-34", "OUTPUT", 1, 34, "point,cmd,percent", Some("Percentage_Command"), Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:out-ana-35", "OUTPUT", 1, 35, "point,cmd,damper,position", Some("Damper_Position_Actuator"), Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:out-ana-36", "OUTPUT", 1, 36, "point,cmd,current", Some("Current_Command"), Some("ma"), Some("Current"), Some("Number"), None);
    add("range:out-ana-37", "OUTPUT", 1, 37, "point,cmd,pwm", None, Some("%"), Some("PWM"), Some("Number"), None);
    add("range:out-ana-38", "OUTPUT", 1, 38, "point,cmd,percent", Some("Percentage_Command"), Some("%"), Some("Percentage"), Some("Number"), None);

    // Digital (same ranges as inputs, but with cmd tag)
    add("range:out-dig-1", "OUTPUT", 0, 1, "point,cmd,status,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-2", "OUTPUT", 0, 2, "point,cmd,contact,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-3", "OUTPUT", 0, 3, "point,cmd,run,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-4", "OUTPUT", 0, 4, "point,cmd,enable,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-5", "OUTPUT", 0, 5, "point,cmd,alarm,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-9", "OUTPUT", 0, 9, "point,cmd,mode,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-10", "OUTPUT", 0, 10, "point,cmd,occupancy,binary", Some("Occupancy_Command"), None, None, Some("Bool"), None);
    add("range:out-dig-12", "OUTPUT", 0, 12, "point,cmd,status,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-13", "OUTPUT", 0, 13, "point,cmd,contact,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-14", "OUTPUT", 0, 14, "point,cmd,run,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-15", "OUTPUT", 0, 15, "point,cmd,enable,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-20", "OUTPUT", 0, 20, "point,cmd,mode,binary", None, None, None, Some("Bool"), None);
    add("range:out-dig-21", "OUTPUT", 0, 21, "point,cmd,occupancy,binary", Some("Occupancy_Command"), None, None, Some("Bool"), None);
    // Generic fallbacks for remaining digital output ranges
    for i in 0..=30 {
        if i != 0 && !&[1,2,3,4,5,9,10,12,13,14,15,20,21].contains(&i) {
            add("range:out-dig-other", "OUTPUT", 0, i, "point,cmd,binary", None, None, None, Some("Bool"), None);
        }
    }
    for i in 101..=104 {
        add("range:out-dig-msv", "OUTPUT", 0, i, "point,cmd,multistate", None, None, None, Some("Str"), None);
    }

    // ═══ VARIABLES ═══
    add("range:var-dig-0", "VARIABLE", 0, 0, "point,sp,binary", None, None, None, None, None);
    add("range:var-ana-0", "VARIABLE", 1, 0, "point,sp,analog", None, None, None, None, None);

    // Analog (ranges 31-68)
    add("range:var-ana-31", "VARIABLE", 1, 31, "point,sp,temp", None, Some("Deg.C"), Some("Temperature"), Some("Number"), None);
    add("range:var-ana-32", "VARIABLE", 1, 32, "point,sp,temp", None, Some("Deg.F"), Some("Temperature"), Some("Number"), None);
    add("range:var-ana-33", "VARIABLE", 1, 33, "point,sp,velocity", None, Some("Feet per Min"), Some("Velocity"), Some("Number"), None);
    add("range:var-ana-34", "VARIABLE", 1, 34, "point,sp,pressure", None, Some("Pascals"), Some("Pressure"), Some("Number"), None);
    add("range:var-ana-35", "VARIABLE", 1, 35, "point,sp,pressure", None, Some("KPascals"), Some("Pressure"), Some("Number"), None);
    add("range:var-ana-36", "VARIABLE", 1, 36, "point,sp,pressure", None, Some("psi"), Some("Pressure"), Some("Number"), None);
    add("range:var-ana-37", "VARIABLE", 1, 37, "point,sp,pressure", None, Some("inches WC"), Some("Pressure"), Some("Number"), None);
    add("range:var-ana-38", "VARIABLE", 1, 38, "point,sp,power", None, Some("Watts"), Some("Power"), Some("Number"), None);
    add("range:var-ana-39", "VARIABLE", 1, 39, "point,sp,power", None, Some("KWatts"), Some("Power"), Some("Number"), None);
    add("range:var-ana-40", "VARIABLE", 1, 40, "point,sp,energy", None, Some("KWH"), Some("Energy"), Some("Number"), None);
    add("range:var-ana-41", "VARIABLE", 1, 41, "point,sp,voltage", None, Some("Volts"), Some("Electrical"), Some("Number"), None);
    add("range:var-ana-42", "VARIABLE", 1, 42, "point,sp,voltage", None, Some("KV"), Some("Electrical"), Some("Number"), None);
    add("range:var-ana-43", "VARIABLE", 1, 43, "point,sp,current", None, Some("Amps"), Some("Electrical"), Some("Number"), None);
    add("range:var-ana-44", "VARIABLE", 1, 44, "point,sp,current", None, Some("ma"), Some("Electrical"), Some("Number"), None);
    add("range:var-ana-45", "VARIABLE", 1, 45, "point,sp,air,flow", None, Some("CFM"), Some("Flow"), Some("Number"), None);
    add("range:var-ana-46", "VARIABLE", 1, 46, "point,sp,time", None, Some("Seconds"), Some("Time"), Some("Number"), None);
    add("range:var-ana-47", "VARIABLE", 1, 47, "point,sp,time", None, Some("Minutes"), Some("Time"), Some("Number"), None);
    add("range:var-ana-48", "VARIABLE", 1, 48, "point,sp,time", None, Some("Hours"), Some("Time"), Some("Number"), None);
    add("range:var-ana-49", "VARIABLE", 1, 49, "point,sp,time", None, Some("Days"), Some("Time"), Some("Number"), None);
    add("range:var-ana-50", "VARIABLE", 1, 50, "point,sp,time", None, Some("Time"), Some("Time"), Some("Number"), None);
    add("range:var-ana-51", "VARIABLE", 1, 51, "point,sp,resistance", None, Some("Ohms"), Some("Electrical"), Some("Number"), None);
    add("range:var-ana-52", "VARIABLE", 1, 52, "point,sp,percent", None, Some("%"), Some("Percentage"), Some("Number"), None);
    add("range:var-ana-53", "VARIABLE", 1, 53, "point,sp,humidity", None, Some("%RH"), Some("Humidity"), Some("Number"), None);
    add("range:var-ana-54", "VARIABLE", 1, 54, "point,sp,speed", None, Some("p/min"), Some("Speed"), Some("Number"), None);
    add("range:var-ana-55", "VARIABLE", 1, 55, "point,sp,counter", None, Some("Counts"), Some("Count"), Some("Number"), None);
    add("range:var-ana-56", "VARIABLE", 1, 56, "point,sp,damper,position", None, Some("%Open"), Some("Percentage"), Some("Number"), None);
    add("range:var-ana-57", "VARIABLE", 1, 57, "point,sp,mass", None, Some("Kg"), Some("Mass"), Some("Number"), None);
    add("range:var-ana-58", "VARIABLE", 1, 58, "point,sp,flow", None, Some("L/Hour"), Some("Flow"), Some("Number"), None);
    add("range:var-ana-59", "VARIABLE", 1, 59, "point,sp,flow", None, Some("GPH"), Some("Flow"), Some("Number"), None);
    add("range:var-ana-60", "VARIABLE", 1, 60, "point,sp,volume", None, Some("GAL"), Some("Volume"), Some("Number"), None);
    add("range:var-ana-61", "VARIABLE", 1, 61, "point,sp,volume", None, Some("CF"), Some("Volume"), Some("Number"), None);
    add("range:var-ana-62", "VARIABLE", 1, 62, "point,sp,energy", None, Some("BTU"), Some("Energy"), Some("Number"), None);
    add("range:var-ana-63", "VARIABLE", 1, 63, "point,sp,flow", None, Some("CMH"), Some("Flow"), Some("Number"), None);
    add("range:var-ana-64", "VARIABLE", 1, 64, "point,sp,custom", None, None, Some("Custom"), None, None);
    add("range:var-ana-65", "VARIABLE", 1, 65, "point,sp,custom", None, None, Some("Custom"), None, None);
    add("range:var-ana-66", "VARIABLE", 1, 66, "point,sp,custom", None, None, Some("Custom"), None, None);
    add("range:var-ana-67", "VARIABLE", 1, 67, "point,sp,custom", None, None, Some("Custom"), None, None);
    add("range:var-ana-68", "VARIABLE", 1, 68, "point,sp,custom", None, None, Some("Custom"), None, None);

    // Digital (shared ranges)
    for i in 0..=30 {
        if i == 0 {
            add("range:var-dig-0", "VARIABLE", 0, 0, "point,sp,binary", None, None, None, None, None);
        } else {
            add("range:var-dig-other", "VARIABLE", 0, i, "point,sp,binary", None, None, None, Some("Bool"), None);
        }
    }
    for i in 101..=104 {
        add("range:var-dig-msv", "VARIABLE", 0, i, "point,sp,multistate", None, None, None, Some("Str"), None);
    }

    rules
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // 1. Add range-specific columns (idempotent)
        let _ = db.execute_unprepared("ALTER TABLE HAYSTACK_AUTO_TAGGING_RULES ADD COLUMN point_type TEXT").await;
        let _ = db.execute_unprepared("ALTER TABLE HAYSTACK_AUTO_TAGGING_RULES ADD COLUMN digital_analog INTEGER").await;
        let _ = db.execute_unprepared("ALTER TABLE HAYSTACK_AUTO_TAGGING_RULES ADD COLUMN range_value INTEGER").await;

        // 2. Try to update CHECK constraint — wrapped in let _ so failures are non-fatal
        let _ = async {
            let _ = db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_AUTO_TAGGING_RULES_new").await;
            db.execute_unprepared(
                "CREATE TABLE HAYSTACK_AUTO_TAGGING_RULES_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, rule_name TEXT NOT NULL UNIQUE,
                    category TEXT NOT NULL CHECK(category IN ('haystack','brick','range')),
                    pattern TEXT, units TEXT, object_types TEXT, haystack_tags TEXT,
                    brick_class TEXT, haystack_kind TEXT, haystack_unit TEXT,
                    point_type TEXT, digital_analog INTEGER, range_value INTEGER,
                    enabled INTEGER NOT NULL DEFAULT 1, priority INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )"
            ).await?;
            db.execute_unprepared(
                "INSERT INTO HAYSTACK_AUTO_TAGGING_RULES_new
                 (id,rule_name,category,pattern,units,object_types,haystack_tags,brick_class,haystack_kind,haystack_unit,enabled,priority,created_at,updated_at,point_type,digital_analog,range_value)
                 SELECT id,rule_name,category,pattern,units,object_types,haystack_tags,brick_class,haystack_kind,haystack_unit,enabled,priority,created_at,updated_at,point_type,digital_analog,range_value
                 FROM HAYSTACK_AUTO_TAGGING_RULES"
            ).await?;
            db.execute_unprepared("DROP TABLE HAYSTACK_AUTO_TAGGING_RULES").await?;
            db.execute_unprepared("ALTER TABLE HAYSTACK_AUTO_TAGGING_RULES_new RENAME TO HAYSTACK_AUTO_TAGGING_RULES").await?;
            Ok::<_, DbErr>(())
        }.await;

        // 3. Seed range rules (INSERT OR IGNORE — safe to re-run)
        for rule in range_rules() {
            let sql = format!(
                "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name, category, haystack_tags, brick_class, units, object_types, point_type, digital_analog, range_value, haystack_kind, haystack_unit, priority) VALUES ('{}', 'range', {}, {}, {}, {}, '{}', {}, {}, {}, {}, 100)",
                rule.rule_name,
                rule.haystack_tags.map_or("NULL".to_string(), |t| format!("'{}'", t.replace('\'', "''"))),
                rule.brick_class.map_or("NULL".to_string(), |b| format!("'{}'", b.replace('\'', "''"))),
                rule.units.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
                rule.object_types.map_or("NULL".to_string(), |o| format!("'{}'", o.replace('\'', "''"))),
                rule.point_type,
                rule.digital_analog,
                rule.range_value,
                rule.haystack_kind.map_or("NULL".to_string(), |k| format!("'{}'", k.replace('\'', "''"))),
                rule.haystack_unit.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
            );
            let _ = db.execute_unprepared(&sql).await;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        // Recreate without range columns and old CHECK
        db.execute_unprepared(
            "CREATE TABLE HAYSTACK_AUTO_TAGGING_RULES_old AS SELECT id, rule_name, category, pattern, units, object_types, haystack_tags, brick_class, haystack_kind, haystack_unit, enabled, priority, created_at, updated_at FROM HAYSTACK_AUTO_TAGGING_RULES WHERE category != 'range'",
        ).await?;
        db.execute_unprepared("DROP TABLE HAYSTACK_AUTO_TAGGING_RULES").await?;
        db.execute_unprepared(
            "ALTER TABLE HAYSTACK_AUTO_TAGGING_RULES_old RENAME TO HAYSTACK_AUTO_TAGGING_RULES",
        ).await?;
        Ok(())
    }
}
