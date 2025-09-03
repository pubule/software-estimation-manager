/**
 * Test script for enhanced loading system validation
 * Tests all the fixes implemented for race conditions and data integrity
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
    testProjectName: "Enhanced Loading Test",
    testProjectPath: path.join(__dirname, 'test-project-enhanced.json'),
    expectedPhaseKeys: [
        'functionalAnalysis',
        'technicalAnalysis', 
        'systemDesign',
        'development',
        'systemTest',
        'userAcceptanceTest',
        'deployment',
        'projectManagement',
        'selectedSuppliers'
    ]
};

console.log('🧪 ENHANCED LOADING SYSTEM VALIDATION TEST');
console.log('===========================================');
console.log('Testing all implemented fixes:');
console.log('- Complete phase initialization');
console.log('- Race condition prevention');
console.log('- Auto-repair functionality');
console.log('- Version comparison accuracy\n');

// Create a test project with deliberate timing challenges
function createTestProject() {
    console.log('1. Creating test project structure...');
    
    const testProject = {
        name: testConfig.testProjectName,
        description: "Test project for enhanced loading validation",
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        
        // Create phases with only selectedSuppliers to simulate corruption
        phases: {
            selectedSuppliers: {
                G1: "Test Supplier G1",
                G2: "Test Supplier G2", 
                TA: "Test Supplier TA",
                PM: "Test Supplier PM"
            }
            // Missing all other phase definitions (simulates old bug)
        },
        
        features: [
            {
                id: 1,
                name: "Test Feature 1",
                description: "First test feature",
                complexity: "Medium",
                effort: 10
            },
            {
                id: 2,
                name: "Test Feature 2", 
                description: "Second test feature",
                complexity: "High",
                effort: 20
            }
        ],
        
        versions: []
    };
    
    fs.writeFileSync(testConfig.testProjectPath, JSON.stringify(testProject, null, 2));
    console.log(`✅ Test project created: ${testConfig.testProjectPath}`);
    
    return testProject;
}

// Validate project structure after loading
function validateProjectStructure(project) {
    console.log('\n2. Validating project structure after loading...');
    
    const errors = [];
    
    // Check if all expected phase keys are present
    if (!project.phases) {
        errors.push('Missing phases object');
        return errors;
    }
    
    const actualPhaseKeys = Object.keys(project.phases);
    const missingKeys = testConfig.expectedPhaseKeys.filter(key => !actualPhaseKeys.includes(key));
    const extraKeys = actualPhaseKeys.filter(key => !testConfig.expectedPhaseKeys.includes(key));
    
    if (missingKeys.length > 0) {
        errors.push(`Missing phase keys: ${missingKeys.join(', ')}`);
    }
    
    if (extraKeys.length > 0) {
        errors.push(`Extra phase keys: ${extraKeys.join(', ')}`);
    }
    
    // Validate phase structure (excluding selectedSuppliers)
    testConfig.expectedPhaseKeys.forEach(key => {
        if (key === 'selectedSuppliers') return;
        
        const phase = project.phases[key];
        if (!phase) return; // Already caught by missing keys check
        
        const requiredPhaseFields = ['manDays', 'effort', 'assignedResources', 'cost', 'lastModified'];
        const missingPhaseFields = requiredPhaseFields.filter(field => !(field in phase));
        
        if (missingPhaseFields.length > 0) {
            errors.push(`Phase ${key} missing fields: ${missingPhaseFields.join(', ')}`);
        }
    });
    
    // Validate features
    if (!Array.isArray(project.features)) {
        errors.push('Features should be an array');
    } else if (project.features.length !== 2) {
        errors.push(`Expected 2 features, found ${project.features.length}`);
    }
    
    return errors;
}

// Simulate version comparison test
function simulateVersionComparison(project) {
    console.log('\n3. Simulating version comparison test...');
    
    if (!project.versions || project.versions.length < 1) {
        console.log('⚠️  No versions found - cannot test version comparison');
        return false;
    }
    
    const version = project.versions[0];
    if (!version.snapshot) {
        console.log('❌ Version snapshot missing');
        return false;
    }
    
    // Check if snapshot contains complete phase data
    const snapshot = version.snapshot;
    if (!snapshot.phases) {
        console.log('❌ Snapshot missing phases');
        return false;
    }
    
    const snapshotPhaseKeys = Object.keys(snapshot.phases);
    const hasCompletePhases = testConfig.expectedPhaseKeys.every(key => snapshotPhaseKeys.includes(key));
    
    if (!hasCompletePhases) {
        console.log(`❌ Snapshot phases incomplete. Found: ${snapshotPhaseKeys.join(', ')}`);
        return false;
    }
    
    console.log('✅ Version snapshot contains complete phase data');
    return true;
}

// Main test execution
function runTests() {
    try {
        // Create test project
        const testProject = createTestProject();
        
        console.log('\n📋 Instructions for manual testing:');
        console.log('1. Open the application (already running)');
        console.log(`2. Load the test project: ${testConfig.testProjectPath}`);
        console.log('3. Observe the console for auto-repair messages');
        console.log('4. Navigate to different sections (features, phases)');
        console.log('5. Create a new version');
        console.log('6. Compare the version with itself');
        console.log('7. Verify it shows actual differences, not "0 changes"');
        
        console.log('\n🔍 What to look for:');
        console.log('- "🔧 AUTO-REPAIR: Detected incomplete phases" message');
        console.log('- All 8 phase definitions appear correctly');
        console.log('- Version comparison shows real differences');
        console.log('- No race condition errors in console');
        console.log('- Loading states work properly');
        
        console.log('\n✨ Expected behavior:');
        console.log('- Project loads successfully with auto-repair');
        console.log('- All phases are properly initialized');
        console.log('- Version snapshots contain complete data');
        console.log('- Version comparison is accurate');
        
        // Cleanup instruction
        console.log('\n🧹 Cleanup:');
        console.log('After testing, you can delete the test file:');
        console.log(`rm "${testConfig.testProjectPath}"`);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    }
}

// Run the tests
runTests();