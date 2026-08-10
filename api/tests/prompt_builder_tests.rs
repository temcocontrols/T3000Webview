// Integration tests for prompt_builder -- classification and prompt assembly.
// Tests the public API: classify_persona() and build_system_prompt().

use t3_webview_api::ai::prompt_builder::{classify_persona, build_system_prompt, ContextMode};

// ---------------------------------------------------------------------------
// Classification tests
// ---------------------------------------------------------------------------

#[test]
fn test_classify_diagnostics() {
    assert_eq!(classify_persona("diagnose why my AHU is not working"), ContextMode::Diagnostics);
    assert_eq!(classify_persona("troubleshoot alarm on device 100001"), ContextMode::Diagnostics);
    assert_eq!(classify_persona("run diagnostics on all devices"), ContextMode::Diagnostics);
    assert_eq!(classify_persona("something is wrong with the chiller"), ContextMode::Diagnostics);
}

#[test]
fn test_classify_bacnet() {
    assert_eq!(classify_persona("debug BACnet communication"), ContextMode::BACnetDebugging);
    assert_eq!(classify_persona("MSTP baudrate settings"), ContextMode::BACnetDebugging);
    assert_eq!(classify_persona("configure modbus protocol"), ContextMode::BACnetDebugging);
}

#[test]
fn test_classify_io_editing() {
    assert_eq!(classify_persona("fill IO for AHU with labels"), ContextMode::IOEditing);
    assert_eq!(classify_persona("configure the input labels on this device"), ContextMode::IOEditing);
    assert_eq!(classify_persona("label all the temperature sensors"), ContextMode::IOEditing);
}

#[test]
fn test_classify_haystack() {
    assert_eq!(classify_persona("auto-tag all devices with haystack"), ContextMode::HaystackTagging);
    assert_eq!(classify_persona("export brick-ttl for device 100001"), ContextMode::HaystackTagging);
    assert_eq!(classify_persona("create a tagging rule for supply air"), ContextMode::HaystackTagging);
}

#[test]
fn test_classify_schedule() {
    assert_eq!(classify_persona("show me the holiday schedules"), ContextMode::ScheduleProgramming);
    assert_eq!(classify_persona("tune the PID loop on this device"), ContextMode::ScheduleProgramming);
    assert_eq!(classify_persona("read the PLC program logic"), ContextMode::ScheduleProgramming);
}

#[test]
fn test_classify_graphics() {
    assert_eq!(classify_persona("graphics list for this device"), ContextMode::GraphicsEditor);
    assert_eq!(classify_persona("navigate to the alarms page"), ContextMode::GraphicsEditor);
    assert_eq!(classify_persona("where is the PID setup page"), ContextMode::GraphicsEditor);
}

#[test]
fn test_classify_settings() {
    assert_eq!(classify_persona("read network settings for this device"), ContextMode::SettingsConfiguration);
    assert_eq!(classify_persona("configure SMTP email settings"), ContextMode::SettingsConfiguration);
    assert_eq!(classify_persona("list all users on device 100001"), ContextMode::SettingsConfiguration);
}

#[test]
fn test_classify_building_overview() {
    assert_eq!(classify_persona("give me a building overview"), ContextMode::BuildingOverview);
    assert_eq!(classify_persona("how many devices are online"), ContextMode::BuildingOverview);
    assert_eq!(classify_persona("system summary please"), ContextMode::BuildingOverview);
}

#[test]
fn test_classify_unknown_defaults_to_hvac() {
    assert_eq!(classify_persona("hello"), ContextMode::HVACExpert);
    assert_eq!(classify_persona("what can you do"), ContextMode::HVACExpert);
}

// ---------------------------------------------------------------------------
// Keyword scoring tests
// ---------------------------------------------------------------------------

#[test]
fn test_multiple_keywords_higher_score() {
    let result = classify_persona("diagnose this alarm error on the device");
    assert_eq!(result, ContextMode::Diagnostics);
}

#[test]
fn test_highest_score_wins() {
    let result = classify_persona("alarm on output");
    assert_eq!(result, ContextMode::Diagnostics);
}

// ---------------------------------------------------------------------------
// build_system_prompt tests
// ---------------------------------------------------------------------------

#[test]
fn test_build_prompt_contains_core() {
    let prompt = build_system_prompt("hello", true, &[]);
    assert!(prompt.contains("T3000 building automation engineer"));
    assert!(prompt.contains("## Tools"));
}

#[test]
fn test_build_prompt_contains_persona_block() {
    let prompt = build_system_prompt("diagnose the alarm", true, &[]);
    assert!(prompt.contains("## Role: Diagnostics"));
}

#[test]
fn test_build_prompt_contains_qwen_optimization() {
    let prompt = build_system_prompt("hello", true, &[]);
    assert!(prompt.contains("Optimization for local Qwen model"));
}

#[test]
fn test_build_prompt_contains_cloud_optimization() {
    let prompt = build_system_prompt("hello", false, &[]);
    assert!(prompt.contains("Optimization for cloud model"));
}

#[test]
fn test_build_prompt_contains_memories() {
    let memories = vec![
        ("naming-convention".to_string(), "Use AHU-N format".to_string()),
    ];
    let prompt = build_system_prompt("hello", true, &memories);
    assert!(prompt.contains("Site Knowledge"));
    assert!(prompt.contains("AHU-N format"));
}

#[test]
fn test_build_prompt_no_memories() {
    let prompt = build_system_prompt("hello", true, &[]);
    assert!(!prompt.contains("Site Knowledge"));
}

// ---------------------------------------------------------------------------
// Persona switching tests
// ---------------------------------------------------------------------------

#[test]
fn test_persona_changes_with_text() {
    let p1 = classify_persona("diagnose the alarm");
    let p2 = classify_persona("fill IO labels");
    assert_eq!(p1, ContextMode::Diagnostics);
    assert_eq!(p2, ContextMode::IOEditing);
    assert_ne!(p1, p2);
}

#[test]
fn test_persona_switching_reflected_in_prompt() {
    let p1 = build_system_prompt("diagnose the alarm", true, &[]);
    let p2 = build_system_prompt("fill IO labels", true, &[]);
    assert!(p1.contains("Diagnostics"));
    assert!(p2.contains("IO Configuration"));
    assert_ne!(p1, p2);
}

// ---------------------------------------------------------------------------
// Tool-aware scoring tests
// ---------------------------------------------------------------------------

#[test]
fn test_tool_name_boosts_persona() {
    let result = classify_persona("call building_summary for me");
    assert_eq!(result, ContextMode::BuildingOverview);
}

#[test]
fn test_tool_name_device_diagnostics() {
    let result = classify_persona("run device_diagnostics on 100001");
    assert_eq!(result, ContextMode::Diagnostics);
}

#[test]
fn test_explicit_keyword_wins_over_tool() {
    let result = classify_persona("diagnose why point_read is not working");
    assert_eq!(result, ContextMode::Diagnostics);
}

// ---------------------------------------------------------------------------
// ContextMode labels
// ---------------------------------------------------------------------------

#[test]
fn test_all_personas_have_labels() {
    let personas = [
        ContextMode::HVACExpert,
        ContextMode::Diagnostics,
        ContextMode::BACnetDebugging,
        ContextMode::IOEditing,
        ContextMode::HaystackTagging,
        ContextMode::ScheduleProgramming,
        ContextMode::GraphicsEditor,
        ContextMode::SettingsConfiguration,
        ContextMode::BuildingOverview,
    ];
    for p in &personas {
        assert!(!p.label().is_empty());
    }
}
