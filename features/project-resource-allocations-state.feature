Feature: Project resource allocations state
  As a user, I want to project resource allocations state

  Background:
    Given the application is loaded
    And I have a project open

  Scenario: Successfully use project resource allocations state
    When I navigate to the project resource allocations state section
    Then I should see the project resource allocations state interface
    And all project resource allocations state controls should be functional

  Scenario: Project resource allocations state with valid data
    Given I am on the project resource allocations state page
    When I enter valid project resource allocations state data
    And I save the changes
    Then the project resource allocations state should be saved successfully
    And I should see a success notification

  Scenario: Project resource allocations state validation
    Given I am on the project resource allocations state page
    When I enter invalid data
    And I try to save
    Then I should see validation errors
    And the save should be prevented
