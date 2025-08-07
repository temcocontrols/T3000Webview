use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "collection_status")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub point_id: Option<i32>,
    pub status: String,
    pub last_collection: Option<i64>,
    pub last_error: Option<String>,
    pub error_count: i32,
    pub total_collections: i32,
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
    #[sea_orm(
        belongs_to = "super::trend_points::Entity",
        from = "Column::PointId",
        to = "super::trend_points::Column::Id"
    )]
    TrendPoint,
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Device.def()
    }
}

impl Related<super::trend_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendPoint.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Get collection status enum
    pub fn get_status(&self) -> CollectionStatusType {
        match self.status.as_str() {
            "COLLECTING" => CollectionStatusType::Collecting,
            "STOPPED" => CollectionStatusType::Stopped,
            "ERROR" => CollectionStatusType::Error,
            "PAUSED" => CollectionStatusType::Paused,
            _ => CollectionStatusType::Unknown,
        }
    }

    /// Check if currently collecting
    pub fn is_collecting(&self) -> bool {
        matches!(self.get_status(), CollectionStatusType::Collecting)
    }

    /// Check if in error state
    pub fn is_error_state(&self) -> bool {
        matches!(self.get_status(), CollectionStatusType::Error)
    }

    /// Check if has consecutive errors above threshold
    pub fn has_too_many_errors(&self, threshold: i32) -> bool {
        self.error_count >= threshold
    }

    /// Get success rate as percentage
    pub fn get_success_rate(&self) -> f64 {
        if self.total_collections == 0 {
            0.0
        } else {
            let successful_collections = self.total_collections - self.error_count;
            (successful_collections as f64 / self.total_collections as f64) * 100.0
        }
    }

    /// Get time since last collection in seconds
    pub fn get_time_since_last_collection(&self) -> Option<i64> {
        self.last_collection.map(|last| {
            chrono::Utc::now().timestamp() - last
        })
    }

    /// Check if last collection was recent (within specified seconds)
    pub fn is_last_collection_recent(&self, max_age_seconds: i64) -> bool {
        self.get_time_since_last_collection()
            .map_or(false, |age| age <= max_age_seconds)
    }

    /// Get status color for UI display
    pub fn get_status_color(&self) -> &'static str {
        match self.get_status() {
            CollectionStatusType::Collecting => "green",
            CollectionStatusType::Stopped => "gray",
            CollectionStatusType::Error => "red",
            CollectionStatusType::Paused => "orange",
            CollectionStatusType::Unknown => "purple",
        }
    }

    /// Check if this is a device-level status (no specific point)
    pub fn is_device_level(&self) -> bool {
        self.point_id.is_none()
    }

    /// Check if this is a point-level status
    pub fn is_point_level(&self) -> bool {
        self.point_id.is_some()
    }

    /// Get human-readable status description
    pub fn get_status_description(&self) -> String {
        let base_desc = match self.get_status() {
            CollectionStatusType::Collecting => "Actively collecting data",
            CollectionStatusType::Stopped => "Collection stopped",
            CollectionStatusType::Error => "Collection failed",
            CollectionStatusType::Paused => "Collection paused",
            CollectionStatusType::Unknown => "Unknown status",
        };

        if let Some(error) = &self.last_error {
            format!("{}: {}", base_desc, error)
        } else {
            base_desc.to_string()
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CollectionStatusType {
    Collecting,
    Stopped,
    Error,
    Paused,
    Unknown,
}

impl CollectionStatusType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CollectionStatusType::Collecting => "COLLECTING",
            CollectionStatusType::Stopped => "STOPPED",
            CollectionStatusType::Error => "ERROR",
            CollectionStatusType::Paused => "PAUSED",
            CollectionStatusType::Unknown => "UNKNOWN",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "COLLECTING" => CollectionStatusType::Collecting,
            "STOPPED" => CollectionStatusType::Stopped,
            "ERROR" => CollectionStatusType::Error,
            "PAUSED" => CollectionStatusType::Paused,
            _ => CollectionStatusType::Unknown,
        }
    }
}
