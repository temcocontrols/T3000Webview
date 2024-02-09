// @generated automatically by Diesel CLI.

diesel::table! {
    modbus_register_items (id) {
        id -> Integer,
        register_address -> Integer,
        operation -> Nullable<Text>,
        register_length -> Integer,
        register_name -> Nullable<Text>,
        data_format -> Text,
        description -> Nullable<Text>,
        device_name -> Text,
        status -> Text,
        unit -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}
