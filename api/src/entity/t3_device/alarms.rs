// T3000 ALARMS Entity - Exact match to T3000.db ALARMS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ALARMS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub SerialNumber: i32,                     // C++ SerialNumber (FK to DEVICES.SerialNumber)

    pub Alarm_ID: Option<String>,               // C++ Alarm_ID
    pub Panel: Option<String>,                  // C++ Panel
    pub Message: Option<String>,                // C++ Message
    pub Status: Option<String>,                 // C++ Status
    pub Priority: Option<String>,               // C++ Priority
    pub NotificationID: Option<String>,         // C++ NotificationID
    pub AlarmState: Option<String>,             // C++ AlarmState
    pub AlarmType: Option<String>,              // C++ AlarmType
    pub Source: Option<String>,                 // C++ Source
    pub Description: Option<String>,            // C++ Description
    pub Acknowledged: Option<String>,           // C++ Acknowledged
    pub Action_Field: Option<String>,           // C++ Action
    pub TimeStamp: Option<String>,              // C++ TimeStamp
    pub LowLimit: Option<String>,               // C++ LowLimit
    pub HighLimit: Option<String>,              // C++ HighLimit
    pub BinaryArray: Option<String>,            // C++ BinaryArray (hex encoded)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
