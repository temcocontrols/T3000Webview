// T3000 Programs Service - Program Management
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::programs;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProgramRequest {
    #[serde(rename = "SerialNumber")]
    pub serial_number: i32,                     // Required FK to device
    #[serde(rename = "Program_ID")]
    pub program_id: Option<String>,             // T3000: Program_ID
    #[serde(rename = "Switch_Node")]
    pub switch_node: Option<String>,            // T3000: Switch_Node
    #[serde(rename = "Program_Label")]
    pub program_label: Option<String>,          // T3000: Program_Label
    #[serde(rename = "Program_List")]
    pub program_list: Option<String>,           // T3000: Program_List
    #[serde(rename = "Program_Size")]
    pub program_size: Option<String>,           // T3000: Program_Size
    #[serde(rename = "Program_Pointer")]
    pub program_pointer: Option<String>,        // T3000: Program_Pointer
    #[serde(rename = "Program_Status")]
    pub program_status: Option<String>,         // T3000: Program_Status
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgramRequest {
    #[serde(rename = "Switch_Node")]
    pub switch_node: Option<String>,            // T3000: Switch_Node
    #[serde(rename = "Program_Label")]
    pub program_label: Option<String>,          // T3000: Program_Label
    #[serde(rename = "Program_List")]
    pub program_list: Option<String>,           // T3000: Program_List
    #[serde(rename = "Program_Size")]
    pub program_size: Option<String>,           // T3000: Program_Size
    #[serde(rename = "Program_Pointer")]
    pub program_pointer: Option<String>,        // T3000: Program_Pointer
    #[serde(rename = "Program_Status")]
    pub program_status: Option<String>,         // T3000: Program_Status
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
}

pub struct T3ProgramService;

impl T3ProgramService {
    /// Get all programs for a specific device
    pub async fn get_programs_by_device(db: &DatabaseConnection, device_id: i32) -> Result<Vec<programs::Model>, AppError> {
        let programs_list = programs::Entity::find()
            .filter(programs::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;
        Ok(programs_list)
    }

    /// Get all programs with device information
    pub async fn get_all_programs_with_device_info(db: &DatabaseConnection) -> Result<Vec<programs::Model>, AppError> {
        let programs_list = programs::Entity::find()
            .all(db)
            .await?;
        Ok(programs_list)
    }

    /// Get a specific program by device_id and program_id
    pub async fn get_program_by_id(db: &DatabaseConnection, device_id: i32, program_id: String) -> Result<Option<programs::Model>, AppError> {
        let program = programs::Entity::find()
            .filter(programs::Column::SerialNumber.eq(device_id))
            .filter(programs::Column::ProgramId.eq(Some(program_id)))
            .one(db)
            .await?;
        Ok(program)
    }

    /// Create a new program
    pub async fn create_program(db: &DatabaseConnection, program_data: CreateProgramRequest) -> Result<programs::Model, AppError> {
        let new_program = programs::ActiveModel {
            serial_number: Set(program_data.serial_number),
            program_id: Set(program_data.program_id),
            switch_node: Set(program_data.switch_node),
            program_label: Set(program_data.program_label),
            program_list: Set(program_data.program_list),
            program_size: Set(program_data.program_size),
            program_pointer: Set(program_data.program_pointer),
            program_status: Set(program_data.program_status),
            auto_manual: Set(program_data.auto_manual),
        };

        let program = new_program.insert(db).await?;
        Ok(program)
    }

    /// Update a program by device_id and program_id
    pub async fn update_program(db: &DatabaseConnection, device_id: i32, program_id: String, program_data: UpdateProgramRequest) -> Result<Option<programs::Model>, AppError> {
        let program = programs::Entity::find()
            .filter(programs::Column::SerialNumber.eq(device_id))
            .filter(programs::Column::ProgramId.eq(Some(program_id)))
            .one(db)
            .await?;

        let program = match program {
            Some(p) => p,
            None => return Ok(None),
        };

        let mut program: programs::ActiveModel = program.into();

        if let Some(switch_node) = program_data.switch_node {
            program.switch_node = Set(Some(switch_node));
        }
        if let Some(program_label) = program_data.program_label {
            program.program_label = Set(Some(program_label));
        }
        if let Some(program_list) = program_data.program_list {
            program.program_list = Set(Some(program_list));
        }
        if let Some(program_size) = program_data.program_size {
            program.program_size = Set(Some(program_size));
        }
        if let Some(program_pointer) = program_data.program_pointer {
            program.program_pointer = Set(Some(program_pointer));
        }
        if let Some(program_status) = program_data.program_status {
            program.program_status = Set(Some(program_status));
        }
        if let Some(auto_manual) = program_data.auto_manual {
            program.auto_manual = Set(Some(auto_manual));
        }

        let updated_program = program.update(db).await?;
        Ok(Some(updated_program))
    }

    /// Delete a program
    pub async fn delete_program(db: &DatabaseConnection, device_id: i32, program_id: String) -> Result<bool, AppError> {
        let result = programs::Entity::delete_many()
            .filter(programs::Column::SerialNumber.eq(device_id))
            .filter(programs::Column::ProgramId.eq(Some(program_id)))
            .exec(db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Delete all programs for a device (used when device is deleted)
    pub async fn delete_all_programs_by_device(db: &DatabaseConnection, device_id: i32) -> Result<u64, AppError> {
        let result = programs::Entity::delete_many()
            .filter(programs::Column::SerialNumber.eq(device_id))
            .exec(db)
            .await?;

        Ok(result.rows_affected)
    }

    /// Get program statistics by device
    pub async fn get_program_stats_by_device(db: &DatabaseConnection, device_id: i32) -> Result<serde_json::Value, AppError> {
        let programs_list = Self::get_programs_by_device(db, device_id).await?;

        let active_count = programs_list.iter()
            .filter(|p| p.auto_manual.as_ref() == Some(&"AUTO".to_string()))
            .count();

        let manual_count = programs_list.iter()
            .filter(|p| p.auto_manual.as_ref() == Some(&"MANUAL".to_string()))
            .count();

        let running_count = programs_list.iter()
            .filter(|p| p.program_status.as_ref() == Some(&"Running".to_string()) || p.program_status.as_ref() == Some(&"RUNNING".to_string()))
            .count();

        let stopped_count = programs_list.iter()
            .filter(|p| p.program_status.as_ref() == Some(&"Stopped".to_string()) || p.program_status.as_ref() == Some(&"STOPPED".to_string()))
            .count();

        Ok(serde_json::json!({
            "device_id": device_id,
            "total_programs": programs_list.len(),
            "active_programs": active_count,
            "manual_programs": manual_count,
            "running_programs": running_count,
            "stopped_programs": stopped_count,
            "programs": programs_list
        }))
    }

    /// Get all programs for a device with execution status
    pub async fn get_programs_with_status(db: &DatabaseConnection, device_id: i32) -> Result<serde_json::Value, AppError> {
        let programs_list = Self::get_programs_by_device(db, device_id).await?;

        let programs_with_status: Vec<serde_json::Value> = programs_list.iter().map(|program| {
            let is_running = program.program_status.as_ref()
                .map(|status| status == "Running" || status == "RUNNING")
                .unwrap_or(false);

            let is_auto = program.auto_manual.as_ref()
                .map(|mode| mode == "AUTO")
                .unwrap_or(false);

            serde_json::json!({
                "program": program,
                "is_running": is_running,
                "is_auto": is_auto,
                "execution_status": program.program_status.as_ref().unwrap_or(&"Unknown".to_string()),
                "control_mode": program.auto_manual.as_ref().unwrap_or(&"Unknown".to_string())
            })
        }).collect();

        Ok(serde_json::json!({
            "device_id": device_id,
            "programs": programs_with_status,
            "count": programs_list.len()
        }))
    }
}
