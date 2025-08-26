/**
 * Project Actions - Centralized business logic for project operations
 * Following the application's state manager + actions + dispatcher pattern
 */

export interface NewProjectFormData {
  code: string;
  name: string;
  description: string;
}

export class ProjectActions {
  private getProjectManager() {
    const app = (window as any).app;
    return app?.managers?.project;
  }

  private getNavigationManager() {
    const app = (window as any).app;
    return app?.navigationManager;
  }

  /**
   * Create a new project
   */
  async createProject(formData: NewProjectFormData): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.createNewProject(formData);
      
      // Auto-navigate to features is handled by ProjectBusinessLogic
      console.log('Project created successfully:', formData.name);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Load a project from file path
   */
  async loadProject(filePath: string): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.loadSavedProject(filePath);
      console.log('Project loaded successfully from:', filePath);
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  }

  /**
   * Load a recent project
   */
  async loadRecentProject(projectId: string): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.loadRecentProject(projectId);
      console.log('Recent project loaded successfully:', projectId);
    } catch (error) {
      console.error('Failed to load recent project:', error);
      throw error;
    }
  }

  /**
   * Load project from uploaded file data
   */
  async loadProjectFromFile(projectData: any): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.loadProjectData(projectData, 'uploaded-file');
      console.log('Project loaded from uploaded file');
    } catch (error) {
      console.error('Failed to load project from file:', error);
      throw error;
    }
  }

  /**
   * Save current project
   */
  async saveProject(): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.saveCurrentProject();
      console.log('Project saved successfully');
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }

  /**
   * Close current project
   */
  async closeProject(): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.closeCurrentProject();
      console.log('Project closed successfully');
    } catch (error) {
      console.error('Failed to close project:', error);
      throw error;
    }
  }

  /**
   * Delete a saved project
   */
  async deleteProject(filePath: string): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.deleteSavedProject(filePath);
      console.log('Project deleted successfully:', filePath);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Export a saved project
   */
  async exportProject(filePath: string): Promise<void> {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      await projectManager.exportSavedProject(filePath);
      console.log('Project exported successfully:', filePath);
    } catch (error) {
      console.error('Failed to export project:', error);
      throw error;
    }
  }

  /**
   * Remove a project from recent projects list
   */
  removeRecentProject(projectId: string): void {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      projectManager.removeRecentProject(projectId);
      console.log('Removed from recent projects:', projectId);
    } catch (error) {
      console.error('Failed to remove recent project:', error);
      throw error;
    }
  }

  /**
   * Clear all recent projects
   */
  clearRecentProjects(): void {
    const projectManager = this.getProjectManager();
    if (!projectManager) {
      throw new Error('Project manager not available');
    }

    try {
      projectManager.clearRecentProjects();
      console.log('Cleared all recent projects');
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
      throw error;
    }
  }

  /**
   * Show unsaved changes dialog
   */
  async showUnsavedChangesDialog(): Promise<boolean | null> {
    return new Promise((resolve) => {
      const result = confirm('You have unsaved changes. Do you want to save before continuing?');
      resolve(result);
    });
  }
}

// Create singleton instance
export const projectActions = new ProjectActions();