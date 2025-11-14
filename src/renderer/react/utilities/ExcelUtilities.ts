/**
 * Excel Utilities Module
 * Provides helper functions for formatting and calculations in Excel export
 */

/**
 * Number formatting utilities for Excel cells
 */
export class NumberFormatting {
  /**
   * Format a number as an integer with thousands separators
   * @param value - The number to format
   * @returns Formatted integer string (e.g., "1,250")
   */
  static formatInteger(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return Math.floor(value).toLocaleString('en-US');
  }

  /**
   * Format a number with decimal places
   * @param value - The number to format
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted decimal string (e.g., "18.50")
   */
  static formatDecimal(value: number, decimals: number = 2): string {
    if (!Number.isFinite(value)) return '0' + '.'.repeat(decimals > 0 ? 1 : 0) + '0'.repeat(decimals);
    return value.toFixed(decimals);
  }

  /**
   * Format a number as a percentage
   * @param value - The percentage value (0-100)
   * @param decimals - Number of decimal places (default: 1)
   * @returns Formatted percentage string (e.g., "73.2%")
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    if (!Number.isFinite(value)) return '0' + (decimals > 0 ? '.0' : '') + '%';
    return value.toFixed(decimals) + '%';
  }

  /**
   * Format a number as hours with suffix
   * @param value - The number of hours
   * @param decimals - Number of decimal places (default: 1)
   * @returns Formatted hours string (e.g., "18.5 hours")
   */
  static formatHours(value: number, decimals: number = 1): string {
    if (!Number.isFinite(value)) return '0' + (decimals > 0 ? '.0' : '') + ' hours';
    return value.toFixed(decimals) + ' hours';
  }

  /**
   * Format a number as minutes with suffix
   * @param value - The number of minutes
   * @returns Formatted minutes string (e.g., "45 min")
   */
  static formatMinutes(value: number): string {
    if (!Number.isFinite(value)) return '0 min';
    return Math.floor(value) + ' min';
  }
}

/**
 * Date formatting utilities for Excel cells
 */
export class DateFormatting {
  /**
   * Format a date as YYYY-MM-DD string
   * @param date - The date to format (string or Date object)
   * @returns Formatted date string (e.g., "2025-11-14")
   */
  static formatDateAsYYYYMMDD(date: string | Date): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (!dateObj || isNaN(dateObj.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }
}

/**
 * Standard color constants for Excel formatting
 * RGB values for consistent color usage across all sheets
 */
export const ColorConstants = {
  // Standard colors
  headerDark: 'RGB(51,51,51)',        // Dark gray for headers
  headerRed: 'RGB(192,0,0)',          // Red for critical alerts
  headerYellow: 'RGB(255,192,0)',     // Yellow for warnings

  // Background colors
  backgroundLightGray: 'RGB(245,245,245)',  // Light gray for alternating rows
  backgroundLightRed: 'RGB(255,230,230)',   // Light red for alert rows
  backgroundLightYellow: 'RGB(255,255,200)', // Light yellow for warning rows

  // Cell tints
  tintP5Pink: 'RGB(255,200,200)',     // Pink tint for P5 tickets
  tintP6Orange: 'RGB(255,240,200)',   // Orange tint for P6 tickets

  // Status colors
  statusGreen: 'RGB(0,176,80)',       // Green for OK status
  statusYellow: 'RGB(255,192,0)',     // Yellow for warning status
  statusRed: 'RGB(192,0,0)',          // Red for critical status

  // Text colors
  textWhite: 'RGB(255,255,255)',      // White text for headers
  textRed: 'RGB(192,0,0)',            // Red text for emphasis
  textOrange: 'RGB(255,165,0)',       // Orange text for secondary emphasis

  // Conditional formatting
  delayRedBg: 'RGB(255,200,200)',     // Red for delay >20%
  delayYellowBg: 'RGB(255,255,200)',  // Yellow for delay 10-20%
  delayGreenBg: 'RGB(200,255,200)',   // Green for delay <10%

  utilizationRed: 'RGB(255,0,0)',     // Red for utilization >100%
  utilizationYellow: 'RGB(255,255,0)', // Yellow for utilization 80-100%
  utilizationGreen: 'RGB(0,255,0)',   // Green for utilization <80%
};

/**
 * SLA threshold constants for priority levels
 * Defines maximum response time for each priority in hours
 */
export const SLAThresholds = {
  P5: 4,      // Critical - 4 hours
  P6: 8,      // High - 8 hours
  P7: 24,     // Medium - 24 hours
  P8: 72,     // Low - 72 hours
};

/**
 * Alert type constants for identification
 */
export const AlertTypes = {
  ORPHANED: 'orphaned',
  STAGNANT: 'stagnant',
  EXPIRED_HIGH_PRIORITY: 'expiredHighPriority',
  SUSPICIOUS_CLOSURES: 'suspiciousClosures',
  UNWORKED: 'unworked',
};

/**
 * Common patterns and constants for Excel operations
 */
export const ExcelPatterns = {
  // Standard header row index (0-based)
  HEADER_ROW: 0,

  // Sheet names
  SHEET_NAMES: {
    SUMMARY: 'Dashboard Summary',
    UNIFIED_TICKETS: 'Unified Tickets',
    RESOLUTION_METRICS: 'Resolution Metrics',
    RESOLUTION_RATE: 'Resolution Rate',
    BACKLOG: 'Backlog',
    TEAM_ANALYSIS: 'Team Analysis',
    ORPHANED: 'Orphaned Tickets',
    STAGNANT: 'Stagnant Tickets',
    EXPIRED_HIGH_PRIORITY: 'Expired High Priority',
    SUSPICIOUS_CLOSURES: 'Suspicious Closures',
    UNWORKED: 'Unworked Tickets',
    FULL_BACKLOG: 'Full Backlog List',
    METADATA: 'Metadata',
  },

  // Standard font sizes
  FONT_SIZE_HEADER: 14,
  FONT_SIZE_SUBHEADER: 12,
  FONT_SIZE_BODY: 11,

  // Standard column widths (in characters)
  COLUMN_WIDTH_ID: 12,
  COLUMN_WIDTH_PRIORITY: 8,
  COLUMN_WIDTH_STATUS: 15,
  COLUMN_WIDTH_DATE: 12,
  COLUMN_WIDTH_NUMBER: 10,
};
