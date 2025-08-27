import React, { useState } from 'react';
import { useProjectActions } from '../hooks/useProjectActions';
import { NewProjectFormData } from '../actions/ProjectsActions';
import CurrentProjectCard from './CurrentProjectCard';
import RecentProjectsList from './RecentProjectsList';
import SavedProjectsList from './SavedProjectsList';
import NewProjectModal from './NewProjectModal';
import LoadProjectModal from './LoadProjectModal';

const ProjectManager: React.FC = () => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showLoadProjectModal, setShowLoadProjectModal] = useState(false);

  const {
    createProject,
    loadProject,
    loadRecentProject,
    loadProjectFromFile,
    saveProject,
    closeProject,
    deleteProject,
    exportProject,
    removeRecentProject,
    clearRecentProjects,
    handleUnsavedChanges,
    isDirty
  } = useProjectActions();

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
      await createProject(formData);
      setShowNewProjectModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error; // Re-throw to let modal handle error state
    }
  };

  // Handler for loading project from file
  const handleLoadFromFile = async (projectData: any) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      
      await loadProjectFromFile(projectData);
      setShowLoadProjectModal(false);
    } catch (error) {
      console.error('Failed to load project from file:', error);
      throw error; // Re-throw to let modal handle error state
    }
  };

  // Handler for loading recent project
  const handleLoadRecentProject = async (projectId: string) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      
      await loadRecentProject(projectId);
      setShowLoadProjectModal(false);
    } catch (error) {
      console.error('Failed to load recent project:', error);
      throw error; // Re-throw to let modal handle error state
    }
  };

  // Handler for saving current project
  const handleSaveProject = async () => {
    try {
      await saveProject();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  // Handler for closing current project
  const handleCloseProject = async () => {
    try {
      await closeProject();
    } catch (error) {
      console.error('Failed to close project:', error);
    }
  };

  // Handlers for recent projects list
  const handleLoadRecentProjectFromList = async (projectId: string) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      await loadRecentProject(projectId);
    } catch (error) {
      console.error('Failed to load recent project:', error);
    }
  };

  const handleRemoveRecentProject = (projectId: string) => {
    try {
      removeRecentProject(projectId);
    } catch (error) {
      console.error('Failed to remove recent project:', error);
    }
  };

  const handleClearRecentProjects = () => {
    try {
      clearRecentProjects();
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
    }
  };

  // Handlers for saved projects list
  const handleLoadSavedProject = async (filePath: string) => {
    try {
      if (!(await handleUnsavedChanges())) return;
      await loadProject(filePath);
    } catch (error) {
      console.error('Failed to load saved project:', error);
    }
  };

  const handleExportSavedProject = async (filePath: string) => {
    try {
      await exportProject(filePath);
    } catch (error) {
      console.error('Failed to export project:', error);
    }
  };

  const handleDeleteSavedProject = async (filePath: string) => {
    try {
      await deleteProject(filePath);
    } catch (error) {
      console.error('Failed to delete project:', error);
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