Feature: Calculation Engine
  As a project manager
  I want accurate cost calculations
  So that estimates are reliable

  Background:
    Given a project is loaded from fixture "full-project"
    And the configuration is loaded

  Scenario: Feature-Based calculator is selected for standard project
    When I create a calculator factory
    Then the calculation mode should be "feature-based"

  Scenario: Working Package calculator is selected when enabled
    Given working package mode is enabled
    When I create a calculator factory
    Then the calculation mode should be "working-package"

  Scenario: Calculator factory reset works
    When I create a calculator factory
    And I reset the calculator factory
    Then creating a factory without dependencies should throw

  Scenario: Feature-Based calculator produces a result
    When I create a calculator and run calculation
    Then the calculation result should have vendor costs
    And the calculation result should have KPI data
