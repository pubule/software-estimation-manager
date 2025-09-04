Feature: Bug Fix - Coverage initialization for new projects
  Coverage should start at 0% for new projects without features, not 110%
  
  As a project manager
  I want new projects to show 0% coverage initially
  So that the coverage accurately reflects the current project state

  Background:
    Given the application is loaded
    And I am on the project management page

  Scenario: New project should start with 0% coverage
    When I create a new project without any features
    Then the project coverage should be 0%
    And the coverage should be automatically calculated
    And no hardcoded 110% value should appear

  Scenario: Coverage should update when features are added
    Given I have created a new project with 0% coverage
    When I add features to the project
    Then the coverage should be recalculated based on actual features
    And the coverage should remain realistic and not hardcoded

  Scenario: Coverage field behavior on project creation
    When I create a new project
    Then the coverage input field should show 0
    And the coverage should be marked as automatically calculated
    And the reset button should be hidden initially
