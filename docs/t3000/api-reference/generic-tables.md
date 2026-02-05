# Generic Tables API

<!-- USER-GUIDE -->

## Overview

The Generic Tables API provides access to device configuration tables including arrays, user management, graphics screens, alarms, and unit conversions.

## Common Operations

### Get Table Records

```typescript
const arrays = await fetch('http://localhost:9103/api/t3_device/arrays?device_id=1')
  .then(res => res.json());
```

### Get Users

```typescript
const users = await fetch('http://localhost:9103/api/t3_device/users?device_id=1')
  .then(res => res.json());
```

### Update User

```typescript
await fetch('http://localhost:9103/api/t3_device/users/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'newpassword',
    access_level: 255
  })
});
```

---

<!-- TECHNICAL -->

#### Generic Table Endpoints

##### GET /api/t3_device/:table

**Description**: Get records from any table

**Parameters**:
- `table` (path, string) - Table name (arrays, users, graphics, alarms, etc.)
- `device_id` (query, integer) - Device ID

**Supported Tables**:
- `arrays`, `users`, `graphics`, `alarms`, `units`, `conversions`, `custom_units`

**Request:**
```http
GET /api/t3_device/arrays?device_id=1 HTTP/1.1
```

**Response:**
```json
[
  {
    "id": 1,
    "device_id": 1,
    "label": "Zone Setpoints",
    "values": [70, 72, 68, 75]
  }
]
```

**Used By**: [GenericTableView.tsx](src/t3-react/features/tables/components/GenericTableView.tsx)

---

##### GET /api/t3_device/:table/count

**Description**: Get record count for table

**Parameters**:
- `table` (path, string) - Table name
- `device_id` (query, integer) - Device ID

**Request:**
```http
GET /api/t3_device/arrays/count?device_id=1 HTTP/1.1
```

**Response:**
```json
{
  "count": 24
}
```

---

##### User Management

**GET /api/t3_device/users**

Get all users for a device.

**PUT /api/t3_device/users/:id**

Update user credentials and permissions.

**POST /api/t3_device/users**

Create new user.

**DELETE /api/t3_device/users/:id**

Delete user.

---

##### Graphics Screens

**GET /api/t3_device/graphics**

Get all graphics screens.

**PUT /api/t3_device/graphics/:id**

Update graphics screen configuration.

---

##### Alarms

**GET /api/t3_device/alarms**

Get all alarm definitions.

**PUT /api/t3_device/alarms/:id**

Update alarm configuration.

---

#### Database Schema

```sql
CREATE TABLE ARRAYS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    label TEXT,
    values TEXT,  -- JSON array
    FOREIGN KEY (device_id) REFERENCES DEVICES(id) ON DELETE CASCADE
);

CREATE TABLE USERS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT,
    access_level INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES DEVICES(id) ON DELETE CASCADE
);

CREATE TABLE GRAPHICS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    label TEXT,
    screen_data TEXT,  -- JSON
    FOREIGN KEY (device_id) REFERENCES DEVICES(id) ON DELETE CASCADE
);
```
