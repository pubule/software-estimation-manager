Feature: Ticket Dashboard Analytics
  As a support team manager, I want to analyze team performance through CSV ticket data
  to identify inefficiencies and monitor support quality

  Background:
    Given the application is loaded
    And I navigate to the ticket dashboard section

  Scenario: Import CSV ticket data successfully
    Given I am on the ticket dashboard page
    When I upload a valid CSV file with ticket data
    Then the CSV should be processed successfully
    And I should see the KPI cards populated with metrics
    And I should see "Total Tickets", "Average Resolution Time", "Open Tickets", and "Resolution Rate"

  Scenario: Display performance metrics and alerts
    Given I have uploaded ticket data
    When the dashboard analyzes the data
    Then I should see critical alerts for orphaned tickets older than 24 hours
    And I should see warnings for tickets without updates for 3+ days
    And I should see alerts for P1/P2 tickets open longer than 2 days

  Scenario: Filter data by time period
    Given I have uploaded ticket data
    When I select "Last Month" from the period filter
    Then the dashboard should refresh with filtered data
    And all metrics should reflect only the selected time period

  Scenario: View operator performance ranking
    Given I have uploaded ticket data with multiple operators
    When I view the team analysis section
    Then I should see a performance table with operators ranked by metrics
    And each operator should show assigned tickets, resolved tickets, and average resolution time
    And I should see workload distribution charts

  Scenario: Drill down into operator details
    Given I am viewing the operator performance table
    When I click on an operator's name
    Then I should see detailed operator statistics
    And I should see a timeline of their ticket activity
    And I should see their personal performance metrics

  Scenario: Export filtered results
    Given I have applied filters to the ticket data
    When I click the export button
    Then a CSV file should be downloaded with the filtered results
