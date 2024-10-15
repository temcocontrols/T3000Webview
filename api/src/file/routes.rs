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

/// Struct to hold query parameters for file routes
#[derive(Deserialize, Serialize, Debug)]
pub struct QueryParams {
    pub path: Option<String>,
}

/// Function to define file routes
pub fn file_routes() -> Router<AppState> {
    Router::new()
        .route("/files", get(get_files))
        .route("/files/:id", get(get_file_by_id).delete(delete_file))
        .route(
            "/file",
            post(upload_file).layer(DefaultBodyLimit::max(1024 * 1000 * 300) /* 300 MB */),
        )
        .route_layer(middleware::from_fn(require_auth))
}

/// Async function to handle file uploads
async fn upload_file(
    State(state): State<AppState>,
    Query(query_params): Query<QueryParams>,
    mut multipart: Multipart,
) -> Result<Json<files::Model>> {
    let conn = state.conn.lock().await;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|error| Error::ServerError(error.to_string()))?
    {
        let filename = field.file_name();
        if filename.is_none() {
            continue;
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
        let mut file =
            File::create(&fs_path).map_err(|error| Error::ServerError(error.to_string()))?;
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
            .exec_with_returning(&*conn)
            .await
            .map_err(|error| Error::DbError(error.to_string()))?;

        return Ok(Json(results.try_into_model().unwrap()));
    }
    Err(Error::BadRequest("No file field found".to_string()))
}

// Asynchronously fetches all files from the database and returns them as JSON.
pub async fn get_files(State(state): State<AppState>) -> Result<Json<Vec<files::Model>>> {
    let conn = state.conn.lock().await;
    // Perform a query to find all files in the database.
    let result = Files::find()
        .all(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))?; // Handle any database errors.

    // Return the result as JSON.
    Ok(Json(result))
}

// Asynchronously fetches a specific file by its ID and returns it as JSON.
pub async fn get_file_by_id(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Result<Json<files::Model>> {
    let conn = state.conn.lock().await;
    // Perform a query to find the file by its ID.
    let the_file = Files::find_by_id(id)
        .one(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))? // Handle any database errors.
        .ok_or(Error::NotFound)?; // Return a NotFound error if the file does not exist.

    // Return the found file as JSON.
    Ok(Json(the_file))
}

// Asynchronously deletes a file from the database and the filesystem.
pub async fn delete_file(State(state): State<AppState>) -> Result<Json<files::Model>> {
    let conn = state.conn.lock().await;
    // Perform a query to find the first file in the database.
    let the_file = Files::find()
        .one(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))? // Handle any database errors.
        .ok_or(Error::NotFound)?; // Return a NotFound error if the file does not exist.

    // Construct the file path to delete from the filesystem.
    let path_str: String = SPA_DIR.clone(); // Get the directory path as a string.
    let path = Path::new(&path_str).join(&the_file.path); // Join the directory path with the file path.
    fs::remove_file(&path).map_err(|error| Error::ServerError(error.to_string()))?; // Delete the file and handle any filesystem errors.

    // Delete the file entry from the database by its ID.
    Files::delete_by_id(the_file.id)
        .exec(&*conn) // Use the database connection from the application state.
        .await
        .map_err(|error| Error::DbError(error.to_string()))?; // Handle any database errors.

    // Return the deleted file as JSON.
    Ok(Json(the_file))
}
