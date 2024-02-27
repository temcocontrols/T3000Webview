use axum::extract::State;
use axum::Json;
use sea_orm::entity::prelude::*;

use crate::app_state::AppState;
use crate::entity::modbus_register_settings::Entity as Setting;
use crate::entity::modbus_register_settings::Model as SettingModel;
use crate::error::{Error, Result};

// Handler to get all records
pub async fn get_all(State(state): State<AppState>) -> Result<Json<Vec<SettingModel>>> {
    let results = Setting::find().all(&state.sea_orm_conn).await;
    match results {
        Ok(items) => Ok(Json(items)),
        Err(error) => Err(Error::DbError(error.to_string())),
    }
}

// // Handler to get a specific record
// async fn get_one(
//     Path(name): Path<String>,
//     db: Extension<Database>,
// ) -> Result<Json<Setting>, http::StatusCode> {
//     let result = Setting::find_by_id(name)
//         .one(&db.0)
//         .await
//         .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;
//     match result {
//         Some(model) => Ok(Json(model)),
//         None => Err(http::StatusCode::NOT_FOUND),
//     }
// }

// // Handler to create a new record
// async fn create(
//     new_model: Json<Setting>,
//     db: Extension<Database>,
// ) -> Result<Json<Setting>, http::StatusCode> {
//     let mut model = new_model.into_inner();
//     model
//         .save(&db.0)
//         .await
//         .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;
//     Ok(Json(model))
// }

// // Handler to delete a record
// async fn delete(Path(name): Path<String>, db: Extension<Database>) -> Result<(), http::StatusCode> {
//     let model = Setting::find_by_id(name)
//         .one(&db.0)
//         .await
//         .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;
//     match model {
//         Some(mut model) => {
//             model
//                 .delete(&db.0)
//                 .await
//                 .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;
//             Ok(())
//         }
//         None => Err(http::StatusCode::NOT_FOUND),
//     }
// }
