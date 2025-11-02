# Project Phases Status Configuration - Feature Initialization

## Raw Feature Description

Once a project is loaded, the user should be able to define in the "Project Phases Configuration" submenu whether the project is in "Approved" or "Pending Approval" status. This information must become a project attribute that is:

1. Present in the app store (Zustand state)
2. Persisted in the saved project JSON file

## Context

- **Application**: Software Estimation Manager (Electron + React + TypeScript)
- **State Management**: Zustand (single store at src/renderer/js/store/app-store.js)
- **Target Users**: Project Managers, Team Leads
- **Architecture Pattern**: React Components → Actions → Store → State Update

## Key Requirements

- Status must be persistable (JSON file-based storage)
- Must be accessible from Project Phases Configuration UI
- Should be part of the project data model
- Follow the State/Actions/Components pattern from CLAUDE.md

## Related Roadmap Features

This feature relates to:
- **Phase 0**: Project Phase Organization (item #4)
- **Phase 3**: Estimation Approval Workflow (item #29) - future feature for approval workflows
- **Phase 1**: Project Timeline and Dependency Visualization (item #12) - may display approval status

## Business Value

Enables project managers to track and communicate the approval status of projects, supporting governance and stakeholder visibility into which projects have been formally approved vs are pending approval.
