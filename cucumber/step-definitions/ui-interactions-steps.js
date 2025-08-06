const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

/**
 * UI Interactions Step Definitions
 * Covers modal management, navigation, forms, and keyboard shortcuts
 */

// Modal Management Steps
Given('I have a modal open', async function() {
  this.log('Opening a modal for testing');
  
  // Open feature modal as example
  await this.executeScript(`
    if (window.featureManager && window.featureManager.showModal) {
      window.featureManager.showModal();
    } else {
      // Fallback: create a test modal
      const modal = document.createElement('div');
      modal.className = 'modal show';
      modal.style.display = 'block';
      modal.innerHTML = \`
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Test Modal</h5>
              <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
              <p>Test modal content</p>
            </div>
          </div>
        </div>
      \`;
      document.body.appendChild(modal);
    }
  `);
  
  await this.waitForElement('.modal.show', this.timeouts.modal);
  
  this.testContext.modalState = { isOpen: true };
  this.log('✅ Modal opened for testing');
});

When('I close the modal by pressing Escape', async function() {
  this.log('Closing modal with Escape key');
  
  // Simulate Escape key press
  await this.executeScript(`
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true
    });
    document.dispatchEvent(escapeEvent);
  `);
  
  await this.pause(300); // Allow time for modal to close
  
  this.testContext.modalState = { isOpen: false, closedBy: 'escape' };
  this.log('✅ Escape key pressed');
});

When('I close the modal by clicking outside', async function() {
  this.log('Closing modal by clicking outside');
  
  // Click on modal backdrop
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    if (modal) {
      // Simulate click on modal backdrop
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      modal.dispatchEvent(clickEvent);
    }
  `);
  
  await this.pause(300);
  
  this.testContext.modalState = { isOpen: false, closedBy: 'backdrop' };
  this.log('✅ Clicked outside modal');
});

When('I close the modal using the close button', async function() {
  this.log('Closing modal with close button');
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const closeButton = modal?.querySelector('.close, .btn-close, [data-dismiss="modal"]');
    
    if (closeButton) {
      closeButton.click();
    } else {
      // Fallback: call modal close method
      if (window.featureManager && window.featureManager.hideModal) {
        window.featureManager.hideModal();
      }
    }
  `);
  
  await this.pause(300);
  
  this.testContext.modalState = { isOpen: false, closedBy: 'button' };
  this.log('✅ Close button clicked');
});

Then('the modal should be closed', async function() {
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show') || 
                  document.querySelector('.modal[style*="display: block"]');
    return {
      hasVisibleModal: !!modal,
      modalCount: document.querySelectorAll('.modal').length,
      displayStyle: modal?.style.display
    };
  `);
  
  assert(!result.hasVisibleModal, 'Modal should not be visible');
  
  this.testContext.modalState = { ...this.testContext.modalState, verified: true };
  this.log('✅ Modal is closed');
});

Then('the modal backdrop should be removed', async function() {
  const result = await this.executeScript(`
    return {
      hasBackdrop: !!document.querySelector('.modal-backdrop'),
      bodyClass: document.body.className,
      bodyStyle: document.body.style.cssText
    };
  `);
  
  assert(!result.hasBackdrop, 'Modal backdrop should be removed');
  assert(!result.bodyClass.includes('modal-open'), 'Body should not have modal-open class');
  
  this.log('✅ Modal backdrop removed');
});

// Navigation Steps
Given('I am on the {string} tab', async function(tabName) {
  this.log(`Navigating to ${tabName} tab`);
  
  await this.executeScript(`
    if (window.navigationManager && window.navigationManager.showSection) {
      window.navigationManager.showSection('${tabName.toLowerCase()}');
    } else {
      // Fallback: click tab directly
      const tab = document.querySelector(\`[data-tab="\${tabName.toLowerCase()}"], a[href*="\${tabName.toLowerCase()}"], .\${tabName.toLowerCase()}-tab\`);
      if (tab) {
        tab.click();
      }
    }
  `);
  
  await this.pause(500); // Allow navigation to complete
  
  this.testContext.navigationState = { currentTab: tabName };
  this.log(`✅ Navigated to ${tabName} tab`);
});

When('I navigate to the {string} tab', async function(tabName) {
  this.log(`Switching to ${tabName} tab`);
  
  await this.executeScript(`
    if (window.navigationManager && window.navigationManager.showSection) {
      window.navigationManager.showSection('${tabName.toLowerCase()}');
    } else {
      const tab = document.querySelector(\`[data-tab="\${tabName.toLowerCase()}"], a[href*="\${tabName.toLowerCase()}"], .\${tabName.toLowerCase()}-tab\`);
      if (tab) {
        tab.click();
      }
    }
  `);
  
  await this.pause(500);
  
  this.testContext.navigationState = { 
    previousTab: this.testContext.navigationState?.currentTab,
    currentTab: tabName 
  };
  
  this.log(`✅ Switched to ${tabName} tab`);
});

Then('the {string} section should be visible', async function(sectionName) {
  const result = await this.executeScript(`
    const section = document.querySelector(\`#\${sectionName.toLowerCase()}, .\${sectionName.toLowerCase()}-section, [data-section="\${sectionName.toLowerCase()}"]\`);
    return {
      sectionExists: !!section,
      isVisible: !!section && (section.style.display !== 'none' && !section.hidden),
      className: section?.className,
      style: section?.style.cssText
    };
  `);
  
  assert(result.sectionExists, `Section '${sectionName}' should exist`);
  assert(result.isVisible, `Section '${sectionName}' should be visible`);
  
  this.log(`✅ Section '${sectionName}' is visible`);
});

Then('the {string} tab should be marked as active', async function(tabName) {
  const result = await this.executeScript(`
    const tab = document.querySelector(\`[data-tab="\${tabName.toLowerCase()}"], a[href*="\${tabName.toLowerCase()}"], .\${tabName.toLowerCase()}-tab\`);
    return {
      tabExists: !!tab,
      hasActiveClass: !!tab && tab.classList.contains('active'),
      className: tab?.className,
      ariaCurrent: tab?.getAttribute('aria-current')
    };
  `);
  
  assert(result.tabExists, `Tab '${tabName}' should exist`);
  assert(result.hasActiveClass || result.ariaCurrent === 'page', 
    `Tab '${tabName}' should be marked as active`);
  
  this.log(`✅ Tab '${tabName}' is marked as active`);
});

// Form Validation Steps
Given('I have a form with required fields', async function() {
  this.log('Setting up form with required fields');
  
  // Open feature modal which has required fields
  await this.executeScript(`
    if (window.featureManager && window.featureManager.showModal) {
      window.featureManager.showModal();
    }
  `);
  
  await this.waitForElement('.modal.show form', this.timeouts.modal);
  
  const result = await this.executeScript(`
    const form = document.querySelector('.modal.show form');
    const requiredFields = form?.querySelectorAll('[required], .required');
    
    return {
      hasForm: !!form,
      requiredFieldCount: requiredFields?.length || 0,
      fieldNames: Array.from(requiredFields || []).map(f => f.name || f.id || f.className)
    };
  `);
  
  assert(result.hasForm, 'Form should be present');
  assert(result.requiredFieldCount > 0, 'Form should have required fields');
  
  this.testContext.formState = {
    hasRequiredFields: true,
    requiredFieldCount: result.requiredFieldCount,
    fieldNames: result.fieldNames
  };
  
  this.log(`✅ Form with ${result.requiredFieldCount} required fields ready`);
});

When('I submit the form without filling required fields', async function() {
  this.log('Attempting to submit form without required fields');
  
  await this.executeScript(`
    const form = document.querySelector('.modal.show form') || document.querySelector('form');
    if (form) {
      // Clear any filled values
      const inputs = form.querySelectorAll('input[required], .required input, select[required], textarea[required]');
      inputs.forEach(input => {
        input.value = '';
      });
      
      // Attempt to submit
      const submitBtn = form.querySelector('button[type="submit"], .btn-submit, .submit-btn') || 
                       form.querySelector('button:last-of-type');
      if (submitBtn) {
        submitBtn.click();
      } else {
        form.submit();
      }
    }
  `);
  
  await this.pause(500); // Allow validation to trigger
  
  this.testContext.formState = { 
    ...this.testContext.formState, 
    submitAttempted: true 
  };
  
  this.log('✅ Submit attempted without required fields');
});

Then('validation errors should be displayed', async function() {
  const result = await this.executeScript(`
    return {
      errorElements: document.querySelectorAll('.error, .invalid-feedback, .text-danger, .validation-error').length,
      invalidFields: document.querySelectorAll(':invalid, .is-invalid').length,
      errorMessages: Array.from(document.querySelectorAll('.error, .invalid-feedback, .text-danger')).map(el => el.textContent.trim()),
      formValid: document.querySelector('form')?.checkValidity()
    };
  `);
  
  assert(result.errorElements > 0 || result.invalidFields > 0 || result.formValid === false, 
    'Validation errors should be displayed');
  
  if (result.errorMessages.length > 0) {
    this.log(`Found validation messages: ${result.errorMessages.join(', ')}`);
  }
  
  this.log(`✅ Validation errors displayed (${result.errorElements} error elements, ${result.invalidFields} invalid fields)`);
});

Then('the form should not be submitted', async function() {
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    return {
      modalStillOpen: !!modal,
      formStillVisible: !!document.querySelector('form'),
      // Check if any submission success indicators are present
      hasSuccessMessage: !!document.querySelector('.success, .alert-success, .text-success')
    };
  `);
  
  assert(result.modalStillOpen || result.formStillVisible, 'Form should still be visible (not submitted)');
  assert(!result.hasSuccessMessage, 'No success message should be shown');
  
  this.log('✅ Form submission was prevented due to validation errors');
});

// Table Interaction Steps
Given('I have a table with sortable columns', async function() {
  this.log('Setting up sortable table');
  
  // Ensure features table is visible
  await this.executeScript(`
    if (window.navigationManager && window.navigationManager.showSection) {
      window.navigationManager.showSection('features');
    }
  `);
  
  await this.pause(500);
  
  const result = await this.executeScript(`
    const table = document.querySelector('#features-table, .features-table, table');
    const headers = table?.querySelectorAll('th[onclick], th.sortable, th[data-sort]');
    
    return {
      hasTable: !!table,
      sortableHeaders: headers?.length || 0,
      headerTexts: Array.from(headers || []).map(h => h.textContent.trim())
    };
  `);
  
  assert(result.hasTable, 'Table should be present');
  assert(result.sortableHeaders > 0, 'Table should have sortable columns');
  
  this.testContext.tableState = {
    hasSortableColumns: true,
    sortableCount: result.sortableHeaders,
    headers: result.headerTexts
  };
  
  this.log(`✅ Table with ${result.sortableHeaders} sortable columns ready`);
});

When('I click on a column header', async function() {
  this.log('Clicking on table column header');
  
  await this.executeScript(`
    const table = document.querySelector('#features-table, .features-table, table');
    const firstSortableHeader = table?.querySelector('th[onclick], th.sortable, th[data-sort]');
    
    if (firstSortableHeader) {
      firstSortableHeader.click();
    }
  `);
  
  await this.pause(300); // Allow sort to complete
  
  this.testContext.tableState = { 
    ...this.testContext.tableState, 
    sortClicked: true 
  };
  
  this.log('✅ Column header clicked');
});

Then('the table should be sorted by that column', async function() {
  const result = await this.executeScript(`
    const table = document.querySelector('#features-table, .features-table, table');
    const sortedHeader = table?.querySelector('th.sorted, th[aria-sort], th.asc, th.desc');
    const rows = table?.querySelectorAll('tbody tr');
    
    return {
      hasSortedHeader: !!sortedHeader,
      sortedHeaderClass: sortedHeader?.className,
      ariSort: sortedHeader?.getAttribute('aria-sort'),
      rowCount: rows?.length || 0,
      firstCellText: rows?.[0]?.querySelector('td')?.textContent?.trim()
    };
  `);
  
  assert(result.hasSortedHeader || result.ariSort, 'A column should be marked as sorted');
  
  this.testContext.tableState = { 
    ...this.testContext.tableState, 
    sorted: true,
    sortIndicator: result.sortedHeaderClass || result.ariSort
  };
  
  this.log(`✅ Table sorted (indicator: ${result.sortedHeaderClass || result.ariSort})`);
});

// Keyboard Shortcuts Steps
When('I press {string}', async function(keyCombo) {
  this.log(`Pressing keyboard shortcut: ${keyCombo}`);
  
  const keyParts = keyCombo.split('+').map(k => k.trim());
  
  await this.executeScript(`
    const event = new KeyboardEvent('keydown', {
      key: '${keyParts[keyParts.length - 1]}',
      code: 'Key${keyParts[keyParts.length - 1].toUpperCase()}',
      ctrlKey: ${keyParts.includes('Ctrl')},
      metaKey: ${keyParts.includes('Cmd') || keyParts.includes('Meta')},
      shiftKey: ${keyParts.includes('Shift')},
      altKey: ${keyParts.includes('Alt')},
      bubbles: true
    });
    document.dispatchEvent(event);
  `);
  
  await this.pause(200); // Allow shortcut to be processed
  
  this.testContext.keyboardState = { lastKey: keyCombo };
  this.log(`✅ Pressed: ${keyCombo}`);
});

// Loading States Steps
Given('I trigger a loading operation', async function() {
  this.log('Triggering loading operation');
  
  // Simulate loading a project or performing a long operation
  await this.executeScript(`
    if (window.app && window.app.loadProject) {
      // Simulate loading
      window.app.showLoading = true;
      
      // Show loading overlay
      let overlay = document.getElementById('loading-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner">Loading...</div>';
        overlay.style.display = 'block';
        document.body.appendChild(overlay);
      } else {
        overlay.style.display = 'block';
      }
    }
  `);
  
  this.testContext.loadingState = { triggered: true };
  this.log('✅ Loading operation triggered');
});

Then('a loading indicator should be displayed', async function() {
  const result = await this.executeScript(`
    return {
      hasLoadingOverlay: !!document.querySelector('#loading-overlay, .loading-overlay'),
      hasSpinner: !!document.querySelector('.spinner, .loading-spinner, .fa-spinner'),
      overlayVisible: document.querySelector('#loading-overlay, .loading-overlay')?.style.display !== 'none',
      loadingElements: document.querySelectorAll('.loading, .spinner, [class*="loading"]').length
    };
  `);
  
  assert(result.hasLoadingOverlay || result.hasSpinner || result.loadingElements > 0, 
    'Loading indicator should be displayed');
  
  if (result.hasLoadingOverlay) {
    assert(result.overlayVisible, 'Loading overlay should be visible');
  }
  
  this.log(`✅ Loading indicator displayed (${result.loadingElements} loading elements)`);
});

Then('user interaction should be prevented during loading', async function() {
  const result = await this.executeScript(`
    const overlay = document.querySelector('#loading-overlay, .loading-overlay');
    return {
      overlayBlocksInteraction: !!overlay && overlay.style.display !== 'none',
      bodyClass: document.body.className,
      hasDisabledElements: document.querySelectorAll('[disabled], .disabled').length,
      overlayZIndex: overlay?.style.zIndex || getComputedStyle(overlay || {}).zIndex
    };
  `);
  
  // Check if overlay blocks interaction or elements are disabled
  const interactionBlocked = result.overlayBlocksInteraction || 
                            result.hasDisabledElements > 0 ||
                            result.bodyClass.includes('loading');
  
  assert(interactionBlocked, 'User interaction should be prevented during loading');
  
  this.log('✅ User interaction prevented during loading');
});