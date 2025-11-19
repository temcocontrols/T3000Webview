# 🚨 CRITICAL: Action 3 (UPDATE_ENTRY) Field Limitations

## Major Finding

**Action 3 (UPDATE_ENTRY) does NOT support updating `fullLabel`, `label`, `range`, or most other fields!**

This is a **critical limitation** in the C++ implementation that affects API design.

---

## C++ Code Analysis (BacnetWebView.cpp)

### What C++ Actually Checks for UPDATE_ENTRY

```cpp
case WEBVIEW_MESSAGE_TYPE::UPDATE_ENTRY:
{
    int panel_id = json.get("panelId", Json::nullValue).asInt();
    int entry_index = json.get("entryIndex", Json::nullValue).asInt();
    int entry_type = json.get("entryType", Json::nullValue).asInt();
    const std::string field = json.get("field", Json::nullValue).asString();

    switch (entry_type)
    {
    case BAC_IN:  // INPUTS
        if (field.compare("control") == 0) {
            m_Input_data.at(entry_index).control = json["value"].asInt();
        }
        else if (field.compare("value") == 0) {
            m_Input_data.at(entry_index).value = json["value"].asFloat() * 1000;
        }
        else if (field.compare("auto_manual") == 0) {
            m_Input_data.at(entry_index).auto_manual = json["value"].asInt();
        }
        // ⚠️ NO OTHER FIELDS ARE CHECKED!
        // If you pass "fullLabel" or "label", C++ silently ignores it!
        break;

    case BAC_OUT:  // OUTPUTS
        // Same 3 fields only
        break;

    case BAC_VAR:  // VARIABLES
        // Same 3 fields only
        break;
    }
}
```

---

## Supported Fields by Entry Type

### ✅ BAC_IN (Inputs) - Only 3 Fields

| Field Name | Type | Supported by Action 3 | Supported by Action 16 |
|------------|------|----------------------|------------------------|
| `control` | int | ✅ YES | ✅ YES |
| `value` | float | ✅ YES | ✅ YES |
| `auto_manual` | int | ✅ YES | ✅ YES |
| `description` / `fullLabel` | string | ❌ **NO** | ✅ YES |
| `label` | string | ❌ **NO** | ✅ YES |
| `range` | int | ❌ **NO** | ✅ YES |
| `filter` | int | ❌ **NO** | ✅ YES |
| `digital_analog` | int | ❌ **NO** | ✅ YES |
| `calibration_sign` | int | ❌ **NO** | ✅ YES |
| `calibration_h` | int | ❌ **NO** | ✅ YES |
| `calibration_l` | int | ❌ **NO** | ✅ YES |
| `decom` | int | ❌ **NO** | ✅ YES |

### ✅ BAC_OUT (Outputs) - Only 3 Fields

| Field Name | Type | Supported by Action 3 | Supported by Action 16 |
|------------|------|----------------------|------------------------|
| `control` | int | ✅ YES | ✅ YES |
| `value` | float | ✅ YES | ✅ YES |
| `auto_manual` | int | ✅ YES | ✅ YES |
| `description` / `fullLabel` | string | ❌ **NO** | ✅ YES |
| `label` | string | ❌ **NO** | ✅ YES |
| `range` | int | ❌ **NO** | ✅ YES |
| (all other fields) | various | ❌ **NO** | ✅ YES |

### ✅ BAC_VAR (Variables) - Only 3 Fields

| Field Name | Type | Supported by Action 3 | Supported by Action 16 |
|------------|------|----------------------|------------------------|
| `control` | int | ✅ YES | ✅ YES |
| `value` | float | ✅ YES | ✅ YES |
| `auto_manual` | int | ✅ YES | ✅ YES |
| `description` / `fullLabel` | string | ❌ **NO** | ✅ YES |
| `label` | string | ❌ **NO** | ✅ YES |
| (all other fields) | various | ❌ **NO** | ✅ YES |

---

## Impact on API Design

### ❌ These API Calls Will NOT Work as Expected

```bash
# This will return success but field is NOT updated!
PUT /api/t3-device/inputs/237219/5/field/fullLabel
Body: { "value": "New Label" }
# C++ ignores this because fullLabel is not in the if/else chain

# This will also return success but field is NOT updated!
PUT /api/t3-device/inputs/237219/5/field/label
Body: { "value": "TEMP1" }

# This will also return success but field is NOT updated!
PUT /api/t3-device/inputs/237219/5/field/range
Body: { "value": 3 }
```

### ✅ These API Calls WILL Work

```bash
# Value update - WORKS
PUT /api/t3-device/inputs/237219/5/field/value
Body: { "value": 25.5 }

# Control update - WORKS
PUT /api/t3-device/inputs/237219/5/field/control
Body: { "value": 1 }

# Auto/Manual update - WORKS
PUT /api/t3-device/inputs/237219/5/field/auto_manual
Body: { "value": 0 }
```

---

## The Silent Failure Problem

**This is dangerous because:**
1. ✅ API returns HTTP 200 OK
2. ✅ API returns `{ "success": true }`
3. ✅ FFI call succeeds
4. ❌ **But the field is NOT updated in C++!**

The C++ code:
- Receives the JSON
- Validates panel_id and entry_index
- Checks the field name in if/else chain
- **Finds no match** for "fullLabel", "label", "range", etc.
- Skips updating (no else clause to catch unknown fields)
- Writes the **unchanged** data back to device
- Returns success

**Result:** Frontend thinks it updated the field, but nothing changed!

---

## Recommendations

### Option 1: Disable Unsupported Fields in Action 3 Routes (Recommended)

Update Rust routes to reject unsupported fields:

```rust
async fn update_input_field(
    Path((serial, index, field_name)): Path<(i32, i32, String)>,
    Json(payload): Json<UpdateInputFieldRequest>,
) -> Result<Json<ApiResponse>, (StatusCode, String)> {
    // Validate field name
    const SUPPORTED_FIELDS: &[&str] = &["control", "value", "auto_manual"];

    if !SUPPORTED_FIELDS.contains(&field_name.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Field '{}' is not supported by UPDATE_ENTRY. Use full record update instead. Supported fields: {:?}",
                field_name,
                SUPPORTED_FIELDS
            ),
        ));
    }

    // ... continue with update
}
```

### Option 2: Auto-Switch to Action 16 for Unsupported Fields

```rust
async fn update_input_field(
    State(state): State<Arc<AppState>>,
    Path((serial, index, field_name)): Path<(i32, i32, String)>,
    Json(payload): Json<UpdateInputFieldRequest>,
) -> Result<Json<ApiResponse>, (StatusCode, String)> {
    const ACTION3_FIELDS: &[&str] = &["control", "value", "auto_manual"];

    if !ACTION3_FIELDS.contains(&field_name.as_str()) {
        // Fetch current data
        let current = fetch_input_data(serial, index).await?;

        // Build full payload with changed field
        let mut full_payload = current.to_update_payload();
        full_payload.set_field(&field_name, payload.value)?;

        // Use Action 16 instead
        return update_input_full(State(state), Path((serial, index)), Json(full_payload)).await;
    }

    // Use Action 3 for supported fields
    // ... continue
}
```

### Option 3: Document and Warn (Current Approach)

Keep current implementation but:
- ✅ Document the limitation clearly
- ✅ Add validation warnings
- ✅ Guide frontend developers to use Action 16

---

## Frontend Impact

### Current Test Results

When you edit a fullLabel field:

```typescript
// Test 1: Action 3 - fullLabel field
PUT /api/t3-device/inputs/237219/5/field/fullLabel
Body: { "value": "New Room Temperature" }

Response: { "success": true, "message": "Field 'fullLabel' updated successfully" }
// ⚠️ But fullLabel is NOT actually updated in device!

// Test 2: Action 16 - Full record
PUT /api/t3-device/inputs/237219/5
Body: {
  "fullLabel": "New Room Temperature",
  "label": "TEMP1",
  "value": 25.5,
  // ... all other fields
}

Response: { "success": true, "message": "Input point updated successfully" }
// ✅ fullLabel IS updated in device!
```

### Updated Frontend Strategy

```typescript
// For value, control, auto_manual - use Action 3 (fast)
const updateSimpleField = async (field: 'value' | 'control' | 'auto_manual', value: any) => {
  await fetch(`/api/t3-device/inputs/${serial}/${index}/field/${field}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  });
};

// For fullLabel, label, range, etc - use Action 16 (requires all fields)
const updateComplexField = async (field: string, value: any) => {
  const currentInput = await fetchCurrentInput(serial, index);

  const payload = {
    ...currentInput,
    [field]: value  // Change only the target field
  };

  await fetch(`/api/t3-device/inputs/${serial}/${index}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};
```

---

## Testing Checklist

- [ ] Test Action 3 with `value` field → ✅ Should work
- [ ] Test Action 3 with `control` field → ✅ Should work
- [ ] Test Action 3 with `auto_manual` field → ✅ Should work
- [ ] Test Action 3 with `fullLabel` field → ❌ Should fail or be rejected
- [ ] Test Action 3 with `label` field → ❌ Should fail or be rejected
- [ ] Test Action 3 with `range` field → ❌ Should fail or be rejected
- [ ] Test Action 16 with `fullLabel` + all fields → ✅ Should work
- [ ] Verify device data actually changes (not just API success)

---

## Summary

| Aspect | Action 3 | Action 16 |
|--------|----------|-----------|
| **Supported Fields** | **Only 3:** control, value, auto_manual | **All fields** |
| **For fullLabel** | ❌ Silently fails | ✅ Works |
| **For label** | ❌ Silently fails | ✅ Works |
| **For range** | ❌ Silently fails | ✅ Works |
| **Performance** | Fast (1 field) | Slower (all fields) |
| **Use Case** | Value/control updates only | Everything else |

**Key Takeaway:** Action 3 is NOT a general-purpose single-field updater. It's specifically designed for quick value/control updates in the C++ UI. For other fields, Action 16 is the only option.
