/**
 * Project Actions - Centralized business logic for project operations
 * Following the application's state manager + actions + dispatcher pattern
 */

export interface RecentProject {
  id: string;
  name: string;
  version: string;
  lastOpened: string;
  filePath?: string;
}

export interface SavedProject {
  filePath: string;
  fileName: string;
  project: {
    id: string;
    name: string;
    version: string;
    lastModified: string;
  };
  fileSize: number;
  lastModified: string;
}

export interface NewProjectFormData {
  code: string;
  name: string;
  description: string;
}

export class ProjectActions {
  private getApp() {
    return (window as any).app;
  }

  private getStore() {
    return (window as any).appStore;
  }

  /**
   * Load recent projects from localStorage
   */
  async loadRecentProjects(): Promise<RecentProject[]> {
    try {
      const data = localStorage.getItem('recent-projects');
      const projects = data ? JSON.parse(data) : [];
      
      // Update store if available
      const store = this.getStore();
      if (store) {
        store.getState().setRecentProjects?.(projects);
      }
      
      console.log(`Loaded ${projects.length} recent projects`);
      return projects;
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      return [];
    }
  }

  /**
   * Load saved projects from file system
   */
  async loadSavedProjects(): Promise<SavedProject[]> {
    try {
      const app = this.getApp();
      if (!app?.dataManager) {
        throw new Error('Data manager not available');
      }

      const projects = await app.dataManager.listProjects();
      const mappedProjects = projects.map((project: any) => ({
        filePath: project.filePath,
        fileName: project.fileName,
        project: project.project,
        fileSize: project.fileSize,
        lastModified: project.lastModified
      }));

      // Update store if available
      const store = this.getStore();
      if (store) {
        store.getState().setSavedProjects?.(mappedProjects);
      }

      console.log(`Loaded ${mappedProjects.length} saved projects`);
      return mappedProjects;
    } catch (error) {
      console.error('Failed to load saved projects:', error);
      throw error;
    }
  }

  /**
   * Load a project by ID (recent projects)
   */
  async loadProject(projectId: string): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      // Delegate to existing project manager logic
      await app.managers.project.loadRecentProject(projectId);
      
      // Update store state
      const store = this.getStore();
      if (store) {
        // Refresh recent projects after loading
        await this.loadRecentProjects();
      }
      
      console.log('Project loaded successfully:', projectId);
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  }

  /**
   * Load a project by file path (saved projects)
   */
  async loadProjectFromFile(filePath: string): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      // Delegate to existing project manager logic
      await app.managers.project.loadSavedProject(filePath);
      
      // Update store state
      const store = this.getStore();
      if (store) {
        // Refresh both recent and saved projects after loading
        await this.loadRecentProjects();
        await this.loadSavedProjects();
      }
      
      console.log('Project loaded from file successfully:', filePath);
    } catch (error) {
      console.error('Failed to load project from file:', error);
      throw error;
    }
  }

  /**
   * Remove a project from recent projects list
   */
  async removeRecentProject(projectId: string): Promise<void> {
    try {
      const recentProjects = await this.loadRecentProjects();
      const updatedProjects = recentProjects.filter(p => p.id !== projectId);
      
      // Update localStorage
      localStorage.setItem('recent-projects', JSON.stringify(updatedProjects));
      
      // Update store
      const store = this.getStore();
      if (store) {
        store.getState().setRecentProjects?.(updatedProjects);
      }
      
      // Emit event for components listening
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      
      console.log('Recent project removed:', projectId);
    } catch (error) {
      console.error('Failed to remove recent project:', error);
      throw error;
    }
  }

  /**
   * Clear all recent projects
   */
  async clearRecentProjects(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.removeItem('recent-projects');
      
      // Update store
      const store = this.getStore();
      if (store) {
        store.getState().setRecentProjects?.([]);
      }
      
      // Emit event for components listening
      window.dispatchEvent(new CustomEvent('recent-projects-updated'));
      
      console.log('Recent projects cleared');
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
      throw error;
    }
  }

  /**
   * Export a project to various formats
   */
  async exportProject(filePath: string): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      // Delegate to existing export logic
      await app.managers.project.exportProject(filePath);
      
      console.log('Project exported successfully:', filePath);
    } catch (error) {
      console.error('Failed to export project:', error);
      throw error;
    }
  }

  /**
   * Delete a saved project file
   */
  async deleteProject(filePath: string): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.dataManager) {
        throw new Error('Data manager not available');
      }

      // Delete the project file
      await app.dataManager.deleteProject(filePath);
      
      // Refresh saved projects list
      await this.loadSavedProjects();
      
      // Emit event for components listening
      window.dispatchEvent(new CustomEvent('saved-projects-updated'));
      
      console.log('Project deleted successfully:', filePath);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Refresh saved projects list
   */
  async refreshSavedProjects(): Promise<void> {
    try {
      await this.loadSavedProjects();
      
      // Emit event for components listening
      window.dispatchEvent(new CustomEvent('saved-projects-updated'));
      
      console.log('Saved projects refreshed');
    } catch (error) {
      console.error('Failed to refresh saved projects:', error);
      throw error;
    }
  }

  /**
   * Get display projects (limited for UI)
   */
  getDisplayRecentProjects(projects: RecentProject[], limit: number = 2): RecentProject[] {
    return projects.slice(0, limit);
  }

  /**
   * Setup storage event listeners for cross-tab synchronization
   */
  setupStorageListeners(callback: () => void): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recent-projects') {
        callback();
      }
    };

    const handleRecentProjectsUpdate = () => {
      callback();
    };

    const handleSavedProjectsUpdate = () => {
      callback();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('recent-projects-updated', handleRecentProjectsUpdate);
    window.addEventListener('saved-projects-updated', handleSavedProjectsUpdate);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('recent-projects-updated', handleRecentProjectsUpdate);
      window.removeEventListener('saved-projects-updated', handleSavedProjectsUpdate);
    };
  }

  /**
   * Create a new project
   */
  async createNewProject(): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      // Delegate to existing project creation logic
      await app.managers.project.createNewProject();
      
      // Refresh project lists
      await this.loadRecentProjects();
      await this.loadSavedProjects();
      
      console.log('New project created successfully');
    } catch (error) {
      console.error('Failed to create new project:', error);
      throw error;
    }
  }

  /**
   * Create a new project with form data
   */
  async createProject(formData: NewProjectFormData): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      // Delegate to existing project creation logic with form data
      await app.managers.project.createNewProject(formData);
      
      // Refresh project lists
      await this.loadRecentProjects();
      await this.loadSavedProjects();
      
      console.log('New project created successfully with form data:', formData);
    } catch (error) {
      console.error('Failed to create new project:', error);
      throw error;
    }
  }

  /**
   * Show success notification through store
   */
  showSuccessNotification(message: string): void {
    try {
      const store = this.getStore();
      if (!store) {
        console.warn('Store not available for notification');
        return;
      }
      
      const state = store.getState();
      if (state.addNotification) {
        const notificationConfig = {
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Success',
          message: message,
          type: 'success',
          duration: 5000,
          persistent: false,
          actions: [],
          onClick: null,
          onClose: null,
          timestamp: new Date()
        };
        state.addNotification(notificationConfig);
      }
    } catch (error) {
      console.error('Failed to show success notification:', error);
    }
  }

  /**
   * Show error notification through store
   */
  showErrorNotification(message: string): void {
    try {
      const store = this.getStore();
      if (!store) {
        console.warn('Store not available for notification');
        return;
      }
      
      const state = store.getState();
      if (state.addNotification) {
        const notificationConfig = {
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Error',
          message: message,
          type: 'error',
          duration: 5000,
          persistent: false,
          actions: [],
          onClick: null,
          onClose: null,
          timestamp: new Date()
        };
        state.addNotification(notificationConfig);
      }
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }

  /**
   * Show unsaved changes dialog and return user's choice
   */
  async showUnsavedChangesDialog(): Promise<boolean | null> {
    try {
      const app = this.getApp();
      if (!app?.managers?.modal) {
        // Fallback to browser confirm dialog
        const result = confirm('You have unsaved changes. Do you want to save them?');
        return result;
      }

      // Use app's modal system if available
      return await app.managers.modal.showUnsavedChangesDialog();
    } catch (error) {
      console.error('Failed to show unsaved changes dialog:', error);
      // Fallback to browser confirm dialog
      return confirm('You have unsaved changes. Do you want to save them?');
    }
  }

  /**
   * Load a project by ID (recent projects) - renamed for clarity
   */
  async loadRecentProject(projectId: string): Promise<void> {
    return this.loadProject(projectId);
  }

  /**
   * Save current project
   */
  async saveProject(): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      await app.managers.project.saveCurrentProject();
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
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      await app.managers.project.closeCurrentProject();
      
      // Refresh project lists
      await this.loadRecentProjects();
      await this.loadSavedProjects();
      
      console.log('Project closed successfully');
    } catch (error) {
      console.error('Failed to close project:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const projectActions = new ProjectActions();