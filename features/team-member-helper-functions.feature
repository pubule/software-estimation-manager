Feature: Team member helper functions
  As a user, I want to team member helper functions

  Background:
    Given the application is loaded
    And I have a project open

  Scenario: Successfully use team member helper functions
    When I navigate to the team member helper functions section
    Then I should see the team member helper functions interface
    And all team member helper functions controls should be functional

  Scenario: Team member helper functions with valid data
    Given I am on the team member helper functions page
    When I enter valid team member helper functions data
    And I save the changes
    Then the team member helper functions should be saved successfully
    And I should see a success notification

  Scenario: Team member helper functions validation
    Given I am on the team member helper functions page
    When I enter invalid data
    And I try to save
    Then I should see validation errors
    And the save should be prevented
