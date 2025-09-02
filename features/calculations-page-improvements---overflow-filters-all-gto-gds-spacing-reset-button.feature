Feature: Calculations page improvements with overflow, filters and reset buttons
  As a project manager
  I want improved Calculations page with better filtering and reset capabilities
  So that I can better manage vendor costs and estimates

  Background:
    Given the application is loaded
    And I have a project with multiple vendors and features

  Scenario: Main container has scrollable overflow
    When I navigate to the Calculations page
    Then the main container should have scrollable overflow
    And the max-height should be set to allow vertical scrolling

  Scenario: Filter buttons ALL/GTO/GDS are displayed with counters
    When I navigate to the Calculations page
    Then I should see filter buttons "ALL", "GTO", and "GDS"
    And the "ALL" button should show the total count of all vendors
    And the "GTO" button should show count for G2 and TA roles
    And the "GDS" button should show count for G1 and PM roles

  Scenario: Filtering by GTO shows only G2 and TA roles
    Given I am on the Calculations page
    When I click the "GTO" filter button
    Then only vendors with roles "G2" or "TA" should be visible
    And the filter button should be highlighted as active

  Scenario: Filtering by GDS shows only G1 and PM roles
    Given I am on the Calculations page
    When I click the "GDS" filter button
    Then only vendors with roles "G1" or "PM" should be visible
    And the filter button should be highlighted as active

  Scenario: Reset button for individual Final MDs rows
    Given I am on the Calculations page
    And I have modified a Final MDs value for a vendor
    When I click the reset button for that specific row
    Then the Final MDs value should reset to the Official Tot MDs value
    And the Final Tot Cost should be recalculated

  Scenario: Reset all Final MDs to official values
    Given I am on the Calculations page
    And I have modified multiple Final MDs values
    When I click the main "Reset" button
    Then all Final MDs values should reset to their Official Tot MDs values
    And all Final Tot Costs should be recalculated

  Scenario: KPI cards display with improved spacing
    When I navigate to the Calculations page
    Then the KPI cards should display percentages with proper spacing from amounts
    And the cards should have colored borders (blue for GTO, orange for GDS, green for Total)

  Scenario: Share button positioned correctly
    When I navigate to the Calculations page
    Then the Share button should be positioned in the vendor cost summary section
    And not in the individual KPI cards