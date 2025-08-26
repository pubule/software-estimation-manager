/**
 * Feature Actions - Centralized business logic for feature operations
 * Following the application's state manager + actions + dispatcher pattern
 */

export interface FeatureFormData {
  id: string;
  name: string;
  description: string;
  category: string;
  featureType: string;
  supplier: string;
  manDays: number;
  [key: string]: any;
}

export interface FeatureFilters {
  searchTerm: string;
  category: string;
  featureType: string;
  supplier: string;
}

export class FeatureActions {
  private getApp() {
    return (window as any).app;
  }

  private getFeatureManager() {
    const app = this.getApp();
    return app?.managers?.feature;
  }

  private getConfigManager() {
    const app = this.getApp();
    return app?.managers?.config;
  }

  private getStore() {
    return (window as any).appStore;
  }

  /**
   * Add a new feature to the current project
   */
  async addFeature(featureData: FeatureFormData): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      if (!state.currentProject) {
        throw new Error('No project loaded');
      }

      const now = new Date().toISOString();
      const newFeature = {
        ...featureData,
        created: now,
        modified: now
      };

      // Add to store
      state.addProjectFeature(newFeature);

      // Mark project as dirty for auto-save
      state.markDirty();

      console.log('Feature added successfully:', newFeature.id);
    } catch (error) {
      console.error('Failed to add feature:', error);
      throw error;
    }
  }

  /**
   * Update an existing feature
   */
  async updateFeature(featureIndex: number, featureData: FeatureFormData): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      if (!state.currentProject || !state.currentProject.features) {
        throw new Error('No project or features available');
      }

      const updatedFeature = {
        ...featureData,
        modified: new Date().toISOString()
      };

      // Update in store
      state.updateProjectFeature(featureIndex, updatedFeature);

      // Mark project as dirty for auto-save
      state.markDirty();

      console.log('Feature updated successfully:', updatedFeature.id);
    } catch (error) {
      console.error('Failed to update feature:', error);
      throw error;
    }
  }

  /**
   * Delete a feature from the current project
   */
  async deleteFeature(featureIndex: number): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      if (!state.currentProject || !state.currentProject.features) {
        throw new Error('No project or features available');
      }

      const feature = state.currentProject.features[featureIndex];
      if (!feature) {
        throw new Error('Feature not found');
      }

      // Remove from store
      state.removeProjectFeature(featureIndex);

      // Mark project as dirty for auto-save
      state.markDirty();

      console.log('Feature deleted successfully:', feature.id);
    } catch (error) {
      console.error('Failed to delete feature:', error);
      throw error;
    }
  }

  /**
   * Filter features based on search term and filters
   */
  filterFeatures(features: any[], filters: FeatureFilters): any[] {
    try {
      let filteredFeatures = [...features];

      // Apply search term filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredFeatures = filteredFeatures.filter(feature =>
          feature.id?.toLowerCase().includes(searchLower) ||
          feature.name?.toLowerCase().includes(searchLower) ||
          feature.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply category filter
      if (filters.category) {
        filteredFeatures = filteredFeatures.filter(feature => 
          feature.category === filters.category
        );
      }

      // Apply feature type filter
      if (filters.featureType) {
        filteredFeatures = filteredFeatures.filter(feature => 
          feature.featureType === filters.featureType
        );
      }

      // Apply supplier filter
      if (filters.supplier) {
        filteredFeatures = filteredFeatures.filter(feature => 
          feature.supplier === filters.supplier
        );
      }

      return filteredFeatures;
    } catch (error) {
      console.error('Failed to filter features:', error);
      return features;
    }
  }

  /**
   * Calculate feature summary statistics
   */
  calculateSummary(features: any[]): {
    totalFeatures: number;
    totalManDays: number;
    averageManDays: number;
    filteredManDays: number;
  } {
    try {
      const totalFeatures = features.length;
      const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);
      const averageManDays = totalFeatures > 0 ? totalManDays / totalFeatures : 0;

      return {
        totalFeatures,
        totalManDays,
        averageManDays,
        filteredManDays: totalManDays // In filtered context, this equals totalManDays
      };
    } catch (error) {
      console.error('Failed to calculate summary:', error);
      return {
        totalFeatures: 0,
        totalManDays: 0,
        averageManDays: 0,
        filteredManDays: 0
      };
    }
  }

  /**
   * Update coverage value
   */
  async updateCoverage(coverageValue: number): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      if (!state.currentProject) {
        throw new Error('No project loaded');
      }

      // Update coverage in project
      if (!state.currentProject.coverage) {
        state.currentProject.coverage = {};
      }
      
      state.currentProject.coverage.manDays = coverageValue;
      state.currentProject.coverageIsAutoCalculated = false;

      // Mark project as dirty for auto-save
      state.markDirty();

      console.log('Coverage updated to:', coverageValue);
    } catch (error) {
      console.error('Failed to update coverage:', error);
      throw error;
    }
  }

  /**
   * Reset coverage to 30% of total man days
   */
  async resetCoverage(): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      if (!state.currentProject || !state.currentProject.features) {
        throw new Error('No project or features available');
      }

      const totalManDays = state.currentProject.features.reduce(
        (sum: number, feature: any) => sum + (feature.manDays || 0), 
        0
      );
      
      const defaultCoverage = totalManDays * 0.3;
      await this.updateCoverage(defaultCoverage);

      console.log('Coverage reset to 30% of total:', defaultCoverage);
    } catch (error) {
      console.error('Failed to reset coverage:', error);
      throw error;
    }
  }

  /**
   * Get available filter options from configuration
   */
  async getFilterOptions(): Promise<{
    categories: string[];
    featureTypes: string[];
    suppliers: string[];
  }> {
    try {
      const configManager = this.getConfigManager();
      if (!configManager) {
        return { categories: [], featureTypes: [], suppliers: [] };
      }

      // Get configuration data using the proper ConfigurationManager methods
      const categories = configManager.getCategories();
      const suppliers = configManager.getSuppliers();
      
      // Feature types - need to check if this is available in global config
      const featureTypes = configManager.globalConfig?.featureTypes || [
        'Core Feature', 'Enhancement', 'Integration', 'UI Component', 'Data Processing'
      ];
      
      return {
        categories: categories.map(cat => cat.name || cat.id || cat),
        featureTypes: Array.isArray(featureTypes) ? featureTypes : [],
        suppliers: suppliers.map(sup => sup.name || sup.id || sup)
      };
    } catch (error) {
      console.error('Failed to get filter options:', error);
      return { categories: [], featureTypes: [], suppliers: [] };
    }
  }
}

// Create singleton instance
export const featureActions = new FeatureActions();