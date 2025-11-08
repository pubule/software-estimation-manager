/**
 * Step definitions for Capacity Timeline Chevron Collapse feature
 * Tests chevron collapse behavior on assignment modal saves
 */

const { Given, When, Then, Before, After } = require('@cucumber/cucumber');

let initialExpandedKeys = [];
let memberChevronExpanded = false;
let projectChevronExpanded = false;

Before(function() {
  // Clear state before each scenario
  initialExpandedKeys = [];
  memberChevronExpanded = false;
  projectChevronExpanded = false;
});

// ========================
// GIVEN STEPS
// ========================

Given('the application is loaded', async function() {
  // Application should be running via Electron
  await global.browser.pause(500);
  console.log('✅ Application is loaded');
});

Given('I have a project with team members', async function() {
  // Verify project is loaded with team members
  // This would check that the store has a current project
  const hasProject = await global.browser.execute(() => {
    const store = window.appStore;
    if (!store) return false;
    const state = store.getState();
    return state.currentProject !== null;
  });

  if (!hasProject) {
    throw new Error('No project with team members is loaded');
  }
  console.log('✅ Project with team members is loaded');
});

Given('I am on the Capacity Timeline page', async function() {
  // Navigate to capacity timeline if not already there
  await global.browser.execute(() => {
    const store = window.appStore;
    if (!store) throw new Error('Store not available');
    store.getState().setCurrentSection('capacity-timeline');
  });

  await global.browser.pause(1000); // Wait for section to load

  // Verify we're on the capacity timeline page
  const section = await global.browser.execute(() => {
    return window.appStore?.getState().currentSection;
  });

  if (section !== 'capacity-timeline') {
    throw new Error(`Not on capacity timeline page. Current section: ${section}`);
  }

  console.log('✅ On Capacity Timeline page');
});

Given('I expand a member row chevron', async function() {
  // Find the first member row and click its chevron to expand
  const chevron = await global.browser.$('.timeline-row-chevron');
  if (!chevron) {
    throw new Error('No member chevron found');
  }

  await chevron.click();
  await global.browser.pause(500);

  memberChevronExpanded = true;
  console.log('✅ Member row chevron expanded');
});

Given('I expand a project row chevron', async function() {
  // Find a project row chevron and click it
  const projectChevron = await global.browser.$('.timeline-project-chevron');
  if (!projectChevron) {
    throw new Error('No project chevron found');
  }

  await projectChevron.click();
  await global.browser.pause(500);

  projectChevronExpanded = true;
  console.log('✅ Project row chevron expanded');
});

Given('I expand a project row chevron to show phases', async function() {
  // Same as above but more explicit
  await this.expandProjectRowChevron();
  projectChevronExpanded = true;
  console.log('✅ Project row chevron expanded to show phases');
});

// ========================
// WHEN STEPS
// ========================

When('I click the "Add Assignment" button', async function() {
  // Store initial localStorage state
  initialExpandedKeys = await global.browser.execute(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('timeline-expanded-') || key.startsWith('timeline-projects-expanded-')) {
        keys.push(key);
      }
    }
    return keys;
  });

  // Click the Add Assignment button
  const addButton = await global.browser.$('button*=Add Assignment');
  if (!addButton) {
    throw new Error('Add Assignment button not found');
  }

  await addButton.click();
  await global.browser.pause(1000);

  console.log('✅ Clicked Add Assignment button');
});

When('I fill in valid assignment details', async function() {
  // Fill in the assignment modal with valid data
  // This would interact with AssignmentModal form fields

  // Select project
  const projectSelect = await global.browser.$('#assignment-project-select');
  if (projectSelect) {
    await projectSelect.selectByIndex(1);
  }

  // Select member
  const memberSelect = await global.browser.$('#assignment-member-select');
  if (memberSelect) {
    await memberSelect.selectByIndex(1);
  }

  // Set dates
  const startDate = await global.browser.$('input[name="startDate"]');
  if (startDate) {
    await startDate.setValue('2025-01-01');
  }

  const endDate = await global.browser.$('input[name="endDate"]');
  if (endDate) {
    await endDate.setValue('2025-12-31');
  }

  await global.browser.pause(500);
  console.log('✅ Filled in valid assignment details');
});

When('I click "Create Assignment" button', async function() {
  // Click the Create Assignment button in the modal
  const createButton = await global.browser.$('button*=Create Assignment');
  if (!createButton) {
    throw new Error('Create Assignment button not found');
  }

  await createButton.click();
  await global.browser.pause(1500); // Wait for save operation

  console.log('✅ Clicked Create Assignment button');
});

When('I click edit button on an existing allocation', async function() {
  // Store initial localStorage state
  initialExpandedKeys = await global.browser.execute(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('timeline-expanded-') || key.startsWith('timeline-projects-expanded-')) {
        keys.push(key);
      }
    }
    return keys;
  });

  // Click an edit button on an allocation row
  const editButton = await global.browser.$('.allocation-edit-button, button.edit-allocation');
  if (!editButton) {
    throw new Error('Edit allocation button not found');
  }

  await editButton.click();
  await global.browser.pause(1000);

  console.log('✅ Clicked edit button on allocation');
});

When('I modify the assignment details', async function() {
  // Modify some field in the assignment modal
  const endDate = await global.browser.$('input[name="endDate"]');
  if (endDate) {
    await endDate.setValue('2025-06-30');
  }

  await global.browser.pause(500);
  console.log('✅ Modified assignment details');
});

When('I click "Update Assignment" button', async function() {
  // Click the Update Assignment button in the modal
  const updateButton = await global.browser.$('button*=Update Assignment');
  if (!updateButton) {
    throw new Error('Update Assignment button not found');
  }

  await updateButton.click();
  await global.browser.pause(1500); // Wait for save operation

  console.log('✅ Clicked Update Assignment button');
});

When('I edit a phase MD value inline in the table', async function() {
  // Click on an editable phase MD cell and modify it
  const phaseMDCell = await global.browser.$('.phase-md-editable, input.phase-md-input');
  if (!phaseMDCell) {
    throw new Error('Phase MD editable cell not found');
  }

  await phaseMDCell.click();
  await phaseMDCell.setValue('50');

  console.log('✅ Edited phase MD value inline');
});

When('I press Enter to save the inline edit', async function() {
  // Press Enter to confirm the inline edit
  await global.browser.keys('Enter');
  await global.browser.pause(1000);

  console.log('✅ Pressed Enter to save inline edit');
});

When('I fill in assignment details', async function() {
  // Similar to "fill in valid assignment details"
  await this.fillInValidAssignmentDetails();
  console.log('✅ Filled in assignment details');
});

When('I click "Cancel" button on the modal', async function() {
  // Click the Cancel button in the modal
  const cancelButton = await global.browser.$('button*=Cancel');
  if (!cancelButton) {
    throw new Error('Cancel button not found');
  }

  await cancelButton.click();
  await global.browser.pause(500);

  console.log('✅ Clicked Cancel button');
});

// ========================
// THEN STEPS
// ========================

Then('all member row chevrons should be collapsed', async function() {
  // Check that all member chevrons are in collapsed state
  const expandedChevrons = await global.browser.execute(() => {
    const chevrons = document.querySelectorAll('.timeline-row-chevron');
    let expandedCount = 0;
    chevrons.forEach(chevron => {
      const isExpanded = chevron.classList.contains('expanded') ||
                        chevron.classList.contains('rotated') ||
                        chevron.getAttribute('aria-expanded') === 'true';
      if (isExpanded) expandedCount++;
    });
    return expandedCount;
  });

  if (expandedChevrons > 0) {
    throw new Error(`Found ${expandedChevrons} expanded member chevrons, expected all to be collapsed`);
  }

  console.log('✅ All member row chevrons are collapsed');
});

Then('all project row chevrons should be collapsed', async function() {
  // Check that all project chevrons are in collapsed state
  const expandedProjectChevrons = await global.browser.execute(() => {
    const chevrons = document.querySelectorAll('.timeline-project-chevron');
    let expandedCount = 0;
    chevrons.forEach(chevron => {
      const isExpanded = chevron.classList.contains('expanded') ||
                        chevron.classList.contains('rotated') ||
                        chevron.getAttribute('aria-expanded') === 'true';
      if (isExpanded) expandedCount++;
    });
    return expandedCount;
  });

  if (expandedProjectChevrons > 0) {
    throw new Error(`Found ${expandedProjectChevrons} expanded project chevrons, expected all to be collapsed`);
  }

  console.log('✅ All project row chevrons are collapsed');
});

Then('localStorage should not contain keys matching {string}', async function(keyPattern) {
  // Check localStorage for keys matching the pattern
  const matchingKeys = await global.browser.execute((pattern) => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(pattern)) {
        keys.push(key);
      }
    }
    return keys;
  }, keyPattern);

  if (matchingKeys.length > 0) {
    throw new Error(`Found ${matchingKeys.length} localStorage keys matching "${keyPattern}": ${matchingKeys.join(', ')}`);
  }

  console.log(`✅ No localStorage keys matching "${keyPattern}"`);
});

Then('the member row chevron should remain expanded', async function() {
  // Verify that at least one member chevron is still expanded
  const hasExpandedChevron = await global.browser.execute(() => {
    const chevrons = document.querySelectorAll('.timeline-row-chevron');
    for (const chevron of chevrons) {
      const isExpanded = chevron.classList.contains('expanded') ||
                        chevron.classList.contains('rotated') ||
                        chevron.getAttribute('aria-expanded') === 'true';
      if (isExpanded) return true;
    }
    return false;
  });

  if (!hasExpandedChevron) {
    throw new Error('No expanded member chevrons found, but expected them to remain expanded');
  }

  console.log('✅ Member row chevron remains expanded');
});

Then('the project row chevron should remain expanded', async function() {
  // Verify that at least one project chevron is still expanded
  const hasExpandedProjectChevron = await global.browser.execute(() => {
    const chevrons = document.querySelectorAll('.timeline-project-chevron');
    for (const chevron of chevrons) {
      const isExpanded = chevron.classList.contains('expanded') ||
                        chevron.classList.contains('rotated') ||
                        chevron.getAttribute('aria-expanded') === 'true';
      if (isExpanded) return true;
    }
    return false;
  });

  if (!hasExpandedProjectChevron) {
    throw new Error('No expanded project chevrons found, but expected them to remain expanded');
  }

  console.log('✅ Project row chevron remains expanded');
});

Then('localStorage should still contain the expansion state keys', async function() {
  // Verify that localStorage still has the expansion keys
  const hasExpansionKeys = await global.browser.execute(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('timeline-expanded-') || key.startsWith('timeline-projects-expanded-')) {
        return true;
      }
    }
    return false;
  });

  if (!hasExpansionKeys) {
    throw new Error('No expansion state keys found in localStorage, but expected them to remain');
  }

  console.log('✅ localStorage still contains expansion state keys');
});

After(function() {
  // Cleanup after each scenario
  console.log('🧹 Cleaning up after capacity timeline collapse scenario');
});
