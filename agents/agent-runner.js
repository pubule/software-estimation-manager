#!/usr/bin/env node

/**
 * Software Estimation Manager - Agent Runner
 * 
 * Command-line interface for interacting with development agents
 * Supports TDD workflows, bug fixing, and architectural validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AgentRunner {
    constructor() {
        this.agentsDir = path.join(__dirname);
        this.workflowConfig = this.loadConfig('orchestrator/workflow-config.json');
        this.availableAgents = this.loadAvailableAgents();
    }

    loadConfig(configPath) {
        try {
            const fullPath = path.join(this.agentsDir, configPath);
            return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        } catch (error) {
            console.error(`Failed to load config: ${configPath}`, error.message);
            return null;
        }
    }

    loadAvailableAgents() {
        const agents = {};
        const agentDirs = fs.readdirSync(this.agentsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && dirent.name !== 'orchestrator')
            .map(dirent => dirent.name);

        for (const agentDir of agentDirs) {
            try {
                const configPath = path.join(this.agentsDir, agentDir, 'agent-config.json');
                if (fs.existsSync(configPath)) {
                    agents[agentDir] = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
            } catch (error) {
                console.warn(`Failed to load agent config for ${agentDir}:`, error.message);
            }
        }

        return agents;
    }

    displayUsage() {
        console.log(`
🤖 Software Estimation Manager - Agent Runner

Usage: node agent-runner.js <command> [options]

Commands:
  list                          List all available agents
  workflow <workflow-type>      Run a complete workflow
  agent <agent-id> <task>      Run specific agent task
  validate                     Run architectural validation
  tdd <feature-name>           Start TDD workflow for feature
  fix <bug-description>        Start bug fixing workflow
  config-change <description>  Handle configuration changes
  test                         Run test suite with agent orchestration

Workflows:
  - tdd_feature_development    Complete TDD cycle for new features
  - bug_fixing                 Systematic bug resolution
  - configuration_changes      Handle config system changes
  - architectural_refactoring  Major architectural changes

Examples:
  node agent-runner.js list
  node agent-runner.js workflow tdd_feature_development
  node agent-runner.js agent architecture-guardian validate-script-order
  node agent-runner.js tdd "user-authentication"
  node agent-runner.js validate
  node agent-runner.js test

For detailed agent information:
  node agent-runner.js agent <agent-id> --info
        `);
    }

    listAgents() {
        console.log('\n🤖 Available Agents:\n');
        
        const agentsByPriority = {
            critical: [],
            core: [],
            high: [],
            medium: [],
            low: []
        };

        Object.entries(this.availableAgents).forEach(([id, config]) => {
            const priority = config.priority || 'medium';
            agentsByPriority[priority].push({ id, config });
        });

        Object.entries(agentsByPriority).forEach(([priority, agents]) => {
            if (agents.length > 0) {
                console.log(`\n📊 ${priority.toUpperCase()} Priority:`);
                agents.forEach(({ id, config }) => {
                    const status = this.getAgentStatus(id);
                    console.log(`  ${status} ${config.name} (${id})`);
                    console.log(`     ${config.description}`);
                });
            }
        });

        console.log('\n📋 Workflows Available:');
        Object.entries(this.workflowConfig.workflow_types).forEach(([id, workflow]) => {
            console.log(`  • ${id}: ${workflow.description}`);
        });
    }

    getAgentStatus(agentId) {
        // Simple status check - could be enhanced with actual agent health checks
        const configExists = fs.existsSync(path.join(this.agentsDir, agentId, 'agent-config.json'));
        return configExists ? '✅' : '❌';
    }

    runWorkflow(workflowType) {
        console.log(`\n🔄 Starting ${workflowType} workflow...\n`);
        
        const workflow = this.workflowConfig.workflow_types[workflowType];
        if (!workflow) {
            console.error(`❌ Unknown workflow: ${workflowType}`);
            console.log('\nAvailable workflows:');
            Object.keys(this.workflowConfig.workflow_types).forEach(wf => {
                console.log(`  • ${wf}`);
            });
            return;
        }

        console.log(`📋 ${workflow.description}\n`);
        
        workflow.phases.forEach((phase, index) => {
            console.log(`\n📍 Phase ${index + 1}: ${phase.name}`);
            console.log(`   Agents: ${phase.agents.join(', ')}`);
            console.log('   Tasks:');
            phase.tasks.forEach(task => {
                console.log(`     • ${task}`);
            });
            
            if (phase.validation) {
                console.log(`   ✅ Validation: ${phase.validation}`);
            }
        });

        console.log('\n🎯 To execute this workflow, agents will coordinate automatically.');
        console.log('💡 Use specific agent commands for manual execution.');
    }

    runAgent(agentId, task, options = {}) {
        console.log(`\n🤖 Running agent: ${agentId}`);
        
        const agent = this.availableAgents[agentId];
        if (!agent) {
            console.error(`❌ Unknown agent: ${agentId}`);
            return;
        }

        if (options.info) {
            this.showAgentInfo(agentId, agent);
            return;
        }

        console.log(`📋 Task: ${task}`);
        console.log(`🎯 Agent: ${agent.name}`);
        console.log(`📝 Description: ${agent.description}\n`);

        // Agent-specific task execution
        switch (agentId) {
            case 'architecture-guardian':
                this.runArchitectureGuardian(task);
                break;
            case 'tdd-developer':
                this.runTDDDeveloper(task);
                break;
            case 'test-creator':
                this.runTestCreator(task);
                break;
            case 'configuration-orchestrator':
                this.runConfigurationOrchestrator(task);
                break;
            default:
                console.log(`⚠️  Agent execution not implemented yet for: ${agentId}`);
                console.log('💡 This will be implemented as the agent system matures.');
        }
    }

    runArchitectureGuardian(task) {
        console.log('🏛️ Architecture Guardian executing...\n');
        
        switch (task) {
            case 'validate-script-order':
                this.validateScriptLoadingOrder();
                break;
            case 'check-component-inheritance':
                this.checkComponentInheritance();
                break;
            case 'validate-all':
                this.validateScriptLoadingOrder();
                this.checkComponentInheritance();
                break;
            default:
                console.log('Available tasks: validate-script-order, check-component-inheritance, validate-all');
        }
    }

    validateScriptLoadingOrder() {
        console.log('🔍 Validating script loading order...');
        
        const indexHtmlPath = path.join(process.cwd(), 'src', 'renderer', 'index.html');
        if (!fs.existsSync(indexHtmlPath)) {
            console.error('❌ index.html not found at expected location');
            return;
        }

        const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
        const scriptMatches = [...htmlContent.matchAll(/<script src="([^"]+)"><\\/script>/g)];
        const scriptOrder = scriptMatches.map(match => match[1]);

        const requiredOrder = [
            'js/utils/base-component.js',
            'js/utils/modal-manager.js',
            'js/utils/helpers.js'
        ];

        console.log('📄 Current script order:');
        scriptOrder.forEach((script, index) => {
            const isRequired = requiredOrder.includes(script);
            const prefix = isRequired ? '✅' : '📄';
            console.log(`  ${index + 1}. ${prefix} ${script}`);
        });

        // Validate critical order
        let isValid = true;
        for (let i = 0; i < requiredOrder.length; i++) {
            const requiredScript = requiredOrder[i];
            const actualIndex = scriptOrder.indexOf(requiredScript);
            
            if (actualIndex === -1) {
                console.error(`❌ CRITICAL: Missing required script: ${requiredScript}`);
                isValid = false;
            } else if (actualIndex !== i) {
                console.error(`❌ CRITICAL: Script order violation: ${requiredScript} should be at position ${i + 1}, found at ${actualIndex + 1}`);
                isValid = false;
            }
        }

        if (isValid) {
            console.log('✅ Script loading order is correct!');
        } else {
            console.log('❌ Script loading order violations detected!');
            console.log('💡 Fix required to prevent "BaseComponent is not defined" errors');
        }
    }

    checkComponentInheritance() {
        console.log('🔍 Checking component inheritance patterns...');
        
        const componentsDir = path.join(process.cwd(), 'src', 'renderer', 'js', 'components');
        if (!fs.existsSync(componentsDir)) {
            console.error('❌ Components directory not found');
            return;
        }

        const componentFiles = fs.readdirSync(componentsDir)
            .filter(file => file.endsWith('.js'));

        let validComponents = 0;
        let totalComponents = 0;

        componentFiles.forEach(file => {
            const filePath = path.join(componentsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            const classMatch = content.match(/class\\s+(\\w+)\\s+extends\\s+(\\w+)/);
            if (classMatch) {
                totalComponents++;
                const [, className, baseClass] = classMatch;
                
                if (baseClass === 'BaseComponent') {
                    console.log(`✅ ${file}: ${className} extends BaseComponent`);
                    validComponents++;
                } else {
                    console.log(`⚠️  ${file}: ${className} extends ${baseClass} (not BaseComponent)`);
                }
            }
        });

        console.log(`\n📊 Component inheritance summary:`);
        console.log(`   Total components: ${totalComponents}`);
        console.log(`   Valid inheritance: ${validComponents}`);
        console.log(`   Compliance rate: ${totalComponents > 0 ? Math.round((validComponents / totalComponents) * 100) : 0}%`);
    }

    showAgentInfo(agentId, agent) {
        console.log(`\n🤖 Agent Information: ${agent.name}\n`);
        console.log(`ID: ${agentId}`);
        console.log(`Version: ${agent.version}`);
        console.log(`Priority: ${agent.priority}`);
        console.log(`Description: ${agent.description}\n`);
        
        if (agent.capabilities) {
            console.log('🛠️  Capabilities:');
            agent.capabilities.forEach(cap => {
                console.log(`   • ${cap}`);
            });
        }

        if (agent.commands) {
            console.log('\n📋 Commands:');
            Object.entries(agent.commands).forEach(([category, commands]) => {
                console.log(`\n  ${category}:`);
                commands.forEach(cmd => {
                    console.log(`    • ${cmd}`);
                });
            });
        }
    }

    startTDDWorkflow(featureName) {
        console.log(`\n🔄 Starting TDD workflow for: ${featureName}\n`);
        console.log('📋 This will coordinate multiple agents through the TDD cycle:');
        console.log('   1. 🏛️  Architecture Guardian - Validate architectural impact');
        console.log('   2. ✅ Test Creator - Create failing tests');
        console.log('   3. 🔧 TDD Developer - Implement minimal solution');
        console.log('   4. 🔄 Refactoring cycle');
        console.log('   5. ✅ Final validation\n');
        
        console.log('💡 For now, run individual agent commands:');
        console.log(`   node agent-runner.js agent architecture-guardian validate-all`);
        console.log(`   node agent-runner.js agent test-creator create-feature-tests`);
    }

    runValidation() {
        console.log('\n🔍 Running complete architectural validation...\n');
        this.runAgent('architecture-guardian', 'validate-all');
    }

    runTests() {
        console.log('\n🧪 Running test suite with agent orchestration...\n');
        try {
            console.log('📋 Running Jest tests...');
            execSync('npm test', { stdio: 'inherit' });
            
            console.log('\n📋 Running E2E tests...');
            execSync('npm run test:e2e', { stdio: 'inherit' });
            
            console.log('\n✅ All tests completed successfully!');
        } catch (error) {
            console.error('❌ Tests failed:', error.message);
        }
    }
}

// Command line interface
function main() {
    const runner = new AgentRunner();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        runner.displayUsage();
        return;
    }

    const command = args[0];
    const subcommand = args[1];
    const options = {};

    // Parse options
    for (let i = 2; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            options[args[i].substring(2)] = true;
        }
    }

    switch (command) {
        case 'list':
            runner.listAgents();
            break;
        case 'workflow':
            if (!subcommand) {
                console.error('❌ Workflow type required');
                runner.displayUsage();
                return;
            }
            runner.runWorkflow(subcommand);
            break;
        case 'agent':
            if (!subcommand) {
                console.error('❌ Agent ID required');
                runner.displayUsage();
                return;
            }
            const task = args[2] || 'info';
            runner.runAgent(subcommand, task, options);
            break;
        case 'tdd':
            const featureName = subcommand || 'new-feature';
            runner.startTDDWorkflow(featureName);
            break;
        case 'validate':
            runner.runValidation();
            break;
        case 'test':
            runner.runTests();
            break;
        case 'fix':
            console.log('🐛 Bug fixing workflow - Coming soon!');
            break;
        case 'config-change':
            console.log('⚙️ Configuration change workflow - Coming soon!');
            break;
        default:
            console.error(`❌ Unknown command: ${command}`);
            runner.displayUsage();
    }
}

if (require.main === module) {
    main();
}

module.exports = AgentRunner;