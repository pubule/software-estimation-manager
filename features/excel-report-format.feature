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

  Scenario: Conditional fill lands on the column it is declared for
    Given a table whose fourth column is "Days Open" with a red fill above 30 days
    And the table also has a "Created" date column in third position
    When I render one row with 45 days open
    Then the "Days Open" cell has background "FFFF0000"
    And the "Created" cell does not have background "FFFF0000"

  Scenario: Dates and numbers are written as native Excel types
    Given a table whose fourth column is "Days Open" with a red fill above 30 days
    And the table also has a "Created" date column in third position
    When I render one row with 45 days open
    Then the "Created" cell value is a Date
    And the "Created" cell number format is "dd-mm-yyyy"
    And the "Days Open" cell value is the number 45
    And the "Days Open" cell number format is "0"

  Scenario: Blank text falls back to the declared placeholder
    Given a table with an "Assigned To" text column whose placeholder is "Non assegnato"
    When I render one row whose assignee is "   "
    Then the "Assigned To" cell value is "Non assegnato"

  Scenario: An empty table gets headers but no AutoFilter
    Given a table whose fourth column is "Days Open" with a red fill above 30 days
    And the table also has a "Created" date column in third position
    When I render zero rows
    Then the worksheet has no AutoFilter
    And the header row is frozen

  Scenario Outline: Full Backlog thresholds colour the Days Open column only
    Given the Full Backlog column list
    When I render a backlog row with <days> days open
    Then the "Days Open" cell has background "<colour>"
    And the "Created" cell value is a Date
    And the "Created" cell number format is "dd-mm-yyyy"

    Examples:
      | days | colour   |
      | 5    | FFFFFFFF |
      | 14   | FFFFFFFF |
      | 15   | FFFFFF00 |
      | 30   | FFFFFF00 |
      | 30.4 | FFFFFF00 |
      | 31   | FFFF0000 |

  Scenario: The summary block is readable and never corrupts the file
    Given the Full Backlog column list
    When I render a summary with "Total Orphaned" at 47 and "Max Unworked (days)" unparsable
    Then the "Total Orphaned" summary value is bold and red
    And the "Max Unworked (days)" summary value is an empty cell
    And the summary is separated from the title by a blank row

  Scenario: Full Backlog declares one width per column
    Given the Full Backlog column list
    Then every column has a header and a width

  Scenario: An unassigned backlog ticket reads as unassigned
    Given the Full Backlog column list
    When I render a backlog row with 5 days open
    Then the "Assigned To" cell value is "Non assegnato"

  Scenario Outline: SLA thresholds fall back for unknown priorities
    When I look up the SLA hours for priority "<priority>"
    Then the SLA hours are <hours>

    Examples:
      | priority | hours |
      | P5       | 4     |
      | P6       | 8     |
      | P7       | 24    |
      | P8       | 72    |
      | P1       | 72    |
      |          | 72    |

  Scenario Outline: An absent priority falls back to the widest SLA window
    When I look up the SLA hours for the literal priority <literal>
    Then the SLA hours are 72

    Examples:
      | literal   |
      | null      |
      | undefined |

  Scenario: A priority outside P5-P8 renders without a priority colour
    Given the Full Backlog column list
    When I render a backlog row with priority "P1"
    Then the "Priority" cell has background "FFFFFFFF"

  Scenario: The export handler wires every sheet to the shared renderer
    Given the export-ticket-report handler in src/main.js
    Then every worksheet it adds is written through renderTable
    And the Full Backlog sheet renders the exported column list

  Scenario Outline: A missing summary aggregate leaves an empty cell instead of failing the export
    When I round <input> as a summary number with <decimals> decimals
    Then the summary number is null

    Examples:
      | input     | decimals |
      | null      | 0        |
      | undefined | 1        |

  Scenario Outline: Summary aggregates are rounded for display
    When I round the number <input> as a summary number with <decimals> decimals
    Then the summary number is <result>

    Examples:
      | input   | decimals | result |
      | 12.66   | 1        | 12.7   |
      | 12.66   | 0        | 13     |
      | 6.04    | 1        | 6      |

  Scenario: The export handler never calls toFixed on a raw summary field
    Given the export-ticket-report handler in src/main.js
    Then no summary aggregate has toFixed called directly on it

  Scenario: A long summary label does not widen the first data column
    Given the Full Backlog column list
    When I render a summary labelled "Max Stagnation (days)"
    Then the first column keeps its declared width
    And the summary label spans the first two columns
    And the summary value sits in the third column
