use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "trend_logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub device_id: i32,
    pub trend_log_name: String,
    pub interval_seconds: i32,
    pub max_points: i32,
    pub is_active: i32,
    pub last_collected: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::devices::Entity",
        from = "Column::DeviceId",
        to = "super::devices::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Devices,
    #[sea_orm(has_many = "super::trend_log_points::Entity")]
    TrendLogPoints,
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Devices.def()
    }
}

impl Related<super::trend_log_points::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrendLogPoints.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
