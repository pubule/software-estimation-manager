# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-08

### Added
- **Automatic Version Updates**: Every project save now automatically updates the current version with latest project state
- **Enhanced Version Comparison**: Fixed checksum generation to exclude volatile fields (timestamps) preventing false differences
- **Comprehensive Test Infrastructure**: Added behavioral documentation tests for all major components

### Fixed
- **Critical Script Loading Order**: Fixed BaseComponent and ModalManagerBase loading sequence preventing application startup failures
- **Version Comparison Bug**: Resolved issue where comparing a version with itself showed false differences due to timestamp volatility
- **Duplicate Script Loading**: Eliminated duplicate BaseComponent declarations causing JavaScript errors
- **Test Suite Infrastructure**: Fixed 175+ test failures by correcting Jest API usage and mock implementations

### Changed
- **Codebase Consolidation**: Removed all `-refactored` suffix files and renamed them as primary files
- **File Structure Cleanup**: Consolidated duplicate JavaScript files (main.js, data-manager.js, etc.)
- **Application Architecture**: Updated to use ApplicationController as primary entry point
- **Test Configuration**: Improved Jest setup with proper DOM mocking and component isolation

### Technical Details

#### Version Management System
- Modified `ApplicationController.saveProject()` to trigger `VersionManager.updateCurrentVersion()` on every save
- Enhanced `VersionManager.generateChecksum()` to exclude `lastModified` and `calculationData.timestamp` fields
- Added comprehensive logging for version comparison debugging

#### Script Loading Order Fixes
```html
<!-- Before: BaseComponent loaded twice, ModalManagerBase after components -->
<!-- After: Proper dependency order -->
<script src="js/utils/base-component.js"></script>        <!-- Base classes first -->
<script src="js/utils/modal-manager.js"></script>         <!-- Dependencies before consumers -->
<script src="js/components/feature-manager.js"></script>  <!-- Components after dependencies -->
```

#### File Consolidation
- `main-refactored.js` → `main.js`
- `data-manager-refactored.js` → `data-manager.js`
- `feature-manager-refactored.js` → `feature-manager.js`
- `configuration-manager-refactored.js` → `configuration-manager.js`

#### Test Infrastructure Improvements
- Fixed Jest API usage: `jest.fn().rejects()` → `jest.fn().mockRejectedValue()`
- Enhanced DOM setup with required elements for behavioral tests
- Corrected mock implementations to match expected test data structures
- Improved configuration manager mocks with realistic default data

### Developer Notes
- All core functionality remains backward compatible
- Application now automatically maintains version history consistency
- Test suite provides comprehensive behavioral documentation
- Codebase architecture is significantly cleaner after consolidation

### Migration Guide
No user action required. The application will automatically:
1. Update current versions on every save operation
2. Generate stable version checksums excluding volatile data
3. Load components in correct dependency order

---

**Breaking Changes**: None - All changes are internal improvements

**Contributors**: Claude TDD Developer Agent

**Files Modified**: 
- `/src/renderer/index.html` - Script loading order fixes
- `/src/renderer/js/main.js` - Application entry point consolidation
- `/src/renderer/js/components/application-controller.js` - Version update integration
- `/src/renderer/js/components/version-manager.js` - Checksum stability fixes
- `/tests/jest-setup.js` - Test infrastructure improvements
- `/jest.config.js` - Test configuration updates

# Session Summary - 2025-01-16

## Obiettivo Principale
Trasformare la colonna "Phases" in colonna "Status" nella tabella Project Phases Timeline, con dropdown interattivi per modificare lo stato dei progetti tra "Approved" e "Pending", garantendo la persistenza dei cambiamenti.

## Problemi Risolti

### 1. Trasformazione Colonna Phases → Status
- **File modificato**: `src/renderer/js/components/calculations-manager.js`
- **Modifiche**:
    - Rinominata colonna da "Phases" a "Status"
    - Implementata funzione `generateProjectStatusDropdown()` per creare dropdown interattivi
    - Aggiunta logica per determinare lo stato del progetto basandosi sulle allocazioni dei team member

### 2. Problema ID Progetti
- **Problema**: I progetti usavano nomi invece di ID causando problemi di identificazione
- **Soluzione**:
    - Uso di `data-project-id` per identificazione tecnica
    - Mantenimento dei nomi per visualizzazione UI
    - Aggiunta funzione `getProjectIdByName()` per conversione

### 3. Team Members Vuoti
- **Problema**: `this.teamMembers` era vuoto (0 membri)
- **Soluzione**:
    - Memorizzazione di `consolidatedTeamMembers` nella proprietà della classe
    - Uso di `this.consolidatedTeamMembers` invece di array vuoto

### 4. Persistenza Status Non Funzionante
- **Problema**: Lo stato veniva resettato a "pending" dopo il refresh
- **Soluzione Implementata**:
    - Aggiornamento metodo `updateProjectStatusInAllocations()` per salvare automaticamente
    - Creazione metodo `applySavedStatusFromCapacityData()` per ripristinare status salvati
    - Modifica `loadCapacityData()` e `loadCapacityDataFromFile()` per applicare status salvati
    - Aggiornamento cache per mantenere modifiche nella sessione corrente

## File Modificati

### 1. src/renderer/js/components/calculations-manager.js
```javascript
// Principali modifiche:

// 1. Nuova funzione per generare dropdown status
generateProjectStatusDropdown(projectData) {
    // Logica per creare dropdown con status corrente
    // Ricerca allocazioni nei team members consolidati
    // Determinazione status "approved" o "pending"
}

// 2. Update status con persistenza
async updateProjectStatusInAllocations(memberId, projectName, newStatus) {
    // Update allocazioni in memoria
    // Update cache per sessione corrente
    // Salvataggio automatico con saveCapacityData()
}

// 3. Applicazione status salvati
applySavedStatusFromCapacityData(capacityData) {
    // Estrazione status salvati
    // Applicazione a manual assignments
}

// 4. Store consolidated team members
this.consolidatedTeamMembers = teamMembers;
```

### 2. src/renderer/styles/capacity.css
```css
/* Rinominate classi da .col-phases a .col-status */
.col-status {
    /* Stili per colonna status */
}

.status-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    min-height: 40px;
}
```

## Flusso Dati Status

1. **Modifica Status via Dropdown**:
    - User seleziona nuovo status
    - `handleProjectStatusChangeForProject()` chiamato
    - `updateProjectStatusInAllocations()` aggiorna memoria e cache
    - `saveCapacityData()` salva su disco

2. **Salvataggio Dati**:
    - `collectCapacityData()` raccoglie dati inclusi status
    - Dati salvati in JSON con status embedded nelle allocazioni

3. **Caricamento Dati**:
    - `loadCapacityData()` o `loadCapacityDataFromFile()` carica JSON
    - `applySavedStatusFromCapacityData()` applica status salvati
    - UI refreshed per mostrare status caricati

## Testing Consigliato
1. Cambiare status di un progetto da "Approved" a "Pending"
2. Verificare che il cambiamento sia visibile immediatamente
3. Ricaricare la pagina e verificare che lo status sia mantenuto
4. Salvare capacity data e ricaricarla per verificare persistenza

## Note Importanti
- Gli ID progetti sono usati internamente per identificazione (`data-project-id`)
- I nomi progetti sono mostrati nell'UI per leggibilità
- La consolidazione team members è critica per trovare allocazioni corrette
- Il caching è gestito per evitare perdita dati durante la sessione

## Prossimi Passi Potenziali
- Aggiungere conferma prima di cambiare status
- Implementare log delle modifiche status
- Aggiungere filtro per visualizzare solo progetti con status specifico
- Migliorare performance con caching più intelligente

## Comandi Utili
```bash
npm run dev  # Sviluppo con hot reload
npm test     # Eseguire test
```

## Debug Console
Messaggi chiave da monitorare:
- "Searching for allocations in X consolidated team members"
- "Found allocations: X hasApproved: Y hasPending: Z"
- "Updated X allocations for project Y to status Z"
- "Status changes saved successfully"