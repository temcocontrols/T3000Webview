// T3000 GRAPHIC_LABELS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "GRAPHIC_LABELS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Label_ID")]
    pub label_id: Option<i32>,
    #[sea_orm(column_name = "Label_Index")]
    pub label_index: Option<i32>,
    #[sea_orm(column_name = "Label_Status")]
    pub label_status: Option<i32>,
    #[sea_orm(column_name = "Screen_Index")]
    pub screen_index: Option<i32>,
    #[sea_orm(column_name = "Main_Panel")]
    pub main_panel: Option<i32>,
    #[sea_orm(column_name = "Sub_Panel")]
    pub sub_panel: Option<i32>,
    #[sea_orm(column_name = "Point_Type")]
    pub point_type: Option<i32>,
    #[sea_orm(column_name = "Point_Number")]
    pub point_number: Option<i32>,
    #[sea_orm(column_name = "Point_X")]
    pub point_x: Option<i32>,
    #[sea_orm(column_name = "Point_Y")]
    pub point_y: Option<i32>,
    #[sea_orm(column_name = "Text_Color")]
    pub text_color: Option<i32>,
    #[sea_orm(column_name = "Display_Type")]
    pub display_type: Option<i32>,
    #[sea_orm(column_name = "Icon_Size")]
    pub icon_size: Option<i32>,
    #[sea_orm(column_name = "Icon_Place")]
    pub icon_place: Option<i32>,
    #[sea_orm(column_name = "Icon_Name_1")]
    pub icon_name_1: Option<String>,
    #[sea_orm(column_name = "Icon_Name_2")]
    pub icon_name_2: Option<String>,
    #[sea_orm(column_name = "Network")]
    pub network: Option<i32>,
    #[sea_orm(column_name = "Label_Name")]
    pub label_name: Option<String>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
