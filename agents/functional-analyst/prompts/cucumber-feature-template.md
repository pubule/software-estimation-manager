# Cucumber Feature Template

## Gherkin Feature Structure

### File Naming Convention
`features/{feature-name}.feature`

### Basic Template Structure

```gherkin
Feature: {Feature Name}
  As a {user type}
  I want to {capability}
  So that {business value}

  Background:
    Given the Software Estimation Manager application is running
    And {common setup conditions}
    And {prerequisite data exists}

  Scenario: {Main happy path scenario}
    Given {initial conditions}
    And {additional setup}
    When {user action}
    And {additional actions if needed}
    Then {expected outcome}
    And {additional verifications}
    And {side effects verification}

  Scenario: {Alternative workflow scenario}
    Given {different initial conditions}
    When {alternative user action}
    Then {alternative expected outcome}

  Scenario: {Error handling scenario}
    Given {conditions leading to error}
    When {action that triggers error}
    Then {error handling behavior}
    And {user should see appropriate error message}
    And {system should remain stable}

  Scenario Outline: {Data-driven scenario}
    Given {parameterized initial conditions}
    When {action with parameter} "<parameter>"
    Then {parameterized expected outcome} "<expected_result>"

    Examples:
      | parameter | expected_result |
      | value1    | result1        |
      | value2    | result2        |

  # Edge Cases and Special Scenarios

  Scenario: {Edge case scenario}
    Given {unusual conditions}
    When {edge case action}
    Then {edge case handling}

  Scenario: {Integration scenario}
    Given {integration setup}
    When {cross-component action}
    Then {integration verification}
```

## Gherkin Writing Guidelines

### Feature Description
- **As a [user]**: Specify the user role/type
- **I want**: Describe the capability or feature
- **So that**: Explain the business value or benefit

### Background Section
- Include common setup that applies to all scenarios
- Keep it minimal and focused on essential prerequisites
- Use existing application patterns (app running, data loaded, etc.)

### Scenario Structure
- **Given**: Set up initial conditions and context
- **When**: Describe the action or event that triggers behavior
- **Then**: Specify the expected outcomes and verifications

### Language Guidelines
- Use business-friendly language, avoid technical jargon
- Be specific about expected behaviors
- Include user-visible outcomes and error messages
- Focus on business value and user experience

## Feature-Specific Templates

### For Project Management Features
```gherkin
Feature: {Project Management Capability}
  As a project manager
  I want to {manage projects efficiently}
  So that {deliver accurate estimates and track progress}

  Background:
    Given the Software Estimation Manager application is running
    And the project management system is initialized
    And I have appropriate permissions to manage projects

  Scenario: Create new project with basic information
    Given I am on the main dashboard
    When I click "New Project"
    And I enter project name "Sample Project"
    And I enter project description "Test project for estimation"
    And I click "Create"
    Then the project should be created successfully
    And I should see "Sample Project" in the project list
    And the project status should be "pending"

  Scenario: Project data persistence and loading
    Given I have created a project "Test Project"
    And I have made changes to the project
    When I save the project
    And I reload the application
    Then the project "Test Project" should be available
    And all project data should be preserved
```

### For Feature Management
```gherkin
Feature: {Feature Management Capability}
  As a project manager
  I want to {manage project features}
  So that {accurately estimate development effort}

  Background:
    Given the Software Estimation Manager application is running
    And I have a project loaded
    And the feature management system is available

  Scenario: Add new feature to project
    Given I am viewing the features section
    When I click "Add Feature"
    And I enter feature name "User Authentication"
    And I select complexity "Medium"
    And I assign supplier "Internal Development"
    And I click "Save"
    Then the feature should be added to the project
    And the project calculations should update automatically
```

### For Configuration Management
```gherkin
Feature: {Configuration Management Capability}
  As a system administrator
  I want to {manage configuration hierarchies}
  So that {projects inherit appropriate defaults while allowing customization}

  Background:
    Given the Software Estimation Manager application is running
    And the configuration system is initialized
    And configuration inheritance is working correctly

  Scenario: Global configuration provides defaults
    Given no project-specific configuration exists
    When I access configuration settings
    Then I should see global default values
    And these values should be inherited by new projects
```

### For Data Operations
```gherkin
Feature: {Data Operation Capability}
  As a user
  I want to {perform data operations}
  So that {manage and analyze project information effectively}

  Background:
    Given the Software Estimation Manager application is running
    And data persistence is working correctly
    And I have appropriate data access permissions

  Scenario: Export project data to Excel
    Given I have a project with features and calculations
    When I select "Export to Excel"
    And I choose the export location
    Then an Excel file should be generated
    And the file should contain project data in structured format
    And all calculations should be preserved accurately
```

### For Error Handling
```gherkin
Feature: {Error Handling Capability}
  As a user
  I want {graceful error handling}
  So that {I can recover from errors and continue working}

  Scenario: Handle missing required data gracefully
    Given I am creating a new feature
    When I submit the form without required fields
    Then I should see clear validation error messages
    And the form should highlight the missing fields
    And my other data should be preserved

  Scenario: Handle system errors without data loss
    Given I have unsaved changes in my project
    When a system error occurs
    Then the system should attempt to recover gracefully
    And my unsaved changes should be preserved if possible
    And I should receive clear information about the error
```

## Quality Guidelines

### Scenario Quality
- **Realistic**: Scenarios should represent real user workflows
- **Specific**: Include specific data and expected outcomes
- **Independent**: Each scenario should be able to run independently
- **Maintainable**: Easy to update as requirements change

### Language Quality
- **Business-focused**: Use terms business stakeholders understand
- **Clear**: Unambiguous descriptions of behavior
- **Consistent**: Use consistent terminology across scenarios
- **Complete**: Cover all important aspects of the feature

### Coverage Guidelines
- **Happy Path**: Main successful workflow
- **Alternative Paths**: Different ways to achieve the same goal
- **Error Scenarios**: What happens when things go wrong
- **Edge Cases**: Unusual but valid scenarios
- **Integration**: How feature works with other components

## Integration with Existing System

### Common Background Elements
```gherkin
Background:
  Given the Software Estimation Manager application is running
  And the VSCode-style interface is loaded
  And the hierarchical configuration system is initialized
  And I have appropriate user permissions
```

### Common Step Patterns
- Navigation: "I navigate to the {section} section"
- Data Entry: "I enter {field} '{value}'"
- Actions: "I click '{button}'" or "I select '{option}'"
- Verification: "I should see '{text}'" or "the {element} should {condition}"
- State Changes: "the system should {behavior}"

### Application-Specific Contexts
- Project loading: "I have a project loaded with {data}"
- Configuration states: "the configuration is set to {state}"
- Feature states: "I have features configured with {properties}"
- Calculation states: "the calculations are {status}"

## Validation Checklist

Before finalizing Cucumber features:

- [ ] Feature description clearly explains business value
- [ ] Background sets up common prerequisites
- [ ] All main workflows are covered in scenarios
- [ ] Error handling scenarios are included
- [ ] Edge cases are addressed
- [ ] Language is business-friendly and clear
- [ ] Scenarios are independent and can run in any order
- [ ] Integration points with existing system are tested
- [ ] Data examples are realistic and comprehensive
- [ ] Step definitions will be implementable by technical analyst