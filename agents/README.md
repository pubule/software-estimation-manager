# Software Estimation Manager - AI Agents

This directory contains specialized AI agents designed to support the complete development lifecycle of the Software Estimation Manager application using Test-Driven Development (TDD) principles.

## Agent Architecture

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

## Agent Orchestration

The `orchestrator/` directory contains the workflow management system that coordinates agent interactions and ensures proper TDD cycle execution.

## Usage

Each agent directory contains:
- `agent-config.json` - Agent configuration and capabilities
- `prompts/` - Specialized prompts for the agent's domain
- `tools/` - Agent-specific tools and utilities
- `workflows/` - Predefined workflows for common scenarios

## Integration

Agents integrate with the existing development workflow:
- Uses existing test infrastructure (Jest, Cucumber, Playwright)
- Follows established code conventions and patterns
- Respects the critical script loading order
- Works with the hierarchical configuration system

## Getting Started

1. Start with Priority 1 agents: TDD Developer, Test Creator, Architecture Guardian
2. Configure agent behavior in respective `agent-config.json` files
3. Use the orchestrator to run complete TDD cycles
4. Gradually introduce specialized agents as needed

## Important Notes

- **Critical for this codebase**: Architecture Guardian Agent prevents "BaseComponent is not defined" errors
- **App-specific**: Configuration Orchestrator handles the complex hierarchical config system
- **Platform-aware**: Electron Integration Agent handles cross-platform concerns