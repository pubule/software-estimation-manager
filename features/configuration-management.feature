Feature: Configuration Management
  As a system administrator
  I want to manage hierarchical configuration settings
  So that I can maintain global defaults while allowing project-specific customizations

  Background:
    Given the Configuration Manager is initialized
    And the data persistence layer is available

  Scenario: Initialize global configuration with default values
    Given no global configuration exists in storage
    When the global configuration is loaded
    Then a default global configuration should be created
    And it should contain exactly 2 default suppliers
    And the first supplier should be "External Supplier A" with 450 real rate and 500 official rate
    And it should contain default internal resources for IT, RO, and Development departments
    And it should contain 5 default categories with specific multipliers
    And it should contain calculation parameters with 22 working days per month

  Scenario: Create default suppliers with specific attributes
    Given the global configuration is initialized
    When I examine the default suppliers
    Then "External Supplier A" should have real rate 450 and official rate 500
    And "External Supplier B" should have real rate 400 and official rate 450  
    And both suppliers should be marked as global
    And both suppliers should have active status

  Scenario: Create default categories with multipliers and feature types
    Given the global configuration is initialized
    When I examine the default categories
    Then the "Security" category should have multiplier 1.2
    And the "Integration" category should have the highest multiplier of 1.3
    And the "User Interface" category should have multiplier 1.0
    And each category should be marked as global
    And each category should have a descriptive name and description

  Scenario: Create default internal resources with role and department structure
    Given the global configuration is initialized
    When I examine the internal resources
    Then there should be "Tech Analyst IT" in IT department with rates 350/400
    And there should be "Tech Analyst RO" in RO department
    And there should be "Developer" in Development department
    And each resource should have both real and official rates defined

  Scenario: Set default calculation parameters
    Given the global configuration is initialized
    When I examine the calculation parameters
    Then working days per month should be 22
    And working hours per day should be 8
    And currency symbol should be "€"
    And risk margin should be 0.15
    And overhead percentage should be 0.10

  Scenario: Handle configuration loading failure with fallback
    Given the data manager fails to load settings
    When configuration initialization is attempted
    Then an error should be logged about initialization failure
    And a fallback global configuration should be created
    And the configuration should contain 5 default categories
    And the system should continue functioning normally

  Scenario: Initialize project configuration with hierarchical structure
    Given a global configuration exists
    When I initialize a project configuration for "test-project"
    Then the project config should inherit all global suppliers
    And the project config should inherit all global categories
    And the project config should inherit all global internal resources
    And the project config should inherit all global calculation parameters
    And the project config should have empty project overrides
    And modifications to project config should not affect global config

  Scenario: Project configuration inherits global defaults through deep cloning
    Given a global configuration with supplier "External Supplier A"
    When I initialize a project configuration
    And I modify the first supplier name to "Modified Supplier"
    Then the project config supplier should be "Modified Supplier"
    But the global config supplier should remain "External Supplier A"
    And this proves deep cloning prevents global config contamination

  Scenario: Return global configuration when no project config provided
    Given a global configuration exists
    When I request project configuration with null project data
    Then the returned configuration should equal the global configuration
    And it should contain all global suppliers
    And it should contain all global categories
    And this provides fallback behavior for missing project data

  Scenario: Merge project-specific overrides with global configuration
    Given a global configuration with default suppliers
    And a project configuration with additional project-specific suppliers
    When configurations are merged
    Then the merged result should contain both global and project suppliers
    And project-specific items should take precedence over global items with same ID
    And the merge should preserve the hierarchical structure

  Scenario: Cache configuration results for performance
    Given a configuration is loaded and processed
    When the same configuration is requested again
    Then the cached result should be returned
    And no reprocessing should occur
    And cache keys should be based on configuration content hash

  Scenario: Validate categories and suppliers before use
    Given I have a category ID to validate
    When I validate the category against current configuration
    Then the validation should return true for existing categories
    And the validation should return false for non-existent categories
    And the validation should work for both global and project-specific items

  Scenario: Get display names for configuration items
    Given I have a category with ID "cat1"
    When I request the display name for this category
    Then the display name should be formatted as "Category-cat1"
    And the formatting should be consistent across all item types

  Scenario: Manage project-specific configuration overrides
    Given I have a project configuration
    When I add project-specific suppliers to overrides
    Then the suppliers should be stored in projectOverrides.suppliers
    And they should not affect the base configuration
    And they should be included when getting merged project configuration

  # Error Scenarios and System Behaviors

  Scenario: Handle missing project overrides structure during migration
    Given a project configuration in old format without projectOverrides
    When the configuration is processed
    Then projectOverrides should be automatically added
    And it should contain empty arrays for suppliers, categories, and internal resources
    And it should contain empty object for calculation parameters
    And the migration should be transparent to the user

  # Teams Configuration Integration

  Scenario: Teams configuration modal functionality
    Given I am in the Configuration section
    When I access teams configuration (teams-config-manager.js)
    Then team-related modals should open with proper modal isolation
    And teams configuration should integrate with the overall configuration hierarchy
    And changes to teams should be reflected in capacity planning data
    And teams modal styling should match VSCode theme

  Scenario: Categories configuration with enhanced management
    Given I access categories configuration
    When I use the categories-config-manager component
    Then category modals should function independently
    And categories should support hierarchical organization
    And category changes should be reflected across the application
    And modal conflicts should be prevented through proper event isolation

  # Configuration UI Integration

  Scenario: Configuration scrollable interface
    Given configuration sections contain extensive data
    When I view configuration options
    Then configuration-scrollable.css should provide proper scrolling behavior
    And hierarchical-config.css should style nested configuration properly
    And the interface should be responsive and accessible
    And scrolling should work smoothly within the VSCode layout

  Scenario: Storage configuration management
    Given storage configuration options are available
    When I access storage configuration (storage-config-manager.js)
    Then storage settings should be manageable through dedicated interface
    And storage configuration should integrate with data persistence layer
    And changes should be applied immediately and persist across sessions

  # Known Issues and System Behaviors

  Scenario: Reset functionality with array reference handling
    Given a configuration with array-type properties
    When configuration reset is performed
    Then array references should be properly handled
    And no lingering references to old arrays should remain
    But current implementation may not handle array references correctly
    And this represents a known limitation in configuration management

  Scenario: Cache key generation with potential hash collisions
    Given configurations with similar but different content
    When cache keys are generated
    Then each configuration should have a unique cache key
    But the simple hash algorithm could potentially produce collisions
    And this represents a low-probability but possible issue
    And more robust hashing might be needed for production use

  Scenario: Configuration modal event listener conflicts
    Given multiple configuration managers are active
    When configuration modals are opened and closed repeatedly
    Then event listeners should be properly cleaned up
    But improper listener management could cause conflicts
    And memory leaks might occur from accumulated listeners
    And modal interactions might become unreliable over time

  Scenario: Delete items assuming global existence without validation
    Given a request to delete a configuration item
    When the deletion is processed
    Then the system assumes the item exists globally
    But no validation is performed to confirm existence
    And this could lead to errors if assumptions are incorrect
    And deletion operations should include existence verification

  Scenario: Migration method exists but isn't automatically called
    Given old format configuration data
    When the configuration is loaded
    Then migration methods exist to upgrade the format
    But the migration is not automatically invoked
    And manual migration may be required in some scenarios
    And this represents a gap in automatic data format handling