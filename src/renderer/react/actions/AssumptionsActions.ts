/**
 * AssumptionsActions - TUTTA la business logic per assumptions
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - ZERO business logic nei componenti
 * - TUTTO qui: validazione, calcoli, operazioni
 * - Store aggiornato SOLO attraverso questi metodi
 */

export interface AssumptionFormData {
  id: string;
  description: string;
  type: 'Technical' | 'Business' | 'Resource' | 'Timeline';
  impact: 'High' | 'Medium' | 'Low';
  notes?: string;
}

export interface Assumption extends AssumptionFormData {
  created: string;
  modified: string;
}

export interface AssumptionFilters {
  search: string;
  type: string;
  impact: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class AssumptionsActions {
  /**
   * Pattern obbligatorio: accesso store attraverso getStore()
   */
  private getStore() {
    return (window as any).appStore;
  }

  /**
   * CRUD OPERATIONS - Business Logic
   */
  
  /**
   * Crea nuova assumption con validazione completa
   */
  createAssumption(data: AssumptionFormData): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      
      // Validazione business logic
      const validation = this.validateAssumptionData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      // Business logic: preparazione dati
      const now = new Date().toISOString();
      const newAssumption: Assumption = {
        ...data,
        id: data.id || this.generateNextAssumptionId(),
        created: now,
        modified: now
      };

      // Aggiornamento store
      state.addProjectAssumption(newAssumption);
      state.markDirty();
      
      // Chiudi modal
      this.closeAssumptionModal();
      
      console.log('Assumption created:', newAssumption.id);
    } catch (error) {
      console.error('Failed to create assumption:', error);
      throw error;
    }
  }

  /**
   * Aggiorna assumption esistente
   */
  updateAssumption(id: string, data: AssumptionFormData): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      
      // Validazione
      const validation = this.validateAssumptionData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      // Business logic: aggiorna dati
      const updatedAssumption: Assumption = {
        ...data,
        id,
        created: this.getCurrentAssumption(id)?.created || new Date().toISOString(),
        modified: new Date().toISOString()
      };

      // Aggiornamento store
      state.updateProjectAssumption(id, updatedAssumption);
      state.markDirty();
      
      // Chiudi modal
      this.closeAssumptionModal();
      
      console.log('Assumption updated:', id);
    } catch (error) {
      console.error('Failed to update assumption:', error);
      throw error;
    }
  }

  /**
   * Elimina assumption con conferma
   */
  deleteAssumption(id: string): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const assumption = this.getCurrentAssumption(id);
      
      if (!assumption) {
        throw new Error('Assumption not found');
      }

      // Business logic: conferma eliminazione
      if (!confirm(`Are you sure you want to delete assumption "${assumption.description}"? This action cannot be undone.`)) {
        return;
      }

      // Aggiornamento store
      state.deleteProjectAssumption(id);
      state.markDirty();
      
      console.log('Assumption deleted:', id);
    } catch (error) {
      console.error('Failed to delete assumption:', error);
      throw error;
    }
  }

  /**
   * Duplica assumption esistente
   */
  duplicateAssumption(id: string): void {
    try {
      const assumption = this.getCurrentAssumption(id);
      if (!assumption) {
        throw new Error('Assumption not found');
      }

      // Business logic: duplicazione
      const duplicateData: AssumptionFormData = {
        id: this.generateNextAssumptionId(),
        description: `${assumption.description} (Copy)`,
        type: assumption.type,
        impact: assumption.impact,
        notes: assumption.notes
      };

      // Apri modal con dati duplicati
      this.openEditAssumptionModal(duplicateData);
      
      console.log('Assumption duplicated for editing:', id);
    } catch (error) {
      console.error('Failed to duplicate assumption:', error);
      throw error;
    }
  }

  /**
   * MODAL MANAGEMENT
   */
  
  /**
   * Apri modal per aggiungere assumption
   */
  openAddAssumptionModal(): void {
    const store = this.getStore();
    const state = store.getState();
    
    const newAssumption: AssumptionFormData = {
      id: this.generateNextAssumptionId(),
      description: '',
      type: 'Technical',
      impact: 'Medium',
      notes: ''
    };

    state.setAssumptionsModalState({
      isOpen: true,
      mode: 'add',
      selectedAssumption: newAssumption
    });
  }

  /**
   * Apri modal per modificare assumption
   */
  openEditAssumptionModal(assumption: AssumptionFormData | Assumption): void {
    const store = this.getStore();
    const state = store.getState();

    state.setAssumptionsModalState({
      isOpen: true,
      mode: 'edit', 
      selectedAssumption: assumption
    });
  }

  /**
   * Chiudi modal
   */
  closeAssumptionModal(): void {
    const store = this.getStore();
    const state = store.getState();

    state.setAssumptionsModalState({
      isOpen: false,
      mode: 'add',
      selectedAssumption: null
    });
  }

  /**
   * FILTERING & SEARCH
   */
  
  /**
   * Applica filtri assumptions
   */
  applyFilters(filters: AssumptionFilters): void {
    const store = this.getStore();
    const state = store.getState();
    
    // Business logic: applicazione filtri
    state.setAssumptionsFilters(filters);
    
    console.log('Filters applied:', filters);
  }

  /**
   * Reset filtri
   */
  resetFilters(): void {
    this.applyFilters({
      search: '',
      type: '',
      impact: ''
    });
  }

  /**
   * UTILITY METHODS
   */
  
  /**
   * Genera prossimo ID assumption (business logic)
   */
  generateNextAssumptionId(): string {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;
    
    if (!currentProject?.assumptions || currentProject.assumptions.length === 0) {
      return 'ASS-001';
    }

    // Business logic: trova ultimo ID e incrementa
    const lastAssumption = currentProject.assumptions[currentProject.assumptions.length - 1];
    
    if (!lastAssumption?.id) {
      return 'ASS-001';
    }

    // Estrai parte numerica
    const match = lastAssumption.id.match(/ASS-(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const nextNumber = lastNumber + 1;
      return `ASS-${nextNumber.toString().padStart(3, '0')}`;
    }

    // Fallback: trova primo ID disponibile
    const existingIds = currentProject.assumptions.map(a => a.id);
    let counter = 1;
    let newId;

    do {
      newId = `ASS-${counter.toString().padStart(3, '0')}`;
      counter++;
    } while (existingIds.includes(newId));

    return newId;
  }

  /**
   * Validazione dati assumption (business logic)
   */
  validateAssumptionData(data: AssumptionFormData): ValidationResult {
    const errors: Record<string, string> = {};

    // Validazione ID
    if (!data.id?.trim()) {
      errors.id = 'ID is required';
    } else if (!/^ASS-\d{3}$/.test(data.id)) {
      errors.id = 'ID must follow format ASS-XXX';
    }

    // Validazione descrizione
    if (!data.description?.trim()) {
      errors.description = 'Description is required';
    } else if (data.description.trim().length < 3) {
      errors.description = 'Description must be at least 3 characters';
    }

    // Validazione type
    const validTypes = ['Technical', 'Business', 'Resource', 'Timeline'];
    if (!data.type || !validTypes.includes(data.type)) {
      errors.type = 'Type is required and must be valid';
    }

    // Validazione impact  
    const validImpacts = ['High', 'Medium', 'Low'];
    if (!data.impact || !validImpacts.includes(data.impact)) {
      errors.impact = 'Impact is required and must be valid';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Ottieni assumption corrente per ID
   */
  private getCurrentAssumption(id: string): Assumption | null {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;
    
    return currentProject?.assumptions?.find((a: Assumption) => a.id === id) || null;
  }

  /**
   * Ottieni tutte le assumptions filtrate (per UI)
   */
  getFilteredAssumptions(): Assumption[] {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;
    const filters = state.assumptionsData?.filters || { search: '', type: '', impact: '' };
    
    if (!currentProject?.assumptions) {
      return [];
    }

    return currentProject.assumptions.filter((assumption: Assumption) => {
      // Search filter
      const searchMatch = !filters.search || 
        assumption.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        assumption.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        (assumption.notes && assumption.notes.toLowerCase().includes(filters.search.toLowerCase()));

      // Type filter  
      const typeMatch = !filters.type || assumption.type === filters.type;

      // Impact filter
      const impactMatch = !filters.impact || assumption.impact === filters.impact;

      return searchMatch && typeMatch && impactMatch;
    });
  }

  /**
   * Calcola summary statistics (business logic)
   */
  getSummaryStats(): { total: number; high: number; medium: number; low: number } {
    const assumptions = this.getFilteredAssumptions();
    
    return {
      total: assumptions.length,
      high: assumptions.filter(a => a.impact === 'High').length,
      medium: assumptions.filter(a => a.impact === 'Medium').length,
      low: assumptions.filter(a => a.impact === 'Low').length
    };
  }
}

// Export singleton instance (seguendo pattern del codebase)
export const assumptionsActions = new AssumptionsActions();