Feature: Window title updates correctly
  As a user, I expect the window title to update when I load, save, or create projects
  So that I can always see which project I'm working on

  Background:
    Given the application is loaded

  Scenario: Window title updates when loading a saved project
    Given I have a saved project with code "TEST-01" and name "Test Project"
    When I load the saved project
    Then the window title should show "TEST-01 - Test Project"

  Scenario: Window title updates when saving a project with a new name
    Given I have a project open with code "PROJ-02" and name "Old Name"
    When I change the project name to "New Project Name"
    And I save the project
    Then the window title should show "PROJ-02 - New Project Name"

  Scenario: Window title shows New Project when creating a new project
    When I create a new project
    Then the window title should contain "New Project"

  Scenario: Window title updates when closing a project
    Given I have a project open with code "PROJ-03" and name "Active Project"
    When I close the current project
    Then the window title should contain "New Project"

  Scenario: Window title updates when loading last project on startup
    Given I have a previously saved project with code "LAST-01" and name "Last Project"
    When the application loads the last project
    Then the window title should show "LAST-01 - Last Project"