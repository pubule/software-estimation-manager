import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useProjectActions } from '../hooks/useProjectActions';
import { NewProjectFormData, SavedProject, projectActions } from '../actions/ProjectsActions';
import Button from './Button';
import ApprovalStatusIcon from './ApprovalStatusIcon';
import NewProjectModal from './NewProjectModal';
import LoadProjectModal from './LoadProjectModal';

type SortField = 'name' | 'modified' | 'size' | 'version';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
};

const ProjectManager: React.FC = () => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showLoadProjectModal, setShowLoadProjectModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('modified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const { currentProject, isDirty } = useStore(state => ({
    currentProject: state.currentProject,
    isDirty: state.isDirty
  }));

  const {
    createProject, loadRecentProject, loadProjectFromFile,
    saveProject, closeProject, deleteProject, exportProject,
    handleUnsavedChanges
  } = useProjectActions();

  const project = currentProject?.project;
  const app = (window as any).app;
  const hasLoadedProject = project && project.name && project.name !== 'New Project' &&
    (app?.dataManager?.currentProjectPath || project.id || Array.isArray(currentProject?.features));

  const loadSavedProjects = useCallback(async () => {
    setIsLoading(true);
    const projects = await projectActions.loadSavedProjects();
    setSavedProjects(projects);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadSavedProjects(); }, [loadSavedProjects]);

  useEffect(() => {
    const cleanup = projectActions.setupStorageListeners(() => { loadSavedProjects(); });
    return cleanup;
  }, [loadSavedProjects]);

  const recentProjectIds = useMemo(() => {
    try {
      const stored = localStorage.getItem('recent-projects');
      if (!stored) return new Set<string>();
      const recents = JSON.parse(stored);
      return new Set<string>(recents.map((r: any) => r.id));
    } catch { return new Set<string>(); }
  }, [savedProjects]);

  const filteredAndSorted = useMemo(() => {
    let list = [...savedProjects];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const name = (p.project?.name || p.fileName || '').toLowerCase();
        const code = (p.project?.id || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.project?.name || '').localeCompare(b.project?.name || '');
          break;
        case 'modified':
          cmp = new Date(a.lastModified || 0).getTime() - new Date(b.lastModified || 0).getTime();
          break;
        case 'size':
          cmp = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'version':
          cmp = (a.project?.version || '').localeCompare(b.project?.version || '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [savedProjects, searchQuery, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const paginatedProjects = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const handleNewProject = async () => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Creating a new project will discard them. Continue?');
      if (!confirmed) return;
    }
    setShowNewProjectModal(true);
  };

  const handleCreateProject = async (formData: NewProjectFormData) => {
    try {
      await createProject(formData);
      setShowNewProjectModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const handleLoadFromFile = async (projectData: any) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      await loadProjectFromFile(projectData);
      setShowLoadProjectModal(false);
    } catch (error) {
      console.error('Failed to load project from file:', error);
      throw error;
    }
  };

  const handleLoadRecentProject = async (projectId: string) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      await loadRecentProject(projectId);
      setShowLoadProjectModal(false);
    } catch (error) {
      console.error('Failed to load recent project:', error);
      throw error;
    }
  };

  const handleLoadSavedProject = async (filePath: string) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      await loadProjectFromFile(filePath);
    } catch (error) {
      console.error('Failed to load saved project:', error);
    }
  };

  const handleExportProject = async (filePath: string) => {
    try {
      await exportProject(filePath);
    } catch (error) {
      console.error('Failed to export project:', error);
    }
  };

  const handleDeleteProject = async (filePath: string) => {
    try {
      await deleteProject(filePath);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await projectActions.refreshSavedProjects();
    await loadSavedProjects();
  };

  const isCurrentProject = (p: SavedProject) => {
    if (!hasLoadedProject || !project) return false;
    return p.project?.id === project.id || p.project?.name === project.name;
  };

  return (
    <>
      <div className="page-header">
        <h2>Projects <span className="pm-project-count">({savedProjects.length})</span></h2>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => setShowLoadProjectModal(true)}
            icon={<i className="fas fa-folder-open" />}>Load Project</Button>
          <Button variant="primary" onClick={handleNewProject}
            icon={<i className="fas fa-plus" />}>New Project</Button>
        </div>
      </div>

      <div className="pm-search-bar">
        <div className="pm-search-input-wrapper">
          <i className="fas fa-search pm-search-icon"></i>
          <input
            type="text"
            className="pm-search-input"
            placeholder="Search projects by name or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="pm-search-clear" onClick={() => setSearchQuery('')}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <select className="pm-sort-select" value={`${sortField}-${sortDirection}`}
          onChange={e => {
            const [f, d] = e.target.value.split('-');
            setSortField(f as SortField);
            setSortDirection(d as SortDirection);
          }}>
          <option value="modified-desc">Sort: Most Recent</option>
          <option value="modified-asc">Sort: Oldest</option>
          <option value="name-asc">Sort: Name A-Z</option>
          <option value="name-desc">Sort: Name Z-A</option>
          <option value="size-desc">Sort: Largest</option>
          <option value="size-asc">Sort: Smallest</option>
        </select>
        <Button variant="secondary" size="small" onClick={handleRefresh}
          disabled={isLoading} loading={isLoading}
          icon={!isLoading ? <i className="fas fa-sync" /> : undefined}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="pm-stats-bar">
        <span className="pm-stat-chip"><strong>{savedProjects.length}</strong> total</span>
        {searchQuery && (
          <span className="pm-stat-chip"><strong>{filteredAndSorted.length}</strong> matching</span>
        )}
        {hasLoadedProject && (
          <span className="pm-stat-chip pm-stat-current">
            <i className="fas fa-circle" style={{ fontSize: '8px', color: 'var(--success)' }}></i>
            <strong>{project?.name}</strong> loaded
            {isDirty && <span className="pm-unsaved-dot" title="Unsaved changes">●</span>}
          </span>
        )}
      </div>

      {hasLoadedProject && (
        <div className="pm-current-bar">
          <div className="pm-current-info">
            <i className="fas fa-project-diagram" style={{ color: 'var(--success)' }}></i>
            <strong>{project?.name}</strong>
            <span className="pm-current-meta">
              {project?.id && <code>{project.id}</code>}
              <span className="pm-badge pm-badge-version">{project?.version || 'v1.0.0'}</span>
              <ApprovalStatusIcon status={project?.approvalStatus || 'Pending Approval'} />
            </span>
          </div>
          <div className="pm-current-actions">
            <Button variant={isDirty ? 'primary' : 'secondary'} size="small"
              disabled={!isDirty} onClick={() => saveProject()}
              icon={<i className="fas fa-save" />}>Save</Button>
            <Button variant="secondary" size="small" onClick={() => closeProject()}
              icon={<i className="fas fa-times" />}>Close</Button>
          </div>
        </div>
      )}

      <div className="pm-table-container">
        {isLoading && savedProjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading projects...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-search"></i>
            <p>{searchQuery ? 'No projects match your search' : 'No saved projects found'}</p>
            <small>{searchQuery ? 'Try a different search term' : 'Create a new project to get started'}</small>
          </div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th className="pm-th-sortable" onClick={() => { setSortField('name'); setSortDirection(d => sortField === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                  aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Project Name{sortIndicator('name')}
                </th>
                <th>Code</th>
                <th className="pm-th-sortable" onClick={() => { setSortField('version'); setSortDirection(d => sortField === 'version' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                  aria-sort={sortField === 'version' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Version{sortIndicator('version')}
                </th>
                <th className="pm-th-sortable" onClick={() => { setSortField('modified'); setSortDirection(d => sortField === 'modified' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
                  aria-sort={sortField === 'modified' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Last Modified{sortIndicator('modified')}
                </th>
                <th className="pm-th-sortable" onClick={() => { setSortField('size'); setSortDirection(d => sortField === 'size' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
                  aria-sort={sortField === 'size' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Size{sortIndicator('size')}
                </th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map(p => {
                const isCurrent = isCurrentProject(p);
                const isRecent = recentProjectIds.has(p.project?.id);
                return (
                  <tr key={p.filePath}
                    className={`pm-row ${isCurrent ? 'pm-row-current' : ''}`}
                    onDoubleClick={() => handleLoadSavedProject(p.filePath)}>
                    <td>
                      <div className="pm-project-name">
                        {p.project?.name || p.fileName}
                        {isCurrent && <span className="pm-indicator-current" title="Currently loaded">●</span>}
                        {isRecent && !isCurrent && <span className="pm-indicator-recent" title="Recently opened">◆</span>}
                      </div>
                    </td>
                    <td>
                      <code className="pm-code">{p.project?.id || '—'}</code>
                    </td>
                    <td>
                      <span className="pm-badge pm-badge-version">{p.project?.version || '-'}</span>
                    </td>
                    <td className="pm-date-cell">
                      {formatDate(p.lastModified)}
                    </td>
                    <td className="pm-size-cell">
                      {formatFileSize(p.fileSize)}
                    </td>
                    <td className="pm-actions-cell">
                      <button className="pm-icon-btn" title="Open"
                        onClick={() => handleLoadSavedProject(p.filePath)}>
                        <i className="fas fa-folder-open"></i>
                      </button>
                      <button className="pm-icon-btn" title="Export"
                        onClick={() => handleExportProject(p.filePath)}>
                        <i className="fas fa-download"></i>
                      </button>
                      <button className="pm-icon-btn pm-icon-btn-danger" title="Delete"
                        onClick={() => handleDeleteProject(p.filePath)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pm-pagination">
          <span className="pm-pagination-info">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} of {filteredAndSorted.length}
          </span>
          <div className="pm-pagination-controls">
            <button className="pm-page-btn" disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page}
                className={`pm-page-btn ${page === currentPage ? 'pm-page-btn-active' : ''}`}
                onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
            <button className="pm-page-btn" disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
      />
      <LoadProjectModal
        isOpen={showLoadProjectModal}
        onClose={() => setShowLoadProjectModal(false)}
        onLoadFromFile={handleLoadFromFile}
        onLoadRecentProject={handleLoadRecentProject}
      />
    </>
  );
};

export default ProjectManager;
