// T3000 ALARMS Entity - Exact match to T3000.db ALARMS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ALARMS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    #[sea_orm(column_name = "Alarm_ID")]
    pub alarm_id: Option<String>,               // C++ Alarm_ID
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,                  // C++ Panel
    #[sea_orm(column_name = "Message")]
    pub message: Option<String>,                // C++ Message
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Priority")]
    pub priority: Option<String>,               // C++ Priority
    #[sea_orm(column_name = "NotificationID")]
    pub notification_id: Option<String>,        // C++ NotificationID
    #[sea_orm(column_name = "AlarmState")]
    pub alarm_state: Option<String>,            // C++ AlarmState
    #[sea_orm(column_name = "AlarmType")]
    pub alarm_type: Option<String>,             // C++ AlarmType
    #[sea_orm(column_name = "Source")]
    pub source: Option<String>,                 // C++ Source
    #[sea_orm(column_name = "Description")]
    pub description: Option<String>,            // C++ Description
    #[sea_orm(column_name = "Acknowledged")]
    pub acknowledged: Option<String>,           // C++ Acknowledged
    #[sea_orm(column_name = "Action_Field")]
    pub action_field: Option<String>,           // C++ Action
    #[sea_orm(column_name = "TimeStamp")]
    pub time_stamp: Option<String>,             // C++ TimeStamp
    #[sea_orm(column_name = "LowLimit")]
    pub low_limit: Option<String>,              // C++ LowLimit
    #[sea_orm(column_name = "HighLimit")]
    pub high_limit: Option<String>,             // C++ HighLimit
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
