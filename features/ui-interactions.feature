Feature: UI Interactions
  As a user of the Software Estimation Manager
  I want intuitive user interface interactions
  So that I can efficiently navigate and manage project data

  Background:
    Given the Software Estimation Manager application is loaded
    And the user interface is fully initialized

  # Modal Management

  Scenario: Open modal with proper initialization
    Given I need to add a new feature
    When I click the "Add Feature" button
    Then the feature modal should open
    And the modal should have proper CSS classes applied
    And the modal should be centered on the screen
    And the background overlay should be dimmed
    And focus should be set to the first input field

  Scenario: Close modal using multiple methods
    Given a modal is currently open
    When I click the close button (×)
    Then the modal should close immediately
    When I open the modal again and click outside the modal content area
    Then the modal should close
    When I open the modal again and press the Escape key
    Then the modal should close
    When I open the modal again and click the Cancel button
    Then the modal should close and discard changes

  Scenario: Modal prevents body scrolling when open
    Given a modal is open
    When I attempt to scroll the background page
    Then the background should not scroll
    And only the modal content should be scrollable if it overflows
    When the modal is closed
    Then normal page scrolling should be restored

  Scenario: Modal form validation provides real-time feedback
    Given I have a feature modal open
    When I enter invalid data in a form field
    Then validation errors should appear immediately
    And the error styling should be applied to invalid fields
    And the save button should be disabled until all errors are resolved
    When I correct the invalid data
    Then the error messages should disappear
    And the save button should become enabled

  # Navigation System

  Scenario: Navigate between main sections using tabs
    Given I am on the Projects section
    When I click the Configuration tab
    Then the Configuration section should become active
    And the Projects section should become inactive
    And the URL or state should reflect the current section
    And any unsaved changes should trigger confirmation dialog

  Scenario: Enhanced navigation maintains state across sessions
    Given I am working in the Project Phases section
    And I have made specific selections and view configurations
    When I close and reopen the application
    Then the application should return to the Project Phases section
    And my previous view configurations should be restored
    And the navigation state should be persistent

  Scenario: Navigation handles dirty state with confirmation
    Given I am in the Features section with unsaved changes
    When I attempt to navigate to another section
    Then I should see a confirmation dialog about unsaved changes
    And the dialog should ask if I want to save before continuing
    When I confirm to save
    Then changes should be saved and navigation should proceed
    When I cancel the navigation
    Then I should remain in the current section

  # Table Interactions

  Scenario: Render features table with expandable rows
    Given I have multiple features in my project
    When the features table is displayed
    Then each feature should be shown in a two-row structure
    And the first row should contain primary feature information
    And the second row should be initially collapsed
    And expand/collapse indicators should be visible

  Scenario: Toggle feature row expansion
    Given the features table is displayed with collapsed detail rows
    When I click the expand button for a feature
    Then the detail row for that feature should expand
    And additional feature information should become visible
    When I click the collapse button
    Then the detail row should collapse again

  Scenario: Sort features table by columns
    Given the features table contains multiple features
    When I click on a sortable column header
    Then the table should be sorted by that column in ascending order
    When I click the same column header again
    Then the table should be sorted in descending order
    And a visual indicator should show the current sort column and direction

  Scenario: Filter features using multiple criteria
    Given the features table has various features with different attributes
    When I select a category from the category filter dropdown
    Then only features matching that category should be displayed
    When I also enter text in the search field
    Then features should match both the category filter AND the search text
    And the filtering should use AND logic between all active filters

  # Form Interactions

  Scenario: Auto-complete and dropdown population
    Given I have the feature form open
    When the supplier dropdown is displayed
    Then it should contain all configured suppliers
    And project-specific suppliers should have visual indicators (e.g., different styling)
    And global suppliers should be displayed without special indicators
    When I start typing in an auto-complete field
    Then matching options should be filtered and displayed

  Scenario: Real-time calculation updates in forms
    Given I have a feature form with calculation fields
    When I modify the "Real Man Days" field
    Then the "Calculated Man Days" field should update immediately
    When I modify the "Expertise Level" field
    Then the calculated value should recalculate automatically
    And the calculation should be visible to the user as it happens

  Scenario: Form validation prevents invalid submissions
    Given I have a form with required fields
    When I attempt to submit without filling required fields
    Then validation errors should be displayed
    And the form submission should be prevented
    And focus should move to the first invalid field
    When I correct all validation errors
    Then the form should allow successful submission

  # Loading and Progress Indicators

  Scenario: Display loading overlay during operations
    Given I am performing a long-running operation like project loading
    When the operation starts
    Then a loading overlay should appear
    And a progress message should be displayed
    And user interaction should be prevented during loading
    When the operation completes
    Then the loading overlay should disappear
    And normal interaction should be restored

  Scenario: Show progress indicators for file operations
    Given I am saving a large project file
    When the save operation begins
    Then a progress indicator should show the operation status
    And the user should receive feedback about the operation progress
    When the operation completes successfully
    Then a success notification should be displayed

  # Status and Notification System

  Scenario: Project status indicator reflects current state
    Given I have a project open
    When the project has no unsaved changes
    Then the status indicator should display "○" with "saved" CSS class
    When I make changes to the project
    Then the status indicator should display "●" with "unsaved" CSS class
    And the visual change should be immediate

  Scenario: Display notifications for user feedback
    Given I perform an action that requires user feedback
    When the action completes successfully
    Then a success notification should appear
    And the notification should auto-dismiss after a few seconds
    When an error occurs
    Then an error notification should appear
    And it should remain visible until user dismisses it or takes action

  # Keyboard Shortcuts

  Scenario: Support keyboard shortcuts for common operations
    Given the application is active and has focus
    When I press Ctrl+S (or Cmd+S on Mac)
    Then the project should be saved
    When I press Ctrl+N (or Cmd+N on Mac)
    Then a new project should be created
    When I press Ctrl+O (or Cmd+O on Mac)
    Then the open project dialog should appear

  Scenario: Modal keyboard navigation
    Given a modal is open
    When I press Tab
    Then focus should move to the next interactive element within the modal
    When I press Shift+Tab
    Then focus should move to the previous interactive element
    When I reach the last element and press Tab
    Then focus should wrap to the first element

  # Responsive Design and Layout

  Scenario: Adapt layout for different screen sizes
    Given the application is displayed on a wide screen
    When the screen size is reduced to tablet size
    Then the layout should adapt appropriately
    And all functionality should remain accessible
    When the screen size is reduced to mobile size
    Then navigation should adapt to mobile-friendly patterns

  # Error Scenarios and Edge Cases

  Scenario: Handle UI elements that fail to load or initialize
    Given certain UI components fail to initialize properly
    When the application attempts to interact with these components
    Then appropriate error handling should occur
    And the user should receive feedback about the issue
    And other functional parts of the application should continue working

  Scenario: Handle rapid user interactions gracefully
    Given the user performs rapid clicking or keyboard input
    When multiple actions are triggered quickly
    Then the application should handle the interactions appropriately
    And duplicate actions should be prevented
    And the UI should remain responsive and stable

  Scenario: Maintain UI state consistency during errors
    Given an error occurs during a UI operation
    When the error is handled and resolved
    Then the UI should return to a consistent state
    And no lingering visual artifacts should remain
    And the user should be able to continue working normally