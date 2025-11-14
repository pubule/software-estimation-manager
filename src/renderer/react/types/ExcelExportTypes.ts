/**
 * Excel Export Type Definitions
 * Defines interfaces for Excel export functionality
 */

/**
 * Configuration for a single sheet in the Excel workbook
 */
export interface SheetConfig {
  sheetName: string;
  headers: string[];
  data: any[][];
  styles?: Record<string, any>;
}

/**
 * Metadata about the export operation
 */
export interface ExportMetadata {
  exportDate: string;
  exportUser: string;
  dataSnapshotDate: string;
  timeFilter: {
    label: string;
    startDate?: string;
    endDate?: string;
  };
  ticketCount: number;
  exportDuration?: number;
}

/**
 * Excel formatting configuration for cells
 */
export interface ExcelFormatting {
  headerColor?: string;
  dataColor?: string;
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  numberFormat?: string;
  conditionalRules?: ConditionalFormattingRule[];
}

/**
 * Individual cell styling and formatting
 */
export interface ExcelCell {
  value: any;
  format?: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Conditional formatting rule for cells
 */
export interface ConditionalFormattingRule {
  condition: (value: any) => boolean;
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
}

/**
 * Configuration for time filter in export
 */
export interface TimeFilterConfig {
  type: 'all-time' | 'last-7-days' | 'last-month' | 'last-3-months' | 'last-6-months' | 'current-year' | 'custom';
  label: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Summary of export results
 */
export interface ExportResult {
  success: boolean;
  filename: string;
  filepath?: string;
  sheetsCreated: number;
  totalRows: number;
  exportDuration: number;
  error?: string;
}
