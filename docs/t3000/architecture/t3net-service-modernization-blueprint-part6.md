# T3Net Service Modernization Blueprint - Part 6 (Code Scaffold Mapping)

Date: 2026-05-13
Status: Initial scaffold delivered

## What was added

The following implementation scaffold was created in t3net/T3Net:

- Models/Contracts/DeviceContracts.cs
- Models/Contracts/ModeContracts.cs
- Services/Device/IDeviceProvider.cs
- Services/Device/LegacyFfiProvider.cs
- Services/Device/NativeBacnetProvider.cs
- Services/Device/DeviceProviderRouter.cs
- Services/Mode/IModeService.cs
- Services/Mode/ModeService.cs
- Workers/PollingWorker.cs
- Workers/HealthWorker.cs
- Controllers/V1/ModeController.cs
- Controllers/V1/HealthController.cs

## Why these first

This gives the team a compile-safe backbone for:
- adapter routing (legacy vs native)
- runtime mode behavior
- worker lifecycle and cadence
- v1 API entry points for mode and health

## Next coding tasks

1) Wire all services in Program.cs DI.
2) Add appsettings keys:
- T3000:RuntimeMode
- T3000:DeviceAdapterMode

3) Connect workers to repository layer once schema scripts are added.
4) Replace provider placeholders with real BACnet and/or FFI bridge logic.
5) Emit SignalR events from workers when cycle and health state changes.

## Suggested immediate verification

- Run T3Net and call:
  - GET /api/v1/mode
  - POST /api/v1/mode/switch
  - GET /api/v1/health/summary

- Confirm workers start without exceptions and log periodic ticks.
