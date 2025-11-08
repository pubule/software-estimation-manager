Feature: Capacity Timeline Chevron Collapse on Assignment Update

  As a capacity manager
  I want all timeline chevrons to collapse automatically after creating/updating assignments
  So that the UI refreshes correctly with the new allocation data

  Background:
    Given the application is loaded
    And I have a project with team members

  Scenario: All chevrons collapse when creating new assignment via modal
    Given I am on the Capacity Timeline page
    And I expand a member row chevron
    And I expand a project row chevron
    When I click the "Add Assignment" button
    And I fill in valid assignment details
    And I click "Create Assignment" button
    Then all member row chevrons should be collapsed
    And all project row chevrons should be collapsed
    And localStorage should not contain keys matching "timeline-expanded-"
    And localStorage should not contain keys matching "timeline-projects-expanded-"

  Scenario: All chevrons collapse when updating existing assignment via modal
    Given I am on the Capacity Timeline page
    And I expand a member row chevron
    And I expand a project row chevron
    When I click edit button on an existing allocation
    And I modify the assignment details
    And I click "Update Assignment" button
    Then all member row chevrons should be collapsed
    And all project row chevrons should be collapsed
    And localStorage should not contain keys matching "timeline-expanded-"
    And localStorage should not contain keys matching "timeline-projects-expanded-"

  Scenario: Chevrons do NOT collapse on inline phase MD edit
    Given I am on the Capacity Timeline page
    And I expand a member row chevron
    And I expand a project row chevron to show phases
    When I edit a phase MD value inline in the table
    And I press Enter to save the inline edit
    Then the member row chevron should remain expanded
    And the project row chevron should remain expanded
    And localStorage should still contain the expansion state keys

  Scenario: Chevrons do NOT collapse when modal is cancelled
    Given I am on the Capacity Timeline page
    And I expand a member row chevron
    And I expand a project row chevron
    When I click the "Add Assignment" button
    And I fill in assignment details
    And I click "Cancel" button on the modal
    Then the member row chevron should remain expanded
    And the project row chevron should remain expanded
    And localStorage should still contain the expansion state keys
