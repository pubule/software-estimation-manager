# Manual Smoke Test Checklist

The automated Cucumber test suite (45 scenarios) tests **business logic only** — Actions + Store in Node.js. It does NOT test UI rendering, Electron IPC, or the packaged application.

Run this checklist before releases to verify what automated tests cannot cover.

## Pre-release Smoke Test

### App Launch
- [ ] `npm run dev` starts without errors
- [ ] Electron window opens and renders the UI
- [ ] Navigation menu is visible and responsive

### Project Lifecycle
- [ ] Create a new project via modal
- [ ] Project appears in current project card
- [ ] Save project (verify file written to disk)
- [ ] Close and reload project from recent projects list

### Feature Management
- [ ] Add a feature with name, manDays, supplier
- [ ] Edit a feature — verify changes persist
- [ ] Delete a feature — verify removal
- [ ] Feature count updates in UI

### Calculations
- [ ] Navigate to Calculations page
- [ ] Verify vendor cost table populates
- [ ] Switch between Feature-Based and Working Package modes
- [ ] Verify KPI section shows percentages

### Capacity
- [ ] Navigate to Capacity Timeline
- [ ] Verify team members are listed
- [ ] Monthly allocation grid renders

### Export
- [ ] Export project to Excel — verify file is created
- [ ] Share via email — verify template generates

## What Automated Tests Cover

The `npm test` suite validates:
- Store state mutations (addFeature, deleteFeature, etc.)
- Actions class business logic (FeatureActions, CalculationsActions, etc.)
- Calculator factory mode selection
- Fixture data loading and configuration
- Assumption CRUD and validation
- Version history snapshots
- Ticket CSV parsing and metrics
- Working days calculation

## What Automated Tests Do NOT Cover

- Electron renderer process / preload bridge
- React component rendering and event handling
- IPC communication (main ↔ renderer)
- File system operations (save/load .sem files)
- DOM interactions and CSS layout
- Module initialization order in ESM/bundler mode
