# BDD Feature Files - Software Estimation Manager

## Overview

This directory contains comprehensive BDD (Behavior-Driven Development) scenarios written in Gherkin format for the Software Estimation Manager application. These feature files document the current behavior of the system from a business user perspective, serving as both living documentation and acceptance criteria for testing.

## Feature Files Organization

### 🎯 Core Business Features

#### [`project-management.feature`](./project-management.feature)
**Business Domain**: Project lifecycle and state management
- Creating, loading, saving, and closing projects
- Project dirty state management and status indicators
- Auto-calculation of coverage (30% of total feature man days)
- Configuration migration from old to hierarchical format
- Loading overlays and user feedback
- Keyboard shortcuts for common operations

#### [`feature-management.feature`](./feature-management.feature)
**Business Domain**: Feature CRUD operations and calculations
- Adding, editing, and deleting project features
- Real-time man days calculation: `realMDs * (100 + risk) / expertise`
- Feature validation with specific business rules
- Modal management and form interactions
- Table rendering with expandable rows
- Filtering and searching features

#### [`configuration-management.feature`](./configuration-management.feature)  
**Business Domain**: Hierarchical configuration system
- Global → Project → Local configuration override system
- Suppliers, categories, and internal resources management
- Configuration caching and performance optimization
- Project-specific overrides and customizations
- Default configuration initialization
- Configuration validation and integrity checks

#### [`project-phases-management.feature`](./project-phases-management.feature)
**Business Domain**: 8-phase project planning and resource allocation
- Standard project phases: functionalSpec, techSpec, development, sit, uat, vapt, consolidation, postGoLive
- Development phase auto-calculation from features + coverage
- Resource allocation across 4 roles: G1, G2, TA, PM
- Cost calculations using supplier and internal resource rates
- Effort distribution validation and management

### 🔧 Technical Features

#### [`data-persistence.feature`](./data-persistence.feature)
**Business Domain**: Data storage and retrieval
- Dual persistence strategy: Electron API + localStorage fallback
- Project data validation with specific error messages
- File system operations with timestamp management
- CSV generation with field escaping rules
- Settings management independent of project data

#### [`export-functionality.feature`](./export-functionality.feature)
**Business Domain**: Data export and reporting
- Multi-format export: CSV, JSON, Excel (3-sheet structure)
- Export context menu with proper positioning
- Field escaping for special characters and line breaks
- Excel workbook with Features, Phases, and Calculations sheets
- File naming conventions and sanitization

#### [`version-management.feature`](./version-management.feature)
**Business Domain**: Project versioning and comparison
- Version creation with V# ID pattern and comprehensive snapshots
- Checksum-based data integrity validation
- Version filtering by reason and date ranges
- Version comparison and restoration workflows
- Automatic cleanup when version limits exceeded

#### [`ui-interactions.feature`](./ui-interactions.feature)
**Business Domain**: User interface behavior and interactions
- Modal management with multiple close mechanisms
- Tab-based navigation with state persistence
- Table interactions (sorting, filtering, expansion)
- Form validation with real-time feedback
- Loading indicators and progress feedback
- Keyboard shortcuts and accessibility

#### [`bugs-and-known-issues.feature`](./bugs-and-known-issues.feature)
**Business Domain**: Documented bugs and behavioral quirks
- Validation discrepancies and message inconsistencies
- Timing issues and race conditions
- State management problems
- Data integrity concerns
- UI interaction quirks
- Performance and efficiency issues

## Writing Style and Philosophy

### Business-Focused Scenarios
All scenarios are written from the perspective of business users (project managers, estimators, administrators) rather than technical implementation details. The scenarios focus on **WHAT** the system should do, not **HOW** it does it.

### Current Behavior Documentation
**IMPORTANT**: These scenarios document the current behavior of the system as it exists today, including:
- ✅ Intended functionality and business logic
- ✅ Current calculations and validation rules  
- ✅ Existing UI workflows and interactions
- ⚠️  Known bugs and behavioral quirks
- ⚠️  Performance issues and edge cases

### Gherkin Format Standards

#### Scenario Structure
```gherkin
Scenario: Business-focused scenario title
  Given [initial context/preconditions] 
  When [specific user action or event]
  Then [expected outcome or system response]
  And [additional expected outcomes]
```

#### Background Usage
Each feature file includes a `Background` section establishing common preconditions for all scenarios in that feature.

#### Data Tables and Examples
Complex data is represented using Gherkin data tables:
```gherkin
Given I have a feature with the following details:
  | Property    | Value        |
  | id          | F1           |
  | description | Test Feature |
  | manDays     | 10           |
```

#### Bug Documentation Format
Known issues are clearly marked and explained:
```gherkin
Scenario: Description validation discrepancy between check and error message
  Given I am creating a new feature
  When I enter a description with exactly 4 characters
  Then the validation check should pass (actual requirement is 3+ characters)
  But the error message incorrectly states "10 characters minimum"
  # BUG: Error message claims 10 character minimum but code validates 3+ characters
```

## Key Business Rules Documented

### Calculation Formulas
- **Feature Man Days**: `realManDays * (100 + riskMargin) / expertiseLevel`
- **Auto Coverage**: `totalFeatureManDays * 0.3` (30% of features)
- **Development Phase**: `sum(featureManDays) + coverage`

### Validation Rules
- Feature ID: Must follow BR-### pattern with auto-increment
- Feature Description: 3+ characters (despite error message claiming 10+)
- Man Days: Must be positive numbers
- Project Structure: Must have project, features, phases, config properties

### Configuration Hierarchy
1. **Global Defaults** → Base configuration for all projects
2. **Project Config** → Inherits global, can be customized
3. **Project Overrides** → Project-specific additions stored separately

### Phase Structure
8 standard phases with specific roles and effort distributions:
- **Pre-development**: functionalSpec, techSpec
- **Development**: development (auto-calculated)  
- **Testing**: sit, uat, vapt
- **Deployment**: consolidation, postGoLive

## Using These Feature Files

### For QA Testing
1. **Acceptance Criteria**: Each scenario defines testable acceptance criteria
2. **Regression Testing**: Scenarios document expected current behavior
3. **Edge Case Coverage**: Comprehensive edge cases and error conditions
4. **Bug Tracking**: Known issues documented as specific scenarios

### For Development
1. **Behavior Reference**: Understand how system currently works
2. **Change Impact**: See what behaviors might be affected by code changes
3. **Bug Fixes**: Update scenarios when bugs are resolved
4. **Feature Enhancement**: Extend scenarios for new functionality

### For Business Analysis
1. **Requirements Documentation**: Current business rules and calculations
2. **User Workflow Documentation**: Step-by-step user interactions
3. **Feature Functionality**: Complete feature capabilities and limitations
4. **Integration Patterns**: How different components work together

### For Documentation
1. **Living Documentation**: Always current with actual system behavior
2. **User Guides**: Business scenarios explain user workflows
3. **Training Material**: Realistic usage scenarios for training
4. **API Documentation**: Component interactions and data flows

## Test Automation Integration

These Gherkin scenarios can be integrated with test automation frameworks:

### JavaScript/Node.js
- **Cucumber.js**: Direct Gherkin execution
- **Jest + Cucumber**: Combine with existing Jest test suite
- **Playwright + Cucumber**: End-to-end testing with Gherkin scenarios

### Setup Example
```javascript
// cucumber.js configuration
module.exports = {
  default: {
    require: ['features/step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber.html'],
    paths: ['features/**/*.feature']
  }
};
```

### Step Definitions Structure
```javascript
Given('the Software Estimation Manager application is running', function() {
  // Setup application state
});

When('I create a new project', function() {
  // Perform user action
});

Then('a new project should be created with name {string}', function(name) {
  // Verify expected outcome
});
```

## Maintenance Guidelines

### When to Update Scenarios
- ✅ **Bug Fixes**: Update bug documentation when issues are resolved
- ✅ **Feature Changes**: Modify scenarios when functionality changes
- ✅ **New Discoveries**: Add scenarios for newly discovered behaviors
- ❌ **Don't**: Change scenarios to match desired behavior instead of actual behavior

### Scenario Naming Conventions
- Use business-focused titles describing user goals
- Start with action verbs (Create, Validate, Calculate, Export, etc.)
- Include relevant business context and outcomes
- Avoid technical implementation details

### Error Scenario Guidelines
- Clearly mark with "# BUG:" comments
- Explain the nature of the issue
- Document workarounds if available
- Include expected vs. actual behavior

## Contributing

When adding new scenarios or modifying existing ones:

1. **Focus on Business Value**: Write scenarios that deliver business value
2. **Document Reality**: Capture actual system behavior, not ideals
3. **Use Clear Language**: Write for business stakeholders, not just developers
4. **Include Edge Cases**: Cover error conditions and boundary cases
5. **Maintain Structure**: Follow existing format and organization patterns

## Related Documentation

- [`../tests/README.md`](../tests/README.md) - Technical behavioral test documentation
- [`../CLAUDE.md`](../CLAUDE.md) - Development environment guidance
- [`../README.md`](../README.md) - Project overview and setup instructions

---

*These BDD scenarios serve as living documentation of the Software Estimation Manager's current behavior and business rules. They bridge the gap between technical implementation and business requirements, ensuring everyone understands how the system actually works.*