# AI Agents - Quick Start Guide

## 🚀 Getting Started

Your AI agent system is now ready! Here's how to start using it immediately:

### 1. List Available Agents
```bash
npm run agents:list
# or
npm run agents list
```

### 2. Start TDD Workflow
```bash
npm run tdd "new-feature-name"
# or
npm run agents tdd "user-authentication"
```

### 3. Validate Architecture (CRITICAL for your app)
```bash
npm run agents:validate
# or
npm run agents validate
```

### 4. Run Tests with Agent Orchestration
```bash
npm run agents:test
# or
npm run agents test
```

## 🎯 Priority 1 - Start Here

### Architecture Guardian (CRITICAL)
**Why critical**: Prevents "BaseComponent is not defined" errors that break your app
```bash
npm run agents agent architecture-guardian validate-script-order
npm run agents agent architecture-guardian check-component-inheritance
npm run agents agent architecture-guardian validate-all
```

### TDD Developer
```bash
npm run agents workflow tdd_feature_development
npm run agents agent tdd-developer --info
```

### Test Creator  
```bash
npm run agents agent test-creator --info
npm run agents workflow tdd_feature_development
```

## 🛠️ Available Workflows

### Complete TDD Feature Development
```bash
npm run agents workflow tdd_feature_development
```

### Bug Fixing Workflow
```bash
npm run agents workflow bug_fixing
```

### Configuration Changes (App-specific)
```bash
npm run agents workflow configuration_changes
```

### Architectural Refactoring
```bash
npm run agents workflow architectural_refactoring
```

## 📋 Individual Agent Commands

### Get Agent Information
```bash
npm run agents agent <agent-id> --info

# Examples:
npm run agents agent architecture-guardian --info
npm run agents agent tdd-developer --info
npm run agents agent configuration-orchestrator --info
```

### Run Specific Agent Tasks
```bash
npm run agents agent <agent-id> <task>

# Examples:
npm run agents agent architecture-guardian validate-script-order
npm run agents agent test-runner execute-suite
npm run agents agent bugfixer analyze-issue
```

## 🎯 App-Specific Agents

### Configuration Orchestrator
**Critical for your hierarchical config system**
```bash
npm run agents agent configuration-orchestrator --info
```

### Architecture Guardian  
**Prevents critical component loading issues**
```bash
npm run agents agent architecture-guardian validate-all
```

## 🔄 TDD Workflow Example

1. **Start TDD for new feature**:
   ```bash
   npm run tdd "project-templates"
   ```

2. **Architecture validation**:
   ```bash
   npm run agents validate
   ```

3. **Run coordinated tests**:
   ```bash
   npm run agents test
   ```

## ⚙️ Advanced Usage

### Get Help
```bash
npm run agents
# Shows complete usage guide
```

### Run Complete Validation
```bash
npm run agents validate
# Runs architecture validation, script order check, component inheritance
```

### Agent Status Check
```bash
npm run agents list
# Shows all agents with status indicators (✅ ready, ❌ needs setup)
```

## 🚨 Important Notes

1. **Architecture Guardian is CRITICAL** - Run it before any development to prevent component loading errors
2. **Configuration Orchestrator** - Essential for your hierarchical config system  
3. **Script Loading Order** - Always validate when modifying HTML files
4. **Component Inheritance** - Ensure all components extend BaseComponent properly

## 🔧 Integration with Development

### Before Starting Development
```bash
npm run agents validate
```

### During TDD Development
```bash
npm run tdd "feature-name"
```

### Before Committing
```bash
npm run agents test
npm run agents validate
```

### When Debugging Issues
```bash
npm run agents agent bugfixer analyze-issue
npm run agents agent architecture-guardian validate-all
```

## 📚 Next Steps

1. Start with Priority 1 agents (Architecture Guardian, TDD Developer, Test Creator)
2. Run complete architectural validation
3. Try a TDD workflow for a small feature
4. Integrate agents into your daily development workflow
5. Expand to specialized agents as needed

The agent system is designed to work with your existing codebase patterns and will help maintain the critical architectural requirements of your Electron application.