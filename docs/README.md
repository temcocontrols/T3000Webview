# T3000 WebView Documentation

This folder contains comprehensive documentation for the T3000 WebView HVAC system.

## Documents

### [T3000 Library Analysis](./T3000-Library-Analysis.md)
Complete architectural analysis of the T3000 library including:
- Architecture overview and patterns
- Directory structure breakdown
- Critical issues identification and status
- Strengths and weaknesses analysis
- Performance metrics and recommendations
- Development guidelines and best practices

## Quick Reference

### Architecture Layers
```
UI Layer (Vue Components)
  ↓
Business Logic (Opt/ modules)
  ↓
Domain Objects (Shape/ modules)
  ↓
Drawing Primitives (Basic/ modules)
  ↓
SVG Rendering (T3Svg.js)
```

### Key Statistics
- **Overall Health Score**: 8.2/10
- **Total Files**: 150+
- **Lines of Code**: ~50,000+
- **Technology Stack**: Vue 3, TypeScript, SVG, WebSocket
- **Primary Use**: HVAC system visualization and control

### Priority Actions
1. **High**: Set up comprehensive testing framework
2. **Medium**: Refactor large files (T3Data.ts - 1,779 lines)
3. **Low**: Standardize error handling patterns

---

*Documentation last updated: June 30, 2025*
