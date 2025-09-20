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
      
      
      // LAZY VALIDATION: Filter out projects whose files no longer exist
      const validProjects: RecentProject[] = [];
      const app = this.getApp();
      
      
      // SIMPLIFIED: Skip file existence validation since checkFileExists method is not available
      // Just keep all projects for now - file validation can be done when actually loading
      validProjects.push(...projects);
      
      // Update store if available
      const store = this.getStore();
      if (store) {
        store.getState().setRecentProjects?.(validProjects);
      }
      
      console.log(`✅ Loaded ${validProjects.length} recent projects`);
      return validProjects;
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
    const store = this.getStore();
    
    try {
      console.log('🔄 Starting project load process...', projectId);
      
      // Set loading state for project loading
      store.getState().setLoading('project-loading', true);
      
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      console.log('🔄 Loading recent project with enhanced timing...');
      // Delegate to existing project manager logic
      await app.managers.project.loadRecentProject(projectId);
      
      console.log('🔄 Auto-repair check for project data...');
      // Auto-repair project data if needed
      await this.repairProjectDataIfNeeded();
      
      console.log('🧹 Clearing calculations cache for fresh project data...');
      // CRITICAL: Clear calculations cache to prevent stale data display
      this.clearAllCalculationsCache();
      
      console.log('🔄 Force recalculating with fresh project data...');
      // CRITICAL: Force recalculation with fresh project data  
      await this.forceRecalculateOnProjectLoad();
      
      console.log('🔄 Refreshing project lists...');
      // Update store state
      if (store) {
        // Refresh recent projects after loading
        await this.loadRecentProjects();
      }
      
      console.log('✅ Project loaded successfully:', projectId);
    } catch (error) {
      console.error('❌ Failed to load project:', error);
      throw error;
    } finally {
      // Always clear loading state
      store.getState().setLoading('project-loading', false);
      console.log('🔄 Project loading state cleared');
    }
  }

  /**
   * Load a project by file path (saved projects)
   */
  async loadProjectFromFile(filePath: string): Promise<void> {
    const store = this.getStore();
    
    try {
      console.log('🔄 Starting project load from file process...', filePath);
      
      // Set loading state for project loading
      store.getState().setLoading('project-loading', true);
      
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      console.log('🔄 Loading saved project with enhanced timing...');
      // Delegate to existing project manager logic
      await app.managers.project.loadSavedProject(filePath);
      
      console.log('🔄 Auto-repair check for project data...');
      // Auto-repair project data if needed
      await this.repairProjectDataIfNeeded();
      
      console.log('🧹 Clearing calculations cache for fresh project data...');
      // CRITICAL: Clear calculations cache to prevent stale data display
      this.clearAllCalculationsCache();
      
      console.log('🔄 Force recalculating with fresh project data...');
      // CRITICAL: Force recalculation with fresh project data  
      await this.forceRecalculateOnProjectLoad();
      
      console.log('🔄 Refreshing project lists...');
      // Update store state
      if (store) {
        // Refresh both recent and saved projects after loading
        await this.loadRecentProjects();
        await this.loadSavedProjects();
      }
      
      console.log('✅ Project loaded from file successfully:', filePath);
    } catch (error) {
      console.error('❌ Failed to load project from file:', error);
      throw error;
    } finally {
      // Always clear loading state
      store.getState().setLoading('project-loading', false);
      console.log('🔄 Project loading state cleared');
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

      // EAGER CLEANUP: Remove from recent projects before deletion
      const recentProjects = await this.loadRecentProjects();
      const updatedRecentProjects = recentProjects.filter(p => p.filePath !== filePath);
      
      if (updatedRecentProjects.length !== recentProjects.length) {
        // Update localStorage
        localStorage.setItem('recent-projects', JSON.stringify(updatedRecentProjects));
        
        // Update store
        const store = this.getStore();
        if (store) {
          store.getState().setRecentProjects?.(updatedRecentProjects);
        }
        
        // Emit event for components listening
        window.dispatchEvent(new CustomEvent('recent-projects-updated'));
        
        console.log('🔄 Removed deleted project from recent projects:', filePath);
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
      
      console.log('🧹 Clearing calculations cache for new project...');
      // CRITICAL: Clear calculations cache when creating new project
      this.clearAllCalculationsCache();
      
      console.log('🔄 Force recalculating for new project...');
      // CRITICAL: Force recalculation with new project data
      await this.forceRecalculateOnProjectLoad();
      
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
    const store = this.getStore();
    
    try {
      console.log('🔄 Starting project creation process...');
      
      // Set loading state for project creation
      store.getState().setLoading('project-creation', true);
      
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      console.log('🔄 Creating new project with enhanced timing...');
      // Delegate to existing project creation logic with form data
      await app.managers.project.createNewProject(formData);
      
      console.log('🧹 Clearing calculations cache for new project...');
      // CRITICAL: Clear calculations cache when creating new project
      this.clearAllCalculationsCache();
      
      console.log('🔄 Force recalculating for new project...');
      // CRITICAL: Force recalculation with new project data
      await this.forceRecalculateOnProjectLoad();
      
      console.log('🔄 Refreshing project lists...');
      // Refresh project lists
      await this.loadRecentProjects();
      await this.loadSavedProjects();
      
      // Update window title for new project (will be handled by store subscription)
      
      console.log('✅ New project created successfully with form data:', formData);
    } catch (error) {
      console.error('❌ Failed to create new project:', error);
      throw error;
    } finally {
      // Always clear loading state
      store.getState().setLoading('project-creation', false);
      console.log('🔄 Project creation loading state cleared');
    }
  }

  /**
   * Clear all calculations cache and reset phases state - PATTERN: State/Actions/Dispatcher
   * Must be called on every project change to prevent stale cache issues
   */
  private clearAllCalculationsCache(): void {
    try {
      const store = this.getStore();
      if (!store) {
        console.warn('Store not available for cache clearing');
        return;
      }

      console.log('🧹 CACHE CLEARING: Invalidating calculations cache...');
      
      // Preserve finalMDsOverrides from current project if available
      const currentProject = store.getState().currentProject;
      const preserveOverrides = currentProject?.finalMDsOverrides || {};
      
      // PATTERN: Clear calculations data through Store methods
      store.getState().clearCalculations(preserveOverrides);
      
      console.log('🧹 CACHE CLEARING: Reinitializing phases state...');
      // PATTERN: Reinitialize phases to ensure they reflect current project data
      store.getState().initializePhases();
      
      console.log('✅ CACHE CLEARING: All caches cleared and phases reinitialized successfully');
    } catch (error) {
      console.error('❌ CACHE CLEARING: Failed to clear caches:', error);
      // Don't throw - cache clearing is non-critical
    }
  }

  /**
   * Force recalculate all data after project load - PATTERN: Actions layer business logic
   */
  private async forceRecalculateOnProjectLoad(): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        console.warn('Store not available for forced recalculation');
        return;
      }

      const currentProject = store.getState().currentProject;
      if (!currentProject) {
        console.log('🔄 FORCE RECALC: No project loaded, skipping recalculation');
        return;
      }

      console.log('🔄 FORCE RECALC: Starting forced recalculation after project load...');
      
      // PATTERN: Use CalculationsActions for business logic
      if (window.calculationsActions) {
        console.log('🔄 FORCE RECALC: Triggering calculations refresh...');
        await window.calculationsActions.calculateProjectCosts();
        console.log('✅ FORCE RECALC: Calculations refreshed successfully');
      } else {
        console.warn('⚠️ FORCE RECALC: calculationsActions not available, skipping recalculation');
      }
      
    } catch (error) {
      console.error('❌ FORCE RECALC: Failed to force recalculate on project load:', error);
      // Don't throw - forced recalculation is optional but recommended
    }
  }

  /**
   * Auto-repair project data if needed (fix incomplete phases, etc.)
   */
  private async repairProjectDataIfNeeded(): Promise<void> {
    try {
      const store = this.getStore();
      const currentProject = store.getState().currentProject;
      
      if (!currentProject?.phases) {
        console.log('⚠️ No phases data found, skipping auto-repair');
        return;
      }

      // Check if phases only contains selectedSuppliers (incomplete)
      const phaseKeys = Object.keys(currentProject.phases);
      const hasOnlySelectedSuppliers = phaseKeys.length === 1 && phaseKeys[0] === 'selectedSuppliers';
      
      if (hasOnlySelectedSuppliers) {
        console.log('🔧 AUTO-REPAIR: Detected incomplete phases, adding missing phase definitions');
        
        // Get the preserved selectedSuppliers
        const selectedSuppliers = currentProject.phases.selectedSuppliers;
        
        // Create complete phases (using same logic as ProjectBusinessLogic.createInitialPhases)
        const repairedPhases = this.createCompletePhases(selectedSuppliers);
        
        // Update project with repaired phases
        store.getState().updateProjectPhases(repairedPhases);
        
        console.log('✅ AUTO-REPAIR: Project phases repaired successfully');
        console.log('🔍 AUTO-REPAIR: Phases now include:', Object.keys(repairedPhases));
      } else {
        console.log('✅ Project phases are complete, no repair needed');
      }
    } catch (error) {
      console.error('❌ AUTO-REPAIR: Failed to repair project data:', error);
      // Don't throw - auto-repair is optional
    }
  }

  /**
   * Create complete phases structure (mirrors ProjectBusinessLogic.createInitialPhases)
   */
  private createCompletePhases(selectedSuppliers: any) {
    const now = new Date().toISOString();
    
    // Phase definitions (consistent with ProjectBusinessLogic)
    const phaseDefinitions = [
      {
        id: "functionalAnalysis",
        defaultEffort: { G1: 100, G2: 0, TA: 20, PM: 50 }
      },
      {
        id: "technicalAnalysis", 
        defaultEffort: { G1: 0, G2: 100, TA: 60, PM: 20 }
      },
      {
        id: "development",
        defaultEffort: { G1: 0, G2: 100, TA: 40, PM: 20 }
      },
      {
        id: "integrationTests",
        defaultEffort: { G1: 100, G2: 50, TA: 50, PM: 75 }
      },
      {
        id: "uatTests", 
        defaultEffort: { G1: 50, G2: 50, TA: 40, PM: 75 }
      },
      {
        id: "consolidation",
        defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 }
      },
      {
        id: "vapt",
        defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 }
      },
      {
        id: "postGoLive", 
        defaultEffort: { G1: 0, G2: 100, TA: 50, PM: 100 }
      }
    ];

    // Create phases object
    const phases: any = {};
    
    // Get current project to preserve existing values
    const store = this.getStore();
    const currentProject = store?.getState().currentProject;
    const existingPhases = currentProject?.phases || {};
    
    console.log('🔧 AUTO-REPAIR: Preserving existing phase values:', Object.keys(existingPhases));
    
    // Initialize each phase, preserving existing values instead of overwriting
    phaseDefinitions.forEach(def => {
      const existingPhase = existingPhases[def.id] || {};
      
      // CRITICAL FIX: Preserve manDays, effort, cost, and lastModified if they exist
      phases[def.id] = {
        manDays: existingPhase.manDays !== undefined ? existingPhase.manDays : 0,
        effort: existingPhase.effort || { ...def.defaultEffort },
        assignedResources: existingPhase.assignedResources || [],
        cost: existingPhase.cost !== undefined ? existingPhase.cost : 0,
        lastModified: existingPhase.lastModified || now
      };
      
      console.log(`🔧 AUTO-REPAIR: Phase ${def.id} - preserved manDays: ${phases[def.id].manDays}`);
    });

    // Preserve existing selectedSuppliers
    phases.selectedSuppliers = selectedSuppliers || {
      G1: null,
      G2: null, 
      TA: null,
      PM: null
    };

    return phases;
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
      console.log('🔍 Showing unsaved changes dialog');

      const app = this.getApp();
      if (!app?.managers?.modal) {
        console.warn('Modal manager not available, using browser confirm');
        // Fallback to browser confirm dialog
        const result = confirm('You have unsaved changes. Do you want to save them?');
        return result;
      }

      // Use app's modal system if available
      if (typeof app.managers.modal.showUnsavedChangesDialog === 'function') {
        return await app.managers.modal.showUnsavedChangesDialog();
      } else {
        console.warn('showUnsavedChangesDialog method not available, using browser confirm');
        // Fallback to browser confirm dialog
        const result = confirm('You have unsaved changes. Do you want to save them?');
        return result;
      }
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
      
      console.log('🧹 Clearing calculations cache after project close...');
      // CRITICAL: Clear calculations cache when closing project
      this.clearAllCalculationsCache();
      
      // Refresh project lists
      await this.loadRecentProjects();
      await this.loadSavedProjects();
      
      console.log('Project closed successfully');
    } catch (error) {
      console.error('Failed to close project:', error);
      throw error;
    }
  }

  /**
   * Update window title with project code and name
   */
  async updateWindowTitle(projectData: any): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      await app.managers.project.updateWindowTitle(projectData);
      
      console.log('Window title updated successfully');
    } catch (error) {
      console.error('Failed to update window title:', error);
      throw error;
    }
  }

  /**
   * Reset window title to default
   */
  async resetWindowTitle(): Promise<void> {
    try {
      const app = this.getApp();
      if (!app?.managers?.project) {
        throw new Error('Project manager not available');
      }

      await app.managers.project.resetWindowTitle();
      
      console.log('Window title reset successfully');
    } catch (error) {
      console.error('Failed to reset window title:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const projectActions = new ProjectActions();

// Make available globally for store subscription
if (typeof window !== 'undefined') {
  (window as any).projectActions = projectActions;
  console.log('✅ ProjectActions available globally for store subscription');
}