# T3000 WebView Documentation

This directory contains all documentation for the T3000 WebView integration project.

## Documentation Structure

### 📁 `/analysis/`
Technical analysis and research documentation:
- **`t3000-version-checking.md`** - Complete analysis of T3000's version checking mechanism for manual testing

### 📁 `/bugs/`
Bug tracking and issue documentation:
- **`webview-cache-issue-complete.md`** - Complete WebView cache issue analysis, all attempted solutions, and final resolution
- **`README.md`** - Bug tracking guidelines and status overview

### 📁 `/project/`
Project management and tracking documentation:
- **`PROJECT_STATUS.md`** - Current project status, milestones, and progress tracking
- **`CHANGELOG.md`** - Version history and changes log

## Quick Navigation

### 🔍 For Debugging Issues
- Start with `/bugs/` to understand known issues
- Check `/analysis/` for technical deep-dives
- Review `/project/PROJECT_STATUS.md` for current status

### 🔧 For Implementation
- Primary focus: `/bugs/001-webview-cache-not-cleared.md`
- Technical details: `/analysis/t3000-version-checking.md`
- Testing procedures: Both bug analysis and version checking docs

### 📊 For Project Management
- Current status: `/project/PROJECT_STATUS.md`
- Change history: `/project/CHANGELOG.md`
- Bug overview: `/bugs/README.md`

## Key Documentation

| Document | Purpose | Status |
|----------|---------|--------|
| [WebView Cache Bug](bugs/001-webview-cache-not-cleared.md) | Root cause analysis and solution | ✅ COMPLETE |
| [Version Checking Analysis](analysis/t3000-version-checking.md) | T3000 update mechanism research | ✅ COMPLETE |
| [Project Status](project/PROJECT_STATUS.md) | Current project state | 🔄 ACTIVE |
| [Bug Tracking](bugs/README.md) | Issue management | 🔄 ACTIVE |

## Implementation Focus

**Primary Task**: Integrate WebView cache clearing into T3000's auto-update process
- **Root Cause**: Identified in T3000 C++ code
- **Solution**: Add cache clearing to update process
- **Testing**: Use version checking manipulation methods
- **Location**: T3000_Building_Automation_System_Source/ (via symbolic link)

## Contributing

When adding new documentation:
1. Choose appropriate subfolder based on content type
2. Use descriptive filenames with consistent naming convention
3. Update this README.md to reference new documents
4. Cross-reference related documents where applicable
