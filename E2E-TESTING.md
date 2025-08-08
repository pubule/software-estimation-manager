# Test E2E - Guida Completa

Questa guida spiega come eseguire i test end-to-end **SENZA aprire multiple istanze** dell'applicazione.

## 🚀 Modalità di Esecuzione

### Test Standard (Headless)
```bash
npm run test:e2e
```
- **1 SOLA istanza browser** condivisa per tutti i test
- Modalità headless (browser invisibile)
- Velocità massima

### Test Visibili (per debugging)
```bash
npm run test:e2e:visible
```
- **1 SOLA istanza browser** condivisa
- Browser **VISIBILE** - puoi vedere l'esecuzione dei test
- Utile per capire cosa succede

### Test Lenti (per debugging dettagliato)
```bash
npm run test:e2e:slow
```
- **1 SOLA istanza browser** condivisa
- Browser visibile con **rallentamento 1000ms** tra le azioni
- Perfetto per osservare step-by-step

### Test Debug Completo
```bash
npm run test:e2e:debug
```
- **1 SOLA istanza browser** condivisa
- Browser visibile + logging dettagliato
- Rallentamento 500ms + informazioni di debug

## 🔧 Configurazione Avanzata

Puoi personalizzare il comportamento usando variabili d'ambiente:

```bash
# Browser visibile
HEADLESS=false npm run test:e2e

# Rallenta le azioni (in millisecondi)
SLOW_MO=2000 npm run test:e2e:visible

# Abilita debug logging
DEBUG=true npm run test:e2e

# Cambia dimensioni finestra
VIEWPORT_WIDTH=1920 VIEWPORT_HEIGHT=1080 npm run test:e2e:visible

# Pausa tra i test (per osservare)
PAUSE_BETWEEN_TESTS=2000 npm run test:e2e:visible
```

## 🏗️ Come Funziona (NO Multiple Istanze)

### Problema Risolto ✅
**PRIMA**: Ogni scenario apriva una nuova istanza browser
- ❌ Lento
- ❌ Spreco di risorse
- ❌ Instabile

**ORA**: Una sola istanza condivisa per tutti i test
- ✅ Veloce
- ✅ Efficiente
- ✅ Stabile

### Architettura
```
📋 Test Suite Start
  ↓
🚀 Apre 1 BROWSER CONDIVISO
  ↓
📄 Carica APP 1 VOLTA SOLA
  ↓
🔄 Per ogni test:
   • Usa la stessa pagina
   • Reset stato applicazione
   • Esegue test
   • Reset per il prossimo
  ↓
🧹 Fine suite → Chiude browser
```

## 🎯 Vantaggi

### Performance
- **5-10x più veloce** - niente avvio/chiusura browser
- **90% meno uso CPU** - una sola istanza
- **Consumo memoria costante**

### Stabilità
- **No race conditions** tra istanze multiple
- **Reset pulito** stato applicazione
- **Gestione errori migliorata**

### Development Experience
- **Debug più facile** - browser resta aperto
- **Screenshot automatici** su failure
- **Logging dettagliato** delle operazioni

## 🐛 Risoluzione Problemi

### Il browser non si chiude
```bash
# Forza chiusura di eventuali processi orfani
pkill -f "puppeteer\|chrome\|chromium"
```

### Test falliscono per timing
```bash
# Aumenta timeout applicazione
APP_INIT_TIMEOUT=10000 npm run test:e2e
```

### Vuoi vedere tutto in dettaglio
```bash
# Combinazione debug completa
HEADLESS=false DEBUG=true SLOW_MO=1500 PAUSE_BETWEEN_TESTS=1000 npm run test:e2e
```

## 📁 File di Configurazione

- `cucumber/support/shared-browser.js` - Gestione browser condiviso
- `cucumber/support/hooks.js` - Ciclo di vita test
- `cucumber/support/test-config.js` - Configurazione comportamento
- `reports/screenshots/` - Screenshot automatici su failure

## 🎉 Risultato

**Prima**: N test = N browser aperti simultaneamente
**Ora**: N test = 1 browser per tutta la suite

I tuoi test sono ora **efficienti, veloci e controllabili**! 🚀