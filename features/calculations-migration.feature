Feature: Calculations Page in React
  Calculations page migrated to React with full functionality

  Background:
    Given the application is loaded
    And I have a project with phases and features loaded

  Scenario: Display calculations dashboard - empty state
    When I navigate to the calculations section
    Then I should see the calculations dashboard
    And I should see the empty calculations state
    And I should see the vendor and role filter dropdowns

  Scenario: Display calculations dashboard with KPIs
    Given I have a project with valid supplier configuration
    When I navigate to the calculations section
    Then I should see the calculations dashboard
    And I should see KPI cards for GTO, GDS and Total Project
    And I should see the vendor costs table

  Scenario: Edit Final MDs values
    Given I am on the calculations page
    And the calculations table is displayed
    When I change a Final MDs value for a vendor role
    And the value is updated
    Then the total cost should be recalculated
    And the KPIs should update accordingly

  Scenario: Filter calculations by vendor
    Given I am on the calculations page 
    And the calculations table shows multiple vendors
    When I select a specific vendor from the vendor filter
    Then the table should show only costs for that vendor
    And the totals should reflect the filtered data

  Scenario: Filter calculations by role
    Given I am on the calculations page
    And the calculations table shows multiple roles
    When I select a specific role from the role filter
    Then the table should show only costs for that role
    And the totals should be recalculated for the filtered data

  Scenario: Reset all Final MDs
    Given I am on the calculations page
    And I have modified some Final MDs values
    When I click the Reset button
    Then all Final MDs should revert to estimated values
    And the total costs should be recalculated
