// T3000 TRENDLOG_DATA Entity - Exact match to T3000.db TRENDLOG_DATA table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub Trendlog_Input_ID: i32,                 // C++ reference to TRENDLOG_INPUTS

    pub TimeStamp: String,                      // C++ TimeStamp (T3000 uses TEXT for timestamps)
    pub fValue: Option<String>,                 // C++ fValue (following T3000 pattern - stored as TEXT)
    pub Status: Option<String>,                 // C++ Status
    pub Quality: Option<String>,                // C++ Quality (data quality indicator)
    pub BinaryArray: Option<String>,            // C++ BinaryArray
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
