Feature: Recent Improvements and Enhanced Debugging
  As a developer and user of the Software Estimation Manager
  I want to have improved debugging capabilities and recent bug fixes documented
  So that I can understand the current state of the application and troubleshoot issues

  Background:
    Given the Software Estimation Manager application is running with recent improvements
    And debug logging is enabled for troubleshooting
    And the title bar layout fixes have been applied
    And the budget calculation system improvements are active

  # Title Bar Layout Improvements

  Scenario: Title bar project status indicator proper alignment fix
    Given the title bar was previously showing misaligned status indicator
    When the application is loaded with the CSS fixes
    Then the project status indicator should appear horizontally next to the project name
    And the indicator should not appear below or misaligned with the project name
    And the .title-project-info class should use specific styling
    And general .project-info class should remain unchanged for other UI elements
    And both main.css and vscode-dark.css should have consistent rules

  Scenario: Title bar CSS isolation prevents regressions
    Given the title bar uses .title-project-info class
    And other project cards use .project-info class
    When the title bar styling is applied
    Then title bar styling should not affect project cards elsewhere
    And project card layouts should remain unchanged
    And CSS specificity should properly isolate title bar styling
    And no visual regressions should occur in other parts of the interface

  # Enhanced Budget Calculation Debugging

  Scenario: Vendor cost matching debug logging provides detailed information
    Given I have vendor costs configured in a project
    And I have team members with vendor assignments
    When budget calculation occurs for an assignment
    Then detailed console logs should show all available vendor costs
    And logs should include "vendorId: [id], role: [role], vendor: [name], finalMDs: [amount]"
    And logs should show the search criteria: "selectedMember.vendorId" and "memberRole"
    And logs should show match results: "Checking: vendorId [id] === [id] (true/false)"
    And this enhanced logging should help troubleshoot budget calculation issues

  Scenario: Budget calculation handles Total Final MDs showing 0 issue
    Given enhanced debugging is active for vendor cost matching
    When a team member with "Developer" vendor is selected
    And the project has vendor costs but no exact match is found
    Then the detailed logging should reveal why no match occurred
    And it should show if vendorId matching failed or role matching failed
    And it should help identify data structure mismatches
    And the Total Final MDs should show 0.0 with clear explanation in logs

  # Project Status Default Changes

  Scenario: Project assignments now default to "pending" status
    Given the recent change from "approved" to "pending" default status
    When new project assignments are created
    Then the default status should be "pending" instead of "approved"
    And this change should affect calculations-manager.js allocation creation
    And this change should affect project data loading with status assignment
    And capacity planning should handle "pending" projects appropriately
    And the change should be consistent across all status assignment points

  Scenario: Status change affects capacity calculations correctly
    Given project assignments now default to "pending"
    When capacity calculations are performed
    Then "pending" projects should be handled differently from "approved" projects
    And capacity utilization should account for pending vs approved status
    And visual indicators should distinguish between pending and approved allocations
    And the capacity timeline should reflect the correct status colors

  # Debugging Infrastructure Improvements

  Scenario: Enhanced console logging for troubleshooting vendor costs
    Given vendor cost calculation issues were difficult to troubleshoot
    When the enhanced logging system is active
    Then console logs should provide step-by-step calculation details
    And logs should show data structures at each stage of processing
    And error conditions should be clearly logged with context
    And successful matches should be confirmed in logs
    And developers should be able to quickly identify configuration issues

  Scenario: Debug logs help identify data structure mismatches
    Given complex vendor cost matching logic
    When debugging logs are reviewed
    Then logs should reveal if vendor IDs are strings vs numbers
    And logs should show if role names have unexpected formatting
    And logs should identify case sensitivity issues
    And logs should reveal missing or null data fields
    And this should accelerate problem resolution for configuration issues

  # CSS Layout System Improvements

  Scenario: Title bar flexbox layout ensures consistent alignment
    Given the previous layout had alignment issues
    When the improved flexbox layout is applied
    Then .title-project-info should use display: flex with align-items: center
    And the container should have a fixed height (20px) for stability
    And gap spacing should be controlled (6px) for proper element separation
    And #project-status should use flex properties for proper centering
    And the layout should be responsive and maintain alignment across window sizes

  Scenario: Status indicator sizing optimized for visibility
    Given the status indicator was previously too small or mispositioned
    When the improved sizing is applied
    Then font-size should be 12px for optimal visibility in the title bar
    And the indicator should use flex centering for perfect alignment
    And flex-shrink: 0 should prevent the indicator from being compressed
    And the indicator should remain visible across different zoom levels
    And width/height should be auto to allow proper flex sizing

  # Cross-System Integration Verification

  Scenario: Budget system integrates with capacity planning timeline
    Given the budget calculation improvements are active
    And the capacity planning timeline is displayed
    When assignments with budget information are created
    Then the timeline should reflect cost-aware resource allocation
    And budget constraints should be considered in capacity planning
    And resource assignments should show budget implications
    And the integration should provide value for project cost management

  Scenario: Status changes propagate correctly across the application
    Given the "pending" default status is implemented
    When I navigate between different sections of the application
    Then the status should be consistent across projects panel, capacity planning, and calculations
    And status changes should be reflected in all relevant UI components
    And the title bar status indicator should remain synchronized
    And no part of the application should show conflicting status information

  # Performance and Stability Improvements

  Scenario: Enhanced logging does not impact application performance
    Given detailed debugging logs are enabled
    When normal application operations are performed
    Then the additional logging should not significantly impact performance
    And logs should be structured to be easily filtered
    And production deployments should be able to disable verbose logging
    And the logging system should be maintainable and not create memory leaks

  Scenario: CSS improvements maintain cross-browser compatibility
    Given the title bar layout improvements
    When the application is used across different browsers and platforms
    Then the flexbox layout should work consistently
    And font sizing should render properly across different display densities
    And the VSCode theme integration should remain consistent
    And no browser-specific rendering issues should be introduced