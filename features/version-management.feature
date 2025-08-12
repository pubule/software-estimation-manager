Feature: Version Management
  As a project manager
  I want to create, compare, and restore project versions
  So that I can track project changes and revert to previous states when needed

  Background:
    Given the Version Manager is initialized
    And the VSCode-style sidebar navigation is functional
    And I have a project loaded with features and phases
    And the version history system is available
    And version history is accessible through Projects panel navigation

  Scenario: Initialize version manager with default settings
    Given the version manager is being set up
    When initialization completes
    Then the maximum versions should be set to 50
    And the maximum file size should be set to 10MB
    And keyboard shortcuts should be registered globally
    And event handlers should be properly bound for cleanup

  Scenario: Load existing versions from current project
    Given the current project has existing versions in its version history
    When the version manager initializes
    Then all existing versions should be loaded into the current versions list
    And the version data should be available for display and operations

  Scenario: Create comprehensive project snapshot
    Given I have a project with features, phases, and configuration
    When I create a project snapshot
    Then the snapshot should include complete project metadata
    And the snapshot should include all features with their details
    And the snapshot should include all project phases with calculations
    And the snapshot should include coverage information
    And the snapshot should include a timestamp
    And the snapshot should be deep-cloned to prevent data contamination

  Scenario: Generate version IDs following V+number pattern
    Given I have no existing versions
    When I generate a new version ID
    Then the ID should be "V1"
    Given I have existing versions V1 and V3 (skipping V2)
    When I generate a new version ID  
    Then the ID should be "V4" (next after highest existing)

  Scenario: Generate checksum for data integrity validation
    Given I have project data to version
    When I generate a checksum for the data
    Then the checksum should be consistent for identical data
    And the checksum should be different for modified data
    And the checksum should be in hexadecimal format
    And the same data should always produce the same checksum

  Scenario: Create new project version with reason
    Given I have made changes to my project
    When I create a new version with reason "Added authentication features"
    Then a new version should be created with incremented version ID
    And the version should include the specified reason
    And the version should have a current timestamp
    And the version should contain a complete project snapshot
    And the version should be added to the project's version history

  Scenario: Limit versions to maximum allowed
    Given I have reached the maximum number of versions (50)
    When I create a new version
    Then the oldest version should be removed automatically
    And the new version should be added
    And the total version count should remain at the maximum limit

  Scenario: Access version history through VSCode Projects navigation
    Given I have the Projects panel open in the VSCode sidebar
    And I have a project loaded
    When I click on "Version History" in the project navigation
    Then the history-page should become active
    And I should be able to access version history functionality
    And the version history should integrate with the VSCode layout

  Scenario: Display version history with filtering options in VSCode context
    Given I have multiple versions with different reasons and dates
    When I view the version history through VSCode navigation
    Then I should see all versions listed chronologically
    And each version should show: ID, reason, timestamp, and actions
    And the interface should use VSCode dark theme styling
    When I enter text in the reason search field
    Then only versions containing that text in their reason should be displayed
    When I select a date range filter
    Then only versions within that date range should be displayed
    And filtering should work smoothly within the VSCode interface

  Scenario: Filter versions by reason text
    Given I have versions with reasons "Initial setup", "Added login", "Fixed authentication"
    When I search for "auth"
    Then versions with "Added login" and "Fixed authentication" should be displayed
    And "Initial setup" should be hidden
    And the search should be case-insensitive

  Scenario: Filter versions by date range
    Given I have versions from different time periods
    When I select "This Week" from the date range filter
    Then only versions created in the current week should be displayed
    When I select "This Month"
    Then only versions from the current month should be displayed
    And the filtering should handle timezone differences appropriately

  Scenario: Compare two project versions
    Given I have two different versions of my project
    When I select two versions for comparison
    Then I should see a side-by-side comparison view
    And differences in features should be highlighted
    And differences in phases should be highlighted  
    And added, modified, and removed items should be clearly marked
    And the comparison should be readable and actionable

  Scenario: Restore project to previous version
    Given I have a previous version I want to restore
    When I select "Restore" for that version
    Then I should see a confirmation dialog warning about data loss
    When I confirm the restoration
    Then the current project should be replaced with the selected version's data
    And all features should be restored to the previous state
    And all phases should be restored to the previous state
    And the project should be marked as dirty to require saving

  Scenario: View version details in read-only mode
    Given I want to examine a previous version without restoring it
    When I select "View" for a specific version
    Then I should see the project data as it existed in that version
    And all data should be displayed in read-only format
    And I should be able to browse features and phases from that version
    And I should be able to close the view and return to current project

  Scenario: Handle keyboard shortcuts for version operations in VSCode context
    Given the version manager is active within the VSCode interface
    When I press Ctrl+Shift+V (or appropriate shortcut)
    Then the create version dialog should open
    And the dialog should overlay the VSCode interface properly
    When I press Ctrl+Shift+H (or appropriate shortcut)
    Then the version history navigation should be activated
    And the Projects panel should expand if not already open
    And the Version History section should be selected automatically

  Scenario: Export version data for backup through VSCode interface
    Given I have project versions I want to backup
    When I request to export version data through the version history interface
    Then all version snapshots should be packaged for export
    And the export should include version metadata and project data
    And the export operation should work within the VSCode layout context
    And the exported data should be importable later
    And export progress should be displayed appropriately

  Scenario: Import version data from backup
    Given I have previously exported version data
    When I import the version backup file
    Then all versions from the backup should be restored
    And existing versions should be preserved or merged appropriately
    And version IDs should be adjusted to prevent conflicts

  Scenario: Clean up old versions manually
    Given I have many versions and want to reduce storage
    When I trigger manual version cleanup
    Then I should be able to select which versions to keep
    And I should be warned about versions that will be deleted
    And important versions should be clearly marked for preservation

  # Version Management Integration with VSCode Interface

  Scenario: Version snapshots include VSCode interface state
    Given I create a version while in a specific VSCode panel state
    When the version snapshot is created
    Then the snapshot should include relevant interface state information
    And navigation context should be preserved where appropriate
    And version restoration should consider interface state implications

  Scenario: Version operations within VSCode modal management
    Given version dialogs and modals are opened
    When version operations are performed
    Then version modals should integrate with the modal management system
    And version modals should not conflict with other system modals
    And modal isolation should prevent event listener conflicts

  # Error Scenarios and System Behaviors

  Scenario: Handle version ID parsing without validation
    Given version IDs are expected to follow "V#" pattern  
    When a version ID doesn't follow the expected pattern
    Then the parsing assumes "V" prefix without validation
    And malformed version IDs could cause parsing errors
    And this represents a potential robustness issue
    And version management UI might display malformed IDs incorrectly

  Scenario: Create version without project validation
    Given the version creation process is initiated
    When no project validation is performed before snapshot
    Then versions could be created with incomplete or invalid project data
    And this could lead to corrupted version history
    And restoration from such versions could fail
    And VSCode interface state might become inconsistent

  Scenario: Version management UI refresh issues
    Given the version management UI needs to refresh within VSCode context
    When table updates are triggered
    Then references to undefined `updateTable` method exist
    And this could cause runtime errors during UI updates
    And table refresh functionality might not work properly
    And VSCode navigation might be affected by UI refresh failures

  Scenario: Simple hash algorithm vulnerable to collisions
    Given checksum generation uses a simple hash algorithm
    When different project data is processed
    Then there is a low probability of hash collisions
    And collisions could cause data integrity issues
    And more robust hashing might be needed for large-scale use
    And capacity planning data might contribute to collision likelihood

  Scenario: Date filtering inconsistencies across time zones
    Given versions store timestamps in various formats
    When date filtering is applied in the VSCode interface
    Then local time comparisons might be inconsistent with UTC storage
    And timezone-related filtering errors could occur
    And date boundaries might not align correctly
    And users in different time zones might see inconsistent results

  Scenario: No logic to preserve important versions during cleanup
    Given automatic version cleanup occurs when limits are reached
    When old versions are removed
    Then no consideration is given to version importance
    And critical milestone versions could be accidentally deleted
    And users have no way to mark versions as "important" or "protected"
    And capacity planning milestone versions might be lost inappropriately