# Webview API Server

This is a web application built using Rust and Axum. It provides a RESTful API for managing modbus registers and file uploads.

We used Rust because we wanted to build this API as a dll file so we can use it from the [T3000_Building_Automation_System](https://github.com/temcocontrols/T3000_Building_Automation_System) C++ code.

## Technologies Used

Rust: a systems programming language that runs blazingly fast, prevents segfaults, and guarantees thread safety.
Axum: a web framework for Rust that provides a simple and composable API for building web applications.
Sea-ORM: a database management system for Rust that provides an easy-to-use ORM for working with databases.

## Getting Started

To get started with the project, you'll need to have Rust and Cargo installed on your system. You can download Rust from the official website (https://www.rust-lang.org/) and follow the installation instructions.

# Build the project

We build the project as 32bit binary for Windows because it will be used in the T3000 C++ code which is 32bit.

bash`cargo build --target i686-pc-windows-msvc --release`

You will find the compiled binary in the `target/i686-pc-windows-msvc/release` directory.

# Run the server example

You can use this example to test the API before you ship it as a dll file.

bash`cargo run --example run_server --release`

# Run the unit tests

bash`cargo test -- --test-threads 1`

# Migration

Database migrations are handled by Sea ORM.

## Install Sea ORM CLI

bash`cargo install sea-orm-cli`

## Run migration

To run the migration, run the following command:

bash`sea-orm-cli migrate up`

## Add migration

To add a new migration, run the following command:

bash`sea-orm-cli migrate generate <migration_name>`

# Generate the Sea-ORM entities

If you change the database schema, you'll need to regenerate the Sea-ORM entities. To do this, run the following command:

bash`sea-orm-cli generate entity -o src/entity`
