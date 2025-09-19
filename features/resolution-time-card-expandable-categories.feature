Feature: Resolution time card expandable categories
  As a user, I want to resolution time card expandable categories

  Background:
    Given the application is loaded
    And I have a project open

  Scenario: Successfully use resolution time card expandable categories
    When I navigate to the resolution time card expandable categories section
    Then I should see the resolution time card expandable categories interface
    And all resolution time card expandable categories controls should be functional

  Scenario: Resolution time card expandable categories with valid data
    Given I am on the resolution time card expandable categories page
    When I enter valid resolution time card expandable categories data
    And I save the changes
    Then the resolution time card expandable categories should be saved successfully
    And I should see a success notification

  Scenario: Resolution time card expandable categories validation
    Given I am on the resolution time card expandable categories page
    When I enter invalid data
    And I try to save
    Then I should see validation errors
    And the save should be prevented
