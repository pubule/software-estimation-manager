Feature: Export Functionality
  As a project manager
  I want to export project data in multiple formats
  So that I can share project information and integrate with other tools

  Background:
    Given the Software Estimation Manager application is running
    And the VSCode-style sidebar navigation is functional
    And I have a project with features and phase data loaded
    And the export functionality is available through the Projects panel

  Scenario: Access export functionality through VSCode sidebar
    Given I have the Projects panel open in the VSCode sidebar
    When I examine the panel footer
    Then I should see Save and Export buttons
    And the Export button should have proper VSCode-style styling
    When I click the Export button
    Then a context menu should appear
    And the menu should be positioned appropriately relative to the button
    And the menu should contain options for CSV, JSON, and Excel export

  Scenario: Export menu positioning within VSCode layout
    Given the export context menu is triggered from the Projects panel
    When the export menu appears
    Then the menu positioning should work within the VSCode sidebar layout
    And the menu should not be obscured by other UI elements
    And the menu should be positioned to remain within viewport bounds
    And the menu styling should be consistent with VSCode theme

  Scenario: Export project data to JSON format
    Given I have a project with features and configuration data
    When I select JSON export from the export menu
    Then the project data should be serialized to JSON format
    And all project properties should be included (features, phases, config, metadata)
    And the JSON should be properly formatted and valid
    And a download should be initiated with filename containing project name and date

  Scenario: Export project features to CSV with proper field escaping
    Given I have project features with special characters
    And one feature has description 'Test "quoted" feature, with comma'
    And another feature has notes with line breaks "Line 1\nLine 2"
    When I export to CSV format
    Then quoted text should be properly escaped as '"Test ""quoted"" feature, with comma"'
    And line breaks should be preserved within quoted fields
    And comma-separated values should be correctly formatted
    And CSV headers should include all feature properties

  Scenario: Export project to Excel with three-sheet structure
    Given I have a project with features, phases, and calculations
    When I export to Excel format
    Then an Excel workbook should be created
    And the workbook should contain exactly three sheets
    And the first sheet should be named "Features" with features data
    And the second sheet should be named "Phases" with project phases data
    And the third sheet should be named "Calculations" with cost and effort calculations

  Scenario: Excel Features sheet contains comprehensive feature data
    Given I have features with all properties filled
    When Excel export creates the Features sheet
    Then the sheet should include columns for: ID, Description, Category, Type, Supplier
    And it should include effort columns: Real Man Days, Expertise, Risk Margin, Calculated Man Days
    And it should include cost information and notes
    And all feature data should be properly formatted in the sheet

  Scenario: Excel Phases sheet contains project phases breakdown
    Given I have configured project phases with resource assignments
    When Excel export creates the Phases sheet
    Then the sheet should include all 8 project phases
    And each phase should show: Name, Man Days, Cost, Effort Distribution
    And resource assignments should be detailed by role (G1, G2, TA, PM)
    And phase totals should be calculated and displayed

  Scenario: Excel Calculations sheet provides project financial summary
    Given I have a project with calculated costs and phases
    When Excel export creates the Calculations sheet
    Then the sheet should include total project cost breakdown
    And it should show costs by phase and by resource type
    And supplier costs and internal resource costs should be separated
    And summary totals should be provided for budget analysis

  Scenario: CSV export includes supplier and category resolution
    Given I have features assigned to suppliers and categories
    When CSV export processes the data
    Then supplier IDs should be resolved to supplier names in CSV
    And category IDs should be resolved to category names in CSV  
    And if resolution fails, the original ID should be used as fallback
    And the CSV should be readable without requiring ID-to-name mapping

  Scenario: Export file naming follows consistent pattern
    Given I am exporting a project named "My Project" with ID "proj-123"
    When any export format is generated
    Then the filename should include the project name
    And the filename should include current date/timestamp
    And special characters in project name should be sanitized for filename
    And the file extension should match the export format (.json, .csv, .xlsx)

  Scenario: Handle empty project export gracefully
    Given I have a project with no features
    When I export the project in any format
    Then the export should complete successfully
    And empty data sections should be properly represented
    And no errors should occur due to missing data
    And the exported file should still contain project metadata

  Scenario: Export respects current project state with VSCode integration
    Given I have made changes to project data
    And the changes have not been saved to file yet
    And the project status indicator shows unsaved changes (●)
    When I export the project through the Projects panel Export button
    Then the exported data should include all unsaved changes
    And the export should reflect the current state in memory
    And not just the last saved version of the project
    And the export should work regardless of the VSCode panel state

  Scenario: Large project export performance in VSCode layout
    Given I have a project with many features (100+ features)
    When I export to any format through the VSCode Projects panel
    Then the export should complete in reasonable time
    And the VSCode sidebar should remain responsive during export
    And other VSCode panels should continue to function normally
    And memory usage should not spike excessively
    And progress indication should be provided for large exports
    And the export operation should not interfere with VSCode navigation

  # Export Context Menu Behavior in VSCode Layout

  Scenario: Export menu closes when clicking outside
    Given the export context menu is open from the Projects panel
    When I click outside the menu area (including other sidebar areas)
    Then the context menu should close
    And no export operation should be initiated
    And the Projects panel should remain open and functional

  Scenario: Export menu handles keyboard navigation
    Given the export context menu is open
    When I press the Escape key
    Then the context menu should close
    When the menu is open and I use arrow keys
    Then I should be able to navigate between export options
    And keyboard navigation should work within the VSCode layout context

  Scenario: Export menu interaction with VSCode sidebar
    Given the export menu is open from the Projects panel
    When I click on other VSCode sidebar icons
    Then the export menu should close automatically
    And the sidebar panel switching should work normally
    And no export operation should be accidentally triggered

  # Error Scenarios and Edge Cases

  Scenario: Handle export when required libraries are missing
    Given the XLSX library is not loaded
    When I attempt to export to Excel format
    Then an appropriate error message should be displayed
    And the user should be informed about the missing dependency
    And other export formats should still be available

  Scenario: Export failure due to browser limitations
    Given browser restrictions prevent file downloads
    When export is attempted
    Then the system should provide alternative options
    And error messaging should guide user to resolve browser issues
    And data should not be lost due to export failure

  Scenario: CSV field escaping handles edge cases
    Given I have features with complex text containing quotes, commas, and newlines
    When CSV export processes these fields
    Then all special characters should be properly escaped
    And the resulting CSV should be parsable by standard CSV readers
    And no data should be corrupted during the escaping process

  Scenario: Excel export handles Unicode and special characters
    Given I have features with Unicode characters and symbols
    When Excel export processes the data
    Then all Unicode characters should be preserved correctly
    And the Excel file should display properly in Excel applications
    And character encoding should be handled appropriately

  Scenario: Export of large text fields
    Given I have features with very long descriptions or notes
    When the data is exported to any format
    Then long text fields should be handled without truncation
    And Excel cell limits should be respected with appropriate handling
    And CSV text wrapping should work correctly for long fields