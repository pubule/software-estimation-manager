# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-08

### Added
- **Automatic Version Updates**: Every project save now automatically updates the current version with latest project state
- **Enhanced Version Comparison**: Fixed checksum generation to exclude volatile fields (timestamps) preventing false differences
- **Comprehensive Test Infrastructure**: Added behavioral documentation tests for all major components

### Fixed
- **Critical Script Loading Order**: Fixed BaseComponent and ModalManagerBase loading sequence preventing application startup failures
- **Version Comparison Bug**: Resolved issue where comparing a version with itself showed false differences due to timestamp volatility
- **Duplicate Script Loading**: Eliminated duplicate BaseComponent declarations causing JavaScript errors
- **Test Suite Infrastructure**: Fixed 175+ test failures by correcting Jest API usage and mock implementations

### Changed
- **Codebase Consolidation**: Removed all `-refactored` suffix files and renamed them as primary files
- **File Structure Cleanup**: Consolidated duplicate JavaScript files (main.js, data-manager.js, etc.)
- **Application Architecture**: Updated to use ApplicationController as primary entry point
- **Test Configuration**: Improved Jest setup with proper DOM mocking and component isolation

### Technical Details

#### Version Management System
- Modified `ApplicationController.saveProject()` to trigger `VersionManager.updateCurrentVersion()` on every save
- Enhanced `VersionManager.generateChecksum()` to exclude `lastModified` and `calculationData.timestamp` fields
- Added comprehensive logging for version comparison debugging

#### Script Loading Order Fixes
```html
<!-- Before: BaseComponent loaded twice, ModalManagerBase after components -->
<!-- After: Proper dependency order -->
<script src="js/utils/base-component.js"></script>        <!-- Base classes first -->
<script src="js/utils/modal-manager.js"></script>         <!-- Dependencies before consumers -->
<script src="js/components/feature-manager.js"></script>  <!-- Components after dependencies -->
```

#### File Consolidation
- `main-refactored.js` → `main.js`
- `data-manager-refactored.js` → `data-manager.js`
- `feature-manager-refactored.js` → `feature-manager.js`
- `configuration-manager-refactored.js` → `configuration-manager.js`

#### Test Infrastructure Improvements
- Fixed Jest API usage: `jest.fn().rejects()` → `jest.fn().mockRejectedValue()`
- Enhanced DOM setup with required elements for behavioral tests
- Corrected mock implementations to match expected test data structures
- Improved configuration manager mocks with realistic default data

### Developer Notes
- All core functionality remains backward compatible
- Application now automatically maintains version history consistency
- Test suite provides comprehensive behavioral documentation
- Codebase architecture is significantly cleaner after consolidation

### Migration Guide
No user action required. The application will automatically:
1. Update current versions on every save operation
2. Generate stable version checksums excluding volatile data
3. Load components in correct dependency order

---

**Breaking Changes**: None - All changes are internal improvements

**Contributors**: Claude TDD Developer Agent

**Files Modified**: 
- `/src/renderer/index.html` - Script loading order fixes
- `/src/renderer/js/main.js` - Application entry point consolidation
- `/src/renderer/js/components/application-controller.js` - Version update integration
- `/src/renderer/js/components/version-manager.js` - Checksum stability fixes
- `/tests/jest-setup.js` - Test infrastructure improvements
- `/jest.config.js` - Test configuration updates