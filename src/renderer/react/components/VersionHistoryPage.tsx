/**
 * VersionHistoryPage - Pagina React per gestione Version History
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic (tutto in VersionHistoryActions)
 * - useStore per lettura state
 * - useVersionHistoryActions per operazioni
 */

import React, { useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useVersionHistoryActions } from '../hooks/useVersionHistoryActions';
import VersionHistoryTable from './VersionHistoryTable';
import VersionFilters from './VersionFilters';
import CreateVersionModal from './CreateVersionModal';
import VersionComparisonModal from './VersionComparisonModal';
import RestoreVersionModal from './RestoreVersionModal';

interface VersionHistoryPageProps {
  // Props interface se necessarie
}

const VersionHistoryPage: React.FC<VersionHistoryPageProps> = () => {
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const currentProject = useStore(state => state.currentProject);
  const versionHistoryData = useStore(state => state.versionHistoryData);
  const filters = useStore(state => state.versionHistoryData?.filters || { dateRange: '', reason: '' });
  const modalStates = useStore(state => state.versionHistoryData?.modalStates || {
    createModal: { isOpen: false, selectedVersion: null },
    compareModal: { isOpen: false, selectedVersion: null },
    restoreModal: { isOpen: false, selectedVersion: null }
  });
  const isLoading = useStore(state => state.versionHistoryData?.isLoading || false);

  // Actions per operazioni business (attraverso hook)
  const actions = useVersionHistoryActions();
  
  // Computed values per UI (derived state)
  const filteredVersions = actions.getFilteredVersions();

  // Handler eventi (SOLO chiamate ad Actions)
  const handleCreateVersion = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.openCreateVersionModal();
  };

  const handleCompareVersion = (versionId: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.compareVersion(versionId);
  };

  const handleRestoreVersion = (versionId: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    const version = currentProject?.versions?.find((v: any) => v.id === versionId);
    if (version) {
      actions.openRestoreModal(version);
    }
  };

  const handleDeleteVersion = (versionId: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.deleteVersion(versionId);
  };

  const handleExportVersion = (versionId: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.exportVersion(versionId);
  };

  const handleFilterChange = (newFilters: any) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.applyFilters({ ...filters, ...newFilters });
  };

  const handleResetFilters = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.resetFilters();
  };

  // No project state
  if (!currentProject) {
    return (
      <div className="version-history-page">
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-history"></i>
          </div>
          <h3>No Project Loaded</h3>
          <p>Please load or create a project to view version history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-history-page">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing version...</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="version-header">
        <div className="version-info">
          <h3>Version History</h3>
          <p className="version-subtitle">
            Project: <strong>{currentProject.project?.name || 'Unknown Project'}</strong>
            {(currentProject.versions?.length || 0) === 0 && (
              <span className="version-warning-text">
                No versions created yet
              </span>
            )}
          </p>
        </div>
        <div className="version-actions">
          <button 
            className="btn btn-primary"
            onClick={handleCreateVersion}
            disabled={isLoading}
            title="Create a new version of the current project state"
          >
            <i className="fas fa-plus"></i> Create Version
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <VersionFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* Main Content - Table */}
      <div className="version-table-container">
        <VersionHistoryTable 
          versions={filteredVersions}
          onCompare={handleCompareVersion}
          onRestore={handleRestoreVersion}
          onDelete={handleDeleteVersion}
          onExport={handleExportVersion}
          isLoading={isLoading}
        />
      </div>


      {/* Modals */}
      {modalStates.createModal?.isOpen && (
        <CreateVersionModal />
      )}

      {modalStates.compareModal?.isOpen && (
        <VersionComparisonModal />
      )}

      {modalStates.restoreModal?.isOpen && (
        <RestoreVersionModal />
      )}
    </div>
  );
};

export default VersionHistoryPage;