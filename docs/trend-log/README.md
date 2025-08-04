# T3000 Trend Log Integration Documentation

## 📖 Complete Guide

**→ [T3000 Trend Log Complete Integration Guide](T3000-TrendLog-Complete-Integration-Guide.md)**

This comprehensive guide contains everything you need to understand, implement, test, and maintain the T3000 trend log integration between C++ and Vue.js.

## Overview

The T3000 Trend Log integration enables seamless data visualization between the T3000 C++ application and the Vue.js web interface. When a user clicks "Monitor Graphic" in T3000, it launches a web browser displaying real-time sensor data in an interactive chart.

## Quick Reference

### URL Parameters
- `sn`: Serial number of the T3000 device (required for real data)
- `panel_id`: Panel ID within the device (required for real data)
- `trendlog_id`: Specific trend log ID to display (required for real data)
- `all_data`: Monitor point data in URL-encoded JSON format (from C++ backend)

### Example URLs
```
Demo mode: http://localhost:3003/#/trend-log
Real data: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1
With JSON: http://localhost:3003/#/trend-log?sn=123&panel_id=3&trendlog_id=1&all_data=<URL-encoded-JSON>
```

## What's in the Complete Guide

The comprehensive guide includes:

1. **Quick Start** - Get up and running fast
2. **Architecture Overview** - Understand the system design
3. **Parameter Reference** - All URL parameters explained
4. **C++ Implementation** - Complete backend integration code
5. **Vue.js Implementation** - Complete frontend implementation
6. **Data Flow & Processing** - How data moves through the system
7. **Testing & Debugging** - Tools and techniques for development
8. **API Reference** - All functions and data structures
9. **Troubleshooting** - Common problems and solutions
10. **Code Examples** - Working examples you can copy

## Architecture Overview

```
C++ Application (T3000)
├── Str_monitor_point (data structure)
├── ConvertMonitorDataToJson() (conversion)
├── UrlEncodeJson() (encoding)
├── Generate complete URL
└── Launch WebView

Vue.js Application
├── Extract URL parameters
├── Decode JSON from all_data parameter
├── Validate JSON structure
├── Display in TrendLogChart component
└── Fallback to API/demo data
```

## Data Flow Summary

1. **C++ Data Collection**: `Str_monitor_point` structure contains monitor data
2. **JSON Conversion**: `ConvertMonitorDataToJson()` converts to JSON format
3. **URL Encoding**: `UrlEncodeJson()` makes JSON URL-safe
4. **URL Generation**: Creates complete URL with all parameters
5. **WebView Launch**: Opens Vue.js application with data
6. **Parameter Extraction**: Vue.js extracts URL parameters
7. **JSON Decoding**: Decodes and parses JSON data
8. **Data Validation**: Validates JSON structure
9. **Visualization**: Displays data in trend log chart

## Key Features

- **Real-time Integration**: Direct C++ to Vue.js data flow
- **JSON Data Transport**: Structured data format via URL parameters
- **Error Handling**: Graceful fallbacks for parsing failures
- **Development Support**: Demo mode and debug tools
- **Comprehensive Documentation**: Complete integration guide with examples
- **Testing Tools**: Built-in debugging and testing functions

## Getting Started

1. **Read the Complete Guide**: Start with the [Complete Integration Guide](T3000-TrendLog-Complete-Integration-Guide.md)
2. **Check Examples**: Review the code examples in the guide
3. **Test Integration**: Use the provided test functions
4. **Debug Issues**: Follow the troubleshooting section

For detailed implementation, API reference, and troubleshooting, see the complete guide.
- **1-based Indexing**: User-friendly trend log IDs
- **URL Encoding**: Safe transport of JSON data in URLs

## Getting Started

1. **Development Setup**: Start Vue.js dev server on port 3003
2. **C++ Integration**: Use `OnBnClickedBtnMonitorGraphic()` button
3. **Testing**: Use debug buttons in the Vue.js interface
4. **Validation**: Check browser console for data flow logs

For detailed implementation instructions, see the specific documentation files listed above.
