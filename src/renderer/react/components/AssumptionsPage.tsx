/**
 * AssumptionsPage - React page for assumptions management
 *
 * REQUIRED PATTERN: State/Actions/Dispatcher
 * - Presentation and UI only
 * - Zero business logic (all in AssumptionsActions)
 * - useStore for reading state
 * - useAssumptionsActions for operations
 */

import React, { useEffect, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useAssumptionsActions } from '../hooks/useAssumptionsActions';
import AssumptionModal from './AssumptionModal';
import AssumptionTable from './AssumptionTable';
import Button from './Button';

const AssumptionsPage: React.FC = () => {
  // Read-only from store - Specific selectors for maximum reactivity
  const currentProject = useStore(state => state.currentProject);
  const assumptions = useStore(state => state.currentProject?.assumptions || []);
  const assumptionsData = useStore(state => state.assumptionsData);
  const filters = useStore(state => state.assumptionsData?.filters || { search: '', type: '', impact: '' });
  const modalState = useStore(state => state.assumptionsData?.modalState || { isOpen: false, mode: 'add', selectedAssumption: null });

  // Actions for business operations (via hook)
  const actions = useAssumptionsActions();

  // Computed values for UI (derived state)
  const filteredAssumptions = useMemo(() => {
    return actions.getFilteredAssumptions();
  }, [assumptions, filters, actions]);
  
  const summaryStats = useMemo(() => {
    return actions.getSummaryStats();
  }, [filteredAssumptions, actions]);
  
  const uniqueTypes = useMemo(() => {
    const types = new Set(assumptions.map(a => a.type));
    return Array.from(types);
  }, [assumptions]);
  
  const uniqueImpacts = useMemo(() => {
    return ['High', 'Medium', 'Low'];
  }, []);

  // Event handlers (Actions calls only)
  const handleAddClick = () => {
    // No business logic here! Actions call only
    actions.openAddAssumptionModal();
  };

  const handleEditClick = (assumption: any) => {
    // No business logic here! Actions call only
    actions.openEditAssumptionModal(assumption);
  };

  const handleDuplicateClick = (assumptionId: string) => {
    // No business logic here! Actions call only
    actions.duplicateAssumption(assumptionId);
  };

  const handleDeleteClick = (assumptionId: string) => {
    // No business logic here! Actions call only
    actions.deleteAssumption(assumptionId);
  };

  const handleSearchChange = (search: string) => {
    // No business logic here! Actions call only
    actions.applyFilters({ ...filters, search });
  };

  const handleTypeFilterChange = (type: string) => {
    // No business logic here! Actions call only
    actions.applyFilters({ ...filters, type });
  };

  const handleImpactFilterChange = (impact: string) => {
    // No business logic here! Actions call only
    actions.applyFilters({ ...filters, impact });
  };

  const handleResetFilters = () => {
    // No business logic here! Actions call only
    actions.resetFilters();
  };

  // No project state
  if (!currentProject) {
    return (
      <div className="assumptions-page">
        <div className="empty-state">
          <i className="fas fa-clipboard-list"></i>
          <h3>No Project Loaded</h3>
          <p>Please load or create a project to manage assumptions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assumptions-page">
      {/* Header Section */}
      <div className="assumptions-header">
        <h1 className="page-title">Project Assumptions</h1>
        <Button
          variant="primary"
          onClick={handleAddClick}
          title="Add New Assumption"
          icon={<i className="fas fa-plus" />}
        >
          Add Assumption
        </Button>
      </div>

      {/* Filters Section */}
      <div className="assumptions-filters">
        <div className="filter-group search-group">
          <label htmlFor="assumptions-search">Search:</label>
          <input
            id="assumptions-search"
            type="text"
            placeholder="Search assumptions..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="type-filter">TYPE:</label>
          <select
            id="type-filter"
            value={filters.type}
            onChange={(e) => handleTypeFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="impact-filter">IMPACT:</label>
          <select
            id="impact-filter"
            value={filters.impact}
            onChange={(e) => handleImpactFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Impacts</option>
            {uniqueImpacts.map(impact => (
              <option key={impact} value={impact}>{impact}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="assumptions-content">
        <AssumptionTable
          assumptions={filteredAssumptions}
          onEdit={handleEditClick}
          onDuplicate={handleDuplicateClick}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Footer Stats */}
      <div className="assumptions-footer">
        <div className="footer-stats">
          <span>Total Assumptions: <strong>{summaryStats.total}</strong></span>
          <span>High Impact: <strong>{summaryStats.high}</strong></span>
          <span>Medium Impact: <strong>{summaryStats.medium}</strong></span>
          <span>Low Impact: <strong>{summaryStats.low}</strong></span>
        </div>
      </div>

      {/* Modal */}
      {modalState.isOpen && (
        <AssumptionModal />
      )}
    </div>
  );
};

export default AssumptionsPage;