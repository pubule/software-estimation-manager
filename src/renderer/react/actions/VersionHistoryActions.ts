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
  projectChanges: ComparisonField[];
  featureChanges: FeatureComparison;
  assumptionChanges: AssumptionComparison;
  configurationChanges: ConfigComparison;
  calculationChanges: CalculationComparison;
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

export interface CalculationComparison {
  totalCostDifference: number;
  vendorCostChanges: any[];
}

export class VersionHistoryActions {
  private maxVersions = 50;
  private maxFileSize = 10 * 1024 * 1024; // 10MB

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
  async updateCurrentVersion(): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject || !currentProject.versions || currentProject.versions.length === 0) {
        console.log('No versions to update - skipping current version update');
        return;
      }

      // Trova la versione più recente (quella con timestamp più recente)
      const mostRecentVersion = currentProject.versions.reduce((latest: Version, current: Version) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
      });

      console.log(`Updating current version ${mostRecentVersion.id} with latest project data`);

      // Avvia loading
      this.setLoadingState(true);

      // Business logic: genera snapshot aggiornato del progetto
      const updatedSnapshot = this.createProjectSnapshot(currentProject);
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
        reason: mostRecentVersion.reason + ' (updated)'
      };

      // Sostituisci la versione nel array
      const updatedVersions = currentProject.versions.map((v: Version) => 
        v.id === mostRecentVersion.id ? updatedVersion : v
      );

      // Aggiorna store
      state.updateProjectVersions(updatedVersions);
      // Non marcare come dirty perché stiamo salvando

      console.log(`✅ Current version ${mostRecentVersion.id} updated successfully`);
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
   * Ripristina versione specifica
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

      // Business logic: crea backup automatico prima del ripristino
      const backupReason = `Backup before restoring ${versionToRestore.id}`;
      await this.createVersion(backupReason);

      // Business logic: ripristina i dati (senza array versions per evitare ricorsione)
      const restoredData = JSON.parse(JSON.stringify(versionToRestore.projectSnapshot));
      
      // Mantieni le versioni attuali
      restoredData.versions = currentProject.versions;

      // Aggiorna store con dati ripristinati
      state.setCurrentProject(restoredData);
      state.markDirty();

      // Chiudi modal
      this.closeRestoreModal();

      console.log(`Version ${versionToRestore.id} restored successfully`);
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

    return currentProject.versions.filter((version: Version) => {
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

    const compareProject = versionToCompare.projectSnapshot;

    return {
      projectChanges: this.compareProjectMetadata(currentProject, compareProject),
      featureChanges: this.compareFeatures(currentProject, compareProject),
      assumptionChanges: this.compareAssumptions(currentProject, compareProject),
      configurationChanges: this.compareConfiguration(currentProject, compareProject),
      calculationChanges: this.compareCalculations(currentProject, compareProject)
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
    const snapshot = JSON.parse(JSON.stringify(project));
    
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
   * Valida integrità versione
   */
  private validateVersion(version: Version): boolean {
    if (!version.projectSnapshot || !version.checksum) {
      return false;
    }
    
    const recalculatedChecksum = this.generateChecksum(version.projectSnapshot);
    return recalculatedChecksum === version.checksum;
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
    
    const currentTotal = (currentCalc.vendorCosts || []).reduce((sum: number, vc: any) => sum + (vc.totalCost || 0), 0);
    const compareTotal = (compareCalc.vendorCosts || []).reduce((sum: number, vc: any) => sum + (vc.totalCost || 0), 0);
    
    return {
      totalCostDifference: currentTotal - compareTotal,
      vendorCostChanges: [] // Implementazione semplificata
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