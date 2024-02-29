use axum::{
    body::Body,
    http::{self, Request},
    middleware::Next,
    response::Response,
};

use crate::error::{Error, Result};

pub async fn require_auth(req: Request<Body>, next: Next) -> Result<Response> {
    let auth_header = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .unwrap_or("");
    let secret = option_env!("API_SECRET_KEY").unwrap_or("secret");
    if auth_header != secret {
        return Err(Error::Unauthorized);
    }

    Ok(next.run(req).await)
}
