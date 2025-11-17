import React, { useState, useEffect } from 'react';
import Button from './Button';
import ProjectItem from './ProjectItem';
import { projectActions, RecentProject } from '../actions/ProjectsActions';

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

  // Setup data loading through Actions - NO business logic in component  
  useEffect(() => {
    const loadData = async () => {
      const projects = await projectActions.loadRecentProjects();
      setRecentProjects(projects);
    };

    loadData();

    // Setup event listeners using Actions
    const cleanup = projectActions.setupStorageListeners(loadData);
    return cleanup;
  }, []);

  const handleLoadProject = (project: RecentProject) => {
    onLoadProject(project.id);
  };

  const handleRemoveProject = (project: RecentProject) => {
    onRemoveProject(project.id);
  };

  // Get display projects using Actions business logic
  const displayProjects = projectActions.getDisplayRecentProjects(recentProjects, 2);

  return (
    <div className="recent-projects-section">
      <div className="section-header">
        <h3>Recent Projects</h3>
        <Button
          variant="secondary"
          size="small"
          id="clear-recent-btn"
          onClick={onClearRecent}
          icon={<i className="fas fa-trash" />}
        >
          Clear Recent
        </Button>
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