use axum::extract::{Query, State};
use reqwest::{
    header::{HeaderMap, HeaderValue},
    Body, Client, Url,
};
use tokio_cron_scheduler::{Job, JobScheduler, JobSchedulerError};

use crate::{
    app_state::app_state,
    entity::{modbus_register, user},
    modbus_register::{models::ModbusRegisterQueryParams, queries::list},
    user::routes::get_user,
    utils::REMOTE_API_URL,
};

pub async fn start_data_sync_scheduler() -> Result<(), JobSchedulerError> {
    let sched = JobScheduler::new().await?;

    // Add async job
    sched
        .add(Job::new_async("0 */1 * * * *", |_uuid, _l| {
            Box::pin(async move {
                push_local_changes().await.unwrap_or_default();
            })
        })?)
        .await?;

    // Start the scheduler
    sched.start().await?;

    Ok(())
}

async fn push_local_changes() -> Result<(), Box<dyn std::error::Error>> {
    println!("Pushing local changes");
    let conn = app_state().await?;

    let user = get_user(State(conn.clone())).await?;
    if user.as_ref().is_none() {
        return Ok(());
    }
    let user = user.as_ref().unwrap();

    let params = ModbusRegisterQueryParams {
        local_only: Some(true),
        filter: None,
        order_by: None,
        limit: Some(100),
        offset: None,
        order_dir: None,
    };
    let result = list(State(conn), Query(params)).await;
    if result.is_err() {
        return Ok(());
    }
    let result = result.unwrap();
    // loop in the result and send the update request
    for item in result.data.iter() {
        update_item_request(&user, item).await?;
    }

    Ok(())
}

async fn update_item_request(
    user: &user::Model,
    item: &modbus_register::Model,
) -> Result<(), Box<dyn std::error::Error>> {
    let url =
        Url::parse(format!("{}/modbus-registers/{}", REMOTE_API_URL.as_str(), item.id).as_str())
            .unwrap();

    let mut headers = HeaderMap::new();
    headers.append(
        "auth",
        HeaderValue::from_str(user.token.clone().unwrap().as_str()).unwrap(),
    );
    headers.append(
        "content-type",
        HeaderValue::from_str("application/json").unwrap(),
    );

    let body = Body::from(serde_json::to_string(item)?);

    let client = Client::new();

    let res = client.patch(url).headers(headers).body(body).send().await;

    match res {
        Ok(response) => {
            // Handle successful response
            println!("Status: {}", response.status());
            println!("Response: {}", response.text().await?);
        }
        Err(err) => {
            println!("Error: {}", err);
        }
    }

    Ok(())
}
