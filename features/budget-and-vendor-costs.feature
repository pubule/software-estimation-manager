Feature: Budget and Vendor Costs Management
  As a project manager
  I want to manage project budgeting with vendor cost calculations
  So that I can accurately estimate project costs and manage resource budgets

  Background:
    Given the Software Estimation Manager application is running
    And the budget calculation system is initialized
    And vendor costs are configured in project calculation data
    And the capacity planning system is available
    And team members with vendor assignments exist

  Scenario: Display budget information in assignment modal
    Given I have a project loaded with vendor costs configured
    And I have team members with vendor assignments
    When I open the assignment modal for a team member
    Then I should see budget information section
    And the budget section should show "Budget for [Vendor Role] in this project"
    And the "Total Final MDs" field should display calculated budget
    And the budget values should be based on vendor cost calculations

  Scenario: Calculate Total Final MDs from vendor costs
    Given I have a project with vendor costs configured
    And a team member is assigned to vendor "Developer" with role "G2"
    And the project has vendor cost entry for vendorId "internal3" and role "G2"
    When the budget calculation is performed
    Then the Total Final MDs should match the vendor cost finalMDs value
    And the calculation should find the matching vendor cost by vendorId and role
    And the budget display should show the calculated amount

  Scenario: Handle missing vendor cost match gracefully
    Given I have a team member with vendor "Developer" role "G2"
    And the project does not have matching vendor cost entry
    When the budget calculation is performed
    Then the Total Final MDs should display 0.0
    And a console log should indicate no matching vendor cost was found
    And the system should continue functioning without errors

  Scenario: Debug vendor cost matching with detailed logging
    Given debug logging is enabled for vendor cost calculations
    And I have project vendor costs configured
    When budget calculation occurs for a team member
    Then the console should log all available vendor costs with details
    And it should log "vendorId: [id], role: [role], vendor: [name], finalMDs: [amount]"
    And it should log the search criteria being used
    And it should log the match result for each vendor cost checked

  Scenario: Vendor cost calculation for internal resources
    Given I have an internal resource "Developer" configured with ID "internal3"
    And the internal resource has role "G2"
    And the project has vendor costs with matching vendorId and role
    When a team member with this vendor is selected for assignment
    Then the vendor cost lookup should use the internal resource ID
    And the role matching should use the configured role from vendor configuration
    And the final budget should reflect the internal resource cost structure

  Scenario: Project assignment default status is "pending"
    Given I am creating a new project assignment
    When the assignment is initialized with default values
    Then the project status should default to "pending"
    And capacity calculations should treat pending projects appropriately
    And status dropdowns should show pending as the default selection
    And approved status should be available as an alternative option

  Scenario: Budget information context display
    Given I have a team member with vendor information
    When budget information is displayed in the assignment modal
    Then the context should show "Budget for [Vendor Name] - [Role] in this project"
    And vendor name should come from the vendor configuration
    And role should come from the getMemberRole function
    And the context should clearly identify which vendor/role combination is being budgeted

  Scenario: Real-time budget updates during assignment creation
    Given I am creating an assignment with budget information
    When I modify team member selection or project selection
    Then the budget information should update in real-time
    And Total Final MDs should recalculate based on new selections
    And budget context should update to reflect current selections
    And the calculations should be performed without page refresh

  Scenario: Integration of budget system with capacity planning timeline
    Given budget calculations are working correctly
    And I have assignments with budget information
    When I view the capacity planning timeline
    Then project allocations should reflect budget-aware resource planning
    And timeline should show cost implications of resource assignments
    And budget constraints should be considered in capacity planning
    And resource utilization should account for cost-effectiveness

  # Error Scenarios and Edge Cases

  Scenario: Handle undefined vendor costs gracefully
    Given a project has no calculationData.vendorCosts configured
    When budget calculation is attempted for any team member
    Then the system should handle the undefined vendor costs
    And Total Final MDs should default to 0.0
    And appropriate console logging should indicate missing vendor costs
    And the assignment creation should still proceed successfully

  Scenario: Vendor cost data structure validation
    Given project vendor costs exist but have malformed data
    When vendor cost lookup is performed
    Then the system should validate required fields (vendorId, role, finalMDs)
    And invalid entries should be skipped during matching
    And console warnings should indicate data structure issues
    And fallback behavior should ensure system stability

  Scenario: Multiple vendor cost entries for same vendor/role combination
    Given a project has duplicate vendor cost entries for the same vendorId and role
    When vendor cost lookup is performed
    Then the first matching entry should be used
    And a warning should be logged about duplicate entries
    And the calculation should proceed with the first match
    And data consistency should be flagged for administrator attention