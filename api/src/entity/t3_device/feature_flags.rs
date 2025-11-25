// T3000 FEATURE_FLAGS Entity (one-to-one with DEVICES)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "FEATURE_FLAGS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "User_Name_Enable")]
    pub user_name_enable: Option<i32>,          // 0=no, 1=disable, 2=enable
    #[sea_orm(column_name = "Customer_Unite_Enable")]
    pub customer_unite_enable: Option<i32>,     // 0=no, 1=enable
    #[sea_orm(column_name = "Enable_Panel_Name")]
    pub enable_panel_name: Option<i32>,         // 0=disabled, 1=enabled
    #[sea_orm(column_name = "LCD_Display")]
    pub lcd_display: Option<i32>,               // 0=hide, 1=show
    #[sea_orm(column_name = "LCD_Display_Type")]
    pub lcd_display_type: Option<i32>,
    #[sea_orm(column_name = "LCD_Point_Type")]
    pub lcd_point_type: Option<i32>,
    #[sea_orm(column_name = "LCD_Point_Number")]
    pub lcd_point_number: Option<i32>,
    #[sea_orm(column_name = "LCD_BACnet_Instance")]
    pub lcd_bacnet_instance: Option<i32>,
    #[sea_orm(column_name = "Enable_Plug_N_Play")]
    pub enable_plug_n_play: Option<i32>,
    #[sea_orm(column_name = "Refresh_Flash_Timer")]
    pub refresh_flash_timer: Option<i32>,
    #[sea_orm(column_name = "Reset_Default")]
    pub reset_default: Option<i32>,             // write 88=reset, 77=restore
    #[sea_orm(column_name = "Debug")]
    pub debug: Option<i32>,
    #[sea_orm(column_name = "Webview_JSON_Flash")]
    pub webview_json_flash: Option<i32>,        // 0=old way, 2=new JSON way
    #[sea_orm(column_name = "Write_Flash")]
    pub write_flash: Option<i32>,               // 0=disabled, non-0=enabled
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
