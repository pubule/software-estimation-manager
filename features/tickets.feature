Feature: Ticket Dashboard
  As a team lead
  I want to analyze support tickets
  So that I can track team performance

  Scenario: Parse CSV ticket data
    When I import tickets from fixture "tickets-sample.csv"
    Then ticket count should be 10

  Scenario: Calculate dashboard metrics
    When I import tickets from fixture "tickets-sample.csv"
    And I calculate ticket metrics
    Then total tickets metric should be 10
    And closed tickets metric should be 5
    And open tickets metric should be 5

  Scenario: Calculate operator metrics
    When I import tickets from fixture "tickets-sample.csv"
    And I calculate ticket metrics
    Then operator "alice@test.com" should have resolved tickets

  Scenario: Generate alerts for unassigned tickets
    When I import tickets from fixture "tickets-sample.csv"
    And I calculate ticket metrics
    And I generate alerts
    Then alerts should include unassigned ticket warnings
