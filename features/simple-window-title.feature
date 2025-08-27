Feature: Simple window title test
  As a user, I want to see the project code and name in the window title
  So that I can easily identify which project I'm working on

  Background:
    Given the application is loaded

  Scenario: Window title logic works correctly
    When I simulate creating a project with code "PJ-07" and name "Progetto A"
    Then the window title logic should generate "PJ-07 - Progetto A"

  Scenario: Window title fallback for missing code
    When I simulate creating a project with name "Test Project" but no code
    Then the window title logic should generate "Test Project"

  Scenario: Window title fallback for missing name
    When I simulate creating a project with code "PJ-10" but no name
    Then the window title logic should generate "Untitled Project"