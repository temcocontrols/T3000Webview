// PRACTICAL IMPLEMENTATION: Trendlog via HandleWebViewMsg
// ======================================================

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::error::Error;
use crate::t3_device::t3_ffi_api_service::T3000FfiApiService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogInput {
    pub index: usize,
    pub panel: i32,
    pub sub_panel: i32,
    pub point_type: i32,
    pub point_number: i32,
    pub network: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendlogInfo {
    pub device_id: i32,
    pub monitor_index: i32,
    pub label: String,
    pub status: i32,                 // 0=OFF, 1=ON
    pub hour_interval: i32,          // Hours (0-255)
    pub minute_interval: i32,        // Minutes (0-59)
    pub second_interval: i32,        // Seconds (0-59)
    pub num_inputs: i32,             // Total number of points
    pub an_inputs: i32,              // Number of analog points
    pub inputs: Vec<TrendlogInput>,  // Input point configurations
}

/// Trendlog service using HandleWebViewMsg (the working approach)
pub struct TrendlogWebMsgService {
    ffi_service: T3000FfiApiService,
}

impl TrendlogWebMsgService {
    pub fn new() -> Self {
        Self {
            ffi_service: T3000FfiApiService::new(),
        }
    }

    /// Get complete trendlog list for a device using GET_PANEL_DATA
    pub async fn get_trendlog_list(&self, device_id: i32) -> Result<Vec<TrendlogInfo>, Error> {
        let message = serde_json::json!({
            "action": 0,  // GET_PANEL_DATA - same as C++ WEBVIEW_MESSAGE_TYPE::GET_PANEL_DATA
            "panelId": device_id,
            "msgId": format!("trendlog_list_{}", chrono::Utc::now().timestamp())
        });

        let response = self.ffi_service.call_ffi(&message.to_string()).await?;
        self.parse_trendlog_list_response(&response)
    }

    /// Get specific trendlog entry with fresh device data using GET_ENTRIES
    pub async fn get_trendlog_entry(&self, device_id: i32, monitor_index: i32) -> Result<TrendlogInfo, Error> {
        let message = serde_json::json!({
            "action": 6,  // GET_ENTRIES - same as C++ WEBVIEW_MESSAGE_TYPE::GET_ENTRIES
            "panelId": device_id,
            "entries": [{
                "type": "MON",  // BAC_AMON type in C++
                "index": monitor_index
            }],
            "msgId": format!("trendlog_entry_{}_{}", device_id, monitor_index)
        });

        let response = self.ffi_service.call_ffi(&message.to_string()).await?;
        self.parse_single_trendlog_response(&response)
    }

    /// Refresh specific trendlog from device (triggers Post_Background_Read_Message_ByPanel)
    pub async fn refresh_trendlog_from_device(&self, device_id: i32, monitor_index: i32) -> Result<TrendlogInfo, Error> {
        // This calls GET_ENTRIES which internally calls:
        // Post_Background_Read_Message_ByPanel(npanel_id, READMONITOR_T3000, entry_index + 1)
        // This is the equivalent of your direct FFI GetMonitorBlockData call
        self.get_trendlog_entry(device_id, monitor_index).await
    }

    /// Check if device is online using panel data request
    pub async fn is_device_online(&self, device_id: i32) -> Result<bool, Error> {
        // Instead of direct T3000_IsDeviceOnline FFI call, use panel data request
        let message = serde_json::json!({
            "action": 0,  // GET_PANEL_DATA
            "panelId": device_id,
            "msgId": format!("device_status_{}", device_id)
        });

        match self.ffi_service.call_ffi(&message.to_string()).await {
            Ok(response) => {
                // Parse JSON response from C++
                match serde_json::from_str::<serde_json::Value>(&response) {
                    Ok(json_response) => {
                        // If there's an "error" field, device is offline or has error
                        if json_response.get("error").is_some() {
                            Ok(false)  // Device offline or error
                        } else {
                            // Check for "data" field - indicates successful response
                            Ok(json_response.get("data").is_some())
                        }
                    }
                    Err(_) => Ok(false)  // Invalid JSON means device offline
                }
            }
            Err(_) => Ok(false)  // If call fails, device is offline
        }
    }

    /// Parse trendlog list from GET_PANEL_DATA response
    fn parse_trendlog_list_response(&self, response: &str) -> Result<Vec<TrendlogInfo>, Error> {
        let json_response: serde_json::Value = serde_json::from_str(response)
            .map_err(|e| Error::ServerError(format!("JSON parse error: {}", e)))?;
        let mut trendlogs = Vec::new();

        if let Some(data_array) = json_response.get("data").and_then(|d| d.as_array()) {
            for item in data_array {
                // Filter for monitor/trendlog entries (type = "MON")
                if item.get("type").and_then(|t| t.as_str()) == Some("MON") {
                    let trendlog = self.parse_trendlog_item(item)?;
                    trendlogs.push(trendlog);
                }
            }
        }

        Ok(trendlogs)
    }

    /// Parse single trendlog from GET_ENTRIES response
    fn parse_single_trendlog_response(&self, response: &str) -> Result<TrendlogInfo, Error> {
        let json_response: serde_json::Value = serde_json::from_str(response)
            .map_err(|e| Error::ServerError(format!("JSON parse error: {}", e)))?;

        if let Some(data_array) = json_response.get("data").and_then(|d| d.as_array()) {
            if let Some(first_item) = data_array.first() {
                return self.parse_trendlog_item(first_item);
            }
        }

        Err(Error::ServerError("No trendlog data found in response".to_string()))
    }

    /// Parse individual trendlog item from JSON
    fn parse_trendlog_item(&self, item: &serde_json::Value) -> Result<TrendlogInfo, Error> {
        let trendlog = TrendlogInfo {
            device_id: item.get("pid").and_then(|p| p.as_i64()).unwrap_or(0) as i32,
            monitor_index: item.get("index").and_then(|i| i.as_i64()).unwrap_or(0) as i32,
            label: item.get("label").and_then(|l| l.as_str()).unwrap_or("").to_string(),
            status: item.get("status").and_then(|s| s.as_i64()).unwrap_or(0) as i32,
            hour_interval: item.get("hour_interval_time").and_then(|h| h.as_i64()).unwrap_or(0) as i32,
            minute_interval: item.get("minute_interval_time").and_then(|m| m.as_i64()).unwrap_or(0) as i32,
            second_interval: item.get("second_interval_time").and_then(|s| s.as_i64()).unwrap_or(0) as i32,
            num_inputs: item.get("num_inputs").and_then(|n| n.as_i64()).unwrap_or(0) as i32,
            an_inputs: item.get("an_inputs").and_then(|a| a.as_i64()).unwrap_or(0) as i32,
            inputs: self.parse_monitor_inputs(item.get("input"))?,
        };

        Ok(trendlog)
    }

    /// Parse monitor input points from JSON
    fn parse_monitor_inputs(&self, inputs_json: Option<&serde_json::Value>) -> Result<Vec<TrendlogInput>, Error> {
        let mut inputs = Vec::new();

        if let Some(inputs_obj) = inputs_json.and_then(|i| i.as_object()) {
            for (key, value) in inputs_obj {
                if let Ok(index) = key.parse::<usize>() {
                    let input = TrendlogInput {
                        index,
                        panel: value.get("panel").and_then(|p| p.as_i64()).unwrap_or(0) as i32,
                        sub_panel: value.get("sub_panel").and_then(|s| s.as_i64()).unwrap_or(0) as i32,
                        point_type: value.get("point_type").and_then(|pt| pt.as_i64()).unwrap_or(0) as i32,
                        point_number: value.get("point_number").and_then(|pn| pn.as_i64()).unwrap_or(0) as i32,
                        network: value.get("network").and_then(|n| n.as_i64()).unwrap_or(0) as i32,
                    };
                    inputs.push(input);
                }
            }
        }

        Ok(inputs)
    }
}

// Usage examples:
impl TrendlogWebMsgService {
    /// Get all active trendlogs for a device
    pub async fn get_active_trendlogs(&self, device_id: i32) -> Result<Vec<TrendlogInfo>, Error> {
        let all_trendlogs = self.get_trendlog_list(device_id).await?;
        Ok(all_trendlogs.into_iter().filter(|t| t.status == 1).collect())
    }

    /// Get trendlog summary with basic info
    pub async fn get_trendlog_summary(&self, device_id: i32) -> Result<HashMap<String, serde_json::Value>, Error> {
        let trendlogs = self.get_trendlog_list(device_id).await?;

        let mut summary = HashMap::new();
        summary.insert("device_id".to_string(), serde_json::Value::Number(device_id.into()));
        summary.insert("total_trendlogs".to_string(), serde_json::Value::Number(trendlogs.len().into()));
        summary.insert("active_trendlogs".to_string(), serde_json::Value::Number(
            trendlogs.iter().filter(|t| t.status == 1).count().into()
        ));
        summary.insert("trendlogs".to_string(), serde_json::to_value(trendlogs)
            .map_err(|e| Error::ServerError(format!("JSON serialization error: {}", e)))?);

        Ok(summary)
    }
}
