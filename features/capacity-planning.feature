Feature: Capacity Planning
  As a project manager
  I want to manage team capacity and resource allocation
  So that I can effectively plan and monitor project resources

  Background:
    Given the Software Estimation Manager application is loaded
    And the VSCode-style sidebar navigation is functional
    And the Capacity Planning section is accessible via sidebar
    And mock team data is available for testing scenarios

  # Capacity Dashboard and Overview

  Scenario: Navigate to Resource Capacity Overview
    Given I click the Capacity Planning icon in the VSCode sidebar
    When the Capacity Planning panel opens
    Then the submenu should be automatically expanded
    And I should see "Resource Capacity Overview" option
    When I click "Resource Capacity Overview"
    Then the resource-overview-page should become active
    And I should see a loading message with spinner initially
    And the page header should display "📊 Resource Capacity Overview"
    And page actions should include Refresh and Export Overview buttons

  Scenario: Navigate to Capacity Planning Timeline
    Given I have the Capacity Planning panel open
    When I click "Capacity Planning Timeline"
    Then the capacity-timeline-page should become active
    And I should see a loading message with spinner initially
    And the page header should display "📅 Capacity Planning Timeline"
    And page actions should include Add Assignment, Refresh, and Export Timeline buttons

  Scenario: Resource Capacity Overview content loading
    Given I am on the Resource Capacity Overview page
    When the page content loads
    Then the resource-overview-content element should replace the loading message
    And capacity statistics should be displayed
    And resource allocation data should be presented
    And the data should use VSCode dark theme styling
    And charts or visualizations should be properly rendered

  Scenario: Capacity Timeline content structure
    Given I am on the Capacity Planning Timeline page
    When the timeline content loads
    Then the capacity-timeline-content element should be populated
    And timeline visualization should be displayed
    And resource assignments should be shown chronologically
    And the interface should support adding new assignments

  # Team Management Components

  Scenario: Team management integration with capacity planning
    Given capacity planning components are loaded
    When I access team management functionality
    Then team data should be sourced from team-manager.js component
    And working days calculations should use working-days-calculator.js
    And auto-distribution functionality should be available via auto-distribution.js
    And all components should integrate seamlessly

  Scenario: Team member data structure and mock data
    Given the team management system is initialized
    When mock team data is loaded
    Then team members should have proper data structure
    And each member should have allocation information
    And the data should support capacity planning calculations
    And mock data should be realistic and representative

  Scenario: Team modal functionality within capacity context
    Given I am working within the capacity planning section
    When team-related modals are opened
    Then modal isolation should prevent conflicts with other capacity modals
    And VSCode-style modal button styling should be consistent
    And modal close functionality should work properly without affecting other capacity components
    And form submissions should integrate with capacity planning data

  # Resource Allocation and Timeline Management

  Scenario: Timeline resource allocation interface
    Given I am on the Capacity Planning Timeline page
    When the timeline interface loads
    Then I should see a time-based view of resource allocations
    And the interface should support viewing by different time periods
    And resource conflicts should be visually indicated
    And allocation percentages should be clearly displayed

  Scenario: Add new resource allocation from timeline with budget information
    Given I am viewing the capacity timeline
    When I click the "Add Assignment" button
    Then a resource allocation modal should open
    And I should be able to select team members
    And I should be able to specify time periods
    And I should be able to set allocation percentages
    And project assignment options should be available
    And budget information section should be displayed
    And "Total Final MDs" should show calculated budget based on vendor costs
    And project status should default to "pending" not "approved"

  Scenario: Resource capacity calculations and validation
    Given resource allocations are being managed
    When allocation percentages are calculated
    Then working days should be properly calculated using working-days-calculator
    And over-allocation warnings should be displayed when total exceeds 100%
    And auto-distribution should help balance workloads when requested
    And calculations should account for holidays and non-working days

  Scenario: Filtering and view options in timeline
    Given the capacity timeline is displayed
    When I apply filters for team members or projects
    Then the timeline view should update accordingly
    And allocation data should be recalculated for the filtered view
    And visual indicators should reflect the filtered state
    And filter state should persist during the session

  Scenario: Assignment modal budget calculation integration
    Given I have projects with configured vendor costs
    And I have team members with vendor assignments
    When I create a new assignment through the modal
    Then the assignment modal should display budget information section
    And the "Total Final MDs" should be calculated from project vendor costs
    And vendor cost matching should use team member vendorId and role
    And budget context should show "Budget for [Vendor] - [Role] in this project"
    And calculation should handle missing vendor costs gracefully by showing 0.0
    And debug logging should show vendor cost matching process

  # Timeline Interface and Interaction

  Scenario: Timeline visual structure and navigation
    Given the capacity timeline is loaded
    When I examine the timeline interface
    Then time periods should be clearly labeled and navigable
    And resource assignments should be visually represented
    And the interface should support both horizontal and vertical scrolling
    And timeline zoom or time period selection should be available

  Scenario: Resource assignment editing within timeline
    Given existing resource assignments are displayed in the timeline
    When I click on an existing assignment
    Then I should be able to edit the assignment details
    And changes should be reflected immediately in the timeline view
    And validation should prevent over-allocation conflicts
    And the timeline should update to show the modified allocation

  Scenario: Edit assignment modal preserves existing data
    Given I have a saved manual assignment with:
      | Property      | Value                              |
      | teamMemberId  | team-fullstack:member-fullstack-1  |
      | projectId     | proj_1755202129997_rbqfx9x9x       |
      | notes         | Important assignment notes         |
      | phaseSchedule | Complex multi-phase schedule       |
    When I open the assignment modal to edit this assignment
    Then the modal should use partial reset mode preserving form data
    And the team member dropdown should show the correct selection
    And the project dropdown should show the correct selection
    And the notes field should contain "Important assignment notes"
    And the phase schedule should be populated with existing data
    And the budget information should be recalculated and displayed
    And no form data should be lost during modal initialization

  # Data Visualization and Analytics

  Scenario: Monthly allocation percentage calculation
    Given I have team members with various project allocations
    When I view the monthly breakdown
    Then each month should show the correct percentage allocation
    And over-allocation should be visually indicated when exceeding 100%
    And the calculation should account for project status filters

  Scenario: Project status visualization
    Given allocations exist for both approved and pending projects
    When I examine the visual indicators
    Then approved projects should be visually distinct from pending projects
    And the status should be clearly indicated in the Status column
    And color coding should follow VSCode theme patterns

  # VSCode Sidebar Integration

  Scenario: Auto-expanded Capacity Planning navigation in VSCode sidebar
    Given I click the Capacity Planning icon in the VSCode sidebar
    When the Capacity Planning panel opens
    Then the capacity-toggle should have "expanded" CSS class
    And the capacity-children should have "expanded" CSS class and be visible
    And I should see "Resource Capacity Overview" and "Capacity Planning Timeline" navigation options
    And no manual expansion click should be required
    And the submenu should remain expanded by default

  Scenario: Capacity Planning sidebar panel structure
    Given the Capacity Planning sidebar panel is open
    When I examine the panel structure
    Then the panel-header should display "Capacity Planning"
    And the panel-navigation should contain the auto-expanded submenu
    And the panel-footer should be empty (no Save or Export buttons)
    And this should contrast with the Projects panel which has action buttons
    And the panel should focus purely on navigation to capacity sections

  # Performance and Responsiveness

  Scenario: Handle large allocation datasets
    Given the system contains extensive allocation data
    When I load the resource allocation table
    Then the interface should remain responsive
    And scrolling should be smooth even with many rows
    And filtering operations should complete quickly

  # Error Scenarios and Edge Cases

  Scenario: Handle capacity modal conflicts with other system modals
    Given I have a capacity-related modal open (team assignment, allocation, etc.)
    When other system components attempt to open modals
    Then proper modal isolation should be maintained using modal manager architecture
    And event listeners should be properly scoped to prevent conflicts
    And capacity modals should function independently of feature or configuration modals
    And modal z-index stacking should be handled correctly

  Scenario: Graceful handling of missing capacity data or components
    Given capacity planning components fail to initialize
    When I navigate to capacity planning sections
    Then loading messages should be displayed appropriately
    And fallback content should be shown for missing data
    And console errors should be logged for debugging
    And other application sections should continue to function normally
    And users should receive clear feedback about unavailable functionality

  Scenario: Handle large dataset performance in capacity views
    Given the capacity system contains extensive allocation data
    When capacity views are loaded and rendered
    Then the interface should remain responsive
    And timeline rendering should handle large time ranges efficiently
    And filtering operations should complete in reasonable time
    And memory usage should be managed appropriately for large datasets