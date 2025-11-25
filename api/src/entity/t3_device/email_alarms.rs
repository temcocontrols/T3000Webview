// T3000 EMAIL_ALARMS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "EMAIL_ALARMS")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "Email_ID")]
    pub email_id: Option<String>,
    #[sea_orm(column_name = "Panel")]
    pub panel: Option<String>,
    #[sea_orm(column_name = "SMTP_Type")]
    pub smtp_type: Option<i32>,                 // 0=IP, 1=domain
    #[sea_orm(column_name = "SMTP_IP")]
    pub smtp_ip: Option<String>,                // "192.168.1.1"
    #[sea_orm(column_name = "SMTP_Domain")]
    pub smtp_domain: Option<String>,            // C++ smtp_domain[40]
    #[sea_orm(column_name = "SMTP_Port")]
    pub smtp_port: Option<i32>,
    #[sea_orm(column_name = "Email_Address")]
    pub email_address: Option<String>,          // C++ email_address[60]
    #[sea_orm(column_name = "User_Name")]
    pub user_name: Option<String>,              // C++ user_name[60]
    #[sea_orm(column_name = "Password")]
    pub password: Option<String>,               // C++ password[20]
    #[sea_orm(column_name = "Secure_Connection_Type")]
    pub secure_connection_type: Option<i32>,    // 0=NULL, 1=SSL, 2=TLS
    #[sea_orm(column_name = "To1_Addr")]
    pub to1_addr: Option<String>,               // C++ To1Addr[60]
    #[sea_orm(column_name = "To2_Addr")]
    pub to2_addr: Option<String>,               // C++ To2Addr[60]
    #[sea_orm(column_name = "Error_Code")]
    pub error_code: Option<i32>,
    #[sea_orm(column_name = "Status")]
    pub status: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
