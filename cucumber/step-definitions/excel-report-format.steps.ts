import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import ExcelJS from 'exceljs';
import {
  toExcelDate,
  toFiniteNumber,
  renderTable,
  buildFullBacklogColumns,
  COLORS,
  DATE_FORMAT,
} from '../../src/excel-report-format.js';

let coercedDate: Date | null;
let coercedNumber: number | null;
let worksheet: any;
let columns: any[];
let renderResult: any;

/** Resolves the bare words "null" and "undefined" from an Examples table. */
function absentLiteral(word: string): null | undefined {
  return word === 'null' ? null : undefined;
}

/** Column index (1-based) of a header, resolved from the declared column list. */
function columnIndexOf(header: string): number {
  const index = columns.findIndex(c => c.header === header);
  assert.notStrictEqual(index, -1, `no column named ${header}`);
  return index + 1;
}

function dataCell(header: string): any {
  return worksheet.getCell(renderResult.firstDataRowNumber, columnIndexOf(header));
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
