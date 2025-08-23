Feature: Project Management
  As a project manager
  I want to create, manage, and save software estimation projects
  So that I can track project features, costs, and phases

  Background:
    Given the Software Estimation Manager application is initialized
    And the VSCode-style sidebar navigation is functional
    And all required components are loaded
    And capacity planning integration is available

  Scenario: Create a new project with default structure and pending status
    Given I am working on any existing project
    When I create a new project
    Then a new project should be created with name "New Project"
    And the project should have version "1.0.0"
    And the project should have an empty features list
    And the project should have all 8 project phases defined
    And each phase should have manDays and cost properties initialized
    And the project status should show as unsaved in the title bar
    And the project default status should be "pending" not "approved"

  Scenario: Initialize project with hierarchical configuration system
    Given no project configuration exists
    When I initialize a new project
    Then the project should have a hierarchical configuration structure
    And the configuration should include global defaults for suppliers
    And the configuration should include global defaults for categories
    And the configuration should include global defaults for internal resources
    And the configuration should have empty project overrides
    And the configuration should be ready for project-specific customizations

  Scenario: Project dirty state affects UI indicators including title bar
    Given I have a clean project open
    When I modify project data
    Then the project should be marked as dirty
    And the project status indicator in title bar should display "●"
    And the title bar status indicator should have "unsaved" CSS class
    And the title bar status indicator should be properly aligned next to project name
    And the title bar status indicator should use warning color (orange/yellow)
    And the navigation manager should be notified of dirty state

  Scenario: Save project with unsaved changes updates title bar indicator
    Given I have a project with unsaved changes
    When I request to save the project
    Then the project should be saved successfully
    And the project should be marked as clean
    And the title bar project status indicator should display "○"
    And the title bar status indicator should have "saved" CSS class
    And the title bar status indicator should use success color (green)

  Scenario: Save project updates "Last saved" timestamp display
    Given I have a project with unsaved changes
    When I request to save the project
    Then the project should be saved successfully
    And the "Last saved" element should be updated with current timestamp
    And the timestamp should be formatted in Italian locale (DD/MM/YYYY HH:MM)
    And the timestamp should reflect the actual save time
    When I load an existing project
    Then the "Last saved" element should display the project lastModified timestamp
    When I create a new project
    Then the "Last saved" element should display "Last saved: Never"

  Scenario: Handle save request for missing project
    Given no project is currently loaded
    When I attempt to save the project
    Then the save operation should return false
    And no file operations should be performed

  Scenario: Close project with unsaved changes
    Given I have a project with unsaved changes
    When I request to close the project
    Then I should see a confirmation dialog asking to save changes
    And the dialog should say "You have unsaved changes. Do you want to save before continuing?"
    When I confirm to save before closing
    Then the project should be saved
    And the project should be closed
    And the window close should be confirmed

  Scenario: Auto-calculate coverage as 30% of total feature man days
    Given I have a project with features totaling 35 man days
    When the project summary is updated
    Then the coverage should be automatically calculated as 10.5 man days
    And the coverage should be marked as auto-calculated
    And the coverage reset button should be hidden

  Scenario: Override auto-calculated coverage with manual input
    Given I have a project with auto-calculated coverage of 10.5 man days
    When I manually enter coverage value of 15 man days
    Then the coverage should be set to 15 man days
    And the coverage should be marked as manually entered
    And the coverage reset button should become visible

  Scenario: Reset manual coverage to auto-calculated value
    Given I have a project with manual coverage of 15 man days
    And the auto-calculated coverage would be 10.5 man days
    When I click the reset coverage button
    Then the coverage should be restored to 10.5 man days
    And the coverage should be marked as auto-calculated
    And the coverage reset button should be hidden

  Scenario: Project creation involves multiple timed operations
    Given I initiate a new project creation
    When the project creation process begins
    Then the system should execute phase reset after 100ms timeout
    And the system should create initial version after 600ms timeout
    And the project should be properly initialized after all timeouts complete
    And the timing should ensure proper component initialization sequence
    And any race conditions should be prevented by the timeout structure

  Scenario: Load corrupted project data with graceful fallback
    Given a corrupted project file exists
    When I attempt to load the project
    Then a warning should be logged about the failed load
    And the system should continue operating normally
    And no error should be thrown to the user

  Scenario: Navigate to projects section through VSCode sidebar
    Given the application is fully initialized
    When the VSCode navigation system starts
    Then there should be a 500ms delay before default Projects panel activation
    And the Projects icon should become active after the delay
    And the Projects panel should open automatically
    And project navigation options should be available

  Scenario: Project management integration with capacity planning
    Given I have a project loaded with features and resource requirements
    When I access capacity planning through the VSCode sidebar
    Then capacity planning should have access to current project data
    And project features should be available for resource allocation
    And project timelines should integrate with capacity timeline views
    And resource assignments should be linkable to project phases

  Scenario: Migrate old project format to hierarchical configuration
    Given I have a project in the old flat configuration format
    And the project config lacks projectOverrides structure
    When the project is loaded
    Then the project should be automatically migrated to hierarchical format
    And the migrated config should have projectOverrides with empty arrays
    And the original project data should remain intact

  Scenario: Leave already migrated project unchanged
    Given I have a project already in hierarchical configuration format
    And the project config contains projectOverrides structure
    When the migration process runs
    Then the project should remain unchanged
    And no migration should be performed

  # Cross-System Integration

  Scenario: Project data integration with capacity planning
    Given I have a project with defined features and phases
    When I switch to capacity planning via VSCode sidebar
    Then project data should be available for capacity calculations
    And feature effort estimates should inform resource allocation
    And project phases should be available for timeline planning
    And capacity constraints should be considererd during project planning

  Scenario: Project status indicators across VSCode interface
    Given I have a project with unsaved changes
    When I navigate between different VSCode panels
    Then the project status indicator (●) should remain visible in the title bar
    And the status should be consistent across all panels
    And saving from any panel should update the global project state
    And the nav-project-status indicator should reflect current state

  Scenario: Project hierarchical navigation state management
    Given I have a project loaded
    When I expand the Projects section in the VSCode sidebar
    Then Features Management, Project Phases, Calculations, and Version History should be enabled
    And the nav-child items should lose their "disabled" class
    And navigation between project sections should work properly
    And the currentSection should be tracked correctly

  # Error Scenarios - Documenting Known Bugs

  Scenario: Handle multiple timeout delays during project creation
    Given I am creating a new project
    When the new project workflow starts
    Then multiple timeout operations should be scheduled
    And a 100ms timeout should be set for phase reset
    And a 600ms timeout should be set for version creation
    And the timeouts could potentially overlap causing timing issues
    And this represents a potential race condition in project initialization

  Scenario: Auto-save disabled but dirty state still triggers updates
    Given auto-save functionality is disabled
    And I am viewing the phases section
    When the project is marked as dirty
    Then the phase manager should still receive update notifications
    And development phase calculations should still be triggered
    And this occurs despite auto-save being disabled
    And dirty state notifications should respect auto-save settings

  Scenario: VSCode sidebar navigation conflicts with project state
    Given I am in the middle of project operations
    When I rapidly switch between VSCode sidebar panels
    Then project state should remain consistent
    But rapid panel switching might interfere with ongoing operations
    And timing conflicts could occur between navigation and project updates
    And the system should handle concurrent navigation and project operations