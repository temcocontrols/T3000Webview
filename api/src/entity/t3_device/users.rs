// T3000 USERS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "USERS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "User_ID")]
    pub user_id: Option<String>,
    #[sea_orm(column_name = "User_Index")]
    pub user_index: Option<String>,
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "Name")]
    pub name: Option<String>,                   // C++ name[16]
    #[sea_orm(column_name = "Password")]
    pub password: Option<String>,               // C++ password[9] - should be hashed
    #[sea_orm(column_name = "Access_Level")]
    pub access_level: Option<i32>,              // C++ access_level (0-255)
    #[sea_orm(column_name = "Rights_Access")]
    pub rights_access: Option<i32>,             // C++ rights_access (bitfield)
    #[sea_orm(column_name = "Default_Panel")]
    pub default_panel: Option<i32>,
    #[sea_orm(column_name = "Default_Group")]
    pub default_group: Option<i32>,
    #[sea_orm(column_name = "Screen_Right")]
    pub screen_right: Option<String>,           // C++ screen_right[8] (bitfield as TEXT)
    #[sea_orm(column_name = "Program_Right")]
    pub program_right: Option<String>,          // C++ program_right[8] (bitfield as TEXT)
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
