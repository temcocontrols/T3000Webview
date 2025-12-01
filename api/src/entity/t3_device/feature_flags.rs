// T3000 FEATURE_FLAGS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "FEATURE_FLAGS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "User_Name_Enable")]
    pub user_name_enable: Option<i32>,
    #[sea_orm(column_name = "Customer_Unite_Enable")]
    pub customer_unite_enable: Option<i32>,
    #[sea_orm(column_name = "LCD_Backlight_Time")]
    pub lcd_backlight_time: Option<i32>,
    #[sea_orm(column_name = "LCD_Display_Time")]
    pub lcd_display_time: Option<i32>,
    #[sea_orm(column_name = "LCD_Login_Time")]
    pub lcd_login_time: Option<i32>,
    #[sea_orm(column_name = "Plug_N_Play")]
    pub plug_n_play: Option<i32>,
    #[sea_orm(column_name = "Refresh_Flash_Timer")]
    pub refresh_flash_timer: Option<i32>,
    #[sea_orm(column_name = "Network_Health")]
    pub network_health: Option<i32>,
    #[sea_orm(column_name = "Debug_Enable")]
    pub debug_enable: Option<i32>,
    #[sea_orm(column_name = "Debug_Mode")]
    pub debug_mode: Option<i32>,
    #[sea_orm(column_name = "Screen_Type")]
    pub screen_type: Option<i32>,
    #[sea_orm(column_name = "Schedule_Debug")]
    pub schedule_debug: Option<i32>,
    #[sea_orm(column_name = "Program_Debug")]
    pub program_debug: Option<i32>,
    #[sea_orm(column_name = "RTC_Battery_Status")]
    pub rtc_battery_status: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
