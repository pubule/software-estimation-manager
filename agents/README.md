# AI Agents

This directory contains specialized AI agents designed to support the complete development lifecycle of the Software Estimation Manager application using Test-Driven Development (TDD) principles with guided requirements analysis.

## Agent Architecture

### 🎯 Analyst Agents (New!)
- **`functional-analyst/`** - ✨ **Interactive business requirements analysis and behavioral test creation**
- **`technical-analyst/`** - ✨ **Technical architecture analysis and step definitions planning**

### Core TDD Agents
- **`tdd-developer/`** - Implements features following strict TDD methodology
- **`test-creator/`** - Creates comprehensive test suites (unit, behavioral, e2e)
- **`test-runner/`** - Executes tests with intelligent scheduling and reporting
- **`bugfixer/`** - Systematic debugging and issue resolution
- **`code-reviewer/`** - Quality assurance and architectural compliance

### Specialized Agents
- **`architecture-guardian/`** - Protects architectural integrity and patterns
- **`configuration-orchestrator/`** - Manages hierarchical configuration system
- **`data-migration/`** - Handles data structure evolution safely
- **`electron-integration/`** - Electron-specific testing and optimization
- **`performance-monitor/`** - Continuous performance monitoring and optimization
- **`export-integration-tester/`** - Tests all export formats and integrations

## 🚀 Guided Test-Driven Development Workflow

### New Enhanced Workflow: `test_driven_feature_development`

The new **guided TDD workflow** combines business analysis with test creation for a comprehensive development process:

```bash
# Start guided feature development
node agent-runner.js test-driven-feature "user-authentication"

# Or run the complete workflow
node agent-runner.js workflow test_driven_feature_development
```

#### Workflow Phases:

1. **📝 Requirements & Testing** (`functional-analyst`)
   - Interactive business requirements gathering
   - Create comprehensive behavioral test suite (Jest)
   - Generate Cucumber feature files with Gherkin scenarios
   - User validation of test scenarios

2. **🏗️ Technical Planning** (`technical-analyst`)
   - Review behavioral tests for implementation requirements
   - Analyze architecture impact and integration points
   - Plan Cucumber step definitions implementation
   - Design comprehensive mock strategy

3. **✅ Approval Gate**
   - Present complete analysis to user
   - Review all tests and technical plans
   - **User approval required before implementation**

4. **🧪 Test Execution Setup**
   - Execute behavioral tests (must fail initially)
   - Implement Cucumber step definitions
   - Setup test data and mocks

5. **🔧 TDD Implementation** (existing agents)
   - Implement minimal code to make behavioral tests pass
   - Follow technical implementation plan
   - Maintain architectural compliance

6. **🔄 Refactoring & Validation**
   - Improve code quality while keeping tests green
   - Complete system integration testing

## Agent Orchestration

The `orchestrator/` directory contains the workflow management system that coordinates agent interactions and ensures proper TDD cycle execution. Now includes:

- **`interaction-protocols.json`** - ✨ **New: User interaction patterns and approval gates**
- **Enhanced workflow configurations** with analyst agent integration

## Usage

### Quick Start with Guided Development

```bash
# List all available agents (includes new analysts)
node agent-runner.js list

# Start guided feature development
node agent-runner.js test-driven-feature "feature-name"

# Run specific analyst tasks
node agent-runner.js agent functional-analyst requirements-gathering
node agent-runner.js agent technical-analyst architecture-analysis
```

### Individual Agent Usage

Each agent directory contains:
- `agent-config.json` - Agent configuration and capabilities
- `prompts/` - Specialized prompts for the agent's domain
- `tools/` - Agent-specific tools and utilities (✨ **New: Test generators**)
- `workflows/` - Predefined workflows for common scenarios

## Integration

Agents integrate with the existing development workflow:
- Uses existing test infrastructure (Jest, Cucumber, Playwright)
- ✨ **New: Creates behavioral tests and Cucumber features automatically**
- Follows established code conventions and patterns
- Respects the critical script loading order
- Works with the hierarchical configuration system
- ✨ **New: Interactive user approval gates**

## Getting Started

### Recommended Approach (Updated)

1. **Start with Guided Development**: Use `test-driven-feature` command for new features
2. **Analyst-First Workflow**: Let functional and technical analysts guide your development
3. **User Validation**: Review and approve test scenarios before implementation
4. **TDD Implementation**: Follow the pre-written, validated tests

### Legacy Approach

1. Start with Priority 1 agents: TDD Developer, Test Creator, Architecture Guardian
2. Configure agent behavior in respective `agent-config.json` files
3. Use the orchestrator to run complete TDD cycles
4. Gradually introduce specialized agents as needed

## ✨ Key Benefits of the Enhanced System

- **Test-First Requirements**: Requirements defined through executable tests
- **User Validation**: Approve behavior through tests before implementation
- **Clear Success Criteria**: Tests define exactly when feature is "done"
- **Living Documentation**: Cucumber + Jest create self-documenting code
- **Reduced Ambiguity**: Tests eliminate requirements ambiguity
- **Quality from Start**: Quality integrated from analysis phase

## Important Notes

- **✨ New for this codebase**: Functional Analyst creates behavioral tests that serve as requirements
- **✨ Enhanced**: Technical Analyst ensures architectural compliance from design phase
- **Critical for this codebase**: Architecture Guardian Agent prevents "BaseComponent is not defined" errors
- **App-specific**: Configuration Orchestrator handles the complex hierarchical config system
- **Platform-aware**: Electron Integration Agent handles cross-platform concerns

## Available Commands

```bash
# New guided workflow commands
node agent-runner.js test-driven-feature <feature-name>    # Start guided development
node agent-runner.js workflow test_driven_feature_development

# Individual analyst commands
node agent-runner.js agent functional-analyst requirements-gathering
node agent-runner.js agent functional-analyst create-behavioral-tests
node agent-runner.js agent technical-analyst architecture-analysis
node agent-runner.js agent technical-analyst plan-step-definitions

# Legacy commands (still available)
node agent-runner.js tdd <feature-name>                    # Legacy TDD workflow
node agent-runner.js workflow tdd_feature_development      # Legacy workflow
```