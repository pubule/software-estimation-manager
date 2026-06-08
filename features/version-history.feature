Feature: Version History
  As a project manager
  I want to track project versions
  So that I can compare and restore previous states

  Background:
    Given a project is loaded from fixture "full-project"
    And the configuration is loaded

  Scenario: Project starts with no versions
    Then versions count should be 0

  Scenario: Create a version snapshot
    When I create a version with reason "Initial baseline"
    Then versions count should be 1
    And the latest version reason should be "Initial baseline"

  Scenario: Create multiple versions
    When I create a version with reason "v1"
    And I add a feature with name "New Feature" and manDays 10
    And I create a version with reason "v2"
    Then versions count should be 2

  Scenario: Version captures feature state
    When I create a version with reason "snapshot"
    Then the latest version should have 3 features
