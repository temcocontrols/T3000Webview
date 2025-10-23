// T3000 TRENDLOG_DATA Entity (Parent/Main) - Stores point metadata once
// Optimized split-table design: metadata stored once per unique data point
// Related to TRENDLOG_DATA_DETAIL (child) via one-to-many relationship
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_DATA")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, column_name = "id")]
    pub id: i32,                               // Auto-increment primary key

    #[sea_orm(column_name = "SerialNumber")]
    pub serial_number: i32,                    // C++ SerialNumber (references DEVICES.SerialNumber)

    #[sea_orm(column_name = "PanelId")]
    pub panel_id: i32,                         // C++ PanelId (panel identification)

    #[sea_orm(column_name = "PointId")]
    pub point_id: String,                      // C++ Point ID (e.g., "IN1", "OUT1", "VAR128")

    #[sea_orm(column_name = "PointIndex")]
    pub point_index: i32,                      // C++ Point Index (numeric index from JSON "index" field)

    #[sea_orm(column_name = "PointType")]
    pub point_type: String,                    // C++ Point Type ('INPUT', 'OUTPUT', 'VARIABLE')

    #[sea_orm(column_name = "Digital_Analog")]
    pub digital_analog: Option<String>,        // C++ Digital_Analog (0=digital, 1=analog from JSON)

    #[sea_orm(column_name = "Range_Field")]
    pub range_field: Option<String>,           // C++ Range (range information for units calculation)

    #[sea_orm(column_name = "Units")]
    pub units: Option<String>,                 // C++ Units (derived from range: C, degree, h/kh, etc.)

    #[sea_orm(column_name = "Description")]
    pub description: Option<String>,           // Optional point description

    #[sea_orm(column_name = "IsActive")]
    pub is_active: Option<bool>,               // Active/inactive flag for data collection

    #[sea_orm(column_name = "CreatedAt")]
    pub created_at: Option<String>,            // Record creation timestamp

    #[sea_orm(column_name = "UpdatedAt")]
    pub updated_at: Option<String>,            // Last update timestamp
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::trendlog_data_detail::Entity")]
    TrendlogDataDetail,
}

impl Related<super::trendlog_data_detail::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendlogDataDetail.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
