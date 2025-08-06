Feature: Project Phases Management
  As a project manager
  I want to manage the 8 standard project phases with resource allocation and cost calculations
  So that I can properly plan project timelines, resources, and budgets

  Background:
    Given the Project Phases Manager is initialized
    And the configuration manager provides resource and supplier data
    And a project with features is loaded

  Scenario: Load 8 standard project phases with defined structure
    Given the phase definitions are being loaded
    When the project phases are initialized
    Then exactly 8 project phases should be defined
    And the phases should be in order: functionalSpec, techSpec, development, sit, uat, vapt, consolidation, postGoLive
    And each phase should have a name, description, type, and calculated flag
    And each phase should have default effort distribution across 4 roles

  Scenario: Initialize functional specification phase
    Given the project phases are being set up
    When I examine the functional specification phase
    Then it should be named "Functional Specification"
    And it should be of type "pre-development"
    And it should not be automatically calculated
    And it should have default effort distribution: 0% G1, 0% G2, 80% TA, 20% PM

  Scenario: Initialize technical specification phase  
    Given the project phases are being set up
    When I examine the technical specification phase
    Then it should be named "Technical Specification"
    And it should be of type "pre-development" 
    And it should not be automatically calculated
    And it should have default effort distribution: 20% G1, 60% G2, 15% TA, 5% PM

  Scenario: Initialize development phase with auto-calculation
    Given the project phases are being set up
    When I examine the development phase
    Then it should be named "Development"
    And it should be of type "development"
    And it should be marked for automatic calculation
    And it should have default effort distribution: 10% G1, 80% G2, 5% TA, 5% PM

  Scenario: Initialize testing phases (SIT, UAT, VAPT)
    Given the project phases are being set up
    When I examine the testing phases
    Then SIT should have effort distribution: 0% G1, 30% G2, 50% TA, 20% PM
    And UAT should have effort distribution: 0% G1, 20% G2, 60% TA, 20% PM  
    And VAPT should have effort distribution: 0% G1, 0% G2, 100% TA, 0% PM
    And all testing phases should be of type "testing"
    And none should be automatically calculated

  Scenario: Initialize deployment phases (Consolidation, Post Go-Live)
    Given the project phases are being set up
    When I examine the deployment phases
    Then Consolidation should be of type "deployment"
    And Post Go-Live should be of type "post-deployment"
    And Consolidation should have effort distribution: 0% G1, 40% G2, 40% TA, 20% PM
    And Post Go-Live should have effort distribution: 0% G1, 50% G2, 30% TA, 20% PM

  Scenario: Create default phases with zero man days initially
    Given the phase definitions are loaded
    When default project phases are created
    Then each phase should have manDays initialized to 0
    And each phase should have cost initialized to 0
    And each phase should have effort distribution matching defaults
    And each phase should have an empty resources array

  Scenario: Calculate development phase from features and coverage
    Given I have project features totaling 25 man days
    And the coverage is set to 5 man days
    When the development phase is calculated
    Then the development phase manDays should be 30 (features + coverage)
    And the development phase cost should be calculated using supplier rates
    And the calculation should use suppliers assigned to features

  Scenario: Distribute development phase effort across roles
    Given the development phase has 30 total man days
    And the development phase effort distribution is 10% G1, 80% G2, 5% TA, 5% PM
    When effort is distributed to resources
    Then G1 role should receive 3 man days
    And G2 role should receive 24 man days
    And TA role should receive 1.5 man days
    And PM role should receive 1.5 man days

  Scenario: Calculate development phase cost using feature-specific supplier rates
    Given I have features assigned to suppliers with different rates
    And the development phase includes feature man days and coverage
    When development costs are calculated
    Then each feature's cost should use its assigned supplier's rate
    And coverage cost should use a default rate or resource allocation
    And the total development cost should sum all individual costs

  Scenario: Assign internal resources to project phases
    Given I have internal resources available: TA (400€/day), PM (550€/day)
    And a phase requires 5 TA days and 2 PM days
    When internal resources are assigned to the phase
    Then the TA resource should be allocated 5 days at 400€/day = 2000€
    And the PM resource should be allocated 2 days at 550€/day = 1100€
    And the phase cost should include both internal resource costs

  Scenario: Mix external suppliers and internal resources in phases
    Given I have both external suppliers and internal resources available
    And a phase uses G2 external suppliers and internal TA resources
    When the phase costs are calculated
    Then external G2 work should use supplier rates
    And internal TA work should use internal resource rates
    And the total cost should combine both external and internal costs

  Scenario: Validate effort distribution percentages sum to 100%
    Given I am configuring effort distribution for a phase
    When I set the role percentages
    Then the sum of all role percentages should equal 100%
    And visual indicators should show if the distribution is invalid
    And the system should prevent saving invalid distributions

  Scenario: Update phase calculations when project features change
    Given I have configured project phases
    When project features are modified (added, edited, or deleted)
    Then the development phase should be recalculated automatically
    And dependent calculations should be updated
    And the UI should reflect the new calculations
    And the project should be marked as dirty

  Scenario: Synchronize phases with current project data
    Given project data has been modified externally
    When phase synchronization is triggered
    Then all phase data should be refreshed from current project state
    And any cached calculations should be invalidated
    And phase displays should show current data

  Scenario: Render phases with real-time cost and effort updates
    Given the phases UI is displayed
    When phase data changes
    Then effort distributions should update immediately
    And cost calculations should refresh in real-time
    And totals should recalculate automatically
    And resource assignments should be updated

  # Error Scenarios and System Behaviors

  Scenario: Handle complex DOM selector fallback for totals updates
    Given the phase totals need to be updated in the UI
    When the primary DOM selector fails to find elements
    Then fallback selectors should be attempted
    And the system should gracefully handle missing UI elements
    But multiple selectors create complexity in the update logic

  Scenario: Development cost calculation assumes features have suppliers
    Given I have features without assigned suppliers
    When development phase costs are calculated
    Then the calculation assumes all features have valid supplier assignments
    But features without suppliers could cause calculation errors
    And this represents a potential validation gap

  Scenario: Multiple setTimeout calls could cause timing conflicts  
    Given phase calculations involve multiple asynchronous operations
    When several setTimeout operations are queued
    Then timing conflicts could occur between operations
    And race conditions might affect calculation accuracy
    And the order of operations might not be deterministic

  Scenario: Validation exists but is never called during input handling
    Given phase effort distribution validation logic exists
    When users modify effort percentages through the UI
    Then validation should be triggered to check totals
    But the validation methods are never called during input events
    And invalid distributions could be saved without warning

  Scenario: Sync methods don't ensure project structure exists
    Given synchronization is requested for project phases
    When the sync operation runs
    Then it assumes the project structure is properly initialized
    But no validation ensures required project properties exist
    And sync operations could fail on malformed project data

  Scenario: Resource assignment doesn't verify resource availability
    Given resources are being assigned to project phases
    When resource allocation occurs
    Then the system assigns resources without checking availability
    And over-allocation of resources is possible
    And resource conflicts across phases are not detected