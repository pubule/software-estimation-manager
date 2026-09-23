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
