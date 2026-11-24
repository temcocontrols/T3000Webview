//! Range / units code tables per point type.
//!
//! The device stores `Range_Field` and `Units` as numeric codes, and the code
//! space differs per point type: inputs 0–39 are sensor types, variables 0–33
//! are engineering units, outputs 0–8 are output ranges. The firmware indexes
//! `Input_Analog_Units_Array` / `Variable_Analog_Units_Array` /
//! `Output_Analog_Units_Array` directly with the stored code, so these tables are
//! 0-based — and they overlap the digital states (1–30), which is why the mode is
//! always taken from `Digital_Analog`, never inferred from the number.
//!
//! `digital` selects the binary table (`Digital_Analog == "0"`).

use serde_json::{json, Value};

/// Analog input sensor types: `(range text, unit symbol)`.
fn input_analog(code: i64) -> Option<(&'static str, &'static str)> {
    Some(match code {
        0 => ("Unused", ""),
        1 => ("Y3K -40 to 150", "Deg.C"),
        2 => ("Y3K -40 to 300", "Deg.F"),
        3 => ("10K Type2", "Deg.C"),
        4 => ("10K Type2", "Deg.F"),
        5 => ("G3K -40 to 120", "Deg.C"),
        6 => ("G3K -40 to 250", "Deg.F"),
        7 => ("10K Type3", "Deg.C"),
        8 => ("10K Type3", "Deg.F"),
        9 => ("PT 1K -200 to 300", "Deg.C"),
        10 => ("PT 1K -200 to 570", "Deg.F"),
        11 => ("0.0 to 5.0", "Volts"),
        12 => ("0.0 to 100", "Amps"),
        13 => ("4 to 20", "ma"),
        14 => ("4 to 20", "psi"),
        15 => ("Pulse Count (Slow 1Hz)", "counts"),
        16 => ("0 to 100", "%"),
        17 => ("0 to 100", "%"),
        18 => ("0 to 100", "%"),
        19 => ("0.0 to 10.0", "Volts"),
        20 => ("Table 1", "Custom"),
        21 => ("Table 2", "Custom"),
        22 => ("Table 3", "Custom"),
        23 => ("Table 4", "Custom"),
        24 => ("Table 5", "Custom"),
        25 => ("Pulse Count (Fast 100Hz)", "counts"),
        26 => ("Frequency", "Hz"),
        27 => ("Humidity %", "%"),
        28 => ("CO2 PPM", "PPM"),
        29 => ("Revolutions Per Minute", "RPM"),
        30 => ("TVOC PPB", "PPB"),
        31 => ("ug/m3", "ug/m3"),
        32 => ("#/cm3", "#/cm3"),
        33 => ("dB", "dB"),
        34 => ("Lux", "Lux"),
        _ => return None,
    })
}

/// Binary states — shared by inputs, outputs and variables (incl. MSV 101–104).
fn digital_label(code: i64) -> Option<&'static str> {
    Some(match code {
        0 => "Unused",
        1 => "Off/On",
        2 => "Close/Open",
        3 => "Stop/Start",
        4 => "Disable/Enable",
        5 => "Normal/Alarm",
        6 => "Normal/High",
        7 => "Normal/Low",
        8 => "No/Yes",
        9 => "Cool/Heat",
        10 => "Unoccupy/Occupy",
        11 => "Low/High",
        12 => "On/Off",
        13 => "Open/Close",
        14 => "Start/Stop",
        15 => "Enable/Disable",
        16 => "Alarm/Normal",
        17 => "High/Normal",
        18 => "Low/Normal",
        19 => "Yes/No",
        20 => "Heat/Cool",
        21 => "Occupy/Unoccupy",
        22 => "High/Low",
        23 => "Custom Digital 1",
        24 => "Custom Digital 2",
        25 => "Custom Digital 3",
        26 => "Custom Digital 4",
        27 => "Custom Digital 5",
        28 => "Custom Digital 6",
        29 => "Custom Digital 7",
        30 => "Custom Digital 8",
        101 => "MSV 1",
        102 => "MSV 2",
        103 => "MSV 3",
        104 => "MSV 4",
        _ => return None,
    })
}

/// Variable engineering units (0–33) — `Variable_Analog_Units_Array` in
/// `global_define.h`, which the C++ indexes directly with the stored `range`.
fn variable_analog_label(code: i64) -> Option<&'static str> {
    Some(match code {
        0 => "Unused",
        1 => "°C",
        2 => "°F",
        3 => "FPM",
        4 => "Pa",
        5 => "KPa",
        6 => "PSI",
        7 => "inWC",
        8 => "W",
        9 => "kW",
        10 => "kWH",
        11 => "V",
        12 => "kV",
        13 => "A",
        14 => "mA",
        15 => "CFM",
        16 => "s",
        17 => "min",
        18 => "h",
        19 => "d",
        20 => "Time",
        21 => "Ω",
        22 => "%",
        23 => "%RH",
        24 => "PPM",
        25 => "Counts",
        26 => "%Open",
        27 => "kg",
        28 => "L/h",
        29 => "GPH",
        30 => "GAL",
        31 => "CF",
        32 => "BTU",
        33 => "m³/h",
        _ => return None,
    })
}

/// Output ranges (0–8) — `Output_Analog_Units_Array` in `global_define.h`.
fn output_analog_label(code: i64) -> Option<&'static str> {
    Some(match code {
        0 => "Unused",
        1 => "0.0 -> 10   Volts",
        2 => "0.0 -> 100  %Open",
        3 => "4   -> 20   psi",
        4 => "0.0 -> 100  %",
        5 => "0.0 -> 100  %Cls",
        6 => "4   -> 20   ma",
        7 => "0.0 -> 100  PWM",
        8 => "2   -> 10   Volts",
        _ => return None,
    })
}

/// `(range text, units text)` for a code of `point_type`.
///
/// Inputs have two dimensions (sensor table + unit symbol); variables and
/// outputs have one, so both texts are the same label.
pub fn range_text(point_type: &str, code: i64, digital: bool) -> Option<(&'static str, &'static str)> {
    if digital {
        return digital_label(code).map(|label| (label, ""));
    }
    match point_type {
        "INPUT" => input_analog(code),
        "OUTPUT" => output_analog_label(code).map(|label| (label, label)),
        _ => variable_analog_label(code).map(|label| (label, label)),
    }
}

/// Whether `code` is a valid range for this point type and analog/digital mode.
pub fn is_valid_range_code(point_type: &str, code: i64, digital: bool) -> bool {
    range_text(point_type, code, digital).is_some()
}

/// `{ "range": …, "units": … }` for a code, null-filled when unknown.
pub fn range_field(point_type: &str, code: Option<i64>, digital: bool) -> Value {
    match code.and_then(|c| range_text(point_type, c, digital)) {
        Some((label, unit)) => json!({ "range": label, "units": unit }),
        None => json!({ "range": Value::Null, "units": Value::Null }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn input_codes_keep_sensor_and_unit_separate() {
        assert_eq!(range_text("INPUT", 3, false), Some(("10K Type2", "Deg.C")));
    }

    #[test]
    fn variable_codes_are_engineering_units() {
        // Firmware truth: `Variable_Analog_Units_Array[range]` — 1 = °C, 2 = °F.
        assert_eq!(range_text("VARIABLE", 1, false), Some(("°C", "°C")));
        assert_eq!(range_text("VARIABLE", 2, false), Some(("°F", "°F")));
        assert_eq!(range_text("VARIABLE", 33, false), Some(("m³/h", "m³/h")));
        // …while the same code means something else for an input.
        assert_eq!(range_text("INPUT", 2, false), Some(("Y3K -40 to 300", "Deg.F")));
    }

    #[test]
    fn output_codes_are_output_ranges() {
        assert_eq!(range_text("OUTPUT", 1, false), Some(("0.0 -> 10   Volts", "0.0 -> 10   Volts")));
        assert_eq!(range_text("OUTPUT", 8, false), Some(("2   -> 10   Volts", "2   -> 10   Volts")));
    }

    #[test]
    fn digital_states_share_one_table() {
        assert_eq!(range_text("VARIABLE", 9, true), Some(("Cool/Heat", "")));
        assert_eq!(range_text("OUTPUT", 20, true), Some(("Heat/Cool", "")));
        assert_eq!(range_text("INPUT", 104, true), Some(("MSV 4", "")));
    }

    #[test]
    fn unknown_or_cross_table_codes_stay_null() {
        assert_eq!(range_text("VARIABLE", 45, false), None, "45 is past the variable table");
        assert_eq!(range_field("VARIABLE", Some(45), false)["units"], Value::Null);
        assert!(!is_valid_range_code("OUTPUT", 33, false), "33 is a variable unit");
        assert!(is_valid_range_code("VARIABLE", 33, false));
    }
}
