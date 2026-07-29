use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

/// One auto-tagging rule, serialized to/from DB.
#[derive(Debug, Clone)]
struct RuleSeed {
    rule_name: &'static str,
    category: &'static str,
    pattern: &'static str,
    units: Option<&'static str>,
    object_types: Option<&'static str>,
    haystack_tags: Option<&'static str>,
    brick_class: Option<&'static str>,
    haystack_kind: Option<&'static str>,
    haystack_unit: Option<&'static str>,
}

fn plain_english_rules() -> Vec<RuleSeed> {
    vec![
        // ═══ Plain-English HVAC Rules (12) — matches labels like "Supply Temp", "Fan Status", "Cooling Valve" ═══
        // These complement the existing BACnet-abbreviation rules (SAT, RAT, SF, etc.)

        // ── Supply / Discharge Air ──
        RuleSeed { rule_name: "hs:supply_temp_plain", category: "haystack", pattern: "(?i)(supply[_ ]?temp)", units: None, object_types: None, haystack_tags: Some("point,sensor,discharge,air,temp,supply"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "brick:supply_temp_plain", category: "brick", pattern: "(?i)(supply[_ ]?temp)", units: None, object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },

        // ── Return Air ──
        RuleSeed { rule_name: "hs:return_temp_plain", category: "haystack", pattern: "(?i)(return[_ ]?temp)", units: None, object_types: None, haystack_tags: Some("point,sensor,return,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "brick:return_temp_plain", category: "brick", pattern: "(?i)(return[_ ]?temp)", units: None, object_types: None, haystack_tags: None, brick_class: Some("Return_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },

        // ── Fan Status / Enable / Speed ──
        RuleSeed { rule_name: "hs:fan_status", category: "haystack", pattern: "(?i)(fan[_ ]?status)", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,fan,run,status"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "brick:fan_status", category: "brick", pattern: "(?i)(fan[_ ]?status)", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: None, brick_class: Some("Fan_Status_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "hs:fan_enable", category: "haystack", pattern: "(?i)(fan[_ ]?(enable|cmd|command))", units: None, object_types: Some("binary-output,binary-value"), haystack_tags: Some("point,cmd,fan,enable"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "brick:fan_enable", category: "brick", pattern: "(?i)(fan[_ ]?(enable|cmd|command))", units: None, object_types: Some("binary-output,binary-value"), haystack_tags: None, brick_class: Some("Fan_Enable_Command"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "hs:fan_speed", category: "haystack", pattern: "(?i)(fan[_ ]?speed)", units: None, object_types: None, haystack_tags: Some("point,cmd,fan,speed"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "brick:fan_speed", category: "brick", pattern: "(?i)(fan[_ ]?speed)", units: None, object_types: None, haystack_tags: None, brick_class: Some("Fan_Speed_Command"), haystack_kind: None, haystack_unit: None },

        // ── Cooling / Heating Valves ──
        RuleSeed { rule_name: "hs:cooling_valve_plain", category: "haystack", pattern: "(?i)(cooling[_ ]?valve)", units: None, object_types: None, haystack_tags: Some("point,cmd,valve,cooling,chilledWater"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "brick:cooling_valve_plain", category: "brick", pattern: "(?i)(cooling[_ ]?valve)", units: None, object_types: None, haystack_tags: None, brick_class: Some("Cooling_Valve_Command"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "hs:heating_valve_plain", category: "haystack", pattern: "(?i)(heating[_ ]?valve)", units: None, object_types: None, haystack_tags: Some("point,cmd,valve,heating,hotWater"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "brick:heating_valve_plain", category: "brick", pattern: "(?i)(heating[_ ]?valve)", units: None, object_types: None, haystack_tags: None, brick_class: Some("Heating_Valve_Command"), haystack_kind: None, haystack_unit: None },
    ]
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        for (i, rule) in plain_english_rules().iter().enumerate() {
            let sql = format!(
                "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name, category, pattern, units, object_types, haystack_tags, brick_class, haystack_kind, haystack_unit, priority) VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, {}, {})",
                rule.rule_name.replace('\'', "''"),
                rule.category,
                rule.pattern.replace('\'', "''"),
                rule.units.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
                rule.object_types.map_or("NULL".to_string(), |o| format!("'{}'", o.replace('\'', "''"))),
                rule.haystack_tags.map_or("NULL".to_string(), |t| format!("'{}'", t.replace('\'', "''"))),
                rule.brick_class.map_or("NULL".to_string(), |b| format!("'{}'", b.replace('\'', "''"))),
                rule.haystack_kind.map_or("NULL".to_string(), |k| format!("'{}'", k.replace('\'', "''"))),
                rule.haystack_unit.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
                i as i32 + 200, // priority offset to run after core rules
            );
            db.execute_unprepared(&sql).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        for rule in plain_english_rules() {
            let sql = format!(
                "DELETE FROM HAYSTACK_AUTO_TAGGING_RULES WHERE rule_name = '{}'",
                rule.rule_name.replace('\'', "''")
            );
            db.execute_unprepared(&sql).await?;
        }
        Ok(())
    }
}
