# CLAUDE.md - Software Estimation Manager

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 REGOLE CRITICHE DI SVILUPPO

### 1. Test Strategy - SOLO CUCUMBER
- **MAI creare test Jest/unit/behavioral**
- **SOLO test Cucumber** (.feature files + step definitions)
- Tutti i test attraverso workflow automatizzato
- Test PRIMA del codice (TDD con Cucumber)
- Test dal punto di vista utente, non implementazione
- **⚠️ BUG FIX**: Test descrivono comportamento CORRETTO (non replicano il bug!)

### 2. Workflow Obbligatorio
Per OGNI implementazione/bugfix DEVI:
1. Attivare auto-workflow: `node agents/auto-workflow.js [tipo] [descrizione]`
2. Il workflow crea test Cucumber automaticamente
3. Implementazione DEVE seguire pattern State/Actions
4. Changelog update con conferma user

**NESSUNA ECCEZIONE** - Anche bugfix minori passano dal workflow

### 3. Pattern Architetturale ENFORCED

```
React Component → Actions → Store → State Update
      ↑                              ↓
      └──────── Re-render ←──────────┘
```

**REGOLE ASSOLUTE**:
- **Store**: `src/renderer/js/store/app-store.js` (Zustand) - UNICA fonte di verità
- **Actions**: `src/renderer/react/actions/*.ts` - TUTTA la business logic qui
- **Components**: SOLO presentazione, ZERO business logic
- **State Management**: SEMPRE attraverso store, MAI state locale per dati business

### 4. Auto-Triggers Claude
Quando ricevi questi prompt, esegui AUTOMATICAMENTE:
- "implementa/aggiungi/crea X" → `node agents/auto-workflow.js feature X`
- "fix/risolvi/sistema Y" → `node agents/auto-workflow.js bugfix Y`  
- "test Z" → `node agents/auto-workflow.js test-update Z`
- Qualsiasi task → SEMPRE attraverso workflow

### 5. File Structure ATTUALE
```
src/
├── renderer/
│   ├── react/              # Componenti React (in migrazione)
│   │   ├── actions/        # Business logic (FeatureActions, ProjectActions, etc.)
│   │   ├── components/     # UI components (SOLO presentazione)
│   │   └── hooks/          # Custom hooks (useStore, useFeatureActions, etc.)
│   ├── js/
│   │   ├── store/
│   │   │   └── app-store.js  # Zustand store centrale (UNICO store)
│   │   └── components/        # Legacy components (graduale migrazione a React)
│   └── index.html            # Entry point principale

cucumber/                     # Test framework UNICO
├── step-definitions/         # Step definitions Cucumber
├── page-objects/            # Page objects per UI testing
└── fixtures/                # Test data

features/                    # SOLO file .feature (Gherkin)

agents/                      # Sistema di agenti automatizzati
├── auto-workflow.js         # Orchestratore principale
├── cucumber-test-creator/   # Crea SOLO test Cucumber
├── pattern-enforcer/        # Verifica State/Actions pattern
└── changelog-manager/       # Gestisce CHANGELOG.md
```

## Common Commands

### Development & Build
- `npm run dev` - Start development with hot reload
- `npm start` - Start Electron application
- `npm run build:mac` - Build for macOS
- `npm run build:win` - Build for Windows

### Testing (SOLO CUCUMBER)
- `npx cucumber-js` - Run ALL Cucumber tests
- `npx cucumber-js features/[name].feature` - Run specific feature
- ~~`npm test`~~ - **DEPRECATO** (non usare più!)

### Workflow Automatizzato
- `node agents/auto-workflow.js feature "name"` - Nuova feature con test
- `node agents/auto-workflow.js bugfix "name"` - Bugfix con test
- `node agents/auto-workflow.js interactive` - Modalità guidata
- `node agents/auto-workflow.js auto-detect "prompt"` - Auto-detect da prompt

## Migration Status
- ✅ Feature page → React migrated (FeatureManager, FeatureTable, FeatureModal)
- ✅ Project management → Partially migrated (ProjectManager in React)
- ⏳ Configuration → Legacy (next to migrate)
- ⏳ Calculations → Legacy
- ⏳ Capacity → Legacy
- ⏳ Project Phases → Legacy

## Architecture Principles

### State Management (Zustand)
```javascript
// CORRETTO - Attraverso Actions
const featureActions = new FeatureActions();
featureActions.addFeature(data);

// SBAGLIATO - Direttamente nel componente
project.features.push(newFeature); // MAI fare questo!
```

### Component Pattern
```typescript
// CORRETTO - Component solo presentazione
const FeatureTable = () => {
  const features = useStore(state => state.currentProject?.features);
  const { deleteFeature } = useFeatureActions();
  
  return <button onClick={() => deleteFeature(id)}>Delete</button>;
};

// SBAGLIATO - Business logic nel component
const FeatureTable = () => {
  const handleDelete = (id) => {
    const feature = features.find(f => f.id === id);
    features.splice(features.indexOf(feature), 1); // MAI!
  };
};
```

### Actions Pattern
```typescript
// src/renderer/react/actions/FeatureActions.ts
export class FeatureActions {
  addFeature(data: FeatureFormData): void {
    const store = this.getStore();
    const state = store.getState();
    
    // Business logic HERE
    const newFeature = {
      ...data,
      created: new Date().toISOString(),
      id: this.generateNextFeatureId()
    };
    
    // Update store
    state.addProjectFeature(newFeature);
    state.markDirty();
  }
}
```

## Critical Development Guidelines

### ⚠️ DIVIETI ASSOLUTI
1. **MAI creare test Jest** - Solo Cucumber
2. **MAI business logic nei componenti** - Solo in Actions
3. **MAI state locale per dati business** - Solo app-store.js
4. **MAI implementazione diretta** - Sempre attraverso workflow
5. **MAI modificare senza test** - TDD obbligatorio
6. **MAI test che replicano bug** - Test descrivono comportamento CORRETTO

### ✅ OBBLIGHI
1. **SEMPRE usare workflow** per ogni task
2. **SEMPRE test Cucumber prima del codice**
3. **SEMPRE State/Actions pattern**
4. **SEMPRE chiedere conferma per CHANGELOG**
5. **SEMPRE verificare pattern con pattern-enforcer**

## Troubleshooting Common Issues

### "Cannot find store"
- Verificare che app-store.js sia caricato
- Usare `window.appStore` per accesso globale

### "Test not running"
- Usare SOLO `npx cucumber-js`
- NON usare `npm test` (deprecato)

### "State not updating"
- Verificare uso di Actions class
- Mai mutare state direttamente

### "Component re-rendering issues"
- Usare useStore hook correttamente
- Verificare selectors in useStore

## Important Notes

- **Electron Security**: contextIsolation: true, use preload script
- **Auto-save**: Every 2 minutes con dirty state tracking
- **VSCode Theme**: Dark theme throughout application
- **Component Migration**: Graduale da legacy JS a React/TypeScript

## 🎯 Checklist per Nuove Feature

- [ ] Eseguire `node agents/auto-workflow.js feature "nome"`
- [ ] Test Cucumber generato e verificato
- [ ] Actions class creata in `/react/actions/`
- [ ] Store aggiornato con nuovo state se necessario
- [ ] Component React (solo presentazione)
- [ ] Pattern verificato con pattern-enforcer
- [ ] Test Cucumber passa
- [ ] CHANGELOG aggiornato (se confermato)

## 🐛 Checklist per Bugfix

- [ ] Eseguire `node agents/auto-workflow.js bugfix "nome"`  
- [ ] **Test Cucumber descrive comportamento CORRETTO** (non riproduce bug!)
- [ ] Test fallisce perché bug esiste (TDD)
- [ ] Identifica bug in Actions class o Store
- [ ] Fix implementato SOLO in Actions/Store (MAI nei componenti!)
- [ ] Test Cucumber passa (bug fixato)
- [ ] Pattern State/Actions/Dispatcher rispettato
- [ ] CHANGELOG aggiornato (se confermato)

**IMPORTANTE**: I test per bugfix descrivono come l'app DOVREBBE comportarsi correttamente, non come si comporta con il bug!