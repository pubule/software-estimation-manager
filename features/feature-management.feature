Feature: Feature Management
  As a project estimator
  I want to manage project features with details, calculations, and validations
  So that I can accurately estimate project effort and costs

  Background:
    Given the Software Estimation Manager application is running
    And I have a project loaded with configuration data
    And the feature management system is initialized

  Scenario: Add new feature with automatic ID generation
    Given I have existing features with IDs "BR-001" and "BR-003"
    When I open the add feature modal
    Then the feature ID field should be automatically populated with "BR-004"
    And the modal title should indicate "Add New Feature"
    And all form fields should be empty except the generated ID

  Scenario: Calculate man days using specific formula
    Given I am creating a feature
    And I enter 10 real man days
    And I set expertise level to 80
    And I set risk margin to 20
    When the calculation is triggered
    Then the calculated man days should be 15.00
    And the formula used should be: real man days * (100 + risk margin) / expertise level

  Scenario: Handle zero expertise to prevent division by zero
    Given I am creating a feature
    And I enter 10 real man days  
    And I set expertise level to 0
    And I set risk margin to 10
    When the calculation is triggered
    Then the calculated man days should be 0.00
    And no division by zero error should occur

  Scenario: Real-time calculation updates as inputs change
    Given I have the feature form open
    When I modify the real man days field
    Then the calculated man days should update immediately
    When I modify the expertise level field
    Then the calculated man days should update immediately
    When I modify the risk margin field
    Then the calculated man days should update immediately

  Scenario: Populate feature form for editing existing feature
    Given I have a feature with the following details:
      | Property     | Value              |
      | id           | F1                 |
      | description  | Test Feature       |
      | category     | cat1               |
      | featureType  | ft1                |
      | supplier     | sup1               |
      | realManDays  | 10                 |
      | expertise    | 90                 |
      | riskMargin   | 15                 |
      | manDays      | 12.5               |
      | notes        | Test notes         |
    When I open the edit feature modal for this feature
    Then all form fields should be populated with the correct values
    And the modal title should indicate "Edit Feature"

  Scenario: Validate feature data before saving
    Given I am creating a new feature
    When I enter a description with less than 3 characters
    Then the validation should fail
    And an error message should indicate minimum description requirements
    When I enter valid data for all required fields
    Then the validation should pass
    And the feature should be ready for saving

  Scenario: Close feature modal using multiple methods
    Given the feature modal is open
    When I click the close button (×)
    Then the modal should close
    When I open the modal again and click outside the modal content
    Then the modal should close
    When I open the modal again and press the Escape key
    Then the modal should close
    When I open the modal again and click the Cancel button
    Then the modal should close

  Scenario: Filter features by category, supplier, and type
    Given I have features with different categories, suppliers, and types
    When I select "Category A" from the category filter
    Then only features with "Category A" should be visible
    When I also select "Supplier X" from the supplier filter
    Then only features with both "Category A" and "Supplier X" should be visible
    And the filtering should use AND logic between criteria

  Scenario: Search features by text content
    Given I have features with various descriptions
    When I enter "authentication" in the search field
    Then only features containing "authentication" in their description should be visible
    And the search should be case-insensitive
    When I clear the search field
    Then all features should become visible again

  Scenario: Populate dropdown options from configuration
    Given the configuration contains suppliers, categories, and feature types
    When the feature form is displayed
    Then the supplier dropdown should contain all configured suppliers
    And the category dropdown should contain all configured categories
    And project-specific items should have visual indicators
    And global items should be displayed without special indicators

  Scenario: Render feature table with expandable two-row structure
    Given I have features in the project
    When the features table is rendered
    Then each feature should occupy two table rows
    And the first row should contain primary feature information
    And the second row should contain expandable details
    And users should be able to toggle row expansion

  Scenario: Save new feature to project
    Given I have filled out a valid feature form
    When I click the Save Feature button
    Then the feature should be added to the project features list
    And the project should be marked as dirty
    And the feature modal should close
    And the features table should refresh to show the new feature
    And the project summary should be updated

  Scenario: Update existing feature
    Given I am editing an existing feature
    And I modify the feature details
    When I save the changes
    Then the feature should be updated in the project features list
    And the project should be marked as dirty
    And the changes should be reflected in the features table

  Scenario: Delete feature from project
    Given I have a feature in the project
    When I request to delete the feature
    Then the feature should be removed from the project features list
    And the project should be marked as dirty
    And the features table should refresh without the deleted feature
    And the project summary should be updated

  # Error Scenarios - Documenting Known Bugs and Quirks

  Scenario: Element waiting logic logs warnings instead of errors
    Given the system is waiting for DOM elements to become available
    When an expected element is not found within the timeout period
    Then a warning should be logged to the console
    But no error should be thrown
    And the system should continue processing

  Scenario: Description validation inconsistency between check and error message
    Given I am creating a feature
    When I enter a description with exactly 4 characters
    Then the validation check should pass (requires 3+ characters)
    But if validation fails, the error message should incorrectly state "10+ characters required"
    And this represents a discrepancy between validation logic and error messaging

  Scenario: Redundant DOM queries in toggle functionality
    Given the feature form is displayed
    When toggle operations are performed
    Then multiple DOM queries should be executed for the same elements
    And this represents inefficient DOM access patterns

  Scenario: Event listeners are repeatedly removed and recreated
    Given the feature form is initialized
    When calculation listeners are set up
    Then existing event listeners should be removed by element cloning
    And new event listeners should be attached to the cloned elements
    And this pattern should repeat every time listeners are reconfigured

  Scenario: Feature form validation allows shorter descriptions than error message indicates
    Given I am validating feature data
    When I enter a description with 4 characters
    Then the feature should pass validation
    But the error message for short descriptions should claim "10 characters minimum"
    And this creates confusion between actual validation rules and user messaging