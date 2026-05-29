use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "TRENDLOG_POINT_SETS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = true, column_name = "id")]
    pub id: i32,

    #[sea_orm(column_name = "serial_number")]
    pub serial_number: i32,

    #[sea_orm(column_name = "set_name")]
    pub set_name: String,

    #[sea_orm(column_name = "selected_keys")]
    pub selected_keys: String,

    #[sea_orm(column_name = "point_tags")]
    pub point_tags: String,

    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<i64>,

    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
