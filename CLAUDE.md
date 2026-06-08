# CLAUDE.md - Software Estimation Manager

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 REGOLE CRITICHE DI SVILUPPO

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
├── support/                 # World, hooks, mocks (window-mock.js)
├── step-definitions/        # Step definitions Cucumber (.ts files)
└── fixtures/                # Test data (JSON fixtures, CSV)

features/                    # SOLO file .feature (Gherkin)
```

## Common Commands

### Development & Build
- `npm run dev` - Start development with hot reload
- `npm start` - Start Electron application
- `npm run build:mac` - Build for macOS
- `npm run build:win` - Build for Windows

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
3. **SEMPRE State/Actions pattern**
5. **SEMPRE verificare pattern con pattern-enforcer**

## Troubleshooting Common Issues

### "Cannot find store"
- Verificare che app-store.js sia caricato
- Usare `window.appStore` per accesso globale

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