use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "trend_point")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub point_type: String,
    pub point_number: i32,
    pub point_name: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub data_type: String,
    pub is_enabled: i32,
    pub collection_interval: i32,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::devices::Entity",
        from = "Column::DeviceId",
        to = "super::devices::Column::DeviceId"
    )]
    Device,
    #[sea_orm(has_many = "super::trend_data::Entity")]
    TrendData,
    #[sea_orm(has_many = "super::collection_status::Entity")]
    CollectionStatus,
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Device.def()
    }
}

impl Related<super::trend_data::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendData.def()
    }
}

impl Related<super::collection_status::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CollectionStatus.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Check if point is enabled for trending
    pub fn is_trending_enabled(&self) -> bool {
        self.is_enabled == 1
    }

    /// Get point type enum
    pub fn get_point_type(&self) -> PointType {
        match self.point_type.as_str() {
            "INPUT" => PointType::Input,
            "OUTPUT" => PointType::Output,
            "VARIABLE" => PointType::Variable,
            _ => PointType::Unknown,
        }
    }

    /// Get data type enum
    pub fn get_data_type(&self) -> DataType {
        match self.data_type.as_str() {
            "ANALOG" => DataType::Analog,
            "DIGITAL" => DataType::Digital,
            _ => DataType::Unknown,
        }
    }

    /// Validate point number based on type
    pub fn is_valid_point_number(&self) -> bool {
        match self.get_point_type() {
            PointType::Input | PointType::Output => self.point_number >= 1 && self.point_number <= 64,
            PointType::Variable => self.point_number >= 1 && self.point_number <= 128,
            PointType::Unknown => false,
        }
    }

    /// Check if value is within configured bounds
    pub fn is_value_in_bounds(&self, value: f64) -> bool {
        let within_min = self.min_value.map_or(true, |min| value >= min);
        let within_max = self.max_value.map_or(true, |max| value <= max);
        within_min && within_max
    }

    /// Get collection interval in seconds
    pub fn get_collection_interval_secs(&self) -> u64 {
        self.collection_interval as u64
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PointType {
    Input,
    Output,
    Variable,
    Unknown,
}

impl PointType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PointType::Input => "INPUT",
            PointType::Output => "OUTPUT",
            PointType::Variable => "VARIABLE",
            PointType::Unknown => "UNKNOWN",
        }
    }

    pub fn max_point_number(&self) -> i32 {
        match self {
            PointType::Input | PointType::Output => 64,
            PointType::Variable => 128,
            PointType::Unknown => 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DataType {
    Analog,
    Digital,
    Unknown,
}

impl DataType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DataType::Analog => "ANALOG",
            DataType::Digital => "DIGITAL",
            DataType::Unknown => "UNKNOWN",
        }
    }
}
