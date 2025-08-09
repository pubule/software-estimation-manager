# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Default Operating Instructions
**SEMPRE**: Ottimizzando l'uso degli agenti e usando MCP quando necessario, esegui ogni task con massima efficienza utilizzando gli strumenti disponibili.

## Common Development Commands

### Development & Build
- `npm run dev` - Start development with hot reload
- `npm start` - Start Electron application
- `npm run build` - Build for all platforms
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS  
- `npm run build:linux` - Build for Linux

### Testing
- `npm test` - Run unit and behavioral tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:all` - Run all tests (unit + e2e)

### File Structure
```
src/
├── main.js                 # Electron main process
├── preload.js             # Preload script for secure IPC
└── renderer/              # Frontend application
    ├── index.html         # Main UI (CRITICAL: Script loading order matters)
    ├── js/
    │   ├── main.js        # Application entry point (uses ApplicationController)
    │   ├── data-manager.js # Data persistence layer
    │   ├── components/    # Modular components
    │   │   ├── application-controller.js  # Main app controller with version management
    │   │   ├── configuration-manager.js   # Hierarchical config system
    │   │   ├── feature-manager.js         # Feature CRUD operations
    │   │   ├── navigation.js              # Enhanced navigation
    │   │   ├── project-manager.js         # Project operations
    │   │   ├── project-phases-manager.js  # Project phase calculations
    │   │   ├── version-manager.js         # Version history & auto-update
    │   │   └── modal.js                   # Modal system
    │   └── utils/
    │       ├── base-component.js  # Base class (MUST load first)
    │       ├── modal-manager.js   # Modal base classes
    │       └── helpers.js         # Utility functions
    └── styles/            # CSS styles with VSCode dark theme
tests/
├── jest-setup.js          # Jest test configuration and mocks
├── behavioral-tests.js    # Comprehensive behavioral documentation tests
├── configuration-manager-tests.js  # Configuration system tests
└── ...                    # Additional test files
```

## Architecture Overview

### Core Components
1. **ApplicationController** (`application-controller.js`) - Main application controller with integrated version management
2. **DataManager** - Handles persistence (Electron file system + localStorage fallback)
3. **ConfigurationManager** - Hierarchical configuration system (Global → Project → Local)
4. **FeatureManager** - CRUD operations for project features
5. **ProjectPhasesManager** - Calculates and manages 8 project phases
6. **VersionManager** - **NEW**: Automatic version updates and history management
7. **EnhancedNavigationManager** - Tab-based navigation with state persistence

### Data Flow
- **Global Config** → **Project Config** → **Feature Data**
- Configuration inheritance: Global defaults can be overridden at project level
- Auto-save every 2 minutes with dirty state tracking
- Real-time calculations update as features change

### Key Features
- **Hierarchical Configuration**: Global suppliers/resources/categories with project-specific overrides
- **Project Phase Automation**: Development phase auto-calculated from features
- **Automatic Version Management**: **NEW** - Every save automatically updates current version with latest state
- **Stable Version Comparison**: **NEW** - Fixed false differences by excluding volatile timestamp fields
- **Multi-format Export**: JSON, CSV, Excel support
- **Navigation State**: Persists user's current section across sessions
- **Dual Persistence**: Electron file system with localStorage fallback

### Component Dependencies
```
ApplicationController
├── DataManager (persistence)
├── ConfigurationManager (config hierarchy)  
├── FeatureManager (depends on ConfigurationManager)
├── ProjectPhasesManager (depends on ConfigurationManager)
├── VersionManager (version history & auto-update)  
├── NavigationManager (enhanced with state persistence)
└── ProjectManager (project file operations)
```

### Configuration System
The app uses a hierarchical configuration approach:
- **Global Config**: Default suppliers, internal resources, categories, calculation parameters
- **Project Overrides**: Project-specific additions/modifications stored in `projectOverrides`
- **Migration**: Automatic upgrade from old flat config format to hierarchical

### Data Validation
- All project data validated before save/load operations
- Configuration migration handled automatically
- Fallback mechanisms for missing/corrupt data

### Development Notes
- Uses Electron with `contextIsolation: true` for security
- All IPC communication through preload script
- VSCode-style dark theme throughout
- Hot reload in development mode
- Component-based architecture for maintainability

## Critical Development Guidelines

### Script Loading Order (MUST FOLLOW)
The HTML file has a **critical script loading dependency chain**:
```html
<!-- 1. Base classes MUST load first -->
<script src="js/utils/base-component.js"></script>

<!-- 2. Core utilities (needed by components) -->
<script src="js/utils/modal-manager.js"></script>

<!-- 3. Components that depend on base classes -->
<script src="js/components/feature-manager.js"></script>
```

**⚠️ WARNING**: Changing this order will break the application with `BaseComponent is not defined` or `ModalManagerBase is not defined` errors.

### Version Management Integration
Every project save operation triggers automatic version updates:
```javascript
// In ApplicationController.saveProject()
if (this.managers.version && this.currentProject && this.currentProject.versions?.length > 0) {
    await this.managers.version.updateCurrentVersion();
    await this.managers.data.saveProject(this.currentProject);
}
```

### Test Infrastructure
- **Behavioral Tests**: Document current system behavior, including known bugs
- **Mock System**: Comprehensive mocks in `tests/jest-setup.js`
- **Test Coverage**: Focus on behavioral documentation rather than traditional unit testing

### Codebase History Notes
- **v1.0.0**: Original codebase with duplicate `-refactored` files
- **v1.1.0**: Consolidated architecture, removed duplicates, added version auto-update
- All `*-refactored.js` files were consolidated into primary files (e.g., `main-refactored.js` → `main.js`)

### Troubleshooting Common Issues
1. **"BaseComponent is not defined"** → Check script loading order in index.html
2. **Version comparison shows differences** → Verify `generateChecksum()` excludes volatile fields
3. **Tests failing** → Check mock implementations in `jest-setup.js` match expected data structures
4. **Application won't start** → Ensure ApplicationController is properly initialized in main.js