# Message 10: SAVE_LIBRARY_DATA

<!-- USER-GUIDE -->
The SAVE_LIBRARY_DATA message saves HVAC equipment library data to a JSON file on the server.

**When to Use:**
- Saving HVAC equipment library
- Persisting equipment configurations
- Backing up library data

<!-- TECHNICAL -->

## Overview

**Action:** `SAVE_LIBRARY_DATA` (10)
**Direction:** Frontend → Backend
**Location:** BacnetWebView.cpp (around line 2969)
**Purpose:** Save HVAC library JSON file

## Request Format

**JSON Structure:**
```json
{
  "action": "SAVE_LIBRARY_DATA",
  "data": {
    "equipment": [
      {
        "name": "AHU-1",
        "type": "Air Handler",
        "inputs": [...]
      }
    ]
  }
}
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | object | Yes | Complete library data structure |

## Response Format

**JSON Structure:**
```json
{
  "action": "SAVE_LIBRAY_DATA_RES",
  "status": true
}
```

## Implementation

```cpp
case SAVE_LIBRAY_DATA:
{
    CString temp_lib_file = _T("hvac_library.json");
    des_lib_file = image_fordor + _T("\\") + temp_lib_file;
    const std::string file_output = Json::writeString(builder, json["data"]);

    CFile file;
    CString file_temp_cs(file_output.c_str());
    file.Open(des_lib_file, CFile::modeCreate | CFile::modeWrite, NULL);
    file.Write(file_temp_cs, file_temp_cs.GetLength() * 2);
    file.Close();

    Json::Value tempjson;
    tempjson["action"] = "SAVE_LIBRAY_DATA_RES";
    tempjson["status"] = true;

    const std::string output = Json::writeString(builder, tempjson);
    outmsg = CString(output.c_str());
}
```

**File Location:** `hvac_library.json`

## Frontend Usage

```typescript
const saveLibrary = async (libraryData: any) => {
  const message = {
    action: 'SAVE_LIBRARY_DATA',
    data: libraryData
  };

  sendMessage(JSON.stringify(message));

  return new Promise((resolve, reject) => {
    const handler = (data: string) => {
      const response = JSON.parse(data);
      if (response.action === 'SAVE_LIBRAY_DATA_RES') {
        resolve(response.status);
        webSocket.off('message', handler);
      }
    };
    webSocket.on('message', handler);
  });
};
```

## See Also

- [SAVE_NEW_LIBRARY_DATA](message-14-save-new-library-data.md) - Save T3 library
