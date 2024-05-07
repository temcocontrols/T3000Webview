use axum::{
    extract::{DefaultBodyLimit, Multipart, Query, State},
    middleware,
    routing::{get, post},
    Json, Router,
};

use sea_orm::{entity::prelude::*, Set, TryIntoModel};
use serde::{Deserialize, Serialize};

use std::{fs, io::Write};
use std::{fs::File, path::Path};

use crate::{auth::require_auth, entity::prelude::*};
use crate::{entity::files, utils::SPA_DIR};

use crate::{
    app_state::AppState,
    error::{Error, Result},
};

#[derive(Deserialize, Serialize, Debug)]
pub struct QueryParams {
    pub path: Option<String>,
}

pub fn file_routes() -> Router<AppState> {
    Router::new()
        .route("/files", get(get_files))
        .route("/files/:id", get(get_file_by_id).delete(delete_file))
        .route(
            "/upload",
            post(upload_file).layer(DefaultBodyLimit::max(1024 * 1000 * 300) /* 300 MB */),
        )
        .route_layer(middleware::from_fn(require_auth))
}

async fn upload_file(
    State(state): State<AppState>,
    Query(query_params): Query<QueryParams>,
    mut multipart: Multipart,
) -> Result<Json<files::Model>> {
    let field = multipart
        .next_field()
        .await
        .map_err(|error| Error::ServerError(error.to_string()))?;
    if field.is_none() {
        return Err(Error::BadRequest("No file field found".to_string()));
    }
    let field = field.unwrap();
    let filename = field.file_name();
    if filename.is_none() {
        return Err(Error::BadRequest("No file name found".to_string()));
    }
    let filename = filename.unwrap().to_string();

    let mime_type = mime_guess::from_path(&filename).first_or_octet_stream();

    let data = field
        .bytes()
        .await
        .map_err(|error| Error::ServerError(error.to_string()))?;
    let mut path_str: String = SPA_DIR.clone();
    let mut file_path = "/uploads/".to_string();
    if query_params.path.is_some() {
        file_path.push_str(&query_params.path.unwrap());
        file_path.push_str("/");
    }
    path_str.push_str(&file_path);

    let fs_path = Path::new(&path_str);
    if !fs_path.exists() {
        fs::create_dir_all(fs_path).map_err(|error| Error::ServerError(error.to_string()))?;
    }
    let mut new_filename = filename.clone();
    let mut i = 1;
    // Check if the file already exists and add a number to the end of the filename if it does
    while fs_path.join(&new_filename).exists() {
        let extension = match new_filename.rsplit('.').next() {
            Some(ext) => format!(".{}", ext),
            None => "".to_string(),
        };
        new_filename = format!(
            "{}-{}{}",
            filename.trim_end_matches(extension.as_str()),
            i,
            extension
        );
        i += 1;
    }
    let fs_path = Path::new(&path_str).join(&new_filename);
    let mut file = File::create(&fs_path).map_err(|error| Error::ServerError(error.to_string()))?;
    file.write_all(&data)
        .map_err(|error| Error::ServerError(error.to_string()))?;

    file_path.push_str(&new_filename);

    let model = Files::insert(files::ActiveModel {
        id: Default::default(),
        name: Set(filename.clone()),
        path: Set(file_path.clone()),
        mime_type: Set(mime_type.to_string()),
        ..Default::default()
    });

    let results = model
        .exec_with_returning(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(results.try_into_model().unwrap()))
}

pub async fn get_files(State(state): State<AppState>) -> Result<Json<Vec<files::Model>>> {
    let result = Files::find()
        .all(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?;

    Ok(Json(result))
}

pub async fn get_file_by_id(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Result<Json<files::Model>> {
    let the_file = Files::find_by_id(id)
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)?;

    Ok(Json(the_file))
}

pub async fn delete_file(State(state): State<AppState>) -> Result<Json<files::Model>> {
    let the_file = Files::find()
        .one(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))?
        .ok_or(Error::NotFound)?;

    // delete the file from disk
    let path_str: String = SPA_DIR.clone();
    let path = Path::new(&path_str).join(&the_file.path);
    fs::remove_file(&path).map_err(|error| Error::ServerError(error.to_string()))?;

    Files::delete_by_id(the_file.id)
        .exec(&state.conn)
        .await
        .map_err(|error| Error::DbError(error.to_string()))
        .unwrap();

    Ok(Json(the_file))
}
