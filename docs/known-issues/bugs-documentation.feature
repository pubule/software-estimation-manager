Feature: Bugs and Known Issues
  As a QA tester or developer
  I need to understand the current bugs and behavioral quirks in the system
  So that I can write appropriate tests and plan fixes

  Background:
    Given the Software Estimation Manager application is running
    And the VSCode-style sidebar navigation is implemented
    And capacity planning integration is active
    And modal management system is in place
    And all components are initialized

  # Validation and Input Issues

  Scenario: Description validation discrepancy between check and error message
    Given I am creating a new feature
    When I enter a description with exactly 4 characters
    Then the validation check should pass (actual requirement is 3+ characters)
    But if validation fails, the error message incorrectly states "Description must be at least 10 characters long"
    And this creates user confusion about actual validation requirements
    # BUG: Error message claims 10 character minimum but code validates 3+ characters

  Scenario: Feature validation allows shorter descriptions than stated requirement
    Given I am validating feature input data
    When I enter a description with 5 characters
    Then the feature validation should pass
    But the error message for short descriptions claims "10 characters minimum"
    And users receive conflicting information about requirements
    # BUG: Validation logic and user messaging are inconsistent

  # VSCode Navigation and Interface Issues

  Scenario: VSCode sidebar panel switching race conditions
    Given I am rapidly clicking between VSCode sidebar icons
    When multiple panel switches are triggered quickly
    Then the currentActivePanel state might become inconsistent
    And panel opening/closing animations could overlap
    And icon active states might not synchronize properly
    # BUG: Rapid VSCode panel switching can cause state inconsistencies

  Scenario: VSCode sidebar initialization timing dependencies
    Given the VSCode sidebar setup occurs during application startup
    When the setupVSCodeSidebar method runs
    Then there is a 500ms delay before panel activation
    And DOM elements might not be fully available during initialization
    And console errors are logged if sidebar elements are missing
    # BUG: VSCode sidebar initialization has timing dependencies on DOM readiness

  # Timing and Concurrency Issues

  Scenario: Multiple timeout delays could overlap during project creation
    Given I am creating a new project
    When the new project workflow initiates
    Then multiple setTimeout operations are scheduled concurrently
    And a 100ms timeout is set for phase reset
    And a 600ms timeout is set for version creation
    And VSCode navigation initialization has its own 500ms timeout
    And these timeouts could potentially interfere with each other
    And the order of execution is not deterministic
    # BUG: Race conditions possible due to overlapping timeouts across systems

  Scenario: Project phases manager has multiple setTimeout calls causing timing conflicts
    Given project phase calculations are being performed
    When multiple asynchronous operations are queued with setTimeout
    Then timing conflicts could occur between different calculation steps
    And race conditions might affect the accuracy of calculations
    And the final state might depend on timing rather than logic
    And VSCode panel updates might interfere with calculation timing
    # BUG: Complex timing dependencies create unpredictable behavior

  # State Management Issues

  Scenario: Auto-save disabled but markDirty still triggers phase manager updates
    Given auto-save functionality is intentionally disabled
    And I am viewing the project phases section
    When the project is marked as dirty (needs saving)
    Then the phase manager still receives update notifications
    And development phase calculations are triggered unnecessarily
    And this occurs despite auto-save being disabled
    # BUG: State change notifications ignore auto-save settings

  Scenario: Reset functionality doesn't handle array references correctly
    Given configuration objects contain array-type properties
    When configuration reset operations are performed
    Then array references may not be properly handled
    And lingering references to old arrays could remain
    And this could cause memory leaks or unexpected behavior
    # BUG: Improper array reference management in reset operations

  # Data Integrity and Validation Issues

  Scenario: Cache key generation could produce hash collisions
    Given configuration caching uses hash-based keys
    When different configurations are processed
    Then the simple hash algorithm has collision potential
    And hash collisions could cause incorrect cache hits
    And different configurations might incorrectly share cached results
    # BUG: Simple hashing algorithm not collision-resistant

  Scenario: CSV resolution methods assume config structure without validation
    Given CSV export processes supplier and category data
    When CSV field resolution occurs
    Then methods assume configuration objects have expected properties
    But no validation ensures required structure exists
    And missing properties could cause resolution failures
    # BUG: No validation of assumed configuration structure

  Scenario: Version creation has no project validation before snapshot
    Given I am creating a project version
    When the snapshot process begins
    Then no validation ensures project data is complete or valid
    And corrupted or incomplete snapshots could be created
    And version restoration could fail due to invalid snapshot data
    # BUG: Version snapshots can contain invalid project data

  # File Operations and Storage Issues

  Scenario: saveToSpecificFile creates browser download instead of actual file save
    Given I want to save a project to a specific file location
    When I use the saveToSpecificFile method
    Then a browser download is initiated instead of file system save
    And the file is not saved to the intended location
    And this behavior differs from user expectations
    # BUG: Method name implies file save but performs browser download

  Scenario: Version management methods reference undefined versionsKey
    Given version management functionality exists
    When version-related operations are performed
    Then methods reference an undefined versionsKey property
    And this could cause version operations to fail
    And versioning functionality might not work as expected
    # BUG: Undefined property reference in version management

  # Modal Management and Isolation Issues

  Scenario: Modal event listener conflicts between different managers
    Given multiple modal managers are active (features, capacity, configuration)
    When modals are opened and closed across different systems
    Then event listeners might not be properly isolated
    And cross-modal interference could occur
    And modal state might become inconsistent across managers
    # BUG: Modal isolation not fully implemented across all system components

  Scenario: Modal Z-index and overlay conflicts in VSCode layout
    Given modals are opened within the VSCode interface context
    When multiple modals or overlays are present
    Then Z-index stacking might not be properly managed
    And modals might appear behind VSCode sidebar panels
    And backdrop clicks might not work correctly in all contexts
    # BUG: Modal layering issues within VSCode layout structure

  # UI and Interaction Issues

  Scenario: Element waiting logic logs warnings instead of throwing errors
    Given the system waits for DOM elements to become available
    When expected elements are not found within timeout
    Then warnings are logged to console instead of proper error handling
    And the system continues processing despite missing elements
    And this could lead to silent failures in UI operations
    And VSCode sidebar elements might fail silently if not found
    # BUG: Missing UI elements cause warnings but no proper error handling

  Scenario: Redundant DOM queries in toggle functionality and VSCode operations
    Given UI toggle operations are performed
    When elements need to be accessed multiple times
    Then redundant DOM queries are executed for the same elements
    And VSCode panel switching involves repeated element lookups
    And this represents inefficient DOM access patterns
    And performance could be improved with element caching
    # BUG: Inefficient DOM access patterns with repeated queries

  Scenario: Event listeners are repeatedly removed and recreated across systems
    Given feature form initialization and VSCode sidebar setup occurs
    When calculation listeners and navigation listeners are set up
    Then existing listeners are removed by element cloning in some cases
    And new listeners are attached to cloned elements
    And this pattern repeats unnecessarily during reconfiguration
    And VSCode panel switching might accumulate orphaned listeners
    # BUG: Inefficient listener management with repeated clone operations

  # Calculation and Logic Issues

  Scenario: Development cost calculation assumes features have suppliers
    Given development phase costs are being calculated
    When features without assigned suppliers exist
    Then calculation assumes all features have valid supplier assignments
    But features without suppliers could cause calculation errors
    And cost calculations might be incomplete or incorrect
    # BUG: Missing validation for supplier assignments in cost calculations

  Scenario: Complex DOM selector fallback logic in totals updates
    Given project phase totals need UI updates
    When primary DOM selectors fail to find elements
    Then complex fallback selector logic is attempted
    But this creates fragile dependencies on DOM structure
    And updates might fail if DOM structure changes
    # BUG: Fragile DOM selector dependencies in UI updates

  # Migration and Compatibility Issues

  Scenario: Migration method exists but isn't automatically called
    Given old format configuration data exists
    When configuration loading occurs
    Then migration methods exist to upgrade data format
    But migration is not automatically invoked during loading
    And manual intervention might be required for format upgrades
    # BUG: Data format migration not automatically triggered

  Scenario: Configuration deletion assumes global item existence without validation
    Given configuration item deletion is requested
    When deletion processing occurs
    Then the system assumes items exist globally without validation
    But no verification confirms item existence before deletion
    And deletion attempts on non-existent items could cause errors
    # BUG: No existence validation before configuration item deletion

  # Validation and Error Handling Gaps

  Scenario: Phase effort validation exists but is never called during input handling
    Given project phase effort distribution can be modified
    When users change effort percentages through UI
    Then validation logic exists to check if percentages sum to 100%
    But validation methods are never invoked during input events
    And invalid distributions could be saved without user notification
    # BUG: Validation logic exists but is not integrated into input handling

  Scenario: Sync methods don't ensure project structure exists
    Given project synchronization is requested
    When sync operations execute
    Then methods assume project structure is properly initialized
    But no validation ensures required project properties exist
    And sync could fail on malformed or incomplete project data
    # BUG: No project structure validation before synchronization

  # Date and Time Issues

  Scenario: Date filtering mixes local time with UTC timestamps
    Given version filtering by date ranges
    When date comparisons are performed
    Then local time filtering might be inconsistent with UTC storage
    And timezone-related filtering errors could occur
    And date boundaries might not align correctly across timezones
    # BUG: Inconsistent timezone handling in date filtering

  # Method and Reference Issues

  Scenario: References to undefined updateTable method in version management
    Given version management UI needs refreshing
    When table update operations are triggered
    Then code references undefined updateTable methods
    And this could cause runtime errors during UI updates
    And version history display might not refresh properly
    # BUG: Undefined method references in version management UI

  Scenario: Version ID parsing assumes V prefix without validation
    Given version IDs are processed for operations
    When version ID parsing occurs
    Then parsing assumes "V" prefix format without validation
    And malformed version IDs could cause parsing errors or unexpected behavior
    And robust ID format validation is missing
    # BUG: No validation of version ID format assumptions

  # Capacity Planning Integration Issues

  Scenario: Capacity planning data validation gaps
    Given capacity planning data is integrated with project management
    When resource allocations and team assignments are made
    Then capacity data structure validation might be incomplete
    And invalid capacity allocations could be stored
    And data integrity issues could affect capacity planning functionality
    # BUG: Insufficient validation of capacity planning data structures

  Scenario: Resource assignment doesn't verify availability across systems
    Given resources are being assigned to project phases and capacity planning
    When resource allocation occurs across both systems
    Then assignments happen without checking cross-system availability
    And over-allocation of resources across phases and capacity plans is possible
    And resource conflicts are not detected between project and capacity systems
    # BUG: No cross-system resource availability or conflict checking

  Scenario: Capacity timeline rendering performance issues
    Given large capacity datasets with extensive allocation data
    When capacity timeline views are rendered
    Then rendering performance might degrade with large datasets
    And timeline scrolling could become unresponsive
    And memory usage might spike during timeline operations
    # BUG: Capacity timeline performance not optimized for large datasets

  # VSCode Interface and Integration Issues

  Scenario: VSCode panel state persistence inconsistencies
    Given VSCode panel states should persist across application sessions
    When application is closed and reopened
    Then panel state restoration might not work consistently
    And active panel might not be restored correctly
    And navigation state could be lost in some scenarios
    # BUG: Inconsistent VSCode interface state persistence

  Scenario: Resource and Performance Issues

  Scenario: No logic to preserve important versions during cleanup
    Given automatic version cleanup occurs when limits are reached
    When old versions are removed to make space
    Then no consideration is given to version importance or significance
    And critical milestone versions could be accidentally deleted
    And users have no mechanism to protect important versions
    And capacity planning milestone versions might be lost inappropriately
    # BUG: Version cleanup doesn't consider version importance across all systems