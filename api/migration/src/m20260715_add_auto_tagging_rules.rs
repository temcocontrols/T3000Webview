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
    ]
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // 1. Create HAYSTACK_AUTO_TAGGING_RULES table
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_AUTO_TAGGING_RULES (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_name     TEXT NOT NULL UNIQUE,
                category      TEXT NOT NULL CHECK(category IN ('haystack','brick')),
                pattern       TEXT NOT NULL,
                units         TEXT,
                object_types  TEXT,
                haystack_tags TEXT,
                brick_class   TEXT,
                haystack_kind TEXT,
                haystack_unit TEXT,
                enabled       INTEGER NOT NULL DEFAULT 1,
                priority      INTEGER NOT NULL DEFAULT 0,
                created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
            )",
        ).await?;

        // 2. Add brick_class column to existing table (idempotent — may already exist)
        let _ = db.execute_unprepared(
            "ALTER TABLE HAYSTACK_POINT_TAGS ADD COLUMN brick_class TEXT",
        ).await;

        // 3. Seed 68 default rules
        for (i, rule) in default_rules().iter().enumerate() {
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
                i as i32,
            );
            db.execute_unprepared(&sql).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        // Recreate table without brick_class column (SQLite doesn't support DROP COLUMN)
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_POINT_TAGS_backup AS SELECT serial_number, point_type, point_index, point_id, tag_name FROM HAYSTACK_POINT_TAGS"
        ).await?;
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_POINT_TAGS").await?;
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS HAYSTACK_POINT_TAGS (
                serial_number INTEGER NOT NULL,
                point_type    TEXT NOT NULL,
                point_index   TEXT NOT NULL,
                point_id      TEXT NOT NULL,
                tag_name      TEXT NOT NULL,
                PRIMARY KEY (serial_number, point_type, point_index, tag_name)
            )"
        ).await?;
        db.execute_unprepared("INSERT INTO HAYSTACK_POINT_TAGS SELECT * FROM HAYSTACK_POINT_TAGS_backup").await?;
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_POINT_TAGS_backup").await?;
        db.execute_unprepared("DROP TABLE IF EXISTS HAYSTACK_AUTO_TAGGING_RULES").await?;
        Ok(())
    }
}
