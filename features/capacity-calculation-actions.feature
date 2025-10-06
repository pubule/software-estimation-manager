Feature: Capacity calculation actions
  As a user, I want to capacity calculation actions

  Background:
    Given the application is loaded
    And I have a project open

  Scenario: Successfully use capacity calculation actions
    When I navigate to the capacity calculation actions section
    Then I should see the capacity calculation actions interface
    And all capacity calculation actions controls should be functional

  Scenario: Capacity calculation actions with valid data
    Given I am on the capacity calculation actions page
    When I enter valid capacity calculation actions data
    And I save the changes
    Then the capacity calculation actions should be saved successfully
    And I should see a success notification

  Scenario: Capacity calculation actions validation
    Given I am on the capacity calculation actions page
    When I enter invalid data
    And I try to save
    Then I should see validation errors
    And the save should be prevented
