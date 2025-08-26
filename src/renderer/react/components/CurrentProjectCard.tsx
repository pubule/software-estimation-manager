import React from 'react';
import { useStore } from '../hooks/useStore';

interface CurrentProjectCardProps {
  onSave: () => void;
  onClose: () => void;
}

// Helper function to format date
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const CurrentProjectCard: React.FC<CurrentProjectCardProps> = ({
  onSave,
  onClose
}) => {
  const { currentProject, isDirty } = useStore(state => ({
    currentProject: state.currentProject,
    isDirty: state.isDirty
  }));

  // Check if we have a really loaded project (not just the default "New Project")
  // Simplified and more robust logic
  const project = currentProject?.project;
  const app = (window as any).app;
  
  // Multiple ways to detect a loaded project (more robust)
  const hasValidProject = project && project.name && project.name !== 'New Project';
  const hasProjectPath = !!app?.dataManager?.currentProjectPath;
  const hasProjectId = !!project?.id;
  const hasFeatures = Array.isArray(currentProject?.features);
  
  // A project is considered loaded if it has a valid name AND either a path or features
  const hasLoadedProject = hasValidProject && (hasProjectPath || hasFeatures || hasProjectId);
  
  // Enhanced debug logging
  console.log('🔍 CurrentProjectCard - Debug Info:');
  console.log('  - hasCurrentProject:', !!currentProject);
  console.log('  - project?.name:', project?.name);
  console.log('  - project?.id:', project?.id);
  console.log('  - currentProjectPath:', app?.dataManager?.currentProjectPath);
  console.log('  - features count:', currentProject?.features?.length || 0);
  console.log('  - hasLoadedProject:', hasLoadedProject);
  console.log('  - isDirty:', isDirty);
  console.log('  - detection breakdown:');
  console.log('    * hasValidProject:', hasValidProject);
  console.log('    * hasProjectPath:', hasProjectPath);
  console.log('    * hasProjectId:', hasProjectId);
  console.log('    * hasFeatures:', hasFeatures);

  const projectName = hasLoadedProject ? project.name : 'No Project Loaded';
  const projectCreated = hasLoadedProject ? formatDate(project.created) : '-';
  const projectModified = hasLoadedProject ? formatDate(project.lastModified) : '-';
  const projectVersion = hasLoadedProject ? project.version : '-';

  // Button states replicating logic from ProjectManager.js line 1422
  const saveDisabled = !hasLoadedProject || !isDirty;
  const closeDisabled = !hasLoadedProject;

  return (
    <div className="current-project-section">
      <div className="section-header">
        <h3>Current Project</h3>
      </div>
      <div className="current-project-card" id="current-project-card">
        <div className="project-info">
          <h4 id="current-project-name">{projectName}</h4>
          <div className="project-details">
            <span className="project-detail">
              <i className="fas fa-calendar"></i>
              <span id="current-project-created">{projectCreated}</span>
            </span>
            <span className="project-detail">
              <i className="fas fa-edit"></i>
              <span id="current-project-modified">{projectModified}</span>
            </span>
            <span className="project-detail">
              <i className="fas fa-code-branch"></i>
              <span id="current-project-version">{projectVersion}</span>
            </span>
          </div>
        </div>
        <div className="project-actions">
          <button 
            className={`btn btn-small ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
            id="save-current-project-btn" 
            disabled={saveDisabled}
            onClick={onSave}
          >
            <i className="fas fa-save"></i> Save
          </button>
          <button 
            className="btn btn-small btn-secondary" 
            id="close-current-project-btn" 
            disabled={closeDisabled}
            onClick={onClose}
          >
            <i className="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurrentProjectCard;