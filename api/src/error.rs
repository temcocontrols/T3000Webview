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

// Additional AppError type for T3 Device services
#[derive(Clone, Debug)]
pub enum AppError {
    DatabaseError(String),
    NotFound(String),
    ValidationError(String),
    InternalError(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::DatabaseError(msg) => write!(f, "Database Error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not Found: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Validation Error: {}", msg),
            AppError::InternalError(msg) => write!(f, "Internal Error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<sea_orm::DbErr> for AppError {
    fn from(err: sea_orm::DbErr) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

impl From<std::time::SystemTimeError> for AppError {
    fn from(err: std::time::SystemTimeError) -> Self {
        AppError::InternalError(format!("System time error: {}", err))
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        (status, message).into_response()
    }
}
