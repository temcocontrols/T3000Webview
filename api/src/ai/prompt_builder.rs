// Prompt Builder -- classifies user intent and builds a tailored system prompt.
//
// ContextMode is selected by keyword matching on the user's message text.
// Tool-aware scoring gives bonus points when tool names appear in the text.
// Explicit user intent keywords always win over tool-based scoring.

use tracing::info;

// ---------------------------------------------------------------------------
// ContextMode Enum
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ContextMode {
    HVACExpert,
    Diagnostics,
    BACnetDebugging,
    IOEditing,
    HaystackTagging,
    ScheduleProgramming,
    GraphicsEditor,
    SettingsConfiguration,
    BuildingOverview,
}

impl ContextMode {
    /// Short label for logging
    pub fn label(&self) -> &'static str {
        match self {
            Self::HVACExpert => "HVACExpert",
            Self::Diagnostics => "Diagnostics",
            Self::BACnetDebugging => "BACnetDebugging",
            Self::IOEditing => "IOEditing",
            Self::HaystackTagging => "HaystackTagging",
            Self::ScheduleProgramming => "ScheduleProgramming",
            Self::GraphicsEditor => "GraphicsEditor",
            Self::SettingsConfiguration => "SettingsConfiguration",
            Self::BuildingOverview => "BuildingOverview",
        }
    }
}

// ---------------------------------------------------------------------------
// Keyword -> ContextMode mapping (with weights)
// ---------------------------------------------------------------------------

type KeywordMap = &'static [(&'static str, i32)];

fn persona_keywords(persona: ContextMode) -> KeywordMap {
    match persona {
        ContextMode::Diagnostics => &[
            ("diagnose", 3), ("diagnostics", 3), ("diagnostic", 3),
            ("troubleshoot", 3), ("troubleshooting", 3), ("problem", 2),
            ("error", 2), ("issue", 2), ("fault", 3), ("faulty", 3),
            ("alarm", 3), ("alarms", 3), ("alert", 2),
            ("health", 3), ("health check", 3), ("check health", 3),
            ("trendlog", 3), ("trend log", 3), ("historical", 2),
            ("history", 2), ("what's wrong", 3), ("something wrong", 3),
            ("not working", 3), ("malfunction", 3), ("broken", 2),
            ("offline", 3), ("disconnected", 3), ("missing data", 3),
            ("why is", 2), ("how to fix", 2),
        ],
        ContextMode::BACnetDebugging => &[
            ("bacnet", 3), ("BACnet", 3), ("mstp", 3), ("MSTP", 3),
            ("modbus", 3), ("ffi", 3), ("FFI", 3), ("communication", 3),
            ("network", 2), ("ip", 2), ("com port", 3), ("baudrate", 3),
            ("baud", 3), ("tcp", 2), ("dhcp", 2), ("gateway", 2),
            ("subnet", 2), ("protocol", 2),
        ],
        ContextMode::IOEditing => &[
            ("io", 3), ("IO", 3), ("input", 2), ("output", 2),
            ("label", 3), ("labels", 3), ("labeling", 3),
            ("fill io", 3), ("configure io", 3), ("setup io", 3),
            ("point name", 3), ("point names", 3), ("rename", 2),
            ("assign", 2), ("mapping", 2), ("wire", 2),
            ("ahu", 3), ("AHU", 3), ("vav", 3), ("VAV", 3),
            ("chiller", 3), ("boiler", 3), ("fan", 2),
            ("sensor", 2), ("temp", 1), ("temperature", 1),
            ("analog", 2), ("digital", 2),
        ],
        ContextMode::HaystackTagging => &[
            ("haystack", 3), ("brick", 3), ("tag", 3), ("tags", 3),
            ("tagging", 3), ("auto-tag", 3), ("auto tag", 3),
            ("semantic", 3), ("ontology", 3), ("classify", 2),
            ("rule", 2), ("rules", 2), ("regex", 2),
            ("export", 2), ("csv-flat", 3), ("brick-ttl", 3),
        ],
        ContextMode::ScheduleProgramming => &[
            ("schedule", 3), ("schedules", 3), ("holiday", 3),
            ("holidays", 3), ("program", 2), ("programs", 2),
            ("plc", 3), ("PLC", 3), ("logic", 2),
            ("pid", 3), ("PID", 3), ("loop", 2), ("loops", 2),
            ("control loop", 3), ("tuning", 3), ("setpoint", 3),
            ("proportional", 3), ("integral", 3), ("derivative", 3),
        ],
        ContextMode::GraphicsEditor => &[
            ("graphic", 3), ("graphics", 3), ("hmi", 3), ("HMI", 3),
            ("screen", 2), ("page", 1), ("pages", 1),
            ("navigate", 3), ("navigation", 3), ("go to", 2),
            ("open", 1), ("show me", 2), ("where is", 2),
            ("how do i", 2), ("how to use", 2),
        ],
        ContextMode::SettingsConfiguration => &[
            ("settings", 3), ("configure", 2), ("configuration", 2),
            ("setup", 2), ("set up", 2), ("network settings", 3),
            ("ip address", 3), ("timezone", 3), ("ntp", 3),
            ("email", 2), ("smtp", 3), ("user", 2), ("users", 2),
            ("password", 2), ("access", 2), ("permission", 2),
        ],
        ContextMode::BuildingOverview => &[
            ("building", 3), ("overview", 3), ("summary", 3),
            ("how many", 2), ("all devices", 3), ("site", 2),
            ("system", 2), ("status", 2), ("everything", 2),
            ("what do we have", 3), ("list all", 2), ("show all", 2),
            ("count", 2), ("inventory", 3),
        ],
        ContextMode::HVACExpert => &[
            ("hvac", 2), ("cooling", 2), ("heating", 2),
            ("ventilation", 2), ("humidity", 2), ("pressure", 2),
            ("flow", 2), ("energy", 2), ("efficiency", 2),
        ],
    }
}

// ---------------------------------------------------------------------------
// Tool -> ContextMode mapping (for second-pass scoring)
// ---------------------------------------------------------------------------

fn tool_persona_map(tool_name: &str) -> Option<ContextMode> {
    match tool_name {
        // Diagnostics tools
        "t3000_device_diagnostics" | "t3000_device_diagnostics_batch"
        | "t3000_alarm_list" | "t3000_alarm_acknowledge"
        | "t3000_alarm_settings_read" | "t3000_trendlog_query"
        | "t3000_trendlog_list" | "t3000_trendlog_export" => Some(ContextMode::Diagnostics),

        // BACnet / communication tools
        "t3000_device_refresh" | "t3000_device_control" => Some(ContextMode::BACnetDebugging),

        // IO / points tools
        "t3000_point_write" | "t3000_point_write_batch"
        | "t3000_point_get_metadata" | "t3000_point_batch_metadata"
        | "t3000_device_get_points" | "t3000_point_read"
        | "t3000_point_read_batch" | "t3000_metadata_search"
        | "t3000_point_search" => Some(ContextMode::IOEditing),

        // Haystack / tagging tools
        "t3000_haystack_auto_tag" | "t3000_haystack_preview_tags"
        | "t3000_haystack_list_tags" | "t3000_haystack_get_point_tags"
        | "t3000_haystack_search_points" | "t3000_haystack_get_brick_class"
        | "t3000_haystack_validate" | "t3000_haystack_export"
        | "t3000_haystack_list_rules" | "t3000_rule_toggle"
        | "t3000_rule_create" => Some(ContextMode::HaystackTagging),

        // Schedule / program tools
        "t3000_schedule_list" | "t3000_holiday_list"
        | "t3000_program_list" | "t3000_program_read"
        | "t3000_pid_list" => Some(ContextMode::ScheduleProgramming),

        // Graphics / navigation tools
        "t3000_graphics_list" | "t3000_nav_list"
        | "t3000_nav_search" | "t3000_nav_redirect"
        | "t3000_page_info" => Some(ContextMode::GraphicsEditor),

        // Settings tools
        "t3000_settings_read" | "t3000_settings_write"
        | "t3000_users_list" => Some(ContextMode::SettingsConfiguration),

        // Building overview tools
        "t3000_building_summary" | "t3000_device_list" => Some(ContextMode::BuildingOverview),

        // Fallback -- don't favor any persona for generic tools
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/// Score each persona against the user's message text.
/// Returns a sorted Vec of (ContextMode, score).
fn score_personas(user_text: &str) -> Vec<(ContextMode, i32)> {
    let lower = user_text.to_lowercase();
    let mut scores: Vec<(ContextMode, i32)> = vec![];

    // All personas except HVACExpert (which is the fallback)
    let all: &[ContextMode] = &[
        ContextMode::Diagnostics,
        ContextMode::BACnetDebugging,
        ContextMode::IOEditing,
        ContextMode::HaystackTagging,
        ContextMode::ScheduleProgramming,
        ContextMode::GraphicsEditor,
        ContextMode::SettingsConfiguration,
        ContextMode::BuildingOverview,
        ContextMode::HVACExpert,
    ];

    for &persona in all {
        let mut score = 0i32;
        for (keyword, weight) in persona_keywords(persona) {
            if lower.contains(keyword) {
                score += weight;
            }
        }
        scores.push((persona, score));
    }

    scores.sort_by(|a, b| b.1.cmp(&a.1));
    scores
}

/// Classify user text into a ContextMode.
pub fn classify_persona(user_text: &str) -> ContextMode {
    // 1. Text-based scoring
    let text_scores = score_personas(user_text);

    // 2. Tool-aware scoring: find tool names in the text and boost
    let lower = user_text.to_lowercase();
    let mut tool_boosts: std::collections::HashMap<ContextMode, i32> = std::collections::HashMap::new();

    // Scan for known tool names in the user text
    let known_tools: &[&str] = &[
        "device_diagnostics", "building_summary", "alarm_list", "trendlog_query",
        "point_write", "point_read", "point_search", "metadata_search",
        "haystack_auto_tag", "haystack_preview_tags", "haystack_export",
        "schedule_list", "holiday_list", "program_list", "pid_list",
        "graphics_list", "nav_search", "nav_redirect",
        "settings_read", "settings_write", "device_list",
        "rule_create", "rule_toggle", "device_refresh",
    ];

    for tool in known_tools {
        if lower.contains(tool) {
            if let Some(p) = tool_persona_map(&format!("t3000_{}", tool)) {
                *tool_boosts.entry(p).or_insert(0) += 2;
            }
        }
    }

    // 3. Combine: text scores + tool boosts
    // Explicit user intent keywords (weight >= 3) always win over tool boosts
    let mut combined: Vec<(ContextMode, i32)> = text_scores
        .into_iter()
        .map(|(p, text_score)| {
            let boost = tool_boosts.get(&p).copied().unwrap_or(0);
            (p, text_score + boost)
        })
        .collect();

    combined.sort_by(|a, b| b.1.cmp(&a.1));

    let winner = combined.first().map(|(p, _)| *p).unwrap_or(ContextMode::HVACExpert);

    // If the top score is 0, default to HVACExpert
    if combined.first().map(|(_, s)| *s).unwrap_or(0) == 0 {
        return ContextMode::HVACExpert;
    }

    winner
}

// ---------------------------------------------------------------------------
// ContextMode Prompt Blocks
// ---------------------------------------------------------------------------

fn persona_block(persona: ContextMode) -> &'static str {
    match persona {
        ContextMode::Diagnostics => "\n## Role: Diagnostics\n\
You are diagnosing equipment issues. Use device_diagnostics or device_diagnostics_batch for health checks, \
alarm_list for active alarms, trendlog_query for historical data. \
Correlate sensor readings, alarm patterns, and trends to identify root causes. \
Propose specific fixes with the tools available.",

        ContextMode::BACnetDebugging => "\n## Role: BACnet/Network Debugging\n\
You are debugging BACnet, Modbus, MSTP, or network communication issues. \
Check settings_read (communication/network categories), device_refresh for connectivity, \
and correlate online/offline status. Suggest baudrate, COM port, or IP configuration changes as needed.",

        ContextMode::IOEditing => "\n## Role: IO Configuration\n\
You are labeling and configuring device IO points. \
Use device_get_points to see current state, point_write_batch for bulk labeling, \
and haystack_auto_tag after labeling. \
Suggest standard HVAC point naming: 'EQUIP TYPE' (e.g., 'AHU1 Supply Air Temp'). \
Analog signals: 0-5V, 0-10V, 4-20mA. Digital: ON/OFF. Units: degF, degC, %, Amps, Volts.",

        ContextMode::HaystackTagging => "\n## Role: Haystack/Brick Semantic Tagging\n\
You are managing Haystack tags and Brick ontology classification. \
Use haystack_preview_tags to test before applying, haystack_auto_tag to apply, \
haystack_validate to check compliance. Use rule_create for custom tagging patterns. \
Export with haystack_export in haystack-json, brick-ttl, brick-jsonld, or csv-flat formats.",

        ContextMode::ScheduleProgramming => "\n## Role: Schedule & Control Programming\n\
You are working with schedules, holidays, PLC programs, and PID loops. \
Use schedule_list and holiday_list to review time-based controls, \
program_list and program_read to inspect PLC logic, \
pid_list to review control loops and tuning parameters. \
Suggest scheduling or programming changes based on equipment behavior.",

        ContextMode::GraphicsEditor => "\n## Role: Graphics & Navigation\n\
You are helping the user navigate the T3000 UI and find graphics/HMI screens. \
Use nav_search to find pages, nav_redirect to navigate, page_info for page details, \
and graphics_list to list available graphic screens. \
Guide the user to the right page -- don't describe UI steps.",

        ContextMode::SettingsConfiguration => "\n## Role: Device Settings\n\
You are configuring device settings -- network, communication, time, email, users. \
Use settings_read to review current settings, settings_write to apply changes (confirm first!), \
and users_list to manage user accounts. Always confirm before writing settings.",

        ContextMode::BuildingOverview => "\n## Role: Building Overview\n\
You are providing a high-level view of the building automation system. \
Use building_summary for a one-shot overview, device_list for device inventory, \
device_diagnostics_batch for fleet health. Summarize concisely -- counts, online/offline, active alarms.",

        ContextMode::HVACExpert => "",
    }
}

// ---------------------------------------------------------------------------
// Optimization Blocks
// ---------------------------------------------------------------------------

fn qwen_optimization_block() -> &'static str {
    "\n\n[Optimization for local Qwen model]\n\
- Think step by step, then call tools ONCE. Do not re-call the same tool.\n\
- After getting results, respond immediately. Do not call more tools to verify.\n\
- Batch: use device_get_points once with no filter to see everything at once.\n\
- You have limited iterations. Be efficient -- plan before calling."
}

fn cloud_optimization_block() -> &'static str {
    "\n\n[Optimization for cloud model]\n\
- You have more context -- feel free to be thorough.\n\
- Use multiple tool calls in parallel when independent.\n\
- Provide detailed explanations with your answers."
}

// ---------------------------------------------------------------------------
// Core System Prompt
// ---------------------------------------------------------------------------

const CORE_PROMPT: &str = r#"You are a T3000 building automation engineer. You help users monitor, configure, and maintain HVAC/building control systems. Use the tools provided to answer questions and perform tasks.

IMPORTANT: Before calling any write tool (point_write, point_write_batch, settings_write, device_control), confirm your intention with the user first. Reads are safe -- just call them and answer.

Device targeting:
- For device-specific tasks, call device_current first.
- If it returns a specific device and this is a WRITE/CONFIG task: "I see [name] (serial [N]) is selected -- shall I proceed?" Wait for yes, then call set_chat_device.
- If it returns a specific device and this is just a READ: use it directly, no confirm needed.
- If it returns a device list: "No device is selected. Which device?" then show options.
- Use device_list only for system-wide browsing, not device targeting.
Tool results: all results follow the schema {tool, ok, data} on success or {tool, ok:false, error} on failure. Process the "data" field for the actual result.

Iteration: after using tools, respond with a final answer. Do not loop endlessly.
## Tools
Core: ping, get_version, describe_tool
Read: device_list, device_get_points, point_read, point_read_batch, point_search, point_get_metadata, point_batch_metadata, metadata_search, building_summary
Write: point_write, point_write_batch (batch preferred), settings_write, device_control
Monitor: alarm_list, alarm_acknowledge, alarm_settings_read, trendlog_query, trendlog_list, trendlog_export
Config: settings_read, schedule_list, holiday_list, program_list, program_read, pid_list, graphics_list, users_list
Diagnostics: device_diagnostics, device_diagnostics_batch, device_refresh
Haystack: haystack_auto_tag, haystack_list_tags, haystack_get_point_tags, haystack_search_points, haystack_preview_tags, haystack_get_brick_class, haystack_validate, haystack_export
Rules: haystack_list_rules, rule_create, rule_toggle
Tasks: task_create, task_list, task_update, task_delete
Memory: memory_save, memory_list, memory_delete
Navigation: nav_list, nav_search, nav_redirect, page_info, device_current, set_chat_device
Docs: doc_list, doc_read"#;

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/// Append a persona-specific block to the prompt.
fn append_persona(prompt: &mut String, persona: ContextMode) {
    let block = persona_block(persona);
    if !block.is_empty() {
        prompt.push_str(block);
    }
}

/// Append optimization hints for local (Qwen) or cloud models.
fn append_optimization(prompt: &mut String, is_local: bool) {
    if is_local {
        prompt.push_str(qwen_optimization_block());
    } else {
        prompt.push_str(cloud_optimization_block());
    }
}

/// Append site memories to the prompt.
fn append_memories(prompt: &mut String, memories: &[(String, String)]) {
    if !memories.is_empty() {
        prompt.push_str("\n\n## Site Knowledge\n");
        for (key, content) in memories {
            prompt.push_str(&format!("- [{}] {}\n", key, content));
        }
    }
}

/// Build the full system prompt from user context.
pub fn build_system_prompt(user_text: &str, provider_is_local: bool, memories: &[(String, String)]) -> String {
    let persona = classify_persona(user_text);
    info!("Persona selected: {:?}", persona);

    let mut prompt = String::from(CORE_PROMPT);

    append_persona(&mut prompt, persona);
    append_optimization(&mut prompt, provider_is_local);
    append_memories(&mut prompt, memories);

    info!("System prompt length: {} chars (persona={}, local={})",
        prompt.len(), persona.label(), provider_is_local);

    prompt
}
