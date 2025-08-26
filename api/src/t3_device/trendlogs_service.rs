// T3000 Trendlogs Service - Trendlog Management
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::trendlogs;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTrendlogRequest {
    #[serde(rename = "SerialNumber")]
    pub serial_number: i32,                     // Required FK to device
    #[serde(rename = "Trendlog_index")]
    pub trendlog_index: Option<String>,         // T3000: Trendlog_index
    #[serde(rename = "Panel")]
    pub panel: Option<String>,                  // T3000: Panel
    #[serde(rename = "Full_Label")]
    pub full_label: Option<String>,             // T3000: Full_Label (description)
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "Units")]
    pub units: Option<String>,                  // T3000: Units
    #[serde(rename = "Range_Field")]
    pub range_field: Option<String>,            // T3000: Range_Field
    #[serde(rename = "Calibration")]
    pub calibration: Option<String>,            // T3000: Calibration
    #[serde(rename = "Sign")]
    pub sign: Option<String>,                   // T3000: Sign
    #[serde(rename = "Filter_Field")]
    pub filter_field: Option<String>,           // T3000: Filter_Field
    #[serde(rename = "Status")]
    pub status: Option<String>,                 // T3000: Status
    #[serde(rename = "Signal_Type")]
    pub signal_type: Option<String>,            // T3000: Signal_Type
    #[serde(rename = "Label")]
    pub label: Option<String>,                  // T3000: Label
    #[serde(rename = "Type_Field")]
    pub type_field: Option<String>,             // T3000: Type_Field
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTrendlogRequest {
    #[serde(rename = "Panel")]
    pub panel: Option<String>,                  // T3000: Panel
    #[serde(rename = "Full_Label")]
    pub full_label: Option<String>,             // T3000: Full_Label (description)
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "Units")]
    pub units: Option<String>,                  // T3000: Units
    #[serde(rename = "Range_Field")]
    pub range_field: Option<String>,            // T3000: Range_Field
    #[serde(rename = "Calibration")]
    pub calibration: Option<String>,            // T3000: Calibration
    #[serde(rename = "Sign")]
    pub sign: Option<String>,                   // T3000: Sign
    #[serde(rename = "Filter_Field")]
    pub filter_field: Option<String>,           // T3000: Filter_Field
    #[serde(rename = "Status")]
    pub status: Option<String>,                 // T3000: Status
    #[serde(rename = "Signal_Type")]
    pub signal_type: Option<String>,            // T3000: Signal_Type
    #[serde(rename = "Label")]
    pub label: Option<String>,                  // T3000: Label
    #[serde(rename = "Type_Field")]
    pub type_field: Option<String>,             // T3000: Type_Field
}

pub struct T3TrendlogService;

impl T3TrendlogService {
    /// Get all trendlogs for a specific device
    pub async fn get_trendlogs_by_device(db: &DatabaseConnection, device_id: i32) -> Result<Vec<trendlogs::Model>, AppError> {
        let trendlogs_list = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;
        Ok(trendlogs_list)
    }

    /// Get all trendlogs with device information
    pub async fn get_all_trendlogs_with_device_info(db: &DatabaseConnection) -> Result<Vec<trendlogs::Model>, AppError> {
        let trendlogs_list = trendlogs::Entity::find()
            .all(db)
            .await?;
        Ok(trendlogs_list)
    }

    /// Get a specific trendlog by device_id and trendlog_index
    pub async fn get_trendlog_by_index(db: &DatabaseConnection, device_id: i32, trendlog_index: String) -> Result<Option<trendlogs::Model>, AppError> {
        let trendlog = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(device_id))
            .filter(trendlogs::Column::TrendlogIndex.eq(Some(trendlog_index)))
            .one(db)
            .await?;
        Ok(trendlog)
    }

    /// Create a new trendlog
    pub async fn create_trendlog(db: &DatabaseConnection, trendlog_data: CreateTrendlogRequest) -> Result<trendlogs::Model, AppError> {
        let new_trendlog = trendlogs::ActiveModel {
            serial_number: Set(trendlog_data.serial_number),
            trendlog_index: Set(trendlog_data.trendlog_index),
            panel: Set(trendlog_data.panel),
            full_label: Set(trendlog_data.full_label),
            auto_manual: Set(trendlog_data.auto_manual),
            units: Set(trendlog_data.units),
            range_field: Set(trendlog_data.range_field),
            calibration: Set(trendlog_data.calibration),
            sign: Set(trendlog_data.sign),
            filter_field: Set(trendlog_data.filter_field),
            status: Set(trendlog_data.status),
            signal_type: Set(trendlog_data.signal_type),
            label: Set(trendlog_data.label),
            type_field: Set(trendlog_data.type_field),
        };

        let trendlog = new_trendlog.insert(db).await?;
        Ok(trendlog)
    }

    /// Update a trendlog by device_id and trendlog_index
    pub async fn update_trendlog(db: &DatabaseConnection, device_id: i32, trendlog_index: String, trendlog_data: UpdateTrendlogRequest) -> Result<Option<trendlogs::Model>, AppError> {
        let trendlog = trendlogs::Entity::find()
            .filter(trendlogs::Column::SerialNumber.eq(device_id))
            .filter(trendlogs::Column::TrendlogIndex.eq(Some(trendlog_index)))
            .one(db)
            .await?;

        let trendlog = match trendlog {
            Some(t) => t,
            None => return Ok(None),
        };

        let mut trendlog: trendlogs::ActiveModel = trendlog.into();

        if let Some(panel) = trendlog_data.panel {
            trendlog.panel = Set(Some(panel));
        }
        if let Some(full_label) = trendlog_data.full_label {
            trendlog.full_label = Set(Some(full_label));
        }
        if let Some(auto_manual) = trendlog_data.auto_manual {
            trendlog.auto_manual = Set(Some(auto_manual));
        }
        if let Some(units) = trendlog_data.units {
            trendlog.units = Set(Some(units));
        }
        if let Some(range_field) = trendlog_data.range_field {
            trendlog.range_field = Set(Some(range_field));
        }
        if let Some(calibration) = trendlog_data.calibration {
            trendlog.calibration = Set(Some(calibration));
        }
        if let Some(sign) = trendlog_data.sign {
            trendlog.sign = Set(Some(sign));
        }
        if let Some(filter_field) = trendlog_data.filter_field {
            trendlog.filter_field = Set(Some(filter_field));
        }
        if let Some(status) = trendlog_data.status {
            trendlog.status = Set(Some(status));
        }
        if let Some(signal_type) = trendlog_data.signal_type {
            trendlog.signal_type = Set(Some(signal_type));
        }
        if let Some(label) = trendlog_data.label {
            trendlog.label = Set(Some(label));
        }
        if let Some(type_field) = trendlog_data.type_field {
            trendlog.type_field = Set(Some(type_field));
        }

        let updated_trendlog = trendlog.update(db).await?;
        Ok(Some(updated_trendlog))
    }

    /// Delete a trendlog
    pub async fn delete_trendlog(db: &DatabaseConnection, device_id: i32, trendlog_index: String) -> Result<bool, AppError> {
        let result = trendlogs::Entity::delete_many()
            .filter(trendlogs::Column::SerialNumber.eq(device_id))
            .filter(trendlogs::Column::TrendlogIndex.eq(Some(trendlog_index)))
            .exec(db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Delete all trendlogs for a device (used when device is deleted)
    pub async fn delete_all_trendlogs_by_device(db: &DatabaseConnection, device_id: i32) -> Result<u64, AppError> {
        let result = trendlogs::Entity::delete_many()
            .filter(trendlogs::Column::SerialNumber.eq(device_id))
            .exec(db)
            .await?;

        Ok(result.rows_affected)
    }

    /// Get trendlog statistics by device
    pub async fn get_trendlog_stats_by_device(db: &DatabaseConnection, device_id: i32) -> Result<serde_json::Value, AppError> {
        let trendlogs_list = Self::get_trendlogs_by_device(db, device_id).await?;

        let active_count = trendlogs_list.iter()
            .filter(|t| t.auto_manual.as_ref() == Some(&"AUTO".to_string()))
            .count();

        let manual_count = trendlogs_list.iter()
            .filter(|t| t.auto_manual.as_ref() == Some(&"MANUAL".to_string()))
            .count();

        let enabled_count = trendlogs_list.iter()
            .filter(|t| t.status.as_ref() == Some(&"Enabled".to_string()) || t.status.as_ref() == Some(&"ENABLED".to_string()))
            .count();

        let disabled_count = trendlogs_list.iter()
            .filter(|t| t.status.as_ref() == Some(&"Disabled".to_string()) || t.status.as_ref() == Some(&"DISABLED".to_string()))
            .count();

        // Count by signal types
        let analog_count = trendlogs_list.iter()
            .filter(|t| t.signal_type.as_ref() == Some(&"Analog".to_string()) || t.signal_type.as_ref() == Some(&"1".to_string()))
            .count();

        let digital_count = trendlogs_list.iter()
            .filter(|t| t.signal_type.as_ref() == Some(&"Digital".to_string()) || t.signal_type.as_ref() == Some(&"0".to_string()))
            .count();

        Ok(serde_json::json!({
            "device_id": device_id,
            "total_trendlogs": trendlogs_list.len(),
            "active_trendlogs": active_count,
            "manual_trendlogs": manual_count,
            "enabled_trendlogs": enabled_count,
            "disabled_trendlogs": disabled_count,
            "analog_trendlogs": analog_count,
            "digital_trendlogs": digital_count,
            "trendlogs": trendlogs_list
        }))
    }

    /// Get trendlogs with their configuration status
    pub async fn get_trendlogs_with_config(db: &DatabaseConnection, device_id: i32) -> Result<serde_json::Value, AppError> {
        let trendlogs_list = Self::get_trendlogs_by_device(db, device_id).await?;

        let trendlogs_with_config: Vec<serde_json::Value> = trendlogs_list.iter().map(|trendlog| {
            let is_enabled = trendlog.status.as_ref()
                .map(|status| status == "Enabled" || status == "ENABLED")
                .unwrap_or(false);

            let is_auto = trendlog.auto_manual.as_ref()
                .map(|mode| mode == "AUTO")
                .unwrap_or(false);

            let is_analog = trendlog.signal_type.as_ref()
                .map(|sig_type| sig_type == "Analog" || sig_type == "1")
                .unwrap_or(false);

            serde_json::json!({
                "trendlog": trendlog,
                "is_enabled": is_enabled,
                "is_auto": is_auto,
                "is_analog": is_analog,
                "configuration_status": trendlog.status.as_ref().unwrap_or(&"Unknown".to_string()),
                "control_mode": trendlog.auto_manual.as_ref().unwrap_or(&"Unknown".to_string()),
                "signal_type_name": if is_analog { "Analog" } else { "Digital" }
            })
        }).collect();

        Ok(serde_json::json!({
            "device_id": device_id,
            "trendlogs": trendlogs_with_config,
            "count": trendlogs_list.len()
        }))
    }
}
