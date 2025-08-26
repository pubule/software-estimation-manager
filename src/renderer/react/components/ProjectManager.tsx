import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import CurrentProjectCard from './CurrentProjectCard';
import RecentProjectsList from './RecentProjectsList';
import SavedProjectsList from './SavedProjectsList';
import NewProjectModal from './NewProjectModal';
import LoadProjectModal from './LoadProjectModal';

interface NewProjectFormData {
  code: string;
  name: string;
  description: string;
}

const ProjectManager: React.FC = () => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showLoadProjectModal, setShowLoadProjectModal] = useState(false);

  const { isDirty } = useStore(state => ({
    isDirty: state.isDirty
  }));

  // Get ProjectManager instance from global window object
  const getProjectManager = () => {
    const app = (window as any).app;
    return app?.projectManager || app?.managers?.project;
  };

  const showUnsavedChangesDialog = (): Promise<boolean | null> => {
    return new Promise((resolve) => {
      if (isDirty) {
        const result = confirm('You have unsaved changes. Do you want to save before continuing?');
        resolve(result);
      } else {
        resolve(false); // No need to save
      }
    });
  };

  // Handler for New Project button
  const handleNewProject = async () => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Creating a new project will discard them. Continue?');
      if (!confirmed) return;
    }
    
    setShowNewProjectModal(true);
  };

  // Handler for Load Project button  
  const handleLoadProject = () => {
    setShowLoadProjectModal(true);
  };

  // Handler for creating new project
  const handleCreateProject = async (formData: NewProjectFormData) => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      // Use existing ProjectManager logic for creating project
      await projectManager.createNewProject(formData);
      setShowNewProjectModal(false);
      
      // Trigger events to update other components
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      window.dispatchEvent(new CustomEvent('saved-projects-updated'));
      
    } catch (error) {
      console.error('Failed to create project:', error);
      // NotificationManager should be called by ProjectManager
      throw error; // Re-throw to let modal handle error state
    }
  };

  // Handler for loading project from file
  const handleLoadFromFile = async (projectData: any) => {
    try {
      if (isDirty) {
        const save = await showUnsavedChangesDialog();
        if (save === null) return; // User cancelled
        if (save) await handleSaveProject();
      }

      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.loadProjectData(projectData, 'loaded-from-file');
      setShowLoadProjectModal(false);
      
      // Trigger events to update other components
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      
    } catch (error) {
      console.error('Failed to load project from file:', error);
      throw error; // Re-throw to let modal handle error state
    }
  };

  // Handler for loading recent project
  const handleLoadRecentProject = async (projectId: string) => {
    try {
      if (isDirty) {
        const save = await showUnsavedChangesDialog();
        if (save === null) return; // User cancelled
        if (save) await handleSaveProject();
      }

      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.loadRecentProject(projectId);
      setShowLoadProjectModal(false);
      
    } catch (error) {
      console.error('Failed to load recent project:', error);
      throw error; // Re-throw to let modal handle error state
    }
  };

  // Handler for saving current project
  const handleSaveProject = async () => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.saveCurrentProject();
      
      // Trigger events to update other components
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      window.dispatchEvent(new CustomEvent('saved-projects-updated'));
      
    } catch (error) {
      console.error('Failed to save project:', error);
      // NotificationManager should be called by ProjectManager
    }
  };

  // Handler for closing current project
  const handleCloseProject = async () => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.closeCurrentProject();
      
      // Trigger events to update other components
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      
    } catch (error) {
      console.error('Failed to close project:', error);
      // NotificationManager should be called by ProjectManager
    }
  };

  // Handlers for recent projects list
  const handleLoadRecentProjectFromList = async (projectId: string) => {
    try {
      if (isDirty) {
        const save = await showUnsavedChangesDialog();
        if (save === null) return; // User cancelled
        if (save) await handleSaveProject();
      }

      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.loadRecentProject(projectId);
      
    } catch (error) {
      console.error('Failed to load recent project:', error);
      // NotificationManager should be called by ProjectManager
    }
  };

  const handleRemoveRecentProject = (projectId: string) => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      projectManager.removeRecentProject(projectId);
      
      // Trigger event to update recent projects list
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      
    } catch (error) {
      console.error('Failed to remove recent project:', error);
    }
  };

  const handleClearRecentProjects = () => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      projectManager.clearRecentProjects();
      
      // Trigger event to update recent projects list
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
    }
  };

  // Handlers for saved projects list
  const handleLoadSavedProject = async (filePath: string) => {
    try {
      if (isDirty) {
        const save = await showUnsavedChangesDialog();
        if (save === null) return; // User cancelled
        if (save) await handleSaveProject();
      }

      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.loadSavedProject(filePath);
      
    } catch (error) {
      console.error('Failed to load saved project:', error);
      // NotificationManager should be called by ProjectManager
    }
  };

  const handleExportSavedProject = async (filePath: string) => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.exportSavedProject(filePath);
      
    } catch (error) {
      console.error('Failed to export project:', error);
      // NotificationManager should be called by ProjectManager
    }
  };

  const handleDeleteSavedProject = async (filePath: string) => {
    try {
      const projectManager = getProjectManager();
      if (!projectManager) {
        throw new Error('Project manager not available');
      }

      await projectManager.deleteSavedProject(filePath);
      
      // Trigger events to update components
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      window.dispatchEvent(new CustomEvent('saved-projects-updated'));
      
    } catch (error) {
      console.error('Failed to delete project:', error);
      // NotificationManager should be called by ProjectManager
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h2>Project Manager</h2>
        <div className="page-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleNewProject}
          >
            <i className="fas fa-plus"></i> New Project
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleLoadProject}
          >
            <i className="fas fa-folder-open"></i> Load Project
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="project-manager-layout">
        {/* Left Column */}
        <div className="project-manager-left">
          <CurrentProjectCard 
            onSave={handleSaveProject}
            onClose={handleCloseProject}
          />
          
          <RecentProjectsList 
            onLoadProject={handleLoadRecentProjectFromList}
            onRemoveProject={handleRemoveRecentProject}
            onClearRecent={handleClearRecentProjects}
          />
        </div>

        {/* Right Column */}
        <div className="project-manager-right">
          <SavedProjectsList 
            onLoadProject={handleLoadSavedProject}
            onExportProject={handleExportSavedProject}
            onDeleteProject={handleDeleteSavedProject}
          />
        </div>
      </div>

      {/* Modals */}
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