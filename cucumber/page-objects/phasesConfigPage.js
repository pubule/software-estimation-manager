/**
 * Page Object for Phases Configuration Modal
 * Provides methods to interact with the Phases Configuration UI
 */

class PhasesConfigPage {
  constructor(browser) {
    this.browser = browser;
  }

  /**
   * Open the Phases Configuration modal
   */
  async openPhasesConfig() {
    // Look for the modal trigger button or element
    const phasesModal = await this.browser.$('div.phases-modal, div.phases-manager');
    if (!phasesModal) {
      throw new Error('Phases Configuration modal not found');
    }
    return phasesModal;
  }

  /**
   * Select approval status from dropdown
   * @param {string} status - "Approved" or "Pending Approval"
   */
  async selectApprovalStatus(status) {
    // Find the approval status selector dropdown
    const approvalStatusSelector = await this.browser.$('select[id*="approval"], .approval-status-selector select');
    if (!approvalStatusSelector) {
      throw new Error('Approval status selector dropdown not found');
    }

    // Select the option by value
    await approvalStatusSelector.selectByVisibleText(status);

    // Wait for the selection to be processed
    await this.browser.pause(500);
  }

  /**
   * Get current approval status from dropdown
   * @returns {Promise<string>} Current approval status value
   */
  async getApprovalStatus() {
    const approvalStatusSelector = await this.browser.$('select[id*="approval"], .approval-status-selector select');
    if (!approvalStatusSelector) {
      throw new Error('Approval status selector dropdown not found');
    }

    const selectedOption = await approvalStatusSelector.getValue();
    return selectedOption;
  }

  /**
   * Get approval status dropdown element
   * @returns {Promise<Element>} The approval status selector element
   */
  async getApprovalStatusDropdown() {
    const dropdown = await this.browser.$('select[id*="approval"], .approval-status-selector select');
    if (!dropdown) {
      throw new Error('Approval status dropdown not found');
    }
    return dropdown;
  }

  /**
   * Verify approval status dropdown is the first element in phases-controls
   * @returns {Promise<boolean>} True if dropdown is first child
   */
  async isApprovalStatusFirst() {
    const phasesControls = await this.browser.$('div.phases-controls');
    if (!phasesControls) {
      throw new Error('phases-controls div not found');
    }

    const firstChild = await phasesControls.$('> *:first-child');
    const approvalSelector = await phasesControls.$('.approval-status-selector');

    if (!firstChild || !approvalSelector) {
      return false;
    }

    // Check if the approval selector is the first child or contains the first child
    const isFirst = await firstChild.getAttribute('class').then(classes =>
      classes && classes.includes('approval-status-selector')
    );

    return isFirst;
  }

  /**
   * Get approval status label text
   * @returns {Promise<string>} The label text for the approval status selector
   */
  async getApprovalStatusLabel() {
    const label = await this.browser.$('.approval-status-selector label');
    if (!label) {
      throw new Error('Approval status label not found');
    }
    return await label.getText();
  }

  /**
   * Close the Phases Configuration modal
   */
  async closePhasesConfig() {
    // Look for a close button or click outside modal
    const closeButton = await this.browser.$('button.close, button.modal-close');
    if (closeButton) {
      await closeButton.click();
    } else {
      // Try clicking outside modal or pressing Escape
      await this.browser.keys('Escape');
    }
    await this.browser.pause(500);
  }

  /**
   * Check if project is marked as dirty
   * @returns {Promise<boolean>} True if project has unsaved changes
   */
  async isProjectDirty() {
    // Check if Save button is enabled (disabled when not dirty)
    const saveButton = await this.browser.$('button#save-current-project-btn, button.save-btn');
    if (!saveButton) {
      return false;
    }
    const isDisabled = await saveButton.getAttribute('disabled');
    return !isDisabled; // If not disabled, project is dirty
  }
}

module.exports = PhasesConfigPage;
