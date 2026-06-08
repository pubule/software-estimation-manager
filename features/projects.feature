Feature: Project Management
  As a project manager
  I want to create and manage projects
  So that I can organize estimations

  Scenario: Load base project from fixture
    Given a project is loaded from fixture "base-project"
    Then the current project name should be "Test Project"
    And the current project code should be "TP-001"
    And the project should not be marked as dirty

  Scenario: Load full project preserves all data
    Given a project is loaded from fixture "full-project"
    Then the current project name should be "Full Test Project"
    And features count should be 3
    And assumptions count should be 2

  Scenario: Set project marks store correctly
    Given a project is loaded from fixture "base-project"
    Then the store should have a current project

  Scenario: Clear project sets null
    Given a project is loaded from fixture "base-project"
    When the project is cleared
    Then the store should not have a current project

  Scenario: Approval status defaults to Pending
    Given a project is loaded from fixture "base-project"
    Then the approval status should be "Pending Approval"

  Scenario: Change approval status
    Given a project is loaded from fixture "base-project"
    When I set approval status to "Approved"
    Then the approval status should be "Approved"
    And the project should be marked as dirty

  Scenario: Dirty flag resets on project load
    Given a project is loaded from fixture "base-project"
    When I add a feature with name "Test" and manDays 5
    Then the project should be marked as dirty
    When a project is loaded from fixture "full-project"
    Then the project should not be marked as dirty
