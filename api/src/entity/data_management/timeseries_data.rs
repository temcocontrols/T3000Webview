use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "timeseries_data")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub monitoring_point_id: i32,
    pub timestamp: i64,
    pub value: String,
    pub quality: String,
    pub table_year: i32,
    pub created_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::monitoring_points::Entity",
        from = "Column::MonitoringPointId",
        to = "super::monitoring_points::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    MonitoringPoints,
}

impl Related<super::monitoring_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MonitoringPoints.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
