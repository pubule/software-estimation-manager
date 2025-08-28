Feature: Bug Fix - Feature display names
  Le categorie e featureType nella tabella feature mostrano ID invece dei nomi
  
  As a user, I expect the application to display readable names
  So that I can understand categories and feature types at a glance

  Background:
    Given the application is loaded
    And I have a project with configured categories and feature types

  Scenario: Feature table displays category names correctly
    Given I have categories configured as:
      | id       | name        |
      | cat-fe   | Frontend    |
      | cat-be   | Backend     |
    And I have features with these categories
    When I view the features table
    Then I should see "Frontend" instead of "cat-fe"
    And I should see "Backend" instead of "cat-be"

  Scenario: Feature table displays feature type names correctly
    Given I have a category "cat-fe" with feature types:
      | id    | name                |
      | ft-1  | Nuova Funzionalità  |
      | ft-2  | Bug Fix             |
    And I have features with these feature types
    When I view the features table
    Then I should see "Nuova Funzionalità" instead of "ft-1"
    And I should see "Bug Fix" instead of "ft-2"

  Scenario: Feature table handles missing category or type gracefully
    Given I have a feature with an invalid category ID
    When I view the features table
    Then the system should display the ID as fallback
    And no errors should occur
