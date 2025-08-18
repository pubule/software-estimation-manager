/**
 * Cucumber Feature Generator
 * 
 * Generates Gherkin feature files from business requirements
 * and user workflows identified during functional analysis.
 */

class CucumberFeatureGenerator {
    constructor() {
        this.featureTemplate = this.loadFeatureTemplate();
    }

    /**
     * Generate complete Cucumber feature file
     * @param {Object} requirements - Business requirements and workflows
     * @returns {String} Complete Gherkin feature file content
     */
    generateFeatureFile(requirements) {
        const {
            featureName,
            businessContext,
            userWorkflows,
            validationRules,
            integrationPoints,
            errorScenarios,
            edgeCases
        } = requirements;

        return this.buildFeatureFile({
            featureName,
            businessContext,
            workflows: userWorkflows,
            validation: validationRules,
            integration: integrationPoints,
            errors: errorScenarios,
            edges: edgeCases
        });
    }

    /**
     * Build complete feature file structure
     */
    buildFeatureFile(params) {
        const {featureName, businessContext, workflows, validation, integration, errors, edges} = params;
        
        return `Feature: ${featureName}
  ${this.generateFeatureDescription(businessContext)}

  ${this.generateBackground(params)}

${this.generateMainScenarios(workflows)}

${this.generateValidationScenarios(validation)}

${this.generateIntegrationScenarios(integration)}

${this.generateErrorScenarios(errors)}

${this.generateEdgeCaseScenarios(edges)}`;
    }

    /**
     * Generate feature description with business value
     */
    generateFeatureDescription(businessContext) {
        const userRole = businessContext.userTypes[0] || 'user';
        const capability = businessContext.capability || 'perform operations';
        const businessValue = businessContext.businessValue || 'achieve business goals';

        return `As a ${userRole}
  I want to ${capability}
  So that ${businessValue}`;
    }

    /**
     * Generate background section with common setup
     */
    generateBackground(params) {
        return `Background:
    Given the Software Estimation Manager application is running
    And the ${params.featureName.toLowerCase()} system is initialized
    And I have appropriate permissions to use this feature
    And the application data is in a clean state`;
    }

    /**
     * Generate main workflow scenarios
     */
    generateMainScenarios(workflows) {
        if (!workflows || workflows.length === 0) return '';

        return workflows.map(workflow => `
  Scenario: ${workflow.name}
    ${this.generateScenarioDescription(workflow)}
    ${this.generateScenarioSteps(workflow.mainScenario)}

  ${workflow.alternativeScenarios.map(scenario => `
  Scenario: ${scenario.name}
    ${this.generateScenarioSteps(scenario)}`).join('')}`).join('');
    }

    /**
     * Generate validation scenarios
     */
    generateValidationScenarios(validation) {
        if (!validation || validation.length === 0) return '';

        const validationScenarios = validation.map(rule => `
  Scenario: Validate ${rule.field} ${rule.requirement}
    Given I am entering data for ${rule.field}
    When I provide ${rule.requirement} data
    Then the data should be accepted
    And the validation should pass

  Scenario: Reject invalid ${rule.field}
    Given I am entering data for ${rule.field}
    When I provide invalid ${rule.field} data
    Then I should see a validation error
    And the error message should be clear and helpful
    And the invalid data should not be saved`).join('');

        return `
  # Data Validation Scenarios
${validationScenarios}`;
    }

    /**
     * Generate integration scenarios
     */
    generateIntegrationScenarios(integration) {
        if (!integration || integration.length === 0) return '';

        const integrationScenarios = integration.map(point => `
  Scenario: Integration with ${point.component}
    Given the ${point.component} is available and configured
    When I perform an action that requires ${point.component} integration
    Then the integration should work correctly
    And data should be exchanged properly
    And the user experience should be seamless

  Scenario: Handle ${point.component} integration failure
    Given the ${point.component} is unavailable or misconfigured
    When I attempt an action requiring ${point.component}
    Then the system should handle the failure gracefully
    And I should receive a clear error message
    And the system should remain stable`).join('');

        return `
  # Integration Scenarios
${integrationScenarios}`;
    }

    /**
     * Generate error handling scenarios
     */
    generateErrorScenarios(errors) {
        if (!errors || errors.length === 0) return '';

        const errorScenarios = errors.map(error => `
  Scenario: Handle ${error.scenario}
    Given conditions that lead to ${error.scenario}
    When the error condition is triggered
    Then the system should handle the error gracefully
    And I should receive appropriate feedback
    And the system should remain in a consistent state
    And I should be able to recover from the error`).join('');

        return `
  # Error Handling Scenarios
${errorScenarios}`;
    }

    /**
     * Generate edge case scenarios
     */
    generateEdgeCaseScenarios(edges) {
        if (!edges || edges.length === 0) return '';

        const edgeScenarios = edges.map(edge => `
  Scenario: Handle ${edge.scenario}
    Given ${edge.conditions}
    When ${edge.trigger}
    Then ${edge.expectedBehavior}
    And the system should handle this edge case appropriately`).join('');

        return `
  # Edge Case Scenarios
${edgeScenarios}`;
    }

    /**
     * Generate scenario description comment
     */
    generateScenarioDescription(workflow) {
        return `# Business Value: ${workflow.businessValue}
    # Success Criteria: ${workflow.successCriteria}`;
    }

    /**
     * Generate scenario steps from workflow scenario
     */
    generateScenarioSteps(scenario) {
        const given = this.generateGivenSteps(scenario);
        const when = this.generateWhenSteps(scenario);
        const then = this.generateThenSteps(scenario);

        return `${given}
    ${when}
    ${then}`;
    }

    /**
     * Generate Given steps for scenario setup
     */
    generateGivenSteps(scenario) {
        if (scenario.preconditions && scenario.preconditions.length > 0) {
            const conditions = scenario.preconditions.map(condition => 
                `    And ${this.normalizeStepText(condition)}`
            ).join('\n');
            
            return `Given ${this.normalizeStepText(scenario.setup)}\n${conditions}`;
        }
        
        return `Given ${this.normalizeStepText(scenario.setup)}`;
    }

    /**
     * Generate When steps for scenario actions
     */
    generateWhenSteps(scenario) {
        if (scenario.actions && scenario.actions.length > 1) {
            const additionalActions = scenario.actions.slice(1).map(action =>
                `    And ${this.normalizeStepText(action)}`
            ).join('\n');
            
            return `When ${this.normalizeStepText(scenario.actions[0])}\n${additionalActions}`;
        }
        
        return `When ${this.normalizeStepText(scenario.action || scenario.actions[0])}`;
    }

    /**
     * Generate Then steps for scenario verification
     */
    generateThenSteps(scenario) {
        const mainOutcome = scenario.expectedOutcome || scenario.expectedOutcomes[0];
        
        if (scenario.expectedOutcomes && scenario.expectedOutcomes.length > 1) {
            const additionalOutcomes = scenario.expectedOutcomes.slice(1).map(outcome =>
                `    And ${this.normalizeStepText(outcome)}`
            ).join('\n');
            
            return `Then ${this.normalizeStepText(mainOutcome)}\n${additionalOutcomes}`;
        }
        
        if (scenario.sideEffects && scenario.sideEffects.length > 0) {
            const sideEffects = scenario.sideEffects.map(effect =>
                `    And ${this.normalizeStepText(effect)}`
            ).join('\n');
            
            return `Then ${this.normalizeStepText(mainOutcome)}\n${sideEffects}`;
        }
        
        return `Then ${this.normalizeStepText(mainOutcome)}`;
    }

    /**
     * Normalize step text for Gherkin format
     */
    normalizeStepText(text) {
        if (!text) return 'the expected behavior should occur';
        
        // Remove leading/trailing whitespace
        text = text.trim();
        
        // Ensure first letter is lowercase (except for proper nouns)
        if (text.length > 0 && !this.isProperNoun(text)) {
            text = text.charAt(0).toLowerCase() + text.slice(1);
        }
        
        // Remove trailing periods
        if (text.endsWith('.')) {
            text = text.slice(0, -1);
        }
        
        return text;
    }

    /**
     * Check if text starts with a proper noun
     */
    isProperNoun(text) {
        const properNouns = ['Software Estimation Manager', 'Excel', 'JSON', 'CSV', 'XML'];
        return properNouns.some(noun => text.startsWith(noun));
    }

    /**
     * Generate scenario outline for data-driven tests
     */
    generateScenarioOutline(workflow) {
        if (!workflow.dataExamples || workflow.dataExamples.length === 0) {
            return '';
        }

        const parameterizedSteps = this.parameterizeSteps(workflow.mainScenario);
        const examples = this.formatExamples(workflow.dataExamples);

        return `
  Scenario Outline: ${workflow.name} with different data
    ${parameterizedSteps}

    Examples:
${examples}`;
    }

    /**
     * Parameterize scenario steps for scenario outline
     */
    parameterizeSteps(scenario) {
        // This would need to be implemented based on specific parameterization needs
        return this.generateScenarioSteps(scenario);
    }

    /**
     * Format examples table for scenario outline
     */
    formatExamples(dataExamples) {
        if (!dataExamples || dataExamples.length === 0) return '';

        const headers = Object.keys(dataExamples[0]);
        const headerRow = `      | ${headers.join(' | ')} |`;
        
        const dataRows = dataExamples.map(example => {
            const values = headers.map(header => example[header] || '');
            return `      | ${values.join(' | ')} |`;
        }).join('\n');

        return `${headerRow}\n${dataRows}`;
    }

    loadFeatureTemplate() {
        // Could load from external template file
        return null;
    }
}

module.exports = CucumberFeatureGenerator;