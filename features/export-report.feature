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
