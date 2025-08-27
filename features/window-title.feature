Feature: Window title management
  As a user, I want to see the project code and name in the window title
  So that I can easily identify which project I'm working on

  Background:
    Given the application is loaded
    And I am on the projects page

  Scenario: Window title shows project code and name when project is created
    Given I create a new project with code "PJ-07" and name "Progetto A"
    When the project is loaded
    Then the window title should show "PJ-07 - Progetto A"

  Scenario: Window title shows project code and name when project is loaded
    Given I have a saved project with code "PJ-08" and name "Test Project"
    When I load the saved project
    Then the window title should show "PJ-08 - Test Project"

  Scenario: Window title resets when project is closed
    Given I have a project open with code "PJ-09" and name "Active Project"
    And the window title shows "PJ-09 - Active Project"
    When I close the current project
    Then the window title should show "Software Estimation Manager"

  Scenario: Window title fallback when project code is missing
    Given I create a new project with name "Project Without Code" but no code
    When the project is loaded
    Then the window title should show "Project Without Code"

  Scenario: Window title fallback when project name is missing
    Given I create a new project with code "PJ-10" but no name
    When the project is loaded
    Then the window title should show "Untitled Project"
