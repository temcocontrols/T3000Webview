use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "trend_data")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub point_id: i32,
    pub timestamp: i64,
    pub value: f64,
    pub quality: i32,
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::trend_points::Entity",
        from = "Column::PointId",
        to = "super::trend_points::Column::Id"
    )]
    TrendPoint,
}

impl Related<super::trend_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendPoint.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Get data quality enum
    pub fn get_quality(&self) -> DataQuality {
        match self.quality {
            0 => DataQuality::Good,
            1 => DataQuality::Bad,
            2 => DataQuality::Uncertain,
            _ => DataQuality::Unknown,
        }
    }

    /// Check if data quality is good
    pub fn is_good_quality(&self) -> bool {
        self.quality == 0
    }

    /// Get timestamp as DateTime
    pub fn get_datetime(&self) -> chrono::DateTime<chrono::Utc> {
        chrono::DateTime::from_timestamp(self.timestamp, 0)
            .unwrap_or_else(chrono::Utc::now)
    }

    /// Get age of data in seconds
    pub fn get_age_seconds(&self) -> i64 {
        chrono::Utc::now().timestamp() - self.timestamp
    }

    /// Check if data is recent (within specified seconds)
    pub fn is_recent(&self, max_age_seconds: i64) -> bool {
        self.get_age_seconds() <= max_age_seconds
    }

    /// Format value for display with appropriate precision
    pub fn format_value(&self, precision: Option<usize>) -> String {
        match precision {
            Some(p) => format!("{:.prec$}", self.value, prec = p),
            None => {
                // Auto-detect precision based on value magnitude
                if self.value.abs() < 0.01 {
                    format!("{:.4}", self.value)
                } else if self.value.abs() < 1.0 {
                    format!("{:.3}", self.value)
                } else if self.value.abs() < 100.0 {
                    format!("{:.2}", self.value)
                } else {
                    format!("{:.1}", self.value)
                }
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DataQuality {
    Good,
    Bad,
    Uncertain,
    Unknown,
}

impl DataQuality {
    pub fn as_str(&self) -> &'static str {
        match self {
            DataQuality::Good => "GOOD",
            DataQuality::Bad => "BAD",
            DataQuality::Uncertain => "UNCERTAIN",
            DataQuality::Unknown => "UNKNOWN",
        }
    }

    pub fn as_code(&self) -> i32 {
        match self {
            DataQuality::Good => 0,
            DataQuality::Bad => 1,
            DataQuality::Uncertain => 2,
            DataQuality::Unknown => -1,
        }
    }
}
