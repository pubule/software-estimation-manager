# Test Execution Guide

## Software Estimation Manager - Automated Testing Suite

This guide provides comprehensive instructions for executing the automated test suite for the Software Estimation Manager application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Test Framework Architecture](#test-framework-architecture)
4. [Installation & Setup](#installation--setup)
5. [Running Tests](#running-tests)
6. [Test Categories](#test-categories)
7. [Configuration Options](#configuration-options)
8. [Test Data & Fixtures](#test-data--fixtures)
9. [Troubleshooting](#troubleshooting)
10. [Continuous Integration](#continuous-integration)
11. [Test Reports](#test-reports)

## Overview

The Software Estimation Manager uses a comprehensive BDD (Behavior-Driven Development) test suite built with:

- **Cucumber.js** - BDD framework with Gherkin feature files
- **Jest** - Unit testing framework
- **Electron Testing** - Desktop application automation
- **Page Object Model** - Maintainable UI test structure
- **Fixture-based Data** - Consistent test data management

The test suite covers **481 scenarios** across **9 feature areas**, providing complete validation of application functionality including edge cases and known issues.

## Prerequisites

### System Requirements

- **Node.js** 16+ 
- **npm** 8+
- **Electron** 28+
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18+)

### Dependencies

All testing dependencies are defined in `package.json`:

```json
{
  "@cucumber/cucumber": "^10.3.1",
  "@playwright/test": "^1.40.1",
  "playwright": "^1.40.1",
  "spectron": "^19.0.0",
  "@testing-library/jest-dom": "^6.1.5",
  "jest": "^29.7.0"
}
```

## Test Framework Architecture

### Directory Structure

```
├── cucumber/
│   ├── fixtures/           # Test data (JSON files)
│   │   ├── projects.json
│   │   ├── features.json
│   │   └── configurations.json
│   ├── page-objects/       # UI interaction abstractions
│   │   ├── main-page.js
│   │   └── feature-modal.js
│   ├── step-definitions/   # Cucumber step implementations
│   │   ├── project-management-steps.js
│   │   ├── feature-management-steps.js
│   │   ├── configuration-management-steps.js
│   │   ├── project-phases-management-steps.js
│   │   ├── data-persistence-steps.js
│   │   ├── export-functionality-steps.js
│   │   ├── version-management-steps.js
│   │   ├── ui-interactions-steps.js
│   │   └── bugs-and-known-issues-steps.js
│   ├── support/            # Test framework setup
│   │   ├── world.js        # Custom World class
│   │   └── hooks.js        # Before/After hooks
│   └── utils/              # Helper functions
│       └── test-helpers.js
├── features/               # Gherkin feature files (9 files)
├── tests/                  # Jest unit tests
├── reports/                # Test execution reports
└── cucumber.config.js      # Cucumber configuration
```

### Key Components

**World Class** (`cucumber/support/world.js`)
- Manages Electron application lifecycle
- Provides shared state across scenarios
- Includes page objects and test helpers
- Handles fixture data loading

**Page Objects** (`cucumber/page-objects/`)
- Abstraction layer for UI interactions
- Reusable methods for common operations
- Enhanced error handling and retry logic

**Step Definitions** (`cucumber/step-definitions/`)
- Implementation of Gherkin steps
- Business logic testing
- Real-time calculation validation
- Error condition handling

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Electron Application

Ensure the main application runs correctly:

```bash
npm start
```

### 3. Run Test Setup Verification

```bash
# Run basic Jest tests
npm test

# Verify Cucumber configuration
npm run cucumber -- --dry-run
```

## Running Tests

### Full Test Suite

```bash
# Run all automated tests (Jest + Cucumber)
npm run test:all

# Run only Cucumber BDD tests
npm run cucumber

# Run with HTML report generation
npm run cucumber:report
```

### Individual Feature Testing

Test specific feature areas:

```bash
# Project Management (120 scenarios)
npm run cucumber -- --profile project-management

# Feature Management (95 scenarios) 
npm run cucumber -- --profile feature-management

# Configuration Management (68 scenarios)
npm run cucumber -- --profile configuration-management

# Project Phases (43 scenarios)
npm run cucumber -- --profile project-phases

# Data Persistence (38 scenarios)
npm run cucumber -- --profile data-persistence

# Export Functionality (32 scenarios)
npm run cucumber -- --profile export-functionality

# Version Management (29 scenarios)
npm run cucumber -- --profile version-management

# UI Interactions (35 scenarios)
npm run cucumber -- --profile ui-interactions

# Bugs & Known Issues (21 scenarios)
npm run cucumber -- --profile bugs-and-issues
```

### Smoke Testing

Run critical scenarios only:

```bash
npm run cucumber -- --profile smoke --tags @smoke
```

### Test Filtering

```bash
# Run scenarios with specific tags
npm run cucumber -- --tags "@calculation"
npm run cucumber -- --tags "@validation"
npm run cucumber -- --tags "@export"

# Exclude scenarios
npm run cucumber -- --tags "not @slow"
npm run cucumber -- --tags "not @known-bug"
```

## Test Categories

### 1. Project Management (120 scenarios)
- Project lifecycle management
- State management and auto-save
- Coverage calculation algorithms
- Hierarchical configuration initialization

### 2. Feature Management (95 scenarios)  
- CRUD operations with validation
- Real-time calculation engine
- Modal form interactions
- Input validation and error handling

### 3. Configuration Management (68 scenarios)
- Hierarchical configuration system
- Global defaults vs project overrides
- Supplier, category, and resource management
- Data inheritance and cascading

### 4. Project Phases Management (43 scenarios)
- 8-phase project structure
- Resource allocation across roles (G1, G2, TA, PM)
- Cost calculations and effort distribution
- Phase dependencies and automation

### 5. Data Persistence (38 scenarios)
- File operations (save/load/validation)
- Electron API integration
- localStorage fallback mechanism
- Data integrity and error recovery

### 6. Export Functionality (32 scenarios)
- Multi-format export (CSV, JSON, Excel)
- Special character handling and escaping
- 3-sheet Excel structure
- Field mapping and data formatting

### 7. Version Management (29 scenarios)
- Project snapshots and comparisons
- Version ID generation (V1, V2, V3...)
- Data integrity checksums
- Restoration capabilities

### 8. UI Interactions (35 scenarios)
- Modal management and navigation
- Form validation and user feedback
- Keyboard shortcuts and accessibility
- Responsive design testing

### 9. Bugs and Known Issues (21 scenarios)
- Documents current behavioral quirks
- Validation message inconsistencies
- Timing and concurrency issues
- Performance edge cases

## Configuration Options

### Cucumber Configuration (`cucumber.config.js`)

```javascript
{
  // Test execution
  parallel: 2,              // Parallel test execution
  retry: 2,                 // Retry failed scenarios
  failFast: true,           // Stop on first failure (CI)
  
  // Timeouts
  timeouts: {
    default: 30000,         // Default step timeout
    electron: 60000,        // Electron app startup
    fileOperation: 10000,   // File operations
    modal: 5000             // Modal interactions
  },
  
  // Electron configuration
  testConfig: {
    electronPath: './src/main.js',
    headless: false,        // Set to true for CI
    slowMo: 0,             // Slow down for debugging
    devtools: false        // Enable for debugging
  }
}
```

### Environment Variables

```bash
# Headless mode (for CI)
export HEADLESS=true

# Slow motion (debugging)
export SLOW_MO=500

# Enable dev tools
export DEVTOOLS=true

# CI mode (affects retry/parallel settings)
export CI=true
```

## Test Data & Fixtures

### Project Fixtures (`cucumber/fixtures/projects.json`)

- **simpleProject**: Basic 2-feature project
- **complexProject**: Enterprise-scale project with 5 features
- **specialCharactersProject**: CSV/export testing with edge cases
- **emptyProject**: Clean slate project
- **versionTestProject**: Pre-configured with version history

### Feature Fixtures (`cucumber/fixtures/features.json`)

- **basicFeature**: Standard feature for testing
- **complexFeature**: High-complexity feature with advanced properties
- **highRiskFeature**: Testing risk calculations
- **calculationTestFeatures**: Array of features with known expected results
- **validationTestFeatures**: Features for testing validation rules

### Configuration Fixtures (`cucumber/fixtures/configurations.json`)

- **defaultConfiguration**: Standard setup with suppliers/categories
- **enterpriseConfiguration**: High-complexity enterprise setup
- **testConfiguration**: Minimal configuration for testing
- **specialCharacterConfiguration**: Edge case configuration with Unicode/special chars

### Using Fixtures in Tests

```javascript
// In step definitions
const projectData = this.getFixture('projects', 'simpleProject');
await this.setupProjectWithFixture('complexProject');

// Create mock data
const mockProject = this.createMockProject('complex');
const testData = this.generateTestData();
```

## Troubleshooting

### Common Issues

**1. Electron App Won't Start**
```bash
# Check Electron installation
npx electron --version

# Verify main.js path
ls -la src/main.js

# Check for port conflicts
lsof -ti:3000
```

**2. Test Timeouts**
```bash
# Increase timeout for debugging
export DEFAULT_TIMEOUT=60000

# Run with slower execution
export SLOW_MO=1000
```

**3. Modal/UI Element Not Found**
```bash
# Run with browser dev tools
export DEVTOOLS=true

# Check element selectors in feature modal
npm run cucumber -- --profile ui-interactions --tags "@modal"
```

**4. Calculation Discrepancies**
```bash
# Run calculation-specific tests
npm run cucumber -- --tags "@calculation"

# Check test data in fixtures
cat cucumber/fixtures/features.json | grep -A 20 "calculationTestFeatures"
```

### Debug Mode

Enable comprehensive debugging:

```bash
# Full debug mode
export DEBUG=true
export HEADLESS=false
export DEVTOOLS=true
export SLOW_MO=500

npm run cucumber -- --profile feature-management
```

### Log Analysis

Test logs are generated in multiple formats:

```bash
# Check Cucumber HTML report
open reports/cucumber-report.html

# JSON report for CI integration
cat reports/cucumber-report.json

# Check application logs
tail -f logs/electron-*.log
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
name: Automated Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        env:
          HEADLESS: true
          CI: true
        run: |
          npm run test
          npm run cucumber
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports-${{ matrix.os }}
          path: reports/
```

### Jenkins Integration

```groovy
pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test'
                    }
                }
                stage('BDD Tests') {
                    steps {
                        sh 'HEADLESS=true npm run cucumber'
                    }
                }
            }
        }
    }
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'cucumber-report.html',
                reportName: 'Cucumber Report'
            ])
        }
    }
}
```

## Test Reports

### HTML Reports

Generated automatically with test execution:

- **Location**: `reports/cucumber-report.html`
- **Content**: Scenario results, screenshots, execution time
- **Features**: Drill-down by feature, filtering, search

### JSON Reports

Machine-readable format for CI integration:

- **Location**: `reports/cucumber-report.json`  
- **Usage**: CI dashboards, metrics collection
- **Schema**: Standard Cucumber JSON format

### JUnit XML

For Jenkins/CI integration:

- **Location**: `reports/cucumber-junit.xml`
- **Usage**: Test result trending, failure analysis

### Custom Test Summary

Automatically generated after test execution:

- **Location**: `reports/test-summary.md`
- **Content**: Execution overview, coverage summary, recommendations

## Best Practices

### Test Development

1. **Use Page Objects**: Interact with UI through page objects, not direct selectors
2. **Leverage Fixtures**: Use consistent test data from fixture files
3. **Document Edge Cases**: Use bugs-and-known-issues.feature for current limitations
4. **Real-time Validation**: Verify calculations match expected formulas
5. **Clean State**: Each scenario should start with clean application state

### Test Maintenance

1. **Regular Updates**: Keep step definitions in sync with UI changes
2. **Fixture Management**: Update fixtures when business rules change
3. **Error Handling**: Provide clear failure messages with context
4. **Performance**: Monitor test execution time and optimize slow scenarios
5. **Documentation**: Keep feature descriptions and step definitions current

### CI/CD Integration

1. **Fail Fast**: Configure CI to stop on first critical failure
2. **Parallel Execution**: Use parallel test execution for faster feedback
3. **Environment Parity**: Ensure test environment matches production
4. **Artifact Collection**: Always collect reports and screenshots
5. **Notification**: Set up alerts for test failures and trends

## Support & Maintenance

For questions and issues related to the test suite:

1. Check this documentation first
2. Review existing GitHub issues
3. Examine test logs and reports
4. Create detailed bug reports with:
   - Test scenario that failed
   - Environment details (OS, Node version)
   - Error messages and logs
   - Steps to reproduce

The test suite is designed to be comprehensive, maintainable, and reliable. Regular updates and maintenance ensure it continues to provide value as the application evolves.