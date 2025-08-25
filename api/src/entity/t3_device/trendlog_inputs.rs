// T3000 TRENDLOG_INPUTS Entity - Exact match to T3000.db TRENDLOG_INPUTS table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_INPUTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "Trendlog_ID")]
    pub trendlog_id: String,                    // C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)

    #[sea_orm(column_name = "Point_Type")]
    pub point_type: String,                     // C++ Point_Type ('INPUT', 'OUTPUT', 'VARIABLE')
    #[sea_orm(column_name = "Point_Index")]
    pub point_index: String,                    // C++ Point_Index (references point index)
    #[sea_orm(column_name = "Point_Panel")]
    pub point_panel: Option<String>,            // C++ Point_Panel
    #[sea_orm(column_name = "Point_Label")]
    pub point_label: Option<String>,            // C++ Point_Label
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,                 // C++ Status
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
