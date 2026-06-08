Feature: Assumptions Management
  As a project manager
  I want to manage project assumptions
  So that estimation constraints are documented

  Background:
    Given a project is loaded from fixture "base-project"
    And the configuration is loaded

  Scenario: Add an assumption
    When I add an assumption with description "Client provides API docs" and type "Business" and impact "High"
    Then assumptions count should be 1
    And the project should be marked as dirty

  Scenario: Edit an assumption
    When I add an assumption with description "Original" and type "Technical" and impact "Low"
    And I edit assumption "ASS-001" with description "Updated" and impact "High"
    Then assumption "ASS-001" should have description "Updated"
    And assumption "ASS-001" should have impact "High"

  Scenario: Delete an assumption
    When I add an assumption with description "To delete" and type "Technical" and impact "Low"
    And I delete assumption "ASS-001"
    Then assumptions count should be 0

  Scenario: Load project with assumptions
    Given a project is loaded from fixture "full-project"
    Then assumptions count should be 2
    And assumption at index 0 should have type "Dependency"

  Scenario: Validate assumption requires description
    Then adding assumption without description should fail validation
