Feature: Data Persistence
  As a user of the Software Estimation Manager
  I want reliable data storage and retrieval
  So that my project data is safely persisted and validated

  Background:
    Given the Data Manager is initialized
    And the system supports both Electron API and localStorage storage methods

  Scenario: Validate project data structure before operations
    Given I have a complete project with all required properties
    When project data validation is performed
    Then the validation should pass without errors
    And the project should be ready for storage operations

  Scenario: Reject project data missing required top-level properties
    Given I have project data missing the "phases" property
    When project data validation is performed
    Then validation should fail with error "Invalid project data: missing required property 'phases'"
    When I have project data missing the "config" property
    Then validation should fail with error "Invalid project data: missing required property 'config'"

  Scenario: Validate project metadata requires ID and name
    Given I have project metadata with only a name but no ID
    When project validation is performed
    Then validation should fail with error "Invalid project data: project must have id and name"
    When I have project metadata with only an ID but no name
    Then validation should fail with error "Invalid project data: project must have id and name"

  Scenario: Validate individual features within features array
    Given I have a project with features array
    And one feature has a description but missing ID
    When project validation is performed
    Then validation should fail with error "Invalid feature at index 1: missing required property 'id'"
    And the error should indicate the specific feature index

  Scenario: Validate feature man days as positive numbers
    Given I have a feature with negative man days value
    When project validation is performed
    Then validation should fail with error "Invalid feature at index 0: manDays must be a positive number"
    When I have a feature with non-numeric man days value
    Then validation should fail with error "Invalid feature at index 0: manDays must be a positive number"

  Scenario: Save project using Electron API when available
    Given the Electron API is available and functional
    And I have valid project data with ID "test" and name "Test Project"
    When I save the project
    Then the Electron API saveProjectFile method should be called
    And the save operation should return success: true
    And the current project path should be updated to the saved file path
    And the result should include the generated file name

  Scenario: Fallback to localStorage when Electron API unavailable
    Given the Electron API is not available
    And I have valid project data with ID "test" and name "Test Project"
    When I save the project
    Then a warning should be logged about using localStorage fallback
    And the project data should be saved to localStorage with key "software-estimation-project-test"
    And the save operation should return success: true with method "localStorage"

  Scenario: Update lastModified timestamp automatically during save
    Given I have project data with original timestamp "2024-01-01T12:00:00Z"
    When I save the project
    Then the lastModified timestamp should be updated to current time
    And the updated timestamp should be included in the saved data

  Scenario: Load project from Electron file system
    Given a project file exists in the file system
    And the Electron API is available
    When I load the project by filename
    Then the Electron API loadProjectFile method should be called
    And the project data should be retrieved and validated
    And the current project path should be set to the loaded file path

  Scenario: Load project from localStorage fallback
    Given the Electron API is not available
    And project data exists in localStorage with key "software-estimation-project-test"
    When I load the project with ID "test"
    Then the project data should be retrieved from localStorage
    And the data should be parsed from JSON format
    And a warning should be logged about using localStorage fallback

  Scenario: Generate CSV export with proper field escaping
    Given I have project features with various special characters
    And a feature description contains "Test "quoted" feature, with comma"
    And a feature notes field contains "Line 1\nLine 2"
    When I export the project to CSV format
    Then quoted fields should be properly escaped as '"Test ""quoted"" feature, with comma"'
    And newlines should be preserved within quoted fields
    And all CSV formatting rules should be followed

  Scenario: List available projects from storage
    Given multiple projects exist in the storage system
    When I request a list of available projects
    Then all project files should be returned
    And each project entry should include metadata like name and last modified date
    And the list should be sorted appropriately

  Scenario: Delete project from storage
    Given a project exists in storage
    When I request to delete the project
    Then the project file should be removed from storage
    And the operation should return confirmation of deletion
    And subsequent attempts to load the project should fail

  Scenario: Manage application settings independently
    Given the application has configuration settings
    When I save application settings
    Then settings should be stored separately from project data
    And settings should persist across application sessions
    When I load application settings
    Then previously saved settings should be retrieved correctly

  Scenario: Handle storage errors gracefully
    Given a storage operation encounters an error
    When the error occurs during save or load
    Then the error should be logged appropriately
    And the user should receive meaningful error feedback
    And the application should remain stable

  # Error Scenarios - Documenting Known Issues

  Scenario: saveToSpecificFile creates browser download instead of actual file save
    Given I want to save a project to a specific file location
    When I call the saveToSpecificFile method
    Then a browser download should be initiated instead of saving to file system
    And this behavior differs from the expected file system save operation
    And this represents a limitation in the current implementation

  Scenario: Version management methods reference undefined versionsKey
    Given version management functionality is available
    When version-related methods are called
    Then methods exist for version operations
    But the versionsKey property is undefined
    And this could cause version operations to fail

  Scenario: CSV resolution methods assume config structure without validation
    Given CSV export processes supplier and category data
    When CSV fields are resolved from configuration
    Then the methods assume configuration objects have expected structure
    But no validation ensures the required properties exist
    And missing configuration properties could cause resolution failures

  Scenario: File operations lack comprehensive error handling
    Given various file system errors could occur during operations
    When file operations encounter permission issues or disk errors
    Then some error conditions may not be handled gracefully
    And users might not receive clear feedback about what went wrong
    And recovery options may not be presented

  Scenario: Data validation is thorough but not comprehensive
    Given project data validation covers main structure requirements
    When complex nested objects are validated
    Then some edge cases in deep object structures may not be caught
    And certain data type validations might be incomplete
    And this could allow some invalid data to pass validation