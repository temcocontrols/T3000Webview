// T3000 COMMUNICATION_SETTINGS Entity
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Default)]
#[sea_orm(table_name = "COMMUNICATION_SETTINGS")]
#[serde(rename_all = "PascalCase")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "SerialNumber")]
    pub serial_number: i32,

    #[sea_orm(column_name = "COM0_Config")]
    pub com0_config: Option<i32>,
    #[sea_orm(column_name = "COM1_Config")]
    pub com1_config: Option<i32>,
    #[sea_orm(column_name = "COM2_Config")]
    pub com2_config: Option<i32>,
    #[sea_orm(column_name = "COM_Baudrate0")]
    pub com_baudrate0: Option<i32>,
    #[sea_orm(column_name = "COM_Baudrate1")]
    pub com_baudrate1: Option<i32>,
    #[sea_orm(column_name = "COM_Baudrate2")]
    pub com_baudrate2: Option<i32>,
    #[sea_orm(column_name = "UART_Parity0")]
    pub uart_parity0: Option<i32>,
    #[sea_orm(column_name = "UART_Parity1")]
    pub uart_parity1: Option<i32>,
    #[sea_orm(column_name = "UART_Parity2")]
    pub uart_parity2: Option<i32>,
    #[sea_orm(column_name = "UART_Stopbit0")]
    pub uart_stopbit0: Option<i32>,
    #[sea_orm(column_name = "UART_Stopbit1")]
    pub uart_stopbit1: Option<i32>,
    #[sea_orm(column_name = "UART_Stopbit2")]
    pub uart_stopbit2: Option<i32>,
    #[sea_orm(column_name = "Fix_COM_Config")]
    pub fix_com_config: Option<i32>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updated_at")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
