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
  };
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
  toCellValue,
  numberFormatFor,
  defaultAlignment,
  renderTable,
};
