# AI Agents - Quick Start Guide

## 🚀 Getting Started with Interactive Requirements & Enhanced Guided TDD

Your AI agent system is now ready with **interactive requirements gathering and enhanced guided test-driven development**! Here's how to start using it immediately:

### 1. List Available Agents (Including New Analysts!)
```bash
npm run agents:list
# or
npm run agents list
```

### 2. ✨ Start Interactive Requirements Gathering (HIGHLY RECOMMENDED)
```bash
# Interactive mode - Real-time requirements gathering with user input
npm run agents agent functional-analyst requirements-gathering "user-authentication"

# Demo mode - Automated demonstration with realistic responses
npm run agents agent functional-analyst requirements-gathering-demo "user-authentication"

# Complete guided workflow (includes interactive requirements)
npm run agents test-driven-feature "user-authentication"

# Traditional TDD approach (still available)
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

## 🎯 Priority 1 - Start Here (Enhanced!)

### ✨ Functional Analyst (ENHANCED - START HERE!)
**What it does**: Interactive business requirements gathering and automatic test generation
```bash
npm run agents agent functional-analyst --info

# Interactive requirements gathering (RECOMMENDED)
npm run agents agent functional-analyst requirements-gathering "feature-name"

# Demo mode for testing/demonstration
npm run agents agent functional-analyst requirements-gathering-demo "user-authentication"

# Complete guided workflow with interactive analysis
npm run agents test-driven-feature "new-feature"
```

**✨ New Features:**
- **Interactive Sessions**: Real-time business analysis through structured questions
- **Demo Mode**: Automated demonstrations with realistic responses  
- **Test Generation**: Automatic Jest behavioral tests and Cucumber features
- **User Validation**: Review and approve tests before implementation

### ✨ Technical Analyst (NEW - SECOND!)
**What it does**: Analyzes architecture and plans step definitions
```bash
npm run agents agent technical-analyst --info
npm run agents agent technical-analyst architecture-analysis
```

### Architecture Guardian (CRITICAL - ALWAYS RUN!)
**Why critical**: Prevents "BaseComponent is not defined" errors that break your app
```bash
npm run agents agent architecture-guardian validate-script-order
npm run agents agent architecture-guardian check-component-inheritance
npm run agents agent architecture-guardian validate-all
```

### TDD Developer (Enhanced with Analyst Guidance)
```bash
npm run agents workflow test_driven_feature_development  # New guided workflow
npm run agents agent tdd-developer --info
```

### Test Creator (Now Works with Analysts)
```bash
npm run agents agent test-creator --info
npm run agents workflow test_driven_feature_development  # Enhanced workflow
```

## 🛠️ Available Workflows

### ✨ Guided Test-Driven Feature Development (NEW - RECOMMENDED!)
```bash
npm run agents workflow test_driven_feature_development
# 6-phase workflow: Requirements → Technical Planning → Approval → Setup → TDD → Validation
```

### Complete TDD Feature Development (Legacy)
```bash
npm run agents workflow tdd_feature_development
# Traditional workflow - still available but consider the guided version above
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

# ✨ New analyst agents:
npm run agents agent functional-analyst --info
npm run agents agent technical-analyst --info

# Existing agents:
npm run agents agent architecture-guardian --info
npm run agents agent tdd-developer --info
npm run agents agent configuration-orchestrator --info
```

### Run Specific Agent Tasks
```bash
npm run agents agent <agent-id> <task>

# ✨ Enhanced analyst tasks:
npm run agents agent functional-analyst requirements-gathering "feature-name"         # Interactive mode
npm run agents agent functional-analyst requirements-gathering-demo "feature-name"   # Demo mode
npm run agents agent functional-analyst create-behavioral-tests
npm run agents agent technical-analyst architecture-analysis
npm run agents agent technical-analyst plan-step-definitions

# Existing agent tasks:
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

## 🔄 Enhanced TDD Workflow Example

### ✨ Recommended Interactive Approach (ENHANCED!)

1. **Start with interactive requirements gathering**:
   ```bash
   # Interactive mode - real-time business analysis
   npm run agents agent functional-analyst requirements-gathering "project-templates"
   
   # OR Demo mode - automated demonstration
   npm run agents agent functional-analyst requirements-gathering-demo "user-authentication"
   
   # OR Complete guided workflow
   npm run agents test-driven-feature "project-templates"
   ```
   
   **Interactive Mode Features:**
   - Real-time structured business questions
   - Business context analysis
   - User workflow mapping
   - Validation rules definition
   - Integration points identification
   - Error scenario analysis
   - **Automatic test generation** (Jest + Cucumber)
   - **User approval gate** before implementation

2. **Architecture validation** (automatically included in workflow):
   ```bash
   npm run agents validate
   ```

3. **Review Generated Tests**:
   - Review Jest behavioral tests
   - Review Cucumber feature files  
   - Validate business requirements captured in tests
   - **Approve before implementation starts**

4. **Implementation** (guided by pre-written, validated tests):
   - Tests are already created and user-approved
   - Code to make tests pass
   - Automatic architectural compliance checking

5. **Final validation**:
   ```bash
   npm run agents test
   ```

### Legacy TDD Approach (Still Available)

1. **Start traditional TDD**:
   ```bash
   npm run tdd "project-templates"
   ```

2. **Manual validation and testing**:
   ```bash
   npm run agents validate
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

## 🚨 Important Notes (Enhanced!)

1. **✨ Start with Interactive Requirements** - Use `requirements-gathering` for comprehensive business analysis
2. **✨ Demo Mode Available** - Use `requirements-gathering-demo` for testing and demonstrations
3. **✨ Test-First Development** - Requirements become executable tests before any coding
4. **✨ User Approval Gate** - Review and approve generated tests before implementation starts
5. **✨ Living Documentation** - Generated tests serve as always-current feature documentation
6. **Architecture Guardian is CRITICAL** - Run it before any development to prevent component loading errors
7. **Configuration Orchestrator** - Essential for your hierarchical config system  
8. **Script Loading Order** - Always validate when modifying HTML files
9. **Component Inheritance** - Ensure all components extend BaseComponent properly

## 🔧 Integration with Development

### ✨ Before Starting Development (ENHANCED APPROACH)
```bash
# Interactive requirements gathering (RECOMMENDED)
npm run agents agent functional-analyst requirements-gathering "feature-name"

# OR Demo mode for testing/demonstration
npm run agents agent functional-analyst requirements-gathering-demo "feature-name"

# OR Complete guided workflow
npm run agents test-driven-feature "feature-name"

# OR Traditional validation only
npm run agents validate
```

### ✨ During Interactive Development (ENHANCED)
```bash
# The interactive workflow guides you through:
# 1. Business context questions (interactive/demo)
# 2. User workflow analysis (structured questions)
# 3. Validation rules definition (comprehensive)
# 4. Integration points identification (systematic)
# 5. Error scenario analysis (thorough)
# 6. Test generation (automatic Jest + Cucumber)
# 7. Your approval (manual checkpoint with test review)
# 8. Implementation (guided by validated tests)
```

### During Traditional TDD Development
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

## 📚 Next Steps (Updated!)

### Recommended Learning Path
1. **Try Demo Mode First**: `npm run agents agent functional-analyst requirements-gathering-demo "user-authentication"`
2. **Experience Interactive Requirements**: `npm run agents agent functional-analyst requirements-gathering "small-feature"`
3. **Review Generated Tests**: See how business conversations become executable tests
4. **Validate at Approval Gate**: Review and approve tests before implementation
5. **Follow TDD Implementation**: Code guided by pre-written, validated tests
6. **Integrate into Daily Workflow**: Use interactive approach for all new features

### Traditional Path (Still Available)
1. Start with Priority 1 agents (Architecture Guardian, TDD Developer, Test Creator)
2. Run complete architectural validation
3. Try a TDD workflow for a small feature
4. Integrate agents into your daily development workflow
5. Expand to specialized agents as needed

## ✨ Key Benefits You'll Experience

- **Interactive Business Analysis**: Structured questions ensure comprehensive requirements understanding
- **Demo Mode**: Test and demonstrate capabilities without user input
- **Clear Requirements**: Business needs expressed as executable tests through conversation
- **No Ambiguity**: Interactive questions eliminate interpretation errors
- **User Validation Gate**: You approve generated tests before any coding starts
- **Faster Development**: Implementation guided by pre-written, validated tests
- **Better Quality**: Tests created from systematic business analysis, not afterthoughts
- **Living Documentation**: Generated tests serve as always-current feature documentation
- **Realistic Scenarios**: Tests include actual business workflows and edge cases

The enhanced agent system transforms requirements analysis into a systematic process that produces executable tests, creating a seamless bridge from business needs to quality implementation!

## 🎯 Quick Reference - New NPM Commands

### ✨ Enhanced Commands (Added to package.json)
```bash
# Guided feature development (RECOMMENDED)
npm run test-driven-feature "feature-name"
npm run guided-tdd "feature-name"                    # Alias for above

# Complete workflows
npm run workflow:guided                              # New guided workflow
npm run workflow:tdd                                 # Legacy TDD workflow

# Existing commands still available
npm run agents list                                  # List all agents
npm run agents validate                              # Architecture validation
npm run tdd "feature-name"                          # Legacy TDD approach
```

### Usage Examples
```bash
# Try demo mode first (no user input required)
npm run agents agent functional-analyst requirements-gathering-demo "user-authentication"

# Start interactive requirements gathering
npm run agents agent functional-analyst requirements-gathering "user-profile-editing"

# Start your first guided feature (includes interactive requirements)
npm run test-driven-feature "user-profile-editing"

# Run the complete guided workflow
npm run workflow:guided

# Check available agents (now includes enhanced analysts)
npm run agents:list

# Get help with any command
npm run agents
```

Ready to transform your development process? Start with demo mode: `npm run agents agent functional-analyst requirements-gathering-demo "user-authentication"`! 🚀

Or dive into interactive requirements: `npm run agents agent functional-analyst requirements-gathering "your-feature-name"`! 🎯