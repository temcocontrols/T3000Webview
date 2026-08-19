# FDD — Native Fault Detection & Diagnostics for T3000

> **Design doc — native Rust FDD engine, DB-managed rules (no SQL engine, nothing embedded).**
> Status: Design / Proposed · Phase 1 POC planned.

---

## 1. Overview & goal

Add a **Fault Detection & Diagnostics (FDD)** capability to T3000 so the platform can
proactively detect common HVAC equipment faults from historical trend data, and let the
AI chat explain them.

The design deliberately follows open‑fdd's **concepts** (rules as tunable data, semantic
roles, confirm windows) but re‑implemented **natively in T3000's Rust stack**:

- ✅ rules stored as **DB rows** (managed like the existing auto‑tagging rules)
- ✅ one reusable **Rust evaluator** (no SQL engine, no DataFusion)
- ✅ nothing compiled into the binary (rules are data)
- ✅ reuses what T3000 already has: Haystack/Brick tags, trendlog history, MCP server, AI chat

### What we get

| Benefit | How |
|---|---|
| Deterministic, repeatable detection | rules run the same logic every time |
| Tunable per site | params in `FDD_RULES` (no rebuild) |
| Rules as data | create/edit/toggle via MCP tools or UI |
| Explainable | findings carry evidence + rule metadata |
| AI synergy | `t3000_fdd_*` tools plug into the existing AI chat tool loop |

---

## 2. Design decisions

| Decision | Choice | Why |
|---|---|---|
| Engine | **Native Rust evaluator** | no SQL-in-DB, no DataFusion, typed, testable |
| Rule storage | **DB table `FDD_RULES`** | managed at runtime like `HAYSTACK_AUTO_TAGGING_RULES`; nothing embedded |
| Role source | **Haystack/Brick tags** | already in T3000 (`HAYSTACK_POINT_TAGS`, `HAYSTACK_POINT_BRICK_CLASS`) |
| Time-series | **TRENDLOG_DATA_DETAIL** | existing history; pivot to wide samples on demand |
| Discovery | **not built in Phase 1** | start with explicit analyze + rules; scheduling is a later phase |
| Findings | computed on demand first; optional `FDD_FINDINGS` table later | keep Phase 1 minimal |

---

## 3. Architecture

```
┌────────────────────────────── T3000 API (Rust, one process) ──────────────────────────────┐
│                                                                                           │
│   Existing:  Haystack/Brick tags · Trendlog history · MCP dispatch (dispatch.rs)           │
│              · AI chat tool loop · MCP page / labels                                       │
│                                                                                           │
│   NEW:  api/src/fdd module                                                                │
│    ┌───────────┐   ┌────────────┐   ┌────────────────┐   ┌────────────┐                   │
│    │ roles.rs  │──▶│ series.rs  │──▶│ evaluator.rs   │──▶│ findings.rs│                   │
│    │ tags→roles│   │ trendlogs→ │   │ rule_kind arms │   │ Fault{...} │                   │
│    │           │   │ Vec<Sample>│   │ + confirm-     │   │            │                   │
│    │           │   │            │   │   streak       │   │            │                   │
│    └───────────┘   └────────────┘   └────────────────┘   └────────────┘                   │
│         ▲                 ▲                 ▲                                             │
│   HAYSTACK_          TRENDLOG_         FDD_RULES (DB rows: rule_kind + params)            │
│   POINT_TAGS         DATA_DETAIL                                                          │
│                                                                                           │
│   MCP tools (new): t3000_fdd_rules_list · rule_create · rule_update · rule_toggle ·       │
│                    t3000_fdd_analyze · t3000_fdd_faults                                   │
│                    → tools.rs / dispatch.rs → AI chat                                     │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data model — `FDD_RULES` table

```sql
CREATE TABLE IF NOT EXISTS FDD_RULES (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id        TEXT NOT NULL UNIQUE,   -- 'ECON-4'
  rule_name      TEXT NOT NULL,
  category       TEXT,                   -- 'economizer' | 'sensor' | 'vav' | 'chw' | 'zone' | 'fan'
  description    TEXT,
  rule_kind      TEXT NOT NULL,          -- which Rust evaluator runs
  required_roles TEXT,                   -- JSON array of semantic roles
  params_json    TEXT,                   -- JSON of tunable params
  severity       TEXT DEFAULT 'warning', -- info | warning | critical
  enabled        BOOLEAN DEFAULT 1,
  created_at     TEXT,
  updated_at     TEXT
);
```

> This is the **only** new table for rules. Findings persistence (`FDD_FINDINGS`) is optional
> and deferred. Time-series and tags reuse existing tables.

### Seed

Rules are inserted once by `seed_fdd_rules.sql` (run with the schema migration). After that
the DB is authoritative — rules can be edited/toggled/deleted at runtime with no rebuild.

```sql
INSERT INTO FDD_RULES (rule_id, rule_name, category, description, rule_kind, required_roles, params_json, severity, enabled)
VALUES
('ECON-4','Low outdoor-air fraction','economizer',
 'Economizer not bringing in enough OA when free-cooling is available',
 'EconomizerOaFraction',
 '["mat","rat","oa_t","fan_cmd"]',
 '{"oa_min_pct":15,"confirm_rows":4,"poll_seconds":300}',
 'warning', 1);
```

---

## 5. The Rust engine

### 5.1 Sample & roles

```rust
/// One row of the "wide" history built from TRENDLOG_DATA_DETAIL for a device/equipment.
pub struct Sample {
    pub ts: i64,          // unix seconds
    pub mat: f64,         // mixed air temp
    pub rat: f64,         // return air temp
    pub oa_t: f64,        // outdoor air temp
    pub sat: f64,         // supply air temp
    pub zone_t: f64,      // zone temp
    pub fan_cmd: f64,     // fan command (0..1 or 0..100)
    pub fan_status: f64,  // fan status (0..1)
    pub damper_pct: f64,  // OA damper position (0..100)
    pub chw_s: f64,       // chilled water supply temp
    pub chw_r: f64,       // chilled water return temp
    // ... extend as needed
}
```

`roles.rs` maps each point's **Haystack tags / Brick class** to a role on `Sample`:

```
OA_T        → oa_t       MAT        → mat        SupplyTemp → sat
RAT         → rat        ZONE_T     → zone_t     FAN_CMD    → fan_cmd
FAN_STATUS  → fan_status OA_DAMPER  → damper_pct CHW_S      → chw_s
```

### 5.2 The reusable evaluator (the heart)

Every rule = **a per-sample condition + a confirm streak + a sample interval** → fault hours.

```rust
/// Generic confirm-window evaluator: count fault only after N consecutive samples.
fn fault_hours<F>(series: &[Sample], mut raw_fault: F, confirm_rows: u32, poll_seconds: u64) -> f64
where F: FnMut(&Sample) -> bool
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

/// Dispatch a FDD_RULES row to the right condition. Returns fault hours + evidence.
pub fn eval_rule(kind: &str, params: &serde_json::Value, series: &[Sample]) -> Finding {
    let confirm = params["confirm_rows"].as_u64().unwrap_or(4) as u32;
    let poll = params["poll_seconds"].as_u64().unwrap_or(300);
    match kind {
        "ThresholdAbove" => {
            let field = params["field"].as_str().unwrap_or("");
            let limit = params["limit"].as_f64().unwrap_or(0.0);
            let hours = fault_hours(series, |s| sample_field(s, field) > limit, confirm, poll);
            Finding { fault_hours: hours, evidence: json!({"field": field, "limit": limit}) }
        }
        "ThresholdBelow" => { /* same, reversed */ }
        "RangeBand"      => { /* outside [lo,hi] */ }
        "StuckValue"     => { /* no change over window (frozen sensor) */ }
        "FanMismatch"    => {
            let hours = fault_hours(series, |s| {
                let fan = if s.fan_cmd > 1.0 { s.fan_cmd / 100.0 } else { s.fan_cmd };
                (fan >= 0.05) != (s.fan_status > 0.5)
            }, confirm, poll);
            Finding { fault_hours: hours, evidence: json!({}) }
        }
        "EconomizerOaFraction" => {
            let pct = params["oa_min_pct"].as_f64().unwrap_or(15.0);
            let hours = fault_hours(series, |s| {
                let fan = if s.fan_cmd > 1.0 { s.fan_cmd / 100.0 } else { s.fan_cmd };
                fan > 0.01
                    && (s.rat - s.oa_t).abs() > 2.2
                    && ((s.mat - s.rat) / (s.oa_t - s.rat).max(1e-9)) * 100.0 < pct
            }, confirm, poll);
            Finding { fault_hours: hours, evidence: json!({"oa_min_pct": pct}) }
        }
        "EconomizerStuckClosed" => { /* OA damper ~0 while fan on + cool outside */ }
        "ChwLowDeltaT" => {
            let min_dt = params["min_dt"].as_f64().unwrap_or(5.0);
            let hours = fault_hours(series, |s| (s.chw_r - s.chw_s) < min_dt, confirm, poll);
            Finding { fault_hours: hours, evidence: json!({"min_dt": min_dt}) }
        }
        "SupplyTempDeviation" => { /* |sat - sat_sp| > max_dev */ }
        "PidHunting"   => { /* count oscillations of a control output */ }
        "SensorRate"   => { /* implausible rate of change */ }
        _ => Finding { fault_hours: 0.0, evidence: json!({}) },
    }
}
```

**Adding a rule** = one new `rule_kind` arm **or** reuse a generic one + insert a `FDD_RULES` row.

---

## 6. The complete rule catalog

Starter catalog (15 rules). All are DB rows seeded on first run; every rule is tunable via
`params_json` and toggleable via `enabled`.

### 6.1 Economizer

| rule_id | Name | rule_kind | Required roles | Default params | Severity |
|---|---|---|---|---|---|
| ECON-1 | OA damper stuck closed | `EconomizerStuckClosed` | `oa_t, mat, fan_cmd, damper_pct` | `confirm_rows:4, poll_seconds:300` | warning |
| ECON-3 | Mechanical cooling without economizing | `EconomizerOaFraction` | `mat, rat, oa_t, fan_cmd` | `oa_min_pct:0, confirm_rows:4` | warning |
| ECON-4 | Low OA fraction | `EconomizerOaFraction` | `mat, rat, oa_t, fan_cmd` | `oa_min_pct:15, confirm_rows:4` | warning |
| ECON-6 | Economizer freezing risk | `ThresholdBelow` | `mat` | `field:"mat", limit:2.0, confirm_rows:3` | critical |
| ECON-7 | Not economizing when it should | `EconomizerOaFraction` | `mat, rat, oa_t, fan_cmd` | `oa_min_pct:0, confirm_rows:4` | info |

### 6.2 Fan

| rule_id | Name | rule_kind | Required roles | Default params | Severity |
|---|---|---|---|---|---|
| CMD-1 | Fan cmd/status mismatch | `FanMismatch` | `fan_cmd, fan_status` | `confirm_rows:4, poll_seconds:300` | warning |
| FAN-RUNTIME | Fan runtime hours (metric) | `ThresholdAbove` | `fan_cmd` | `field:"fan_cmd", limit:0.05` | info |

### 6.3 Supply air sensor

| rule_id | Name | rule_kind | Required roles | Default params | Severity |
|---|---|---|---|---|---|
| SAT-HIGH | Supply air temp too high | `ThresholdAbove` | `sat` | `field:"sat", limit:100, confirm_rows:4` | critical |
| SAT-LOW | Supply air temp too low | `ThresholdBelow` | `sat` | `field:"sat", limit:40, confirm_rows:4` | critical |
| SAT-DEV | Supply air temp deviates from setpoint | `SupplyTempDeviation` | `sat, sat_sp` | `max_dev:5, confirm_rows:4` | warning |
| SAT-STUCK | Supply air temp sensor frozen | `StuckValue` | `sat` | `deadband:0.1, window_rows:12` | warning |

### 6.4 Zone / VAV

| rule_id | Name | rule_kind | Required roles | Default params | Severity |
|---|---|---|---|---|---|
| VAV-1 | Zone comfort band violation | `RangeBand` | `zone_t` | `lo:70, hi:75, confirm_rows:4` | warning |
| ZONE-STUCK | Zone temp sensor frozen | `StuckValue` | `zone_t` | `deadband:0.1, window_rows:12` | warning |

### 6.5 Chilled water

| rule_id | Name | rule_kind | Required roles | Default params | Severity |
|---|---|---|---|---|---|
| CHW-1 | Low delta-T across coil | `ChwLowDeltaT` | `chw_s, chw_r` | `min_dt:5, confirm_rows:4` | warning |
| CHW-2 | CHW supply pressure low | `ThresholdBelow` | `chw_dp` | `field:"chw_dp", limit:8, confirm_rows:4` | warning |
| CHW-3 | CHW supply temp out of band | `RangeBand` | `chw_s` | `lo:40, hi:48, confirm_rows:4` | warning |

### 6.6 Control

| rule_id | Name | rule_kind | Required roles | Default params | Severity |
|---|---|---|---|---|---|
| PID-HUNT | PID hunting (oscillating output) | `PidHunting` | `pid_out` | `confirm_rows:4` | info |
| SENSOR-RATE | Implausible sensor rate of change | `SensorRate` | any temp | `max_rate:20` | info |

> The catalog is designed to grow by **inserting rows** (and, rarely, adding a `rule_kind`
> arm). It mirrors open‑fdd's cookbook categories without requiring its SQL engine.

---

## 7. Management (same as auto‑tagging)

| Action | MCP tool | DB effect | Like |
|---|---|---|---|
| List rules | `t3000_fdd_rules_list` | `SELECT * FROM FDD_RULES` | `t3000_haystack_list_rules` |
| Create custom rule | `t3000_fdd_rule_create` (confirm) | `INSERT` | `t3000_rule_create` |
| Edit rule / tune params | `t3000_fdd_rule_update` (confirm) | `UPDATE params_json` | — |
| Enable / disable | `t3000_fdd_rule_toggle` (confirm) | `UPDATE enabled` | `t3000_rule_toggle` |
| Backup / share | `t3000_fdd_rule_export` → JSON | read | — |
| Restore | `t3000_fdd_rule_import` (confirm) | upsert | — |

**Tool input example — `t3000_fdd_rule_toggle`:**
```json
{ "rule_id": "ECON-4", "enabled": false, "confirm": true }
```

**Tool input example — `t3000_fdd_analyze`:**
```json
{
  "serial_number": 123,
  "equipment": "AHU-1",
  "range_hours": 24,
  "rules": ["ECON-4", "SAT-HIGH"]
}
```

---

## 8. Findings output

```json
{
  "device": 123,
  "equipment": "AHU-1",
  "range_hours": 24,
  "findings": [
    {
      "rule_id": "ECON-4",
      "rule_name": "Low outdoor-air fraction",
      "severity": "warning",
      "fault_hours": 1.5,
      "evidence": { "oa_min_pct": 15, "samples": 288, "min_oa_frac": 3.2 },
      "suggestion": "Check OA damper actuator and economizer control."
    }
  ]
}
```

---

## 9. AI chat integration

`t3000_fdd_*` tools join `TOOLS` → `get_all_tool_defs()` automatically. A user asks:

> "Why is AHU-1 faulting?"

The AI calls `t3000_fdd_analyze {serial_number:123, equipment:"AHU-1", range_hours:24}` →
gets findings → explains in plain language + suggests fixes (optionally via `t3000_doc_read`
/ `t3000_device_diagnostics`).

Frontend additions (same pipeline as existing tools):
- `useAiChatStream.ts` tool labels (e.g. `t3000_fdd_analyze: 'Running fault detection…'`)
- `McpServerPage.tsx` tool-table rows + Examples prompts
- optional later: an FDD rules page beside the Auto-tagging menu

---

## 10. Phased plan

| Phase | Scope |
|---|---|
| **1 — POC** | `api/src/fdd/` (roles, series, evaluator, findings) + `FDD_RULES` table + seed + `t3000_fdd_analyze` + `t3000_fdd_rules_list` + 3 rules (ECON-4, SAT-HIGH, CMD-1) + unit tests |
| **2 — Catalog + tools** | full starter catalog (15 rules) + `rule_create/update/toggle/export/import` + `t3000_fdd_faults` + AI chat labels + MCP page rows/examples |
| **3 — Automation** | `FDD_FINDINGS` persistence, scheduled nightly scans, findings UI, rule tuning UI |

---

## 11. Testing

- **Unit** (no DB): build synthetic `Vec<Sample>`, run `eval_rule` per `rule_kind`, assert `fault_hours` (streak/confirm behaviour).
- **Integration** (MCP test suite, like `device_operations.rs`): tool existence + schema; DB test seeds `FDD_RULES`, runs `t3000_fdd_analyze` against a small synthetic series inserted into `TRENDLOG_DATA_DETAIL`.
- **Tool-count** test: bump the count in `tool_definitions.rs` when tools are added.

---

## 12. Risks & open questions

- **Tag coverage** — rules only fire where auto-tagging produced the required roles; add a
  `t3000_fdd_coverage` report (roles vs required_roles) in Phase 2.
- **Trendlog resolution** — low-resolution logs limit detection quality (poll_seconds must
  match the actual log interval).
- **Rule correctness** — the starter catalog is heuristic; validate thresholds against real
  site data during Phase 1.
- **`Sample` role set** — currently covers the catalog; new rules may need new sample fields
  (additive, low risk).

---

*Replaces the idea of embedding SQL rules or depending on an external FDD engine. Rules are
data; the engine is one reusable Rust evaluator; everything else is existing T3000.*
