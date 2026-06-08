Feature: Configuration Management
  As an administrator
  I want to manage vendors and rates
  So that cost calculations use correct data

  Scenario: Load configuration from fixture
    Given the configuration is loaded
    Then there should be 2 vendors configured
    And vendor "vendor-internal" should be internal
    And vendor "vendor-external" should not be internal

  Scenario: Vendor has job clusters
    Given the configuration is loaded
    Then vendor "vendor-internal" should have 2 job clusters
    And vendor "vendor-external" should have 2 job clusters

  Scenario: Rate lookup returns correct rate
    Given the configuration is loaded
    Then rate for vendor "vendor-internal" job cluster "jc-dev" seniority "Senior" should be 450

  Scenario: Rate lookup returns null for unknown vendor
    Given the configuration is loaded
    Then rate for vendor "unknown-vendor" should be null

  Scenario: Team members load from config
    Given the configuration is loaded
    Then there should be 3 team members
    And team member "member-1" should have country "IT"
    And team member "member-3" should have country "RO"
