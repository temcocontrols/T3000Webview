// ============================================================================
// INI Configuration Reader for Multi-PC Centralized Database
// ============================================================================
//
// Reads the [CentralDatabase] section from setting.ini (same directory as the
// executable, typically C:\T3000\setting.ini).
//
// INI format expected:
//   [CentralDatabase]
//   enabled=1
//   role=main
//   store_logs=1

use std::collections::HashMap;
use std::path::PathBuf;

/// Configuration read from [CentralDatabase] in setting.ini
#[derive(Debug, Clone)]
pub struct CentralDbIniConfig {
    /// Whether the centralized database feature is enabled (enabled=1)
    pub enabled: bool,
    /// PC role: "main" or "reader"
    pub role: String,
    /// Whether to store system logs to the central database (store_logs=1)
    pub store_logs: bool,
}

impl Default for CentralDbIniConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            role: "reader".to_string(),
            store_logs: false,
        }
    }
}

/// Locate setting.ini next to the running executable.
/// Falls back to current working directory if exe path fails.
pub fn find_setting_ini_path() -> PathBuf {
    // Try exe directory first (C:\T3000\setting.ini when running as DLL)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join("setting.ini");
            if candidate.exists() {
                return candidate;
            }
        }
    }
    // Fallback to current working directory
    if let Ok(cwd) = std::env::current_dir() {
        let candidate = cwd.join("setting.ini");
        if candidate.exists() {
            return candidate;
        }
    }
    // Return default path even if it doesn't exist (caller handles missing file)
    PathBuf::from("setting.ini")
}

/// Read and parse the [CentralDatabase] section from the given INI file.
/// Returns the default config if the file doesn't exist or the section is missing.
pub fn read_central_db_config(ini_path: &std::path::Path) -> CentralDbIniConfig {
    let content = match std::fs::read_to_string(ini_path) {
        Ok(c) => c,
        Err(_) => {
            // File not found or unreadable → classic mode (feature disabled)
            return CentralDbIniConfig::default();
        }
    };

    parse_central_db_section(&content)
}

/// Read the [CentralDatabase] config from the auto-detected setting.ini location.
pub fn read_central_db_config_auto() -> CentralDbIniConfig {
    let path = find_setting_ini_path();
    read_central_db_config(&path)
}

/// Parse INI content and extract the [CentralDatabase] section.
fn parse_central_db_section(content: &str) -> CentralDbIniConfig {
    let mut in_section = false;
    let mut values: HashMap<String, String> = HashMap::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with(';') || trimmed.starts_with('#') {
            continue;
        }

        // Section header
        if trimmed.starts_with('[') {
            if trimmed.eq_ignore_ascii_case("[centraldatabase]") {
                in_section = true;
            } else {
                // Leaving our section
                if in_section {
                    break;
                }
            }
            continue;
        }

        // Key=value within our section
        if in_section {
            if let Some((key, value)) = trimmed.split_once('=') {
                values.insert(
                    key.trim().to_lowercase(),
                    value.trim().to_string(),
                );
            }
        }
    }

    // If the section wasn't found at all, return defaults
    if values.is_empty() {
        return CentralDbIniConfig::default();
    }

    let enabled = values
        .get("enabled")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let role = values
        .get("role")
        .map(|v| {
            let lower = v.to_lowercase();
            if lower == "main" {
                "main".to_string()
            } else {
                "reader".to_string()
            }
        })
        .unwrap_or_else(|| "reader".to_string());

    let store_logs = values
        .get("store_logs")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    CentralDbIniConfig {
        enabled,
        role,
        store_logs,
    }
}

/// Write the [CentralDatabase] section to setting.ini.
/// Preserves all other sections and content in the file.
pub fn write_central_db_config(
    ini_path: &std::path::Path,
    config: &CentralDbIniConfig,
) -> Result<(), std::io::Error> {
    let existing_content = std::fs::read_to_string(ini_path).unwrap_or_default();
    let new_content = update_central_db_section(&existing_content, config);
    std::fs::write(ini_path, new_content)
}

/// Update or insert the [CentralDatabase] section in INI content.
fn update_central_db_section(content: &str, config: &CentralDbIniConfig) -> String {
    let section_text = format!(
        "[CentralDatabase]\nenabled={}\nrole={}\nstore_logs={}\n",
        if config.enabled { "1" } else { "0" },
        config.role,
        if config.store_logs { "1" } else { "0" },
    );

    // Find and replace existing section
    let mut result = String::new();
    let mut in_section = false;
    let mut section_replaced = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.eq_ignore_ascii_case("[centraldatabase]") {
            in_section = true;
            section_replaced = true;
            result.push_str(&section_text);
            continue;
        }

        if in_section {
            // Skip old section content until next section or EOF
            if trimmed.starts_with('[') {
                in_section = false;
                result.push_str(line);
                result.push('\n');
            }
            // else: skip old key=value lines
            continue;
        }

        result.push_str(line);
        result.push('\n');
    }

    // If section didn't exist, append it
    if !section_replaced {
        if !result.is_empty() && !result.ends_with('\n') {
            result.push('\n');
        }
        result.push('\n');
        result.push_str(&section_text);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_empty_content() {
        let config = parse_central_db_section("");
        assert!(!config.enabled);
        assert_eq!(config.role, "reader");
        assert!(!config.store_logs);
    }

    #[test]
    fn test_parse_no_section() {
        let content = "[SomeOther]\nfoo=bar\n";
        let config = parse_central_db_section(content);
        assert!(!config.enabled);
    }

    #[test]
    fn test_parse_full_section() {
        let content = "\
[Network]
ip=192.168.1.1

[CentralDatabase]
enabled=1
role=main
store_logs=1

[AnotherSection]
key=val
";
        let config = parse_central_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "main");
        assert!(config.store_logs);
    }

    #[test]
    fn test_parse_reader_role() {
        let content = "[CentralDatabase]\nenabled=1\nrole=reader\nstore_logs=0\n";
        let config = parse_central_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "reader");
        assert!(!config.store_logs);
    }

    #[test]
    fn test_parse_case_insensitive_section() {
        let content = "[centraldatabase]\nenabled=1\nrole=Main\n";
        let config = parse_central_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "main");
    }

    #[test]
    fn test_parse_with_comments() {
        let content = "\
; This is a comment
[CentralDatabase]
; enabled toggle
enabled=1
# role setting
role=main
store_logs=0
";
        let config = parse_central_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "main");
        assert!(!config.store_logs);
    }

    #[test]
    fn test_update_existing_section() {
        let content = "[Network]\nip=1.2.3.4\n\n[CentralDatabase]\nenabled=0\nrole=reader\nstore_logs=0\n\n[Other]\nfoo=bar\n";
        let config = CentralDbIniConfig {
            enabled: true,
            role: "main".to_string(),
            store_logs: true,
        };
        let result = update_central_db_section(content, &config);
        assert!(result.contains("[CentralDatabase]\nenabled=1\nrole=main\nstore_logs=1\n"));
        assert!(result.contains("[Network]"));
        assert!(result.contains("[Other]"));
    }

    #[test]
    fn test_update_append_new_section() {
        let content = "[Network]\nip=1.2.3.4\n";
        let config = CentralDbIniConfig {
            enabled: true,
            role: "main".to_string(),
            store_logs: false,
        };
        let result = update_central_db_section(content, &config);
        assert!(result.contains("[CentralDatabase]\nenabled=1\nrole=main\nstore_logs=0\n"));
        assert!(result.contains("[Network]"));
    }
}
