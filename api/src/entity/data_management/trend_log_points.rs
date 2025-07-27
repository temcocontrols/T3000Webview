use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "trend_log_points")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub trend_log_id: i32,
    pub monitoring_point_id: i32,
    pub point_order: i32,
    pub created_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::trend_logs::Entity",
        from = "Column::TrendLogId",
        to = "super::trend_logs::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    TrendLogs,
    #[sea_orm(
        belongs_to = "super::monitoring_points::Entity",
        from = "Column::MonitoringPointId",
        to = "super::monitoring_points::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    MonitoringPoints,
}

impl Related<super::trend_logs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendLogs.def()
    }
}

impl Related<super::monitoring_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MonitoringPoints.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
