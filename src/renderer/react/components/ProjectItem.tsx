import React from 'react';
import ApprovalStatusIcon from './ApprovalStatusIcon';

interface BaseProject {
  id: string;
  name: string;
  version: string;
}

interface RecentProject extends BaseProject {
  lastOpened: string;
  filePath?: string;
  approvalStatus?: string;
}

interface SavedProject {
  filePath: string;
  fileName: string;
  project: BaseProject & {
    lastModified: string;
    approvalStatus?: string;
  };
  fileSize: number;
  lastModified: string;
}

interface ProjectItemProps {
  project: RecentProject | SavedProject;
  type: 'recent' | 'saved';
  onLoad: (project: RecentProject | SavedProject) => void;
  onRemove?: (project: RecentProject | SavedProject) => void;
  onExport?: (project: SavedProject) => void;
  onDelete?: (project: SavedProject) => void;
}

// Helper function to escape HTML - replicating Helpers.escapeHtml
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Helper function to format date - replicating Helpers.formatDate
const formatDate = (dateString: string): string => {
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
    return dateString;
  }
};

// Helper function to format bytes - replicating Helpers.formatBytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  type,
  onLoad,
  onRemove,
  onExport,
  onDelete
}) => {
  const handleAction = (action: string) => {
    switch (action) {
      case 'load':
        onLoad(project);
        break;
      case 'remove':
        if (onRemove) onRemove(project);
        break;
      case 'export':
        if (onExport && type === 'saved') onExport(project as SavedProject);
        break;
      case 'delete':
        if (onDelete && type === 'saved') onDelete(project as SavedProject);
        break;
    }
  };

  if (type === 'recent') {
    const recentProject = project as RecentProject;
    return (
      <div className="project-item" data-project-id={recentProject.id}>
        <div className="project-icon">
          <i className="fas fa-file-alt"></i>
        </div>
        <div className="project-info">
          <h4 className="project-name" dangerouslySetInnerHTML={{ __html: escapeHtml(recentProject.name) }} />
          <div className="project-meta-row">
            <span className="project-version">v{recentProject.version}</span>
            <span className="project-date">
              <i className="fas fa-eye"></i> {formatDate(recentProject.lastOpened)}
            </span>
            <span className="project-detail">
              <ApprovalStatusIcon status={recentProject.approvalStatus || "Pending Approval"} />
            </span>
          </div>
        </div>
        <div className="project-actions">
          <button
            className="btn btn-icon btn-primary"
            onClick={() => handleAction('load')}
            title="Load Project"
          >
            <i className="fas fa-folder-open"></i>
          </button>
          <button
            className="btn btn-icon btn-danger"
            onClick={() => handleAction('remove')}
            title="Remove from Recent"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    );
  }

  // Saved project
  const savedProject = project as SavedProject;
  return (
    <div className="project-item" data-file-path={savedProject.filePath}>
      <div className="project-icon">
        <i className="fas fa-file-alt"></i>
      </div>
      <div className="project-info">
        <h4 className="project-name" dangerouslySetInnerHTML={{ __html: escapeHtml(savedProject.project.name) }} />
        <div className="project-meta-row">
          <span className="project-version">v{savedProject.project.version}</span>
          <span className="project-date">
            <i className="fas fa-edit"></i> {formatDate(savedProject.project.lastModified)}
          </span>
          <span className="project-size">{formatBytes(savedProject.fileSize)}</span>
          <span className="project-detail">
            <ApprovalStatusIcon status={savedProject.project.approvalStatus || "Pending Approval"} />
          </span>
        </div>
      </div>
      <div className="project-actions">
        <button
          className="btn btn-icon btn-primary"
          onClick={() => handleAction('load')}
          title="Load Project"
        >
          <i className="fas fa-folder-open"></i>
        </button>
        <button
          className="btn btn-icon btn-secondary"
          onClick={() => handleAction('export')}
          title="Export Project"
        >
          <i className="fas fa-download"></i>
        </button>
        <button
          className="btn btn-icon btn-danger"
          onClick={() => handleAction('delete')}
          title="Delete Project"
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  );
};

export default ProjectItem;
