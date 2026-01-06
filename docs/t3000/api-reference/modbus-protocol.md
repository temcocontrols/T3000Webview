# Modbus Protocol

Modbus TCP/IP and RTU protocol support for legacy devices.

## Modbus TCP

**Connection:**
- IP Address: Device IP
- Port: 502 (standard)
- Protocol: Modbus TCP

**Function Codes:**
- 0x03: Read Holding Registers
- 0x04: Read Input Registers
- 0x06: Write Single Register
- 0x10: Write Multiple Registers

## Modbus RTU

**Serial Settings:**
- Baud Rate: 9600, 19200, 38400
- Data Bits: 8
- Parity: None, Even, Odd
- Stop Bits: 1, 2

**Slave ID Range:** 1-247

## Register Mapping

| Register | Type | Description |
|----------|------|-------------|
| 1-100 | Input | Analog inputs |
| 101-200 | Output | Analog outputs |
| 201-300 | Variable | Variables |

## Error Codes
- 0x01: Illegal Function
- 0x02: Illegal Data Address
- 0x03: Illegal Data Value
- 0x04: Slave Device Failure

