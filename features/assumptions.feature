Feature: Assumptions
  Migrate assumptions from vanilla JS to React following State/Actions/Dispatcher pattern

  Background:
    Given the application is loaded
    And I have a project open

  Scenario: Successfully use assumptions
    When I navigate to the assumptions section
    Then I should see the assumptions interface
    And all assumptions controls should be functional

  Scenario: Assumptions with valid data
    Given I am on the assumptions page
    When I enter valid assumptions data
    And I save the changes
    Then the assumptions should be saved successfully
    And I should see a success notification

  Scenario: Assumptions validation
    Given I am on the assumptions page
    When I enter invalid data
    And I try to save
    Then I should see validation errors
    And the save should be prevented
