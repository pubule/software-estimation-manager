# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development & Build
- `npm run dev` - Start development with hot reload
- `npm start` - Start Electron application
- `npm run build` - Build for all platforms
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS  
- `npm run build:linux` - Build for Linux

### File Structure
```
src/
├── main.js                 # Electron main process
├── preload.js             # Preload script for secure IPC
└── renderer/              # Frontend application
    ├── index.html         # Main UI
    ├── js/
    │   ├── main.js        # Main application controller
    │   ├── data-manager.js # Data persistence layer
    │   ├── components/    # Modular components
    │   │   ├── configuration-manager.js    # Hierarchical config system
    │   │   ├── feature-manager.js         # Feature CRUD operations
    │   │   ├── navigation.js              # Enhanced navigation
    │   │   ├── project-manager.js         # Project operations
    │   │   ├── project-phases-manager.js  # Project phase calculations
    │   │   └── modal.js                   # Modal system
    │   └── utils/
    │       └── helpers.js  # Utility functions
    └── styles/            # CSS styles with VSCode dark theme
```

## Architecture Overview

### Core Components
1. **SoftwareEstimationApp** (`main.js`) - Main application controller
2. **DataManager** - Handles persistence (Electron file system + localStorage fallback)
3. **ConfigurationManager** - Hierarchical configuration system (Global → Project → Local)
4. **FeatureManager** - CRUD operations for project features
5. **ProjectPhasesManager** - Calculates and manages 8 project phases
6. **EnhancedNavigationManager** - Tab-based navigation with state persistence

### Data Flow
- **Global Config** → **Project Config** → **Feature Data**
- Configuration inheritance: Global defaults can be overridden at project level
- Auto-save every 2 minutes with dirty state tracking
- Real-time calculations update as features change

### Key Features
- **Hierarchical Configuration**: Global suppliers/resources/categories with project-specific overrides
- **Project Phase Automation**: Development phase auto-calculated from features
- **Multi-format Export**: JSON, CSV, Excel support
- **Navigation State**: Persists user's current section across sessions
- **Dual Persistence**: Electron file system with localStorage fallback

### Component Dependencies
```
SoftwareEstimationApp
├── DataManager (persistence)
├── ConfigurationManager (config hierarchy)  
├── FeatureManager (depends on ConfigurationManager)
├── ProjectPhasesManager (depends on ConfigurationManager)
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