// T3000 TRENDLOG_DATA Entity - Exact match to T3000.db TRENDLOG_DATA table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "Trendlog_Input_ID")]
    pub trendlog_input_id: i32,                 // C++ reference to TRENDLOG_INPUTS

    #[sea_orm(column_name = "TimeStamp")]
    pub time_stamp: String,                     // C++ TimeStamp (T3000 uses TEXT for timestamps)
    #[sea_orm(column_name = "fValue")]
    pub f_value: Option<String>,                // C++ fValue (following T3000 pattern - stored as TEXT)
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
    #[sea_orm(column_name = "Quality")]
    pub quality: Option<String>,                // C++ Quality (data quality indicator)
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
