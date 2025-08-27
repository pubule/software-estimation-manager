Feature: Projects Management
  As a user, I want to manage my projects effectively
  So that I can load, save, and organize my project files

  Background:
    Given the application is loaded
    And I am on the projects page

  Scenario: View recent projects list
    Given I have some recent projects
    When I navigate to the projects section
    Then I should see the recent projects list
    And the list should show maximum 2 recent projects
    And each project should display name, version, and last opened date

  Scenario: Load a recent project
    Given I have a recent project "Test Project v1.0"
    When I click on the recent project "Test Project v1.0"
    Then the project should be loaded successfully
    And I should be redirected to the features page
    And the project should appear in the current project display

  Scenario: Remove a project from recent list
    Given I have a recent project "Old Project v1.0"
    When I click the remove button for recent project "Old Project v1.0"
    Then the project should be removed from recent projects list
    And the recent projects list should be updated
    And I should see a success notification

  Scenario: Clear all recent projects
    Given I have multiple recent projects
    When I click the "Clear Recent" button
    Then all recent projects should be removed
    And the recent projects list should show "No recent projects"
    And I should see a confirmation message

  Scenario: View saved projects list
    Given I have some saved projects in the file system
    When I navigate to the projects section
    Then I should see the saved projects list
    And each project should display file name, size, and last modified date
    And projects should be sorted by last modified date

  Scenario: Load a saved project
    Given I have a saved project file "MyProject.json"
    When I click on the saved project "MyProject.json"
    Then the project should be loaded from file successfully
    And I should be redirected to the features page
    And the project should appear in recent projects list

  Scenario: Export a project
    Given I have a saved project file "ExportTest.json"
    When I click the export button for project "ExportTest.json"
    Then the export dialog should open
    And I should be able to choose export format
    And the project should be exported successfully

  Scenario: Delete a saved project
    Given I have a saved project file "DeleteMe.json"
    When I click the delete button for project "DeleteMe.json"
    And I confirm the deletion in the dialog
    Then the project file should be deleted
    And the project should be removed from saved projects list
    And I should see a success notification

  Scenario: Refresh saved projects list
    Given I am viewing the saved projects list
    When I click the "Refresh" button
    Then the saved projects list should be updated
    And I should see a loading indicator during refresh
    And the list should reflect current file system state

  Scenario: Handle empty recent projects
    Given I have no recent projects
    When I navigate to the projects section
    Then I should see "No recent projects" message
    And the clear recent button should be disabled
    And the recent projects section should show empty state icon

  Scenario: Handle empty saved projects
    Given I have no saved projects in the file system
    When I navigate to the projects section
    Then I should see "No saved projects found" message
    And I should see helpful text about saving projects first
    And the saved projects section should show empty state icon

  Scenario: Handle loading errors for saved projects
    Given there is an error accessing the file system
    When I navigate to the projects section
    Then I should see an error message in saved projects section
    And I should see a "Retry" button
    And the error should be logged appropriately

  Scenario: Projects list stays synchronized across tabs
    Given I have the application open in multiple tabs
    When I load a project in one tab
    Then the recent projects list should update in all tabs
    And the synchronization should happen automatically
    And no manual refresh should be required

  Scenario: Projects page loads correctly on application start
    Given the application is starting up
    When the projects page loads
    Then both recent and saved projects should load automatically
    And I should see loading indicators during data fetch
    And any errors should be handled gracefully

  Scenario: React components load successfully without errors
    Given the application is loaded
    And React libraries are available globally
    When I navigate to the projects page
    Then React components should load without timeout errors
    And I should see "✅ React components loaded successfully" in the console
    And window.ReactComponents should be available
    And the ProjectManager component should render correctly
    And I should not see "ERR_FILE_NOT_FOUND" errors for main.js