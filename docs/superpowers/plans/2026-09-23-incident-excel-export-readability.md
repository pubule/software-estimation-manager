# Incident Excel Export Readability & Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the incident Excel export readable and correct — dates as real Excel dates shown `dd-mm-yyyy`, day/hour counts as real numbers, and every conditional highlight landing on the column it is named for.

**Architecture:** Today each of the 7 sheets in the `export-ticket-report` IPC handler declares its columns three times: once in the header array, once as hard-coded indices in the styling loop (`if (i === 4)`), and once in the `worksheet.columns` width array. When "Assignment Group" was inserted at position 3, only the header array was updated — so every conditional fill in the Full Backlog sheet now colors the wrong column. This plan replaces the three parallel lists with one array of column descriptors per sheet, and a single `renderTable()` that derives header, values, widths, number formats, alignment, AutoFilter and freeze from that array. A shifted index becomes structurally impossible because there is no second list to keep in sync.

**Tech Stack:** Node.js CommonJS (Electron main process), ExcelJS 4.4.0, Cucumber.js with `tsx/cjs` for TypeScript step definitions.

**Spec:** `HANDOFF.md` (project root), section "Design approvato" — the bounded design approved by the user in the Phase 1 brainstorming dialogue. The defect inventory it argues from is in the same file under "Difetti confermati".

## Global Constraints

- **Tests are Cucumber only.** `CLAUDE.md` states "MAI creare test Jest - Solo Cucumber". Never add a Jest/Vitest/Mocha test file.
- **Test command is `npm test`** (runs `cucumber-js` with the `default` profile). Do NOT use `npm run test:tickets` or any other `test:*` script — those reference Cucumber profiles that do not exist in `cucumber.js`, and they fail.
- **`src/main.js` is the Electron main process entry** (`package.json` `"main": "src/main.js"`). It is NOT processed by Vite. Do not run `npm run build:react` for changes confined to it, and never edit `src/renderer/assets/main.js` — that path is Vite build output.
- **New shared module is CommonJS.** `src/excel-report-format.js` is `require`d by `src/main.js`. It must not import Electron, `fs`, or `path` — staying dependency-free is what lets Cucumber require it directly.
- **Exports must be a static object literal** (`module.exports = { ... }`) so `cjs-module-lexer` can expose named imports to the `tsx`-compiled step definitions.
- **Date display format is exactly `dd-mm-yyyy`** (renders `23-09-2026`). Cell values are `Date` objects, never pre-formatted strings.
- **Day counts are integers** (`numFmt '0'`). **Hour and minute counts keep one decimal** (`numFmt '0.0'`). Percentages keep two (`numFmt '0.00'`).
- **Existing colors are preserved verbatim.** Reuse the ARGB values already in `src/main.js`; this change is about correctness and layout, not a repaint.

## Review Focus

Input classes the design implies but which no task's happy-path test would otherwise exercise. Each line has its test assigned to the task that owns the code.

1. **Missing or unparsable date** — `resolved_at` is `''` or `undefined` (the `TicketData` type declares `resolved_at: string` but ServiceNow exports leave it blank for open tickets). Today `new Date('')` writes the literal text `Invalid Date` into the cell. Expected: an empty cell. → Task 1.
2. **A sheet with zero rows** — an alert with no tickets. Setting an AutoFilter whose range is `header:header` produces a file Excel repairs on open. Expected: header and widths still written, no AutoFilter, no crash. → Task 2.
3. **Threshold boundary values** — `daysOpen` of exactly 14 and exactly 30. The rule is strictly greater-than, so 30 must stay yellow and 31 turn red. An off-by-one here silently mislabels a day's worth of tickets. → Task 3.
4. **Whitespace-only `assigned_to`** — `'   '` is truthy, so a plain falsy check leaves a cell that looks empty but is not. Expected: the `Non assegnato` placeholder, same as `''`. → Task 2.
5. **`priority` outside P5-P8** — dirty source data. The SLA lookup must fall back to 72 hours and the priority fill must return no color rather than throwing on an undefined map entry. → Task 4.

---

### Task 1: Date and number coercion helpers

**Files:**
- Create: `src/excel-report-format.js`
- Create: `features/excel-report-format.feature`
- Create: `cucumber/step-definitions/excel-report-format.steps.ts`

**Interfaces:**
- Consumes: nothing — this is the base of the module.
- Produces:
  - `toExcelDate(value: unknown): Date | null` — `null` for empty/unparsable input.
  - `toFiniteNumber(value: unknown): number | null` — `null` for non-finite input.
  - `COLORS: Record<string, string>` — ARGB strings, `FF`-prefixed.
  - `DATE_FORMAT: string` — the literal `'dd-mm-yyyy'`.
  - `NUM_FMT: { int: '0', decimal: '0.0', percent: '0.00' }`.
  - `FONT_NAME: string` — the literal `'Calibri'`.

- [ ] **Step 1: Write the failing test**

Create `features/excel-report-format.feature`:

```gherkin
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
```

Two step phrasings are used on purpose. `{string}` matches anything inside quotes, including the empty and whitespace-only cases, and is the only way to express them — Cucumber trims Examples table cells, so a padded table row cannot carry leading spaces. `null` and `undefined` cannot be written as quoted strings at all, so they get the separate "the literal" phrasing. Do NOT collapse these into one `{word}` step: `{word}` is `\S+`, so it would also match `"12.7"` with its quotes attached and make every quoted step ambiguous.

Create `cucumber/step-definitions/excel-report-format.steps.ts`:

```typescript
import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import {
  toExcelDate,
  toFiniteNumber,
  DATE_FORMAT,
} from '../../src/excel-report-format.js';

let coercedDate: Date | null;
let coercedNumber: number | null;

/** Resolves the bare words "null" and "undefined" from an Examples table. */
function absentLiteral(word: string): null | undefined {
  return word === 'null' ? null : undefined;
}

When('I coerce {string} to an Excel date', function (raw: string) {
  coercedDate = toExcelDate(raw);
});

When('I coerce the literal {word} to an Excel date', function (word: string) {
  coercedDate = toExcelDate(absentLiteral(word));
});

Then('the coerced date is a Date whose ISO day is {string}', function (expected: string) {
  assert.ok(coercedDate instanceof Date, 'expected a Date instance');
  assert.strictEqual((coercedDate as Date).toISOString().slice(0, 10), expected);
});

Then('the coerced date is null', function () {
  assert.strictEqual(coercedDate, null);
});

When('I coerce {string} to a finite number', function (raw: string) {
  coercedNumber = toFiniteNumber(raw);
});

When('I coerce the literal {word} to a finite number', function (word: string) {
  coercedNumber = toFiniteNumber(absentLiteral(word));
});

Then('the coerced number is null', function () {
  assert.strictEqual(coercedNumber, null);
});

Then('the coerced number is {float}', function (expected: number) {
  assert.strictEqual(coercedNumber, expected);
});

Then('the date number format is {string}', function (expected: string) {
  assert.strictEqual(DATE_FORMAT, expected);
});
```

`the coerced number is null` must be registered before the `{float}` variant is reached by a `null` row — they cannot collide, because `{float}` does not match the word `null`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL. The first error is a module resolution failure — `Cannot find module '../../src/excel-report-format.js'` — because the module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/excel-report-format.js`:

```javascript
'use strict';

/**
 * Formatting primitives for the incident Excel report.
 *
 * Deliberately free of Electron, fs and path imports: main.js requires it, and
 * the Cucumber suite requires the same file directly to test it without booting
 * an Electron process.
 */

const FONT_NAME = 'Calibri';

/** Excel shows dd-mm-yyyy; the cell still holds a real date underneath. */
const DATE_FORMAT = 'dd-mm-yyyy';

const NUM_FMT = {
  int: '0',
  decimal: '0.0',
  percent: '0.00',
};

const COLORS = {
  black: 'FF000000',
  white: 'FFFFFFFF',
  stripe: 'FFF5F5F5',
  gridline: 'FFD3D3D3',
  headerGray: 'FF333333',
  headerRed: 'FFC00000',
  headerAmber: 'FFFFC000',
  alertStripe: 'FFFFE6E6',
  warnStripe: 'FFFFC8C8',
  red: 'FFFF0000',
  darkRed: 'FFC00000',
  yellow: 'FFFFFF00',
  orange: 'FFFFA500',
  amber: 'FFFFC000',
  green: 'FFC8FFC8',
  priorityP5: 'FFFFC8C8',
  priorityP6: 'FFFFF0C8',
};

/**
 * Coerce a value to a Date, or null when it cannot represent a real instant.
 *
 * Returning null rather than an Invalid Date is the point: ExcelJS writes an
 * Invalid Date out as the literal text "Invalid Date", which is what open
 * tickets with a blank resolved_at used to produce.
 */
function toExcelDate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Coerce a value to a finite number, or null. Empty strings are not zero. */
function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

module.exports = {
  FONT_NAME,
  DATE_FORMAT,
  NUM_FMT,
  COLORS,
  toExcelDate,
  toFiniteNumber,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 12 scenarios from `excel-report-format.feature` pass (1 + 2 + 1 + 2 + 3 + 2 + 1 across the outlines), and every pre-existing feature still passes.

- [ ] **Step 5: Commit**

```bash
git add src/excel-report-format.js features/excel-report-format.feature cucumber/step-definitions/excel-report-format.steps.ts
git commit -m "feat: add Excel report formatting primitives with null-safe date coercion"
```

---

### Task 2: `renderTable` — one column list drives the whole table

**Files:**
- Modify: `src/excel-report-format.js`
- Modify: `features/excel-report-format.feature`
- Modify: `cucumber/step-definitions/excel-report-format.steps.ts`

**Interfaces:**
- Consumes: `toExcelDate`, `toFiniteNumber`, `COLORS`, `DATE_FORMAT`, `NUM_FMT`, `FONT_NAME` from Task 1.
- Produces:
  - `renderTable(worksheet, options): { headerRowNumber: number, firstDataRowNumber: number, lastRowNumber: number }`

  `options` fields:

  | Field | Type | Default | Meaning |
  |---|---|---|---|
  | `columns` | `ColumnSpec[]` | required | The single source of truth for the table |
  | `rows` | `object[]` | required | Data items, passed to each column's `get` |
  | `title` | `string \| null` | `null` | Merged banner across all columns on row 1 |
  | `headerFill` | ARGB string | `COLORS.headerGray` | Header and title background |
  | `headerFontColor` | ARGB string | `COLORS.white` | Header and title text |
  | `metadata` | `[string, unknown][]` | `[]` | Label/value rows between title and header |
  | `stripeFill` | ARGB string | `COLORS.stripe` | Odd-row banding |

  `ColumnSpec` fields:

  | Field | Type | Default | Meaning |
  |---|---|---|---|
  | `header` | `string` | required | Header text |
  | `width` | `number` | required | Column width in characters |
  | `get` | `(item) => unknown` | required | Extracts the raw value |
  | `type` | `'text' \| 'date' \| 'int' \| 'decimal' \| 'percent'` | `'text'` | Drives cell value type, numFmt and default alignment |
  | `align` | `'left' \| 'center' \| 'right'` | text→left, other→right | Override |
  | `wrap` | `boolean` | `false` | Wrap long text |
  | `emptyText` | `string` | `''` | Substituted for blank `text` values |
  | `fill` | `(value, item) => string \| null` | — | Conditional background; `null` falls back to banding |
  | `fontColor` | `(value, item) => string \| null` | — | Conditional text color |
  | `bold` | `(value, item) => boolean` | — | Conditional bold |

  The `value` handed to `fill` / `fontColor` / `bold` is the **converted** cell value — a `Date` for `date` columns, a rounded number for `int`, so threshold rules compare numbers against numbers.

- [ ] **Step 1: Write the failing test**

Append to `features/excel-report-format.feature`:

```gherkin
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
```

Append to `cucumber/step-definitions/excel-report-format.steps.ts`:

```typescript
import { Given } from '@cucumber/cucumber';
import ExcelJS from 'exceljs';
import { renderTable, COLORS } from '../../src/excel-report-format.js';

let worksheet: any;
let columns: any[];
let renderResult: any;

/** Column index (1-based) of a header, resolved from the declared column list. */
function columnIndexOf(header: string): number {
  const index = columns.findIndex(c => c.header === header);
  assert.notStrictEqual(index, -1, `no column named ${header}`);
  return index + 1;
}

function dataCell(header: string): any {
  return worksheet.getCell(renderResult.firstDataRowNumber, columnIndexOf(header));
}

Given('a table whose fourth column is {string} with a red fill above 30 days', function (header: string) {
  columns = [
    { header: 'Ticket ID', width: 14, get: (t: any) => t.id },
    { header: 'Title', width: 42, get: (t: any) => t.title, wrap: true },
    { header: 'Created', width: 13, get: (t: any) => t.created, type: 'date' },
    {
      header,
      width: 11,
      get: (t: any) => t.daysOpen,
      type: 'int',
      fill: (value: number) => (value > 30 ? COLORS.red : value > 14 ? COLORS.yellow : null),
    },
  ];
});

Given('the table also has a {string} date column in third position', function (header: string) {
  assert.strictEqual(columns[2].header, header);
});

Given('a table with an {string} text column whose placeholder is {string}', function (header: string, placeholder: string) {
  columns = [
    { header: 'Ticket ID', width: 14, get: (t: any) => t.id },
    { header, width: 20, get: (t: any) => t.assignee, emptyText: placeholder },
  ];
});

When('I render one row with {int} days open', function (daysOpen: number) {
  worksheet = new ExcelJS.Workbook().addWorksheet('Test');
  renderResult = renderTable(worksheet, {
    columns,
    rows: [{ id: 'INC001', title: 'Disk full', created: '2026-09-23T14:30:00Z', daysOpen }],
    title: 'TEST TABLE',
  });
});

When('I render one row whose assignee is {string}', function (assignee: string) {
  worksheet = new ExcelJS.Workbook().addWorksheet('Test');
  renderResult = renderTable(worksheet, {
    columns,
    rows: [{ id: 'INC001', assignee }],
  });
});

When('I render zero rows', function () {
  worksheet = new ExcelJS.Workbook().addWorksheet('Test');
  renderResult = renderTable(worksheet, { columns, rows: [], title: 'TEST TABLE' });
});

Then('the {string} cell has background {string}', function (header: string, argb: string) {
  assert.strictEqual(dataCell(header).fill.fgColor.argb, argb);
});

Then('the {string} cell does not have background {string}', function (header: string, argb: string) {
  assert.notStrictEqual(dataCell(header).fill.fgColor.argb, argb);
});

Then('the {string} cell value is a Date', function (header: string) {
  assert.ok(dataCell(header).value instanceof Date);
});

Then('the {string} cell number format is {string}', function (header: string, format: string) {
  assert.strictEqual(dataCell(header).numFmt, format);
});

Then('the {string} cell value is the number {int}', function (header: string, expected: number) {
  const value = dataCell(header).value;
  assert.strictEqual(typeof value, 'number', `expected a number, got ${typeof value}`);
  assert.strictEqual(value, expected);
});

Then('the {string} cell value is {string}', function (header: string, expected: string) {
  assert.strictEqual(dataCell(header).value, expected);
});

Then('the worksheet has no AutoFilter', function () {
  assert.ok(!worksheet.autoFilter, 'expected no AutoFilter on an empty table');
});

Then('the header row is frozen', function () {
  assert.strictEqual(worksheet.views[0].state, 'frozen');
  assert.strictEqual(worksheet.views[0].ySplit, renderResult.headerRowNumber);
});
```

The "conditional fill lands on the column it is declared for" scenario is the bug from the defect inventory in executable form: under the old three-list code the red fill landed on `Created`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with `TypeError: (0 , import_excel_report_format.renderTable) is not a function` — the import resolves but the export does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add to `src/excel-report-format.js`, above `module.exports`:

```javascript
function solidFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

const CELL_BORDER = {
  top: { style: 'thin', color: { argb: COLORS.gridline } },
  left: { style: 'thin', color: { argb: COLORS.gridline } },
  bottom: { style: 'thin', color: { argb: COLORS.gridline } },
  right: { style: 'thin', color: { argb: COLORS.gridline } },
};

const NUMERIC_TYPES = new Set(['int', 'decimal', 'percent']);

/** Convert one item into the value that belongs in the cell, typed for Excel. */
function toCellValue(column, item) {
  const raw = column.get(item);

  switch (column.type) {
    case 'date':
      return toExcelDate(raw);
    case 'int': {
      const num = toFiniteNumber(raw);
      return num === null ? null : Math.round(num);
    }
    case 'decimal':
    case 'percent':
      return toFiniteNumber(raw);
    default: {
      if (raw === null || raw === undefined) return column.emptyText || '';
      const text = String(raw).trim();
      return text === '' ? column.emptyText || '' : text;
    }
  }
}

function numberFormatFor(column) {
  if (column.type === 'date') return DATE_FORMAT;
  if (NUMERIC_TYPES.has(column.type)) return NUM_FMT[column.type];
  return null;
}

function defaultAlignment(column) {
  return column.type === 'date' || NUMERIC_TYPES.has(column.type) ? 'right' : 'left';
}

/**
 * Write a table whose layout is derived entirely from `columns`.
 *
 * Every per-column concern — value, number format, width, alignment and
 * conditional color — is read from the same descriptor, so there is no second
 * index list that can drift out of step with the headers.
 */
function renderTable(worksheet, options) {
  const {
    columns,
    rows,
    title = null,
    headerFill = COLORS.headerGray,
    headerFontColor = COLORS.white,
    metadata = [],
    stripeFill = COLORS.stripe,
  } = options;

  const lastColumn = columns.length;

  if (title) {
    worksheet.mergeCells(1, 1, 1, lastColumn);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: headerFontColor } };
    titleCell.fill = solidFill(headerFill);
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;
  }

  metadata.forEach(([label, value]) => {
    const row = worksheet.addRow([label, value]);
    row.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
    row.getCell(2).font = { name: FONT_NAME, size: 11 };
  });

  if (metadata.length > 0) worksheet.addRow([]);

  const headerRow = worksheet.addRow(columns.map(column => column.header));
  headerRow.height = 20;
  headerRow.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: headerFontColor } };
    cell.fill = solidFill(headerFill);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = CELL_BORDER;
  });
  const headerRowNumber = headerRow.number;

  rows.forEach((item, rowIndex) => {
    const values = columns.map(column => toCellValue(column, item));
    const row = worksheet.addRow(values);
    const bandFill = rowIndex % 2 === 0 ? COLORS.white : stripeFill;

    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      const value = values[columnIndex];

      const format = numberFormatFor(column);
      if (format) cell.numFmt = format;

      const conditionalFill = column.fill ? column.fill(value, item) : null;
      cell.fill = solidFill(conditionalFill || bandFill);

      const conditionalFontColor = column.fontColor ? column.fontColor(value, item) : null;
      cell.font = {
        name: FONT_NAME,
        size: 11,
        bold: column.bold ? Boolean(column.bold(value, item)) : false,
        color: { argb: conditionalFontColor || COLORS.black },
      };

      cell.border = CELL_BORDER;
      cell.alignment = {
        horizontal: column.align || defaultAlignment(column),
        vertical: 'middle',
        wrapText: Boolean(column.wrap),
      };
    });
  });

  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width;
  });

  const lastRowNumber = headerRowNumber + rows.length;

  // A filter over a header-only range makes Excel report the file as corrupt.
  if (rows.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: lastRowNumber, column: lastColumn },
    };
  }

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowNumber }];

  return {
    headerRowNumber,
    firstDataRowNumber: headerRowNumber + 1,
    lastRowNumber,
  };
}
```

Widths are set through `worksheet.getColumn(n).width` rather than by assigning `worksheet.columns`. Assigning that array after rows exist replaces every column definition at once and is how the old code ended up with 11 widths spread across 12 columns.

Update the export block:

```javascript
module.exports = {
  FONT_NAME,
  DATE_FORMAT,
  NUM_FMT,
  COLORS,
  CELL_BORDER,
  solidFill,
  toExcelDate,
  toFiniteNumber,
  renderTable,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — the 4 new scenarios pass alongside Task 1's and every pre-existing feature.

- [ ] **Step 5: Commit**

```bash
git add src/excel-report-format.js features/excel-report-format.feature cucumber/step-definitions/excel-report-format.steps.ts
git commit -m "feat: derive Excel table layout from a single column descriptor list"
```

---

### Task 3: Rewrite the Full Backlog sheet onto column descriptors

**Files:**
- Modify: `src/main.js:1202-1299` (the `SHEET 7: FULL BACKLOG` block)
- Modify: `features/excel-report-format.feature`
- Modify: `cucumber/step-definitions/excel-report-format.steps.ts`

**Interfaces:**
- Consumes: `renderTable`, `COLORS`, `toExcelDate` from Tasks 1-2.
- Produces: `buildFullBacklogColumns(): ColumnSpec[]`, exported from `src/excel-report-format.js` so the Cucumber suite can assert on the real column list the export uses rather than a copy of it.

This is the sheet the user reported. Its 12 columns are, in order: Ticket ID, Title, Assignment Group, Created, Days Open, Priority, Assigned To, Status, Last Updated, Days Since Update, Time in Delay (hrs), Notes.

- [ ] **Step 1: Write the failing test**

Append to `features/excel-report-format.feature`:

```gherkin
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
      | 31   | FFFF0000 |

  Scenario: Full Backlog declares one width per column
    Given the Full Backlog column list
    Then every column has a header and a width

  Scenario: An unassigned backlog ticket reads as unassigned
    Given the Full Backlog column list
    When I render a backlog row with 5 days open
    Then the "Assigned To" cell value is "Non assegnato"
```

Append to `cucumber/step-definitions/excel-report-format.steps.ts`:

```typescript
import { buildFullBacklogColumns } from '../../src/excel-report-format.js';

Given('the Full Backlog column list', function () {
  columns = buildFullBacklogColumns();
});

When('I render a backlog row with {int} days open', function (daysOpen: number) {
  worksheet = new ExcelJS.Workbook().addWorksheet('Full Backlog');
  renderResult = renderTable(worksheet, {
    columns,
    rows: [{
      id: 'INC001',
      title: 'Disk full',
      assignment_group: 'Infra',
      created: '2026-08-01T09:00:00Z',
      daysOpen,
      priority: 'P7',
      assignedTo: '   ',
      status: 'Open',
      lastUpdated: '2026-09-20T09:00:00Z',
      daysSinceUpdate: 3,
      timeInDelay: 0,
      notes: '',
    }],
    title: 'FULL BACKLOG',
  });
});

Then('every column has a header and a width', function () {
  columns.forEach((column, index) => {
    assert.ok(column.header, `column ${index + 1} has no header`);
    assert.strictEqual(typeof column.width, 'number', `column "${column.header}" has no width`);
  });
});
```

The threshold table pins Review Focus item 3: 14 and 30 stay below their thresholds because the rules are strictly greater-than.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with `TypeError: (0 , import_excel_report_format.buildFullBacklogColumns) is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/excel-report-format.js`, above `module.exports`:

```javascript
/**
 * Column list for the Full Backlog sheet.
 *
 * Lives here rather than in main.js so the Cucumber suite asserts against the
 * same list the export actually renders.
 */
function buildFullBacklogColumns() {
  return [
    { header: 'Ticket ID', width: 14, get: t => t.id },
    { header: 'Title', width: 45, get: t => t.title, wrap: true },
    { header: 'Assignment Group', width: 22, get: t => t.assignment_group, emptyText: 'Non assegnato' },
    { header: 'Created', width: 13, get: t => t.created, type: 'date' },
    {
      header: 'Days Open',
      width: 11,
      get: t => t.daysOpen,
      type: 'int',
      fill: value => (value > 30 ? COLORS.red : value > 14 ? COLORS.yellow : null),
    },
    {
      header: 'Priority',
      width: 10,
      get: t => t.priority,
      align: 'center',
      fill: value => (value === 'P5' ? COLORS.priorityP5 : value === 'P6' ? COLORS.priorityP6 : null),
    },
    { header: 'Assigned To', width: 24, get: t => t.assignedTo, emptyText: 'Non assegnato' },
    { header: 'Status', width: 14, get: t => t.status },
    { header: 'Last Updated', width: 14, get: t => t.lastUpdated, type: 'date' },
    {
      header: 'Days Since Update',
      width: 14,
      get: t => t.daysSinceUpdate,
      type: 'int',
      fontColor: value => (value > 7 ? COLORS.orange : null),
    },
    {
      header: 'Time in Delay (hrs)',
      width: 16,
      get: t => t.timeInDelay || 0,
      type: 'decimal',
      fontColor: value => (value > 0 ? COLORS.darkRed : null),
      bold: value => value > 0,
    },
    { header: 'Notes', width: 28, get: t => t.notes, wrap: true },
  ];
}
```

Add `buildFullBacklogColumns` to `module.exports`.

Then replace the whole `SHEET 7: FULL BACKLOG` block in `src/main.js` (currently lines 1202-1299) with:

```javascript
    // ============== SHEET 7: FULL BACKLOG ==============
    if (exportData.fullBacklog) {
      const worksheet = workbook.addWorksheet('Full Backlog', { tabColor: { argb: COLORS.headerGray } });

      renderTable(worksheet, {
        columns: buildFullBacklogColumns(),
        rows: exportData.fullBacklog,
        title: 'FULL BACKLOG - All Unresolved Tickets Sorted by Priority',
        headerFill: COLORS.headerGray,
        metadata: [
          ['Export Date', new Date()],
          ['Time Period', exportData.timeFilterLabel || 'All Time'],
        ],
      });
    }
```

Add the require near the top of `src/main.js`, alongside the other top-level requires:

```javascript
const {
  COLORS,
  renderTable,
  buildFullBacklogColumns,
} = require('./excel-report-format');
```

The `Export Date` metadata value is now a `Date` rather than `new Date().toLocaleDateString()`. Give it the display format right after rendering — `renderTable` only formats the table body, not metadata rows:

```javascript
      worksheet.getCell('B2').numFmt = DATE_FORMAT;
```

Add `DATE_FORMAT` to the destructured require. This drops the old hand-rolled title merge (`A1:K1`, one column short), the 11-entry width array, the `i <= 11` styling loop that skipped Notes, and the `ySplit: 5` freeze that pinned the first data row — `renderTable` derives all four from the column list.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 7 new scenarios plus everything from Tasks 1-2 and the pre-existing suite.

- [ ] **Step 5: Verify the real export by hand**

Run: `npm start`, load ticket data, trigger the dashboard export, open the file from Downloads.
Expected: the Full Backlog sheet shows `Created` and `Last Updated` as `23-09-2026`; sorting on `Days Open` orders numerically; the red/yellow banding sits on the `Days Open` column, not on `Created`; the `Notes` column has gridlines; the AutoFilter dropdowns sit on the header row and only the header row is frozen.

- [ ] **Step 6: Commit**

```bash
git add src/excel-report-format.js src/main.js features/excel-report-format.feature cucumber/step-definitions/excel-report-format.steps.ts
git commit -m "fix: correct Full Backlog column alignment and write native Excel dates and numbers"
```

---

### Task 4: Rewrite the remaining six sheets and fix Days Unworked

**Files:**
- Modify: `src/main.js:802-1200` (SHEET 1 Team Analysis through SHEET 6 Unworked Tickets)
- Modify: `features/excel-report-format.feature`
- Modify: `cucumber/step-definitions/excel-report-format.steps.ts`

**Interfaces:**
- Consumes: `renderTable`, `COLORS`, `DATE_FORMAT` from Tasks 1-3.
- Produces: `slaHoursFor(priority: string): number` exported from `src/excel-report-format.js` — the P5/P6/P7/P8 threshold lookup, falling back to 72 for anything else.

- [ ] **Step 1: Write the failing test**

Append to `features/excel-report-format.feature`:

```gherkin
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
```

Append to `cucumber/step-definitions/excel-report-format.steps.ts`:

```typescript
import { slaHoursFor } from '../../src/excel-report-format.js';

let slaHours: number;

When('I look up the SLA hours for priority {string}', function (priority: string) {
  slaHours = slaHoursFor(priority);
});

When('I look up the SLA hours for the literal priority {word}', function (word: string) {
  slaHours = slaHoursFor(absentLiteral(word) as unknown as string);
});

Then('the SLA hours are {int}', function (expected: number) {
  assert.strictEqual(slaHours, expected);
});

When('I render a backlog row with priority {string}', function (priority: string) {
  worksheet = new ExcelJS.Workbook().addWorksheet('Full Backlog');
  renderResult = renderTable(worksheet, {
    columns,
    rows: [{
      id: 'INC001',
      title: 'Disk full',
      assignment_group: 'Infra',
      created: '2026-08-01T09:00:00Z',
      daysOpen: 5,
      priority,
      assignedTo: 'Mario Rossi',
      status: 'Open',
      lastUpdated: '2026-09-20T09:00:00Z',
      daysSinceUpdate: 3,
      timeInDelay: 0,
      notes: '',
    }],
  });
});
```

This pins Review Focus item 5.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with `TypeError: (0 , import_excel_report_format.slaHoursFor) is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/excel-report-format.js` and to `module.exports`:

```javascript
const SLA_HOURS = { P5: 4, P6: 8, P7: 24, P8: 72 };

/** SLA threshold in hours. Unknown or dirty priorities fall back to the P8 window. */
function slaHoursFor(priority) {
  return SLA_HOURS[priority] || 72;
}
```

Then convert each of the six remaining sheets in `src/main.js`. The pattern is identical throughout: build the column list, call `renderTable`, delete the hand-rolled header/styling/width code.

**SHEET 1 — Team Analysis** (replaces lines 802-867):

```javascript
    // ============== SHEET 1: TEAM ANALYSIS ==============
    if (exportData.teamAnalysis && exportData.teamAnalysis.metrics) {
      const worksheet = workbook.addWorksheet('Team Analysis', { tabColor: { argb: COLORS.headerGray } });

      renderTable(worksheet, {
        columns: [
          { header: 'Operator', width: 26, get: m => m.operatorName },
          { header: 'Assigned Tickets', width: 15, get: m => m.assignedTickets || 0, type: 'int' },
          { header: 'Resolved Tickets', width: 15, get: m => m.resolvedTickets || 0, type: 'int' },
          { header: 'Avg Resolution (hrs)', width: 18, get: m => m.averageResolutionTime || 0, type: 'decimal' },
          { header: 'Tickets in Delay', width: 15, get: m => m.ticketsInDelay || 0, type: 'int' },
          {
            header: 'Delay %',
            width: 12,
            get: m => m.delayPercentage || 0,
            type: 'percent',
            fill: value => (value > 20 ? COLORS.darkRed : value > 10 ? COLORS.amber : COLORS.green),
            bold: value => value > 10,
          },
          { header: 'Utilization %', width: 14, get: m => m.utilizationPercentage || 0, type: 'percent' },
        ],
        rows: exportData.teamAnalysis.metrics,
        title: 'Team Analysis - Operator Performance Metrics',
        headerFill: COLORS.headerGray,
      });
    }
```

**SHEET 2 — Orphaned Tickets** (replaces lines 869-930):

```javascript
    // ============== SHEET 2: ORPHANED TICKETS ==============
    if (exportData.alerts && exportData.alerts.orphaned) {
      const worksheet = workbook.addWorksheet('Orphaned Tickets', { tabColor: { argb: COLORS.headerRed } });
      const summary = exportData.alerts.orphaned.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Days Open',
            width: 11,
            get: t => daysBetween(t.opened_at),
            type: 'int',
            fill: value => (value > 30 ? COLORS.red : value > 14 ? COLORS.yellow : null),
          },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Status', width: 14, get: t => t.state },
          { header: 'Last Updated', width: 14, get: t => t.sys_updated_on, type: 'date' },
        ],
        rows: exportData.alerts.orphaned.tickets,
        title: 'ORPHANED TICKETS ALERT - Unassigned Tickets',
        headerFill: COLORS.headerRed,
        stripeFill: COLORS.alertStripe,
        metadata: [
          ['Total Orphaned', summary.total],
          ['> 7 Days', summary.overSevenDays],
          ['> 14 Days', summary.overFourteenDays],
          ['> 30 Days', summary.overThirtyDays],
        ],
      });
    }
```

**SHEET 3 — Stagnant Tickets** (replaces lines 932-993):

```javascript
    // ============== SHEET 3: STAGNANT TICKETS ==============
    if (exportData.alerts && exportData.alerts.stagnant) {
      const worksheet = workbook.addWorksheet('Stagnant Tickets', { tabColor: { argb: COLORS.headerRed } });
      const summary = exportData.alerts.stagnant.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Days Stagnant',
            width: 13,
            get: t => daysBetween(t.sys_updated_on),
            type: 'int',
            fontColor: value => (value > 7 ? COLORS.orange : null),
          },
          { header: 'Days Open', width: 11, get: t => daysBetween(t.opened_at), type: 'int' },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Assigned To', width: 24, get: t => t.assigned_to, emptyText: 'Non assegnato' },
          { header: 'Status', width: 14, get: t => t.state },
        ],
        rows: exportData.alerts.stagnant.tickets,
        title: 'STAGNANT TICKETS ALERT - No Recent Activity',
        headerFill: COLORS.headerRed,
        stripeFill: COLORS.alertStripe,
        metadata: [
          ['Total Stagnant', summary.total],
          ['> 7 Days No Update', summary.overSevenDays],
          ['> 14 Days No Update', summary.overFourteenDays],
          ['Max Stagnation (days)', Math.round(summary.maxStagnationDays)],
        ],
      });
    }
```

**SHEET 4 — Expired High Priority** (replaces lines 995-1073):

```javascript
    // ============== SHEET 4: EXPIRED HIGH PRIORITY ==============
    if (exportData.alerts && exportData.alerts.expiredHighPriority) {
      const worksheet = workbook.addWorksheet('Expired High Priority', { tabColor: { argb: COLORS.headerRed } });
      const summary = exportData.alerts.expiredHighPriority.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          {
            header: 'Priority',
            width: 10,
            get: t => t.priority,
            align: 'center',
            fill: value => (value === 'P5' ? COLORS.priorityP5 : value === 'P6' ? COLORS.priorityP6 : null),
          },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Hours Overdue',
            width: 14,
            get: t => hoursOverdue(t),
            type: 'decimal',
            fontColor: value => (value > 0 ? COLORS.darkRed : null),
            bold: value => value > 0,
          },
          { header: 'SLA Threshold (hrs)', width: 17, get: t => slaHoursFor(t.priority), type: 'int' },
          { header: 'Assigned To', width: 24, get: t => t.assigned_to, emptyText: 'Non assegnato' },
          { header: 'Status', width: 14, get: t => t.state },
        ],
        rows: exportData.alerts.expiredHighPriority.tickets,
        title: 'EXPIRED HIGH PRIORITY ALERT - SLA Violations',
        headerFill: COLORS.headerRed,
        stripeFill: COLORS.alertStripe,
        metadata: [
          ['Total Overdue', summary.total],
          ['P5 Overdue', summary.p5Overdue],
          ['P6 Overdue', summary.p6Overdue],
          ['P7 Overdue', summary.p7Overdue],
          ['P8 Overdue', summary.p8Overdue],
          ['Max Overdue (hrs)', Number(summary.maxOverdueHours.toFixed(1))],
        ],
      });
    }
```

**SHEET 5 — Suspicious Closures** (replaces lines 1075-1138):

```javascript
    // ============== SHEET 5: SUSPICIOUS CLOSURES ==============
    if (exportData.alerts && exportData.alerts.suspiciousClosures) {
      const worksheet = workbook.addWorksheet('Suspicious Closures', { tabColor: { argb: COLORS.headerAmber } });
      const summary = exportData.alerts.suspiciousClosures.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          { header: 'Resolved', width: 13, get: t => t.resolved_at, type: 'date' },
          { header: 'Close Time (min)', width: 15, get: t => minutesToClose(t), type: 'decimal' },
          { header: 'Expected SLA (hrs)', width: 17, get: t => slaHoursFor(t.priority), type: 'int' },
        ],
        rows: exportData.alerts.suspiciousClosures.tickets,
        title: 'SUSPICIOUS CLOSURES ALERT - Unusually Fast Resolutions',
        headerFill: COLORS.headerAmber,
        headerFontColor: COLORS.black,
        stripeFill: COLORS.warnStripe,
        metadata: [
          ['Total Suspicious', summary.total],
          ['< 5 minutes', summary.lessThan5Min],
          ['< 15 minutes', summary.lessThan15Min],
          ['< 30 minutes', summary.lessThan30Min],
          ['Avg Close Time (min)', Number(summary.avgCloseTimeMin.toFixed(1))],
        ],
      });
    }
```

The `Resolved` column is where `Invalid Date` used to appear: `toExcelDate` now leaves the cell empty when `resolved_at` is blank. That is Review Focus item 1 reaching production code.

**SHEET 6 — Unworked Tickets** (replaces lines 1140-1200). This carries the Days Unworked fix — `getUnworkedTickets` (`TicketDashboardActions.ts:508-519`) selects assigned, unresolved tickets whose `sys_updated_on` is older than three days, so the days-unworked count is measured from `sys_updated_on`, not from `opened_at`:

```javascript
    // ============== SHEET 6: UNWORKED TICKETS ==============
    if (exportData.alerts && exportData.alerts.unworked) {
      const worksheet = workbook.addWorksheet('Unworked Tickets', { tabColor: { argb: COLORS.headerAmber } });
      const summary = exportData.alerts.unworked.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Days Unworked',
            width: 13,
            get: t => daysBetween(t.sys_updated_on),
            type: 'int',
            fontColor: value => (value > 7 ? COLORS.orange : null),
          },
          { header: 'Days Open', width: 11, get: t => daysBetween(t.opened_at), type: 'int' },
          { header: 'Assigned To', width: 24, get: t => t.assigned_to, emptyText: 'Non assegnato' },
          { header: 'Status', width: 14, get: t => t.state },
        ],
        rows: exportData.alerts.unworked.tickets,
        title: 'UNWORKED TICKETS ALERT - Assigned But No Activity',
        headerFill: COLORS.headerAmber,
        headerFontColor: COLORS.black,
        stripeFill: COLORS.warnStripe,
        metadata: [
          ['Total Unworked', summary.total],
          ['> 7 Days', summary.overSevenDays],
          ['> 14 Days', summary.overFourteenDays],
          ['Max Unworked (days)', Math.round(summary.maxUnworkedDays)],
        ],
      });
    }
```

Three small helpers are used above. Define them in `src/main.js` immediately before the `ipcMain.handle('export-ticket-report', ...)` call — they read `exportData`-shaped ticket records, which is main-process territory, so they do not belong in the formatting module:

```javascript
/** Whole days elapsed from an ISO timestamp until now. null when unparsable. */
function daysBetween(isoTimestamp) {
  const date = toExcelDate(isoTimestamp);
  if (!date) return null;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

/** Hours a ticket has been open past its SLA window. Never negative. */
function hoursOverdue(ticket) {
  const openedAt = toExcelDate(ticket.opened_at);
  if (!openedAt) return 0;
  const slaMs = slaHoursFor(ticket.priority) * 60 * 60 * 1000;
  return Math.max(0, (Date.now() - openedAt.getTime() - slaMs) / (1000 * 60 * 60));
}

/** Minutes between opening and resolution. null when either timestamp is absent. */
function minutesToClose(ticket) {
  const openedAt = toExcelDate(ticket.opened_at);
  const resolvedAt = toExcelDate(ticket.resolved_at);
  if (!openedAt || !resolvedAt) return null;
  return (resolvedAt.getTime() - openedAt.getTime()) / (1000 * 60);
}
```

Add `toExcelDate` and `slaHoursFor` to the destructured require added in Task 3.

Note that `hoursOverdue` now clamps at 0. The old code at line 1041 could produce a negative "Hours Overdue" for a ticket that had not yet breached its SLA.

Finally, delete the now-unused `styles` object at `src/main.js:769-800` — `renderTable` supplies every style it defined, and nothing else in the handler references it. Confirm with `grep -n "styles\." src/main.js` before deleting.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 9 new scenarios (6 SLA rows, 2 absent-literal rows, 1 unknown-priority render) plus everything from Tasks 1-3 and the pre-existing suite.

- [ ] **Step 5: Verify the real export by hand**

Run: `npm start`, load ticket data, trigger the export, open the file.
Expected: all 7 sheets show dates as `23-09-2026`; each sheet has AutoFilter on its header row and the header frozen; in Unworked Tickets, `Days Unworked` and `Days Open` now hold different numbers; in Suspicious Closures, a ticket with no `resolved_at` shows an empty `Resolved` cell rather than `Invalid Date`.

- [ ] **Step 6: Commit**

```bash
git add src/excel-report-format.js src/main.js features/excel-report-format.feature cucumber/step-definitions/excel-report-format.steps.ts
git commit -m "fix: rewrite alert and team sheets on column descriptors, derive Days Unworked from last update"
```

---

### Task 5: Delete the dead XLSX sheet builders

**Files:**
- Modify: `src/renderer/react/actions/TicketDashboardActions.ts` (remove roughly lines 1500-2200)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. This task only removes code.

The renderer holds a second, parallel Excel generator built on the `xlsx` library. It was superseded by the ExcelJS path in the main process and is now unreachable — it duplicates the same sheets with a different and also-wrong set of column indices. Leaving it in place is what lets the next person fix the wrong file.

- [ ] **Step 1: Confirm the methods are unreachable**

Run:

```bash
grep -rn "createDashboardSummarySheet\|createTeamAnalysisSheet\|createAlertSheet\|createFullBacklogSheet\|createMetadataSheet" src/renderer/react src/renderer/js src/renderer/index.html
```

Expected: only the five `  createX(): any {` definition lines inside `TicketDashboardActions.ts`, with no call sites. If any call site appears, STOP — the premise is wrong; report it rather than deleting.

`src/renderer/assets/` is Vite build output and is excluded from this check on purpose; it contains a compiled copy of the same dead code, which the next `npm run build:react` regenerates without it.

- [ ] **Step 2: Delete the methods**

Remove each method in full, from its leading JSDoc comment through its closing brace: `createDashboardSummarySheet`, `createTeamAnalysisSheet`, `createAlertSheet`, `createFullBacklogSheet`, `createMetadataSheet`.

Read the surrounding lines before cutting — the exact line numbers shift as each method goes. Keep `prepareExportData()` and `exportReportToExcel()`: both are live, on the IPC path.

- [ ] **Step 3: Remove orphaned imports**

Run:

```bash
grep -n "require('xlsx')\|ExcelUtilities\|NumberFormatting\|DateFormatting" src/renderer/react/actions/TicketDashboardActions.ts
```

Delete every `const XLSX = require('xlsx');` and `const { ... } = require('../utilities/ExcelUtilities');` line that sat inside a deleted method and now has no remaining reference. If a surviving method still uses one, keep it.

- [ ] **Step 4: Verify nothing broke**

Run: `npm test`
Expected: PASS, same scenario count as after Task 4.

Run: `npm run build:react`
Expected: build succeeds with no unresolved-import or unused-symbol errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/react/actions/TicketDashboardActions.ts src/renderer/assets
git commit -m "refactor: remove unreachable XLSX export builders superseded by the ExcelJS main-process path"
```

---

## Verification Checklist

After Task 5, confirm the user's original report is addressed end to end:

- [ ] `npm test` passes.
- [ ] `npm run build:react` succeeds.
- [ ] Export from a running app; in the produced workbook:
  - [ ] Every date cell reads `dd-mm-yyyy` and Excel's date filters offer date ranges on it.
  - [ ] Sorting `Days Open` descending puts 31 above 9 (numeric, not lexicographic).
  - [ ] Full Backlog: the red/yellow banding is on `Days Open`; `Created` is unbanded.
  - [ ] Full Backlog: `Notes` has gridlines and a width.
  - [ ] Unworked Tickets: `Days Unworked` differs from `Days Open`.
  - [ ] Suspicious Closures: an unresolved-date row shows an empty cell, never `Invalid Date`.
  - [ ] Every sheet: AutoFilter on the header row, header frozen, no data row frozen with it.
  - [ ] Text columns left-aligned, dates and numbers right-aligned, assignee names not truncated.
