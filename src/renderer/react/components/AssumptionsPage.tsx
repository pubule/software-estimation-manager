/**
 * AssumptionsPage - Pagina React per gestione assumptions
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic (tutto in AssumptionsActions)
 * - useStore per lettura state
 * - useAssumptionsActions per operazioni
 */

import React, { useEffect, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useAssumptionsActions } from '../hooks/useAssumptionsActions';
import AssumptionModal from './AssumptionModal';
import AssumptionTable from './AssumptionTable';

interface AssumptionsPageProps {
  // Props interface se necessarie
}

const AssumptionsPage: React.FC<AssumptionsPageProps> = () => {
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const currentProject = useStore(state => state.currentProject);
  const assumptions = useStore(state => state.currentProject?.assumptions || []);
  const assumptionsData = useStore(state => state.assumptionsData);
  const filters = useStore(state => state.assumptionsData?.filters || { search: '', type: '', impact: '' });
  const modalState = useStore(state => state.assumptionsData?.modalState || { isOpen: false, mode: 'add', selectedAssumption: null });

  // Actions per operazioni business (attraverso hook)
  const actions = useAssumptionsActions();
  
  // Computed values per UI (derived state)
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

  // Handler eventi (SOLO chiamate ad Actions)
  const handleAddClick = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.openAddAssumptionModal();
  };

  const handleEditClick = (assumption: any) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.openEditAssumptionModal(assumption);
  };

  const handleDuplicateClick = (assumptionId: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.duplicateAssumption(assumptionId);
  };

  const handleDeleteClick = (assumptionId: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.deleteAssumption(assumptionId);
  };

  const handleSearchChange = (search: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.applyFilters({ ...filters, search });
  };

  const handleTypeFilterChange = (type: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.applyFilters({ ...filters, type });
  };

  const handleImpactFilterChange = (impact: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.applyFilters({ ...filters, impact });
  };

  const handleResetFilters = () => {
    // MAI business logic qui! Solo chiamata ad Actions
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
        <button 
          className="btn btn-primary btn-add-assumption"
          onClick={handleAddClick}
          title="Add New Assumption"
        >
          <i className="fas fa-plus"></i> Add Assumption
        </button>
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

        {(filters.search || filters.type || filters.impact) && (
          <button 
            className="btn-clear-filters"
            onClick={handleResetFilters}
            title="Clear filters"
          >
            <i className="fas fa-times"></i> Clear
          </button>
        )}
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