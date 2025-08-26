import React, { useState, useEffect } from 'react';
import ProjectItem from './ProjectItem';

interface RecentProject {
  id: string;
  name: string;
  version: string;
  lastOpened: string;
  filePath?: string;
}

interface RecentProjectsListProps {
  onLoadProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onClearRecent: () => void;
}

const RecentProjectsList: React.FC<RecentProjectsListProps> = ({
  onLoadProject,
  onRemoveProject,
  onClearRecent
}) => {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  // Load recent projects from localStorage - replicating ProjectManager.js line 1237
  useEffect(() => {
    const loadRecentProjects = () => {
      try {
        const data = localStorage.getItem('recent-projects');
        const projects = data ? JSON.parse(data) : [];
        setRecentProjects(projects);
      } catch (error) {
        console.error('Failed to load recent projects:', error);
        setRecentProjects([]);
      }
    };

    loadRecentProjects();

    // Listen for storage changes to keep in sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recent-projects') {
        loadRecentProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from the project manager
    const handleRecentProjectsUpdate = () => {
      loadRecentProjects();
    };

    window.addEventListener('recent-projects-updated', handleRecentProjectsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('recent-projects-updated', handleRecentProjectsUpdate);
    };
  }, []);

  const handleLoadProject = (project: RecentProject) => {
    onLoadProject(project.id);
  };

  const handleRemoveProject = (project: RecentProject) => {
    onRemoveProject(project.id);
  };

  // Show only first 2 projects as in original implementation (line 1456)
  const displayProjects = recentProjects.slice(0, 2);

  return (
    <div className="recent-projects-section">
      <div className="section-header">
        <h3>Recent Projects</h3>
        <button 
          className="btn btn-small btn-secondary" 
          id="clear-recent-btn"
          onClick={onClearRecent}
        >
          <i className="fas fa-trash"></i> Clear Recent
        </button>
      </div>
      <div id="recent-projects-list" className="projects-list">
        {displayProjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-history"></i>
            <p>No recent projects</p>
          </div>
        ) : (
          displayProjects.map(project => (
            <ProjectItem
              key={project.id}
              project={project}
              type="recent"
              onLoad={handleLoadProject}
              onRemove={handleRemoveProject}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default RecentProjectsList;