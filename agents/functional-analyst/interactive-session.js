/**
 * Interactive Session Manager for Functional Analyst
 * 
 * Manages interactive requirements gathering sessions with users,
 * collecting business requirements and generating test artifacts.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const JestTestGenerator = require('./tools/jest-test-generator');
const CucumberFeatureGenerator = require('./tools/cucumber-feature-generator');

class InteractiveSession {
    constructor(featureName, options = {}) {
        this.featureName = featureName;
        this.options = options;
        this.sessionData = {
            featureName,
            businessContext: {},
            userWorkflows: [],
            validationRules: [],
            integrationPoints: [],
            errorScenarios: [],
            edgeCases: []
        };
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.jestGenerator = new JestTestGenerator();
        this.cucumberGenerator = new CucumberFeatureGenerator();
    }

    /**
     * Start the interactive requirements gathering session
     */
    async start() {
        console.log(`\n🚀 Starting interactive requirements gathering for: ${this.featureName}\n`);
        
        try {
            await this.gatherBusinessContext();
            await this.analyzeUserWorkflows();
            await this.defineValidationRules();
            await this.identifyIntegrationPoints();
            await this.analyzeErrorScenarios();
            
            await this.presentSummary();
            
            const shouldProceed = await this.askYesNo('\n📋 Generate behavioral tests and Cucumber features? (y/n): ');
            if (shouldProceed) {
                await this.generateTestArtifacts();
                await this.finalApproval();
            }
            
        } catch (error) {
            console.error('\n❌ Session error:', error.message);
        } finally {
            this.rl.close();
        }
    }

    /**
     * Gather business context information
     */
    async gatherBusinessContext() {
        console.log('📝 Business Context Questions:\n');
        
        this.sessionData.businessContext.problemStatement = await this.ask(
            '❓ What business problem does this feature solve?\n> '
        );
        
        this.sessionData.businessContext.userTypes = await this.askArray(
            '👤 Who are the primary users of this feature? (comma-separated)\n> '
        );
        
        this.sessionData.businessContext.businessValue = await this.ask(
            '💰 What business value will this feature provide?\n> '
        );
        
        this.sessionData.businessContext.successCriteria = await this.ask(
            '🎯 How will success be measured?\n> '
        );
        
        console.log('\n✅ Business context captured!\n');
    }

    /**
     * Analyze user workflows
     */
    async analyzeUserWorkflows() {
        console.log('🔄 User Workflow Analysis:\n');
        
        const mainWorkflowName = await this.ask(
            '📋 What is the main user workflow name?\n> '
        );
        
        const workflowSteps = await this.askArray(
            '📝 What are the main steps in this workflow? (comma-separated)\n> '
        );
        
        const mainWorkflow = {
            name: mainWorkflowName,
            description: `Main workflow for ${this.featureName}`,
            steps: workflowSteps,
            mainScenario: {
                description: `Successfully complete ${mainWorkflowName}`,
                setup: `User is ready to ${mainWorkflowName.toLowerCase()}`,
                action: `User executes ${mainWorkflowName}`,
                expectedOutcome: `${mainWorkflowName} completes successfully`
            },
            alternativeScenarios: []
        };

        this.sessionData.userWorkflows.push(mainWorkflow);
        
        const hasAlternatives = await this.askYesNo(
            '\n🔀 Are there alternative workflows to consider? (y/n): '
        );
        
        if (hasAlternatives) {
            await this.gatherAlternativeWorkflows(mainWorkflow);
        }
        
        console.log('\n✅ Workflow analysis complete!\n');
    }

    /**
     * Gather alternative workflows
     */
    async gatherAlternativeWorkflows(mainWorkflow) {
        let addMore = true;
        
        while (addMore) {
            const altName = await this.ask('📝 Alternative workflow name: ');
            const altDescription = await this.ask('📝 What makes this workflow different? ');
            
            const altScenario = {
                name: altName,
                description: altDescription,
                setup: await this.ask('🔧 Setup for this scenario: '),
                action: await this.ask('⚡ Main action in this scenario: '),
                expectedOutcome: await this.ask('🎯 Expected outcome: ')
            };
            
            mainWorkflow.alternativeScenarios.push(altScenario);
            
            addMore = await this.askYesNo('\n➕ Add another alternative workflow? (y/n): ');
        }
    }

    /**
     * Define validation rules
     */
    async defineValidationRules() {
        console.log('✅ Validation Rules:\n');
        
        const hasValidation = await this.askYesNo(
            '🔍 Does this feature require data validation? (y/n): '
        );
        
        if (hasValidation) {
            let addMore = true;
            
            while (addMore) {
                const field = await this.ask('📝 Field that needs validation: ');
                const requirement = await this.ask('📋 Validation requirement: ');
                const errorMessage = await this.ask('⚠️  Error message for invalid input: ');
                
                this.sessionData.validationRules.push({
                    field,
                    requirement,
                    errorMessage,
                    description: `${field} must ${requirement}`
                });
                
                addMore = await this.askYesNo('\n➕ Add another validation rule? (y/n): ');
            }
        }
        
        console.log('\n✅ Validation rules defined!\n');
    }

    /**
     * Identify integration points
     */
    async identifyIntegrationPoints() {
        console.log('🔗 Integration Requirements:\n');
        
        const hasIntegration = await this.askYesNo(
            '🔌 Does this feature integrate with existing functionality? (y/n): '
        );
        
        if (hasIntegration) {
            let addMore = true;
            
            while (addMore) {
                const component = await this.ask('🧩 Component/system to integrate with: ');
                const description = await this.ask('📝 How does the integration work? ');
                
                this.sessionData.integrationPoints.push({
                    component,
                    description,
                    type: 'internal' // Could be enhanced to ask for type
                });
                
                addMore = await this.askYesNo('\n➕ Add another integration? (y/n): ');
            }
        }
        
        console.log('\n✅ Integration points identified!\n');
    }

    /**
     * Analyze error scenarios
     */
    async analyzeErrorScenarios() {
        console.log('⚠️  Error Scenario Analysis:\n');
        
        const hasErrors = await this.askYesNo(
            '🚨 Are there specific error scenarios to consider? (y/n): '
        );
        
        if (hasErrors) {
            let addMore = true;
            
            while (addMore) {
                const scenario = await this.ask('📝 Error scenario description: ');
                const cause = await this.ask('🔍 What causes this error? ');
                const handling = await this.ask('🛠️  How should this error be handled? ');
                
                this.sessionData.errorScenarios.push({
                    scenario,
                    cause,
                    handling,
                    description: `Handle ${scenario} gracefully`
                });
                
                addMore = await this.askYesNo('\n➕ Add another error scenario? (y/n): ');
            }
        }
        
        console.log('\n✅ Error scenarios analyzed!\n');
    }

    /**
     * Present requirements summary
     */
    async presentSummary() {
        console.log('\n📊 Requirements Summary:\n');
        console.log('='.repeat(50));
        
        console.log(`\n🎯 Feature: ${this.featureName}`);
        console.log(`💼 Problem: ${this.sessionData.businessContext.problemStatement}`);
        console.log(`👥 Users: ${this.sessionData.businessContext.userTypes.join(', ')}`);
        console.log(`💰 Value: ${this.sessionData.businessContext.businessValue}`);
        console.log(`📈 Success: ${this.sessionData.businessContext.successCriteria}`);
        
        if (this.sessionData.userWorkflows.length > 0) {
            console.log(`\n🔄 Main Workflow: ${this.sessionData.userWorkflows[0].name}`);
            console.log(`📝 Steps: ${this.sessionData.userWorkflows[0].steps.join(' → ')}`);
        }
        
        if (this.sessionData.validationRules.length > 0) {
            console.log(`\n✅ Validation Rules: ${this.sessionData.validationRules.length} defined`);
        }
        
        if (this.sessionData.integrationPoints.length > 0) {
            console.log(`\n🔗 Integration Points: ${this.sessionData.integrationPoints.length} identified`);
        }
        
        if (this.sessionData.errorScenarios.length > 0) {
            console.log(`\n⚠️  Error Scenarios: ${this.sessionData.errorScenarios.length} analyzed`);
        }
        
        console.log('\n' + '='.repeat(50));
    }

    /**
     * Generate test artifacts
     */
    async generateTestArtifacts() {
        console.log('\n🧪 Generating test artifacts...\n');
        
        // Generate Jest behavioral tests
        console.log('📝 Creating behavioral tests (Jest)...');
        const behavioralTests = this.jestGenerator.generateTestSuite(this.sessionData);
        
        const testsDir = path.join(process.cwd(), 'tests');
        if (!fs.existsSync(testsDir)) {
            fs.mkdirSync(testsDir, { recursive: true });
        }
        
        const testFileName = `${this.featureName.toLowerCase().replace(/\s+/g, '-')}-behavioral-tests.js`;
        const testFilePath = path.join(testsDir, testFileName);
        
        fs.writeFileSync(testFilePath, behavioralTests);
        console.log(`✅ Created: ${testFilePath}`);
        
        // Generate Cucumber feature
        console.log('\n🥒 Creating Cucumber feature file...');
        const cucumberFeature = this.cucumberGenerator.generateFeatureFile(this.sessionData);
        
        const featuresDir = path.join(process.cwd(), 'features');
        if (!fs.existsSync(featuresDir)) {
            fs.mkdirSync(featuresDir, { recursive: true });
        }
        
        const featureFileName = `${this.featureName.toLowerCase().replace(/\s+/g, '-')}.feature`;
        const featureFilePath = path.join(featuresDir, featureFileName);
        
        fs.writeFileSync(featureFilePath, cucumberFeature);
        console.log(`✅ Created: ${featureFilePath}`);
        
        console.log('\n🎉 Test artifacts generated successfully!');
    }

    /**
     * Final approval and handoff
     */
    async finalApproval() {
        console.log('\n📋 Final Review:\n');
        
        const showFiles = await this.askYesNo('👀 Would you like to preview the generated files? (y/n): ');
        
        if (showFiles) {
            await this.previewGeneratedFiles();
        }
        
        const approved = await this.askYesNo('\n✅ Approve these requirements and tests for technical analysis? (y/n): ');
        
        if (approved) {
            console.log('\n🚀 Requirements approved! Ready for technical analysis phase.');
            console.log('\n💡 Next step: Run technical analyst for architecture planning');
            console.log(`   npm run agents agent technical-analyst review-behavioral-tests "${this.featureName}"`);
        } else {
            console.log('\n🔄 Requirements need refinement. Session data saved for revision.');
        }
    }

    /**
     * Preview generated files
     */
    async previewGeneratedFiles() {
        console.log('\n📄 Generated Files Preview:\n');
        console.log('='.repeat(50));
        
        const testFileName = `${this.featureName.toLowerCase().replace(/\s+/g, '-')}-behavioral-tests.js`;
        const featureFileName = `${this.featureName.toLowerCase().replace(/\s+/g, '-')}.feature`;
        
        console.log(`📝 Jest Tests: tests/${testFileName}`);
        console.log(`🥒 Cucumber Feature: features/${featureFileName}`);
        
        const showContent = await this.askYesNo('\n📖 Show file contents? (y/n): ');
        
        if (showContent) {
            // Show first few lines of each file
            try {
                const testPath = path.join(process.cwd(), 'tests', testFileName);
                const featurePath = path.join(process.cwd(), 'features', featureFileName);
                
                if (fs.existsSync(testPath)) {
                    const testContent = fs.readFileSync(testPath, 'utf8');
                    console.log('\n📝 Behavioral Tests (first 20 lines):\n');
                    console.log(testContent.split('\n').slice(0, 20).join('\n'));
                    console.log('...\n');
                }
                
                if (fs.existsSync(featurePath)) {
                    const featureContent = fs.readFileSync(featurePath, 'utf8');
                    console.log('\n🥒 Cucumber Feature (first 15 lines):\n');
                    console.log(featureContent.split('\n').slice(0, 15).join('\n'));
                    console.log('...\n');
                }
            } catch (error) {
                console.log('❌ Error reading generated files:', error.message);
            }
        }
    }

    /**
     * Ask a question and wait for response
     */
    ask(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    /**
     * Ask a yes/no question
     */
    async askYesNo(question) {
        const answer = await this.ask(question);
        return answer.toLowerCase().startsWith('y');
    }

    /**
     * Ask for array input (comma-separated)
     */
    async askArray(question) {
        const answer = await this.ask(question);
        return answer.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }

    /**
     * Get session data for handoff to technical analyst
     */
    getSessionData() {
        return this.sessionData;
    }
}

module.exports = InteractiveSession;