/**
 * Page Object for Project Cards (CurrentProjectCard, RecentProjectsList, SavedProjectsList)
 * Provides methods to interact with approval status icons in project cards
 */

class ProjectCardsPage {
  constructor(browser) {
    this.browser = browser;
  }

  /**
   * Get approval status icon from CurrentProjectCard
   * @returns {Promise<Element>} The approval status icon element
   */
  async getCurrentProjectApprovalIcon() {
    const currentCard = await this.browser.$('div#current-project-card, div.current-project-card');
    if (!currentCard) {
      throw new Error('CurrentProjectCard not found');
    }

    const icon = await currentCard.$('.approval-status-icon, i.fa-check-circle, i.fa-clock');
    if (!icon) {
      throw new Error('Approval status icon not found in CurrentProjectCard');
    }

    return icon;
  }

  /**
   * Get approval status icon color from CurrentProjectCard
   * @returns {Promise<string>} The color of the icon (e.g., "#4CAF50" or "#FF9800")
   */
  async getCurrentProjectIconColor() {
    const icon = await this.getCurrentProjectApprovalIcon();
    const color = await icon.getCSSProperty('color');
    return color.value;
  }

  /**
   * Get approval status icon tooltip from CurrentProjectCard
   * @returns {Promise<string>} The tooltip text
   */
  async getCurrentProjectIconTooltip() {
    const icon = await this.getCurrentProjectApprovalIcon();
    const title = await icon.getAttribute('title');
    return title;
  }

  /**
   * Verify icon is checkmark (approved)
   * @returns {Promise<boolean>} True if icon is fas fa-check-circle
   */
  async isApprovedIcon(icon = null) {
    if (!icon) {
      icon = await this.getCurrentProjectApprovalIcon();
    }

    const classes = await icon.getAttribute('class');
    return classes && classes.includes('fa-check-circle');
  }

  /**
   * Verify icon is clock (pending approval)
   * @returns {Promise<boolean>} True if icon is fas fa-clock
   */
  async isPendingIcon(icon = null) {
    if (!icon) {
      icon = await this.getCurrentProjectApprovalIcon();
    }

    const classes = await icon.getAttribute('class');
    return classes && classes.includes('fa-clock');
  }

  /**
   * Get approval icon from recent project item
   * @param {string} projectId - The project ID or name
   * @returns {Promise<Element>} The approval status icon element
   */
  async getRecentProjectApprovalIcon(projectId) {
    // Find the recent project item by ID or name
    const projectItem = await this.browser.$(`div.project-item[data-project-id="${projectId}"], div.project-item:has([class*="${projectId}"])`);
    if (!projectItem) {
      throw new Error(`Recent project item with ID ${projectId} not found`);
    }

    const icon = await projectItem.$('.approval-status-icon, i.fa-check-circle, i.fa-clock');
    if (!icon) {
      throw new Error(`Approval status icon not found for recent project ${projectId}`);
    }

    return icon;
  }

  /**
   * Get approval icon from saved project item
   * @param {string} filePath - The project file path
   * @returns {Promise<Element>} The approval status icon element
   */
  async getSavedProjectApprovalIcon(filePath) {
    // Find the saved project item by file path
    const projectItem = await this.browser.$(`div.project-item[data-filepath="${filePath}"], div.project-item:has([class*="${filePath}"])`);
    if (!projectItem) {
      throw new Error(`Saved project item with path ${filePath} not found`);
    }

    const icon = await projectItem.$('.approval-status-icon, i.fa-check-circle, i.fa-clock');
    if (!icon) {
      throw new Error(`Approval status icon not found for saved project ${filePath}`);
    }

    return icon;
  }

  /**
   * Verify CurrentProjectCard is visible
   * @returns {Promise<boolean>} True if card is visible
   */
  async isCurrentProjectCardVisible() {
    const card = await this.browser.$('div#current-project-card, div.current-project-card');
    if (!card) {
      return false;
    }
    return await card.isDisplayed();
  }

  /**
   * Verify RecentProjectsList is visible
   * @returns {Promise<boolean>} True if list is visible
   */
  async isRecentProjectsListVisible() {
    const list = await this.browser.$('div.recent-projects-list, div.recent-projects-section');
    if (!list) {
      return false;
    }
    return await list.isDisplayed();
  }

  /**
   * Verify SavedProjectsList is visible
   * @returns {Promise<boolean>} True if list is visible
   */
  async isSavedProjectsListVisible() {
    const list = await this.browser.$('div.saved-projects-list, div.saved-projects-section, div.file-browser');
    if (!list) {
      return false;
    }
    return await list.isDisplayed();
  }

  /**
   * Get all recent project items
   * @returns {Promise<Array>} Array of recent project item elements
   */
  async getRecentProjectItems() {
    const list = await this.browser.$('div.recent-projects-list, div.recent-projects-section');
    if (!list) {
      throw new Error('Recent projects list not found');
    }

    const items = await list.$$('div.project-item');
    return items;
  }

  /**
   * Get all saved project items
   * @returns {Promise<Array>} Array of saved project item elements
   */
  async getSavedProjectItems() {
    const list = await this.browser.$('div.saved-projects-list, div.saved-projects-section, div.file-browser');
    if (!list) {
      throw new Error('Saved projects list not found');
    }

    const items = await list.$$('div.project-item');
    return items;
  }

  /**
   * Verify icon has correct color
   * @param {string} expectedColor - Expected color (e.g., "#4CAF50" or "#FF9800")
   * @param {Element} icon - The icon element
   * @returns {Promise<boolean>} True if color matches
   */
  async hasColor(expectedColor, icon) {
    if (!icon) {
      icon = await this.getCurrentProjectApprovalIcon();
    }

    const color = await icon.getCSSProperty('color');
    // Normalize color values for comparison
    const colorValue = color.value.toLowerCase();
    const expectedLower = expectedColor.toLowerCase();

    return colorValue.includes(expectedLower) || colorValue === expectedLower;
  }

  /**
   * Verify approval status is displayed inline with metadata
   * @returns {Promise<boolean>} True if icon is in project-meta-row
   */
  async isIconInlineWithMetadata() {
    try {
      const icon = await this.getCurrentProjectApprovalIcon();
      const parent = await icon.parentElement();
      const parentClasses = await parent.getAttribute('class');

      return parentClasses && parentClasses.includes('project-detail');
    } catch {
      return false;
    }
  }
}

module.exports = ProjectCardsPage;
