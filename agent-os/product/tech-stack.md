# Technology Stack - Software Estimation Manager

## Overview

Software Estimation Manager is built as a desktop application leveraging modern web technologies. The stack prioritizes developer productivity, code maintainability, type safety, and user experience while maintaining high performance on local hardware.

---

## Frontend Stack

### Core Framework
- **Electron** (v28.0.0) - Desktop application framework enabling cross-platform (Windows, macOS, Linux) distribution with native OS integration
- **React** (v18.3.1) - Component-based UI framework with hooks and concurrent features
- **TypeScript** (v5.3.3) - Static type checking for safer code and better IDE support
- **React Router DOM** (v6.20.1) - Client-side routing and navigation between application pages

### UI/Component Architecture
- **Component Pattern**: React functional components with TypeScript for type safety
- **State-Driven Components**: Components receive state via props/hooks, contain zero business logic
- **Presentation-Only Rule**: All UI components focused on rendering; business logic delegated to Actions
- **Custom Hooks**: `useStore()` for state subscription, `useFeatureActions()` and similar for action access

### Build and Development Tools
- **Vite** (v7.1.3) - Build tool and dev server for extremely fast hot module replacement
- **Vite Plugin Electron** (v0.28.4) - Seamless Electron development integration with HMR
- **@vitejs/plugin-react** (v4.2.1) - React-specific Vite plugin with JSX handling
- **Concurrently** (v7.6.0) - Run Vite dev server and Electron together during development

### Development Workflow
- `npm run dev` - Starts Vite in watch mode and Electron with automatic reload on source changes
- `npm run build:react` - Production build of React application
- `npm run build:react:dev` - Development build with source maps and watch mode
- `npm start` - Launch Electron application (requires prior React build)

### CSS and Styling
- Dark Visual studio code theme (dark theme by default)
- Inline CSS or CSS modules (no CSS-in-JS framework selected yet)
- Responsive design principles for different screen sizes

---

## State Management

### Core State Management
- **Zustand** (v5.0.8) - Lightweight state management library with minimal boilerplate
- **Single Store**: `src/renderer/js/store/app-store.js` is the single source of truth for all application state
- **Store Location**: Centralized to prevent state fragmentation and enable consistency

### State Architecture

```javascript
// Store Structure (app-store.js)
store = {
  projects: Project[],           // All projects
  currentProject: Project | null, // Currently selected project
  teamMembers: TeamMember[],     // Organization team members
  vendors: Vendor[],             // External vendors/contractors
  kpiData: KPIMetric[],         // Production metrics (tickets, cards, etc.)

  // Setters and computed functions
  addProject(project): void,
  deleteProject(id): void,
  updateProject(id, data): void,
  addProjectFeature(feature): void,
  // ... more store methods
}
```

### Store Access Patterns

**In React Components**:
```typescript
// Read state
const features = useStore(state => state.currentProject?.features);
const projects = useStore(state => state.projects);

// Dispatch actions
const { addFeature, deleteFeature } = useFeatureActions();
addFeature({ name: "New Feature", estimatedHours: 40 });
```

**In Actions Classes**:
```typescript
// Get store instance and current state
const store = appStore; // Global store instance
const state = store.getState();

// Update state through store methods
state.addProjectFeature(newFeature);
state.markDirty(); // Mark for auto-save
```

### Auto-Save Mechanism
- Auto-save triggered every 2 minutes if state is marked dirty (`markDirty()`)
- Dirty flag set whenever data changes through Actions
- Prevents data loss while maintaining performance

---

## Actions and Business Logic

### Architecture Pattern: React Component → Actions → Store → State Update

```
┌─────────────────┐
│  React Component│
│  (UI only)      │
└────────┬────────┘
         │ calls
         ▼
┌─────────────────────────┐
│  Actions Classes        │
│  (Business Logic)       │
│  - FeatureActions       │
│  - ProjectActions       │
│  - AllocationActions    │
│  - etc.                 │
└────────┬────────────────┘
         │ updates
         ▼
┌─────────────────┐
│  Zustand Store  │
│  (State)        │
└────────┬────────┘
         │ triggers
         ▼
┌─────────────────┐
│  Re-render UI   │
└─────────────────┘
```

### Actions Classes Location
- `src/renderer/react/actions/` - All business logic concentrated here
- One Actions class per domain (FeatureActions, ProjectActions, AllocationActions, etc.)
- Each action method contains complete business logic for that operation

### Actions Implementation Pattern
```typescript
// src/renderer/react/actions/FeatureActions.ts
export class FeatureActions {

  private getStore() {
    return window.appStore; // Access global store
  }

  addFeature(data: FeatureFormData): void {
    const store = this.getStore();
    const state = store.getState();

    // BUSINESS LOGIC HERE
    const newFeature = {
      ...data,
      id: this.generateNextFeatureId(),
      created: new Date().toISOString(),
      status: 'PENDING'
    };

    // VALIDATION
    if (!newFeature.name || newFeature.estimatedHours <= 0) {
      throw new Error('Invalid feature data');
    }

    // UPDATE STORE
    state.addProjectFeature(newFeature);
    state.markDirty();

    // NO DIRECT MUTATIONS - always go through store
  }

  deleteFeature(featureId: string): void {
    const state = this.getStore().getState();
    state.deleteProjectFeature(featureId);
    state.markDirty();
  }
}
```

### Absolute Rules for Actions
1. **All business logic in Actions** - No logic in components
2. **Access state through store** - Never direct state mutations
3. **Mark state as dirty** - After modifications for auto-save
4. **Throw errors on validation failures** - Let components handle display
5. **No side effects outside store updates** - Pure functions where possible

---

## Data Persistence

### Storage Technology
- **electron-store** (v8.1.0) - File-based persistent storage using JSON files
- **Default Location**: User's application data directory (platform-specific):
  - Windows: `C:\Users\[username]\AppData\Roaming\Software Estimation Manager\`
  - macOS: `~/Library/Application Support/Software Estimation Manager/`
  - Linux: `~/.config/Software Estimation Manager/`

### Data Structure
- Single JSON file containing entire application state
- Versioning support for schema migrations
- Atomic writes prevent corruption on unexpected shutdowns

### No Remote Sync
- All data stored locally on user's machine
- No cloud sync or server components (desktop-first approach)
- User responsible for backups or file replication
- Enables offline-first operation and data privacy

### File Format
```json
{
  "version": "1.0.0",
  "projects": [...],
  "teamMembers": [...],
  "vendors": [...],
  "kpiData": [...],
  "lastSaved": "2024-01-15T10:30:00Z"
}
```

---

## Testing Framework

### Test Strategy: Cucumber BDD (Behavior-Driven Development)

**CRITICAL**: Only Cucumber tests are used. No Jest, unit tests, or other test frameworks.

- **Testing Library**: @cucumber/cucumber (v10.3.1)
- **Browser Automation**: Playwright (v1.40.1) for UI testing
- **Test Data**: Fixtures in `cucumber/fixtures/`
- **Page Objects**: `cucumber/page-objects/` for UI element selectors
- **Step Definitions**: `cucumber/step-definitions/` for test implementation

### Test Organization
```
cucumber/
├── step-definitions/         # Gherkin step implementations
│   ├── feature-steps.ts
│   ├── allocation-steps.ts
│   ├── kpi-steps.ts
│   └── ...
├── page-objects/             # UI selectors and helpers
│   ├── FeaturePage.ts
│   ├── AllocationPage.ts
│   └── ...
├── fixtures/                 # Test data
│   ├── sample-project.json
│   └── ...
└── cucumber.js               # Cucumber configuration

features/                      # Gherkin feature files (.feature)
├── features.feature
├── allocation.feature
├── kpi.feature
└── ...
```

### Running Tests
- `npx cucumber-js` - Run all Cucumber tests
- `npx cucumber-js features/features.feature` - Run specific feature
- Tests run in headless Electron environment
- Playwright automates UI interactions during tests

### Test Writing Guidelines

**IMPORTANT**: Tests describe user-facing behavior, not implementation details.

```gherkin
# CORRECT - User-focused behavior
Feature: Feature Management
  Scenario: User can add a new feature
    Given user has opened a project
    When user clicks "Add Feature"
    And user enters feature name "User Authentication"
    And user enters estimated hours "40"
    And user clicks "Save"
    Then feature appears in feature list
    And feature name is "User Authentication"
    And feature hours are "40"

# WRONG - Implementation focused
Feature: Feature Management
  Scenario: Feature reducer updates state
    Given initial state with empty features
    When action ADD_FEATURE is dispatched with payload
    Then state.features array has new item
    # This is too implementation-focused!
```

---

## Data Import/Export

### CSV Import Capabilities
- **Libraries**: papaparse (v5.4.1) for CSV parsing, exceljs (v4.4.0) for Excel support
- **Supported Formats**: CSV, XLSX (Excel)
- **Use Cases**:
  - Importing production KPI metrics (completed tickets, cards, bugs)
  - Team member data from HR systems
  - Vendor/cost data from contracts or accounting

### CSV Import Process
1. User selects CSV file from file system
2. Application presents column mapping UI
3. User maps CSV columns to application fields
4. Data validated before import
5. Imported data merged into application state
6. Import history tracked

### Export Formats
- **JSON**: Raw project data export for backup
- **CSV**: Reports and data tables exportable to CSV
- **Excel**: Financial and capacity reports exported to XLSX with formatting
- **PDF**: Future support for formatted reports (not MVP)

### xlsx Library (v0.18.5)
- Lightweight Excel read/write support
- Used for Excel file exports and import
- No dependency on heavy Excel libraries

---

### Development Environment
- **IDE**: WebStorm/VSCode recommended
- **Node.js**: v18+ (Electron requirement)
- **npm**: v9+ for package management
- **Git**: Version control for team collaboration

### Hot Module Replacement (HMR)
- Vite provides instant HMR for React components
- Electron main process reloads on changes
- Preserves application state during reload (when possible)
- Dramatically speeds up development iteration

---

## Build and Distribution

### Build Process

**React Build**:
```bash
npm run build:react    # Production build
```
- Outputs to `dist/` directory
- Minified and optimized bundle
- Source maps generated

**Electron Build**:
```bash
npm run build:win      # Windows installer
npm run build:mac      # macOS app
npm run build          # Default platform
```

### Electron Builder Configuration
- **Windows Target**: NSIS installer (executable setup)
- **macOS Target**: zip and DMG distribution
- **Linux Target**: AppImage format
- **Auto-Update Support**: Built-in for future release management

### Code Signing (Future)
- Windows: Authenticode signing for installer
- macOS: Code signing and notarization for security
- Currently unsigned in development

### Application Identity
- **App ID**: com.yourcompany.software-estimation-manager
- **Product Name**: Software Estimation Manager
- **Version**: Managed in package.json
- **Icon**: assets/icon.png

---

## Security Considerations

### Electron Security
- **contextIsolation**: true - Prevents XSS attacks from accessing main process
- **Preload Script**: Secure bridge between renderer and main process
- **No Node Integration**: Disabled to prevent direct system access
- **Sandbox**: Renderer processes run in sandbox for isolation

### Data Security
- All data stored locally - no transmission to servers
- No authentication required (single-user desktop app)
- File permissions: Application data directory secured per OS standards
- Future: Support for encryption at rest if needed

### Dependencies Security
- Regularly update dependencies for security patches
- npm audit before releases
- No hardcoded secrets in codebase
- Sensitive configuration in electron-store (protected by OS file permissions)

---

## Performance Considerations

### Target Specifications
- **Minimum RAM**: 2GB (comfortable operation)
- **Recommended RAM**: 4GB+ (for large projects)
- **Storage**: 100MB+ for application and data
- **CPU**: Dual-core processor or better

### Performance Optimizations
- **React Memo**: Memoize expensive components to prevent unnecessary re-renders
- **Selector Hooks**: Use fine-grained Zustand selectors to minimize re-renders on state changes
- **Lazy Loading**: Code-split routes using React.lazy (future)
- **Virtual Lists**: For large feature/project lists (future enhancement)
- **Debounced Auto-Save**: Save every 2 minutes, not on every keystroke

### Benchmarks (Target)
- Open large project (100+ features): < 1 second
- Add feature: < 100ms UI response
- Calculate capacity dashboard: < 500ms refresh
- Import 1000 KPI records: < 2 seconds

---

## Dependencies Summary

### Production Dependencies
```json
{
  "electron": "^28.0.0",
  "electron-store": "^8.1.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.20.1",
  "typescript": "^5.3.3",
  "zustand": "^5.0.8",
  "uuid": "^9.0.1",
  "papaparse": "^5.4.1",
  "exceljs": "^4.4.0",
  "xlsx": "^0.18.5"
}
```

### Development Dependencies
```json
{
  "@cucumber/cucumber": "^10.3.1",
  "@types/react": "^18.2.45",
  "@types/react-dom": "^18.2.18",
  "@vitejs/plugin-react": "^4.2.1",
  "@playwright/test": "^1.40.1",
  "concurrently": "^7.6.0",
  "electron-builder": "^24.9.1",
  "nodemon": "^3.0.2",
  "vite": "^7.1.3",
  "vite-plugin-electron": "^0.28.4"
}
```

---

## File Structure Reference

```
software-estimates-app/
├── src/
│   ├── main.js                      # Electron main process
│   ├── preload.js                   # Preload script for IPC
│   └── renderer/
│       ├── react/
│       │   ├── actions/             # Business logic (FeatureActions, etc.)
│       │   │   ├── FeatureActions.ts
│       │   │   ├── ProjectActions.ts
│       │   │   ├── AllocationActions.ts
│       │   │   └── ...
│       │   ├── components/          # React UI components (presentational only)
│       │   │   ├── FeatureManager.tsx
│       │   │   ├── AllocationDashboard.tsx
│       │   │   └── ...
│       │   ├── hooks/               # Custom React hooks
│       │   │   ├── useStore.ts
│       │   │   ├── useFeatureActions.ts
│       │   │   └── ...
│       │   └── pages/               # Full-page components
│       │       ├── ProjectsPage.tsx
│       │       ├── CapacityPage.tsx
│       │       └── ...
│       ├── js/
│       │   ├── store/
│       │   │   └── app-store.js     # Zustand store (single source of truth)
│       │   └── components/          # Legacy JS components (migrating to React)
│       └── index.html               # Entry point
├── cucumber/
│   ├── step-definitions/            # Gherkin step implementations
│   ├── page-objects/                # UI element selectors
│   ├── fixtures/                    # Test data
│   └── cucumber.js                  # Cucumber config
├── features/                        # Gherkin feature files
│   ├── features.feature
│   ├── allocation.feature
│   └── ...
├── package.json                     # Dependencies and scripts
├── vite.config.js                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── CLAUDE.md                        # Development guidelines
```

---

## Architecture Decision Records (ADRs)

### ADR-1: Desktop (Electron) vs Web App
- **Decision**: Build as Electron desktop application
- **Rationale**: Local data storage, offline capability, native OS integration, tighter control over user experience
- **Trade-off**: Larger download size vs web app flexibility

### ADR-2: Zustand vs Redux
- **Decision**: Use Zustand for state management
- **Rationale**: Minimal boilerplate, easier to learn, sufficient for this scale, faster performance
- **Trade-off**: Smaller community/ecosystem than Redux

### ADR-3: File-Based Persistence vs SQLite/Database
- **Decision**: Use electron-store (JSON file-based)
- **Rationale**: Simple data model, no server needed, easier backup/portability
- **Trade-off**: Not suitable for 1M+ records; adequate for target scale (50+ projects, 200+ features)

### ADR-4: Cucumber BDD Only vs Multiple Test Frameworks
- **Decision**: Use only Cucumber for acceptance testing; no Jest/unit tests
- **Rationale**: Focus on user behavior verification, reduce test maintenance overhead, align with TDD workflow
- **Trade-off**: Slower test feedback than unit tests; requires more careful test design

### ADR-5: Single Actions Class Pattern
- **Decision**: Each domain has dedicated Actions class (FeatureActions, ProjectActions, etc.)
- **Rationale**: Clear separation of concerns, easy to locate business logic, scalable to large teams
- **Trade-off**: Potential for duplicate logic if not careful; mitigated by shared base class

---

## Deployment and Release Process

### Version Management
- Semantic versioning (MAJOR.MINOR.PATCH)
- Version bumped in package.json for releases
- Electron Builder automatically includes version in installer/app

### Release Checklist
- [ ] All Cucumber tests passing
- [ ] CHANGELOG.md updated with release notes
- [ ] Version number incremented in package.json
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Build artifacts created (Windows, macOS, Linux)
- [ ] Release tagged in git

### Distribution
- Windows: NSIS installer (.exe)
- macOS: DMG or ZIP distribution
- Linux: AppImage format
- Future: Update server for auto-update capability

---

## Future Technology Considerations

### Potential Additions (Not MVP)
- **Database**: SQLite for larger datasets (> 1M records)
- **Server Sync**: Optional cloud sync for multi-device/team scenarios
- **Mobile App**: React Native companion app for mobile access
- **Real-Time Collaboration**: WebSocket for multi-user editing
- **Reporting Engine**: Dedicated reporting service or BI integration
- **Python/Node Backend**: Microservice for complex calculations

### Technology Monitoring
- React ecosystem updates and best practices
- Electron security updates and new capabilities
- TypeScript improvements and adoption of new features
- Zustand updates and alternative state management patterns
