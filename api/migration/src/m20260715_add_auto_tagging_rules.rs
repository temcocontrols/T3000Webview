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

fn default_rules() -> Vec<RuleSeed> {
    vec![
        // ═══ Brick Rules (37) ═══
        RuleSeed { rule_name: "brick:oat", category: "brick", pattern: "(?i)(?<![A-Za-z])(oat|outside[_ ]?air[_ ]?temp|outsideair|oa[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Outside_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:oah", category: "brick", pattern: "(?i)(?<![A-Za-z])(oah|outside[_ ]?air[_ ]?(humidity|rh)|outsideairhumidity)(?![A-Za-z])", units: Some("%,percent,percentRelativeHumidity"), object_types: None, haystack_tags: None, brick_class: Some("Outside_Air_Humidity_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:mat", category: "brick", pattern: "(?i)(?<![A-Za-z])(mat|mixed[_ ]?air[_ ]?temp|mixedairtemp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Mixed_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:mad", category: "brick", pattern: "(?i)(?<![A-Za-z])(mad|mixed[_ ]?air[_ ]?damper|oa[_ ]?damper|outside[_ ]?air[_ ]?damper)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Outside_Air_Damper"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:dat", category: "brick", pattern: "(?i)(?<![A-Za-z])(dat|discharge[_ ]?air[_ ]?temp|sat|supply[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:saf", category: "brick", pattern: "(?i)(?<![A-Za-z])(saf|supply[_ ]?air[_ ]?flow|supply[_ ]?fan[_ ]?airflow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:supply_fan", category: "brick", pattern: "(?i)(?<![A-Za-z])(supply[_ ]?fan|sa[_ ]?fan|sf)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), haystack_tags: None, brick_class: Some("Supply_Fan"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:rat", category: "brick", pattern: "(?i)(?<![A-Za-z])(rat|return[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Return_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:rah", category: "brick", pattern: "(?i)(?<![A-Za-z])(rah|return[_ ]?air[_ ]?(humidity|rh))(?![A-Za-z])", units: Some("%,percent"), object_types: None, haystack_tags: None, brick_class: Some("Return_Air_Humidity_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:return_fan", category: "brick", pattern: "(?i)(?<![A-Za-z])(return[_ ]?fan|ra[_ ]?fan|rf)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Return_Fan"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:zone_temp", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?temp|znt|space[_ ]?temp|room[_ ]?temp|rmt)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:zone_setpoint", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(temp[_ ]?)?(setpoint|sp|stpt)|znsp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Temperature_Setpoint"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:zone_humidity", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(humidity|rh)|space[_ ]?humidity)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Zone_Air_Humidity_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:zone_co2", category: "brick", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?co2|co2|space[_ ]?co2)(?![A-Za-z])", units: Some("ppm,partsPerMillion"), object_types: None, haystack_tags: None, brick_class: Some("CO2_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:occ_sensor", category: "brick", pattern: "(?i)(?<![A-Za-z])(occupancy|occ[_ ]?sensor|occupied)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Occupancy_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:vav_damper", category: "brick", pattern: "(?i)(?<![A-Za-z])(vav[_ ]?damper|damper[_ ]?pos(ition)?|dpr[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Damper_Position_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:vav_airflow", category: "brick", pattern: "(?i)(?<![A-Za-z])(vav[_ ]?(airflow|flow)|box[_ ]?airflow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Supply_Air_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:reheat_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(reheat[_ ]?valve|rh[_ ]?valve|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Reheat_Valve"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:chw_supply", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?supply|chws[_ ]?temp|chilled[_ ]?water[_ ]?supply)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Supply_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:chw_return", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?return|chwr[_ ]?temp|chilled[_ ]?water[_ ]?return)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Return_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:hw_supply", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?supply|hws[_ ]?temp|hot[_ ]?water[_ ]?supply)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Supply_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:hw_return", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?return|hwr[_ ]?temp|hot[_ ]?water[_ ]?return)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Return_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:chiller_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(chiller[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Chiller_Status"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:boiler_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(boiler[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value,multi-state-input,multi-state-value"), haystack_tags: None, brick_class: Some("Boiler_Status"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:chw_pump", category: "brick", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?pump|chilled[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Chilled_Water_Pump"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:hw_pump", category: "brick", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?pump|hot[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Hot_Water_Pump"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:light_status", category: "brick", pattern: "(?i)(?<![A-Za-z])(light[_ ]?(status|state)|lighting[_ ]?status|luminaire[_ ]?status)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value"), haystack_tags: None, brick_class: Some("Luminaire_Status"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:light_dim", category: "brick", pattern: "(?i)(?<![A-Za-z])(dim(ming)?[_ ]?(level|setpoint|sp)|light[_ ]?level)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Luminaire_Dimming_Level_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:electric_meter", category: "brick", pattern: "(?i)(?<![A-Za-z])(electric[_ ]?(meter|kwh|consumption)|kwh[_ ]?meter|power[_ ]?meter)(?![A-Za-z])", units: Some("kWh,Wh,MWh,kW,watt,kilowatt"), object_types: None, haystack_tags: None, brick_class: Some("Electrical_Power_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:water_meter", category: "brick", pattern: "(?i)(?<![A-Za-z])(water[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("gallons,liters,m3,gpm,L/s"), object_types: None, haystack_tags: None, brick_class: Some("Water_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:gas_meter", category: "brick", pattern: "(?i)(?<![A-Za-z])(gas[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("therms,kBtu,cf,cfm,m3"), object_types: None, haystack_tags: None, brick_class: Some("Gas_Flow_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:ahu", category: "brick", pattern: "(?i)(?<![A-Za-z])(ahu|air[_ ]?handler|air[_ ]?handling[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("AHU"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:rtu", category: "brick", pattern: "(?i)(?<![A-Za-z])(rtu|rooftop[_ ]?unit|roof[_ ]?top[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("RTU"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:fcu", category: "brick", pattern: "(?i)(?<![A-Za-z])(fcu|fan[_ ]?coil[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("FCU"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:duct_pressure", category: "brick", pattern: "(?i)(?<![A-Za-z])(duct[_ ]?(static[_ ]?)?pressure|dsp|static[_ ]?pressure)(?![A-Za-z])", units: Some("inWC,\"wc,inH2O,Pa,kPa"), object_types: None, haystack_tags: None, brick_class: Some("Static_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:building_pressure", category: "brick", pattern: "(?i)(?<![A-Za-z])(building[_ ]?pressure|bldg[_ ]?pressure)(?![A-Za-z])", units: None, object_types: None, haystack_tags: None, brick_class: Some("Building_Air_Static_Pressure_Sensor"), haystack_kind: None, haystack_unit: None },
        RuleSeed { rule_name: "brick:generic_temp", category: "brick", pattern: "(?i)(?<![A-Za-z])(temp(erature)?|tmp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: None, brick_class: Some("Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None },
        // ═══ Haystack Rules (31) ═══
        RuleSeed { rule_name: "hs:oat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(oat|outside[_ ]?air[_ ]?temp|outsideair|oa[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,outside,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:oah", category: "haystack", pattern: "(?i)(?<![A-Za-z])(oah|outside[_ ]?air[_ ]?(humidity|rh))(?![A-Za-z])", units: Some("%,percent"), object_types: None, haystack_tags: Some("point,sensor,outside,air,humidity"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
        RuleSeed { rule_name: "hs:mat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(mat|mixed[_ ]?air[_ ]?temp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,mixed,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:dat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(dat|discharge[_ ]?air[_ ]?temp|sat|supply[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,discharge,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:saf", category: "haystack", pattern: "(?i)(?<![A-Za-z])(saf|supply[_ ]?air[_ ]?flow)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,supply,air,flow"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("cfm") },
        RuleSeed { rule_name: "hs:supply_fan", category: "haystack", pattern: "(?i)(?<![A-Za-z])(supply[_ ]?fan|sa[_ ]?fan|sf)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value"), haystack_tags: Some("point,sensor,supply,fan,run,cmd"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:rat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(rat|return[_ ]?air[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,return,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:zone_temp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?temp|znt|space[_ ]?temp|room[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,zone,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:zone_setpoint", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?(temp[_ ]?)?(setpoint|sp|stpt))(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sp,zone,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:zone_co2", category: "haystack", pattern: "(?i)(?<![A-Za-z])(zone[_ ]?co2|co2)(?![A-Za-z])", units: Some("ppm"), object_types: None, haystack_tags: Some("point,sensor,zone,air,co2,concentration"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("ppm") },
        RuleSeed { rule_name: "hs:occ", category: "haystack", pattern: "(?i)(?<![A-Za-z])(occupancy|occ[_ ]?sensor|occupied)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,occupied"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:vav_damper", category: "haystack", pattern: "(?i)(?<![A-Za-z])(vav[_ ]?damper|damper[_ ]?pos|dpr[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,damper,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
        RuleSeed { rule_name: "hs:reheat_valve", category: "haystack", pattern: "(?i)(?<![A-Za-z])(reheat[_ ]?valve|rh[_ ]?valve|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,reheat,valve,position"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
        RuleSeed { rule_name: "hs:chw_supply", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?supply|chws[_ ]?temp|chilled[_ ]?water[_ ]?supply)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,supply,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:chw_return", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?return|chwr[_ ]?temp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,return,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:hw_supply", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?supply|hws[_ ]?temp|hot[_ ]?water[_ ]?supply)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,supply,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:hw_return", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?return|hwr[_ ]?temp)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,return,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        RuleSeed { rule_name: "hs:chiller_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chiller[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,chiller,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:boiler_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(boiler[_ ]?(status|state|run))(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,boiler,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:chw_pump", category: "haystack", pattern: "(?i)(?<![A-Za-z])(chw[_ ]?pump|chilled[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,chilled,water,pump,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:hw_pump", category: "haystack", pattern: "(?i)(?<![A-Za-z])(hw[_ ]?pump|hot[_ ]?water[_ ]?pump)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,hot,water,pump,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:light_status", category: "haystack", pattern: "(?i)(?<![A-Za-z])(light[_ ]?(status|state)|luminaire[_ ]?status)(?![A-Za-z])", units: None, object_types: Some("binary-input,binary-output,binary-value"), haystack_tags: Some("point,sensor,lighting,run"), brick_class: None, haystack_kind: Some("Bool"), haystack_unit: None },
        RuleSeed { rule_name: "hs:light_dim", category: "haystack", pattern: "(?i)(?<![A-Za-z])(dim(ming)?[_ ]?(level|setpoint|sp)|light[_ ]?level)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("point,sensor,lighting,level"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("%") },
        RuleSeed { rule_name: "hs:electric_meter", category: "haystack", pattern: "(?i)(?<![A-Za-z])(electric[_ ]?(meter|kwh|consumption)|kwh[_ ]?meter|power[_ ]?meter)(?![A-Za-z])", units: Some("kWh,Wh,MWh,kW,watt,kilowatt"), object_types: None, haystack_tags: Some("point,sensor,elec,energy,meter"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("kWh") },
        RuleSeed { rule_name: "hs:water_meter", category: "haystack", pattern: "(?i)(?<![A-Za-z])(water[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("gallons,liters,m3"), object_types: None, haystack_tags: Some("point,sensor,water,volume,meter"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("gallons") },
        RuleSeed { rule_name: "hs:gas_meter", category: "haystack", pattern: "(?i)(?<![A-Za-z])(gas[_ ]?(meter|consumption|flow))(?![A-Za-z])", units: Some("therms,kBtu,cf"), object_types: None, haystack_tags: Some("point,sensor,gas,volume,meter"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("therms") },
        RuleSeed { rule_name: "hs:ahu", category: "haystack", pattern: "(?i)(?<![A-Za-z])(ahu|air[_ ]?handler|air[_ ]?handling[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("equip,ahu"), brick_class: None, haystack_kind: Some("Marker"), haystack_unit: None },
        RuleSeed { rule_name: "hs:rtu", category: "haystack", pattern: "(?i)(?<![A-Za-z])(rtu|rooftop[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("equip,rtu"), brick_class: None, haystack_kind: Some("Marker"), haystack_unit: None },
        RuleSeed { rule_name: "hs:fcu", category: "haystack", pattern: "(?i)(?<![A-Za-z])(fcu|fan[_ ]?coil[_ ]?unit)(?![A-Za-z])", units: None, object_types: None, haystack_tags: Some("equip,fcu"), brick_class: None, haystack_kind: Some("Marker"), haystack_unit: None },
        RuleSeed { rule_name: "hs:duct_pressure", category: "haystack", pattern: "(?i)(?<![A-Za-z])(duct[_ ]?(static[_ ]?)?pressure|dsp|static[_ ]?pressure)(?![A-Za-z])", units: Some("inWC"), object_types: None, haystack_tags: Some("point,sensor,duct,pressure,static"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("inWC") },
        RuleSeed { rule_name: "hs:generic_temp", category: "haystack", pattern: "(?i)(?<![A-Za-z])(temp(erature)?|tmp)(?![A-Za-z])", units: Some("degF,degC,°F,°C,fahrenheit,celsius"), object_types: None, haystack_tags: Some("point,sensor,air,temp"), brick_class: None, haystack_kind: Some("Number"), haystack_unit: Some("°F") },
        // Extended + Plain-english rules (from m20260718 + m20260729)
        RuleSeed { rule_name: "brick:eat", category: "brick", pattern: "(?i)(?<![A-Za-z])(eat|exhaust[_ ]?air[_ ]?temp|ea[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), haystack_tags: None, brick_class: Some("Exhaust_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None, object_types: None },
        RuleSeed { rule_name: "brick:ef", category: "brick", pattern: "(?i)(?<![A-Za-z])(ef|exhaust[_ ]?fan|relief[_ ]?fan)(?![A-Za-z])", object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), brick_class: Some("Exhaust_Fan"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:economizer", category: "brick", pattern: "(?i)(?<![A-Za-z])(economizer|econ)(?![A-Za-z])", brick_class: Some("Economizer"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:dewpoint", category: "brick", pattern: "(?i)(?<![A-Za-z])(dew[_ ]?point|dewpoint|dp[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), brick_class: Some("Dewpoint_Sensor"), haystack_kind: None, haystack_unit: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:cooling_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(cooling[_ ]?(valve|coil[_ ]?valve)|ccv|cw[_ ]?valve[_ ]?pos)(?![A-Za-z])", brick_class: Some("Cooling_Valve"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:heating_valve", category: "brick", pattern: "(?i)(?<![A-Za-z])(heating[_ ]?(valve|coil[_ ]?valve)|hcv|hw[_ ]?valve[_ ]?pos)(?![A-Za-z])", brick_class: Some("Heating_Valve"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:fan_vfd", category: "brick", pattern: "(?i)(?<![A-Za-z])(fan[_ ]?(vfd|speed|hz)|vfd[_ ]?(speed|hz)|drive[_ ]?speed)(?![A-Za-z])", brick_class: Some("Fan_VFD"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:compressor", category: "brick", pattern: "(?i)(?<![A-Za-z])(compressor|comp[_ ]?(status|run|cmd|speed))(?![A-Za-z])", object_types: Some("binary-input,binary-output,binary-value,multi-state-input,multi-state-output"), brick_class: Some("Compressor"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
        RuleSeed { rule_name: "hs:eat", category: "haystack", pattern: "(?i)(?<![A-Za-z])(eat|exhaust[_ ]?air[_ ]?temp|ea[_ ]?temp)(?![A-Za-z])", units: Some("degF,degC,°F,°C"), haystack_tags: Some("point,sensor,exhaust,air,temp"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, object_types: None },
        RuleSeed { rule_name: "hs:ef", category: "haystack", pattern: "(?i)(?<![A-Za-z])(ef|exhaust[_ ]?fan|relief[_ ]?fan)(?![A-Za-z])", haystack_tags: Some("point,sensor,exhaust,fan,run"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None, object_types: None },
        RuleSeed { rule_name: "hs:economizer", category: "haystack", pattern: "(?i)(?<![A-Za-z])(economizer|econ)(?![A-Za-z])", haystack_tags: Some("point,sensor,economizer"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None, object_types: None },
        RuleSeed { rule_name: "hs:supply_temp_plain", category: "haystack", pattern: "(?i)(supply[_ ]?temp)", haystack_tags: Some("point,sensor,discharge,air,temp,supply"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
        RuleSeed { rule_name: "brick:supply_temp_plain", category: "brick", pattern: "(?i)(supply[_ ]?temp)", brick_class: Some("Supply_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "hs:return_temp_plain", category: "haystack", pattern: "(?i)(return[_ ]?temp)", haystack_tags: Some("point,sensor,return,air,temp"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
        RuleSeed { rule_name: "brick:return_temp_plain", category: "brick", pattern: "(?i)(return[_ ]?temp)", brick_class: Some("Return_Air_Temperature_Sensor"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "hs:fan_status", category: "haystack", pattern: "(?i)(fan[_ ]?status)", object_types: Some("binary-input,binary-value"), haystack_tags: Some("point,sensor,fan,run,status"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None },
        RuleSeed { rule_name: "brick:fan_status", category: "brick", pattern: "(?i)(fan[_ ]?status)", object_types: Some("binary-input,binary-value"), brick_class: Some("Fan_Status_Sensor"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:fan_enable", category: "brick", pattern: "(?i)(fan[_ ]?(enable|cmd|command))", object_types: Some("binary-output,binary-value"), brick_class: Some("Fan_Enable_Command"), haystack_kind: None, haystack_unit: None, units: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:fan_speed", category: "brick", pattern: "(?i)(fan[_ ]?speed)", brick_class: Some("Fan_Speed_Command"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "hs:cooling_valve_plain", category: "haystack", pattern: "(?i)(cooling[_ ]?valve)", haystack_tags: Some("point,cmd,valve,cooling,chilledWater"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
        RuleSeed { rule_name: "hs:heating_valve_plain", category: "haystack", pattern: "(?i)(heating[_ ]?valve)", haystack_tags: Some("point,cmd,valve,heating,hotWater"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
        RuleSeed { rule_name: "brick:cooling_valve_plain", category: "brick", pattern: "(?i)(cooling[_ ]?valve)", brick_class: Some("Cooling_Valve_Command"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "brick:heating_valve_plain", category: "brick", pattern: "(?i)(heating[_ ]?valve)", brick_class: Some("Heating_Valve_Command"), haystack_kind: None, haystack_unit: None, units: None, object_types: None, haystack_tags: None },
        RuleSeed { rule_name: "hs:fan_enable", category: "haystack", pattern: "(?i)(fan[_ ]?(enable|cmd|command))", object_types: Some("binary-output,binary-value"), haystack_tags: Some("point,cmd,fan,enable"), haystack_kind: Some("Bool"), haystack_unit: None, brick_class: None, units: None },
        RuleSeed { rule_name: "hs:fan_speed", category: "haystack", pattern: "(?i)(fan[_ ]?speed)", haystack_tags: Some("point,cmd,fan,speed"), haystack_kind: Some("Number"), haystack_unit: None, brick_class: None, units: None, object_types: None },
    ]
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // 1. Create HAYSTACK_AUTO_TAGGING_RULES table with full schema
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_AUTO_TAGGING_RULES (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_name      TEXT NOT NULL UNIQUE,
                category       TEXT NOT NULL CHECK(category IN ('haystack','brick','range')),
                pattern        TEXT,
                units          TEXT,
                object_types   TEXT,
                haystack_tags  TEXT,
                brick_class    TEXT,
                haystack_kind  TEXT,
                haystack_unit  TEXT,
                point_type     TEXT,
                digital_analog INTEGER,
                range_value    INTEGER,
                source         TEXT NOT NULL DEFAULT 'migration',
                enabled        INTEGER NOT NULL DEFAULT 1,
                priority       INTEGER NOT NULL DEFAULT 0,
                created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at     TEXT DEFAULT CURRENT_TIMESTAMP
            )",
        ).await?;

        // 2. Add brick_class column to existing table (idempotent — may already exist)
        let _ = db.execute_unprepared(
            "ALTER TABLE HAYSTACK_POINT_TAGS ADD COLUMN brick_class TEXT",
        ).await;

        // 3. Seed regex rules
        for (i, rule) in default_rules().iter().enumerate() {
            let sql = format!(
                "INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name, category, pattern, units, object_types, haystack_tags, brick_class, haystack_kind, haystack_unit, source, priority) VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, {}, 'migration', {})",
                rule.rule_name.replace('\'', "''"),
                rule.category,
                rule.pattern.replace('\'', "''"),
                rule.units.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
                rule.object_types.map_or("NULL".to_string(), |o| format!("'{}'", o.replace('\'', "''"))),
                rule.haystack_tags.map_or("NULL".to_string(), |t| format!("'{}'", t.replace('\'', "''"))),
                rule.brick_class.map_or("NULL".to_string(), |b| format!("'{}'", b.replace('\'', "''"))),
                rule.haystack_kind.map_or("NULL".to_string(), |k| format!("'{}'", k.replace('\'', "''"))),
                rule.haystack_unit.map_or("NULL".to_string(), |u| format!("'{}'", u.replace('\'', "''"))),
                i as i32,
            );
            db.execute_unprepared(&sql).await?;
        }

        // 4. Seed range rules (point_type + digital_analog + range_value)
        let range_sql = r#"
INSERT OR IGNORE INTO HAYSTACK_AUTO_TAGGING_RULES (rule_name,category,pattern,haystack_tags,brick_class,units,haystack_kind,point_type,digital_analog,range_value,source,priority) VALUES
('range:in-dig-0','range',NULL,'point,sensor,binary',NULL,NULL,NULL,'INPUT',0,0,'migration',200),
('range:in-ana-0','range',NULL,'point,sensor,analog',NULL,NULL,NULL,'INPUT',1,0,'migration',201),
('range:in-ana-1','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,1,'migration',202),
('range:in-ana-2','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,2,'migration',203),
('range:in-ana-3','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,3,'migration',204),
('range:in-ana-4','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,4,'migration',205),
('range:in-ana-5','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,5,'migration',206),
('range:in-ana-6','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,6,'migration',207),
('range:in-ana-7','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,7,'migration',208),
('range:in-ana-8','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,8,'migration',209),
('range:in-ana-9','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.C','Number','INPUT',1,9,'migration',210),
('range:in-ana-10','range',NULL,'point,sensor,air,temp','Temperature_Sensor','Deg.F','Number','INPUT',1,10,'migration',211),
('range:in-ana-11','range',NULL,'point,sensor,voltage',NULL,'Volts','Number','INPUT',1,11,'migration',212),
('range:in-ana-12','range',NULL,'point,sensor,current','Current_Sensor','Amps','Number','INPUT',1,12,'migration',213),
('range:in-ana-14','range',NULL,'point,sensor,pressure','Pressure_Sensor','psi','Number','INPUT',1,14,'migration',214),
('range:in-ana-16','range',NULL,'point,sensor,percent','Percentage_Sensor','%','Number','INPUT',1,16,'migration',215),
('range:in-ana-27','range',NULL,'point,sensor,air,humidity','Humidity_Sensor','%','Number','INPUT',1,27,'migration',216),
('range:in-ana-28','range',NULL,'point,sensor,air,co2,concentration','CO2_Sensor','PPM','Number','INPUT',1,28,'migration',217),
('range:in-ana-29','range',NULL,'point,sensor,speed',NULL,'RPM','Number','INPUT',1,29,'migration',218),
('range:out-dig-0','range',NULL,'point,cmd,binary',NULL,NULL,NULL,'OUTPUT',0,0,'migration',300),
('range:out-ana-0','range',NULL,'point,cmd,analog',NULL,NULL,NULL,'OUTPUT',1,0,'migration',301),
('range:out-ana-31','range',NULL,'point,cmd,voltage',NULL,'Volts','Number','OUTPUT',1,31,'migration',302),
('range:out-ana-32','range',NULL,'point,cmd,damper,position','Damper_Position_Actuator','%','Number','OUTPUT',1,32,'migration',303),
('range:out-ana-34','range',NULL,'point,cmd,percent','Percentage_Command','%','Number','OUTPUT',1,34,'migration',304),
('range:var-dig-0','range',NULL,'point,sp,binary',NULL,NULL,NULL,'VARIABLE',0,0,'migration',400),
('range:var-ana-0','range',NULL,'point,sp,analog',NULL,NULL,NULL,'VARIABLE',1,0,'migration',401);
"#;
        for line in range_sql.lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() && !trimmed.starts_with("--") && !trimmed.starts_with("INSERT OR IGNORE") {
                let _ = db.execute_unprepared(trimmed).await;
            }
        }

        // 5. Create HAYSTACK_POINT_BRICK_CLASS (from m20260716)
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_POINT_BRICK_CLASS (
                serial_number INTEGER NOT NULL,
                point_type    TEXT NOT NULL,
                point_index   INTEGER NOT NULL,
                brick_class   TEXT NOT NULL,
                PRIMARY KEY (serial_number, point_type, point_index)
            )",
        ).await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_hpbc_serial ON HAYSTACK_POINT_BRICK_CLASS (serial_number)",
        ).await?;

        // Migrate existing __brick_class__ marker rows
        db.execute_unprepared(
            "INSERT OR IGNORE INTO HAYSTACK_POINT_BRICK_CLASS (serial_number, point_type, point_index, brick_class)
             SELECT serial_number, point_type, CAST(point_index AS INTEGER), brick_class
             FROM HAYSTACK_POINT_TAGS WHERE tag_name = '__brick_class__' AND brick_class IS NOT NULL",
        ).await?;
        db.execute_unprepared(
            "DELETE FROM HAYSTACK_POINT_TAGS WHERE tag_name = '__brick_class__'",
        ).await?;

        // Add auto_assigned to tags table + drop brick_class column
        let _ = db.execute_unprepared(
            "ALTER TABLE HAYSTACK_POINT_TAGS ADD COLUMN auto_assigned INTEGER NOT NULL DEFAULT 0",
        ).await;
        let _ = db.execute_unprepared(
            "ALTER TABLE HAYSTACK_POINT_TAGS DROP COLUMN brick_class",
        ).await;

        // 6. Add auto_assigned to brick class table (from m20260719)
        let _ = db.execute_unprepared(
            "ALTER TABLE HAYSTACK_POINT_BRICK_CLASS ADD COLUMN auto_assigned INTEGER NOT NULL DEFAULT 1",
        ).await;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_POINT_BRICK_CLASS").await?;
        let _ = db.execute_unprepared("ALTER TABLE HAYSTACK_POINT_TAGS DROP COLUMN auto_assigned").await;
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_AUTO_TAGGING_RULES").await?;
        Ok(())
    }
}
