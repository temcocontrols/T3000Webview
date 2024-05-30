use axum::{
    body::Body,
    http::{self, Request},
    middleware::Next,
    response::Response,
};

use crate::error::{Error, Result};

/// Middleware function that requires authentication.
///
/// This function checks the `Authorization` header of the request for a valid API secret key.
/// If the header is not present or the secret key is incorrect, it returns a `Unauthorized` error.
/// Otherwise, it calls the next middleware in the chain.
///
/// # Arguments
///
/// * `req` - The incoming request.
/// * `next` - The next middleware in the chain.
///
/// # Returns
///
/// A `Result` containing the response from the next middleware in the chain, or a `Unauthorized` error.
pub async fn require_auth(req: Request<Body>, next: Next) -> Result<Response> {
    // Get the `Authorization` header from the request
    let auth_header = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .unwrap_or("");

    // Get the API secret key from the environment variable, or use a default value if not set
    let secret = option_env!("API_SECRET_KEY").unwrap_or("secret");

    // Check if the `Authorization` header matches the secret key
    if auth_header != secret {
        // If not, return a `Unauthorized` error
        return Err(Error::Unauthorized);
    }

    // If the `Authorization` header is correct, call the next middleware in the chain
    Ok(next.run(req).await)
}
