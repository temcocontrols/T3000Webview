# REST API

HTTP REST API for device data access and control.

## Base URL
``
http://localhost:9103/api
``

## Endpoints

### Devices
- GET /t3_device/devices - List all devices
- GET /t3_device/devices/{serial} - Get device details
- GET /t3_device/devices/{serial}/table/{table} - Get point data

### Data Points
- GET /t3_device/devices/{serial}/inputs - Get inputs
- GET /t3_device/devices/{serial}/outputs - Get outputs
- POST /t3_device/devices/{serial}/batch_save_inputs - Save inputs

### FFI Calls
- POST /t3_device/ffi/call - Execute FFI function

## Authentication
Currently no authentication required (development mode).

## Response Format
JSON format with status codes.

