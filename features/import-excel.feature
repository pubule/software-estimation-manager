Feature: Import Project from Excel
  As a project manager
  I want to import projects from Excel estimation workbooks
  So that I can quickly create projects without manual data entry

  Background:
    Given a project is loaded from fixture "base-project"
    And the configuration is loaded
    And the import configuration has categories

  Scenario: Extract project code from filename
    Then extracting code from "CREDORIG-3331 v2.xlsx" should return "CREDORIG-3331"
    And extracting code from "simple.xlsx" should return "SIMPLE"
    And extracting code from ".xlsx" should return "IMPORTED"

  Scenario: Map Excel phase names to tool phase IDs
    Then phase "AF" should map to "functionalAnalysis"
    And phase "AT" should map to "technicalAnalysis"
    And phase "DEV" should map to null
    And phase "SIT" should map to "integrationTests"
    And phase "UAT" should map to "uatTests"
    And phase "CONSOLIDAMENTO" should map to "consolidation"
    And phase "VA/PT" should map to "vapt"
    And phase "Supporto post go-live" should map to "postGoLive"

  Scenario: Build vendor mappings with fuzzy matching
    When I build vendor mappings for vendors "Internal Team,External Partner"
    Then vendor "Internal Team" should be mapped to "vendor-internal"
    And vendor "External Partner" should be mapped to "vendor-external"

  Scenario: Build vendor mappings for unknown vendors
    When I build vendor mappings for vendors "Unknown Corp"
    Then vendor "Unknown Corp" should be mapped to ""

  Scenario: Build feature configs from parsed data
    Given import data is loaded from fixture "import-excel-data"
    When I build feature configs
    Then there should be 3 feature configs
    And all feature configs should have include true
    And all feature configs should have empty category

  Scenario: Build Working Package config splits primary and secondary
    Given import data is loaded from fixture "import-excel-data"
    When I build vendor mappings for vendors "EY,TA IT,TA RO"
    And I build working package config
    Then the working package GTO total should be 23000
    And the working package secondary percentage should be 35

  Scenario: Build project data with Feature-Based mode
    Given import data is loaded from fixture "import-excel-data"
    And a project manager mock is configured
    When I build project data with code "TEST-001" name "Test Import" and mode "feature-based"
    Then the built project should have code "TEST-001"
    And the built project should have 3 features
    And the built project phase "functionalAnalysis" should have manDays 10
    And the built project phase "development" should have manDays 0

  Scenario: Build project data excludes unchecked features
    Given import data is loaded from fixture "import-excel-data"
    And a project manager mock is configured
    When I exclude feature "2" from import
    And I build project data with code "TEST-002" name "Partial Import" and mode "feature-based"
    Then the built project should have 2 features

  Scenario: Execute import restores state on failure
    Given import data is loaded from fixture "import-excel-data"
    And a project manager mock is configured to fail
    When I attempt to execute import with code "FAIL-001"
    Then the import should fail
    And the store should contain the original project

  Scenario: Check existing project returns false for unknown code
    When I check for existing project with code "UNKNOWN-999"
    Then the existing project check should return exists false

  Scenario: Check existing project detects loaded project
    When I check for existing project with code "test-project-001"
    Then the existing project check should return exists true
    And the existing project check source should be "loaded"

  Scenario: Build project data preserves created date for existing project
    Given import data is loaded from fixture "import-excel-data"
    And a project manager mock is configured
    When I build project data with code "TEST-UPD" name "Update Test" and mode "feature-based" with existing created "2025-01-15T10:00:00.000Z"
    Then the built project should have created "2025-01-15T10:00:00.000Z"
    And the built project should have code "TEST-UPD"
