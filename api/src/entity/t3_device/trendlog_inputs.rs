// T3000 TRENDLOG_INPUTS Entity - Exact match to T3000.db TRENDLOG_INPUTS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_INPUTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub Trendlog_ID: String,                    // C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)

    pub Point_Type: String,                     // C++ Point_Type ('INPUT', 'OUTPUT', 'VARIABLE')
    pub Point_Index: String,                    // C++ Point_Index (references point index)
    pub Point_Panel: Option<String>,            // C++ Point_Panel
    pub Point_Label: Option<String>,            // C++ Point_Label
    pub Status: Option<String>,                 // C++ Status
    pub BinaryArray: Option<String>,            // C++ BinaryArray
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
