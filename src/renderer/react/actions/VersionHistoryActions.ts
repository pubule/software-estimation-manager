/**
 * VersionHistoryActions - TUTTA la business logic per Version History
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - ZERO business logic nei componenti
 * - TUTTO qui: validazione, calcoli, operazioni, confronti
 * - Store aggiornato SOLO attraverso questi metodi
 */

export interface Version {
  id: string;
  timestamp: string;
  reason: string;
  projectSnapshot: any;
  checksum: string;
  fileSize: number;
}

export interface VersionFilters {
  dateRange: string;
  reason: string;
}

export interface VersionModalState {
  isOpen: boolean;
  selectedVersion?: Version | null;
}

export interface VersionHistoryState {
  versions: Version[];
  currentFilters: VersionFilters;
  modalStates: {
    createModal: VersionModalState;
    compareModal: VersionModalState;
    restoreModal: VersionModalState;
  };
  isLoading: boolean;
}

export interface ComparisonData {
  // Evolution context
  comparisonType: 'version-to-version' | 'initial-version' | 'self-comparison';
  fromVersion: Version | null; // Previous version (null for initial)
  toVersion: Version; // Selected version
  evolutionSummary: EvolutionSummary;
  
  // Change details
  projectChanges: ComparisonField[];
  featureChanges: FeatureComparison;
  assumptionChanges: AssumptionComparison;
  configurationChanges: ConfigComparison;
  calculationChanges: CalculationComparison;
}

/**
 * Evolution summary for Change-Focused Layout (Proposal 3)
 */
export interface EvolutionSummary {
  totalChanges: number;
  timeElapsed: string; // Human readable time between versions
  impactLevel: 'low' | 'medium' | 'high'; // Based on scope of changes
  
  // Effort impact
  effortBefore: number; // Total MD in previous version
  effortAfter: number; // Total MD in current version  
  effortDifference: number; // +/- change in MD
  effortPercentageChange: number; // % change
  
  // Change categories
  additionsCount: number; // New features/assumptions
  modificationsCount: number; // Changed items
  removalsCount: number; // Deleted items
  
  // Summary message for UI
  summaryMessage: string; // e.g., "Major expansion with 3 new features"
}

/**
 * Extended feature comparison with evolution context
 */
export interface FeatureEvolution {
  added: any[];
  removed: any[];
  modified: FeatureModification[];
  totalMDDifference: number;
  impactAnalysis: string; // Human-readable impact description
}

/**
 * Detailed modification info for features
 */
export interface FeatureModification {
  id: string;
  description: string;
  previousValue: any;
  newValue: any;
  changeType: 'effort-change' | 'description-change' | 'category-change';
  impactDescription: string;
}

export interface ComparisonField {
  label: string;
  type: string;
  currentValue: any;
  compareValue: any;
  hasDifference: boolean;
}

export interface FeatureComparison {
  added: any[];
  removed: any[];
  modified: any[];
  totalMDDifference: number;
}

export interface AssumptionComparison {
  added: any[];
  removed: any[];
  modified: any[];
}

export interface ConfigComparison {
  suppliers: ComparisonField;
  internalResources: ComparisonField;
  categories: ComparisonField;
}

export interface VendorCostChange {
  vendorId: string;
  vendor: string;
  role: string;
  department: string;
  changeType: 'added' | 'removed' | 'modified';
  previousValue?: {
    manDays: number;
    rate: number;
    cost: number;
    finalMDs: number;
  };
  currentValue?: {
    manDays: number;
    rate: number;
    cost: number;
    finalMDs: number;
  };
  costDifference: number;
  mdsDifference: number;
}

export interface CalculationComparison {
  totalCostDifference: number;
  totalMDsDifference: number;
  vendorCostChanges: VendorCostChange[];
  addedVendors: any[];
  removedVendors: any[];
  modifiedVendors: any[];
}

export class VersionHistoryActions {
  private maxVersions = 50;
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  constructor() {
    // STATE/ACTIONS/DISPATCHER PATTERN: Listen for project-saved events
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for State/Actions/Dispatcher pattern
   */
  private initializeEventListeners(): void {
    // Listen for project-saved event to trigger version updates
    window.addEventListener('project-saved', this.handleProjectSaved.bind(this));
    
    // Listen for project-modified event to auto-sync current version
    window.addEventListener('project-modified', this.handleProjectModified.bind(this));
    
    console.log('✅ VersionHistoryActions: Event listeners initialized (State/Actions/Dispatcher pattern)');
  }

  /**
   * Handle project-saved event - triggers version update
   */
  private async handleProjectSaved(event: CustomEvent): Promise<void> {
    const { hasVersions, versionHistoryAvailable } = event.detail;
    
    try {
      if (versionHistoryAvailable && hasVersions) {
        console.log('🔄 Project saved event received - updating current version');
        await this.updateCurrentVersion();
      } else {
        console.log('No versions to update or versionHistoryActions not available');
      }
    } catch (error) {
      console.error('Failed to update current version from project-saved event:', error);
      // Don't propagate error - save operation should not fail if version update fails
    }
  }

  /**
   * Handle project-modified event - auto-sync current version with in-memory changes
   */
  private async handleProjectModified(event: CustomEvent): Promise<void> {
    const { action, featureId, hasVersions } = event.detail;
    
    try {
      if (hasVersions) {
        console.log(`🔄 Project modified (${action}) event received - auto-syncing current version`);
        console.log(`📝 Feature ${featureId} was ${action.replace('feature-', '')}`);
        
        // Piccolo delay per assicurarsi che lo store sia aggiornato
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await this.updateCurrentVersion();
      } else {
        console.log('No versions to update for modified project');
      }
    } catch (error) {
      console.error('Failed to update current version from project-modified event:', error);
      // Don't propagate error - feature operation should not fail if version update fails
    }
  }

  /**
   * Pattern obbligatorio: accesso store attraverso getStore()
   */
  private getStore() {
    return (window as any).appStore;
  }

  /**
   * VERSIONING OPERATIONS
   */

  /**
   * Crea nuova versione del progetto corrente
   */
  async createVersion(reason: string): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      if (!reason?.trim()) {
        throw new Error('Version reason is required');
      }

      // Avvia loading
      this.setLoadingState(true);

      // Business logic: genera snapshot del progetto
      const snapshot = this.createProjectSnapshot(currentProject);
      const checksum = this.generateChecksum(snapshot);
      const fileSize = this.calculateDataSize(snapshot);

      // Validazione dimensione
      if (fileSize > this.maxFileSize) {
        throw new Error('Project data too large for versioning');
      }

      // Business logic: genera prossimo ID versione
      const nextVersionId = this.generateNextVersionId(currentProject.versions || []);

      // Crea nuovo oggetto versione
      const newVersion: Version = {
        id: nextVersionId,
        timestamp: new Date().toISOString(),
        reason: reason.trim(),
        projectSnapshot: snapshot,
        checksum: checksum,
        fileSize: fileSize
      };

      // Business logic: gestisci limite massimo versioni
      const updatedVersions = this.enforceVersionLimit([...currentProject.versions || [], newVersion]);

      // Aggiorna store
      state.updateProjectVersions(updatedVersions);
      state.markDirty();

      console.log(`Version ${nextVersionId} created successfully`);
      
      // Chiudi la modal dopo aver creato la versione con successo
      this.closeCreateVersionModal();
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Aggiorna la versione più recente con lo stato corrente del progetto
   * Utilizzato quando si salva il progetto per mantenere la versione corrente sincronizzata
   */
  /**
   * Aggiorna la versione più recente con lo stato corrente del progetto
   * Utilizzato quando si salva il progetto per mantenere la versione corrente sincronizzata
   * ENHANCED: Fixed timing issue with features not being included in snapshots
   */
  /**
   * Aggiorna la versione più recente con lo stato corrente del progetto
   * STATE/ACTIONS/DISPATCHER PATTERN: No delays, solo eventi e stato
   */
  async updateCurrentVersion(): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject || !currentProject.versions || currentProject.versions.length === 0) {
        console.log('No versions to update - skipping current version update');
        return;
      }

      console.log('🔄 Updating current version with fresh store state');
      console.log(`📊 Project has ${currentProject.features?.length || 0} features to include in snapshot`);
      
      // DEBUG: Log delle features prima della creazione snapshot
      if (currentProject.features && currentProject.features.length > 0) {
        console.log('🔍 DEBUG - Features in currentProject before snapshot:', 
          currentProject.features.map((f: any) => ({ id: f.id, created: f.created })));
      } else {
        console.log('🚨 DEBUG - NO FEATURES found in currentProject!');
      }

      // Trova la versione corrente (quella con l'ID più alto)
      console.log('🔍 DEBUG - All versions in project:', 
        currentProject.versions.map((v: any) => ({ 
          id: v.id, 
          timestamp: v.timestamp, 
          featureCount: v.projectSnapshot?.features?.length || 0 
        })));
      
      const mostRecentVersion = currentProject.versions.reduce((latest: Version, current: Version) => {
        const latestNum = parseInt(latest.id.replace('V-', ''));
        const currentNum = parseInt(current.id.replace('V-', ''));
        return currentNum > latestNum ? current : latest;
      });

      console.log(`🔍 DEBUG - Selected current version by highest ID: ${mostRecentVersion.id} (${mostRecentVersion.timestamp})`);
      console.log(`🔍 DEBUG - Selected version currently has ${mostRecentVersion.projectSnapshot?.features?.length || 0} features`);
      console.log(`Updating version ${mostRecentVersion.id} with latest project state`);

      // Avvia loading
      this.setLoadingState(true);

      // STATE PATTERN: Genera snapshot dal current state (single source of truth)
      const updatedSnapshot = this.createProjectSnapshot(currentProject);
      
      // Log snapshot validation
      console.log(`✅ Snapshot created with ${updatedSnapshot.features?.length || 0} features`);
      if (updatedSnapshot.features?.length > 0) {
        console.log('✅ Features in snapshot:', updatedSnapshot.features.map((f: any) => ({ id: f.id, description: f.description })));
      }
      
      const updatedChecksum = this.generateChecksum(updatedSnapshot);
      const updatedFileSize = this.calculateDataSize(updatedSnapshot);

      // Validazione dimensione
      if (updatedFileSize > this.maxFileSize) {
        throw new Error('Project data too large for versioning');
      }

      // Aggiorna la versione corrente mantenendo ID e timestamp originali
      const updatedVersion: Version = {
        ...mostRecentVersion,
        projectSnapshot: updatedSnapshot,
        checksum: updatedChecksum,
        fileSize: updatedFileSize,
        // Non modificare la reason se contiene già (updated)
        reason: mostRecentVersion.reason.includes('(updated)') 
          ? mostRecentVersion.reason 
          : mostRecentVersion.reason + ' (updated)'
      };

      // Sostituisci la versione nel array
      const updatedVersions = currentProject.versions.map((v: Version) => 
        v.id === mostRecentVersion.id ? updatedVersion : v
      );
      
      // DEBUG: Verifica dell'aggiornamento
      const updatedVersionCheck = updatedVersions.find((v: Version) => v.id === mostRecentVersion.id);
      console.log(`🔍 DEBUG - Updated version in array now has ${updatedVersionCheck?.projectSnapshot?.features?.length || 0} features`);

      // ACTIONS PATTERN: Update store through actions
      state.updateProjectVersions(updatedVersions);
      
      console.log(`✅ Version ${mostRecentVersion.id} updated successfully via State/Actions pattern`);
      console.log(`✅ Version snapshot now contains ${updatedSnapshot.features?.length || 0} features`);
    } catch (error) {
      console.error('Failed to update current version:', error);
      throw error;
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Confronta versione specifica con lo stato corrente
   */
  compareVersion(versionId: string): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // Trova versione da confrontare
      const versionToCompare = currentProject.versions?.find((v: Version) => v.id === versionId);
      if (!versionToCompare) {
        throw new Error('Version not found');
      }

      // Validazione integrità
      if (!this.validateVersion(versionToCompare)) {
        throw new Error('Version data is corrupted');
      }

      // Apri modal confronto
      state.setVersionHistoryModalState('compareModal', {
        isOpen: true,
        selectedVersion: versionToCompare
      });

    } catch (error) {
      console.error('Failed to compare version:', error);
      throw error;
    }
  }

  /**
   * Ripristina versione specifica creando una nuova versione
   */
  async restoreVersion(versionId: string): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // Trova versione da ripristinare
      const versionToRestore = currentProject.versions?.find((v: Version) => v.id === versionId);
      if (!versionToRestore) {
        throw new Error('Version not found');
      }

      // Validazione integrità
      if (!this.validateVersion(versionToRestore)) {
        throw new Error('Version data is corrupted');
      }

      this.setLoadingState(true);

      // Business logic: crea una NUOVA versione con i dati ripristinati
      const restoredSnapshot = JSON.parse(JSON.stringify(versionToRestore.projectSnapshot));
      
      // Genera nuovo ID per la versione ripristinata
      const nextVersionId = this.generateNextVersionId(currentProject.versions || []);
      
      // Crea nuova versione che rappresenta il ripristino
      const restoredVersion: Version = {
        id: nextVersionId,
        timestamp: new Date().toISOString(),
        reason: `Restored from ${versionToRestore.id}`,
        projectSnapshot: restoredSnapshot,
        checksum: this.generateChecksum(restoredSnapshot),
        fileSize: this.calculateDataSize(restoredSnapshot)
      };
      
      // Aggiungi la nuova versione all'array esistente
      const updatedVersions = [...(currentProject.versions || []), restoredVersion];
      
      // Applica limite massimo versioni se necessario
      const finalVersions = this.enforceVersionLimit(updatedVersions);
      
      // Prepara i dati del progetto ripristinato con le versioni aggiornate
      const projectWithRestoredData = {
        ...restoredSnapshot,
        versions: finalVersions
      };

      // Aggiorna store con dati ripristinati e nuova versione
      state.setProject(projectWithRestoredData);
      state.markDirty();

      // Chiudi modal
      this.closeRestoreModal();

      console.log(`Created new version ${nextVersionId} with data restored from ${versionToRestore.id}`);
    } catch (error) {
      console.error('Failed to restore version:', error);
      throw error;
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Elimina versione specifica
   */
  deleteVersion(versionId: string): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject?.versions) {
        throw new Error('No versions available');
      }

      // Business logic: trova versione da eliminare
      const versionIndex = currentProject.versions.findIndex((v: Version) => v.id === versionId);
      if (versionIndex === -1) {
        throw new Error('Version not found');
      }

      // Business logic: conferma eliminazione
      const version = currentProject.versions[versionIndex];
      if (!confirm(`Are you sure you want to delete version ${version.id}? This action cannot be undone.`)) {
        return;
      }

      // Rimuovi versione dall'array
      const updatedVersions = currentProject.versions.filter((v: Version) => v.id !== versionId);

      // Aggiorna store
      state.updateProjectVersions(updatedVersions);
      state.markDirty();

      console.log(`Version ${versionId} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete version:', error);
      throw error;
    }
  }

  /**
   * Export versione specifica
   */
  exportVersion(versionId: string): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject?.versions) {
        throw new Error('No versions available');
      }

      const version = currentProject.versions.find((v: Version) => v.id === versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      // Business logic: prepara dati per export
      const exportData = {
        version: version,
        exportedAt: new Date().toISOString(),
        projectName: currentProject.project?.name || 'Unknown Project'
      };

      // Download come JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.project?.name || 'project'}-version-${versionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Version ${versionId} exported successfully`);
    } catch (error) {
      console.error('Failed to export version:', error);
      throw error;
    }
  }

  /**
   * FILTERING & SEARCH
   */

  /**
   * Applica filtri alle versioni
   */
  applyFilters(filters: VersionFilters): void {
    const store = this.getStore();
    const state = store.getState();
    
    // Aggiorna filtri nello store
    state.setVersionHistoryFilters(filters);
    
    console.log('Version filters applied:', filters);
  }

  /**
   * Reset filtri
   */
  resetFilters(): void {
    this.applyFilters({
      dateRange: '',
      reason: ''
    });
  }

  /**
   * Ottieni versioni filtrate
   */
  getFilteredVersions(): Version[] {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;
    const filters = state.versionHistoryData?.filters || { dateRange: '', reason: '' };

    if (!currentProject?.versions) {
      return [];
    }

    return currentProject.versions
      .filter((version: Version) => {
        // Filtro per reason
        const reasonMatch = !filters.reason || 
          version.reason.toLowerCase().includes(filters.reason.toLowerCase());

        // Filtro per data range (implementazione semplificata)
        let dateMatch = true;
        if (filters.dateRange) {
          const versionDate = new Date(version.timestamp);
          const now = new Date();
          
          switch (filters.dateRange) {
            case 'today':
              dateMatch = this.isSameDay(versionDate, now);
              break;
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              dateMatch = versionDate >= weekAgo;
              break;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              dateMatch = versionDate >= monthAgo;
              break;
          }
        }

        return reasonMatch && dateMatch;
      })
      // Sort by timestamp in descending order (most recent first)
      .sort((a: Version, b: Version) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // Descending order: newest first
      });
  }

  /**
   * COMPARISON LOGIC
   */

  /**
   * Genera dati di confronto completi tra versione e stato corrente
   */
  generateComparisonData(versionToCompare: Version): ComparisonData {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;

    if (!currentProject) {
      throw new Error('No current project available for comparison');
    }

    // STATE PATTERN: Get all versions from single source of truth
    const allVersions = currentProject.versions || [];
    
    // BUSINESS LOGIC: Find previous version for version-to-version comparison  
    const selectedVersionIndex = allVersions.findIndex(v => v.id === versionToCompare.id);
    
    if (selectedVersionIndex === -1) {
      throw new Error('Selected version not found in project versions');
    }

    // Determine comparison type and get previous version
    let previousVersion: Version | null = null;
    let comparisonType: 'version-to-version' | 'initial-version' | 'self-comparison';
    
    if (selectedVersionIndex === 0) {
      // First version - compare with empty baseline
      comparisonType = 'initial-version';
      previousVersion = null;
    } else {
      // Get previous version chronologically
      const sortedVersions = [...allVersions].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const sortedIndex = sortedVersions.findIndex(v => v.id === versionToCompare.id);
      
      if (sortedIndex > 0) {
        comparisonType = 'version-to-version';
        previousVersion = sortedVersions[sortedIndex - 1];
      } else {
        comparisonType = 'initial-version';
        previousVersion = null;
      }
    }

    // Generate evolution comparison data
    return this.generateVersionEvolutionData(previousVersion, versionToCompare, comparisonType);
  }

  /**
   * Generate version evolution data for Change-Focused Layout (Proposal 3)
   * STATE/ACTIONS/DISPATCHER PATTERN: Pure business logic, no UI concerns
   */
  private generateVersionEvolutionData(
    fromVersion: Version | null, 
    toVersion: Version,
    comparisonType: 'version-to-version' | 'initial-version' | 'self-comparison'
  ): ComparisonData {
    
    // For initial version, create empty baseline for comparison
    const previousProject = fromVersion?.projectSnapshot || this.createEmptyBaseline();
    const currentProject = toVersion.projectSnapshot;

    // Calculate detailed comparisons
    const projectChanges = this.compareProjectMetadata(currentProject, previousProject);
    const featureChanges = this.compareFeatures(currentProject, previousProject);
    const assumptionChanges = this.compareAssumptions(currentProject, previousProject);
    const configurationChanges = this.compareConfiguration(currentProject, previousProject);
    const calculationChanges = this.compareCalculations(currentProject, previousProject);

    // Generate evolution summary for Change-Focused Layout
    const evolutionSummary = this.generateEvolutionSummary(
      fromVersion,
      toVersion,
      comparisonType,
      featureChanges,
      assumptionChanges,
      projectChanges
    );

    return {
      comparisonType,
      fromVersion,
      toVersion,
      evolutionSummary,
      projectChanges,
      featureChanges,
      assumptionChanges,
      configurationChanges,
      calculationChanges
    };
  }

  /**
   * Generate evolution summary with impact analysis
   * BUSINESS LOGIC: Calculate metrics and impact levels
   */
  private generateEvolutionSummary(
    fromVersion: Version | null,
    toVersion: Version,
    comparisonType: string,
    featureChanges: FeatureComparison,
    assumptionChanges: AssumptionComparison,
    projectChanges: ComparisonField[]
  ): EvolutionSummary {

    // Calculate effort metrics
    const effortBefore = fromVersion ? 
      (fromVersion.projectSnapshot.features || []).reduce((sum: number, f: any) => sum + (f.manDays || 0), 0) : 
      0;
    
    const effortAfter = (toVersion.projectSnapshot.features || []).reduce((sum: number, f: any) => sum + (f.manDays || 0), 0);
    const effortDifference = effortAfter - effortBefore;
    const effortPercentageChange = effortBefore > 0 ? Math.round((effortDifference / effortBefore) * 100) : 100;

    // Calculate change counts
    const additionsCount = featureChanges.added.length + assumptionChanges.added.length;
    const modificationsCount = featureChanges.modified.length + assumptionChanges.modified.length + 
      projectChanges.filter(c => c.hasDifference).length;
    const removalsCount = featureChanges.removed.length + assumptionChanges.removed.length;
    
    const totalChanges = additionsCount + modificationsCount + removalsCount;

    // Calculate time elapsed
    const timeElapsed = fromVersion ? 
      this.calculateTimeElapsed(fromVersion.timestamp, toVersion.timestamp) : 
      'Project inception';

    // Determine impact level
    let impactLevel: 'low' | 'medium' | 'high';
    if (comparisonType === 'initial-version') {
      impactLevel = 'high'; // Project creation always high impact
    } else if (totalChanges === 0) {
      impactLevel = 'low';
    } else if (totalChanges <= 3 && Math.abs(effortPercentageChange) <= 20) {
      impactLevel = 'low';
    } else if (totalChanges <= 8 && Math.abs(effortPercentageChange) <= 50) {
      impactLevel = 'medium';
    } else {
      impactLevel = 'high';
    }

    // Generate summary message
    const summaryMessage = this.generateSummaryMessage(
      comparisonType,
      additionsCount,
      modificationsCount,
      removalsCount,
      effortDifference,
      effortPercentageChange
    );

    return {
      totalChanges,
      timeElapsed,
      impactLevel,
      effortBefore,
      effortAfter,
      effortDifference,
      effortPercentageChange,
      additionsCount,
      modificationsCount,
      removalsCount,
      summaryMessage
    };
  }

  /**
   * Create empty baseline for initial version comparison
   */
  private createEmptyBaseline(): any {
    return {
      project: {
        name: '',
        description: '',
        client: '',
        startDate: '',
        endDate: ''
      },
      features: [],
      assumptions: [],
      configuration: {
        suppliers: [],
        internalResources: [],
        categories: []
      },
      calculationData: {
        vendorCosts: []
      }
    };
  }

  /**
   * Calculate human-readable time elapsed between versions
   */
  private calculateTimeElapsed(fromTimestamp: string, toTimestamp: string): string {
    const from = new Date(fromTimestamp);
    const to = new Date(toTimestamp);
    const diffMs = to.getTime() - from.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'}${diffHours > 0 ? ` ${diffHours}h` : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'}${diffMinutes > 0 ? ` ${diffMinutes}m` : ''}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Generate human-readable summary message for evolution
   */
  private generateSummaryMessage(
    comparisonType: string,
    additions: number,
    modifications: number,
    removals: number,
    effortDiff: number,
    percentageChange: number
  ): string {
    
    if (comparisonType === 'initial-version') {
      return 'Project baseline established with initial features and configuration';
    }
    
    if (additions === 0 && modifications === 0 && removals === 0) {
      return 'No changes detected between versions';
    }

    const changeParts: string[] = [];
    
    if (additions > 0) {
      changeParts.push(`${additions} new item${additions === 1 ? '' : 's'} added`);
    }
    
    if (modifications > 0) {
      changeParts.push(`${modifications} item${modifications === 1 ? '' : 's'} modified`);
    }
    
    if (removals > 0) {
      changeParts.push(`${removals} item${removals === 1 ? '' : 's'} removed`);
    }

    let changeDescription = changeParts.join(', ');
    
    // Add effort impact
    if (Math.abs(effortDiff) > 0.1) {
      const effortDirection = effortDiff > 0 ? 'increased' : 'decreased';
      const effortText = Math.abs(percentageChange) >= 100 
        ? `effort ${effortDirection} significantly` 
        : `effort ${effortDirection} by ${Math.abs(percentageChange)}%`;
      
      changeDescription += `, ${effortText}`;
    }

    return changeDescription.charAt(0).toUpperCase() + changeDescription.slice(1);
  }

  /**
   * VERSION NAVIGATION & CONTEXT METHODS
   * For Change-Focused Layout navigation and edge case handling
   */

  /**
   * Get version context information for UI navigation
   * STATE PATTERN: Read from single source of truth
   */
  getVersionContext(versionId: string): {
    isFirst: boolean;
    isLast: boolean;
    position: number;
    total: number;
    previousVersion: Version | null;
    nextVersion: Version | null;
  } {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;

    if (!currentProject?.versions) {
      throw new Error('No versions available');
    }

    // Sort versions chronologically
    const sortedVersions = [...currentProject.versions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const currentIndex = sortedVersions.findIndex(v => v.id === versionId);
    
    if (currentIndex === -1) {
      throw new Error('Version not found');
    }

    return {
      isFirst: currentIndex === 0,
      isLast: currentIndex === sortedVersions.length - 1,
      position: currentIndex + 1,
      total: sortedVersions.length,
      previousVersion: currentIndex > 0 ? sortedVersions[currentIndex - 1] : null,
      nextVersion: currentIndex < sortedVersions.length - 1 ? sortedVersions[currentIndex + 1] : null
    };
  }

  /**
   * Navigate to previous version in timeline
   * ACTIONS PATTERN: Update modal state through store actions
   */
  navigateToPreviousVersion(currentVersionId: string): void {
    try {
      const context = this.getVersionContext(currentVersionId);
      
      if (context.previousVersion) {
        // Update modal state to show previous version
        const store = this.getStore();
        const state = store.getState();
        
        state.setVersionHistoryModalState('compareModal', {
          isOpen: true,
          selectedVersion: context.previousVersion
        });
        
        console.log(`Navigated to previous version: ${context.previousVersion.id}`);
      }
    } catch (error) {
      console.error('Failed to navigate to previous version:', error);
    }
  }

  /**
   * Navigate to next version in timeline
   * ACTIONS PATTERN: Update modal state through store actions
   */
  navigateToNextVersion(currentVersionId: string): void {
    try {
      const context = this.getVersionContext(currentVersionId);
      
      if (context.nextVersion) {
        // Update modal state to show next version
        const store = this.getStore();
        const state = store.getState();
        
        state.setVersionHistoryModalState('compareModal', {
          isOpen: true,
          selectedVersion: context.nextVersion
        });
        
        console.log(`Navigated to next version: ${context.nextVersion.id}`);
      }
    } catch (error) {
      console.error('Failed to navigate to next version:', error);
    }
  }

  /**
   * Get version timeline for UI display
   * BUSINESS LOGIC: Generate timeline visualization data
   */
  getVersionTimeline(): {
    versions: Array<{
      id: string;
      timestamp: string;
      position: number;
      isSelected: boolean;
      reason: string;
    }>;
    selectedIndex: number;
  } {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;
    const modalState = state.versionHistoryData?.modalStates?.compareModal;

    if (!currentProject?.versions) {
      return { versions: [], selectedIndex: -1 };
    }

    // Sort versions chronologically
    const sortedVersions = [...currentProject.versions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const selectedVersionId = modalState?.selectedVersion?.id;

    const timelineVersions = sortedVersions.map((version, index) => ({
      id: version.id,
      timestamp: version.timestamp,
      position: index,
      isSelected: version.id === selectedVersionId,
      reason: version.reason
    }));

    const selectedIndex = selectedVersionId ? 
      timelineVersions.findIndex(v => v.id === selectedVersionId) : -1;

    return {
      versions: timelineVersions,
      selectedIndex
    };
  }

  /**
   * Enhanced comparison data generator with navigation context
   * Combines evolution data with navigation capabilities
   */
  generateComparisonDataWithNavigation(versionToCompare: Version): ComparisonData & {
    navigationContext: {
      canNavigatePrevious: boolean;
      canNavigateNext: boolean;
      position: string; // "2 of 5"
      timeline: any[];
    };
  } {
    // Get base comparison data
    const comparisonData = this.generateComparisonData(versionToCompare);
    
    // Add navigation context
    const versionContext = this.getVersionContext(versionToCompare.id);
    const timeline = this.getVersionTimeline();

    const navigationContext = {
      canNavigatePrevious: !versionContext.isFirst,
      canNavigateNext: !versionContext.isLast,
      position: `${versionContext.position} of ${versionContext.total}`,
      timeline: timeline.versions
    };

    return {
      ...comparisonData,
      navigationContext
    };
  }

  /**
   * MODAL MANAGEMENT
   */

  /**
   * Apri modal creazione versione
   */
  openCreateVersionModal(): void {
    const store = this.getStore();
    const state = store.getState();

    state.setVersionHistoryModalState('createModal', {
      isOpen: true,
      selectedVersion: null
    });
  }

  /**
   * Chiudi modal creazione versione
   */
  closeCreateVersionModal(): void {
    const store = this.getStore();
    const state = store.getState();

    state.setVersionHistoryModalState('createModal', {
      isOpen: false,
      selectedVersion: null
    });
  }

  /**
   * Chiudi modal confronto
   */
  closeCompareModal(): void {
    const store = this.getStore();
    const state = store.getState();

    state.setVersionHistoryModalState('compareModal', {
      isOpen: false,
      selectedVersion: null
    });
  }

  /**
   * Apri modal ripristino
   */
  openRestoreModal(version: Version): void {
    const store = this.getStore();
    const state = store.getState();

    state.setVersionHistoryModalState('restoreModal', {
      isOpen: true,
      selectedVersion: version
    });
  }

  /**
   * Chiudi modal ripristino
   */
  closeRestoreModal(): void {
    const store = this.getStore();
    const state = store.getState();

    state.setVersionHistoryModalState('restoreModal', {
      isOpen: false,
      selectedVersion: null
    });
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Crea snapshot del progetto corrente
   */
  private createProjectSnapshot(project: any): any {
    // DEBUG: Log del progetto prima del deep copy
    console.log('🔍 DEBUG - createProjectSnapshot input project features:', 
      project.features?.map((f: any) => ({ id: f.id, created: f.created })) || 'NO FEATURES');
    
    const snapshot = JSON.parse(JSON.stringify(project));
    
    // DEBUG: Log dello snapshot dopo deep copy
    console.log('🔍 DEBUG - createProjectSnapshot output snapshot features:', 
      snapshot.features?.map((f: any) => ({ id: f.id, created: f.created })) || 'NO FEATURES');
    
    // Rimuovi array versions per evitare ricorsione
    delete snapshot.versions;
    
    // Includi dati di calcolo se disponibili
    const calculationsData = (window as any).appStore?.getState()?.calculationsData;
    if (calculationsData?.vendorCosts) {
      snapshot.calculationData = {
        vendorCosts: JSON.parse(JSON.stringify(calculationsData.vendorCosts))
      };
    }
    
    return snapshot;
  }

  /**
   * Genera checksum per integrità dati
   */
  private generateChecksum(data: any): string {
    // Copia dati escludendo campi volatili
    const dataForHashing = JSON.parse(JSON.stringify(data));
    
    // Normalizza struttura per compatibilità
    if (!dataForHashing.assumptions) {
      dataForHashing.assumptions = [];
    }
    
    // Rimuovi timestamp volatili per consistency
    if (dataForHashing.calculationData?.timestamp) {
      delete dataForHashing.calculationData.timestamp;
    }
    
    if (dataForHashing.assumptions && Array.isArray(dataForHashing.assumptions)) {
      dataForHashing.assumptions.forEach((assumption: any) => {
        if (assumption.created) delete assumption.created;
        if (assumption.modified) delete assumption.modified;
      });
    }
    
    // Genera hash semplice (per demo - in produzione usare crypto)
    const str = JSON.stringify(dataForHashing);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Calcola dimensione dati in bytes
   */
  private calculateDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Genera prossimo ID versione
   */
  private generateNextVersionId(versions: Version[]): string {
    if (!versions.length) {
      return 'V-001';
    }
    
    const maxId = Math.max(...versions.map(v => {
      const match = v.id.match(/V-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }));
    
    return `V-${(maxId + 1).toString().padStart(3, '0')}`;
  }

  /**
   * Applica limite massimo versioni
   */
  private enforceVersionLimit(versions: Version[]): Version[] {
    if (versions.length <= this.maxVersions) {
      return versions;
    }
    
    // Mantieni le versioni più recenti
    return versions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, this.maxVersions);
  }

  /**
   * Valida integrità versione con supporto per progetti legacy
   */
  private validateVersion(version: Version): boolean {
    // Se non ha projectSnapshot, è invalida
    if (!version.projectSnapshot) {
      return false;
    }
    
    // Se non ha checksum, probabilmente è un progetto legacy - consideralo valido
    if (!version.checksum) {
      console.warn('Version without checksum detected (legacy project), accepting as valid:', version.id);
      return true;
    }
    
    // Per progetti con checksum, verifica l'integrità ma sii permissivo
    const recalculatedChecksum = this.generateChecksum(version.projectSnapshot);
    const isValid = recalculatedChecksum === version.checksum;
    
    if (!isValid) {
      console.warn('Checksum mismatch detected (possibly legacy project), accepting as valid:', {
        versionId: version.id,
        storedChecksum: version.checksum,
        calculatedChecksum: recalculatedChecksum
      });
      // Per i progetti legacy, accetta comunque la versione e aggiorna il checksum
      version.checksum = recalculatedChecksum;
      return true;
    }
    
    return true;
  }

  /**
   * Set loading state
   */
  private setLoadingState(isLoading: boolean): void {
    const store = this.getStore();
    const state = store.getState();
    state.setVersionHistoryLoading(isLoading);
  }

  /**
   * Utility per confronto date
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * COMPARISON METHODS (implementazione semplificata)
   */

  private compareProjectMetadata(current: any, compare: any): ComparisonField[] {
    const fields = [
      { key: 'project.name', label: 'Project Name', type: 'text' },
      { key: 'project.description', label: 'Description', type: 'text' },
      { key: 'project.client', label: 'Client', type: 'text' },
      { key: 'project.startDate', label: 'Start Date', type: 'date' },
      { key: 'project.endDate', label: 'End Date', type: 'date' }
    ];

    return fields.map(field => {
      const currentValue = this.getNestedValue(current, field.key) || '';
      const compareValue = this.getNestedValue(compare, field.key) || '';
      
      return {
        label: field.label,
        type: field.type,
        currentValue,
        compareValue,
        hasDifference: currentValue !== compareValue
      };
    });
  }

  private compareFeatures(current: any, compare: any): FeatureComparison {
    const currentFeatures = current.features || [];
    const compareFeatures = compare.features || [];
    
    const added = currentFeatures.filter((cf: any) => 
      !compareFeatures.find((vf: any) => vf.id === cf.id)
    );
    
    const removed = compareFeatures.filter((vf: any) => 
      !currentFeatures.find((cf: any) => cf.id === vf.id)
    );
    
    const modified = currentFeatures.filter((cf: any) => {
      const vf = compareFeatures.find((v: any) => v.id === cf.id);
      return vf && JSON.stringify(cf) !== JSON.stringify(vf);
    });

    const currentTotalMD = currentFeatures.reduce((sum: number, f: any) => sum + (f.manDays || 0), 0);
    const compareTotalMD = compareFeatures.reduce((sum: number, f: any) => sum + (f.manDays || 0), 0);

    return {
      added,
      removed,
      modified,
      totalMDDifference: currentTotalMD - compareTotalMD
    };
  }

  private compareAssumptions(current: any, compare: any): AssumptionComparison {
    const currentAssumptions = current.assumptions || [];
    const compareAssumptions = compare.assumptions || [];
    
    const added = currentAssumptions.filter((ca: any) => 
      !compareAssumptions.find((va: any) => va.id === ca.id)
    );
    
    const removed = compareAssumptions.filter((va: any) => 
      !currentAssumptions.find((ca: any) => ca.id === va.id)
    );
    
    const modified = currentAssumptions.filter((ca: any) => {
      const va = compareAssumptions.find((v: any) => v.id === ca.id);
      return va && (
        ca.description !== va.description ||
        ca.type !== va.type ||
        ca.impact !== va.impact
      );
    });

    return {
      added,
      removed,
      modified
    };
  }

  private compareConfiguration(current: any, compare: any): ConfigComparison {
    return {
      suppliers: {
        label: 'Suppliers',
        type: 'count',
        currentValue: (current.configuration?.suppliers || []).length,
        compareValue: (compare.configuration?.suppliers || []).length,
        hasDifference: (current.configuration?.suppliers || []).length !== (compare.configuration?.suppliers || []).length
      },
      internalResources: {
        label: 'Internal Resources',
        type: 'count',
        currentValue: (current.configuration?.internalResources || []).length,
        compareValue: (compare.configuration?.internalResources || []).length,
        hasDifference: (current.configuration?.internalResources || []).length !== (compare.configuration?.internalResources || []).length
      },
      categories: {
        label: 'Categories',
        type: 'count',
        currentValue: (current.configuration?.categories || []).length,
        compareValue: (compare.configuration?.categories || []).length,
        hasDifference: (current.configuration?.categories || []).length !== (compare.configuration?.categories || []).length
      }
    };
  }

  private compareCalculations(current: any, compare: any): CalculationComparison {
    const currentCalc = current.calculationData || {};
    const compareCalc = compare.calculationData || {};
    
    const currentVendors = currentCalc.vendorCosts || [];
    const compareVendors = compareCalc.vendorCosts || [];
    
    // Calculate totals using correct field mapping
    const currentTotal = currentVendors.reduce((sum: number, vc: any) => sum + (vc.finalTotCost || vc.totCost || vc.cost || 0), 0);
    const compareTotal = compareVendors.reduce((sum: number, vc: any) => sum + (vc.finalTotCost || vc.totCost || vc.cost || 0), 0);
    
    const currentTotalMDs = currentVendors.reduce((sum: number, vc: any) => sum + (vc.finalMDs || vc.estimatedMDs || vc.manDays || 0), 0);
    const compareTotalMDs = compareVendors.reduce((sum: number, vc: any) => sum + (vc.finalMDs || vc.estimatedMDs || vc.manDays || 0), 0);
    
    // Find changes
    const vendorCostChanges: VendorCostChange[] = [];
    const addedVendors: any[] = [];
    const removedVendors: any[] = [];
    const modifiedVendors: any[] = [];
    
    // Find added and modified vendors
    currentVendors.forEach((currentVendor: any) => {
      const compareVendor = compareVendors.find((cv: any) => cv.vendorId === currentVendor.vendorId);
      
      if (!compareVendor) {
        // Added vendor - but only include if it has meaningful values
        const cost = currentVendor.finalTotCost || currentVendor.totCost || currentVendor.cost || 0;
        const manDays = currentVendor.finalMDs || currentVendor.estimatedMDs || currentVendor.manDays || 0;
        const rate = currentVendor.realRate || currentVendor.officialRate || currentVendor.rate || 0;
        
        // Skip vendor if all values are 0 (no actual calculation data)
        if (cost > 0 || manDays > 0 || rate > 0) {
          const change: VendorCostChange = {
            vendorId: currentVendor.vendorId,
            vendor: currentVendor.vendorName || currentVendor.vendor,
            role: currentVendor.role,
            department: currentVendor.department,
            changeType: 'added',
            currentValue: {
              manDays: manDays,
              rate: rate,
              cost: cost,
              finalMDs: currentVendor.finalMDs || currentVendor.estimatedMDs || 0
            },
            costDifference: cost,
            mdsDifference: manDays
          };
          vendorCostChanges.push(change);
          addedVendors.push(currentVendor);
        }
      } else {
        // Check if modified using correct field mapping
        const currentCost = currentVendor.finalTotCost || currentVendor.totCost || currentVendor.cost || 0;
        const currentManDays = currentVendor.finalMDs || currentVendor.estimatedMDs || currentVendor.manDays || 0;
        const currentRate = currentVendor.realRate || currentVendor.officialRate || currentVendor.rate || 0;
        const previousCost = compareVendor.finalTotCost || compareVendor.totCost || compareVendor.cost || 0;
        const previousManDays = compareVendor.finalMDs || compareVendor.estimatedMDs || compareVendor.manDays || 0;
        const previousRate = compareVendor.realRate || compareVendor.officialRate || compareVendor.rate || 0;
        
        const hasChanges = 
          currentManDays !== previousManDays ||
          currentRate !== previousRate ||
          currentCost !== previousCost;
          
        if (hasChanges) {
          
          // Only include modification if at least one version has meaningful values
          if (currentCost > 0 || currentManDays > 0 || currentRate > 0 ||
              previousCost > 0 || previousManDays > 0 || previousRate > 0) {
            const change: VendorCostChange = {
              vendorId: currentVendor.vendorId,
              vendor: currentVendor.vendorName || currentVendor.vendor,
              role: currentVendor.role,
              department: currentVendor.department,
              changeType: 'modified',
              previousValue: {
                manDays: previousManDays,
                rate: previousRate,
                cost: previousCost,
                finalMDs: compareVendor.finalMDs || compareVendor.estimatedMDs || 0
              },
              currentValue: {
                manDays: currentManDays,
                rate: currentRate,
                cost: currentCost,
                finalMDs: currentVendor.finalMDs || currentVendor.estimatedMDs || 0
              },
              costDifference: currentCost - previousCost,
              mdsDifference: currentManDays - previousManDays
            };
            vendorCostChanges.push(change);
            modifiedVendors.push(currentVendor);
          }
        }
      }
    });
    
    // Find removed vendors
    compareVendors.forEach((compareVendor: any) => {
      const currentVendor = currentVendors.find((cv: any) => cv.vendorId === compareVendor.vendorId);
      
      if (!currentVendor) {
        // Removed vendor - but only include if it had meaningful values
        const cost = compareVendor.finalTotCost || compareVendor.totCost || compareVendor.cost || 0;
        const manDays = compareVendor.finalMDs || compareVendor.estimatedMDs || compareVendor.manDays || 0;
        const rate = compareVendor.realRate || compareVendor.officialRate || compareVendor.rate || 0;
        
        // Skip vendor if all values were 0 (no actual calculation data)
        if (cost > 0 || manDays > 0 || rate > 0) {
          const change: VendorCostChange = {
            vendorId: compareVendor.vendorId,
            vendor: compareVendor.vendorName || compareVendor.vendor,
            role: compareVendor.role,
            department: compareVendor.department,
            changeType: 'removed',
            previousValue: {
              manDays: manDays,
              rate: rate,
              cost: cost,
              finalMDs: compareVendor.finalMDs || compareVendor.estimatedMDs || 0
            },
            costDifference: -cost,
            mdsDifference: -manDays
          };
          vendorCostChanges.push(change);
          removedVendors.push(compareVendor);
        }
      }
    });
    
    return {
      totalCostDifference: currentTotal - compareTotal,
      totalMDsDifference: currentTotalMDs - compareTotalMDs,
      vendorCostChanges,
      addedVendors,
      removedVendors,
      modifiedVendors
    };
  }

  /**
   * Utility per accesso proprietà nidificate
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance (seguendo pattern del codebase)
export const versionHistoryActions = new VersionHistoryActions();