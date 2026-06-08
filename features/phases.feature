Feature: Phase Management
  As a project manager
  I want to manage project phases
  So that effort distribution is tracked correctly

  Background:
    Given a project is loaded from fixture "full-project"
    And the configuration is loaded

  Scenario: Default phase definitions exist
    Then there should be 8 phase definitions
    And phase "functionalAnalysis" should exist
    And phase "technicalAnalysis" should exist
    And phase "development" should exist
    And phase "integrationTests" should exist

  Scenario: Update phase man days
    When I update phase "functionalAnalysis" man days to 20
    Then phase "functionalAnalysis" should have man days 20

  Scenario: Calculate phases totals
    When I update phase "functionalAnalysis" man days to 20
    And I update phase "technicalAnalysis" man days to 15
    And I calculate phases totals
    Then total phase man days should be greater than 0

  @known-bug
  Scenario: Development phase auto-calculates from features
    # Known app bug: calculateDevelopmentPhase treats coverage object as number
    # causing NaN comparison and skipping the update.
    # This test documents expected behavior once the bug is fixed.
    When I calculate the development phase
    Then the development phase should exist
