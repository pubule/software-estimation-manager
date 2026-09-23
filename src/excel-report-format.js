'use strict';

/**
 * Formatting primitives for the incident Excel report.
 *
 * Deliberately free of Electron, fs and path imports: main.js requires it, and
 * the Cucumber suite requires the same file directly to test it without booting
 * an Electron process.
 */

const FONT_NAME = 'Calibri';

/** Shown where a ticket has no owner. English, like every column header. */
const UNASSIGNED = 'Unassigned';

/** Excel shows dd-mm-yyyy; the cell still holds a real date underneath. */
const DATE_FORMAT = 'dd-mm-yyyy';

const NUM_FMT = {
  int: '0',
  decimal: '0.0',
  // Named for what it renders, not for what it means: the callers already pass
  // 0-100 magnitudes into columns whose header carries the % sign.
  decimal2: '0.00',
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

/**
 * The local calendar day of a timestamp, as a bare date at midnight.
 *
 * An Excel date cell has no timezone — it is a plain serial number — so the
 * instant cannot be preserved and the only question is which day it names.
 * We take the day the exporting user's clock shows: 2026-09-23T23:30:00Z is
 * the 24th for someone in UTC+2, and their report should say so.
 *
 * Midnight matters as much as the day. Carrying the original time of day would
 * still render dd-mm-yyyy but leave a hidden fraction, so an exact-date filter
 * or an =A2=DATE(...) formula would not match the date the user can see.
 */
function toDisplayDate(value) {
  const date = toExcelDate(value);
  if (date === null) return null;

  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Whole days elapsed from a timestamp until now, or null when unreadable.
 *
 * Floored, not rounded: an age of 6.6 days is 6 days old. The "> 7 Days"
 * summary counters are computed on the raw fraction, so rounding up made the
 * column contradict the counter above it. Every sheet derives day counts here
 * so that one rule applies to all of them.
 */
function daysBetween(timestamp) {
  const date = toExcelDate(timestamp);
  if (date === null) return null;

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Coerce a value to a finite number, or null. Empty strings are not zero. */
function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * A summary aggregate rounded for display, or null when it is missing.
 *
 * The summary block is built from whatever the renderer sent over IPC. Calling
 * toFixed on a field directly throws when that field is absent, and the throw
 * escapes past renderTable's own guard to fail the entire export.
 */
function summaryNumber(value, decimals = 0) {
  const num = toFiniteNumber(value);
  if (num === null) return null;

  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

function solidFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

const CELL_BORDER = {
  top: { style: 'thin', color: { argb: COLORS.gridline } },
  left: { style: 'thin', color: { argb: COLORS.gridline } },
  bottom: { style: 'thin', color: { argb: COLORS.gridline } },
  right: { style: 'thin', color: { argb: COLORS.gridline } },
};

const NUMERIC_TYPES = new Set(['int', 'decimal', 'decimal2']);

/** Convert one item into the value that belongs in the cell, typed for Excel. */
function toCellValue(column, item) {
  const raw = column.get(item);

  switch (column.type) {
    case 'date':
      return toDisplayDate(raw);
    case 'int': {
      const num = toFiniteNumber(raw);
      return num === null ? null : Math.round(num);
    }
    case 'decimal':
    case 'decimal2':
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

  if (title && metadata.length > 0) worksheet.addRow([]);

  // Labels are merged across A:B with the value in C, so a long label stays readable
  // without forcing the first data column — usually a short Ticket ID — to its width.
  const summaryRowNumbers = metadata.map(([label, value]) => {
    // A NaN aggregate (one unparsable timestamp poisons Math.max) would be written
    // out as <v>NaN</v>, which Excel opens as a corrupt file needing repair.
    const safeValue = typeof value === 'number' && !Number.isFinite(value) ? null : value;
    // Counters that are above zero are the reason the sheet exists: keep them loud.
    const alert = typeof safeValue === 'number' && safeValue > 0;
    const isDate = safeValue instanceof Date;

    const row = worksheet.addRow([label, null, isDate ? toDisplayDate(safeValue) : safeValue]);
    worksheet.mergeCells(row.number, 1, row.number, 2);

    row.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
    // A summary date is written as a real Date, so it needs the same format as the body.
    if (isDate) row.getCell(3).numFmt = DATE_FORMAT;
    row.getCell(3).font = {
      name: FONT_NAME,
      size: 11,
      bold: alert,
      color: { argb: alert ? COLORS.darkRed : COLORS.black },
    };

    return row.number;
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

  // Widths go through getColumn(n): assigning worksheet.columns after rows exist
  // replaces every definition at once and lets widths drift off their headers.
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
    summaryRowNumbers,
  };
}

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
    { header: 'Assignment Group', width: 22, get: t => t.assignment_group, emptyText: UNASSIGNED },
    { header: 'Created', width: 13, get: t => t.created, type: 'date' },
    {
      // Derived here, not taken from the payload: the renderer used to send its own
      // float and the alert sheets floored their own, so the same ticket could read
      // 15 here and 14 two tabs over.
      header: 'Days Open',
      width: 11,
      get: t => daysBetween(t.created),
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
    { header: 'Assigned To', width: 24, get: t => t.assignedTo, emptyText: UNASSIGNED },
    { header: 'Status', width: 14, get: t => t.status },
    { header: 'Last Updated', width: 14, get: t => t.lastUpdated, type: 'date' },
    {
      header: 'Days Since Update',
      width: 14,
      get: t => daysBetween(t.lastUpdated),
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

const SLA_HOURS = { P5: 4, P6: 8, P7: 24, P8: 72 };

/** SLA threshold in hours. Unknown or dirty priorities fall back to the P8 window. */
function slaHoursFor(priority) {
  return SLA_HOURS[priority] || 72;
}

/**
 * Hours a ticket has been open past its SLA window, or null when unreadable.
 *
 * Null rather than 0 for a missing opened_at: 0 means "inside the window", and
 * rendering an unknown as compliant is the same silent wrongness this report
 * exists to remove. Clamped at 0 below the threshold, so a ticket with time to
 * spare reads 0 rather than a negative overdue.
 */
function hoursOverdue(ticket) {
  const openedAt = toExcelDate(ticket.opened_at);
  if (openedAt === null) return null;

  const slaMs = slaHoursFor(ticket.priority) * 60 * 60 * 1000;
  return Math.max(0, (Date.now() - openedAt.getTime() - slaMs) / (1000 * 60 * 60));
}

/** Minutes between opening and resolution, or null when either end is unreadable. */
function minutesToClose(ticket) {
  const openedAt = toExcelDate(ticket.opened_at);
  const resolvedAt = toExcelDate(ticket.resolved_at);
  if (openedAt === null || resolvedAt === null) return null;

  return (resolvedAt.getTime() - openedAt.getTime()) / (1000 * 60);
}

module.exports = {
  FONT_NAME,
  DATE_FORMAT,
  NUM_FMT,
  COLORS,
  CELL_BORDER,
  UNASSIGNED,
  solidFill,
  toExcelDate,
  toDisplayDate,
  toFiniteNumber,
  summaryNumber,
  daysBetween,
  hoursOverdue,
  minutesToClose,
  slaHoursFor,
  renderTable,
  buildFullBacklogColumns,
};
