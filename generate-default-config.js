#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Fallback configuration (copied from default-config-manager.js)
function getFallbackConfiguration() {
    return {
        "phaseDefinitions": [
            {
                "id": "functionalAnalysis",
                "name": "Functional Analysis",
                "description": "Business requirements analysis and functional specification",
                "type": "analysis",
                "defaultEffort": { "G1": 100, "G2": 0, "TA": 20, "PM": 50 },
                "editable": true
            },
            {
                "id": "technicalAnalysis",
                "name": "Technical Analysis",
                "description": "Technical design and architecture specification",
                "type": "analysis",
                "defaultEffort": { "G1": 0, "G2": 100, "TA": 60, "PM": 20 },
                "editable": true
            },
            {
                "id": "development",
                "name": "Development",
                "description": "Implementation of features (calculated from features list)",
                "type": "development",
                "defaultEffort": { "G1": 0, "G2": 100, "TA": 40, "PM": 20 },
                "editable": true,
                "calculated": true
            },
            {
                "id": "integrationTests",
                "name": "Integration Tests",
                "description": "System integration and integration testing",
                "type": "testing",
                "defaultEffort": { "G1": 100, "G2": 50, "TA": 50, "PM": 75 },
                "editable": true
            },
            {
                "id": "uatTests",
                "name": "UAT Tests",
                "description": "User acceptance testing support and execution",
                "type": "testing",
                "defaultEffort": { "G1": 50, "G2": 50, "TA": 40, "PM": 75 },
                "editable": true
            },
            {
                "id": "consolidation",
                "name": "Consolidation",
                "description": "Final testing, bug fixing, and deployment preparation",
                "type": "testing",
                "defaultEffort": { "G1": 30, "G2": 30, "TA": 30, "PM": 20 },
                "editable": true
            },
            {
                "id": "vapt",
                "name": "VAPT",
                "description": "Vulnerability Assessment and Penetration Testing",
                "type": "testing",
                "defaultEffort": { "G1": 30, "G2": 30, "TA": 30, "PM": 20 },
                "editable": true
            },
            {
                "id": "postGoLive",
                "name": "Post Go-Live Support",
                "description": "Production support and monitoring after deployment",
                "type": "support",
                "defaultEffort": { "G1": 0, "G2": 100, "TA": 50, "PM": 100 },
                "editable": true
            }
        ],
        "defaultSuppliers": [
            {
                "id": "example-g1-it",
                "name": "Example Supplier G1",
                "lta": "LTA001",
                "role": "G1",
                "department": "IT",
                "realRate": 450,
                "officialRate": 450,
                "isGlobal": true
            },
            {
                "id": "example-g2-it",
                "name": "Example Supplier G2",
                "lta": "LTA002",
                "role": "G2",
                "department": "IT",
                "realRate": 350,
                "officialRate": 350,
                "isGlobal": true
            },
            {
                "id": "example-pm-it",
                "name": "Example Supplier PM",
                "lta": "LTA003",
                "role": "PM",
                "department": "IT",
                "realRate": 500,
                "officialRate": 500,
                "isGlobal": true
            }
        ],
        "defaultInternalResources": [
            {
                "id": "internal-analyst-it",
                "name": "Internal Analyst",
                "lta": "INT001",
                "role": "G1",
                "department": "IT",
                "realRate": 600,
                "officialRate": 600,
                "isGlobal": true
            },
            {
                "id": "internal-developer-it",
                "name": "Internal Developer",
                "lta": "INT002",
                "role": "G2",
                "department": "IT",
                "realRate": 550,
                "officialRate": 550,
                "isGlobal": true
            },
            {
                "id": "internal-tech-analyst-it",
                "name": "Internal Tech Analyst",
                "lta": "INT003",
                "role": "TA",
                "department": "IT",
                "realRate": 580,
                "officialRate": 580,
                "isGlobal": true
            }
        ],
        "defaultTeams": [
            {
                "id": "team-frontend",
                "name": "Frontend Team",
                "description": "Frontend development team specializing in UI/UX implementation",
                "status": "active",
                "isGlobal": true,
                "created": "2024-01-01T00:00:00.000Z",
                "members": [
                    {
                        "id": "member-frontend-1",
                        "user-id": "550e8400-e29b-41d4-a716-446655440020",
                        "firstName": "Mario",
                        "lastName": "Rossi",
                        "email": "mario.rossi@company.com",
                        "role": "Senior Frontend Developer",
                        "vendorId": "internal-analyst-it",
                        "vendorType": "internal",
                        "monthlyCapacity": 22,
                        "status": "active",
                        "joinDate": "2024-01-01T00:00:00.000Z"
                    },
                    {
                        "id": "member-frontend-2",
                        "user-id": "550e8400-e29b-41d4-a716-446655440021",
                        "firstName": "Lucia",
                        "lastName": "Verdi",
                        "email": "lucia.verdi@company.com",
                        "role": "Frontend Developer",
                        "vendorId": "example-g1-it",
                        "vendorType": "supplier",
                        "monthlyCapacity": 22,
                        "status": "active",
                        "joinDate": "2024-01-01T00:00:00.000Z"
                    }
                ]
            },
            {
                "id": "team-backend",
                "name": "Backend Team",
                "description": "Backend development team handling server-side logic and APIs",
                "status": "active",
                "isGlobal": true,
                "created": "2024-01-01T00:00:00.000Z",
                "members": [
                    {
                        "id": "member-backend-1",
                        "user-id": "550e8400-e29b-41d4-a716-446655440022",
                        "firstName": "Anna",
                        "lastName": "Bianchi",
                        "email": "anna.bianchi@company.com",
                        "role": "Senior Backend Developer",
                        "vendorId": "internal-developer-it",
                        "vendorType": "internal",
                        "monthlyCapacity": 22,
                        "status": "active",
                        "joinDate": "2024-01-01T00:00:00.000Z"
                    }
                ]
            },
            {
                "id": "team-qa",
                "name": "QA Team",
                "description": "Quality Assurance team for testing and validation",
                "status": "active",
                "isGlobal": true,
                "created": "2024-01-01T00:00:00.000Z",
                "members": [
                    {
                        "id": "member-qa-1",
                        "user-id": "550e8400-e29b-41d4-a716-446655440023",
                        "firstName": "Giuseppe",
                        "lastName": "Neri",
                        "email": "giuseppe.neri@company.com",
                        "role": "QA Engineer",
                        "vendorId": "internal-tech-analyst-it",
                        "vendorType": "internal",
                        "monthlyCapacity": 22,
                        "status": "active",
                        "joinDate": "2024-01-01T00:00:00.000Z"
                    }
                ]
            }
        ],
        "defaultCategories": [
            {
                "id": "development-activities",
                "name": "DEVELOPMENT ACTIVITIES",
                "description": "Software development and coding tasks",
                "status": "active",
                "isGlobal": true,
                "featureTypes": [
                    {
                        "id": "new-feature-dev",
                        "name": "New Feature Development",
                        "description": "Development of new application features",
                        "averageMDs": 5
                    },
                    {
                        "id": "bug-fix",
                        "name": "Bug Fix",
                        "description": "Fixing existing software bugs",
                        "averageMDs": 2
                    },
                    {
                        "id": "code-refactoring",
                        "name": "Code Refactoring",
                        "description": "Improving existing code structure",
                        "averageMDs": 3
                    }
                ]
            },
            {
                "id": "testing-activities",
                "name": "TESTING ACTIVITIES",
                "description": "Quality assurance and testing tasks",
                "status": "active",
                "isGlobal": true,
                "featureTypes": [
                    {
                        "id": "unit-testing",
                        "name": "Unit Testing",
                        "description": "Creating and executing unit tests",
                        "averageMDs": 2
                    },
                    {
                        "id": "integration-testing",
                        "name": "Integration Testing",
                        "description": "Testing system integration points",
                        "averageMDs": 4
                    }
                ]
            }
        ]
    };
}

async function generateDefaultConfig() {
    try {
        const projectsPath = process.env.PROJECTS_PATH ||
            path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'Software Estimation Projects');

        const configDir = path.join(projectsPath, 'config');
        const configFile = path.join(configDir, 'defaults.json');

        // Create config directory if it doesn't exist
        await fs.mkdir(configDir, { recursive: true });

        // Get fallback configuration
        const config = getFallbackConfiguration();

        // Write the configuration file
        await fs.writeFile(configFile, JSON.stringify(config, null, 2));

        console.log('✅ Generated default configuration file:');
        console.log('   Path:', configFile);
        console.log('   Teams:', config.defaultTeams.length);
        console.log('   Members:', config.defaultTeams.reduce((sum, team) => sum + team.members.length, 0));

        return { success: true, filePath: configFile };
    } catch (error) {
        console.error('❌ Failed to generate default config file:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    generateDefaultConfig();
}

module.exports = { getFallbackConfiguration, generateDefaultConfig };
