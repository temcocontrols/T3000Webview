// T3000 Schedules Service - Schedule Management
use sea_orm::*;
use serde::{Deserialize, Serialize};
use crate::entity::t3_device::schedules;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateScheduleRequest {
    #[serde(rename = "SerialNumber")]
    pub serial_number: i32,                     // Required FK to device
    #[serde(rename = "Schedule_ID")]
    pub schedule_id: Option<String>,            // T3000: Schedule_ID
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "Output_Field")]
    pub output_field: Option<String>,           // T3000: Output_Field
    #[serde(rename = "Variable_Field")]
    pub variable_field: Option<String>,         // T3000: Variable_Field
    #[serde(rename = "Holiday1")]
    pub holiday1: Option<String>,               // T3000: Holiday1
    #[serde(rename = "Status1")]
    pub status1: Option<String>,                // T3000: Status1
    #[serde(rename = "Holiday2")]
    pub holiday2: Option<String>,               // T3000: Holiday2
    #[serde(rename = "Status2")]
    pub status2: Option<String>,                // T3000: Status2
    #[serde(rename = "Interval_Field")]
    pub interval_field: Option<String>,         // T3000: Interval_Field
    #[serde(rename = "Schedule_Time")]
    pub schedule_time: Option<String>,          // T3000: Schedule_Time
    #[serde(rename = "Monday_Time")]
    pub monday_time: Option<String>,            // T3000: Monday_Time
    #[serde(rename = "Tuesday_Time")]
    pub tuesday_time: Option<String>,           // T3000: Tuesday_Time
    #[serde(rename = "Wednesday_Time")]
    pub wednesday_time: Option<String>,         // T3000: Wednesday_Time
    #[serde(rename = "Thursday_Time")]
    pub thursday_time: Option<String>,          // T3000: Thursday_Time
    #[serde(rename = "Friday_Time")]
    pub friday_time: Option<String>,            // T3000: Friday_Time
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateScheduleRequest {
    #[serde(rename = "Auto_Manual")]
    pub auto_manual: Option<String>,            // T3000: Auto_Manual
    #[serde(rename = "Output_Field")]
    pub output_field: Option<String>,           // T3000: Output_Field
    #[serde(rename = "Variable_Field")]
    pub variable_field: Option<String>,         // T3000: Variable_Field
    #[serde(rename = "Holiday1")]
    pub holiday1: Option<String>,               // T3000: Holiday1
    #[serde(rename = "Status1")]
    pub status1: Option<String>,                // T3000: Status1
    #[serde(rename = "Holiday2")]
    pub holiday2: Option<String>,               // T3000: Holiday2
    #[serde(rename = "Status2")]
    pub status2: Option<String>,                // T3000: Status2
    #[serde(rename = "Interval_Field")]
    pub interval_field: Option<String>,         // T3000: Interval_Field
    #[serde(rename = "Schedule_Time")]
    pub schedule_time: Option<String>,          // T3000: Schedule_Time
    #[serde(rename = "Monday_Time")]
    pub monday_time: Option<String>,            // T3000: Monday_Time
    #[serde(rename = "Tuesday_Time")]
    pub tuesday_time: Option<String>,           // T3000: Tuesday_Time
    #[serde(rename = "Wednesday_Time")]
    pub wednesday_time: Option<String>,         // T3000: Wednesday_Time
    #[serde(rename = "Thursday_Time")]
    pub thursday_time: Option<String>,          // T3000: Thursday_Time
    #[serde(rename = "Friday_Time")]
    pub friday_time: Option<String>,            // T3000: Friday_Time
}

pub struct T3ScheduleService;

impl T3ScheduleService {
    /// Get all schedules for a specific device
    pub async fn get_schedules_by_device(db: &DatabaseConnection, device_id: i32) -> Result<Vec<schedules::Model>, AppError> {
        let schedules_list = schedules::Entity::find()
            .filter(schedules::Column::SerialNumber.eq(device_id))
            .all(db)
            .await?;
        Ok(schedules_list)
    }

    /// Get all schedules with device information
    pub async fn get_all_schedules_with_device_info(db: &DatabaseConnection) -> Result<Vec<schedules::Model>, AppError> {
        let schedules_list = schedules::Entity::find()
            .all(db)
            .await?;
        Ok(schedules_list)
    }

    /// Create a new schedule
    pub async fn create_schedule(db: &DatabaseConnection, schedule_data: CreateScheduleRequest) -> Result<schedules::Model, AppError> {
        let new_schedule = schedules::ActiveModel {
            serial_number: Set(schedule_data.serial_number),
            schedule_id: Set(schedule_data.schedule_id),
            auto_manual: Set(schedule_data.auto_manual),
            output_field: Set(schedule_data.output_field),
            variable_field: Set(schedule_data.variable_field),
            holiday1: Set(schedule_data.holiday1),
            status1: Set(schedule_data.status1),
            holiday2: Set(schedule_data.holiday2),
            status2: Set(schedule_data.status2),
            interval_field: Set(schedule_data.interval_field),
            schedule_time: Set(schedule_data.schedule_time),
            monday_time: Set(schedule_data.monday_time),
            tuesday_time: Set(schedule_data.tuesday_time),
            wednesday_time: Set(schedule_data.wednesday_time),
            thursday_time: Set(schedule_data.thursday_time),
            friday_time: Set(schedule_data.friday_time),
        };

        let schedule = new_schedule.insert(db).await?;
        Ok(schedule)
    }

    /// Update a schedule by device_id and schedule_id
    pub async fn update_schedule(db: &DatabaseConnection, device_id: i32, schedule_id: String, schedule_data: UpdateScheduleRequest) -> Result<Option<schedules::Model>, AppError> {
        let schedule = schedules::Entity::find()
            .filter(schedules::Column::SerialNumber.eq(device_id))
            .filter(schedules::Column::ScheduleId.eq(Some(schedule_id)))
            .one(db)
            .await?;

        let schedule = match schedule {
            Some(s) => s,
            None => return Ok(None),
        };

        let mut schedule: schedules::ActiveModel = schedule.into();

        if let Some(auto_manual) = schedule_data.auto_manual {
            schedule.auto_manual = Set(Some(auto_manual));
        }
        if let Some(output_field) = schedule_data.output_field {
            schedule.output_field = Set(Some(output_field));
        }
        if let Some(variable_field) = schedule_data.variable_field {
            schedule.variable_field = Set(Some(variable_field));
        }
        if let Some(holiday1) = schedule_data.holiday1 {
            schedule.holiday1 = Set(Some(holiday1));
        }
        if let Some(status1) = schedule_data.status1 {
            schedule.status1 = Set(Some(status1));
        }
        if let Some(holiday2) = schedule_data.holiday2 {
            schedule.holiday2 = Set(Some(holiday2));
        }
        if let Some(status2) = schedule_data.status2 {
            schedule.status2 = Set(Some(status2));
        }
        if let Some(interval_field) = schedule_data.interval_field {
            schedule.interval_field = Set(Some(interval_field));
        }
        if let Some(schedule_time) = schedule_data.schedule_time {
            schedule.schedule_time = Set(Some(schedule_time));
        }
        if let Some(monday_time) = schedule_data.monday_time {
            schedule.monday_time = Set(Some(monday_time));
        }
        if let Some(tuesday_time) = schedule_data.tuesday_time {
            schedule.tuesday_time = Set(Some(tuesday_time));
        }
        if let Some(wednesday_time) = schedule_data.wednesday_time {
            schedule.wednesday_time = Set(Some(wednesday_time));
        }
        if let Some(thursday_time) = schedule_data.thursday_time {
            schedule.thursday_time = Set(Some(thursday_time));
        }
        if let Some(friday_time) = schedule_data.friday_time {
            schedule.friday_time = Set(Some(friday_time));
        }

        let updated_schedule = schedule.update(db).await?;
        Ok(Some(updated_schedule))
    }

    /// Delete a schedule
    pub async fn delete_schedule(db: &DatabaseConnection, device_id: i32, schedule_id: String) -> Result<bool, AppError> {
        let result = schedules::Entity::delete_many()
            .filter(schedules::Column::SerialNumber.eq(device_id))
            .filter(schedules::Column::ScheduleId.eq(Some(schedule_id)))
            .exec(db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Delete all schedules for a device (used when device is deleted)
    pub async fn delete_all_schedules_by_device(db: &DatabaseConnection, device_id: i32) -> Result<u64, AppError> {
        let result = schedules::Entity::delete_many()
            .filter(schedules::Column::SerialNumber.eq(device_id))
            .exec(db)
            .await?;

        Ok(result.rows_affected)
    }

    /// Get schedule statistics by device
    pub async fn get_schedule_stats_by_device(db: &DatabaseConnection, device_id: i32) -> Result<serde_json::Value, AppError> {
        let schedules_list = Self::get_schedules_by_device(db, device_id).await?;

        let active_count = schedules_list.iter()
            .filter(|s| s.auto_manual.as_ref() == Some(&"AUTO".to_string()))
            .count();

        let manual_count = schedules_list.iter()
            .filter(|s| s.auto_manual.as_ref() == Some(&"MANUAL".to_string()))
            .count();

        Ok(serde_json::json!({
            "device_id": device_id,
            "total_schedules": schedules_list.len(),
            "active_schedules": active_count,
            "manual_schedules": manual_count,
            "schedules": schedules_list
        }))
    }
}
