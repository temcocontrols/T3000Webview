// T3000 TRENDLOG_VIEWS Entity - View configurations and metadata for TrendLog Views 2 and 3
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_VIEWS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "id")]
    pub id: i32,                                // Auto-incrementing primary key

    #[sea_orm(column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (references DEVICES.SerialNumber)

    #[sea_orm(column_name = "PanelId")]
    pub panel_id: i32,                          // C++ PanelId (panel identification)

    #[sea_orm(column_name = "Trendlog_ID")]
    pub trendlog_id: String,                    // C++ Trendlog_ID (FK to TRENDLOGS.Trendlog_ID)
    #[sea_orm(column_name = "View_Number")]
    pub view_number: i32,                       // View number: 2 or 3 (user-created views)
    #[sea_orm(column_name = "Point_Type")]
    pub point_type: String,                     // C++ Point_Type ('INPUT', 'OUTPUT', 'VARIABLE')
    #[sea_orm(column_name = "Point_Index")]
    pub point_index: String,                    // C++ Point_Index (references point index)
    #[sea_orm(column_name = "Point_Panel")]
    pub point_panel: Option<String>,            // C++ Point_Panel
    #[sea_orm(column_name = "Point_Label")]
    pub point_label: Option<String>,            // C++ Point_Label
    #[sea_orm(column_name = "is_selected")]
    pub is_selected: Option<i32>,               // Selection status: 1=selected, 0=not selected
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,             // Record creation time
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,             // Record update time
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
