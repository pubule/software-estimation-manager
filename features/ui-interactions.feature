Feature: UI Interactions
  As a user of the Software Estimation Manager
  I want intuitive user interface interactions including proper visual feedback
  So that I can efficiently navigate and manage project data with clear status indicators

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

  Scenario: Modal conflict resolution between managers
    Given I am in the teams configuration section
    And I have a team modal open
    When I navigate to categories configuration
    And attempt to open a category modal
    Then the category modal should open without conflicts
    And event listeners should be properly isolated between managers
    And modal interactions should work independently

  Scenario: Modal form submission behavior
    Given I have a team modal open with form data
    When I click the Save button
    Then the form should submit without page redirect
    And I should remain in the teams configuration section
    And a success notification should be displayed
    And the modal should close properly

  Scenario: Standardized modal button styling
    Given I have any modal open (team, category, or feature)
    When I examine the Cancel and Save buttons
    Then both buttons should have consistent VSCode-style appearance
    And the buttons should match the global theme styling
    And hover effects should be consistent across all modals

  # VSCode-Style Sidebar Navigation

  Scenario: Display VSCode-style icon sidebar
    Given the application is loaded with VSCode interface
    When I examine the left side of the screen
    Then I should see a narrow icon sidebar on the far left
    And the sidebar should contain exactly 3 icons in the icon-sections area
    And the icons should represent Projects (folder-open), Capacity Planning (users), and Configuration (cog)
    And each icon should have proper Font Awesome styling
    And no expandable panels should be open initially

  Scenario: Open sidebar panels by clicking icons
    Given the VSCode-style sidebar is displayed
    When I click the Projects icon (fas fa-folder-open)
    Then the Projects panel should slide open from the left side of the icon bar
    And the panel should contain hierarchical project navigation with expandable sections
    And the panel should display Save and Export buttons in the panel-footer
    And the Projects icon should receive the "active" CSS class
    When I click the Capacity Planning icon (fas fa-users)
    Then the Capacity Planning panel should open and Projects panel should close
    And the Capacity Planning submenu should be automatically expanded with "expanded" class
    And the panel should show Resource Capacity Overview and Capacity Planning Timeline options
    And the panel footer should be empty (no Save/Export buttons)
    When I click the Configuration icon (fas fa-cog)
    Then the Configuration panel should open and other panels should close
    And the panel should show direct Configuration access without sub-sections
    And the panel footer should be empty (no action buttons)

  Scenario: Sidebar panel toggle behavior
    Given I have the Projects panel open
    When I click the Projects icon again
    Then the Projects panel should close completely
    And no panel should be active
    And the Projects icon should lose its "active" CSS class
    When I click the same icon a third time
    Then the Projects panel should open again
    And this demonstrates proper toggle functionality

  Scenario: Auto-expanded Capacity Planning submenu behavior
    Given I open the Capacity Planning sidebar panel
    When the panel appears
    Then the capacity-toggle button should have "expanded" CSS class
    And the capacity-children element should have "expanded" CSS class
    And the nav-children should be visible without user interaction
    And I should see "Resource Capacity Overview" and "Capacity Planning Timeline" options
    And there should be no manual collapse functionality for this submenu

  Scenario: Projects panel hierarchical navigation
    Given I have the Projects panel open
    When I examine the panel navigation structure
    Then I should see a main "Projects" section with expand/collapse capability
    And the projects-toggle button should control expansion of project sub-sections
    And when expanded, I should see Features Management, Project Phases, Calculations, and Version History
    And the nav-child items should initially be disabled until a project is loaded
    And each nav-child should have proper icons (list-ul, project-diagram, chart-bar, history)

  Scenario: Panel activation and icon state management
    Given no sidebar panel is currently open
    When I click any sidebar icon
    Then all other icons should lose their "active" class
    And only the clicked icon should receive the "active" class
    And the currentActivePanel property should be updated to match the opened panel
    And the system should track which panel is currently active

  Scenario: Navigation initialization and default state
    Given the application starts up
    When the navigation system initializes
    Then there should be a 500ms delay before opening the default Projects panel
    And the Projects icon should be activated by default
    And the Projects panel should open automatically
    And this behavior should be consistent across application restarts

  # Table Interactions with Improved Scrolling

  Scenario: Render features table with improved scrollable behavior
    Given I have multiple features in my project
    When the features table is displayed
    Then the table-container should provide appropriate scrolling
    And the expandable-table should have proper row expansion capabilities
    And scrollbars should only appear when content exceeds the container space
    And the table should maintain fixed header behavior during scrolling

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

  Scenario: Empty state displays correctly across full table width
    Given I have a project with no features
    When the features table is displayed
    Then the empty state should be rendered as a table row
    And the empty state cell should have colspan="7" to span all columns
    And the empty state should expand across the full table width
    And the empty state should not appear "compressed" in the first column
    And the table should have table-layout: auto to allow proper colspan expansion
    And the empty state should be visually centered within the table
    And the empty state should display the message "No features found. Click 'Add Feature' to get started."
    And the empty state icon should be properly displayed and centered

  # Form Interactions

  Scenario: Auto-complete and dropdown population
    Given I have the feature form open
    When the supplier dropdown is displayed
    Then it should contain all configured suppliers
    And project-specific suppliers should have visual indicators
    And global suppliers should be displayed without special indicators

  Scenario: Real-time calculation updates in forms
    Given I have a feature form with calculation fields
    When I modify the "Real Man Days" field
    Then the "Calculated Man Days" field should update immediately
    And the calculation should be visible as it happens

  # Loading and Progress Indicators

  Scenario: Display loading overlay during operations
    Given I am performing a long-running operation
    When the operation starts
    Then a loading overlay should appear
    And user interaction should be prevented during loading
    When the operation completes
    Then the loading overlay should disappear

  # Status and Notification System

  Scenario: Title bar project status indicator reflects current state with proper alignment
    Given I have a project open
    When the project has no unsaved changes
    Then the title bar status indicator should display "○" with "saved" CSS class
    And the status indicator should be properly aligned next to the project name
    And the status indicator should use success color (green)
    When I make changes to the project
    Then the title bar status indicator should display "●" with "unsaved" CSS class  
    And the status indicator should use warning color (orange/yellow)
    And the status indicator should remain horizontally aligned with project name text

  # Keyboard Shortcuts

  Scenario: Support keyboard shortcuts for common operations
    Given the application is active and has focus
    When I press Ctrl+S (or Cmd+S on Mac)
    Then the project should be saved
    When I press Escape in a modal
    Then the modal should close

  # Error Scenarios and Edge Cases

  Scenario: Handle UI elements that fail to load or initialize
    Given certain UI components fail to initialize properly
    When the application attempts to interact with these components
    Then appropriate error handling should occur
    And console warnings should be logged for missing elements
    And other functional parts should continue working
    And the system should gracefully degrade functionality

  Scenario: Handle rapid user interactions gracefully
    Given the user performs rapid clicking on sidebar icons
    When multiple panel switches are triggered quickly
    Then the toggleSidebarPanel method should handle rapid state changes
    And the currentActivePanel should be updated correctly
    And icon active states should remain synchronized
    And the UI should remain stable and responsive
    And no race conditions should occur between panel operations

  Scenario: Handle missing VSCode sidebar elements gracefully
    Given the VSCode sidebar initialization occurs
    When expected elements like projects-panel or icon items are missing
    Then console errors should be logged about missing elements
    And the system should not crash due to missing DOM elements
    And alternative navigation methods should remain functional
    And error messages should guide developers to investigate DOM structure

  # Budget and Assignment Modal Interactions

  Scenario: Assignment modal displays budget information with real-time updates
    Given I have projects with vendor cost configuration
    And I have team members with vendor assignments
    When I open the assignment modal from capacity planning
    Then the budget information section should be visible
    And "Total Final MDs" should show calculated budget value
    And budget context should identify the vendor and role
    When I change the team member selection
    Then the budget information should update in real-time
    And the Total Final MDs should recalculate for the new team member

  Scenario: Assignment modal handles missing vendor costs gracefully
    Given I have a team member without matching vendor costs in the project
    When I open the assignment modal for this team member
    Then the Total Final MDs should display "0.0 MDs"
    And the budget context should still show the vendor and role information
    And the modal should remain functional for other assignment operations
    And no errors should be displayed to the user

  # Default Status Behavior

  Scenario: New project assignments default to pending status
    Given I am creating a new project assignment
    When the assignment modal is initialized
    Then the project status dropdown should default to "pending"
    And "approved" should be available as an alternative option
    And this should reflect the new default behavior for project assignments
    And capacity calculations should handle pending status appropriately

  # CSS Layout and Visual Consistency

  Scenario: Title bar maintains visual consistency with application theme  
    Given the application is using VSCode dark theme
    When I examine the title bar visual elements
    Then the title bar should use consistent VSCode theme colors
    And typography should match the overall interface style
    And the project status indicator should integrate seamlessly with the design
    And spacing and alignment should follow VSCode design patterns