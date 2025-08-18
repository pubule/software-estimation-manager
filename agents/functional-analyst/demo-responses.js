/**
 * Demo Response Simulation for Functional Analyst
 * 
 * Provides realistic responses for demonstrating the interactive session
 * without requiring actual user input.
 */

const demoResponses = {
    'user-authentication': {
        businessContext: {
            problemStatement: "Users need a secure way to access their project data and maintain session state across application restarts",
            userTypes: ["Project Managers", "Development Team Leaders", "Estimation Analysts"],
            businessValue: "Enables secure data isolation, personalized configurations, and audit trails for estimation projects",
            successCriteria: "Users can login securely, access only their authorized projects, and maintain preferences"
        },
        mainWorkflow: {
            name: "Secure User Login",
            steps: ["Enter credentials", "Validate identity", "Load user profile", "Access dashboard"]
        },
        alternativeWorkflows: [
            {
                name: "Password Recovery",
                description: "Reset forgotten password",
                setup: "User forgot password and clicks reset link",
                action: "User enters email and follows reset instructions",
                expectedOutcome: "User receives secure reset link and can set new password"
            }
        ],
        validationRules: [
            {
                field: "email",
                requirement: "be a valid email format",
                errorMessage: "Please enter a valid email address"
            },
            {
                field: "password",
                requirement: "be at least 8 characters with mixed case and numbers",
                errorMessage: "Password must be at least 8 characters with uppercase, lowercase, and numbers"
            }
        ],
        integrationPoints: [
            {
                component: "DataManager",
                description: "Load user-specific project data and preferences"
            },
            {
                component: "ConfigurationManager",
                description: "Apply user-specific configuration overrides"
            }
        ],
        errorScenarios: [
            {
                scenario: "Invalid credentials",
                cause: "User enters wrong email or password",
                handling: "Show clear error message and allow retry with account lockout after 5 attempts"
            },
            {
                scenario: "Network connectivity issues",
                cause: "Authentication server is unreachable",
                handling: "Show offline mode option with cached credentials for recent users"
            }
        ]
    }
};

module.exports = demoResponses;