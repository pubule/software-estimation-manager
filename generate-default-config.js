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
            // ... (rest of phase definitions are the same)
        ],
        "vendors": [
            {
                "id": "example-g1-it",
                "name": "Example Supplier G1",
                "type": "External",
                "role": "G1",
                "department": "IT",
                "jobClusters": []
            },
            {
                "id": "example-g2-it",
                "name": "Example Supplier G2",
                "type": "External",
                "role": "G2",
                "department": "IT",
                "jobClusters": []
            },
            {
                "id": "example-pm-it",
                "name": "Example Supplier PM",
                "type": "External",
                "role": "PM",
                "department": "IT",
                "jobClusters": []
            },
            {
                "id": "internal-analyst-it",
                "name": "Internal Analyst",
                "type": "Internal",
                "role": "G1",
                "department": "IT",
                "jobClusters": []
            },
            {
                "id": "internal-developer-it",
                "name": "Internal Developer",
                "type": "Internal",
                "role": "G2",
                "department": "IT",
                "jobClusters": []
            },
            {
                "id": "internal-tech-analyst-it",
                "name": "Internal Tech Analyst",
                "type": "Internal",
                "role": "TA",
                "department": "IT",
                "jobClusters": []
            }
        ],
        "defaultTeams": [
            // ... (rest of default teams are the same)
        ],
        "categories": [
            // ... (rest of default categories are the same)
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
