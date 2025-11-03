import React from 'react';
import { useStore } from '../hooks/useStore';
import ApprovalStatusIcon from './ApprovalStatusIcon';

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
  const { currentProject, isDirty, approvalStatus } = useStore(state => ({
    currentProject: state.currentProject,
    isDirty: state.isDirty,
    approvalStatus: state.currentProject?.project?.approvalStatus || "Pending Approval"
  }));

  // Simplified project detection logic
  const project = currentProject?.project;
  const app = (window as any).app;

  const hasLoadedProject = project &&
    project.name &&
    project.name !== 'New Project' &&
    (app?.dataManager?.currentProjectPath || project.id || Array.isArray(currentProject?.features));


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
            {hasLoadedProject && (
              <span className="project-detail">
                <ApprovalStatusIcon status={approvalStatus} />
              </span>
            )}
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
