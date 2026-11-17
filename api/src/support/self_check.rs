//! Self-check rule table.
//!
//! A user who hits a problem should be able to answer "is this me?" before filing anything.
//! The remedies below are reviewed text — deliberately *not* generated, so the same symptom
//! always produces the same instruction, and a wrong answer is a bug we can fix in one place.
//!
//! Rules come in two flavours:
//!   * context rules — fire from what T3000 reported (no device selected, empty log, ...)
//!   * keyword rules — fire when the user's own words match a symptom
//!
//! Documentation is attached afterwards: the top local page for the rule's subject, plus up
//! to three pages for the report as a whole.

use crate::support::docs_index;
use crate::support::model::{ClientContext, Suggestion};

const MAX_SUGGESTIONS: usize = 12;

struct Rule {
    id: &'static str,
    severity: &'static str,
    title: &'static str,
    detail: &'static str,
    action: &'static str,
    keywords: &'static [&'static str],
}

const RULES: &[Rule] = &[
    Rule {
        id: "device-offline",
        severity: "critical",
        title: "The panel is not answering",
        detail: "T3000 reached the point but got no reply, which is almost always a port, \
                 address or power issue rather than a software fault.",
        action: "Open Tools → Discover, confirm the panel is powered and wired, then check the \
                 port and baud rate you are using. Retry the same action afterwards.",
        keywords: &[
            "offline", "no response", "not responding", "timeout", "timed out",
            "unreachable", "cannot connect", "can't connect", "comms", "communication",
        ],
    },
    Rule {
        id: "trendlog-not-saved",
        severity: "warning",
        title: "Trend log has no history",
        detail: "A trend log only stores samples after it has been switched on and given a \
                 sample interval; enabling it does not backfill earlier data.",
        action: "Open Trend Logs, check the log is enabled and that the interval is not 0, then \
                 wait for at least two intervals before reading the chart again.",
        keywords: &[
            "trendlog", "trend log", "trends", "logging", "not saved", "no data",
            "missing data", "history", "graph empty",
        ],
    },
    Rule {
        id: "write-rejected",
        severity: "warning",
        title: "A point will not accept a new value",
        detail: "Points written by a program, or left in Auto, reject manual changes until they \
                 are released back to the operator.",
        action: "Open the point, switch it from Auto to Hand/Manual, then write the value again. \
                 If a program drives it, stop the program first.",
        keywords: &[
            "cannot write", "can't write", "write failed", "setpoint", "not changing",
            "read only", "readonly", "hand", "auto", "override", "revert",
        ],
    },
    Rule {
        id: "com-port-busy",
        severity: "critical",
        title: "The serial port cannot be opened",
        detail: "Only one program can hold a COM port. A leftover terminal or a second copy of \
                 T3000 will block it.",
        action: "Close any terminal, Modbus or BACnet tool using the same port, close extra \
                 T3000 windows, then reselect the port in Tools → Connection.",
        keywords: &[
            "com port", "com1", "com2", "com3", "com4", "port busy", "access denied",
            "open failed", "cannot open port",
        ],
    },
    Rule {
        id: "firmware-version",
        severity: "warning",
        title: "Panel firmware and this T3000 version differ",
        detail: "Some registers and screens only exist for matching firmware. Behaviour that \
                 works on one site and not another is often this.",
        action: "Read the firmware version from the device window and compare it with the \
                 version this T3000 was built for. Attach both numbers to the report.",
        keywords: &[
            "firmware", "version mismatch", "upgrade", "update failed", "old version",
            "wrong version",
        ],
    },
    Rule {
        id: "schedule-not-running",
        severity: "warning",
        title: "A schedule is not taking effect",
        detail: "Weekly schedules are evaluated against the panel clock and are suspended on \
                 holiday dates.",
        action: "Open Schedules, confirm the row is enabled, check the panel clock, then check \
                 Holidays for a date that covers today.",
        keywords: &[
            "schedule", "weekly", "holiday", "occupancy", "not running", "did not run",
            "timer",
        ],
    },
    Rule {
        id: "graphic-missing",
        severity: "warning",
        title: "A graphic or screen is blank",
        detail: "Graphics are read from per-panel cache files. An empty cache shows an empty \
                 screen instead of an error.",
        action: "Select the panel first, then reopen the graphic so T3000 reloads that panel's \
                 cache from the device.",
        keywords: &[
            "graphic", "screen blank", "blank screen", "drawing", "doesn't show",
            "does not show", "missing image", "empty screen",
        ],
    },
    Rule {
        id: "database-sync",
        severity: "warning",
        title: "Database or sync error",
        detail: "T3000 keeps a local SQLite database and can optionally mirror it to a server \
                 database. A rejected sync leaves local data intact.",
        action: "Open Settings → Database, confirm the connection settings, then retry the sync. \
                 Local work is not lost while the server is unreachable.",
        keywords: &[
            "database", "sync", "postgres", "sql server", "server database", "duplicate",
            "record not saved",
        ],
    },
    Rule {
        id: "ai-not-configured",
        severity: "info",
        title: "AI features are not configured",
        detail: "AI actions talk to a local model endpoint; without one they are hidden or \
                 report a configuration error.",
        action: "Set T3000_OLLAMA_URL to a running local model endpoint, or ignore this if you \
                 do not use the AI pages.",
        keywords: &["ai", "chat", "ollama", "model", "assistant", "mcp"],
    },
    Rule {
        id: "installer-update",
        severity: "warning",
        title: "Install or update did not complete",
        detail: "The installer needs administrator rights and must replace files that a running \
                 T3000 holds open.",
        action: "Close T3000 completely, then run the installer again as administrator.",
        keywords: &[
            "install", "installer", "setup", "msi", "update", "upgrade failed",
            "permission", "administrator",
        ],
    },
    Rule {
        id: "license",
        severity: "critical",
        title: "Licensing problem",
        detail: "An expired or unreadable licence stops the licensed features only; the rest of \
                 T3000 keeps working.",
        action: "Open Help → About Software to read the licence ID, then include that ID in the \
                 report so support can look it up.",
        keywords: &[
            "license", "licence", "dongle", "activation", "expired", "not licensed",
        ],
    },
    Rule {
        id: "value-not-updating",
        severity: "warning",
        title: "A value is not updating",
        detail: "Most screens show the last value T3000 received. A frozen or zero value is \
                 usually a read that stopped, not a display fault — the runtime log shows whether \
                 the poll is still answering.",
        action: "Open the point in Inputs and press Refresh once. If it stays at the same value \
                 while the panel is online, note which point and say so in the description.",
        keywords: &[
            "not updating", "does not update", "stuck", "frozen", "shows 0", "shows zero",
            "wrong value", "stale", "no value", "value does not change",
        ],
    },
    Rule {
        id: "program-not-running",
        severity: "warning",
        title: "A program or PID loop is not running",
        detail: "Programs and loops only run while they are enabled and the panel is online; a \
                 disabled block keeps its last output, which looks like a control problem.",
        action: "Open Programs (or PID Loops), check the block is enabled and running, then look at \
                 its status message before changing any value.",
        keywords: &[
            "program", "pid", "loop", "not running", "stopped", "no control", "output locked",
        ],
    },
    Rule {
        id: "clock-time-wrong",
        severity: "warning",
        title: "Times or schedules are offset",
        detail: "Schedules are evaluated against the panel clock, so a wrong panel time shifts \
                 every schedule and trend on that panel by the same amount.",
        action: "Compare the panel time with the PC time in the status bar, correct it in Device \
                 Settings if it is off, then re-check the schedule.",
        keywords: &[
            "time", "clock", "timezone", "daylight", "wrong day", "schedule not working",
            "switches at", "offset",
        ],
    },
    Rule {
        id: "alarm-missing",
        severity: "warning",
        title: "An alarm did not appear or notify",
        detail: "An alarm only shows while it is enabled on the panel and the panel is online; \
                 e-mail and SMS notifications additionally need a working server or modem.",
        action: "Open Alarms, confirm the alarm is enabled and its condition is true, then check the \
                 runtime log for a send attempt at the time it should have fired.",
        keywords: &[
            "alarm", "alert", "notification", "email not sent", "sms", "no alarm",
        ],
    },
    Rule {
        id: "login-rights",
        severity: "critical",
        title: "Sign-in or user rights problem",
        detail: "Users are stored per building and per panel; an account that works on one panel \
                 does not automatically have rights on another.",
        action: "Open Users, check the account exists in this building and has the right level for \
                 the action you tried, then retry.",
        keywords: &[
            "login", "log in", "sign in", "password", "access denied", "permission denied",
            "user rights", "cannot edit",
        ],
    },
    Rule {
        id: "export-fails",
        severity: "info",
        title: "Export, print or save failed",
        detail: "Exports write a file next to the project or into the chosen folder; a read-only \
                 folder or a file open in Excel stops the write without a loud error.",
        action: "Close any spreadsheet holding the target file, export again to a folder you can \
                 write to, and mention the exact message if it still fails.",
        keywords: &[
            "export", "csv", "print", "save failed", "cannot save", "read-only", "report failed",
        ],
    },
    Rule {
        id: "slow-or-freeze",
        severity: "info",
        title: "T3000 is slow or stops responding",
        detail: "Long freezes are usually a screen polling a panel that stopped answering, so the \
                 runtime log and the status bar tell you which one before anything else.",
        action: "Note which screen was open and whether the status bar showed traffic at that \
                 moment, then attach the runtime log — that pairing is what makes this diagnosable.",
        keywords: &[
            "slow", "freeze", "freezes", "hangs", "hanging", "lag", "unresponsive", "takes forever",
        ],
    },
    Rule {
        id: "units-scaling",
        severity: "warning",
        title: "A reading or its units look wrong",
        detail: "Most points store a raw count and a range; when the range or the unit is wrong \
                 the value is plausible but wrong, which is easy to mistake for a sensor fault.",
        action: "Open the point, compare its range and units with the panel datasheet, and say in \
                 the description what you expected versus what you saw.",
        keywords: &[
            "units", "scaling", "range wrong", "reads wrong", "wrong reading", "4-20ma",
            "0-10v", "multiplier", "offset value",
        ],
    },
    Rule {
        id: "point-not-found",
        severity: "warning",
        title: "A point or object is missing",
        detail: "The list on screen is what the panel reported last; a point that exists on the \
                 panel but not here usually means the object list was not read again.",
        action: "Refresh the screen, or reopen the panel in the device tree so its objects are \
                 read again, then search for the point name.",
        keywords: &[
            "point missing", "missing point", "object not found", "no inputs", "not listed",
            "cannot find the point", "input missing", "output missing",
        ],
    },
    Rule {
        id: "network-discovery",
        severity: "warning",
        title: "Discovery does not find the panels",
        detail: "Discovery only reaches panels that answer on the same IP range and port, so a \
                 firewall, a different subnet or a wrong udp port hides them completely.",
        action: "Confirm the PC and the panels are on the same subnet, then try one panel by \
                 address instead of scanning. Mention the subnet and port you used.",
        keywords: &[
            "discover", "discovery", "no devices found", "cannot find devices", "scan finds nothing",
            "who-is", "same network",
        ],
    },
    Rule {
        id: "program-upload",
        severity: "warning",
        title: "A program will not download to the panel",
        detail: "A download needs the panel online, enough free space and a program that compiles; \
                 any of the three stops it with a message that is easy to miss.",
        action: "Compile the program first and read the message it returns, then retry the download \
                 with the runtime log open and note which step failed.",
        keywords: &[
            "download to panel", "upload program", "compile error", "will not download",
            "program does not download", "write to panel failed",
        ],
    },
    Rule {
        id: "backup-restore",
        severity: "warning",
        title: "Backup or restore did not work",
        detail: "Backups write a database file to a folder you choose; a read-only folder, a \
                 missing SQLite service or a file already open stops the copy.",
        action: "Pick a folder you can write to, close anything holding the file, and try again. \
                 Include the exact message if it fails twice.",
        keywords: &[
            "backup", "restore", "database corrupt", "database file", "sqlite",
        ],
    },
];

fn doc_url(id: &str) -> String {
    format!("#/t3000/documentation?doc={}", id)
}

fn make(
    rule_id: &str,
    severity: &str,
    title: &str,
    detail: &str,
    action: &str,
    doc: Option<docs_index::DocMatch>,
) -> Suggestion {
    Suggestion {
        rule_id: rule_id.to_string(),
        severity: severity.to_string(),
        title: title.to_string(),
        detail: detail.to_string(),
        action: action.to_string(),
        doc_url: doc.as_ref().map(|d| doc_url(&d.id)),
        doc_id: doc.as_ref().map(|d| d.id.clone()),
        doc_title: doc.map(|d| d.title),
    }
}

/// Evaluate the context and the user's words against the rule table.
///
/// Returns the suggestions plus the number of documentation pages that were searched, so the
/// page can say "checked N pages" instead of implying it read the internet.
pub fn evaluate(ctx: &ClientContext) -> (Vec<Suggestion>, usize) {
    /*
     * Symptom words come from what the user wrote and the screen they were on — never from the
     * runtime log. Log lines are full of ordinary words ("time", "alarm", "program"), so matching
     * against them made every report look like it matched half the table.
     */
    let haystack = format!(
        "{} {}",
        ctx.message.to_lowercase(),
        ctx.area.to_lowercase()
    );

    let mut out: Vec<Suggestion> = Vec::new();

    if ctx.device_serial.unwrap_or(0) <= 0 {
        let doc = docs_index::search("select device", 1).into_iter().next();
        out.push(make(
            "no-device-selected",
            "info",
            "No device is selected",
            "Most screens read live data from the selected panel, so they stay empty until one \
             is chosen.",
            "Select the panel in the device tree on the left, then reopen the screen you were on.",
            doc,
        ));
    }

    if matches!(ctx.device_count, Some(0)) {
        let doc = docs_index::search("discover devices", 1).into_iter().next();
        out.push(make(
            "empty-building",
            "warning",
            "This building has no devices",
            "T3000 is connected, but nothing has been discovered in the current building yet.",
            "Open Tools → Discover and scan the port or network range your panels are on.",
            doc,
        ));
    }

    if ctx.exe_version.trim().is_empty() {
        out.push(make(
            "not-in-t3000",
            "info",
            "The report is not running inside T3000",
            "Without the desktop host the page cannot read the version, the runtime log or the \
             screen. The report will say so.",
            "Continue in this browser if you want, or open Help → Report an Issue inside T3000 \
             to attach that information automatically.",
            None,
        ));
    }

    if ctx.log_text.trim().is_empty() {
        let doc = docs_index::search("runtime log", 1).into_iter().next();
        out.push(make(
            "no-runtime-log",
            "info",
            "No recent runtime messages",
            "T3000 has not reported anything in this session, so the log would not help whoever \
             reads the report.",
            "Reproduce the problem once with the window open, then capture again — the last 200 \
             status messages will come with the report.",
            doc,
        ));
    }

    for rule in RULES {
        if out.len() >= MAX_SUGGESTIONS {
            break;
        }
        let hit = rule
            .keywords
            .iter()
            .any(|kw| !kw.is_empty() && haystack.contains(kw));
        if !hit {
            continue;
        }
        let doc = docs_index::search(rule.title, 1).into_iter().next();
        out.push(make(
            rule.id,
            rule.severity,
            rule.title,
            rule.detail,
            rule.action,
            doc,
        ));
    }

    /*
     * Steps that apply to almost every report, so a session with no device and no log still gets
     * something actionable instead of three "nothing to see" notes. They come after the specific
     * rules on purpose: the more a tip knows about this report, the earlier it appears.
     */
    if out.len() < MAX_SUGGESTIONS {
        out.push(make(
            "restart-first",
            "info",
            "Restart T3000 and try once more",
            "A restart clears cached screen data and any half-applied change, which removes a \
             whole class of one-off faults before anyone has to investigate them.",
            "Close T3000 completely, reopen it and repeat the same steps. If the fault survives a \
             restart, say so in the description — that is what makes it worth filing.",
            None,
        ));
    }

    if ctx.device_serial.unwrap_or(0) > 0 && out.len() < MAX_SUGGESTIONS {
        out.push(make(
            "another-panel",
            "info",
            "Try the same action on a second panel",
            "One panel misbehaving points at that panel or its wiring; every panel misbehaving \
             points at T3000 or the network in between.",
            "Repeat the action on another panel of the same model and mention what happened on \
             each. That one sentence is often what decides where the fault is.",
            None,
        ));
    }

    if !ctx.log_text.trim().is_empty() && out.len() < MAX_SUGGESTIONS {
        out.push(make(
            "note-the-time",
            "info",
            "Note the time you saw it",
            "The runtime log travels with this report and every line carries a timestamp, so a \
             time makes the relevant lines easy to find.",
            "Add roughly when it happened to your description — for example \"around 14:05\".",
            None,
        ));
    }

    if out.len() < MAX_SUGGESTIONS {
        let doc = docs_index::search("release notes", 1).into_iter().next();
        out.push(make(
            "latest-build",
            "info",
            "Check you are on the latest build",
            "Several faults reported against older builds are already fixed, and the About box \
             shows the exact version you are running.",
            "Compare Help → About Software with the latest release notes. The version is attached \
             to the report automatically either way.",
            doc,
        ));
    }

    // Straight documentation hits for whatever the user typed, so "how do I ..." questions
    // end here instead of becoming an issue.
    for m in docs_index::search(&haystack, 3) {
        if out.len() >= MAX_SUGGESTIONS {
            break;
        }
        if out.iter().any(|s| s.doc_id.as_deref() == Some(m.id.as_str())) {
            continue;
        }
        let title = format!("Documentation: {}", m.title);
        let detail = if m.excerpt.is_empty() {
            "This page covers the area you described.".to_string()
        } else {
            m.excerpt.clone()
        };
        out.push(make(
            "doc-match",
            "info",
            &title,
            &detail,
            "Read this page first — it may already answer the question.",
            Some(m),
        ));
    }

    (out, docs_index::count())
}

/// Convenience used by the MCP tool: suggestions for a bare message.
pub fn evaluate_message(message: &str, area: &str) -> (Vec<Suggestion>, usize) {
    let ctx = ClientContext {
        message: message.to_string(),
        area: area.to_string(),
        ..Default::default()
    };
    evaluate(&ctx)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(suggestions: &[Suggestion]) -> Vec<String> {
        suggestions.iter().map(|s| s.rule_id.clone()).collect()
    }

    fn filled() -> ClientContext {
        ClientContext {
            device_serial: Some(12345),
            device_count: Some(3),
            area: "Trend Logs".to_string(),
            message: String::new(),
            exe_version: "2026.11".to_string(),
            windows_version: "Windows 11".to_string(),
            building: "HQ".to_string(),
            panel: 1,
            log_text: "status: connected".to_string(),
        }
    }

    #[test]
    fn a_known_symptom_matches_its_rule() {
        let ctx = ClientContext {
            message: "the trend log is not saved after I enabled it".to_string(),
            ..filled()
        };
        let (suggestions, _) = evaluate(&ctx);
        assert!(
            ids(&suggestions).contains(&"trendlog-not-saved".to_string()),
            "expected the trendlog rule, got {:?}",
            ids(&suggestions)
        );
    }

    #[test]
    fn a_complete_context_does_not_invent_problems() {
        // Nothing wrong was described, so no rule may fire on the context alone.
        let (suggestions, _) = evaluate(&filled());
        let context_rules = [
            "no-device-selected",
            "empty-building",
            "not-in-t3000",
            "no-runtime-log",
        ];
        let fired: Vec<&String> = suggestions
            .iter()
            .map(|s| &s.rule_id)
            .filter(|id| context_rules.contains(&id.as_str()))
            .collect();
        assert!(fired.is_empty(), "context rules fired unexpectedly: {:?}", fired);
    }

    #[test]
    fn generic_tips_are_present_for_a_complete_context() {
        // A report with a device and a log still gets the tips that apply to almost every fault.
        let (suggestions, _) = evaluate(&filled());
        let ids = ids(&suggestions);
        for expected in [
            "restart-first",
            "another-panel",
            "note-the-time",
            "latest-build",
        ] {
            assert!(ids.contains(&expected.to_string()), "missing {}", expected);
        }
    }

    #[test]
    fn a_missing_host_is_reported_once() {
        let ctx = ClientContext {
            message: "something is wrong".to_string(),
            ..Default::default()
        };
        let (suggestions, searched) = evaluate(&ctx);
        let ids = ids(&suggestions);
        for expected in ["no-device-selected", "not-in-t3000", "no-runtime-log"] {
            assert!(ids.contains(&expected.to_string()), "missing {}", expected);
        }
        assert_eq!(searched, crate::support::docs_index::count());
    }

    #[test]
    fn suggestions_are_unique_and_bounded() {
        let ctx = ClientContext {
            message: "offline, no response, trend log not saved, cannot write, com port busy, \
                      firmware upgrade failed, schedule not running, blank graphic, database sync \
                      failed, ollama model missing, msi setup permission denied, licence expired"
                .to_string(),
            ..Default::default()
        };
        let (suggestions, _) = evaluate(&ctx);
        assert!(suggestions.len() <= MAX_SUGGESTIONS, "got {}", suggestions.len());
        let mut seen = std::collections::HashSet::new();
        for s in &suggestions {
            assert!(seen.insert(s.rule_id.clone()), "duplicate rule {}", s.rule_id);
        }
    }
}
