// ============================================================================
// INI Configuration Reader for Server/Client Database
// ============================================================================
//
// Reads the [ServerDatabase] section from setting.ini (same directory as the
// executable, typically C:\T3000\setting.ini).
//
// INI format expected:
//   [ServerDatabase]
//   enabled=1
//   role=server

use std::collections::HashMap;
use std::path::PathBuf;

/// Configuration read from [ServerDatabase] in setting.ini
#[derive(Debug, Clone)]
pub struct ServerDbIniConfig {
    /// Whether the server database feature is enabled (enabled=1)
    pub enabled: bool,
    /// PC role: "server" or "client"
    pub role: String,
}

impl Default for ServerDbIniConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            role: "client".to_string(),
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

/// Read and parse the [ServerDatabase] section from the given INI file.
/// Returns the default config if the file doesn't exist or the section is missing.
pub fn read_server_db_config(ini_path: &std::path::Path) -> ServerDbIniConfig {
    let content = match std::fs::read_to_string(ini_path) {
        Ok(c) => c,
        Err(_) => {
            // File not found or unreadable → classic mode (feature disabled)
            return ServerDbIniConfig::default();
        }
    };

    parse_server_db_section(&content)
}

/// Read the [ServerDatabase] config from the auto-detected setting.ini location.
pub fn read_server_db_config_auto() -> ServerDbIniConfig {
    let path = find_setting_ini_path();
    read_server_db_config(&path)
}

/// Parse INI content and extract the [ServerDatabase] section.
fn parse_server_db_section(content: &str) -> ServerDbIniConfig {
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
            if trimmed.eq_ignore_ascii_case("[serverdatabase]") {
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
        return ServerDbIniConfig::default();
    }

    let enabled = values
        .get("enabled")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let role = values
        .get("role")
        .map(|v| {
            let lower = v.to_lowercase();
            if lower == "server" {
                "server".to_string()
            } else {
                "client".to_string()
            }
        })
        .unwrap_or_else(|| "client".to_string());

    ServerDbIniConfig {
        enabled,
        role,
    }
}

/// Write the [ServerDatabase] section to setting.ini.
/// Preserves all other sections and content in the file.
pub fn write_server_db_config(
    ini_path: &std::path::Path,
    config: &ServerDbIniConfig,
) -> Result<(), std::io::Error> {
    let existing_content = std::fs::read_to_string(ini_path).unwrap_or_default();
    let new_content = update_server_db_section(&existing_content, config);
    std::fs::write(ini_path, new_content)
}

/// Update or insert the [ServerDatabase] section in INI content.
fn update_server_db_section(content: &str, config: &ServerDbIniConfig) -> String {
    let section_text = format!(
        "[ServerDatabase]\nenabled={}\nrole={}\n",
        if config.enabled { "1" } else { "0" },
        config.role,
    );

    // Find and replace existing section
    let mut result = String::new();
    let mut in_section = false;
    let mut section_replaced = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.eq_ignore_ascii_case("[serverdatabase]") {
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
        let config = parse_server_db_section("");
        assert!(!config.enabled);
        assert_eq!(config.role, "client");
    }

    #[test]
    fn test_parse_no_section() {
        let content = "[SomeOther]\nfoo=bar\n";
        let config = parse_server_db_section(content);
        assert!(!config.enabled);
    }

    #[test]
    fn test_parse_full_section() {
        let content = "\
[Network]
ip=192.168.1.1

[ServerDatabase]
enabled=1
role=server

[AnotherSection]
key=val
";
        let config = parse_server_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "server");
    }

    #[test]
    fn test_parse_client_role() {
        let content = "[ServerDatabase]\nenabled=1\nrole=client\n";
        let config = parse_server_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "client");
    }

    #[test]
    fn test_parse_case_insensitive_section() {
        let content = "[serverdatabase]\nenabled=1\nrole=Server\n";
        let config = parse_server_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "server");
    }

    #[test]
    fn test_parse_with_comments() {
        let content = "\
; This is a comment
[ServerDatabase]
; enabled toggle
enabled=1
# role setting
role=server
";
        let config = parse_server_db_section(content);
        assert!(config.enabled);
        assert_eq!(config.role, "server");
    }

    #[test]
    fn test_update_existing_section() {
        let content = "[Network]\nip=1.2.3.4\n\n[ServerDatabase]\nenabled=0\nrole=client\n\n[Other]\nfoo=bar\n";
        let config = ServerDbIniConfig {
            enabled: true,
            role: "server".to_string(),
        };
        let result = update_server_db_section(content, &config);
        assert!(result.contains("[ServerDatabase]\nenabled=1\nrole=server\n"));
        assert!(result.contains("[Network]"));
        assert!(result.contains("[Other]"));
    }

    #[test]
    fn test_update_append_new_section() {
        let content = "[Network]\nip=1.2.3.4\n";
        let config = ServerDbIniConfig {
            enabled: true,
            role: "server".to_string(),
        };
        let result = update_server_db_section(content, &config);
        assert!(result.contains("[ServerDatabase]\nenabled=1\nrole=server\n"));
    }
}
