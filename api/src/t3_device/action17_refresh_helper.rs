use axum::http::StatusCode;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use tracing::error;

use crate::entity::t3_device::{devices, protocol_settings};

pub async fn lookup_action17_target(
    db_connection: &DatabaseConnection,
    serial: i32,
) -> Result<(i32, i32), (StatusCode, String)> {
    let device = match devices::Entity::find()
        .filter(devices::Column::SerialNumber.eq(serial))
        .one(db_connection)
        .await
    {
        Ok(Some(device)) => device,
        Ok(None) => {
            error!("Device not found for serial: {}", serial);
            return Err((
                StatusCode::NOT_FOUND,
                format!("Device with serial {} not found", serial),
            ));
        }
        Err(e) => {
            error!("Database error querying device {}: {:?}", serial, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            ));
        }
    };

    let panel_id = match device.panel_number.or(device.panel_id).filter(|value| *value > 0) {
        Some(panel_id) => panel_id,
        None => {
            error!("Missing panelId for serial: {}", serial);
            return Err((
                StatusCode::CONFLICT,
                format!("Device with serial {} is missing panelId required for Action 17", serial),
            ));
        }
    };

    let object_instance = match protocol_settings::Entity::find()
        .filter(protocol_settings::Column::SerialNumber.eq(serial))
        .one(db_connection)
        .await
    {
        Ok(Some(settings)) => match settings.object_instance.filter(|value| *value > 0) {
            Some(object_instance) => object_instance,
            None => {
                error!("Missing object_instance in protocol settings for serial: {}", serial);
                return Err((
                    StatusCode::CONFLICT,
                    format!(
                        "Device with serial {} is missing objectinstance required for Action 17",
                        serial
                    ),
                ));
            }
        },
        Ok(None) => {
            error!("Protocol settings not found for serial: {}", serial);
            return Err((
                StatusCode::NOT_FOUND,
                format!("Protocol settings not found for serial {}", serial),
            ));
        }
        Err(e) => {
            error!("Database error querying protocol settings {}: {:?}", serial, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            ));
        }
    };

    Ok((panel_id, object_instance))
}