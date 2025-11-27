// T3000 EXTIO_DEVICES Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "EXTIO_DEVICES")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "ExtIO_ID")]
    pub extio_id: Option<i32>,
    #[sea_orm(column_name = "Product_ID")]
    pub product_id: Option<i32>,
    #[sea_orm(column_name = "Port")]
    pub port: Option<i32>,
    #[sea_orm(column_name = "Modbus_ID")]
    pub modbus_id: Option<i32>,
    #[sea_orm(column_name = "Last_Contact_Time")]
    pub last_contact_time: Option<i32>,
    #[sea_orm(column_name = "Input_Start")]
    pub input_start: Option<i32>,
    #[sea_orm(column_name = "Input_End")]
    pub input_end: Option<i32>,
    #[sea_orm(column_name = "Output_Start")]
    pub output_start: Option<i32>,
    #[sea_orm(column_name = "Output_End")]
    pub output_end: Option<i32>,
    #[sea_orm(column_name = "Enable")]
    pub enable: Option<i32>,
    #[sea_orm(column_name = "ExtIO_SerialNumber")]
    pub extio_serial_number: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
