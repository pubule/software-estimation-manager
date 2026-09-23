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
 * Same as toExcelDate, shifted so the cell displays the local calendar day.
 *
 * ExcelJS serializes a Date by its UTC instant, so 2026-09-23T23:30:00Z would
 * read 23-09 for a user in UTC+2 whose clock already says 24-09.
 */
function toDisplayDate(value) {
  const date = toExcelDate(value);
  return date === null ? null : new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

/** Coerce a value to a finite number, or null. Empty strings are not zero. */
function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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

  metadata.forEach(([label, value]) => {
    // A NaN aggregate (one unparsable timestamp poisons Math.max) would be written
    // out as <v>NaN</v>, which Excel opens as a corrupt file needing repair.
    const safeValue = typeof value === 'number' && !Number.isFinite(value) ? null : value;
    // Counters that are above zero are the reason the sheet exists: keep them loud.
    const alert = typeof safeValue === 'number' && safeValue > 0;
    const isDate = safeValue instanceof Date;
    const row = worksheet.addRow([label, isDate ? toDisplayDate(safeValue) : safeValue]);
    // A summary date is written as a real Date, so it needs the same format as the body.
    if (isDate) row.getCell(2).numFmt = DATE_FORMAT;
    row.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
    row.getCell(2).font = {
      name: FONT_NAME,
      size: 11,
      bold: alert,
      color: { argb: alert ? COLORS.darkRed : COLORS.black },
    };
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
  // Column A also holds the metadata labels, and column B holds their values, so a
  // label longer than the first header would render clipped instead of overflowing.
  const labelWidth = metadata.reduce((max, [label]) => Math.max(max, String(label).length + 2), 0);

  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = index === 0 ? Math.max(column.width, labelWidth) : column.width;
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

const SLA_HOURS = { P5: 4, P6: 8, P7: 24, P8: 72 };

/** SLA threshold in hours. Unknown or dirty priorities fall back to the P8 window. */
function slaHoursFor(priority) {
  return SLA_HOURS[priority] || 72;
}

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
  buildFullBacklogColumns,
  slaHoursFor,
};
