Feature: Excel report formatting helpers
  The incident export writes native Excel types so the file stays sortable
  and filterable, and never writes the text "Invalid Date" into a cell.

  Scenario: An ISO timestamp becomes a real Date
    When I coerce "2026-09-23T14:30:00Z" to an Excel date
    Then the coerced date is a Date whose ISO day is "2026-09-23"

  Scenario Outline: Blank or unparsable dates become empty cells
    When I coerce "<input>" to an Excel date
    Then the coerced date is null

    Examples:
      | input      |
      |            |
      | not-a-date |

  Scenario: A whitespace-only date becomes an empty cell
    When I coerce "   " to an Excel date
    Then the coerced date is null

  Scenario Outline: Absent dates become empty cells
    When I coerce the literal <literal> to an Excel date
    Then the coerced date is null

    Examples:
      | literal   |
      | null      |
      | undefined |

  Scenario Outline: Numeric coercion rejects non-finite input
    When I coerce "<input>" to a finite number
    Then the coerced number is <result>

    Examples:
      | input | result |
      | 12.7  | 12.7   |
      |       | null   |
      | abc   | null   |

  Scenario Outline: Absent values are not zero
    When I coerce the literal <literal> to a finite number
    Then the coerced number is null

    Examples:
      | literal   |
      | null      |
      | undefined |

  Scenario: The date format renders day before month
    Then the date number format is "dd-mm-yyyy"
