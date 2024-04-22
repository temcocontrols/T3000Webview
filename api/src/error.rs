use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Clone, Debug, Serialize, strum_macros::AsRefStr)]
#[serde(tag = "type", content = "data")]
pub enum Error {
    NotFound,
    DbError(String),
    Unauthorized,
    PermissionDenied,
    BadRequest(String),
}

// region:    --- Error Boilerplate
impl core::fmt::Display for Error {
    fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::result::Result<(), core::fmt::Error> {
        write!(fmt, "{self:?}")
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        println!("->> {:<12} - {self:?}", "INTO_RES");
        let response = match self {
            Self::NotFound => (StatusCode::NOT_FOUND, "Not Found".to_string()),
            Self::DbError(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Db Error: {}", err),
            ),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            Self::PermissionDenied => (StatusCode::FORBIDDEN, "Permission Denied".to_string()),
            Self::BadRequest(err) => (StatusCode::BAD_REQUEST, format!("Bad Request: {err}")),
        };

        response.into_response()
    }
}
