/**
 * Custom hook for project actions - Following React patterns
 * Provides clean interface for React components to interact with project operations
 */

import { useCallback } from 'react';
import { projectActions, NewProjectFormData } from '../actions/ProjectsActions';
import { useStore } from './useStore';

export const useProjectActions = () => {
  const { isDirty } = useStore(state => ({
    isDirty: state.isDirty
  }));

  const createProject = useCallback(async (formData: NewProjectFormData) => {
    try {
      await projectActions.createProject(formData);
    } catch (error) {
      // Error is already logged in actions, just re-throw for component handling
      throw error;
    }
  }, []);

  const loadProject = useCallback(async (filePath: string) => {
    try {
      await projectActions.loadProject(filePath);
    } catch (error) {
      throw error;
    }
  }, []);

  const loadRecentProject = useCallback(async (projectId: string) => {
    try {
      await projectActions.loadRecentProject(projectId);
    } catch (error) {
      throw error;
    }
  }, []);

  const loadProjectFromFile = useCallback(async (filePathOrData: string | any) => {
    try {
      await projectActions.loadProjectFromFile(filePathOrData);
    } catch (error) {
      throw error;
    }
  }, []);

  const saveProject = useCallback(async () => {
    try {
      await projectActions.saveProject();
    } catch (error) {
      throw error;
    }
  }, []);

  const closeProject = useCallback(async () => {
    try {
      await projectActions.closeProject();
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (filePath: string) => {
    try {
      await projectActions.deleteProject(filePath);
    } catch (error) {
      throw error;
    }
  }, []);

  const exportProject = useCallback(async (filePath: string) => {
    try {
      await projectActions.exportProject(filePath);
    } catch (error) {
      throw error;
    }
  }, []);

  const removeRecentProject = useCallback((projectId: string) => {
    try {
      projectActions.removeRecentProject(projectId);
    } catch (error) {
      throw error;
    }
  }, []);

  const clearRecentProjects = useCallback(() => {
    try {
      projectActions.clearRecentProjects();
    } catch (error) {
      throw error;
    }
  }, []);

  const handleUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (isDirty) {
      const save = await projectActions.showUnsavedChangesDialog();
      if (save === null) return false; // User cancelled
      if (save) await saveProject();
    }
    return true; // Continue with operation
  }, [isDirty, saveProject]);

  return {
    // Project operations
    createProject,
    loadProject,
    loadRecentProject,
    loadProjectFromFile,
    saveProject,
    closeProject,
    deleteProject,
    exportProject,
    
    // Recent projects management
    removeRecentProject,
    clearRecentProjects,
    
    // Utility functions
    handleUnsavedChanges,
    
    // State
    isDirty
  };
};