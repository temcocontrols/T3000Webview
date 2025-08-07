use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "trendlog_device")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub device_id: i32,
    pub device_name: String,
    pub ip_address: Option<String>,
    pub device_type: String,
    pub serial_number: Option<i32>,
    pub is_active: i32,
    pub last_seen: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::trend_points::Entity")]
    TrendPoints,
    #[sea_orm(has_many = "super::collection_status::Entity")]
    CollectionStatus,
}

impl Related<super::trend_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendPoints.def()
    }
}

impl Related<super::collection_status::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CollectionStatus.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Check if device is currently active
    pub fn is_device_active(&self) -> bool {
        self.is_active == 1
    }

    /// Get device type enum
    pub fn get_device_type(&self) -> DeviceType {
        match self.device_type.as_str() {
            "T3000" => DeviceType::T3000,
            "SUB_PANEL" => DeviceType::SubPanel,
            _ => DeviceType::Unknown,
        }
    }

    /// Check if device was seen recently (within last 5 minutes)
    pub fn is_recently_seen(&self) -> bool {
        if let Some(last_seen) = self.last_seen {
            let now = chrono::Utc::now().timestamp();
            now - last_seen < 300 // 5 minutes
        } else {
            false
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DeviceType {
    T3000,
    SubPanel,
    Unknown,
}

impl DeviceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeviceType::T3000 => "T3000",
            DeviceType::SubPanel => "SUB_PANEL",
            DeviceType::Unknown => "UNKNOWN",
        }
    }
}
