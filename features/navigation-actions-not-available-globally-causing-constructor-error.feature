Feature: Bug Fix - Navigation Actions not available globally causing constructor error
  Fix issue with navigation actions not available globally causing constructor error
  
  As a user, I expect the application to work correctly
  So that I can use navigation actions not available globally causing constructor error without issues

  Background:
    Given the application is loaded
    And I have NavigationActions available globally

  Scenario: Navigation Actions not available globally causing constructor error works correctly (expected behavior)
    When I perform the standard navigation actions not available globally causing constructor error actions
    Then the system should respond correctly
    And no errors should occur
    And the expected result should be displayed

  Scenario: Navigation Actions not available globally causing constructor error handles edge cases properly
    Given I am in a edge case scenario for navigation actions not available globally causing constructor error
    When I perform the navigation actions not available globally causing constructor error actions
    Then the system should handle it gracefully
    And provide appropriate feedback
    And maintain system stability

  Scenario: Navigation Actions not available globally causing constructor error validates inputs correctly
    When I provide various inputs for navigation actions not available globally causing constructor error
    Then the system should validate them properly
    And accept valid inputs
    And reject invalid inputs with clear messages
