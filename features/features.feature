Feature: Feature Management
  As a project manager
  I want to manage project features
  So that I can track estimation effort

  Background:
    Given a project is loaded from fixture "base-project"
    And the configuration is loaded

  Scenario: Add a feature to empty project
    When I add a feature with name "Login" and manDays 10
    Then features count should be 1
    And the project should be marked as dirty

  Scenario: Add multiple features
    When I add a feature with name "Login" and manDays 10
    And I add a feature with name "Dashboard" and manDays 20
    Then features count should be 2

  Scenario: Delete a feature
    When I add a feature with name "Login" and manDays 10
    And I add a feature with name "Dashboard" and manDays 20
    And I delete feature at index 0
    Then features count should be 1

  Scenario: Update a feature
    When I add a feature with name "Login" and manDays 10
    And I update feature at index 0 with name "Login v2" and manDays 15
    Then features count should be 1
    And feature at index 0 should have name "Login v2"
    And feature at index 0 should have manDays 15

  Scenario: Duplicate a feature
    Given a project is loaded from fixture "full-project"
    When I duplicate feature at index 0
    Then features count should be 4
    And the last feature name should contain "Copy"

  Scenario: Add feature without project loaded fails
    Given no project is loaded
    Then adding a feature should throw an error

  Scenario: Features from fixture load correctly
    Given a project is loaded from fixture "full-project"
    Then features count should be 3
    And feature at index 0 should have name "User Login"
    And feature at index 1 should have name "Dashboard"
    And feature at index 2 should have name "API Integration"

  Scenario: Feature gets vendor role assigned
    Given a project is loaded from fixture "full-project"
    Then feature at index 0 should have role "G2"
    And feature at index 1 should have role "G1"
