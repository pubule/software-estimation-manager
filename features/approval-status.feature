Feature: Project Approval Status
  As a project manager,
  I want to set and view the approval status of projects,
  So that team members can quickly see whether projects are approved or pending approval

  Background:
    Given the application is open
    And the project manager has loaded a project

  Scenario: User sets approval status to "Approved" in Phases Configuration
    When the user opens the Phases Configuration modal
    And the user selects "Approved" from the approval status dropdown
    Then the approval status selector should show "Approved"
    And the project should be marked as dirty for auto-save

  Scenario: User sets approval status to "Pending Approval" in Phases Configuration
    When the user opens the Phases Configuration modal
    And the user selects "Pending Approval" from the approval status dropdown
    Then the approval status selector should show "Pending Approval"
    And the project should be marked as dirty for auto-save

  Scenario: Approval status persists after project save and reload
    When the user opens the Phases Configuration modal
    And the user selects "Approved" from the approval status dropdown
    And the user saves the project
    And the user reloads the project
    And the user opens the Phases Configuration modal
    Then the approval status selector should show "Approved"

  Scenario: New project defaults to "Pending Approval" status
    When the user creates a new project
    Then the new project should have "Pending Approval" as default approval status
    And the Phases Configuration should display "Pending Approval"

  Scenario: Old project without approvalStatus field defaults to "Pending Approval"
    Given a project file exists without an approvalStatus field
    When the user loads this legacy project
    Then the project should default to "Pending Approval" status
    And the Phases Configuration should display "Pending Approval"

  Scenario: Changing approval status updates CurrentProjectCard icon immediately
    Given the project is set to "Pending Approval" status
    And the CurrentProjectCard is visible
    When the user opens the Phases Configuration modal
    And the user selects "Approved" from the approval status dropdown
    And the user closes the Phases Configuration modal
    Then the CurrentProjectCard should display the green checkmark icon for "Approved"

  Scenario: Green checkmark displays for "Approved" status
    When the user opens the Phases Configuration modal
    And the user selects "Approved" from the approval status dropdown
    Then an approval status icon should be visible in CurrentProjectCard
    And the icon should be green (color #4CAF50)
    And the icon should be a checkmark symbol (fas fa-check-circle)
    And the icon tooltip should show "Approved"

  Scenario: Orange clock displays for "Pending Approval" status
    When the user opens the Phases Configuration modal
    And the user selects "Pending Approval" from the approval status dropdown
    Then an approval status icon should be visible in CurrentProjectCard
    And the icon should be orange (color #FF9800)
    And the icon should be a clock symbol (fas fa-clock)
    And the icon tooltip should show "Pending Approval"

  Scenario: Approval status icon displays in RecentProjectsList
    Given the user is viewing the RecentProjectsList
    When a recent project has "Approved" approval status
    Then the recent project item should display the approval status icon
    And the icon should be green (color #4CAF50)
    And the icon should be positioned inline with project metadata

  Scenario: Approval status icon displays in SavedProjectsList
    Given the user is viewing the SavedProjectsList
    When a saved project has "Pending Approval" approval status
    Then the saved project item should display the approval status icon
    And the icon should be orange (color #FF9800)
    And the icon should be positioned inline with project metadata

  Scenario: Changing approval status marks project dirty for auto-save
    Given the project has unsaved changes is false
    When the user opens the Phases Configuration modal
    And the user selects "Approved" from the approval status dropdown
    Then the project should be marked as dirty (isDirty = true)
    And the Save button should be enabled
    And auto-save should be triggered within the normal save interval

  Scenario: Approval status dropdown appears as first element in phases-controls
    When the user opens the Phases Configuration modal
    Then the ApprovalStatusSelector dropdown should be the first control element
    And the dropdown should be labeled "Project Approval Status"
    And the SupplierSelectors component should appear after the ApprovalStatusSelector
