// T3000 EMAIL_ALARMS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "EMAIL_ALARMS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Email_ID")]
    pub email_id: Option<i32>,
    #[sea_orm(column_name = "SMTP_Server")]
    pub smtp_server: Option<String>,
    #[sea_orm(column_name = "SMTP_Port")]
    pub smtp_port: Option<i32>,
    #[sea_orm(column_name = "Email_Address")]
    pub email_address: Option<String>,
    #[sea_orm(column_name = "User_Name")]
    pub user_name: Option<String>,
    #[sea_orm(column_name = "Password")]
    pub password: Option<String>,
    #[sea_orm(column_name = "Secure_Connection_Type")]
    pub secure_connection_type: Option<i32>,
    #[sea_orm(column_name = "To1_Addr")]
    pub to1_addr: Option<String>,
    #[sea_orm(column_name = "To2_Addr")]
    pub to2_addr: Option<String>,
    #[sea_orm(column_name = "To3_Addr")]
    pub to3_addr: Option<String>,
    #[sea_orm(column_name = "To4_Addr")]
    pub to4_addr: Option<String>,
    #[sea_orm(column_name = "Error_Code")]
    pub error_code: Option<i32>,
    #[sea_orm(column_name = "Enable")]
    pub enable: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
