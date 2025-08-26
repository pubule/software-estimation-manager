import React, { useState, useRef, useEffect } from 'react';

interface RecentProject {
  id: string;
  name: string;
  version?: string;
  lastOpened: string;
  filePath?: string;
}

interface SelectedFile {
  file: File;
  data: any;
  name: string;
  size: number;
}

interface LoadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFromFile: (projectData: any) => Promise<void>;
  onLoadRecentProject: (projectId: string) => Promise<void>;
}

// Helper functions
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

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const LoadProjectModal: React.FC<LoadProjectModalProps> = ({
  isOpen,
  onClose,
  onLoadFromFile,
  onLoadRecentProject
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load recent projects
  useEffect(() => {
    if (isOpen) {
      loadRecentProjects();
      setSelectedFile(null);
      setError(null);
    }
  }, [isOpen]);

  const loadRecentProjects = () => {
    try {
      const data = localStorage.getItem('recent-projects');
      const projects = data ? JSON.parse(data) : [];
      setRecentProjects(projects.slice(0, 5)); // Show max 5 projects
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      setRecentProjects([]);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    try {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error('Please select a JSON file');
      }

      // Read file content
      const content = await readFileContent(file);
      const projectData = JSON.parse(content);

      // Validate project data - replicating ProjectManager.js validateProjectFile
      validateProjectFile(projectData);

      setSelectedFile({
        file: file,
        data: projectData,
        name: file.name,
        size: file.size
      });

    } catch (error) {
      console.error('File selection failed:', error);
      setError(`Invalid project file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  };

  // Validate project file - replicating ProjectManager.js validateProjectFile
  const validateProjectFile = (projectData: any) => {
    if (!projectData || typeof projectData !== 'object') {
      throw new Error('Invalid project file format');
    }

    if (!projectData.project) {
      throw new Error('Missing project metadata');
    }

    if (!projectData.project.name) {
      throw new Error('Missing project name');
    }

    if (!projectData.features || !Array.isArray(projectData.features)) {
      throw new Error('Invalid features data');
    }

    if (!projectData.phases || typeof projectData.phases !== 'object') {
      throw new Error('Invalid phases data');
    }

    if (!projectData.config || typeof projectData.config !== 'object') {
      throw new Error('Invalid configuration data');
    }
  };

  const handleLoadSelectedProject = async () => {
    if (!selectedFile) {
      setError('No project file selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await onLoadFromFile(selectedFile.data);
      // Modal will be closed by parent component after successful load
    } catch (error) {
      console.error('Failed to load project:', error);
      setError(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadRecentProject = async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onLoadRecentProject(projectId);
      // Modal will be closed by parent component after successful load
    } catch (error) {
      console.error('Failed to load recent project:', error);
      setError(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="project-load-modal" className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Load Project</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="error-banner" style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}
          
          <div className="load-options">
            <div className="load-option">
              <h4><i className="fas fa-file-upload"></i> Load from File</h4>
              <p>Select a JSON project file from your computer</p>
              <input 
                type="file" 
                ref={fileInputRef}
                id="project-file-input" 
                accept=".json" 
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleFileSelect}
                disabled={isLoading}
              >
                <i className="fas fa-folder-open"></i> Choose File
              </button>
              
              {selectedFile && (
                <div id="selected-file-info" className="file-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <i className="fas fa-file"></i>
                  <span id="selected-file-name">{selectedFile.name}</span>
                  <span id="selected-file-size" style={{ fontSize: '12px', color: '#666' }}>{formatBytes(selectedFile.size)}</span>
                </div>
              )}
            </div>

            <div className="load-option">
              <h4><i className="fas fa-history"></i> Recent Projects</h4>
              <div id="modal-recent-projects" className="recent-projects-modal">
                {recentProjects.length === 0 ? (
                  <p className="text-muted">No recent projects</p>
                ) : (
                  recentProjects.map(project => (
                    <div key={project.id} className="recent-project-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                      <div className="project-info">
                        <span className="project-name" dangerouslySetInnerHTML={{ __html: escapeHtml(project.name) }} style={{ fontWeight: '500' }} />
                        <span className="project-date" style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                          {formatDate(project.lastOpened)}
                        </span>
                      </div>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => handleLoadRecentProject(project.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : 'Load'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleLoadSelectedProject}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Loading...
              </>
            ) : (
              'Load Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadProjectModal;