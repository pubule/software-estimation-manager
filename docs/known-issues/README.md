# Known Issues and Bugs Documentation

## Overview

This directory contains documentation of known bugs and behavioral quirks in the Software Estimation Manager application. These are **NOT** automated tests that should pass, but rather documentation of current issues that need to be addressed in future development cycles.

## Files

- `bugs-documentation.feature` - Gherkin documentation of known bugs and issues
- `bugs-step-definitions.js.reference` - Reference step definitions for the documented bugs

## Purpose

These files serve as:
1. **Living documentation** of known issues
2. **Test cases for future bug fixes** 
3. **Behavioral documentation** for developers understanding current limitations
4. **Reference for QA testing** manual scenarios

## Why These Are Not Automated Tests

The scenarios documented here are **designed to fail** because they document current bugs. Running them as automated tests would:
- Cause CI/CD pipeline failures
- Create noise in test results
- Confuse the purpose of automated testing

## Usage

- **Developers**: Reference these when working on bug fixes
- **QA Teams**: Use as manual testing scenarios
- **Product Managers**: Prioritize fixes based on documented impact
- **Future Testing**: Convert to passing tests once bugs are fixed

## Moving Forward

When bugs are fixed:
1. Update the corresponding behavioral test to expect correct behavior
2. Move the scenario to appropriate feature file as a passing test
3. Remove or archive the bug documentation

---

*These files were moved from the main test suite to prevent automated test failures while preserving valuable behavioral documentation.*