Feature: Capacity Planning
  As a resource manager
  I want to calculate team capacity
  So that I can plan allocations accurately

  Background:
    Given a project is loaded from fixture "full-project"
    And the configuration is loaded

  Scenario: Working days calculator is available
    Then the working days calculator should be loadable

  Scenario: January 2026 has correct working days for Italy
    When I calculate working days for January 2026 in Italy
    Then working days should be between 20 and 23
