Feature: Title Bar and Status Indicators
  As a user of the Software Estimation Manager
  I want to see clear visual indicators of project status and application state
  So that I can understand the current state of my work at a glance

  Background:
    Given the Software Estimation Manager Electron application is running
    And the custom title bar is displayed
    And project management functionality is available

  Scenario: Custom title bar structure and layout
    Given the application window is open
    When I examine the title bar
    Then I should see a custom title bar with three sections
    And the left section should contain app icon and "Software Estimation Manager" title
    And the center section should contain project information
    And the right section should contain window control buttons (minimize, maximize, close)
    And the title bar should use VSCode dark theme styling

  Scenario: Project status indicator positioning and visibility
    Given I have a project loaded in the application
    When I look at the title bar center section
    Then I should see the project name clearly displayed
    And the project status indicator (●) should be visible next to the project name
    And the status indicator should be properly aligned horizontally with the project name
    And the status indicator should not appear below or misaligned with the project name text

  Scenario: Project status indicator styling for unsaved state
    Given I have a project with unsaved changes
    When the project status is updated
    Then the status indicator should display a filled circle "●"
    And the status indicator should have class "unsaved"
    And the status indicator should be colored with warning color (orange/yellow)
    And the status indicator should be sized appropriately (12px font-size)
    And the indicator should use flexbox centering for proper alignment

  Scenario: Project status indicator styling for saved state
    Given I have a project that is saved
    When the project status is updated
    Then the status indicator should display an empty circle "○"
    And the status indicator should have class "saved"
    And the status indicator should be colored with success color (green)
    And the visual distinction between saved/unsaved should be clear

  Scenario: Title bar project info container layout
    Given project information is displayed in the title bar
    When I examine the title-project-info container
    Then it should use flexbox with align-items: center
    And it should have appropriate gap spacing (6px)
    And it should have a defined height (20px) for consistent alignment
    And it should prevent the status indicator from wrapping or misaligning

  Scenario: Project name display and truncation
    Given I have a project with a very long name
    When the project name is displayed in the title bar
    Then the project name should be truncated with ellipsis if too long
    And the maximum width should prevent title bar overflow
    And the text should use appropriate font sizing for readability
    And the project name should maintain proper font weight and color

  Scenario: Window control buttons functionality
    Given the title bar window controls are displayed
    When I interact with window control buttons
    Then the minimize button should minimize the Electron window
    And the maximize button should toggle window maximize/restore
    And the close button should close the application
    And buttons should have appropriate hover states and styling
    And buttons should be properly sized for the title bar height

  Scenario: Title bar responsiveness and window states
    Given the application window can be resized
    When the window size changes
    Then the title bar should maintain proper proportions
    And project information should remain centered
    And window controls should remain properly positioned
    And the layout should adapt gracefully to different window sizes

  Scenario: Project state changes reflected in title bar
    Given I have a project loaded
    When I make changes to project data (features, phases, configuration)
    Then the title bar status indicator should immediately change to unsaved state
    And the indicator should visually update without requiring refresh
    When I save the project
    Then the status indicator should change to saved state
    And the visual change should be immediate and clear

  Scenario: Title bar integration with VSCode-style interface
    Given the title bar is part of the VSCode-style interface
    When the overall interface theme is applied
    Then the title bar should use consistent VSCode dark theme colors
    And typography should match the overall interface style
    And spacing and alignment should be consistent with VSCode design patterns
    And the title bar should feel integrated with the sidebar and content areas

  Scenario: Application title and branding display
    Given the application is running
    When I examine the left section of the title bar
    Then I should see the calculator icon representing the application
    And the text "Software Estimation Manager" should be displayed
    And the branding should use appropriate text color and sizing
    And the app info should be visually balanced with project information

  # CSS Class Specifications and Styling Details

  Scenario: Title bar CSS class structure
    Given the title bar styling is applied
    When I examine the CSS classes
    Then .title-project-info should use display: flex with proper alignment
    And .title-project-info #project-status should have font-size: 12px
    And #project-status should use display: flex with centering
    And flex-shrink: 0 should prevent status indicator compression
    And the styling should be consistent across main.css and vscode-dark.css theme files

  Scenario: Prevent CSS conflicts with other project-info usage
    Given project-info class is used in multiple contexts
    When title bar specific styling is applied
    Then .title-project-info should be isolated from general .project-info styling
    And title bar styling should not affect project cards or other UI elements
    And the scoped CSS should prevent visual regressions in other parts of the application
    And both main.css and theme files should have consistent title bar rules

  # Accessibility and User Experience

  Scenario: Title bar accessibility and keyboard navigation
    Given the title bar is displayed
    When users navigate with keyboard or screen readers
    Then window control buttons should be properly focusable
    And appropriate ARIA labels should be available where needed
    And the title bar should not interfere with keyboard navigation of the main interface
    And visual indicators should have sufficient contrast for accessibility

  Scenario: Title bar visual feedback for user actions
    Given I am working with projects
    When project state changes occur
    Then the title bar should provide immediate visual feedback
    And status changes should be obvious without being distracting
    And the visual language should be consistent with user expectations
    And the title bar should enhance rather than clutter the user experience