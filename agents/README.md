# Agents - Sistema di Workflow Automatizzato

Sistema semplificato di agenti per sviluppo automatizzato con test Cucumber e pattern enforcement.

## 🎯 Filosofia

**SEMPLICE e DIRETTO**: Solo 4 agenti specializzati che lavorano insieme tramite un orchestratore centrale.

## 📦 Struttura

```
agents/
├── auto-workflow.js           # Orchestratore principale
├── cucumber-test-creator/     # Crea SOLO test Cucumber
├── pattern-enforcer/          # Verifica State/Actions pattern
└── changelog-manager/         # Gestisce CHANGELOG.md
```

## 🚀 Uso Rapido

### Modalità Interattiva (Consigliata)
```bash
npm run workflow
# oppure
node agents/auto-workflow.js interactive
```

### Comandi Diretti
```bash
# Nuova feature
npm run workflow:feature "nome-feature" "descrizione"

# Bugfix
npm run workflow:bugfix "nome-bug" "descrizione bug"

# Aggiorna test esistenti
npm run workflow:test-update "nome-feature"

# Aggiorna changelog
npm run workflow:changelog
```

### Auto-Detection
Il sistema rileva automaticamente il tipo di task dal prompt:
```bash
node agents/auto-workflow.js auto-detect "implementa funzionalità di export PDF"
```

## 🤖 Agenti Disponibili

### 1. **auto-workflow.js** - Orchestratore
- Coordina tutti gli altri agenti
- Gestisce il flusso completo di sviluppo
- Interfaccia interattiva con menu
- Auto-detection del tipo di task

### 2. **cucumber-test-creator** - Test Creator
- Genera SOLO test Cucumber (.feature files)
- Crea step definitions automaticamente
- Segue pattern Given-When-Then
- Test dal punto di vista utente

### 3. **pattern-enforcer** - Pattern Guardian
- Verifica uso corretto di State/Actions pattern
- Controlla che non ci sia business logic nei componenti
- Assicura uso di app-store.js (Zustand)
- Previene creazione di test Jest

### 4. **changelog-manager** - Changelog Updater
- Aggiorna CHANGELOG.md automaticamente
- Chiede sempre conferma prima di modificare
- Segue formato Keep a Changelog
- Categorizza changes (Added/Fixed/Changed)

## 📋 Workflow Tipico

1. **Ricevi richiesta** → "Implementa feature X"
2. **Auto-workflow attiva** → Crea test Cucumber
3. **Pattern enforcer verifica** → Architettura corretta
4. **Implementi codice** → Seguendo State/Actions
5. **Test passa** → Feature completa
6. **Changelog update** → Con conferma utente

## ⚡ Regole Critiche

1. **SOLO test Cucumber** - Mai Jest o unit test
2. **Sempre State/Actions pattern** - Business logic in Actions
3. **Workflow obbligatorio** - Niente implementazioni dirette
4. **Test prima del codice** - TDD con Cucumber
5. **Conferma per changelog** - Mai modifiche automatiche

## 🎯 Esempi Pratici

### Aggiungere una nuova feature
```bash
npm run workflow:feature "user-auth" "Sistema di autenticazione utenti"

# Output:
# 1. Crea features/user-auth.feature
# 2. Crea cucumber/step-definitions/user-auth-steps.js
# 3. Mostra checklist implementazione
# 4. Chiede se aggiornare CHANGELOG
```

### Fixare un bug
```bash
npm run workflow:bugfix "modal-close" "Modal non si chiude con ESC"

# Output:
# 1. Crea test per riprodurre bug
# 2. Verifica pattern architettura
# 3. Guida al fix
# 4. Update CHANGELOG (se confermato)
```

## 🔧 Configurazione

Ogni agente ha il suo `agent-config.json` che definisce:
- Capacità e constraints
- Pattern da seguire
- Template per generazione codice
- Regole di validazione

## 💡 Tips

- Usa sempre modalità interattiva per workflow guidato
- I test Cucumber devono fallire inizialmente (TDD)
- Verifica sempre con `npx cucumber-js` dopo implementazione
- Non modificare manualmente i file generati dagli agenti
- Segui sempre il pattern State → Actions → Store → Component

## ❌ Da NON Fare

- **MAI** creare test Jest
- **MAI** business logic nei componenti React
- **MAI** implementare senza workflow
- **MAI** modificare CHANGELOG senza conferma
- **MAI** state locale per dati business

## 🆘 Troubleshooting

### "Command not found"
```bash
# Assicurati di essere nella root del progetto
cd /path/to/software-estimation-manager
```

### "Test not created"
```bash
# Verifica che la directory features/ esista
mkdir -p features cucumber/step-definitions
```

### "Pattern violation detected"
- Sposta business logic in Actions
- Usa app-store.js per state
- Rimuovi test Jest se presenti

## 📚 Riferimenti

- [CLAUDE.md](../CLAUDE.md) - Regole complete di sviluppo
- [Cucumber.js](https://cucumber.io/docs/cucumber/) - Documentazione Cucumber
- [Zustand](https://github.com/pmndrs/zustand) - State management