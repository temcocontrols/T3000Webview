use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

// Define a custom result type that uses the custom Error type.
pub type Result<T> = core::result::Result<T, Error>;

// Define the custom Error enum with various error types.
#[derive(Clone, Debug, Serialize, strum_macros::AsRefStr)]
#[serde(tag = "type", content = "data")]
pub enum Error {
    NotFound,
    DbError(String),
    Unauthorized,
    PermissionDenied,
    BadRequest(String),
    ServerError(String),
}

// Implement the Display trait for the Error enum to enable formatted output.
impl core::fmt::Display for Error {
    fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::result::Result<(), core::fmt::Error> {
        write!(fmt, "{self:?}")
    }
}

// Implement the standard Error trait for the Error enum.
impl std::error::Error for Error {}

// Implement the IntoResponse trait for the Error enum to convert it into an HTTP response.
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        // Print the error type for debugging purposes.
        println!("->> {:<12} - {self:?}", "INTO_RES");

        // Match the error type to generate the appropriate HTTP response.
        let response = match self {
            Self::NotFound => (StatusCode::NOT_FOUND, "Not Found".to_string()),
            Self::DbError(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Db Error: {}", err),
            ),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            Self::PermissionDenied => (StatusCode::FORBIDDEN, "Permission Denied".to_string()),
            Self::BadRequest(err) => (StatusCode::BAD_REQUEST, format!("Bad Request: {err}")),
            Self::ServerError(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Server Error: {}", err),
            ),
        };

        // Convert the tuple (StatusCode, String) into an HTTP response.
        response.into_response()
    }
}
