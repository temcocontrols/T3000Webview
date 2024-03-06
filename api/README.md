# Webview API Server

Welcome to the backend server for the webview client application. This server is the cornerstone that delivers essential data to the client, ensuring a seamless user experience. It is built with Rust, a language celebrated for its performance and reliability, which means you'll need to have both Rust and Cargo installed on your system to compile and run this server.

Before diving into the code, please ensure that you have the latest versions of Rust and Cargo. This will not only facilitate a smoother setup but also guarantee that you're utilizing the most recent features and optimizations offered by the Rust ecosystem.

# Bulid command for smaller size

bash`cargo +nightly build -Z build-std=std,panic_abort -Z build-std-features=panic_immediate_abort --target x86_64-pc-windows-msvc --release`

# Run server example

cargo run --example run_server --release

# Database & Migration

We have a mixed approach for database queries in this project. Some of them are handled by Sea ORM, while others are done with Sqlx. In this section, we will explain how to work with both of these libraries.

## Create database

sqlx database create

## Run migration

sqlx migrate run

## Add migration

sqlx migrate add -r <migration_name>

## Generate the Sea-ORM entities

sea-orm-cli generate entity -o src/entity
