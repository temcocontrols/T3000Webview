//! Rule evaluator — one reusable confirm-streak engine + `rule_kind` dispatch.
//!
//! Every rule is: a per-sample condition + a confirm streak + a sample interval
//! → fault hours. Rules are configured in the DB (`FDD_RULES`), the logic lives
//! here.

use serde_json::{json, Value};
use std::collections::VecDeque;

use super::rules::Rule;
use super::series::Sample;

/// Result of evaluating one rule.
pub struct Finding {
    pub severity: String,
    pub fault_hours: f64,
    pub evidence: Value,
}

fn field(s: &Sample, name: &str) -> Option<f64> {
    s.values.get(name).copied()
}

/// Confirm-window evaluator: only count a fault after N consecutive samples.
fn fault_hours<F>(series: &[Sample], mut raw_fault: F, confirm_rows: u32, poll_seconds: u64) -> f64
where
    F: FnMut(&Sample) -> bool,
{
    let mut streak = 0u32;
    let mut hours = 0.0;
    for s in series {
        streak = if raw_fault(s) { streak + 1 } else { 0 };
        if streak >= confirm_rows {
            hours += poll_seconds as f64 / 3600.0;
            streak = 0;
        }
    }
    hours
}

/// Detect a frozen/stuck value: no change beyond `deadband` across a sliding
/// window of `window_rows` consecutive samples. Counts each qualifying window.
fn stuck_hours(
    series: &[Sample],
    field_name: &str,
    deadband: f64,
    window_rows: usize,
    poll_seconds: u64,
) -> f64 {
    let mut vals: VecDeque<f64> = VecDeque::new();
    let mut hours = 0.0;
    for s in series {
        if let Some(v) = field(s, field_name) {
            vals.push_back(v);
            if vals.len() > window_rows {
                vals.pop_front();
            }
            if vals.len() == window_rows {
                let min = vals.iter().cloned().fold(f64::MAX, f64::min);
                let max = vals.iter().cloned().fold(f64::MIN, f64::max);
                if max - min <= deadband {
                    hours += poll_seconds as f64 / 3600.0;
                    vals.clear();
                }
            }
        }
    }
    hours
}

/// Evaluate a rule against the loaded series.
pub fn eval_rule(rule: &Rule, series: &[Sample]) -> Finding {
    let params = &rule.params;
    let confirm = params
        .get("confirm_rows")
        .and_then(|v| v.as_u64())
        .unwrap_or(4) as u32;
    let poll = params
        .get("poll_seconds")
        .and_then(|v| v.as_u64())
        .unwrap_or(300);

    let (hours, evidence) = match rule.rule_kind.as_str() {
        "ThresholdAbove" => {
            let f = params.get("field").and_then(|v| v.as_str()).unwrap_or("");
            let limit = params.get("limit").and_then(|v| v.as_f64()).unwrap_or(0.0);
            (
                fault_hours(series, |s| field(s, f).map_or(false, |v| v > limit), confirm, poll),
                json!({ "field": f, "limit": limit }),
            )
        }
        "ThresholdBelow" => {
            let f = params.get("field").and_then(|v| v.as_str()).unwrap_or("");
            let limit = params.get("limit").and_then(|v| v.as_f64()).unwrap_or(0.0);
            (
                fault_hours(series, |s| field(s, f).map_or(false, |v| v < limit), confirm, poll),
                json!({ "field": f, "limit": limit }),
            )
        }
        "FanMismatch" => {
            let hours = fault_hours(
                series,
                |s| match (field(s, "fan_cmd"), field(s, "fan_status")) {
                    (Some(c), Some(st)) => {
                        let fan = if c > 1.0 { c / 100.0 } else { c };
                        (fan >= 0.05) != (st > 0.5)
                    }
                    _ => false,
                },
                confirm,
                poll,
            );
            (hours, json!({}))
        }
        "EconomizerOaFraction" => {
            let pct = params
                .get("oa_min_pct")
                .and_then(|v| v.as_f64())
                .unwrap_or(15.0);
            let hours = fault_hours(
                series,
                |s| {
                    let fan = field(s, "fan_cmd").unwrap_or(0.0);
                    match (field(s, "mat"), field(s, "rat"), field(s, "oa_t")) {
                        (Some(m), Some(r), Some(o)) => {
                            let f = if fan > 1.0 { fan / 100.0 } else { fan };
                            let denom = o - r;
                            f > 0.01
                                && (r - o).abs() > 2.2
                                && denom.abs() > 1e-9
                                && ((m - r) / denom) * 100.0 < pct
                        }
                        _ => false,
                    }
                },
                confirm,
                poll,
            );
            (hours, json!({ "oa_min_pct": pct }))
        }
        "EconomizerStuckClosed" => {
            let hours = fault_hours(
                series,
                |s| {
                    let fan = field(s, "fan_cmd").unwrap_or(0.0);
                    let f = if fan > 1.0 { fan / 100.0 } else { fan };
                    match (field(s, "damper_pct"), field(s, "oa_t"), field(s, "mat")) {
                        // Fan running, OA damper ~closed, and it's cool outside (should economize).
                        (Some(d), Some(o), Some(m)) => f > 0.01 && d < 5.0 && o < m,
                        _ => false,
                    }
                },
                confirm,
                poll,
            );
            (hours, json!({}))
        }
        "RangeBand" => {
            let f = params.get("field").and_then(|v| v.as_str()).unwrap_or("");
            let lo = params.get("lo").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let hi = params.get("hi").and_then(|v| v.as_f64()).unwrap_or(100.0);
            (
                fault_hours(series, |s| field(s, f).map_or(false, |v| v < lo || v > hi), confirm, poll),
                json!({ "field": f, "lo": lo, "hi": hi }),
            )
        }
        "SupplyTempDeviation" => {
            let max_dev = params.get("max_dev").and_then(|v| v.as_f64()).unwrap_or(5.0);
            let hours = fault_hours(
                series,
                |s| match (field(s, "sat"), field(s, "sat_sp")) {
                    (Some(sat), Some(sp)) => (sat - sp).abs() > max_dev,
                    _ => false,
                },
                confirm,
                poll,
            );
            (hours, json!({ "max_dev": max_dev }))
        }
        "ChwLowDeltaT" => {
            let min_dt = params.get("min_dt").and_then(|v| v.as_f64()).unwrap_or(5.0);
            let hours = fault_hours(
                series,
                |s| match (field(s, "chw_r"), field(s, "chw_s")) {
                    (Some(r), Some(sp)) => (r - sp) < min_dt,
                    _ => false,
                },
                confirm,
                poll,
            );
            (hours, json!({ "min_dt": min_dt }))
        }
        "StuckValue" => {
            let f = params.get("field").and_then(|v| v.as_str()).unwrap_or("");
            let deadband = params.get("deadband").and_then(|v| v.as_f64()).unwrap_or(0.1);
            let window = params.get("window_rows").and_then(|v| v.as_u64()).unwrap_or(12) as usize;
            (
                stuck_hours(series, f, deadband, window, poll),
                json!({ "field": f, "deadband": deadband, "window_rows": window }),
            )
        }
        // Unknown / not-yet-implemented rule kinds are skipped.
        _ => (0.0, json!({})),
    };

    Finding {
        severity: rule.severity.clone(),
        fault_hours: hours,
        evidence,
    }
}

/// Human-readable suggestion per rule (shown to the AI chat / user).
pub fn suggestion(rule_id: &str) -> &'static str {
    match rule_id {
        "ECON-1" => "Check the outdoor-air damper actuator and linkage.",
        "ECON-3" | "ECON-7" => "Verify the economizer control sequence and OA damper operation.",
        "ECON-4" => "Check the outdoor-air damper actuator and economizer control logic.",
        "ECON-6" => "Check the mixed-air sensor and preheat / frost protection.",
        "CMD-1" => "Check the fan contactor, starter feedback, and control wiring.",
        "FAN-RUNTIME" => "Metric only — no action required.",
        "SAT-HIGH" => "Check the supply-air temperature sensor, cooling coil valve, and setpoint.",
        "SAT-LOW" => "Check the supply-air temperature sensor, heating coil valve, and setpoint.",
        "SAT-DEV" => "Check supply-air setpoint tracking and cooling/heating valve control.",
        "SAT-STUCK" => "Check the supply-air temperature sensor for drift or failure.",
        "VAV-1" => "Check the VAV box, zone temperature sensor, and reheat valve.",
        "ZONE-STUCK" => "Check the zone temperature sensor for drift or failure.",
        "CHW-1" => "Check the chilled-water coil and pump/valve operation for low delta-T.",
        "CHW-2" => "Check the chilled-water supply pressure and pump operation.",
        "CHW-3" => "Check the chiller supply temperature setpoint and sensor calibration.",
        _ => "Inspect the related point and equipment.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn sample(ts: &str, pairs: &[(&str, f64)]) -> Sample {
        let mut values = HashMap::new();
        for (k, v) in pairs {
            values.insert(k.to_string(), *v);
        }
        Sample {
            ts: ts.to_string(),
            values,
        }
    }

    fn rule(kind: &str, params: Value, required: &[&str]) -> Rule {
        Rule {
            rule_id: "T".into(),
            rule_name: "test".into(),
            category: "test".into(),
            description: None,
            rule_kind: kind.into(),
            required_roles: required.iter().map(|s| s.to_string()).collect(),
            params,
            severity: "warning".into(),
            enabled: true,
        }
    }

    #[test]
    fn confirm_streak_requires_consecutive_samples() {
        // 4 samples, only 3 consecutive faults → 0 hours (confirm_rows = 4).
        let series = vec![
            sample("00:00", &[("sat", 101.0)]),
            sample("00:01", &[("sat", 102.0)]),
            sample("00:02", &[("sat", 103.0)]),
            sample("00:03", &[("sat", 99.0)]), // healthy break
        ];
        let r = rule(
            "ThresholdAbove",
            json!({"field":"sat","limit":100,"confirm_rows":4,"poll_seconds":300}),
            &["sat"],
        );
        let f = eval_rule(&r, &series);
        assert_eq!(f.fault_hours, 0.0);
    }

    #[test]
    fn confirm_streak_counts_fault_hours() {
        // 5 consecutive faults with poll 300s → 300/3600 hours.
        let series = vec![
            sample("00:00", &[("sat", 101.0)]),
            sample("00:01", &[("sat", 102.0)]),
            sample("00:02", &[("sat", 103.0)]),
            sample("00:03", &[("sat", 104.0)]),
            sample("00:04", &[("sat", 105.0)]),
        ];
        let r = rule(
            "ThresholdAbove",
            json!({"field":"sat","limit":100,"confirm_rows":4,"poll_seconds":300}),
            &["sat"],
        );
        let f = eval_rule(&r, &series);
        assert!((f.fault_hours - (300.0 / 3600.0)).abs() < 1e-9, "got {}", f.fault_hours);
    }

    #[test]
    fn fan_mismatch_detects_cmd_vs_status() {
        // Fan commanded on (80 → 0.8) but status off (0) → fault.
        let series = vec![
            sample("00:00", &[("fan_cmd", 80.0), ("fan_status", 0.0)]),
            sample("00:01", &[("fan_cmd", 80.0), ("fan_status", 0.0)]),
            sample("00:02", &[("fan_cmd", 80.0), ("fan_status", 0.0)]),
            sample("00:03", &[("fan_cmd", 80.0), ("fan_status", 0.0)]),
        ];
        let r = rule(
            "FanMismatch",
            json!({"confirm_rows":4,"poll_seconds":300}),
            &["fan_cmd", "fan_status"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }

    #[test]
    fn econ4_healthy_when_oa_fraction_high() {
        // mat pulled toward cool oa_t → high OA fraction → no fault.
        let series = vec![
            sample("00:00", &[("mat", 60.0), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
            sample("00:01", &[("mat", 61.0), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
            sample("00:02", &[("mat", 60.0), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
            sample("00:03", &[("mat", 61.0), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
        ];
        // frac = (60-74)/(55-74) = 73.7% > 15% → healthy
        let r = rule(
            "EconomizerOaFraction",
            json!({"oa_min_pct":15,"confirm_rows":4,"poll_seconds":300}),
            &["mat", "rat", "oa_t", "fan_cmd"],
        );
        let f = eval_rule(&r, &series);
        assert_eq!(f.fault_hours, 0.0);
    }

    #[test]
    fn econ4_fault_when_oa_fraction_low() {
        // mat ≈ rat (little OA mixing) → fraction near 0 → fault.
        let series = vec![
            sample("00:00", &[("mat", 73.5), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
            sample("00:01", &[("mat", 73.5), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
            sample("00:02", &[("mat", 73.5), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
            sample("00:03", &[("mat", 73.5), ("rat", 74.0), ("oa_t", 55.0), ("fan_cmd", 80.0)]),
        ];
        let r = rule(
            "EconomizerOaFraction",
            json!({"oa_min_pct":15,"confirm_rows":4,"poll_seconds":300}),
            &["mat", "rat", "oa_t", "fan_cmd"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }

    #[test]
    fn range_band_detects_out_of_band() {
        let series = vec![
            sample("00:00", &[("zone_t", 68.0)]),
            sample("00:01", &[("zone_t", 68.0)]),
            sample("00:02", &[("zone_t", 68.0)]),
            sample("00:03", &[("zone_t", 68.0)]),
        ];
        let r = rule(
            "RangeBand",
            json!({"field":"zone_t","lo":70,"hi":75,"confirm_rows":4,"poll_seconds":300}),
            &["zone_t"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }

    #[test]
    fn range_band_healthy_inside_band() {
        let series = vec![
            sample("00:00", &[("zone_t", 72.0)]),
            sample("00:01", &[("zone_t", 72.0)]),
            sample("00:02", &[("zone_t", 72.0)]),
            sample("00:03", &[("zone_t", 72.0)]),
        ];
        let r = rule(
            "RangeBand",
            json!({"field":"zone_t","lo":70,"hi":75,"confirm_rows":4,"poll_seconds":300}),
            &["zone_t"],
        );
        let f = eval_rule(&r, &series);
        assert_eq!(f.fault_hours, 0.0);
    }

    #[test]
    fn stuck_value_detects_frozen_sensor() {
        // 12 identical samples → stuck window → fault.
        let mut series = Vec::new();
        for i in 0..12 {
            series.push(sample(&format!("{:02}:00", i), &[("sat", 70.0)]));
        }
        let r = rule(
            "StuckValue",
            json!({"field":"sat","deadband":0.1,"window_rows":12,"poll_seconds":300}),
            &["sat"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }

    #[test]
    fn stuck_value_ok_when_varying() {
        let mut series = Vec::new();
        for i in 0..12 {
            series.push(sample(&format!("{:02}:00", i), &[("sat", 70.0 + i as f64)]));
        }
        let r = rule(
            "StuckValue",
            json!({"field":"sat","deadband":0.1,"window_rows":12,"poll_seconds":300}),
            &["sat"],
        );
        let f = eval_rule(&r, &series);
        assert_eq!(f.fault_hours, 0.0);
    }

    #[test]
    fn chw_low_delta_t_detects_bypass() {
        let series = vec![
            sample("00:00", &[("chw_s", 44.0), ("chw_r", 46.0)]),
            sample("00:01", &[("chw_s", 44.0), ("chw_r", 46.0)]),
            sample("00:02", &[("chw_s", 44.0), ("chw_r", 46.0)]),
            sample("00:03", &[("chw_s", 44.0), ("chw_r", 46.0)]),
        ];
        let r = rule(
            "ChwLowDeltaT",
            json!({"min_dt":5,"confirm_rows":4,"poll_seconds":300}),
            &["chw_s", "chw_r"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }

    #[test]
    fn supply_temp_deviation_detects_drift() {
        let series = vec![
            sample("00:00", &[("sat", 78.0), ("sat_sp", 72.0)]),
            sample("00:01", &[("sat", 78.0), ("sat_sp", 72.0)]),
            sample("00:02", &[("sat", 78.0), ("sat_sp", 72.0)]),
            sample("00:03", &[("sat", 78.0), ("sat_sp", 72.0)]),
        ];
        let r = rule(
            "SupplyTempDeviation",
            json!({"max_dev":5,"confirm_rows":4,"poll_seconds":300}),
            &["sat", "sat_sp"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }

    #[test]
    fn econ1_stuck_closed_when_fan_running() {
        let series = vec![
            sample("00:00", &[("damper_pct", 0.0), ("oa_t", 55.0), ("mat", 74.0), ("fan_cmd", 80.0)]),
            sample("00:01", &[("damper_pct", 0.0), ("oa_t", 55.0), ("mat", 74.0), ("fan_cmd", 80.0)]),
            sample("00:02", &[("damper_pct", 0.0), ("oa_t", 55.0), ("mat", 74.0), ("fan_cmd", 80.0)]),
            sample("00:03", &[("damper_pct", 0.0), ("oa_t", 55.0), ("mat", 74.0), ("fan_cmd", 80.0)]),
        ];
        let r = rule(
            "EconomizerStuckClosed",
            json!({"confirm_rows":4,"poll_seconds":300}),
            &["oa_t", "mat", "fan_cmd", "damper_pct"],
        );
        let f = eval_rule(&r, &series);
        assert!(f.fault_hours > 0.0, "expected fault, got {}", f.fault_hours);
    }
}
