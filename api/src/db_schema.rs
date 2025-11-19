// ============================================================================
// Database Schema Module - Embedded SQL for Dynamic Database Creation
// ============================================================================
// This module provides embedded SQL schema for Option 2 (Dynamic Creation)
// The SQL is embedded at compile time from the source file
// ============================================================================

/// Embedded SQL schema for webview_t3_device.db
/// Source: migration/sql/webview_t3_device_schema.sql
/// This SQL is compiled into the binary at compile time
pub const EMBEDDED_SCHEMA: &str = include_str!("../migration/sql/webview_t3_device_schema.sql");

/// Get the embedded schema version (extracted from SQL comments if available)
/// This helps track which schema version is embedded in the binary
pub fn get_embedded_schema_version() -> &'static str {
    // Look for version in SQL comments
    // Format: -- Date: January 25, 2025
    if let Some(line) = EMBEDDED_SCHEMA.lines().find(|l| l.contains("-- Date:")) {
        return line.trim_start_matches("-- Date:").trim();
    }
    "Unknown"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedded_schema_not_empty() {
        assert!(!EMBEDDED_SCHEMA.is_empty(), "Embedded schema should not be empty");
    }

    #[test]
    fn test_embedded_schema_contains_devices_table() {
        assert!(
            EMBEDDED_SCHEMA.contains("CREATE TABLE IF NOT EXISTS DEVICES"),
            "Schema should contain DEVICES table"
        );
    }

    #[test]
    fn test_get_schema_version() {
        let version = get_embedded_schema_version();
        assert!(!version.is_empty(), "Schema version should not be empty");
        println!("Embedded schema version: {}", version);
    }
}
