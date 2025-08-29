import { useEffect, useState } from 'react';

// Type definitions for our store
export interface Project {
  project: {
    id: string;
    name: string;
    lastModified: string;
  };
  features: Feature[];
  phases: any[];
  config: any;
}

export interface Feature {
  id: string;
  description: string;
  category: string;
  featureType: string;
  supplier: string;
  realManDays: number;
  expertise: number;
  riskMargin: number;
  manDays: number;
  notes?: string;
  created: string;
  modified: string;
}

export interface AppState {
  // Project state
  currentProject: Project | null;
  isDirty: boolean;
  lastSavedTime: Date | null;
  
  // UI state
  currentPage: string;
  currentSection: string;
  modalsOpen: Set<string>;
  loadingStates: Map<string, boolean>;
  
  // Feature Manager UI state
  editingFeature: Feature | null;
  filteredFeatures: Feature[];
  currentSort: { field: string; direction: 'asc' | 'desc' };
  
  // Notifications
  notifications: any[];
  
  // Configuration
  globalConfig: any;
  
  // Actions
  setProject: (project: Project | null) => void;
  updateProject: (updater: (project: Project) => Project) => void;
  markDirty: () => void;
  markClean: () => void;
  
  // UI actions
  navigateTo: (page: string, section?: string) => void;
  setSection: (section: string) => void;
  
  // Feature Manager actions
  setEditingFeature: (feature: Feature | null) => void;
  setFilteredFeatures: (features: Feature[]) => void;
  setSortOrder: (field: string, direction?: 'asc' | 'desc') => void;
  toggleSortDirection: (field: string) => void;
  
  // Feature CRUD actions
  addProjectFeature: (feature: Feature) => void;
  updateProjectFeature: (featureIndex: number, updatedFeature: Feature) => void;
  removeProjectFeature: (featureIndex: number) => void;
  updateProjectFeatures: (features: Feature[]) => void;
  
  // Computed properties
  hasProject: () => boolean;
  projectName: () => string;
  featureCount: () => number;
  totalManDays: () => number;
}

// React hook to use the Zustand store
export function useStore<T>(selector: (state: AppState) => T): T {
  const [state, setState] = useState<T>(() => {
    // Get initial state from global store
    const store = (window as any).appStore;
    return selector(store.getState());
  });

  useEffect(() => {
    const store = (window as any).appStore;
    if (!store) {
      console.warn('Store not available in React hook');
      return;
    }

    // Subscribe to store changes
    const unsubscribe = store.subscribe((newState: AppState) => {
      const newValue = selector(newState);
      
      // Force update by using a callback to ensure React detects changes
      setState(prevValue => {
        // Deep comparison for objects to detect nested changes
        if (typeof newValue === 'object' && typeof prevValue === 'object') {
          if (JSON.stringify(newValue) !== JSON.stringify(prevValue)) {
            return newValue;
          }
          return prevValue;
        }
        // Primitive comparison
        if (newValue !== prevValue) {
          return newValue;
        }
        return prevValue;
      });
    });

    return unsubscribe;
  }, []); // Empty dependency array since we handle selector internally

  return state;
}

// Convenience hooks for common store slices
export function useProject() {
  return useStore(state => ({
    currentProject: state.currentProject,
    hasProject: state.hasProject(),
    projectName: state.projectName(),
    isDirty: state.isDirty
  }));
}

export function useFeatures() {
  return useStore(state => ({
    filteredFeatures: state.filteredFeatures,
    editingFeature: state.editingFeature,
    currentSort: state.currentSort,
    setEditingFeature: state.setEditingFeature,
    setFilteredFeatures: state.setFilteredFeatures,
    toggleSortDirection: state.toggleSortDirection,
    // CRUD actions
    addFeature: state.addProjectFeature,
    updateFeature: state.updateProjectFeature,
    deleteFeature: state.removeProjectFeature,
    updateFeatures: state.updateProjectFeatures
  }));
}

// Hook specifically for project management
export function useProjectManager() {
  return useStore(state => ({
    // Project state
    currentProject: state.currentProject,
    hasProject: state.hasProject(),
    projectName: state.projectName(),
    isDirty: state.isDirty,
    
    // Project actions
    setProject: state.setProject,
    updateProject: state.updateProject,
    markDirty: state.markDirty,
    markClean: state.markClean,
    
    // Computed properties
    projectCreated: state.currentProject?.project?.created,
    projectModified: state.currentProject?.project?.lastModified,
    projectVersion: state.currentProject?.project?.version,
    projectId: state.currentProject?.project?.id
  }));
}

// Additional hook for complete store actions
export function useStoreActions() {
  return useStore(state => ({
    // Project actions
    setProject: state.setProject,
    updateProject: state.updateProject,
    markDirty: state.markDirty,
    markClean: state.markClean,
    
    // UI actions
    navigateTo: state.navigateTo,
    setSection: state.setSection
  }));
}