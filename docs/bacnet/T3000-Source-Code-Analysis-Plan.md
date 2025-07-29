# T3000 Source Code Analysis Plan

**Date:** July 30, 2025
**Project:** T3000 BACnet Integration Source Code Analysis
**Repository Integration:** T3000_Building_Automation_System → T3000Webview

## Source Code Access Requirements

### Target Repository Analysis
```
Source Repository: D:\1025\github\temcocontrols\T3000_Building_Automation_System
Solution File: D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 - VS2019.sln
Key Directory: *\T3000\
Current Workspace: d:\1025\github\temcocontrols\T3000Webview
```

### Required Source Code Components

#### 1. Trend Log Implementation
**Search Terms:** "Trend Log"
**Expected Locations:**
- Dialog/Window creation patterns
- Data collection mechanisms
- SQLite integration examples
- UI binding patterns

#### 2. WebView Server Implementation
**Search Terms:** "webview_run_server"
**Expected Components:**
- Threading patterns
- Message handling protocols
- WebSocket/HTTP server setup
- Client communication bridges

#### 3. SQLite Integration Patterns
**Expected Components:**
- Database connection management
- Schema creation and migration
- Time-series data handling
- Real-time data caching

#### 4. T3-TB Device Communication
**Expected Components:**
- Device discovery protocols
- Communication patterns
- Data polling mechanisms
- Error handling strategies

## BACnet Library Recommendations

### Primary Recommendation: Node-BACnet
```
Justification:
+ Native JavaScript/TypeScript integration
+ Direct compatibility with current WebView stack
+ No additional runtime dependencies
+ Good performance for building automation
+ Active development community

Integration Path:
- Install via npm in current project
- Create BACnet service layer
- Integrate with existing WebSocket/WebView bridge
```

### Secondary Option: YABE-Based Implementation
```
Advantages:
+ Proven BACnet implementation
+ Extensive device compatibility
+ Well-tested protocol handling
+ Open source availability

Challenges:
- C# .NET Framework dependency
- Requires interop layer for TypeScript
- Additional build complexity
```

### YABE Source Analysis Plan
```
YABE Repository: https://github.com/yabe-iot/yabe
Key Components to Analyze:
1. Device discovery implementation
2. Block read optimization
3. Error handling patterns
4. Protocol compliance patterns
5. Performance optimization techniques
```

## Multi-Scenario Architecture Plan

### Scenario 1: T3000 Panel Integration
```
Architecture:
T3000.exe → WebView2 → T3000Webview → BACnet Polling

Communication Flow:
1. T3000 C++ application hosts WebView2
2. WebViewClient.ts handles T3000 ↔ WebView messages
3. BACnet service runs alongside T3000
4. Shared SQLite database for coordination

Key Integration Points:
- Window/Dialog creation in T3000
- Message passing via WebViewClient.ts
- Shared database access patterns
```

### Scenario 2: Browser-Only Access
```
Architecture:
Browser → WebSocket → Rust API Server → BACnet Polling

Communication Flow:
1. External browser connects to localhost:9104
2. WebSocketClient.ts handles browser ↔ server messages
3. Rust API server coordinates BACnet polling
4. Independent SQLite database management

Key Integration Points:
- WebSocket message handling
- Independent server process
- Database coordination
```

### Scenario 3: Hybrid Operation
```
Architecture:
T3000.exe + Browser → Unified Backend → BACnet Polling

Communication Flow:
1. Both T3000 panel and external browser access
2. Unified message protocol
3. Single BACnet polling service
4. Coordinated database access

Key Integration Points:
- Message protocol unification
- Resource sharing coordination
- Database locking strategies
```

## Source Code Integration Strategy

### Phase 1: Code Access and Analysis
```
Required Actions:
1. Obtain access to T3000 source repository
2. Analyze Trend Log implementation patterns
3. Study webview_run_server threading patterns
4. Document SQLite usage patterns
5. Understand T3-TB communication protocols
```

### Phase 2: Pattern Extraction
```
Extract Key Patterns:
1. Window/Dialog creation for BACnet configuration
2. Threading patterns for background polling
3. SQLite transaction patterns
4. Message handling protocols
5. Error handling and recovery strategies
```

### Phase 3: Integration Design
```
Design Integration Points:
1. BACnet service as T3000 module
2. Enhanced WebView message protocols
3. Shared database coordination
4. Unified UI components
```

## T3-TB Device Support Strategy

### Device Communication Analysis
```
Research Requirements:
1. Existing T3000 ↔ T3-TB communication protocols
2. Data point mapping and configuration
3. Polling frequencies and optimization
4. Error handling specific to T3-TB devices
5. Device discovery and identification patterns
```

### BACnet Compliance Assessment
```
Validation Requirements:
1. T3-TB BACnet object support assessment
2. Block read capability testing
3. Standard BACnet service compliance
4. Performance comparison with proprietary protocols
```

## Next Steps and Access Requirements

### Immediate Actions Required
1. **Source Code Access:** Request access to T3000 source repository
2. **File Copying:** Copy key files to current workspace for analysis
3. **Pattern Documentation:** Document existing integration patterns
4. **BACnet Research:** Download and analyze YABE source code

### Analysis Priorities
1. **Trend Log Implementation:** Understand current data collection patterns
2. **WebView Integration:** Study message handling and threading
3. **SQLite Patterns:** Extract database integration approaches
4. **T3-TB Communication:** Understand device-specific protocols

### Development Environment Setup
1. **BACnet Library:** Install Node-BACnet for initial testing
2. **YABE Analysis:** Set up C# development environment
3. **Testing Infrastructure:** Prepare T3-TB device access
4. **Integration Testing:** Plan parallel operation testing

---

**Status:** Awaiting T3000 source code access
**Dependencies:** User confirmation for repository access
**Next Action:** Provide access to T3000 source code for detailed analysis
