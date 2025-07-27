use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "devices")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_name: String,
    pub device_type: String,
    pub ip_address: Option<String>,
    pub port: Option<i32>,
    #[sea_orm(unique)]
    pub device_id: i32,
    pub is_active: i32,
    pub last_seen: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::monitoring_points::Entity")]
    MonitoringPoints,
    #[sea_orm(has_many = "super::trend_logs::Entity")]
    TrendLogs,
}

impl Related<super::monitoring_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MonitoringPoints.def()
    }
}

impl Related<super::trend_logs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendLogs.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
