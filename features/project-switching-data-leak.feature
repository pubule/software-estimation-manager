Feature: Project Switching - Clean State on Project Load
  As a user
  When I switch between projects
  I expect all UI states, filters, and cached data to be reset
  So that the new project starts with a clean state without contamination from the previous project

  Background:
    Given the application is loaded
    And the store is initialized

  Scenario: Switching projects resets all phases data
    Given I load "Project A" with phases data:
      | phase              | manDays |
      | functionalAnalysis | 10      |
      | development        | 50      |
    And phases totals show "60" total man days
    When I load "Project B" with phases data:
      | phase              | manDays |
      | functionalAnalysis | 20      |
      | development        | 100     |
    Then currentPhases should show "20" man days for "functionalAnalysis"
    And currentPhases should show "100" man days for "development"
    And phases totals should show "120" total man days
    And phases data from "Project A" should not be present

  Scenario: Switching projects resets calculations cache
    Given I load "Project A"
    And calculations show vendor costs for "VendorA" with total "5000"
    And I set manual override "VendorA-G2-GTO" to "150" man days
    When I load "Project B"
    Then calculationsData.vendorCosts should be empty
    And calculationsData.finalMDsOverrides should be empty
    And calculationsData.kpiData should be null
    And calculations filters should be reset to defaults:
      | filter   | value |
      | vendor   | all   |
      | role     | all   |
      | category | all   |

  Scenario: Switching projects resets assumptions UI state
    Given I load "Project A"
    And I set assumptions search filter to "api"
    And I set assumptions type filter to "technical"
    And I open assumptions modal in "edit" mode
    When I load "Project B"
    Then assumptions search filter should be empty
    And assumptions type filter should be empty
    And assumptions impact filter should be empty
    And assumptions modal should be closed

  Scenario: Switching projects resets version history UI state
    Given I load "Project A"
    And I set version history date range filter to "2024-01"
    And I set version history reason filter to "bugfix"
    And I open "compare" modal for version history
    When I load "Project B"
    Then version history date range filter should be empty
    And version history reason filter should be empty
    And version history "compare" modal should be closed
    And version history "create" modal should be closed
    And version history "restore" modal should be closed

  Scenario: Switching projects resets feature manager UI state
    Given I load "Project A"
    And I set feature sort to "name" "desc"
    And I filter features to show "5" filtered results
    And I open feature modal for editing feature with id "feat-1"
    When I load "Project B"
    Then feature sort should be reset to "id" "asc"
    And filtered features should be empty
    And feature modal should be closed
    And editing feature should be null
    And duplicate source data should be null

  Scenario: Switching projects resets selected suppliers and resource rates
    Given I load "Project A"
    And I select supplier "Supplier-A" for resource "G2"
    And resource rate for "G2" is "450"
    When I load "Project B" with different suppliers
    Then selected supplier for "G2" should be "null"
    And resource rate for "G2" should be "380" (default)

  Scenario: Complete project switching flow - no data contamination
    Given I load "Project A" with complete data:
      | section      | data                           |
      | phases       | functionalAnalysis: 10 manDays |
      | calculations | VendorA costs: 5000            |
      | assumptions  | 3 technical assumptions        |
      | features     | 5 features sorted by priority  |
    And I interact with all sections setting filters and states
    When I load "Project B"
    Then store state should be completely clean for "Project B"
    And currentProject should reference "Project B" data
    And all derived states should be reset to defaults
    And no "Project A" data should be visible in any section
