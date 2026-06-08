Feature: Resource Allocations
  As a resource manager
  I want to allocate team members to projects
  So that capacity is tracked

  Background:
    Given a project is loaded from fixture "full-project"
    And the configuration is loaded

  Scenario: Store tracks resource allocations
    When I add a resource allocation for member "member-1" on project "test-project-full"
    Then resource allocations should contain 1 entries

  Scenario: Delete a resource allocation
    When I add a resource allocation for member "member-1" on project "test-project-full"
    And I delete the resource allocation at index 0
    Then resource allocations should contain 0 entries
