import React from 'react';

export interface TableSkeletonProps {
  /**
   * Number of rows to display
   * @default 6
   */
  rowCount?: number;

  /**
   * Number of columns to display
   * @default 4
   */
  columnCount?: number;

  /**
   * Whether to show header row
   * @default true
   */
  showHeader?: boolean;

  /**
   * Custom class name for the skeleton container
   */
  className?: string;
}

/**
 * Skeleton loader for tables. Displays placeholder rows while data is loading.
 * Used to provide a smooth visual experience during data fetching.
 * WCAG AA compliant with proper ARIA attributes.
 *
 * @example
 * {isLoading ? (
 *   <TableSkeleton rowCount={8} columnCount={5} />
 * ) : (
 *   <table>...</table>
 * )}
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rowCount = 6,
  columnCount = 4,
  showHeader = true,
  className
}) => {
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  const cols = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <div
      className={`table-skeleton-container ${className || ''}`}
      role="status"
      aria-label="Loading table data"
      aria-busy="true"
    >
      <table className="table-skeleton">
        {showHeader && (
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={`header-${col}`}>
                  <div className="skeleton-line skeleton-header"></div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row) => (
            <tr key={`row-${row}`}>
              {cols.map((col) => (
                <td key={`cell-${row}-${col}`}>
                  <div className="skeleton-line"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
