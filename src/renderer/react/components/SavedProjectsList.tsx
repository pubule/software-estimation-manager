import React, { useState, useEffect, useCallback } from 'react';
import ProjectItem from './ProjectItem';
import { projectActions, SavedProject } from '../actions/ProjectsActions';

interface SavedProjectsListProps {
  onLoadProject: (filePath: string) => void;
  onExportProject: (filePath: string) => void;
  onDeleteProject: (filePath: string) => void;
}

const SavedProjectsList: React.FC<SavedProjectsListProps> = ({
  onLoadProject,
  onExportProject,
  onDeleteProject
}) => {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved projects using Actions - NO business logic in component
  const loadSavedProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const projects = await projectActions.loadSavedProjects();
    setSavedProjects(projects);
    setIsLoading(false);
  }, []);

  // Auto-load projects on mount using Actions
  useEffect(() => {
    loadSavedProjects();
  }, [loadSavedProjects]);

  // Setup event listeners using Actions
  useEffect(() => {
    const cleanup = projectActions.setupStorageListeners(() => {
      loadSavedProjects();
    });
    
    return cleanup;
  }, [loadSavedProjects]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await projectActions.refreshSavedProjects();
    await loadSavedProjects();
  };

  const handleLoadProject = (project: SavedProject) => {
    onLoadProject(project.filePath);
  };

  const handleExportProject = (project: SavedProject) => {
    onExportProject(project.filePath);
  };

  const handleDeleteProject = (project: SavedProject) => {
    onDeleteProject(project.filePath);
  };

  return (
    <div className="saved-projects-section">
      <div className="section-header">
        <h3>Saved Projects</h3>
        <button 
          className="btn btn-small btn-secondary" 
          id="refresh-projects-btn"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i> 
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <div id="saved-projects-list" className="projects-list">
        {isLoading && savedProjects.length === 0 ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading projects...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Error loading projects</p>
            <small>{error}</small>
            <button 
              className="btn btn-small btn-primary" 
              onClick={handleRefresh}
              style={{ marginTop: '8px' }}
            >
              Retry
            </button>
          </div>
        ) : savedProjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-save"></i>
            <p>No saved projects found</p>
            <small>Save some projects first or check your projects folder configuration</small>
          </div>
        ) : (
          savedProjects.map(project => (
            <ProjectItem
              key={project.filePath}
              project={project}
              type="saved"
              onLoad={handleLoadProject}
              onExport={handleExportProject}
              onDelete={handleDeleteProject}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SavedProjectsList;