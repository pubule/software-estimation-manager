/**
 * VersionFilters - Filtri React per Version History
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers da VersionHistoryPage
 */

import React from 'react';

interface VersionFilters {
  dateRange: string;
  reason: string;
}

interface VersionFiltersProps {
  filters: VersionFilters;
  onFilterChange: (newFilters: Partial<VersionFilters>) => void;
  onResetFilters: () => void;
}

const VersionFilters: React.FC<VersionFiltersProps> = ({ 
  filters, 
  onFilterChange, 
  onResetFilters 
}) => {

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ dateRange: e.target.value });
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ reason: e.target.value });
  };

  const hasActiveFilters = filters.dateRange || filters.reason;

  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label>Date Range:</label>
        <select 
          value={filters.dateRange} 
          onChange={handleDateRangeChange}
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Reason:</label>
        <input
          type="text"
          value={filters.reason}
          onChange={handleReasonChange}
          placeholder="Search in reason..."
          className="filter-input"
        />
      </div>

      {hasActiveFilters && (
        <div className="filter-actions">
          <button 
            className="btn btn-small btn-secondary"
            onClick={onResetFilters}
            title="Clear all filters"
          >
            <i className="fas fa-times"></i> Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionFilters;