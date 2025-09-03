/**
 * Verification script to check if auto-repair worked correctly
 * Run this after loading the test project to validate the fixes
 */

const fs = require('fs');
const path = require('path');

// Auto-saved project path (where Electron saves projects)
const autoSavedPath = path.join(
    require('os').homedir(),
    'Library/Application Support/software-estimation-manager',
    'projects',
    'Enhanced Loading Test.json'
);

// Alternative paths to check
const possiblePaths = [
    autoSavedPath,
    path.join(__dirname, 'test-project-enhanced.json'),
    path.join(__dirname, 'Enhanced Loading Test.json')
];

function findProjectFile() {
    console.log('🔍 Looking for project file...');
    
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            console.log(`✅ Found project file: ${filePath}`);
            return filePath;
        } else {
            console.log(`❌ Not found: ${filePath}`);
        }
    }
    
    return null;
}

function verifyAutoRepair() {
    console.log('🔧 AUTO-REPAIR VERIFICATION');
    console.log('==========================\n');
    
    const projectPath = findProjectFile();
    if (!projectPath) {
        console.log('❌ No project file found. Make sure to load the test project first.');
        return;
    }
    
    try {
        const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
        
        console.log('📊 Project Analysis:');
        console.log(`- Name: ${projectData.name}`);
        console.log(`- Created: ${projectData.created}`);
        console.log(`- Last Modified: ${projectData.lastModified}`);
        
        // Check phases
        if (!projectData.phases) {
            console.log('❌ PHASES: Missing phases object');
            return;
        }
        
        const phaseKeys = Object.keys(projectData.phases);
        console.log(`\n📋 PHASES (${phaseKeys.length} found):`);
        
        const expectedPhases = [
            'functionalAnalysis',
            'technicalAnalysis', 
            'systemDesign',
            'development',
            'systemTest',
            'userAcceptanceTest',
            'deployment',
            'projectManagement',
            'selectedSuppliers'
        ];
        
        let allPhasesPresent = true;
        expectedPhases.forEach(phase => {
            const present = phaseKeys.includes(phase);
            console.log(`  ${present ? '✅' : '❌'} ${phase}`);
            if (!present) allPhasesPresent = false;
        });
        
        // Check phase structure
        console.log('\n🔍 PHASE STRUCTURE VALIDATION:');
        let structureValid = true;
        
        expectedPhases.forEach(phaseKey => {
            if (phaseKey === 'selectedSuppliers') return;
            
            const phase = projectData.phases[phaseKey];
            if (!phase) return;
            
            const requiredFields = ['manDays', 'effort', 'assignedResources', 'cost', 'lastModified'];
            const hasAllFields = requiredFields.every(field => field in phase);
            
            console.log(`  ${hasAllFields ? '✅' : '❌'} ${phaseKey} - Complete structure`);
            if (!hasAllFields) {
                const missing = requiredFields.filter(field => !(field in phase));
                console.log(`    Missing: ${missing.join(', ')}`);
                structureValid = false;
            }
        });
        
        // Check versions
        console.log('\n📦 VERSIONS:');
        if (projectData.versions && projectData.versions.length > 0) {
            console.log(`  ✅ ${projectData.versions.length} version(s) found`);
            
            projectData.versions.forEach((version, index) => {
                console.log(`  Version ${index + 1}:`);
                console.log(`    - Name: ${version.name}`);
                console.log(`    - Created: ${version.created}`);
                console.log(`    - Checksum: ${version.checksum}`);
                
                if (version.snapshot && version.snapshot.phases) {
                    const snapshotPhases = Object.keys(version.snapshot.phases);
                    const completeSnapshot = expectedPhases.every(phase => snapshotPhases.includes(phase));
                    console.log(`    - Snapshot: ${completeSnapshot ? '✅ Complete' : '❌ Incomplete'}`);
                    if (!completeSnapshot) {
                        console.log(`      Found phases: ${snapshotPhases.join(', ')}`);
                    }
                } else {
                    console.log(`    - Snapshot: ❌ Missing`);
                }
            });
        } else {
            console.log('  ℹ️  No versions created yet');
        }
        
        // Final assessment
        console.log('\n🎯 FINAL ASSESSMENT:');
        if (allPhasesPresent && structureValid) {
            console.log('✅ AUTO-REPAIR SUCCESSFUL');
            console.log('   - All phases are present and correctly structured');
            console.log('   - Project is ready for version comparison testing');
        } else {
            console.log('❌ AUTO-REPAIR ISSUES DETECTED');
            console.log('   - Some phases or structures are missing');
            console.log('   - Check console logs for auto-repair messages');
        }
        
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Create a new version in the application');
        console.log('2. Make some changes (add features, modify phases)');  
        console.log('3. Create another version');
        console.log('4. Compare versions to verify accurate difference detection');
        
    } catch (error) {
        console.error('❌ Error reading project file:', error.message);
    }
}

verifyAutoRepair();