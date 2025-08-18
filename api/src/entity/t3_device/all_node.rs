// T3000 ALL_NODE Entity - Exact match to T3000.db ALL_NODE table
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ALL_NODE")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub Serial_ID: i32,                        // C++ Serial_ID (primary key)

    pub MainBuilding_Name: Option<String>,      // C++ MainBuilding_Name
    pub Building_Name: Option<String>,          // C++ Building_Name (network/subnet)
    pub Floor_Name: Option<String>,             // C++ Floor_name
    pub Room_Name: Option<String>,              // C++ Room_name
    pub Panel_Number: Option<i32>,              // C++ Panel_Number
    pub Network_Number: Option<i32>,            // C++ Network_Number
    pub Product_Name: Option<String>,           // C++ Product_Name
    pub Product_Class_ID: Option<i32>,          // C++ Product_class_ID
    pub Product_ID: Option<i32>,                // C++ Product_ID
    pub Screen_Name: Option<String>,            // C++ Screen_Name
    pub Bautrate: Option<String>,               // C++ Bautrate (IP address or baud rate)
    pub Address: Option<String>,                // C++ Address
    pub Register: Option<String>,               // C++ Register
    pub Function: Option<String>,               // C++ Function
    pub Description: Option<String>,            // C++ Description
    pub High_Units: Option<String>,             // C++ High_Units
    pub Low_Units: Option<String>,              // C++ Low_Units
    pub Update_Field: Option<String>,           // C++ Update
    pub Status: Option<String>,                 // C++ Status
    pub Range_Field: Option<String>,            // C++ Range
    pub Calibration: Option<String>,            // C++ Calibration
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
