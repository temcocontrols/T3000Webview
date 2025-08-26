// T3000 Points Service - Input, Output, and Variable Points Management
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::{input_points, output_points, variable_points};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInputPointRequest {
    #[serde(rename = "SerialNumber")]
    pub serial_number: i32,                     // Required FK to device
    #[serde(rename = "InputId")]
    pub input_id: Option<String>,               // T3000: InputId (e.g., "IN1", "IN2")
    #[serde(rename = "Input_Index")]
    pub input_index: Option<String>,            // T3000: Input_Index
    #[serde(rename = "Panel")]
    pub panel: Option<String>,                  // T3000: Panel
    #[serde(rename = "Full_Label")]
    pub full_label: Option<String>,             // T3000: Full_Label (description)
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "fValue")]
    pub f_value: Option<String>,                // T3000: fValue
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
    #[serde(rename = "Digital_Analog")]
    pub digital_analog: Option<String>,         // T3000: Digital_Analog
    #[serde(rename = "Label")]
    pub label: Option<String>,                  // T3000: Label
    #[serde(rename = "Type_Field")]
    pub type_field: Option<String>,             // T3000: Type_Field
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOutputPointRequest {
    #[serde(rename = "SerialNumber")]
    pub serial_number: i32,                     // Required FK to device
    #[serde(rename = "OutputId")]
    pub output_id: Option<String>,              // T3000: OutputId (e.g., "OUT1", "OUT2")
    #[serde(rename = "Output_Index")]
    pub output_index: Option<String>,           // T3000: Output_Index
    #[serde(rename = "Panel")]
    pub panel: Option<String>,                  // T3000: Panel
    #[serde(rename = "Full_Label")]
    pub full_label: Option<String>,             // T3000: Full_Label (description)
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "fValue")]
    pub f_value: Option<String>,                // T3000: fValue
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
    #[serde(rename = "Digital_Analog")]
    pub digital_analog: Option<String>,         // T3000: Digital_Analog
    #[serde(rename = "Label")]
    pub label: Option<String>,                  // T3000: Label
    #[serde(rename = "Type_Field")]
    pub type_field: Option<String>,             // T3000: Type_Field
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVariablePointRequest {
    #[serde(rename = "SerialNumber")]
    pub serial_number: i32,                     // Required FK to device
    #[serde(rename = "VariableId")]
    pub variable_id: Option<String>,            // T3000: VariableId (e.g., "VAR1", "VAR128")
    #[serde(rename = "Variable_Index")]
    pub variable_index: Option<String>,         // T3000: Variable_Index
    #[serde(rename = "Panel")]
    pub panel: Option<String>,                  // T3000: Panel
    #[serde(rename = "Full_Label")]
    pub full_label: Option<String>,             // T3000: Full_Label (description)
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "fValue")]
    pub f_value: Option<String>,                // T3000: fValue
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
    #[serde(rename = "Digital_Analog")]
    pub digital_analog: Option<String>,         // T3000: Digital_Analog
    #[serde(rename = "Label")]
    pub label: Option<String>,                  // T3000: Label
    #[serde(rename = "Type_Field")]
    pub type_field: Option<String>,             // T3000: Type_Field
}

pub struct T3PointsService;

impl T3PointsService {
    // INPUT POINTS MANAGEMENT

    /// Get all input points for a specific device
    pub async fn get_input_points_by_device(db: &DatabaseConnection, device_id: i32) -> Result<Vec<input_points::Model>, AppError> {
        let points = input_points::Entity::find()
            .filter(input_points::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;
        Ok(points)
    }

    /// Create a new input point
    pub async fn create_input_point(db: &DatabaseConnection, point_data: CreateInputPointRequest) -> Result<input_points::Model, AppError> {
        let new_point = input_points::ActiveModel {
            serial_number: Set(point_data.serial_number),
            input_id: Set(point_data.input_id),
            input_index: Set(point_data.input_index),
            panel: Set(point_data.panel),
            full_label: Set(point_data.full_label),
            auto_manual: Set(point_data.auto_manual),
            f_value: Set(point_data.f_value),
            units: Set(point_data.units),
            range_field: Set(point_data.range_field),
            calibration: Set(point_data.calibration),
            sign: Set(point_data.sign),
            filter_field: Set(point_data.filter_field),
            status: Set(point_data.status),
            digital_analog: Set(point_data.digital_analog),
            label: Set(point_data.label),
            type_field: Set(point_data.type_field),
        };

        let point = new_point.insert(db).await?;
        Ok(point)
    }

    // OUTPUT POINTS MANAGEMENT

    /// Get all output points for a specific device
    pub async fn get_output_points_by_device(db: &DatabaseConnection, device_id: i32) -> Result<Vec<output_points::Model>, AppError> {
        let points = output_points::Entity::find()
            .filter(output_points::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;
        Ok(points)
    }

    /// Create a new output point
    pub async fn create_output_point(db: &DatabaseConnection, point_data: CreateOutputPointRequest) -> Result<output_points::Model, AppError> {
        let new_point = output_points::ActiveModel {
            serial_number: Set(point_data.serial_number),
            output_id: Set(point_data.output_id),
            output_index: Set(point_data.output_index),
            panel: Set(point_data.panel),
            full_label: Set(point_data.full_label),
            auto_manual: Set(point_data.auto_manual),
            f_value: Set(point_data.f_value),
            units: Set(point_data.units),
            range_field: Set(point_data.range_field),
            calibration: Set(point_data.calibration),
            sign: Set(point_data.sign),
            filter_field: Set(point_data.filter_field),
            status: Set(point_data.status),
            digital_analog: Set(point_data.digital_analog),
            label: Set(point_data.label),
            type_field: Set(point_data.type_field),
        };

        let point = new_point.insert(db).await?;
        Ok(point)
    }

    // VARIABLE POINTS MANAGEMENT

    /// Get all variable points for a specific device
    pub async fn get_variable_points_by_device(db: &DatabaseConnection, device_id: i32) -> Result<Vec<variable_points::Model>, AppError> {
        let points = variable_points::Entity::find()
            .filter(variable_points::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;
        Ok(points)
    }

    /// Create a new variable point
    pub async fn create_variable_point(db: &DatabaseConnection, point_data: CreateVariablePointRequest) -> Result<variable_points::Model, AppError> {
        let new_point = variable_points::ActiveModel {
            serial_number: Set(point_data.serial_number),
            variable_id: Set(point_data.variable_id),
            variable_index: Set(point_data.variable_index),
            panel: Set(point_data.panel),
            full_label: Set(point_data.full_label),
            auto_manual: Set(point_data.auto_manual),
            f_value: Set(point_data.f_value),
            units: Set(point_data.units),
            range_field: Set(point_data.range_field),
            calibration: Set(point_data.calibration),
            sign: Set(point_data.sign),
            filter_field: Set(point_data.filter_field),
            status: Set(point_data.status),
            digital_analog: Set(point_data.digital_analog),
            label: Set(point_data.label),
            type_field: Set(point_data.type_field),
        };

        let point = new_point.insert(db).await?;
        Ok(point)
    }

    // COMBINED OPERATIONS

    /// Get all points (input, output, variable) for a device with statistics
    pub async fn get_all_points_by_device(db: &DatabaseConnection, device_id: i32) -> Result<serde_json::Value, AppError> {
        let input_points = Self::get_input_points_by_device(db, device_id).await?;
        let output_points = Self::get_output_points_by_device(db, device_id).await?;
        let variable_points = Self::get_variable_points_by_device(db, device_id).await?;

        Ok(serde_json::json!({
            "device_id": device_id,
            "input_points": input_points,
            "output_points": output_points,
            "variable_points": variable_points,
            "point_counts": {
                "inputs": input_points.len(),
                "outputs": output_points.len(),
                "variables": variable_points.len(),
                "total": input_points.len() + output_points.len() + variable_points.len()
            }
        }))
    }

    /// Delete all points for a device (used when device is deleted)
    pub async fn delete_all_points_by_device(db: &DatabaseConnection, device_id: i32) -> Result<u64, AppError> {
        let input_deleted = input_points::Entity::delete_many()
            .filter(input_points::Column::SerialNumber.eq(device_id))
            .exec(db)
            .await?;

        let output_deleted = output_points::Entity::delete_many()
            .filter(output_points::Column::SerialNumber.eq(device_id))
            .exec(db)
            .await?;

        let variable_deleted = variable_points::Entity::delete_many()
            .filter(variable_points::Column::SerialNumber.eq(device_id))
            .exec(db)
            .await?;

        Ok(input_deleted.rows_affected + output_deleted.rows_affected + variable_deleted.rows_affected)
    }
}
