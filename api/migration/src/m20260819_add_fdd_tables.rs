//! Add FDD_RULES + FDD_FINDINGS tables and seed the default FDD rule catalog.
//!
//! FDD (Fault Detection & Diagnostics) is a native Rust engine; rules are DB
//! rows managed at runtime. This migration creates the tables and seeds the
//! starter catalog (16 rules). Rules stay editable after seeding.

use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

/// One FDD rule seed (rule_id, name, category, desc, rule_kind, roles, params, severity).
struct RuleSeed {
    rule_id: &'static str,
    rule_name: &'static str,
    category: &'static str,
    description: &'static str,
    rule_kind: &'static str,
    required_roles: &'static str,
    params: &'static str,
    severity: &'static str,
}

fn default_rules() -> Vec<RuleSeed> {
    vec![
        RuleSeed { rule_id: "ECON-1", rule_name: "OA damper stuck closed", category: "economizer", description: "OA damper near zero while fan runs in free-cooling conditions", rule_kind: "EconomizerStuckClosed", required_roles: r#"["oa_t","mat","fan_cmd","damper_pct"]"#, params: r#"{"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "ECON-3", rule_name: "Mechanical cooling without economizing", category: "economizer", description: "Mechanical cooling when the economizer should be free-cooling", rule_kind: "EconomizerOaFraction", required_roles: r#"["mat","rat","oa_t","fan_cmd"]"#, params: r#"{"oa_min_pct":0,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "ECON-4", rule_name: "Low outdoor-air fraction", category: "economizer", description: "Economizer not bringing in enough outdoor air when free-cooling is available", rule_kind: "EconomizerOaFraction", required_roles: r#"["mat","rat","oa_t","fan_cmd"]"#, params: r#"{"oa_min_pct":15,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "ECON-6", rule_name: "Economizer freezing risk", category: "economizer", description: "Mixed-air temperature below the freezing threshold", rule_kind: "ThresholdBelow", required_roles: r#"["mat"]"#, params: r#"{"field":"mat","limit":2.0,"confirm_rows":3,"poll_seconds":300}"#, severity: "critical" },
        RuleSeed { rule_id: "ECON-7", rule_name: "Not economizing when it should", category: "economizer", description: "Conditions favor economizing but outdoor-air fraction is ~0", rule_kind: "EconomizerOaFraction", required_roles: r#"["mat","rat","oa_t","fan_cmd"]"#, params: r#"{"oa_min_pct":0,"confirm_rows":4,"poll_seconds":300}"#, severity: "info" },
        RuleSeed { rule_id: "CMD-1", rule_name: "Fan command/status mismatch", category: "fan", description: "Fan command says running but status does not, or vice-versa", rule_kind: "FanMismatch", required_roles: r#"["fan_cmd","fan_status"]"#, params: r#"{"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "FAN-RUNTIME", rule_name: "Fan runtime hours", category: "fan", description: "Accumulated fan running hours (metric, not a fault)", rule_kind: "ThresholdAbove", required_roles: r#"["fan_cmd"]"#, params: r#"{"field":"fan_cmd","limit":0.05,"confirm_rows":1,"poll_seconds":300}"#, severity: "info" },
        RuleSeed { rule_id: "SAT-HIGH", rule_name: "Supply air temperature too high", category: "sensor", description: "Supply air temperature exceeds the high limit for a sustained period", rule_kind: "ThresholdAbove", required_roles: r#"["sat"]"#, params: r#"{"field":"sat","limit":100,"confirm_rows":4,"poll_seconds":300}"#, severity: "critical" },
        RuleSeed { rule_id: "SAT-LOW", rule_name: "Supply air temperature too low", category: "sensor", description: "Supply air temperature below the low limit for a sustained period", rule_kind: "ThresholdBelow", required_roles: r#"["sat"]"#, params: r#"{"field":"sat","limit":40,"confirm_rows":4,"poll_seconds":300}"#, severity: "critical" },
        RuleSeed { rule_id: "SAT-DEV", rule_name: "Supply air temp deviation", category: "sensor", description: "Supply air temperature deviates from its setpoint", rule_kind: "SupplyTempDeviation", required_roles: r#"["sat","sat_sp"]"#, params: r#"{"max_dev":5,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "SAT-STUCK", rule_name: "Supply air temp sensor frozen", category: "sensor", description: "Supply air temperature shows no change over the window", rule_kind: "StuckValue", required_roles: r#"["sat"]"#, params: r#"{"deadband":0.1,"window_rows":12,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "VAV-1", rule_name: "Zone comfort band violation", category: "zone", description: "Zone temperature outside the comfort band for a sustained period", rule_kind: "RangeBand", required_roles: r#"["zone_t"]"#, params: r#"{"lo":70,"hi":75,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "ZONE-STUCK", rule_name: "Zone temp sensor frozen", category: "zone", description: "Zone temperature shows no change over the window", rule_kind: "StuckValue", required_roles: r#"["zone_t"]"#, params: r#"{"deadband":0.1,"window_rows":12,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "CHW-1", rule_name: "Low delta-T across coil", category: "chw", description: "Chilled-water return vs supply temperature difference too small", rule_kind: "ChwLowDeltaT", required_roles: r#"["chw_s","chw_r"]"#, params: r#"{"min_dt":5,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "CHW-2", rule_name: "CHW supply pressure low", category: "chw", description: "Chilled-water supply pressure below the limit", rule_kind: "ThresholdBelow", required_roles: r#"["chw_dp"]"#, params: r#"{"field":"chw_dp","limit":8,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
        RuleSeed { rule_id: "CHW-3", rule_name: "CHW supply temp out of band", category: "chw", description: "Chilled-water supply temperature outside the expected band", rule_kind: "RangeBand", required_roles: r#"["chw_s"]"#, params: r#"{"lo":40,"hi":48,"confirm_rows":4,"poll_seconds":300}"#, severity: "warning" },
    ]
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // FDD_RULES — the rule registry (rules as data).
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS FDD_RULES (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id        TEXT NOT NULL UNIQUE,
                rule_name      TEXT NOT NULL,
                category       TEXT,
                description    TEXT,
                rule_kind      TEXT NOT NULL,
                required_roles TEXT,
                params_json    TEXT,
                severity       TEXT DEFAULT 'warning',
                enabled        BOOLEAN DEFAULT 1,
                created_at     TEXT DEFAULT (datetime('now')),
                updated_at     TEXT DEFAULT (datetime('now'))
            )",
        )
        .await?;

        // FDD_FINDINGS — persisted fault detections.
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS FDD_FINDINGS (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                device_serial INTEGER NOT NULL,
                equipment     TEXT,
                rule_id       TEXT NOT NULL,
                rule_name     TEXT,
                severity      TEXT,
                fault_hours   REAL,
                evidence      TEXT,
                created_at    TEXT DEFAULT (datetime('now'))
            )",
        )
        .await?;
        let _ = db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_fdd_findings_device ON FDD_FINDINGS (device_serial)").await;
        let _ = db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_fdd_findings_rule ON FDD_FINDINGS (rule_id)").await;
        let _ = db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_fdd_findings_created ON FDD_FINDINGS (created_at)").await;

        // Seed the catalog (idempotent).
        for rule in default_rules() {
            let sql = format!(
                "INSERT OR IGNORE INTO FDD_RULES (rule_id, rule_name, category, description, rule_kind, required_roles, params_json, severity) \
                 VALUES ('{}','{}','{}','{}','{}','{}','{}','{}')",
                rule.rule_id,
                rule.rule_name.replace('\'', "''"),
                rule.category,
                rule.description.replace('\'', "''"),
                rule.rule_kind,
                rule.required_roles,
                rule.params,
                rule.severity,
            );
            db.execute_unprepared(&sql).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS FDD_FINDINGS")
            .await?;
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS FDD_RULES")
            .await?;
        Ok(())
    }
}
