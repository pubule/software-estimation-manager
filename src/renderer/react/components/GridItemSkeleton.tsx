import React from 'react';

export interface GridItemSkeletonProps {
  /**
   * Number of items to display in the grid
   * @default 4
   */
  itemCount?: number;

  /**
   * CSS grid template columns value
   * @default 'repeat(auto-fit, minmax(250px, 1fr))'
   */
  gridTemplate?: string;

  /**
   * Gap between grid items
   * @default '20px'
   */
  gap?: string;

  /**
   * Number of lines to show in each card
   * @default 4
   */
  lineCount?: number;

  /**
   * Custom class name for the grid container
   */
  className?: string;
}

/**
 * Skeleton loader for grid/card layouts. Displays placeholder cards while data is loading.
 * Commonly used for dashboard cards, resource lists, and other grid-based layouts.
 * WCAG AA compliant with proper ARIA attributes.
 *
 * @example
 * {isLoading ? (
 *   <GridItemSkeleton itemCount={12} gridTemplate="repeat(4, 1fr)" />
 * ) : (
 *   <div className="grid">
 *     {items.map(item => <Card key={item.id} {...item} />)}
 *   </div>
 * )}
 */
export const GridItemSkeleton: React.FC<GridItemSkeletonProps> = ({
  itemCount = 4,
  gridTemplate = 'repeat(auto-fit, minmax(250px, 1fr))',
  gap = '20px',
  lineCount = 4,
  className
}) => {
  const items = Array.from({ length: itemCount }, (_, i) => i);
  const lines = Array.from({ length: lineCount }, (_, i) => i);

  return (
    <div
      className={`grid-skeleton-container ${className || ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        gap: gap
      }}
      role="status"
      aria-label="Loading grid items"
      aria-busy="true"
    >
      {items.map((itemIdx) => (
        <div
          key={`item-${itemIdx}`}
          className="grid-item-skeleton"
        >
          {/* Header/Title placeholder */}
          <div className="skeleton-line skeleton-header" style={{ width: '80%' }}></div>

          {/* Content lines */}
          <div style={{ marginTop: '12px' }}>
            {lines.map((lineIdx) => (
              <div
                key={`line-${itemIdx}-${lineIdx}`}
                className="skeleton-line"
                style={{
                  marginBottom: '8px',
                  width: lineIdx === lines.length - 1 ? '60%' : '100%'
                }}
              ></div>
            ))}
          </div>

          {/* Optional action button placeholder */}
          <div
            className="skeleton-line"
            style={{
              marginTop: '16px',
              width: '40%',
              height: '32px',
              borderRadius: '4px'
            }}
          ></div>
        </div>
      ))}
    </div>
  );
};

export default GridItemSkeleton;
