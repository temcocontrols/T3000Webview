// T3000 TRENDLOG_INPUTS Entity - Enhanced with view management columns for persistent user selections
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_INPUTS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = true, column_name = "id")]
    pub id: i32,                                // Auto-incrementing primary key

    #[sea_orm(column_name = "SerialNumber")]
    pub serial_number: i32,                     // C++ SerialNumber (references DEVICES.SerialNumber)

    #[sea_orm(column_name = "PanelId")]
    pub panel_id: i32,                          // C++ PanelId (panel identification)

    #[sea_orm(column_name = "Trendlog_ID")]
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

    // Enhanced fields for view management
    #[sea_orm(column_name = "view_type")]
    pub view_type: Option<String>,              // View type: 'MAIN' (from FFI) or 'VIEW' (user selection)
    #[sea_orm(column_name = "view_number")]
    pub view_number: Option<i32>,               // View number: NULL for MAIN, 2-3 for user views
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
