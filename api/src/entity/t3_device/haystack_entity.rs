use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "HAYSTACK_ENTITY")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "id")]
    pub id: String,

    #[sea_orm(column_name = "kind")]
    pub kind: String,

    #[sea_orm(column_name = "dis")]
    pub dis: Option<String>,

    #[sea_orm(column_name = "tags")]
    pub tags: String,

    #[sea_orm(column_name = "serial_number")]
    pub serial_number: Option<i32>,

    #[sea_orm(column_name = "point_table")]
    pub point_table: Option<String>,

    #[sea_orm(column_name = "point_index")]
    pub point_index: Option<String>,

    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
