# Project Architecture

## Core Architecture

### Main Components
1. **ApplicationController** - Main application orchestrator with integrated version management
2. **DataManager** - Dual persistence (Electron file system + localStorage fallback)
3. **ConfigurationManager** - Hierarchical configuration (Global → Project → Local)
4. **FeatureManager** - CRUD operations for project features
5. **ProjectPhasesManager** - 8-phase project calculations and management
6. **VersionManager** - Automatic version updates and history tracking
7. **EnhancedNavigationManager** - Tab-based navigation with state persistence

### Component Dependencies
```
ApplicationController (Entry Point)
├── DataManager (persistence layer)
├── ConfigurationManager (hierarchical config system)
├── FeatureManager (depends on ConfigurationManager)
├── ProjectPhasesManager (depends on ConfigurationManager)  
├── VersionManager (version history management)
├── NavigationManager (tab navigation & state)
└── ProjectManager (file operations)
```

### Data Flow Architecture
```
User Interface
    ↓
ApplicationController
    ↓
Component Managers (Feature, Phases, etc.)
    ↓
ConfigurationManager (hierarchical config resolution)
    ↓
DataManager (persistence abstraction)
    ↓
Storage Layer (Electron Store / localStorage)
```

## Configuration System
- **3-tier hierarchy**: Global Config → Project Overrides → Runtime State
- **Automatic migration**: Old flat config → New hierarchical format
- **External config loading**: From `{ProjectsPath}/config/defaults.json`
- **Inheritance**: Project-specific values override global defaults
- **Validation**: Robust validation with fallback mechanisms

## Project Structure Details

### Entry Points
- **Main Process**: `src/main.js` (Electron main)
- **Renderer Process**: `src/renderer/js/main.js` (Application entry)
- **Preload Script**: `src/preload.js` (Secure IPC bridge)

### Component Organization
- **Base Classes**: `src/renderer/js/utils/base-component.js` (MUST load first)
- **Utilities**: `src/renderer/js/utils/` (helpers, modal managers)
- **Components**: `src/renderer/js/components/` (feature-specific managers)
- **Styles**: `src/renderer/styles/` (VSCode dark theme)

### Data Management
- **Project Format**: JSON with metadata, features, phases, config, versions
- **Auto-save**: Every 2 minutes with dirty state tracking
- **Export Formats**: JSON, CSV, Excel (3-sheet structure)
- **Version History**: Automatic version creation on significant changes

### Testing Architecture
- **Unit Tests**: Jest with behavioral documentation approach
- **E2E Tests**: Cucumber with Playwright for Electron testing
- **Mock System**: Comprehensive mocks in `jest-setup.js`
- **Test Philosophy**: Document actual behavior, including bugs

## Key Business Rules
- **8 Project Phases**: Functional Spec, Tech Spec, Development, SIT, UAT, VAPT, Consolidation, Post Go-Live
- **Automatic Development Phase**: Calculated as sum of all features
- **Coverage Calculation**: Default 30% of total man days
- **Hierarchical Resource Assignment**: Global suppliers can be overridden per project
- **Real-time Calculations**: All costs and totals update automatically

## Security Model
- **Context Isolation**: Enabled for secure IPC
- **Preload Script**: All Electron API access through controlled interface
- **Input Validation**: All user data validated before persistence
- **File System**: Restricted to designated project folders

## Performance Considerations
- **Component-based Loading**: Lazy initialization of managers
- **Event-driven Updates**: Minimal DOM manipulation
- **Caching**: Configuration caching with intelligent invalidation
- **Memory Management**: Proper cleanup in component lifecycle