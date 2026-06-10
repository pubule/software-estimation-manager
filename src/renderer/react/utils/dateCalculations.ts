/**
 * Date Calculations Utilities
 * Handles working day calculations, date cascading, and Italian holiday management
 * Used by AssignmentModal and other components for scheduling allocations
 */

/**
 * Check if a date is a working day
 * Excludes weekends (Saturday, Sunday) and optionally Italian national holidays
 *
 * @param date - Date to check
 * @param workingDaysCalculator - Optional WorkingDaysCalculator singleton for holiday checking
 * @returns true if date is a working day, false otherwise
 */
export function isWorkingDay(
  date: Date,
  workingDaysCalculator?: any
): boolean {
  const dayOfWeek = date.getDay();

  // Weekend check (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Holiday check using singleton instance if available
  if (workingDaysCalculator) {
    try {
      return !workingDaysCalculator.isNationalHoliday(date, 'IT');
    } catch (error) {
      if (import.meta.env.DEV) console.warn('isNationalHoliday check failed:', error);
    }
  }

  // Fallback: only exclude weekends
  return true;
}

/**
 * Get the next working day after a given date
 * Skips weekends and Italian holidays
 *
 * @param date - Starting date
 * @param workingDaysCalculator - Optional WorkingDaysCalculator singleton
 * @returns Date object for the next working day
 *
 * @example
 * const tomorrow = new Date('2024-11-18'); // Monday
 * const nextDay = getNextWorkingDay(tomorrow); // Returns 2024-11-19 (Tuesday)
 *
 * const friday = new Date('2024-11-22'); // Friday
 * const nextDay = getNextWorkingDay(friday); // Returns 2024-11-25 (Monday, skips weekend)
 */
export function getNextWorkingDay(
  date: Date,
  workingDaysCalculator?: any
): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);

  while (!isWorkingDay(next, workingDaysCalculator)) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Calculate end date from start date + number of man days
 * Counts only working days (M-F, excluding Italian holidays)
 *
 * @param startDateStr - Start date in YYYY-MM-DD format
 * @param estimatedMDs - Number of man days (working days) needed
 * @param workingDaysCalculator - Optional WorkingDaysCalculator singleton for holiday checking
 * @returns End date in YYYY-MM-DD format, or empty string if invalid input
 *
 * @example
 * // 5 MDs starting Monday
 * const endDate = calculateEndDateFromMDs('2024-11-18', 5);
 * // Returns '2024-11-22' (Friday of same week)
 *
 * // 1 MD = same day
 * const endDate = calculateEndDateFromMDs('2024-11-18', 1);
 * // Returns '2024-11-18'
 *
 * // 0 MDs = start date
 * const endDate = calculateEndDateFromMDs('2024-11-18', 0);
 * // Returns '2024-11-18'
 */
export function calculateEndDateFromMDs(
  startDateStr: string,
  estimatedMDs: number,
  workingDaysCalculator?: any
): string {
  if (!startDateStr || estimatedMDs < 0) {
    return '';
  }

  // Special case: 0 or 1 MD means start date = end date
  if (estimatedMDs <= 1) {
    return startDateStr;
  }

  const startDate = new Date(startDateStr);
  let current = new Date(startDate);
  let workingDaysCount = 0;

  // Count working days until we reach estimatedMDs
  while (workingDaysCount < estimatedMDs) {
    if (isWorkingDay(current, workingDaysCalculator)) {
      workingDaysCount++;
      if (workingDaysCount === estimatedMDs) {
        break;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  // Return in YYYY-MM-DD format
  return current.toISOString().split('T')[0];
}

/**
 * Count working days between two dates (inclusive)
 * Useful for capacity calculations and validation
 *
 * @param startDateStr - Start date in YYYY-MM-DD format
 * @param endDateStr - End date in YYYY-MM-DD format
 * @param workingDaysCalculator - Optional WorkingDaysCalculator singleton
 * @returns Number of working days between dates (inclusive)
 *
 * @example
 * const days = countWorkingDays('2024-11-18', '2024-11-22');
 * // Returns 5 (Monday through Friday)
 *
 * const days = countWorkingDays('2024-11-22', '2024-11-25');
 * // Returns 1 (Monday only, skips weekend)
 */
export function countWorkingDays(
  startDateStr: string,
  endDateStr: string,
  workingDaysCalculator?: any
): number {
  if (!startDateStr || !endDateStr) {
    return 0;
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Ensure start <= end
  if (startDate > endDate) {
    return 0;
  }

  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current, workingDaysCalculator)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Parse date string in YYYY-MM-DD format to Date object
 * Handles timezone issues by treating as UTC
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object, or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const [year, month, day] = dateStr.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  // Create date at UTC midnight to avoid timezone issues
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format date to YYYY-MM-DD string
 * Always uses UTC to avoid timezone issues
 *
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  // Use UTC methods to avoid timezone conversions
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get year and month from date string
 * Useful for monthly allocation breakdown
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Object with year and month properties, or null if invalid
 *
 * @example
 * const ym = getYearMonth('2024-11-18');
 * // Returns { year: 2024, month: '2024-11' }
 */
export function getYearMonth(dateStr: string): { year: number; month: string } | null {
  if (!dateStr) {
    return null;
  }

  const [year, month] = dateStr.split('-');

  if (!year || !month) {
    return null;
  }

  return {
    year: Number(year),
    month: `${year}-${month}`
  };
}

/**
 * Get all months between two dates
 * Useful for allocation distribution across months
 *
 * @param startDateStr - Start date in YYYY-MM-DD format
 * @param endDateStr - End date in YYYY-MM-DD format
 * @returns Array of month strings in YYYY-MM format, sorted ascending
 *
 * @example
 * const months = getMonthRange('2024-11-18', '2025-01-15');
 * // Returns ['2024-11', '2024-12', '2025-01']
 */
export function getMonthRange(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr || !endDateStr) {
    return [];
  }

  const months = new Set<string>();
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);

  if (!startDate || !endDate || startDate > endDate) {
    return [];
  }

  let current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    months.add(`${year}-${month}`);

    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return Array.from(months).sort();
}

/**
 * Cascade recalculation helper
 * When a phase's date changes, recalculates dates for that and all subsequent phases
 *
 * Useful pattern:
 * 1. Phase 1 end date changes
 * 2. Phase 2 start = next working day after Phase 1 end
 * 3. Phase 2 end = Phase 2 start + Phase 2 total MDs
 * 4. Phase 3 start = next working day after Phase 2 end
 * ... and so on
 *
 * @param phases - Array of phases with startDate, endDate, phaseTotalMDs
 * @param changedPhaseIndex - Index of the phase that changed
 * @param changedField - Which field changed (startDate, endDate, or allocatedMDs)
 * @param workingDaysCalculator - Optional WorkingDaysCalculator singleton
 * @returns Updated phases array with cascaded dates
 */
export function cascadeRecalculatePhaseDates(
  phases: Array<{
    phaseId: string;
    phaseName: string;
    phaseTotalMDs: number;
    startDate: string;
    endDate: string;
    [key: string]: any;
  }>,
  changedPhaseIndex: number,
  changedField: 'startDate' | 'endDate' | 'allocatedMDs',
  workingDaysCalculator?: any
): Array<any> {
  const updated = phases.map(p => ({ ...p })); // Deep copy

  if (changedPhaseIndex < 0 || changedPhaseIndex >= updated.length) {
    return updated;
  }

  if (import.meta.env.DEV) console.log(`Cascade recalculation from phase ${changedPhaseIndex}: ${updated[changedPhaseIndex].phaseName}`);

  // Process from changed phase onwards
  for (let i = changedPhaseIndex; i < updated.length; i++) {
    const phase = updated[i];

    if (i === changedPhaseIndex) {
      // For the changed phase:
      // - If endDate was manually changed: keep it
      // - If startDate or allocatedMDs changed: recalculate endDate
      if (changedField === 'endDate') {
        if (import.meta.env.DEV) console.log(`Phase ${phase.phaseName}: endDate manually set, keeping ${phase.endDate}`);
      } else if (phase.startDate && phase.phaseTotalMDs >= 0) {
        const newEndDate = calculateEndDateFromMDs(phase.startDate, phase.phaseTotalMDs, workingDaysCalculator);
        if (import.meta.env.DEV) console.log(`Phase ${phase.phaseName}: endDate ${phase.endDate} -> ${newEndDate} (using phaseTotalMDs: ${phase.phaseTotalMDs})`);
        phase.endDate = newEndDate;
      }
    } else {
      // For subsequent phases: cascade dates
      const prevPhase = updated[i - 1];

      if (prevPhase && prevPhase.endDate) {
        const prevEndDate = parseDate(prevPhase.endDate);
        if (prevEndDate) {
          const nextStart = getNextWorkingDay(prevEndDate, workingDaysCalculator);
          const newStartDate = formatDate(nextStart);

          if (import.meta.env.DEV) console.log(`Phase ${phase.phaseName}: startDate ${phase.startDate} -> ${newStartDate}`);
          phase.startDate = newStartDate;

          // End = start + phaseTotalMDs
          if (phase.phaseTotalMDs >= 0) {
            const newEndDate = calculateEndDateFromMDs(phase.startDate, phase.phaseTotalMDs, workingDaysCalculator);
            if (import.meta.env.DEV) console.log(`Phase ${phase.phaseName}: endDate ${phase.endDate} -> ${newEndDate} (using phaseTotalMDs: ${phase.phaseTotalMDs})`);
            phase.endDate = newEndDate;
          }
        }
      }
    }
  }

  if (import.meta.env.DEV) console.log('Cascade recalculation complete');
  return updated;
}
