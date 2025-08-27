#!/usr/bin/env node

/**
 * Auto-Workflow Orchestrator
 * 
 * Manages automated development workflows with:
 * - Cucumber-only test creation
 * - State/Actions pattern enforcement
 * - Automatic changelog management
 * - Interactive confirmations
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

class AutoWorkflow {
    constructor() {
        this.agentsDir = path.join(__dirname);
        this.projectRoot = path.dirname(this.agentsDir);
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Main entry point
     */
    async run() {
        const args = process.argv.slice(2);
        const command = args[0];
        
        if (!command) {
            await this.interactiveMode();
            return;
        }

        switch (command) {
            case 'feature':
                await this.handleFeature(args[1], args.slice(2).join(' '));
                break;
            case 'bugfix':
                await this.handleBugfix(args[1], args.slice(2).join(' '));
                break;
            case 'test-update':
                await this.updateTests(args[1]);
                break;
            case 'changelog':
                await this.updateChangelog();
                break;
            case 'interactive':
                await this.interactiveMode();
                break;
            case 'auto-detect':
                await this.autoDetect(args.slice(1).join(' '));
                break;
            default:
                this.showUsage();
        }
        
        this.rl.close();
    }

    /**
     * Interactive mode with menu
     */
    async interactiveMode() {
        console.log('\n🤖 Software Estimation Manager - Auto-Workflow');
        console.log('=========================================');
        console.log('\n⚠️  RICORDA: SEMPRE pattern State/Actions/Dispatcher!');
        console.log('   📦 Actions = Business logic');
        console.log('   🏪 Store = State management (Zustand)'); 
        console.log('   🎨 Components = Solo presentazione\n');
        
        console.log('Choose workflow type:');
        console.log('1. New Feature (con State/Actions pattern)');
        console.log('2. Bug Fix (test = comportamento CORRETTO, fix in Actions)');
        console.log('3. Update Tests Only (Cucumber)');
        console.log('4. Update Changelog Only');
        console.log('5. Exit\n');

        const choice = await this.prompt('Select option (1-5): ');
        
        switch (choice) {
            case '1':
                const featureName = await this.prompt('Feature name: ');
                const featureDesc = await this.prompt('Feature description: ');
                await this.handleFeature(featureName, featureDesc);
                break;
            case '2':
                const bugName = await this.prompt('Bug identifier: ');
                const bugDesc = await this.prompt('Bug description: ');
                await this.handleBugfix(bugName, bugDesc);
                break;
            case '3':
                const testFeature = await this.prompt('Feature to test: ');
                await this.updateTests(testFeature);
                break;
            case '4':
                await this.updateChangelog();
                break;
            case '5':
                console.log('Goodbye!');
                break;
            default:
                console.log('Invalid option');
        }
    }

    /**
     * Auto-detect workflow from user prompt
     */
    async autoDetect(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        
        // Detect workflow type from keywords
        if (lowerPrompt.includes('implementa') || 
            lowerPrompt.includes('aggiungi') || 
            lowerPrompt.includes('crea') ||
            lowerPrompt.includes('feature')) {
            
            const featureName = this.extractFeatureName(prompt);
            await this.handleFeature(featureName, prompt);
            
        } else if (lowerPrompt.includes('fix') || 
                   lowerPrompt.includes('risolvi') || 
                   lowerPrompt.includes('sistema') ||
                   lowerPrompt.includes('bug')) {
            
            const bugName = this.extractBugName(prompt);
            await this.handleBugfix(bugName, prompt);
            
        } else if (lowerPrompt.includes('test')) {
            const feature = this.extractFeatureName(prompt);
            await this.updateTests(feature);
            
        } else {
            console.log('⚠️  Could not detect workflow type from prompt');
            await this.interactiveMode();
        }
    }

    /**
     * Handle feature workflow
     */
    async handleFeature(name, description) {
        console.log(`\n🚀 Starting Feature Workflow: ${name}\n`);
        console.log('⚠️  PATTERN OBBLIGATORIO: State/Actions/Dispatcher - SEMPRE!');
        console.log('   → Business logic SOLO in Actions class');
        console.log('   → State SOLO in app-store.js (Zustand)');
        console.log('   → Component SOLO presentazione\n');
        
        // 1. Create Cucumber test first (TDD)
        console.log('📝 Step 1: Creating Cucumber test (TDD - deve fallire inizialmente)...');
        await this.createCucumberTest(name, description, 'feature');
        
        // 2. Verify pattern compliance
        console.log('\n🔍 Step 2: Verifying State/Actions/Dispatcher pattern...');
        await this.verifyPatterns(name);
        
        // 3. Show implementation guide
        console.log('\n💡 Step 3: Implementation Guide con Template Codice');
        this.showImplementationGuide('feature', name);
        
        // 4. Ask about changelog
        const updateLog = await this.confirm('\n📋 Update CHANGELOG.md?');
        if (updateLog) {
            await this.updateChangelog('feature', name, description);
        }
        
        console.log('\n✅ Feature workflow complete!');
        console.log('📖 RICORDA: Segui ESATTAMENTE il pattern State/Actions/Dispatcher!');
        console.log(`🧪 Run tests: npx cucumber-js features/${this.kebabCase(name)}.feature`);
    }

    /**
     * Handle bugfix workflow
     */
    async handleBugfix(name, description) {
        console.log(`\n🐛 Starting Bugfix Workflow: ${name}\n`);
        console.log('⚠️  BUG FIX: Segui SEMPRE pattern State/Actions/Dispatcher!');
        console.log('   → Fix SOLO in Actions class (mai nei componenti!)');
        console.log('   → Logica corretta in app-store.js');
        console.log('   → Component rimane solo presentazione\n');
        
        // 1. Create Cucumber test for bug (describing CORRECT behavior)
        console.log('📝 Step 1: Creating Cucumber test describing CORRECT behavior (not reproducing bug)...');
        console.log('   ⚠️  Test descrive come l\'app DOVREBBE funzionare (senza bug)');
        console.log('   → Test fallirà inizialmente perché il bug esiste');
        console.log('   → Dopo il fix, test passerà perché comportamento sarà corretto');
        await this.createCucumberTest(name, description, 'bugfix');
        
        // 2. Verify pattern compliance
        console.log('\n🔍 Step 2: Verifying State/Actions/Dispatcher pattern...');
        await this.verifyPatterns(name);
        
        // 3. Show implementation guide
        console.log('\n💡 Step 3: Bug Fix Guide con Pattern Enforcement');
        this.showImplementationGuide('bugfix', name);
        
        // 4. Ask about changelog
        const updateLog = await this.confirm('\n📋 Update CHANGELOG.md?');
        if (updateLog) {
            await this.updateChangelog('bugfix', name, description);
        }
        
        console.log('\n✅ Bugfix workflow complete!');
        console.log('🔧 RICORDA: Fix applicato seguendo pattern State/Actions/Dispatcher!');
        console.log('📋 TEST: Descrivono comportamento CORRETTO (non il bug!)');
        console.log(`🧪 Run tests: npx cucumber-js features/${this.kebabCase(name)}.feature`);
        console.log('   → Test deve passare quando bug è fixato');
    }

    /**
     * Create Cucumber test file
     */
    async createCucumberTest(name, description, type) {
        const featureName = this.kebabCase(name);
        const featureFile = path.join(this.projectRoot, 'features', `${featureName}.feature`);
        
        // Generate Gherkin content
        const gherkinContent = this.generateGherkin(name, description, type);
        
        // Write feature file
        fs.writeFileSync(featureFile, gherkinContent);
        console.log(`✅ Created: features/${featureName}.feature`);
        
        // Generate step definitions
        await this.generateStepDefinitions(featureName, type);
    }

    /**
     * Generate Gherkin scenarios
     */
    generateGherkin(name, description, type) {
        const humanName = this.humanize(name);
        
        if (type === 'feature') {
            return `Feature: ${humanName}
  ${description || `As a user, I want to ${humanName.toLowerCase()}`}

  Background:
    Given the application is loaded
    And I have a project open

  Scenario: Successfully use ${humanName.toLowerCase()}
    When I navigate to the ${humanName.toLowerCase()} section
    Then I should see the ${humanName.toLowerCase()} interface
    And all ${humanName.toLowerCase()} controls should be functional

  Scenario: ${humanName} with valid data
    Given I am on the ${humanName.toLowerCase()} page
    When I enter valid ${humanName.toLowerCase()} data
    And I save the changes
    Then the ${humanName.toLowerCase()} should be saved successfully
    And I should see a success notification

  Scenario: ${humanName} validation
    Given I am on the ${humanName.toLowerCase()} page
    When I enter invalid data
    And I try to save
    Then I should see validation errors
    And the save should be prevented
`;
        } else {
            return `Feature: Bug Fix - ${humanName}
  ${description || `Fix issue with ${humanName.toLowerCase()}`}
  
  As a user, I expect the application to work correctly
  So that I can use ${humanName.toLowerCase()} without issues

  Background:
    Given the application is loaded
    And I have the necessary data setup

  Scenario: ${humanName} works correctly (expected behavior)
    When I perform the standard ${humanName.toLowerCase()} actions
    Then the system should respond correctly
    And no errors should occur
    And the expected result should be displayed

  Scenario: ${humanName} handles edge cases properly
    Given I am in a edge case scenario for ${humanName.toLowerCase()}
    When I perform the ${humanName.toLowerCase()} actions
    Then the system should handle it gracefully
    And provide appropriate feedback
    And maintain system stability

  Scenario: ${humanName} validates inputs correctly
    When I provide various inputs for ${humanName.toLowerCase()}
    Then the system should validate them properly
    And accept valid inputs
    And reject invalid inputs with clear messages
`;
        }
    }

    /**
     * Generate step definitions
     */
    async generateStepDefinitions(featureName, type) {
        const stepFile = path.join(this.projectRoot, 'cucumber', 'step-definitions', `${featureName}-steps.js`);
        const actionClassName = this.pascalCase(featureName) + 'Actions';
        
        const stepContent = `const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * 
 * 1. TUTTA la business logic va in Actions (src/renderer/react/actions/${actionClassName}.ts)
 * 2. Lo state va SOLO in app-store.js (Zustand)
 * 3. I componenti React sono SOLO presentazione
 * 4. MAI logica nei componenti, MAI state locale per dati business
 * 
 * Flusso corretto:
 * User Action → Component → Actions Class → Store → State Update → Re-render
 * 
 * ${type === 'bugfix' ? `
 * ⚠️ BUG FIX: Questi test descrivono il comportamento CORRETTO
 * - NON replicano il bug
 * - Descrivono come l'app DOVREBBE funzionare
 * - Test fallisce perché bug esiste → Fix implementato → Test passa
 * ` : ''}
 */

// Auto-generated step definitions for ${featureName}
// DEVE seguire il pattern State/Actions SEMPRE

Given('the application is loaded', async function() {
    // Verify app store is initialized (Zustand)
    const store = await this.page.evaluate(() => window.appStore);
    expect(store).toBeTruthy();
    
    // Verify Actions class is available
    const hasActions = await this.page.evaluate(() => {
        return window.${actionClassName} !== undefined;
    });
    // Se false, devi creare src/renderer/react/actions/${actionClassName}.ts
});

When('I perform an action on ${featureName}', async function() {
    // PATTERN CORRETTO: Usa Actions class, NON manipolare direttamente
    await this.page.evaluate(() => {
        // Istanzia Actions class
        const actions = new ${actionClassName}();
        // Chiama metodo dell'Actions (che aggiorna lo store)
        actions.performAction(data);
    });
    
    // MAI FARE:
    // - Manipolazione diretta dello state
    // - Business logic nel test
    // - Chiamate dirette allo store senza Actions
});

When('I save ${featureName} data', async function() {
    // SEMPRE attraverso Actions
    await this.page.evaluate(() => {
        const actions = new ${actionClassName}();
        actions.save(formData); // Actions gestisce validazione e store update
    });
});

Then('the ${featureName} state should be updated', async function() {
    // Verifica state attraverso store (read-only)
    const state = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().${featureName}State;
    });
    expect(state).toBeDefined();
});

Then('the UI should reflect the ${featureName} changes', async function() {
    // Verifica che il component React si sia aggiornato
    // (il component usa useStore hook per leggere state)
    const uiState = await this.page.locator('[data-testid="${featureName}-display"]').textContent();
    expect(uiState).toContain('expected value');
});

// RICORDA:
// - Actions class: src/renderer/react/actions/${actionClassName}.ts
// - Store state: src/renderer/js/store/app-store.js
// - Component: src/renderer/react/components/${this.pascalCase(featureName)}.tsx (solo UI)
// - Hook: useStore per connettere component allo store
`;

        fs.writeFileSync(stepFile, stepContent);
        console.log(`✅ Created: cucumber/step-definitions/${featureName}-steps.js`);
    }

    /**
     * Verify architecture patterns
     */
    async verifyPatterns(feature) {
        console.log('\n🔍 PATTERN VERIFICATION - State/Actions/Dispatcher');
        console.log('================================================================');
        
        console.log('\n✅ OBBLIGATORIO - Pattern che DEVI seguire:');
        console.log(`1. 📦 Actions Class: src/renderer/react/actions/${this.pascalCase(feature)}Actions.ts`);
        console.log('   → TUTTA la business logic qui (validazione, calcoli, operazioni)');
        console.log('   → Nessuna business logic nei componenti!');
        
        console.log('\n2. 🏪 Store State: src/renderer/js/store/app-store.js (Zustand)');
        console.log('   → Unica fonte di verità per i dati');
        console.log('   → Actions aggiornano SOLO attraverso store methods');
        
        console.log('\n3. 🎨 Component: src/renderer/react/components/${this.pascalCase(feature)}.tsx');
        console.log('   → SOLO presentazione e UI');
        console.log('   → Usa useStore hook per leggere state');
        console.log('   → Chiama Actions per operazioni');
        
        console.log('\n4. 🧪 Test: SOLO Cucumber - features/${this.kebabCase(feature)}.feature');
        console.log('   → Test dal punto di vista utente');
        console.log('   → Verifica attraverso store state');
        
        console.log('\n❌ DIVIETI ASSOLUTI:');
        console.log('   → MAI business logic nei componenti React');
        console.log('   → MAI useState per dati business (solo UI temporanei)');
        console.log('   → MAI test Jest/unit (solo Cucumber)');
        console.log('   → MAI manipolazione diretta dello state');
        
        console.log('\n🔄 FLUSSO CORRETTO:');
        console.log('User Interaction → Component Event → Actions Method → Store Update → Component Re-render');
        
        console.log('\n📁 Files da creare/aggiornare:');
        console.log(`   • ${this.pascalCase(feature)}Actions.ts - Business logic`);
        console.log(`   • ${this.pascalCase(feature)}.tsx - UI component`);
        console.log('   • app-store.js - State management (se serve nuovo state)');
        console.log(`   • ${this.kebabCase(feature)}.feature - Cucumber tests`);
    }

    /**
     * Show implementation guide
     */
    showImplementationGuide(type, name) {
        const actionName = this.pascalCase(name) + 'Actions';
        const componentName = this.pascalCase(name);
        const kebabName = this.kebabCase(name);
        
        console.log('\n🎯 IMPLEMENTATION GUIDE - State/Actions/Dispatcher Pattern');
        console.log('===========================================================');
        
        console.log('\n📋 TDD CHECKLIST:');
        
        if (type === 'bugfix') {
            console.log('⚠️  BUG FIX - Test descrive comportamento CORRETTO:');
            console.log('1. [ ] Run Cucumber test (fallisce perché bug esiste)');
            console.log('2. [ ] Identifica bug in Actions class o Store');
            console.log('3. [ ] Fix SOLO in Actions/Store (MAI nei componenti!)');
            console.log('4. [ ] Verifica pattern State/Actions/Dispatcher rispettato');
            console.log('5. [ ] Run test again (deve passare - bug fixato)');
        } else {
            console.log('1. [ ] Run Cucumber test (deve fallire inizialmente - TDD!)');
            console.log(`2. [ ] Create Actions class: src/renderer/react/actions/${actionName}.ts`);
            console.log('3. [ ] Update store state: src/renderer/js/store/app-store.js');
            console.log(`4. [ ] Create React component: src/renderer/react/components/${componentName}.tsx`);
            console.log('5. [ ] Connect via hooks (useStore, useFeatureActions)');
            console.log('6. [ ] Run Cucumber test (deve passare)');
        }
        
        console.log('[ ] NO Jest tests (solo Cucumber!)');
        
        console.log('\n📝 TEMPLATE CODICE - SEGUI ESATTAMENTE:');
        console.log('\n1️⃣ ACTIONS CLASS (Business Logic):');
        console.log(`   File: src/renderer/react/actions/${actionName}.ts`);
        console.log(`
// ${actionName}.ts - TUTTA la business logic qui!
export class ${actionName} {
  private getStore() { return (window as any).appStore; }
  
  // Metodi per operazioni business
  create${componentName}(data: ${componentName}Data): void {
    const store = this.getStore();
    const state = store.getState();
    
    // Business logic e validazione QUI
    const new${componentName} = {
      ...data,
      id: this.generateId(),
      created: new Date().toISOString()
    };
    
    // Aggiorna store
    state.add${componentName}(new${componentName});
    state.markDirty();
  }
  
  update${componentName}(id: string, data: ${componentName}Data): void {
    // Business logic per update...
  }
}`);
        
        console.log('\n2️⃣ STORE UPDATE (State Management):');
        console.log('   File: src/renderer/js/store/app-store.js');
        console.log(`
// In app-store.js - Aggiungi state e methods
const appStore = zustand.createStore((set, get) => ({
  ${kebabName}s: [],
  current${componentName}: null,
  
  // Store methods (chiamati da Actions)
  add${componentName}: (${kebabName}) => set(state => ({
    ${kebabName}s: [...state.${kebabName}s, ${kebabName}]
  })),
  
  update${componentName}: (id, updated${componentName}) => set(state => ({
    ${kebabName}s: state.${kebabName}s.map(item => 
      item.id === id ? { ...item, ...updated${componentName} } : item
    )
  }))
}));`);
        
        console.log('\n3️⃣ REACT COMPONENT (Solo UI):');
        console.log(`   File: src/renderer/react/components/${componentName}.tsx`);
        console.log(`
// ${componentName}.tsx - SOLO presentazione!
import { useStore } from '../hooks/useStore';
import { ${actionName} } from '../actions/${actionName}';

export const ${componentName} = () => {
  // SOLO lettura dallo store
  const ${kebabName}s = useStore(state => state.${kebabName}s);
  
  // Actions per operazioni
  const actions = new ${actionName}();
  
  const handleSave = (data) => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.create${componentName}(data);
  };
  
  return (
    <div>
      {/* Solo UI rendering */}
      <button onClick={handleSave}>Save</button>
    </div>
  );
};`);
        
        console.log('\n❗ RICORDA:');
        console.log('• Component = SOLO UI e eventi');
        console.log('• Actions = TUTTA la business logic');
        console.log('• Store = State management e data');
        console.log('• Test = SOLO Cucumber, dal punto di vista utente');
        
        console.log('\n🚀 Prossimi passi:');
        console.log(`npx cucumber-js features/${kebabName}.feature  # Verifica test`);
        console.log(`npm run dev  # Testa in development`);
    }

    /**
     * Update changelog
     */
    async updateChangelog(type, name, description) {
        const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
        const changelog = fs.readFileSync(changelogPath, 'utf8');
        
        const today = new Date().toISOString().split('T')[0];
        const entry = type === 'feature' 
            ? `### Added\n- **${this.humanize(name)}**: ${description}`
            : `### Fixed\n- **${this.humanize(name)}**: ${description}`;
        
        // Find insertion point (after header)
        const lines = changelog.split('\n');
        const insertIndex = lines.findIndex(line => line.startsWith('## ['));
        
        if (insertIndex !== -1) {
            // Check if today's section exists
            const todaySection = `## [Unreleased] - ${today}`;
            const existingIndex = lines.findIndex(line => line.includes('[Unreleased]'));
            
            if (existingIndex !== -1) {
                // Add to existing unreleased section
                lines.splice(existingIndex + 2, 0, entry);
            } else {
                // Create new unreleased section
                lines.splice(insertIndex, 0, todaySection, '', entry, '');
            }
            
            fs.writeFileSync(changelogPath, lines.join('\n'));
            console.log('✅ Updated CHANGELOG.md');
        }
    }

    /**
     * Update tests for existing feature
     */
    async updateTests(feature) {
        console.log(`\n🧪 Updating tests for: ${feature}\n`);
        
        const confirm = await this.confirm('This will create/update Cucumber tests. Continue?');
        if (!confirm) return;
        
        await this.createCucumberTest(feature, `Update tests for ${feature}`, 'feature');
        console.log('\n✅ Tests updated!');
    }

    /**
     * Utility functions
     */
    
    prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question, resolve);
        });
    }

    async confirm(question) {
        const answer = await this.prompt(`${question} (y/n): `);
        return answer.toLowerCase() === 'y';
    }

    kebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2')
                  .replace(/[\s_]+/g, '-')
                  .toLowerCase();
    }

    pascalCase(str) {
        return str.replace(/(-|_|\s)\w/g, (match) => match[1].toUpperCase())
                  .replace(/^./, (match) => match.toUpperCase());
    }

    humanize(str) {
        return str.replace(/[-_]/g, ' ')
                  .replace(/([a-z])([A-Z])/g, '$1 $2')
                  .replace(/^./, (match) => match.toUpperCase());
    }

    extractFeatureName(prompt) {
        // Try to extract feature name from prompt
        const matches = prompt.match(/["']([^"']+)["']|feature\s+(\w+)|funzionalità\s+(\w+)/i);
        return matches ? (matches[1] || matches[2] || matches[3]) : 'new-feature';
    }

    extractBugName(prompt) {
        // Try to extract bug identifier from prompt
        const matches = prompt.match(/["']([^"']+)["']|bug\s+(\w+)|fix\s+(\w+)/i);
        return matches ? (matches[1] || matches[2] || matches[3]) : 'bug-fix';
    }

    showUsage() {
        console.log(`
🤖 Auto-Workflow Usage:

⚠️  PATTERN OBBLIGATORIO: State/Actions/Dispatcher SEMPRE!
  📦 Actions = Business logic (in src/renderer/react/actions/)
  🏪 Store = State management (app-store.js con Zustand)
  🎨 Components = Solo presentazione UI

Commands:
  feature <name> <description>    Create new feature with State/Actions pattern
  bugfix <name> <description>     Fix bug - test = comportamento CORRETTO (non bug!)
  test-update <feature>          Update Cucumber tests 
  changelog                      Update CHANGELOG.md
  interactive                    Interactive mode with pattern guidance
  auto-detect <prompt>          Auto-detect workflow from prompt

Examples:
  node auto-workflow.js feature "user-auth" "User authentication system"
  node auto-workflow.js bugfix "modal-close" "Fix modal not closing"
  node auto-workflow.js interactive
  node auto-workflow.js auto-detect "implementa funzionalità di export PDF"

🎯 Output: Test Cucumber + Actions class + Store update + Component (seguendo pattern!)
        `);
    }
}

// Run the workflow
const workflow = new AutoWorkflow();
workflow.run().catch(console.error);