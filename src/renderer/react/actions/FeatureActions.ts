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
  addFeature(featureData: FeatureFormData): void {
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

      // STATE/ACTIONS/DISPATCHER PATTERN: Dispatch project-modified event for version sync
      window.dispatchEvent(new CustomEvent('project-modified', {
        detail: {
          action: 'feature-added',
          featureId: newFeature.id,
          hasVersions: state.currentProject.versions?.length > 0
        }
      }));

      console.log('Feature added successfully:', newFeature.id);
    } catch (error) {
      console.error('Failed to add feature:', error);
      throw error;
    }
  }

  /**
   * Update an existing feature
   */
  updateFeature(featureIndex: number, featureData: FeatureFormData): void {
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

      // STATE/ACTIONS/DISPATCHER PATTERN: Dispatch project-modified event for version sync
      window.dispatchEvent(new CustomEvent('project-modified', {
        detail: {
          action: 'feature-updated',
          featureId: updatedFeature.id,
          hasVersions: state.currentProject.versions?.length > 0
        }
      }));

      console.log('Feature updated successfully:', updatedFeature.id);
    } catch (error) {
      console.error('Failed to update feature:', error);
      throw error;
    }
  }

  /**
   * Delete a feature from the current project
   */
  deleteFeature(featureIndex: number): void {
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

      // STATE/ACTIONS/DISPATCHER PATTERN: Dispatch project-modified event for version sync
      window.dispatchEvent(new CustomEvent('project-modified', {
        detail: {
          action: 'feature-deleted',
          featureId: feature.id,
          hasVersions: state.currentProject.versions?.length > 0
        }
      }));

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
  updateCoverage(coverageValue: number, isAutoCalculated?: boolean): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      if (!state.currentProject) {
        throw new Error('No project loaded');
      }

      // If isAutoCalculated is not specified, preserve the existing value
      const autoCalc = isAutoCalculated !== undefined 
        ? isAutoCalculated 
        : state.currentProject.coverageIsAutoCalculated;

      // Update coverage in project (direct value instead of object)
      state.currentProject.coverage = coverageValue;
      state.currentProject.coverageIsAutoCalculated = autoCalc;

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
  resetCoverage(): void {
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
      this.updateCoverage(defaultCoverage, true); // Set as auto-calculated

      console.log('Coverage reset to 30% of total:', defaultCoverage);
    } catch (error) {
      console.error('Failed to reset coverage:', error);
      throw error;
    }
  }

  /**
   * Open modal for adding a new feature
   */
  openAddFeatureModal(): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }
      
      store.getState().openFeatureModal(null);
      console.log('Add feature modal opened');
    } catch (error) {
      console.error('Failed to open add feature modal:', error);
      throw error;
    }
  }

  /**
   * Open modal for editing an existing feature
   */
  openEditFeatureModal(feature: any): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }
      
      store.getState().openFeatureModal(feature);
      console.log('Edit feature modal opened for:', feature.id);
    } catch (error) {
      console.error('Failed to open edit feature modal:', error);
      throw error;
    }
  }

  /**
   * Close the feature modal
   */
  closeFeatureModal(): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }
      
      store.getState().closeFeatureModal();
      console.log('Feature modal closed');
    } catch (error) {
      console.error('Failed to close feature modal:', error);
      throw error;
    }
  }

  /**
   * Duplicate an existing feature by opening Add modal with pre-populated data
   */
  duplicateFeature(originalFeature: any): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }
      
      const state = store.getState();
      
      // Set duplicate source data in store
      state.setDuplicateData(originalFeature);
      
      // Open Add modal (not Edit modal) to ensure proper save flow
      state.openFeatureModal(null);
      
      console.log('Duplicate feature modal opened in Add mode for:', originalFeature.id);
    } catch (error) {
      console.error('Failed to duplicate feature:', error);
      throw error;
    }
  }

  /**
   * Generate next feature ID with BR-XXX pattern, ensuring uniqueness
   */
  generateNextFeatureId(): string {
    try {
      const store = this.getStore();
      if (!store) {
        return 'BR-001';
      }
      
      const features = store.getState().currentProject?.features || [];
      const existingIds = new Set(features.map(f => f.id));
      
      const brIds = features
        .map(f => f.id)
        .filter(id => id.startsWith('BR-'))
        .map(id => parseInt(id.replace('BR-', '').replace(/^0+/, '')))
        .filter(n => !isNaN(n));
      
      let nextNumber = brIds.length > 0 ? Math.max(...brIds) + 1 : 1;
      let candidateId = `BR-${String(nextNumber).padStart(3, '0')}`;
      
      // Ensure ID is unique (in case of manual additions)
      while (existingIds.has(candidateId)) {
        nextNumber++;
        candidateId = `BR-${String(nextNumber).padStart(3, '0')}`;
      }
      
      return candidateId;
    } catch (error) {
      console.error('Failed to generate feature ID:', error);
      return 'BR-001';
    }
  }

  /**
   * Get default man days for category/feature type combination
   */
  getDefaultManDays(categoryId: string, featureTypeId: string): number {
    try {
      const configManager = this.getConfigManager();
      if (!configManager) {
        return 0;
      }
      
      const store = this.getStore();
      const state = store?.getState();
      const currentProject = state?.currentProject;
      // Support both legacy (config) and new (configuration) structure
      const projectConfig = currentProject?.configuration || currentProject?.config;
      
      const categories = configManager.getCategories(projectConfig);
      
      const category = categories.find(c => 
        c.id === categoryId
      );
      
      if (!category || !category.featureTypes) {
        return 0;
      }
      
      const featureType = category.featureTypes.find(ft => 
        ft.id === featureTypeId
      );
      
      return featureType?.averageMDs || featureType?.estimatedManDays || 0;
    } catch (error) {
      console.error('Failed to get default man days:', error);
      return 0;
    }
  }

  /**
   * Get feature types for selected category
   */
  getFeatureTypesForCategory(categoryId: string): any[] {
    try {
      const configManager = this.getConfigManager();
      if (!configManager) {
        return [];
      }
      
      const store = this.getStore();
      const state = store?.getState();
      const currentProject = state?.currentProject;
      // Support both legacy (config) and new (configuration) structure
      const projectConfig = currentProject?.configuration || currentProject?.config;
      
      const categories = configManager.getCategories(projectConfig);
      
      const category = categories.find(c => 
        c.id === categoryId
      );
      
      return category?.featureTypes || [];
    } catch (error) {
      console.error('Failed to get feature types for category:', error);
      return [];
    }
  }

  /**
   * Get category name by ID
   * @param categoryId The category ID
   * @returns The category name or the ID if not found
   */
  getCategoryNameById(categoryId: string): string {
    try {
      if (!categoryId) return '';
      
      const configManager = this.getConfigManager();
      if (!configManager) {
        return categoryId;
      }
      
      const store = this.getStore();
      const state = store?.getState();
      const currentProject = state?.currentProject;
      // Support both legacy (config) and new (configuration) structure
      const projectConfig = currentProject?.configuration || currentProject?.config;
      
      const categories = configManager.getCategories(projectConfig);
      const category = categories?.find(c => c.id === categoryId);
      
      return category?.name || categoryId;
    } catch (error) {
      console.error('Failed to get category name:', error);
      return categoryId;
    }
  }

  /**
   * Get feature type name by ID
   * @param categoryId The category ID containing the feature type
   * @param featureTypeId The feature type ID
   * @returns The feature type name or the ID if not found
   */
  getFeatureTypeNameById(categoryId: string, featureTypeId: string): string {
    try {
      if (!categoryId || !featureTypeId) return featureTypeId || '';
      
      const featureTypes = this.getFeatureTypesForCategory(categoryId);
      const featureType = featureTypes?.find(ft => ft.id === featureTypeId);
      
      return featureType?.name || featureTypeId;
    } catch (error) {
      console.error('Failed to get feature type name:', error);
      return featureTypeId;
    }
  }

  /**
   * Get supplier display name formatted as "IT - Developer AVG (€450/day)"
   * @param supplierId The supplier ID
   * @returns Formatted supplier display name
   */
  getSupplierDisplayName(supplierId: string): string {
    try {
      if (!supplierId) return '';
      
      const configManager = this.getConfigManager();
      if (!configManager) {
        return supplierId;
      }
      
      const store = this.getStore();
      const state = store?.getState();
      const currentProject = state?.currentProject;
      // Support both legacy (config) and new (configuration) structure
      const projectConfig = currentProject?.configuration || currentProject?.config;
      
      // Check external suppliers first (use global config when project config is undefined)
      const suppliers = configManager.getSuppliers(projectConfig) || [];
      let supplier = suppliers.find(s => s.id === supplierId);
      
      if (supplier) {
        const rate = supplier.officialRate || supplier.realRate || 0;
        return `${supplier.location || 'EXT'} - ${supplier.name} (€${rate}/day)`;
      }
      
      // Check internal resources (use global config when project config is undefined)
      const internalResources = configManager.getInternalResources(projectConfig) || [];
      
      // Try exact match first
      supplier = internalResources.find(r => r.id === supplierId);
      
      // If not found, try fuzzy matching for common ID variations
      if (!supplier) {
        // Map common ID variations (developer avg-g2-it → developer-g2-avg)
        const normalizedId = supplierId.replace(/\s+/g, '-').replace('avg-g2-it', 'g2-avg');
        supplier = internalResources.find(r => r.id === normalizedId);
      }
      
      if (supplier) {
        const rate = supplier.officialRate || supplier.realRate || 0;
        return `IT - ${supplier.name} (€${rate}/day)`;
      }
      return supplierId;
    } catch (error) {
      console.error('Failed to get supplier display name:', error);
      return supplierId;
    }
  }

  /**
   * Create complete notification config object
   */
  private createNotificationConfig(message: string, type: string): any {
    return {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message: message,
      type: type,
      duration: 5000,
      persistent: false,
      actions: [],
      onClick: null,
      onClose: null,
      timestamp: new Date()
    };
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
        const notificationConfig = this.createNotificationConfig(message, 'success');
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
        const notificationConfig = this.createNotificationConfig(message, 'error');
        state.addNotification(notificationConfig);
      }
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }

  /**
   * Get available filter options from configuration
   */
  async getFilterOptions(): Promise<{
    categories: any[];
    featureTypes: string[];
    suppliers: any[];
  }> {
    try {
      const configManager = this.getConfigManager();
      
      if (!configManager) {
        return { categories: [], featureTypes: [], suppliers: [] };
      }

      // Get current project configuration from store
      const store = this.getStore();
      const state = store?.getState();
      const currentProject = state?.currentProject;
      // Support both legacy (config) and new (configuration) structure
      const projectConfig = currentProject?.configuration || currentProject?.config;
      

      // Get configuration data using the proper ConfigurationManager methods with projectConfig
      const categories = configManager.getCategories(projectConfig);
      const suppliers = configManager.getSuppliers(projectConfig);
      const internalResources = configManager.getInternalResources(projectConfig);
      
      
      // Feature types - extract all feature types from all categories
      const allFeatureTypes: string[] = [];
      if (categories && Array.isArray(categories)) {
        categories.forEach(category => {
          if (category.featureTypes && Array.isArray(category.featureTypes)) {
            category.featureTypes.forEach(ft => {
              if (ft.name && !allFeatureTypes.includes(ft.name)) {
                allFeatureTypes.push(ft.name);
              }
            });
          }
        });
      }
      

      // Combine suppliers and internal resources, filter for G2 role only
      const filteredSuppliers = suppliers?.filter(sup => sup.role === 'G2') || [];
      const filteredInternalResources = internalResources?.filter(res => res.role === 'G2') || [];
      

      const combinedSuppliers = [
        ...filteredSuppliers,
        ...filteredInternalResources.map(res => ({ ...res, type: 'internal' })) // Mark internal resources
      ];
      

      // If no suppliers found, provide fallback data for debugging
      if (combinedSuppliers.length === 0) {
        const fallbackSuppliers = [
          {
            id: 'fallback-1',
            name: 'Debug Supplier',
            role: 'G2',
            status: 'active',
            department: 'Debug',
            realRate: 400,
            officialRate: 450,
            type: 'external'
          },
          {
            id: 'fallback-2', 
            name: 'Debug Internal',
            role: 'G2',
            status: 'active',
            department: 'Debug',
            realRate: 350,
            officialRate: 400,
            type: 'internal'
          }
        ];
        
        return {
          categories: categories || [],
          featureTypes: allFeatureTypes,
          suppliers: fallbackSuppliers
        };
      }
      
      return {
        categories: categories || [],
        featureTypes: allFeatureTypes,
        suppliers: combinedSuppliers
      };
    } catch (error) {
      console.error('Failed to get filter options:', error);
      return { categories: [], featureTypes: [], suppliers: [] };
    }
  }
}

// Create singleton instance
export const featureActions = new FeatureActions();