# T3000 Trend Log Complete Integration Guide

> **Complete Developer Guide for T3000 Trend Log Integration**
> This document provides everything you need to understand, implement, test, and maintain the T3000 trend log integration between C++ and Vue.js.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Parameter Reference](#parameter-reference)
4. [C++ Implementation](#cpp-implementation)
5. [Vue.js Implementation](#vuejs-implementation)
6. [Data Flow & Processing](#data-flow--processing)
7. [Testing & Debugging](#testing--debugging)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Code Examples](#code-examples)

---

## Quick Start

### What is T3000 Trend Log Integration?

The T3000 Trend Log integration allows the T3000 C++ desktop application to display trend log data in a modern web-based chart viewer. When a user clicks "Monitor Graphic" in T3000, it launches a web browser displaying real-time sensor data.

### How it Works (Simple Version)

1. **T3000 C++ App**: User clicks "Monitor Graphic" button
2. **Data Conversion**: C++ converts sensor data to JSON format
3. **URL Generation**: Creates a URL with device parameters and JSON data
4. **Web Launch**: Opens browser pointing to Vue.js application
5. **Chart Display**: Vue.js decodes data and shows interactive chart

### Example URL Structure

```
http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=<JSON-DATA>
```

### Key Files to Know

- **C++ Backend**: `T3000_Source/T3000/BacnetMonitor.cpp`
- **Vue.js Frontend**: `src/pages/TrendLog/IndexPage.vue`
- **Chart Component**: `src/components/NewUI/TrendLogChart.vue`

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           T3000 C++ Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ User Action: Click "Monitor Graphic"                                       │
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Str_monitor_point│──▶│ConvertToJson()  │──▶│Generate URL with Parameters │ │
│ │   (C++ Struct)  │   │   (jsoncpp)     │   │   sn, panel_id, trendlog_id │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
│                                               ▼                             │
│                                         Launch WebView                      │
└─────────────────────────────────────────────┬───────────────────────────────┘
                                              │ HTTP Request
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Vue.js Web Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Extract URL      │──▶│Decode JSON      │──▶│Validate & Transform Data    │ │
│ │Parameters       │   │from all_data    │   │                             │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
│                                               ▼                             │
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │TrendLogChart    │◀──│Process Data     │◀──│Fallback to API/Demo Data    │ │
│ │Component        │   │                 │   │                             │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **C++ Backend**: jsoncpp library, CString, URL encoding
- **Vue.js Frontend**: Composition API, TypeScript, Vue Router
- **Chart Library**: Custom TrendLogChart component
- **Transport**: URL parameters with JSON payload
- **Server**: Quasar dev server on localhost:3003

---

## Parameter Reference

### URL Parameters

| Parameter | Type | Required | Description | Example | Notes |
|-----------|------|----------|-------------|---------|-------|
| `sn` | number | Yes* | Serial number of T3000 device | `123` | Device identifier |
| `panel_id` | number | Yes* | Panel ID within device | `3` | Internal panel reference |
| `trendlog_id` | number | Yes* | Trend log ID to display | `1` | **1-based for display** |
| `all_data` | string | No | URL-encoded JSON data | `%7B%22...%7D` | From C++ backend |

*Required for real data; optional for demo mode

### Parameter Details

#### `sn` (Serial Number)
- **C++ Source**: `Device_Basic_Setting.reg.n_serial_number`
- **Format**: Integer (e.g., 123, 456)
- **Purpose**: Identifies the specific T3000 device
- **Usage**: Used in API calls and display titles

#### `panel_id` (Panel ID)
- **C++ Source**: `Device_Basic_Setting.reg.panel_number`
- **Format**: Integer, 0-based internally
- **Purpose**: Identifies panel within the device
- **Usage**: Used for API endpoint routing

#### `trendlog_id` (Trend Log ID)
- **C++ Source**: `monitor_list_line` (0-based) → converted to 1-based
- **Format**: Integer, **1-based for display**
- **Purpose**: Identifies specific trend log to display
- **Important**: C++ uses 0-based indexing internally, but displays as 1-based

#### `all_data` (JSON Data)
- **C++ Source**: `ConvertMonitorDataToJson()` output
- **Format**: URL-encoded JSON string
- **Purpose**: Complete monitor point data from C++
- **Processing**: URL decoded → JSON parsed → validated → displayed

### URL Examples

```bash
# Demo Mode (no parameters)
http://localhost:3003/#/trend-log

# Real Data (minimal)
http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1

# Complete with JSON data
http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=%7B%22an_inputs%22%3A12%2C%22command%22%3A%223MON1%22%2C%22id%22%3A%22MON1%22%7D
```

---

## C++ Implementation

### File Location
```
T3000_Source/T3000/BacnetMonitor.cpp
```

### Core Function: ConvertMonitorDataToJson()

```cpp
CString ConvertMonitorDataToJson(const Str_monitor_point& monitor_data, int panelid, int trendlogid)
{
    try {
        Json::Value root;
        Json::StreamWriterBuilder builder;
        builder["indentation"] = "";  // Compact output

        // 1-based indexing for display
        int display_panelid = panelid + 1;
        int display_trendlogid = trendlogid + 1;

        // Generate command and id strings (1-based)
        CString command, id;
        command.Format(_T("%dMON%d"), display_panelid, display_trendlogid);
        id.Format(_T("MON%d"), display_trendlogid);

        // Basic fields
        root["an_inputs"] = 12;
        root["command"] = CT2A(command);
        root["id"] = CT2A(id);
        root["index"] = trendlogid;  // Keep 0-based for internal use
        root["hour_interval_time"] = monitor_data.hour_interval_time;
        root["minute_interval_time"] = monitor_data.minute_interval_time;
        root["second_interval_time"] = monitor_data.second_interval_time;
        root["num_inputs"] = monitor_data.num_inputs;
        root["status"] = monitor_data.status;
        root["type"] = "MON";
        root["pid"] = display_panelid;

        // Label with 1-based numbering
        CString label;
        label.Format(_T("TRL_%d_%d_%d"),
                    Device_Basic_Setting.reg.n_serial_number,
                    display_panelid,
                    display_trendlogid);
        root["label"] = CT2A(label);

        // Input array
        Json::Value inputs(Json::arrayValue);
        for (int i = 0; i < monitor_data.num_inputs && i < BAC_MONITOR_COUNT; i++) {
            Json::Value input;
            input["network"] = monitor_data.input[i].network;
            input["panel"] = monitor_data.input[i].panel;
            input["point_number"] = monitor_data.input[i].point_number;
            input["point_type"] = monitor_data.input[i].point_type;
            input["sub_panel"] = monitor_data.input[i].sub_panel;
            inputs.append(input);
        }
        root["input"] = inputs;

        // Range array
        Json::Value ranges(Json::arrayValue);
        for (int i = 0; i < BAC_MONITOR_COUNT; i++) {
            ranges.append(monitor_data.range[i]);
        }
        root["range"] = ranges;

        // Convert to string
        std::unique_ptr<Json::StreamWriter> writer(builder.newStreamWriter());
        std::ostringstream oss;
        writer->write(root, &oss);

        return CString(oss.str().c_str());

    } catch (...) {
        // Fallback JSON
        CString fallback;
        fallback.Format(_T("{\"error\":\"JSON conversion failed\",\"panelid\":%d,\"trendlogid\":%d}"),
                       panelid + 1, trendlogid + 1);
        return fallback;
    }
}
```

### URL Generation and Launch

```cpp
void CBacnetMonitor::OnBnClickedBtnMonitorGraphic()
{
    // Get current selection
    int monitor_list_line = GetSelectedMonitorLine();
    if (monitor_list_line < 0) return;

    // Get monitor data
    Str_monitor_point& monitor_data = m_monitor_data.at(monitor_list_line);

    // Get device parameters
    int sn = Device_Basic_Setting.reg.n_serial_number;
    int panel_id = Device_Basic_Setting.reg.panel_number;
    int trendlog_id = monitor_list_line;  // 0-based internally

    // Convert to JSON
    CString jsonData = ConvertMonitorDataToJson(monitor_data, panel_id, trendlog_id);

    // URL encode the JSON
    CString encodedData = UrlEncodeJson(jsonData);

    // Generate complete URL with 1-based IDs for display
    CString selectedUrl;
    selectedUrl.Format(_T("http://localhost:3003/#/trend-log?sn=%d&panel_id=%d&trendlog_id=%d&all_data=%s"),
                      sn,
                      panel_id,
                      trendlog_id + 1,  // Convert to 1-based for display
                      encodedData);

    // Launch webview
    LaunchBacnetWebView(selectedUrl);
}
```

### Dependencies
```cpp
#include <json/json.h>  // jsoncpp library
#include <sstream>
#include <memory>
```

---

## Vue.js Implementation

### File Location
```
src/pages/TrendLog/IndexPage.vue
```

### Core Reactive Variables

```javascript
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// Page state
const pageTitle = ref('T3000 Trend Log Analysis')
const isLoading = ref(false)
const error = ref<string | null>(null)
const trendLogData = ref<any>(null)

// URL parameters extraction
const urlParams = computed(() => ({
  sn: route.query.sn ? Number(route.query.sn) : null,
  panel_id: route.query.panel_id ? Number(route.query.panel_id) : null,
  trendlog_id: route.query.trendlog_id ? Number(route.query.trendlog_id) : null,
  all_data: route.query.all_data as string || null
}))
```

### JSON Processing Functions

```javascript
// Decode URL-encoded JSON from C++
const decodeUrlEncodedJson = (encodedString: string): any | null => {
  try {
    const decoded = decodeURIComponent(encodedString)
    console.log('Decoded JSON string:', decoded)

    const parsed = JSON.parse(decoded)
    console.log('Parsed JSON object:', parsed)

    return parsed
  } catch (error) {
    console.error('Failed to decode and parse JSON:', error)
    return null
  }
}

// Validate JSON structure
const validateTrendLogJsonStructure = (data: any): boolean => {
  return data &&
         typeof data === 'object' &&
         data.hasOwnProperty('command') &&
         data.hasOwnProperty('id') &&
         Array.isArray(data.input) &&
         Array.isArray(data.range)
}
```

### Main Data Processing Function

```javascript
const fetchRealData = async (
  sn: number,
  panel_id: number,
  trendlog_id: number,
  all_data?: string
) => {
  console.log('fetchRealData called with:', { sn, panel_id, trendlog_id, all_data: all_data ? 'present' : 'none' })

  try {
    // Priority 1: Try C++ JSON data
    if (all_data) {
      console.log('Attempting to parse all_data parameter...')
      const decodedJsonData = decodeUrlEncodedJson(all_data)

      if (decodedJsonData && validateTrendLogJsonStructure(decodedJsonData)) {
        console.log('Successfully decoded and validated JSON from all_data')
        return {
          title: `Trend Log ${trendlog_id} - Panel ${panel_id} (SN: ${sn})`,
          active: true,
          type: "Temperature",
          settings: {
            fillColor: "#659dc5",
            titleColor: "inherit",
            bgColor: "inherit",
            textColor: "inherit",
            fontSize: 16,
            t3EntryDisplayField: "label"
          },
          t3Entry: decodedJsonData,
          showDimensions: true,
          cat: "Duct",
          id: trendlog_id
        }
      }
    }

    // Priority 2: Try API endpoints
    const apiUrl = `/api/data/device/${panel_id}/trend_logs/${trendlog_id}`
    let fullUrl = `${apiUrl}?sn=${sn}`

    if (all_data) {
      fullUrl += `&all_data=${encodeURIComponent(all_data)}`
    }

    console.log('Trying API endpoint:', fullUrl)

    try {
      let response = await fetch(fullUrl)

      if (!response.ok && response.status === 404) {
        const fallbackUrl = `/api/modbus-registers/${trendlog_id}`
        const fallbackFullUrl = `${fallbackUrl}?sn=${sn}` + (all_data ? `&all_data=${encodeURIComponent(all_data)}` : '')
        console.log('Trying fallback endpoint:', fallbackFullUrl)
        response = await fetch(fallbackFullUrl)
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const apiData = await response.json()
      return transformApiResponseToTrendLogFormat(apiData, sn, panel_id, trendlog_id)

    } catch (apiError) {
      console.error('API request failed:', apiError)
    }

    // Priority 3: Fallback to demo data with parameters
    console.log('Falling back to demo data with parameters')
    return getDemoDataWithParams(sn, panel_id, trendlog_id, all_data)

  } catch (error) {
    console.error('Error in fetchRealData:', error)
    return getDemoDataWithParams(sn, panel_id, trendlog_id, all_data)
  }
}
```

### Page Lifecycle

```javascript
// Load data on mount
onMounted(() => {
  loadTrendLogData()
})

// Watch for URL parameter changes
watch(
  () => route.query,
  () => {
    loadTrendLogData()
  },
  { immediate: false }
)

// Main loading function
const loadTrendLogData = async () => {
  const { sn, panel_id, trendlog_id, all_data } = urlParams.value

  isLoading.value = true
  error.value = null

  try {
    if (sn && panel_id && trendlog_id) {
      pageTitle.value = `Trend Log ${trendlog_id} - Panel ${panel_id} (SN: ${sn})`
      trendLogData.value = await fetchRealData(sn, panel_id, trendlog_id, all_data || undefined)
    } else {
      pageTitle.value = 'T3000 Trend Log Analysis (Demo)'
      trendLogData.value = getDemoData()
    }
  } catch (err) {
    error.value = `Failed to load trend log data: ${err}`
  } finally {
    isLoading.value = false
  }
}
```

---

## Data Flow & Processing

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Step 1: C++ Data Collection                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ User Action: Click "Monitor Graphic" button                                │
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Get Selected     │──▶│Extract Device   │──▶│Get Monitor Point Data       │ │
│ │Monitor Line     │   │Parameters       │   │                             │ │
│ │(0-based index)  │   │(sn, panel_id)   │   │(Str_monitor_point struct)   │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Step 2: JSON Conversion                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Function: ConvertMonitorDataToJson()                                       │
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Create Json::    │──▶│Convert to 1-based│──▶│Generate JSON Structure      │ │
│ │Value object     │   │indexing for      │   │(command, id, input, range)  │ │
│ │                 │   │display           │   │                             │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Step 3: URL Generation                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │URL Encode JSON  │──▶│Format URL with  │──▶│Launch WebView               │ │
│ │Data             │   │Parameters       │   │                             │ │
│ │                 │   │(1-based display)│   │                             │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Step 4: Vue.js Parameter Extraction                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Parse URL Query  │──▶│Extract sn,      │──▶│Validate Parameters          │ │
│ │Parameters       │   │panel_id,        │   │                             │ │
│ │                 │   │trendlog_id,     │   │                             │ │
│ │                 │   │all_data         │   │                             │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Step 5: JSON Processing                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Decode URL-      │──▶│Parse JSON       │──▶│Validate Structure           │ │
│ │encoded all_data │   │String           │   │(command, id, input, range)  │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Step 6: Data Transformation                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │Transform to     │──▶│Add UI Settings  │──▶│Create Complete Data Object  │ │
│ │Chart Format     │   │and Metadata     │   │for TrendLogChart Component  │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Step 7: Chart Display                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐ │
│ │TrendLogChart    │──▶│Render Chart     │──▶│User Interaction             │ │
│ │Component        │   │Visualization    │   │(zoom, pan, etc.)            │ │
│ └─────────────────┘   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Transformations

#### 1. C++ Struct to JSON

**Input (Str_monitor_point):**
```cpp
struct Str_monitor_point {
    int hour_interval_time;
    int minute_interval_time;
    int second_interval_time;
    int num_inputs;
    int status;
    Mon_Input input[BAC_MONITOR_COUNT];
    int range[BAC_MONITOR_COUNT];
}
```

**Output (JSON):**
```json
{
  "an_inputs": 12,
  "command": "3MON1",
  "hour_interval_time": 0,
  "id": "MON1",
  "index": 0,
  "input": [
    {
      "network": 0,
      "panel": 3,
      "point_number": 0,
      "point_type": 2,
      "sub_panel": 0
    }
  ],
  "label": "TRL_123_3_1",
  "minute_interval_time": 0,
  "num_inputs": 3,
  "pid": 3,
  "range": [0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 0, 1, 1],
  "second_interval_time": 15,
  "status": 1,
  "type": "MON"
}
```

#### 2. JSON to Chart Data

**Input (from C++):** Raw JSON structure

**Output (for TrendLogChart):**
```json
{
  "title": "Trend Log 1 - Panel 3 (SN: 123)",
  "active": true,
  "type": "Temperature",
  "translate": [256.6363359569053, 321.74069633799525],
  "width": 60,
  "height": 60,
  "rotate": 0,
  "scaleX": 1,
  "scaleY": 1,
  "settings": {
    "fillColor": "#659dc5",
    "titleColor": "inherit",
    "bgColor": "inherit",
    "textColor": "inherit",
    "fontSize": 16,
    "t3EntryDisplayField": "label"
  },
  "zindex": 1,
  "t3Entry": { /* Original JSON from C++ */ },
  "showDimensions": true,
  "cat": "Duct",
  "id": 1
}
```

### Error Handling & Fallbacks

#### 1. C++ Fallbacks
```cpp
// JSON conversion error
catch (...) {
    CString fallback;
    fallback.Format(_T("{\"error\":\"JSON conversion failed\",\"panelid\":%d,\"trendlogid\":%d}"),
                   panelid + 1, trendlogid + 1);
    return fallback;
}
```

#### 2. Vue.js Fallbacks
```javascript
// Data source priority:
// 1. C++ JSON data (all_data parameter)
// 2. API endpoints (/api/data/device/... or /api/modbus-registers/...)
// 3. Demo data with parameters

if (all_data) {
  // Try C++ JSON first
} else {
  // Try API endpoints
  try {
    const response = await fetch(apiUrl)
    // Handle response...
  } catch (apiError) {
    // Fall back to demo data
    return getDemoDataWithParams(sn, panel_id, trendlog_id)
  }
}
```

---

## Testing & Debugging

### Debug Features in Vue.js

#### 1. Parameter Display Panel

```vue
<div v-if="urlParams.sn || Object.keys(route.query).length > 0" class="url-params-debug">
  <strong>Parameters:</strong>
  <span v-if="urlParams.sn">
    sn={{ urlParams.sn }},
    panel_id={{ urlParams.panel_id }},
    trendlog_id={{ urlParams.trendlog_id }}
    <span v-if="urlParams.all_data">
      <br>
      all_data: {{ urlParams.all_data.length > 100 ? urlParams.all_data.substring(0, 100) + '...' : urlParams.all_data }}
      <span v-if="urlParams.all_data.startsWith('{')"> (JSON Format)</span>
      <span v-else-if="urlParams.all_data.match(/^[0-9A-Fa-f]+$/)"> (Legacy Hex Format)</span>
      <span v-else> (URL-Encoded JSON)</span>
    </span>
  </span>
</div>
```

#### 2. Test Buttons

```vue
<div class="debug-buttons">
  <button @click="loadTrendLogData" class="debug-button">Reload Data</button>
  <button @click="testDemoData" class="debug-button">Test Demo</button>
  <button @click="testRealData" class="debug-button" v-if="urlParams.sn">Test API</button>
  <button @click="testJsonParsing" class="debug-button" v-if="urlParams.all_data">Test JSON</button>
</div>
```

#### 3. Console Logging

```javascript
// Comprehensive logging throughout the data flow
console.log('fetchRealData called with:', { sn, panel_id, trendlog_id, all_data: all_data ? 'present' : 'none' })
console.log('Decoded JSON string:', decoded)
console.log('Parsed JSON object:', parsed)
console.log('JSON structure validation:', isValid ? 'PASSED' : 'FAILED')
```

### Testing Scenarios

#### 1. Demo Mode (No Parameters)
```
URL: http://localhost:3003/#/trend-log
Expected: Shows demo data with generic title
```

#### 2. Parameters Only (No JSON Data)
```
URL: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1
Expected: Shows parameters in title, attempts API call, falls back to demo with parameters
```

#### 3. Complete Integration (With JSON Data)
```
URL: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=%7B%22command%22%3A%223MON1%22%7D
Expected: Decodes JSON, validates structure, displays real data
```

#### 4. Malformed JSON Data
```
URL: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=invalid
Expected: JSON parsing fails gracefully, falls back to API/demo data
```

### Common Issues & Solutions

#### Issue 1: JSON Parsing Fails
**Symptoms:** Console errors about JSON parsing
**Check:**
- Is `all_data` properly URL-encoded?
- Is the JSON structure valid?
- Are there special characters causing issues?

**Debug:**
```javascript
const testJsonParsing = () => {
  const { all_data } = urlParams.value
  console.log('Raw all_data:', all_data)
  const decoded = decodeUrlEncodedJson(all_data)
  console.log('Decoded result:', decoded)
}
```

#### Issue 2: Parameters Not Extracted
**Symptoms:** Parameters show as null in debug panel
**Check:**
- URL format is correct
- Parameters are in query string (after ?)
- Parameter names match exactly (sn, panel_id, trendlog_id, all_data)

#### Issue 3: Chart Not Displaying
**Symptoms:** Page loads but chart area is empty
**Check:**
- `trendLogData` has valid data
- TrendLogChart component is receiving data
- Console for component errors

### Testing Functions

```javascript
// Test demo data
const testDemoData = () => {
  console.log('Testing demo data...')
  trendLogData.value = getDemoData()
  pageTitle.value = 'T3000 Trend Log Analysis (Demo Test)'
}

// Test real data fetch
const testRealData = async () => {
  const { sn, panel_id, trendlog_id, all_data } = urlParams.value
  if (sn && panel_id && trendlog_id) {
    console.log('Testing real data fetch...')
    trendLogData.value = await fetchRealData(sn, panel_id, trendlog_id, all_data || undefined)
  }
}

// Test JSON parsing specifically
const testJsonParsing = () => {
  const { all_data } = urlParams.value
  if (all_data) {
    console.log('Testing JSON parsing...')
    console.log('Raw all_data:', all_data)

    const decoded = decodeUrlEncodedJson(all_data)
    if (decoded) {
      console.log('Successfully decoded JSON:', decoded)
      const isValid = validateTrendLogJsonStructure(decoded)
      console.log('JSON structure validation:', isValid ? 'PASSED' : 'FAILED')

      if (isValid) {
        trendLogData.value = decoded
        pageTitle.value = 'T3000 Trend Log Analysis (JSON Test)'
      }
    }
  }
}
```

---

## API Reference

### C++ Functions

#### ConvertMonitorDataToJson()
```cpp
CString ConvertMonitorDataToJson(const Str_monitor_point& monitor_data, int panelid, int trendlogid)
```
**Purpose:** Convert C++ monitor data structure to JSON string
**Parameters:**
- `monitor_data`: Source monitor point data
- `panelid`: Panel ID (0-based internally)
- `trendlogid`: Trend log ID (0-based internally)

**Returns:** JSON string with t3Entry structure
**Features:** 1-based indexing for display, error handling, compact output

#### UrlEncodeJson()
```cpp
CString UrlEncodeJson(const CString& jsonString)
```
**Purpose:** URL-encode JSON string for safe transport
**Parameters:** `jsonString`: Raw JSON to encode
**Returns:** URL-encoded string

#### LaunchBacnetWebView()
```cpp
void LaunchBacnetWebView(const CString& url)
```
**Purpose:** Launch web browser with specified URL
**Parameters:** `url`: Complete URL to open

### Vue.js Functions

#### decodeUrlEncodedJson()
```javascript
const decodeUrlEncodedJson = (encodedString: string): any | null
```
**Purpose:** Decode and parse URL-encoded JSON from C++
**Parameters:** `encodedString`: URL-encoded JSON string
**Returns:** Parsed object or null on failure

#### validateTrendLogJsonStructure()
```javascript
const validateTrendLogJsonStructure = (data: any): boolean
```
**Purpose:** Validate JSON has required structure
**Parameters:** `data`: Object to validate
**Returns:** Boolean indicating validity

#### fetchRealData()
```javascript
const fetchRealData = async (sn: number, panel_id: number, trendlog_id: number, all_data?: string)
```
**Purpose:** Main data fetching with multiple fallbacks
**Parameters:** Device parameters and optional JSON data
**Returns:** Formatted data for TrendLogChart component

### Data Structures

#### Str_monitor_point (C++)
```cpp
struct Str_monitor_point {
    int hour_interval_time;
    int minute_interval_time;
    int second_interval_time;
    int num_inputs;
    int status;
    Mon_Input input[BAC_MONITOR_COUNT];
    int range[BAC_MONITOR_COUNT];
}
```

#### Mon_Input (C++)
```cpp
struct Mon_Input {
    int network;
    int panel;
    int point_number;
    int point_type;
    int sub_panel;
}
```

#### TrendLogChart Data Format (Vue.js)
```javascript
interface TrendLogData {
  title: string;
  active: boolean;
  type: string;
  translate: [number, number];
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  settings: {
    fillColor: string;
    titleColor: string;
    bgColor: string;
    textColor: string;
    fontSize: number;
    t3EntryDisplayField: string;
  };
  zindex: number;
  t3Entry: any; // JSON from C++
  showDimensions: boolean;
  cat: string;
  id: number;
}
```

---

## Troubleshooting

### Common Problems & Solutions

#### 1. "Parameters show as null"

**Problem:** URL parameters not being extracted properly

**Diagnosis:**
```javascript
// Check URL format
console.log('Current route query:', route.query)
console.log('URL params:', urlParams.value)
```

**Solutions:**
- Verify URL format: `?sn=123&panel_id=3&trendlog_id=1`
- Check parameter names are exact (case-sensitive)
- Ensure parameters are numbers when expected

#### 2. "JSON parsing failed"

**Problem:** `all_data` parameter cannot be decoded

**Diagnosis:**
```javascript
const { all_data } = urlParams.value
console.log('Raw all_data:', all_data)
console.log('Decoded:', decodeURIComponent(all_data))
```

**Solutions:**
- Check C++ URL encoding is correct
- Verify JSON is valid before encoding
- Test with simple JSON structure first

#### 3. "Chart not displaying"

**Problem:** TrendLogChart component not rendering

**Diagnosis:**
```javascript
console.log('trendLogData:', trendLogData.value)
console.log('currentItemData:', currentItemData.value)
```

**Solutions:**
- Verify data structure matches expected format
- Check console for component errors
- Ensure t3Entry property exists and is valid

#### 4. "API endpoints returning 404"

**Problem:** Fallback API calls failing

**Diagnosis:**
```javascript
// Check network tab in browser dev tools
// Look for API request URLs and responses
```

**Solutions:**
- Verify API endpoints exist and are running
- Check parameter formatting in API URLs
- Ensure demo data fallback is working

#### 5. "Webview not launching from C++"

**Problem:** Browser window not opening

**Diagnosis:**
- Check C++ console output
- Verify URL generation
- Test URL manually in browser

**Solutions:**
- Check `LaunchBacnetWebView()` implementation
- Verify localhost:3003 server is running
- Test with simplified URL first

### Debug Checklist

#### C++ Side
- [ ] Monitor data structure populated correctly
- [ ] JSON conversion successful (check output)
- [ ] URL encoding working properly
- [ ] Complete URL format correct
- [ ] WebView launch function working

#### Vue.js Side
- [ ] Parameters extracted from URL
- [ ] JSON decoding successful
- [ ] Data validation passing
- [ ] Component receiving correct data
- [ ] Chart rendering without errors

#### Integration Test
- [ ] End-to-end: C++ → URL → Vue.js → Chart
- [ ] All fallback mechanisms working
- [ ] Error handling graceful
- [ ] Debug features accessible

### Log Analysis

#### C++ Debug Output
```cpp
// Add debug output in C++
TRACE(_T("Monitor data converted to JSON: %s\n"), jsonData);
TRACE(_T("Complete URL: %s\n"), selectedUrl);
```

#### Vue.js Console Output
```javascript
// Expected console messages during successful flow:
// "fetchRealData called with: {sn: 123, panel_id: 3, trendlog_id: 1, all_data: 'present'}"
// "Attempting to parse all_data parameter..."
// "Decoded JSON string: {\"command\":\"3MON1\"...}"
// "Parsed JSON object: {command: '3MON1', ...}"
// "Successfully decoded and validated JSON from all_data"
```

### Performance Issues

#### Large JSON Data
- Monitor `all_data` parameter size
- Consider compression if needed
- Check URL length limits

#### Memory Usage
- Watch for memory leaks in repeated testing
- Clear data references when not needed
- Monitor browser performance

---

## Code Examples

### Complete C++ Integration Example

```cpp
// In BacnetMonitor.cpp - Complete integration flow
void CBacnetMonitor::OnBnClickedBtnMonitorGraphic()
{
    try {
        // Step 1: Get selected monitor line
        int monitor_list_line = GetSelectedMonitorLine();
        if (monitor_list_line < 0) {
            AfxMessageBox(_T("Please select a monitor line first."));
            return;
        }

        // Step 2: Get monitor data
        if (monitor_list_line >= m_monitor_data.size()) {
            AfxMessageBox(_T("Invalid monitor line selected."));
            return;
        }

        Str_monitor_point& monitor_data = m_monitor_data.at(monitor_list_line);

        // Step 3: Get device parameters
        int sn = Device_Basic_Setting.reg.n_serial_number;
        int panel_id = Device_Basic_Setting.reg.panel_number;
        int trendlog_id = monitor_list_line;  // 0-based internally

        // Step 4: Convert to JSON
        CString jsonData = ConvertMonitorDataToJson(monitor_data, panel_id, trendlog_id);
        if (jsonData.IsEmpty()) {
            AfxMessageBox(_T("Failed to convert monitor data to JSON."));
            return;
        }

        // Step 5: URL encode the JSON
        CString encodedData = UrlEncodeJson(jsonData);

        // Step 6: Generate complete URL (1-based for display)
        CString selectedUrl;
        selectedUrl.Format(_T("http://localhost:3003/#/trend-log?sn=%d&panel_id=%d&trendlog_id=%d&all_data=%s"),
                          sn,
                          panel_id,
                          trendlog_id + 1,  // Convert to 1-based for display
                          encodedData);

        // Step 7: Launch webview
        LaunchBacnetWebView(selectedUrl);

    } catch (...) {
        AfxMessageBox(_T("Error launching trend log graphic view."));
    }
}

// Helper function for URL encoding
CString CBacnetMonitor::UrlEncodeJson(const CString& jsonString)
{
    CString encoded;

    for (int i = 0; i < jsonString.GetLength(); i++) {
        TCHAR ch = jsonString.GetAt(i);

        if (isalnum(ch) || ch == '-' || ch == '_' || ch == '.' || ch == '~') {
            encoded += ch;
        } else {
            CString hex;
            hex.Format(_T("%%%02X"), (unsigned char)ch);
            encoded += hex;
        }
    }

    return encoded;
}
```

### Complete Vue.js Integration Example

```vue
<template>
  <div class="trend-log-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">{{ pageTitle }}</h2>

      <!-- Debug info -->
      <div v-if="urlParams.sn || Object.keys(route.query).length > 0" class="url-params-debug">
        <strong>Parameters:</strong>
        <span v-if="urlParams.sn">
          sn={{ urlParams.sn }},
          panel_id={{ urlParams.panel_id }},
          trendlog_id={{ urlParams.trendlog_id }}
          <span v-if="urlParams.all_data">
            <br>
            all_data: {{ urlParams.all_data.length > 100 ? urlParams.all_data.substring(0, 100) + '...' : urlParams.all_data }}
          </span>
        </span>
      </div>

      <!-- Debug buttons -->
      <div class="debug-buttons">
        <button @click="loadTrendLogData" class="debug-button">Reload Data</button>
        <button @click="testDemoData" class="debug-button">Test Demo</button>
        <button @click="testRealData" class="debug-button" v-if="urlParams.sn">Test API</button>
        <button @click="testJsonParsing" class="debug-button" v-if="urlParams.all_data">Test JSON</button>
      </div>
    </div>

    <!-- Content -->
    <div v-if="isLoading" class="loading-wrapper">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>Loading trend log data...</p>
      </div>
    </div>

    <div v-else-if="error" class="error-wrapper">
      <div class="error-content">
        <h3>Error Loading Data</h3>
        <p>{{ error }}</p>
        <button @click="loadTrendLogData" class="retry-button">Retry</button>
      </div>
    </div>

    <div v-else class="chart-wrapper">
      <TrendLogChart :itemData="currentItemData" :title="pageTitle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions, watch } from 'vue'
import { useRoute } from 'vue-router'
import TrendLogChart from 'src/components/NewUI/TrendLogChart.vue'

defineOptions({
  name: 'TrendLogIndexPage'
})

const route = useRoute()

// Reactive variables
const pageTitle = ref('T3000 Trend Log Analysis')
const isLoading = ref(false)
const error = ref<string | null>(null)
const trendLogData = ref<any>(null)

// URL parameters
const urlParams = computed(() => ({
  sn: route.query.sn ? Number(route.query.sn) : null,
  panel_id: route.query.panel_id ? Number(route.query.panel_id) : null,
  trendlog_id: route.query.trendlog_id ? Number(route.query.trendlog_id) : null,
  all_data: route.query.all_data as string || null
}))

// Current data for chart
const currentItemData = computed(() => {
  if (trendLogData.value) {
    return trendLogData.value
  }
  return null
})

// Complete implementation of all functions...
// (Functions from Vue.js Implementation section above)

// Lifecycle
onMounted(() => {
  loadTrendLogData()
})

watch(
  () => route.query,
  () => {
    loadTrendLogData()
  },
  { immediate: false }
)
</script>

<style scoped>
.trend-log-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  overflow: hidden;
}

.page-header {
  padding: 16px 20px 12px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 500;
  color: #333;
}

.url-params-debug {
  font-size: 12px;
  color: #666;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 8px 0;
  font-family: monospace;
  word-break: break-all;
}

.debug-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.debug-button {
  padding: 4px 8px;
  font-size: 11px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.debug-button:hover {
  background: #0056b3;
}

.chart-wrapper {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}

.loading-wrapper, .error-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content, .error-content {
  text-align: center;
  padding: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { { transform: rotate(360deg); }
}

.retry-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 12px;
}

.retry-button:hover {
  background: #0056b3;
}

@media (max-width: 768px) {
  .page-header { padding: 12px 16px 8px; }
  .page-title { font-size: 20px; }
  .chart-wrapper { padding: 8px; }
}

@media (max-width: 480px) {
  .page-header { padding: 8px 12px 6px; }
  .page-title { font-size: 18px; }
  .chart-wrapper { padding: 4px; }
}
</style>
```

### Testing Example

```javascript
// Complete test function example
const runComprehensiveTest = async () => {
  console.log('=== T3000 Trend Log Integration Test ===')

  // Test 1: Parameter extraction
  console.log('1. Testing parameter extraction...')
  const params = urlParams.value
  console.log('Parameters:', params)

  if (params.sn && params.panel_id && params.trendlog_id) {
    console.log('✓ Parameters extracted successfully')
  } else {
    console.log('⚠ Some parameters missing - will use demo mode')
  }

  // Test 2: JSON parsing (if available)
  if (params.all_data) {
    console.log('2. Testing JSON parsing...')
    const decoded = decodeUrlEncodedJson(params.all_data)

    if (decoded) {
      console.log('✓ JSON decoded successfully')
      const isValid = validateTrendLogJsonStructure(decoded)
      console.log('Structure validation:', isValid ? '✓ PASSED' : '✗ FAILED')
    } else {
      console.log('✗ JSON decoding failed')
    }
  }

  // Test 3: Data fetching
  console.log('3. Testing data fetching...')
  try {
    const data = await fetchRealData(
      params.sn || 123,
      params.panel_id || 3,
      params.trendlog_id || 1,
      params.all_data || undefined
    )

    if (data && data.t3Entry) {
      console.log('✓ Data fetching successful')
      console.log('Data structure:', Object.keys(data))
    } else {
      console.log('⚠ Data fetching returned fallback/demo data')
    }
  } catch (err) {
    console.log('✗ Data fetching failed:', err)
  }

  console.log('=== Test Complete ===')
}
```

---

## Summary

This complete integration guide covers everything needed to understand, implement, and maintain the T3000 Trend Log integration:

### Key Features
- **Seamless Integration**: C++ to Vue.js data flow
- **Robust Error Handling**: Multiple fallback mechanisms
- **Comprehensive Debugging**: Debug panels, console logging, test functions
- **Flexible Data Sources**: C++ JSON, API endpoints, demo data
- **Responsive Design**: Works on desktop and mobile
- **Parameter Standardization**: Consistent naming (sn, panel_id, trendlog_id, all_data)

### Architecture Benefits
- **Separation of Concerns**: C++ handles data, Vue.js handles display
- **Fault Tolerance**: Graceful degradation when components fail
- **Development Friendly**: Extensive debugging and testing tools
- **Maintainable**: Clear structure and comprehensive documentation

### Next Steps
1. **Test Integration**: Use the provided test functions and examples
2. **Monitor Performance**: Check for memory leaks and optimization opportunities
3. **Extend Features**: Add new chart types or data processing capabilities
4. **Production Deployment**: Configure for production environment

This guide serves as the definitive reference for the T3000 Trend Log integration system.
