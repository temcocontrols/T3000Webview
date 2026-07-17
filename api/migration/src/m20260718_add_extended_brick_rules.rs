use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

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

fn extended_rules() -> Vec<RuleSeed> {
    vec![
        // ═══ Exhaust Air ═══
        RuleSeed { rule_name: "brick:eat", category: "brick", pattern: "(?i)(?<![A-Za-z])(eat|exhaust[_ ]?air[_ ]?temp|ea[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: None, brick_class: Some("Exhaust_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:eaf", category: "brick", pattern: "(?i)(?<![A-Za-z])(eaf|exhaust[_ ]?air[_ ]?flow|ea[_ ]?flow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Exhaust_Air_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:ef", category: "brick", pattern: "(?i)(?<![A-Za-z])(ef|exhaust[_ ]?fan|relief[_ ]?fan)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), haystack_tags: None, brick_class: Some("Exhaust_Fan"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:exhaust_damper", category: "brick", pattern: "(?i)(?<![A-Za-z])(exhaust[_ ]?damper|ed|relief[_ ]?damper)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Exhaust_Damper"), haystack_kind: None, haystack_unit: None },

        // ═══ Economizer ═══
        RuleSeed { rule_name: "brick:economizer", category: "brick", pattern: "(?i)(?<![A-Za-z])(economizer|econ)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Economizer"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:econ_damper", category: "brick", pattern: "(?i)(?<![A-Za-z])(econ[_ ]?damper|economizer[_ ]?damper)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Economizer_Damper"), haystack_kind: None, haystack_unit: None },

        // ═══ Psychrometric ═══
        RuleSeed { rule_name: "brick:dewpoint", category: "brick", pattern: "(?i)(?<![A-Za-z])(dew[_ ]?point|dewpoint|dp[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: None, brick_class: Some("Dewpoint_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:enthalpy", category: "brick", pattern: "(?i)(?<![A-Za-z])(enthalpy|enthal|oa[_ ]?enthalpy)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Air_Enthalpy_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:wetbulb", category: "brick", pattern: "(?i)(?<![A-Za-z])(wet[_ ]?bulb|wb[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: None, brick_class: Some("Air_Wet_Bulb_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },

        // ═══ Filter ═══
        RuleSeed { rule_name: "brick:filter_dp", category: "brick", pattern: "(?i)(?<![A-Za-z])(filter[_ ]?(dp|differential|diff[_ ]?press|status))(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Filter_Differential_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:filter_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(filter[_ ]?status|change[_ ]?filter|dirty[_ ]?filter)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Filter_Status"), haystack_kind: None, haystack_unit: None },

        // ═══ Valves ═══
        RuleSeed { rule_name: "brick:cooling_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(cooling[_ ]?(valve|coil[_ ]?valve)|ccv|cw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Cooling_Valve"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:heating_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(heating[_ ]?(valve|coil[_ ]?valve)|hcv|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Heating_Valve"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:chw_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?valve|chilled[_ ]?water[_ ]?valve)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Valve"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:hw_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?valve|hot[_ ]?water[_ ]?valve)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Valve"), haystack_kind: None, haystack_unit: None },

        // ═══ Differential Pressure ═══
        RuleSeed { rule_name: "brick:chw_dp", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?(dp|diff[_ ]?press|diff[_ ]?pressure|differential[_ ]?pressure))(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Differential_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:hw_dp", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?(dp|diff[_ ]?press|diff[_ ]?pressure|differential[_ ]?pressure))(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Differential_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:filter_air_dp", category: "brick", pattern: "(?i)(?<![A-Za-z])(air[_ ]?filter[_ ]?dp|filter[_ ]?air[_ ]?dp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Filter_Air_Differential_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },

        // ═══ VFD / Motor ═══
        RuleSeed { rule_name: "brick:fan_vfd", category: "brick", pattern: "(?i)(?<![A-Za-z])(fan[_ ]?(vfd|speed|hz)|vfd[_ ]?(speed|hz)|drive[_ ]?speed)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Fan_VFD"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:pump_vfd", category: "brick", pattern: "(?i)(?<![A-Za-z])(pump[_ ]?(vfd|speed|hz))(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Pump_VFD"), haystack_kind: None, haystack_unit: None },

        // ═══ Coils ═══
        RuleSeed { rule_name: "brick:cooling_coil", category: "brick", pattern: "(?i)(?<![A-Za-z])(cooling[_ ]?coil|cc[_ ]?(temp|status)|dx[_ ]?coil)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Cooling_Coil"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:heating_coil", category: "brick", pattern: "(?i)(?<![A-Za-z])(heating[_ ]?coil|hc[_ ]?(temp|status)|hw[_ ]?coil)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Heating_Coil"), haystack_kind: None, haystack_unit: None },

        // ═══ Heat Exchanger / Compressor / Condenser ═══
        RuleSeed { rule_name: "brick:heat_exchanger", category: "brick", pattern: "(?i)(?<![A-Za-z])(heat[_ ]?exchanger|hx|hxr)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Heat_Exchanger"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:compressor", category: "brick", pattern: "(?i)(?<![A-Za-z])(compressor|comp[_ ]?(status|run|cmd|speed))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), haystack_tags: None, brick_class: Some("Compressor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:condenser_water_temp", category: "brick", pattern: "(?i)(?<![A-Za-z])(cws[_ ]?temp|cwr[_ ]?temp|condenser[_ ]?water[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: None, brick_class: Some("Condenser_Water_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },

        // ═══ Bypass ═══
        RuleSeed { rule_name: "brick:bypass_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(bypass[_ ]?valve|bpv|bypass[_ ]?v)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Bypass_Valve"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:bypass_damper", category: "brick", pattern: "(?i)(?<![A-Za-z])(bypass[_ ]?damper|bpd|face[_ ]?bypass)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Bypass_Damper"), haystack_kind: None, haystack_unit: None },

        // ═══ Zone humidity setpoint ═══
        RuleSeed { rule_name: "brick:zone_humidity_sp", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(humidity|rh)[_ ]?(setpoint|sp|stpt)|zhsp)(?![A-Za-z])", units: Some("%,percent"), object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Humidity_Setpoint"), haystack_kind: None, haystack_unit: None },

        // ═══ Corresponding Haystack rules ═══
        RuleSeed { rule_name: "hs:eat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(eat|exhaust[_ ]?air[_ ]?temp|ea[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: Some("point,sensor,exhaust,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:eaf", category: "haystack", pattern: "(?i)(?<![A-Za-z])(eaf|exhaust[_ ]?air[_ ]?flow|ea[_ ]?flow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,exhaust,air,flow"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:ef", category: "haystack", pattern: "(?i)(?<![A-Za-z])(ef|exhaust[_ ]?fan|relief[_ ]?fan)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,exhaust,fan,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:economizer", category: "haystack", pattern: "(?i)(?<![A-Za-z])(economizer|econ)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,economizer"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:dewpoint", category: "haystack", pattern: "(?i)(?<![A-Za-z])(dew[_ ]?point|dewpoint|dp[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: Some("point,sensor,air,dewpoint,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:enthalpy", category: "haystack", pattern: "(?i)(?<![A-Za-z])(enthalpy|enthal|oa[_ ]?enthalpy)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,air,enthalpy"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:wetbulb", category: "haystack", pattern: "(?i)(?<![A-Za-z])(wet[_ ]?bulb|wb[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: Some("point,sensor,air,wetbulb,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:filter_dp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(filter[_ ]?(dp|differential|diff[_ ]?press))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,filter,pressure,differential"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:filter_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(filter[_ ]?status|change[_ ]?filter|dirty[_ ]?filter)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,filter,status"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:cooling_valve", category: "haystack", pattern: "(?i)(?<![A-Za-z])(cooling[_ ]?(valve|coil[_ ]?valve)|ccv|cw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,cooling,valve,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:heating_valve", category: "haystack", pattern: "(?i)(?<![A-Za-z])(heating[_ ]?(valve|coil[_ ]?valve)|hcv|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,heating,valve,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:chw_dp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?(dp|diff[_ ]?press|diff[_ ]?pressure|differential[_ ]?pressure))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,pressure,differential"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:hw_dp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?(dp|diff[_ ]?press|diff[_ ]?pressure|differential[_ ]?pressure))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,pressure,differential"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:fan_vfd", category: "haystack", pattern: "(?i)(?<![A-Za-z])(fan[_ ]?(vfd|speed|hz)|vfd[_ ]?(speed|hz)|drive[_ ]?speed)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,fan,vfd,speed"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:pump_vfd", category: "haystack", pattern: "(?i)(?<![A-Za-z])(pump[_ ]?(vfd|speed|hz))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,pump,vfd,speed"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:cooling_coil", category: "haystack", pattern: "(?i)(?<![A-Za-z])(cooling[_ ]?coil|cc[_ ]?(temp|status)|dx[_ ]?coil)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,cooling,coil"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:heating_coil", category: "haystack", pattern: "(?i)(?<![A-Za-z])(heating[_ ]?coil|hc[_ ]?(temp|status)|hw[_ ]?coil)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,heating,coil"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:heat_exchanger", category: "haystack", pattern: "(?i)(?<![A-Za-z])(heat[_ ]?exchanger|hx|hxr)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,heat,exchanger"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:compressor", category: "haystack", pattern: "(?i)(?<![A-Za-z])(compressor|comp[_ ]?(status|run|cmd|speed))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,compressor,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:condenser_water_temp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(cws[_ ]?temp|cwr[_ ]?temp|condenser[_ ]?water[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), object_types: None, haystack_tags: Some("point,sensor,condenser,water,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:bypass_valve", category: "haystack", pattern: "(?i)(?<![A-Za-z])(bypass[_ ]?valve|bpv|bypass[_ ]?v)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,bypass,valve,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:bypass_damper", category: "haystack", pattern: "(?i)(?<![A-Za-z])(bypass[_ ]?damper|bpd|face[_ ]?bypass)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,bypass,damper,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:zone_humidity_sp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(humidity|rh)[_ ]?(setpoint|sp|stpt)|zhsp)(?![A-Za-z])", units: Some("%,percent"), object_types: None, haystack_tags: Some("point,sp,zone,air,humidity"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:econ_damper", category: "haystack", pattern: "(?i)(?<![A-Za-z])(econ[_ ]?damper|economizer[_ ]?damper)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,economizer,damper,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
        RuleSeed { rule_name: "hs:exhaust_damper", category: "haystack", pattern: "(?i)(?<![A-Za-z])(exhaust[_ ]?damper|ed|relief[_ ]?damper)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,exhaust,damper,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: None },
    ]
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Priority offset — put new rules after existing ones (priority 68+)
        for (i, rule) in extended_rules().iter().enumerate() {
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
                68 + i as i32,
            );
            let _ = db.execute_unprepared(&sql).await;
        }

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // No schema changes to revert — rules are just data
        Ok(())
    }
}
