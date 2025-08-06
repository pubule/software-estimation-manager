# Software Estimation Manager - Behavioral Test Suite

## Overview

This comprehensive behavioral test suite documents the **current behavior** of the Software Estimation Manager application as it exists today. These tests serve as living documentation, capturing not just the intended functionality but also the actual implementation behaviors, edge cases, quirks, and even bugs discovered during analysis.

## Test Philosophy

**IMPORTANT**: These tests document reality, not ideals. They capture:
- ✅ How the system actually behaves today
- ✅ Current business logic and calculations  
- ✅ Existing validation rules and error handling
- ✅ UI interaction patterns and workflows
- ✅ Data flow and component interactions
- ⚠️  Known bugs and behavioral quirks
- ⚠️  Potential issues and edge cases

**Do NOT modify these tests to "fix" behaviors** - they document what the system currently does.

## Test Structure

### Core Component Tests

#### 1. `behavioral-tests.js` - Main Application (SoftwareEstimationApp)
**Purpose**: Documents the main application controller behavior
**Key Behaviors Documented**:
- Application initialization with component loading sequence
- Project lifecycle management (new, load, save, close)
- Configuration migration from old to hierarchical format
- Coverage auto-calculation (30% of total man days)
- Export functionality (CSV, JSON, Excel with 3-sheet structure)
- Error handling and edge cases
- UI state management and status indicators

**Notable Bugs Documented**:
- Description validation inconsistency (checks 3 chars, error says 10)
- Multiple timeout delays that could overlap during project creation
- Auto-save disabled but markDirty still triggers updates

#### 2. `data-manager-tests.js` - Data Persistence Layer
**Purpose**: Documents file operations, validation, and data handling
**Key Behaviors Documented**:
- Project data validation with specific error messages
- Dual persistence strategy (Electron API + localStorage fallback)
- CSV generation with complex field escaping rules
- File operations with automatic timestamp updates
- Settings management across different storage methods

**Notable Bugs Documented**:
- `saveToSpecificFile` creates browser download instead of actual file save
- Version management methods exist but `versionsKey` is undefined
- CSV resolution methods assume config structure without validation

#### 3. `feature-manager-tests.js` - Feature CRUD Operations
**Purpose**: Documents feature management, validation, and UI interactions
**Key Behaviors Documented**:
- Real-time calculation formula: `realMDs * (100 + risk) / expertise`
- Feature validation with specific rules (ID format, description length, man days limits)
- Modal management with multiple close mechanisms
- Dropdown population with visual indicators for project-specific items
- Table rendering with expandable two-row structure
- Filtering and sorting with AND logic

**Notable Bugs Documented**:
- Element waiting logic logs warnings instead of throwing errors
- Validation message inconsistency (checks 3 chars, says 10 chars)
- Redundant DOM queries in toggle functionality
- Listener setup removes/recreates repeatedly

#### 4. `configuration-manager-tests.js` - Hierarchical Configuration System
**Purpose**: Documents the Global → Project → Local override system
**Key Behaviors Documented**:
- Default configuration creation with specific suppliers, categories, rates
- Configuration merging logic with override precedence
- Caching system with hash-based cache keys
- Project-specific item management and validation
- Migration from old flat config to hierarchical structure
- Deep cloning and object comparison utilities

**Notable Bugs Documented**:
- Reset functionality doesn't handle array references correctly
- Cache key generation could produce hash collisions
- Migration method exists but isn't automatically called
- Deletion assumes global item existence without validation

#### 5. `project-phases-manager-tests.js` - 8-Phase Project Management
**Purpose**: Documents project phases calculation and resource management
**Key Behaviors Documented**:
- 8 standard phases (functionalSpec, techSpec, development, sit, uat, vapt, consolidation, postGoLive)
- Development phase auto-calculation from features + coverage
- Resource assignment with 4 roles (G1, G2, TA, PM)
- Special development cost calculation using feature-specific supplier rates
- Effort distribution validation with visual indicators
- Real-time synchronization with project data

**Notable Bugs Documented**:
- Complex DOM selector fallback logic in totals updates
- Development cost calculation assumes features have suppliers
- Multiple setTimeout calls could cause timing conflicts
- Validation exists but is never called during input handling
- Sync methods don't ensure project structure exists

#### 6. `version-manager-tests.js` - Version Control System
**Purpose**: Documents project versioning, comparison, and history management
**Key Behaviors Documented**:
- Version creation with V# ID pattern and comprehensive snapshots
- Checksum-based data integrity validation
- Version filtering by reason and date ranges
- Automatic cleanup when version limits exceeded
- Current version updates vs. new version creation
- Keyboard shortcuts and UI interaction patterns

**Notable Bugs Documented**:
- Version ID parsing assumes V prefix without validation
- No project validation before snapshot creation
- Simple hash algorithm vulnerable to collisions
- Date filtering mixes local time with UTC timestamps
- References to undefined `updateTable` method
- No logic to preserve important versions during cleanup

## Running the Tests

### Prerequisites
```bash
npm install --save-dev jest @testing-library/jest-dom
```

### Test Execution
```bash
# Run all behavioral tests
npm test

# Run specific component tests
npm test behavioral-tests.js
npm test data-manager-tests.js
npm test feature-manager-tests.js
npm test configuration-manager-tests.js
npm test project-phases-manager-tests.js
npm test version-manager-tests.js

# Run with coverage
npm test -- --coverage
```

### Test Configuration
Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/renderer/js/**/*.js',
    '!src/renderer/js/**/*.test.js'
  ],
  testMatch: [
    '<rootDir>/tests/**/*.js'
  ]
};
```

## Key Behavioral Insights

### 1. Application Architecture
- **Component Initialization Order**: Specific sequence with error handling and fallbacks
- **Event-Driven Updates**: MarkDirty triggers cascade of updates across components
- **Dual Persistence**: Electron API primary, localStorage fallback with method detection

### 2. Data Management Patterns
- **Auto-Calculation Logic**: Coverage = 30% of features, Development phase = features + coverage
- **Validation Strategy**: Client-side validation with specific rules and error messaging
- **Configuration Inheritance**: Global → Project → Override hierarchy with caching

### 3. User Interface Behaviors
- **Modal Management**: Multiple close mechanisms (ESC, click outside, buttons)
- **Table Interactions**: Expandable rows, sorting, filtering with visual feedback
- **Real-time Updates**: Input changes trigger immediate calculations and UI refresh

### 4. Business Logic Calculations
- **Feature Estimation**: `realMDs * (100 + riskMargin) / expertiseLevel`
- **Phase Distribution**: Effort percentages applied to total man days per phase
- **Cost Calculations**: Man days × resource rates with special development phase logic

### 5. Error Handling Patterns
- **Graceful Degradation**: Fallbacks for missing data, invalid configurations
- **Validation Cascades**: Multi-level validation from UI to data persistence
- **Logging Strategy**: Console warnings for non-critical issues, errors for failures

## Using These Tests

### For Developers
1. **Before Changes**: Run tests to understand current behavior
2. **During Development**: Update tests when intentionally changing behavior
3. **After Changes**: Verify tests still document actual behavior
4. **Bug Fixes**: Update bug documentation when issues are resolved

### For QA/Testing
1. **Regression Testing**: Tests document expected current behavior
2. **Edge Case Validation**: Comprehensive edge case and error condition coverage
3. **Integration Verification**: Component interaction patterns documented

### For Documentation
1. **Behavior Reference**: Authoritative source of how system actually works
2. **Business Rule Documentation**: Calculation formulas and validation rules captured
3. **User Interaction Patterns**: UI workflows and expected user experience

## Maintenance Guidelines

### When to Update Tests
- ✅ When bugs are fixed (update bug documentation)
- ✅ When features are intentionally changed
- ✅ When new behaviors are discovered
- ❌ Don't change tests to match desired behavior
- ❌ Don't remove tests for inconvenient behaviors

### Test Organization
- Each component has its own test file
- Tests grouped by functionality area
- Bug documentation clearly marked with `BUG:` prefix
- Behavioral documentation uses `BEHAVIOR:` prefix

## Known Limitations

### Test Coverage Areas Not Included
- **UI Component Tests**: Modal, navigation, table component behaviors
- **Integration Tests**: Full workflow end-to-end testing  
- **Export Tests**: Comprehensive export functionality validation
- **Performance Tests**: Load testing and performance characteristics

### Future Test Expansion
As the application evolves, additional test files should be created for:
- Enhanced navigation testing
- Complete export functionality validation
- UI component interaction testing
- Full integration workflow testing
- Performance and load testing

## Contributing

When contributing to this test suite:
1. **Document Reality**: Test what the system actually does
2. **Include Edge Cases**: Test boundary conditions and error scenarios
3. **Mark Bugs Clearly**: Use `BUG:` prefix for known issues
4. **Provide Context**: Explain why behaviors exist, not just what they do
5. **Maintain Organization**: Follow existing test structure and naming conventions

Remember: These tests are living documentation. They should accurately reflect the current state of the system and serve as a reliable reference for understanding how the Software Estimation Manager actually behaves in practice.