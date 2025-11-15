Feature: Excel Export Report - IT Support Team Performance Dashboard

  As an IT Support Team Lead
  I want to export my team's performance metrics to Excel
  So that I can share them with executives and track performance trends over time

  Background:
    Given the application is loaded
    And the Ticket Dashboard is initialized with sample data

  Scenario: XLSX library integration is available
    When I attempt to use the xlsx library
    Then the xlsx library should be available and functional
    And the library should have core methods: book_new, book_append_sheet, writeFile

  Scenario: Filename generation respects all time periods
    When I request filename generation for "Last 7 Days" time period
    Then the filename should include the period label
    And the filename should follow the format "IT_Support_Performance_[PERIOD]_[DATE].xlsx"
    And the filename should include the export date in YYYY-MM-DD format

  Scenario: Store access pattern works for Excel export data
    Given ticket data is loaded in the store
    When I access the store data for export
    Then I should be able to read ticketData array
    And I should be able to read dashboardMetrics object
    And I should be able to read timeFilter information
    And the store data should be complete and valid for export

  # Task Group 2: Main Export Method and Workbook Creation Tests

  Scenario: exportReportToExcel method calls all 8 sheet creators
    Given ticket data is loaded in the store
    When I invoke the exportReportToExcel method
    Then all 8 sheet creator methods should be called
    And the export should complete without errors

  Scenario: Workbook creation generates correct sheet count and names
    Given ticket data is loaded in the store
    When I invoke the exportReportToExcel method
    Then the workbook should contain exactly 13 sheets
    And the workbook should have all required sheet names

  Scenario: Filename generation works for all 7 time period types
    Given ticket data is loaded in the store
    When I generate filename for "All Time" time period
    Then the filename should be "IT_Support_Performance_All Time_<YYYY-MM-DD>.xlsx"
    When I generate filename for "Last 7 Days" time period
    Then the filename should contain "Last 7 Days"
    When I generate filename for "Last Month" time period
    Then the filename should contain "Last Month"
    When I generate filename for "Last 3 Months" time period
    Then the filename should contain "Last 3 Months"
    When I generate filename for "Last 6 Months" time period
    Then the filename should contain "Last 6 Months"
    When I generate filename for "Current Year" time period
    Then the filename should contain "Current Year"
    When I generate filename for "Custom Range" time period
    Then the filename should contain "Custom"

  # Task Group 3: Summary Sheet with 14 KPIs Tests

  Scenario: Summary sheet contains all 14 KPI metrics
    Given ticket data is loaded in the store
    When I create the summary sheet for Excel export
    Then the summary sheet should contain 14 KPI rows
    And the summary sheet should include "Total Tickets" metric
    And the summary sheet should include "Open Tickets" metric
    And the summary sheet should include "Closed Tickets" metric
    And the summary sheet should include "Resolution Rate (%)" metric
    And the summary sheet should include "Average Resolution Time (hours)" metric
    And the summary sheet should include "Current Backlog Count" metric
    And the summary sheet should include "Orphaned Tickets (critical)" metric
    And the summary sheet should include "Stagnant Tickets (critical)" metric
    And the summary sheet should include "Expired High Priority (critical)" metric
    And the summary sheet should include "Suspicious Closures (warning)" metric
    And the summary sheet should include "Unworked Tickets (warning)" metric
    And the summary sheet should include "Top Team Member" metric
    And the summary sheet should include "Slowest Resolution Time (hours)" metric
    And the summary sheet should include "Fastest Resolution Time (hours)" metric

  Scenario: Summary sheet formatting includes headers and color coding
    Given ticket data is loaded in the store
    When I create the summary sheet for Excel export
    Then the summary sheet should have a header row with dark background
    And the summary sheet should have white text in headers
    And the summary sheet should have bold header text
    And the summary sheet should have 14pt font size for headers
    And the summary sheet should have status color column
    And the summary sheet status column should have green color for normal status

  # Task Group 12: Unit Tests for Export Methods

  Scenario: Export with large dataset completes successfully
    Given ticket data is loaded in the store with 500 test tickets
    When I invoke the exportReportToExcel method
    Then the export should complete without errors
    And the workbook should contain exactly 13 sheets

  Scenario: Export with empty data shows error message
    Given the store has no ticket data
    When I attempt to export with empty data
    Then an error message should be displayed indicating no tickets available

  Scenario: All sheet creator methods generate valid sheets
    Given ticket data is loaded in the store
    When I invoke the exportReportToExcel method
    Then the Summary sheet should contain 14 KPI metrics
    And the Unified Tickets sheet should contain status breakdown
    And the Resolution Metrics sheet should contain all 4 parts
    And the Backlog sheet should contain top 10 oldest tickets
    And the Team Analysis sheet should contain operator metrics
    And the Full Backlog sheet should contain all unresolved tickets
    And the Metadata sheet should contain export parameters

  Scenario: Formatting utility methods apply correctly
    Given ticket data is loaded in the store
    When formatting utilities are applied to sheets
    Then header backgrounds should be dark (RGB 51,51,51)
    And header text should be white
    And header text should be bold
    And conditional colors should be applied to data rows

  # Task Group 13: Integration Tests with Store Data

  Scenario: Export respects All Time filter
    Given ticket data is loaded in the store for multiple dates
    When I set time filter to "All Time"
    And I invoke the exportReportToExcel method
    Then all tickets from all dates should be included in export

  Scenario: Export respects Last 7 Days filter
    Given ticket data is loaded in the store with tickets from past 30 days
    When I set time filter to "Last 7 Days"
    And I invoke the exportReportToExcel method
    Then only tickets from last 7 days should be included in metrics

  Scenario: Export respects Custom Range filter
    Given ticket data is loaded in the store with tickets from past year
    When I set custom time filter from "2024-10-01" to "2024-11-14"
    And I invoke the exportReportToExcel method
    Then only tickets in custom date range should be included

  Scenario: Alert data in export matches dashboard alerts
    Given ticket data is loaded in the store with alert-triggering tickets
    When I get dashboard alert counts
    And I export the report
    Then alert sheet counts should match dashboard alert counts

  Scenario: Team Analysis metrics match dashboard operator table
    Given ticket data is loaded in the store with multiple operators
    When I note operator metrics from dashboard
    And I export the report
    Then Team Analysis sheet metrics should match dashboard metrics
    And Assigned Count should match dashboard
    And Resolved Count should match dashboard
    And Delay percentage should match dashboard
    And Utilization percentage should match dashboard

  # Task Group 14: End-to-End Acceptance Tests

  Scenario: Export with 50+ tickets creates file successfully
    Given ticket data is loaded in the store with 50 test tickets
    When I click Export Report button
    And I select "All Time" filter
    Then the file should be created in Downloads folder
    And the file should have a valid Excel format
    And all 13 sheets should be present in the file

  Scenario: Custom range export includes dates in filename
    Given ticket data is loaded in the store
    When I set custom time filter from "2024-10-01" to "2024-11-14"
    And I click Export Report button
    Then the filename should include "Custom_2024-10-01_to_2024-11-14"

  Scenario: Export completes within performance target
    Given ticket data is loaded in the store with 500 test tickets
    When I start export timer
    And I click Export Report button
    And I stop export timer when complete
    Then export duration should be less than 5 seconds
    And all 13 sheets should be created

  Scenario: Number formatting is correct in export
    Given ticket data is loaded in the store
    When I export the report
    Then integers should have thousands separators
    And percentages should display with % symbol
    And hours should display with "hours" suffix
    And dates should be in YYYY-MM-DD format

  # Task Group 15: Performance and Edge Case Testing

  Scenario: Export handles empty alert sheets gracefully
    Given ticket data is loaded in the store with no alert triggers
    When I export the report
    Then alert sheets should be created with empty data
    And no errors should occur

  Scenario: Export handles missing optional fields
    Given ticket data is loaded with some missing assigned_to and resolved_at fields
    When I invoke the exportReportToExcel method
    Then the export should complete without errors
    And sheets should handle missing data gracefully

  Scenario: Concurrent exports do not interfere
    Given ticket data is loaded in the store
    When I start first export
    And immediately start second export
    Then first export should complete successfully
    And second export should complete with unique filename
    And both files should be valid Excel files

  Scenario: Very old tickets are handled correctly
    Given ticket data is loaded with tickets older than 1 year
    When I export the report
    Then days open calculations should be correct
    And old tickets should appear in backlog sheets
    And no calculation errors should occur

  Scenario: Tickets with future dates are handled gracefully
    Given ticket data is loaded with some tickets having future dates
    When I export the report
    Then the export should complete without errors
    And future-dated tickets should be handled as edge cases

