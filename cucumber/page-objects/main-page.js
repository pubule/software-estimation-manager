/**
 * Main Page Object
 * Handles interactions with the main application interface
 */
class MainPage {
  constructor(world) {
    this.world = world;
  }

  // Navigation Elements
  get navigationTabs() {
    return this.world.getElement('#navigation-tabs');
  }

  get featuresTab() {
    return this.world.getElement('a[href="#features"], #features-tab');
  }

  get configurationTab() {
    return this.world.getElement('a[href="#configuration"], #configuration-tab');
  }

  get projectPhasesTab() {
    return this.world.getElement('a[href="#project-phases"], #project-phases-tab');
  }

  get versionHistoryTab() {
    return this.world.getElement('a[href="#version-history"], #version-history-tab');
  }

  // Project Info Section
  get projectNameInput() {
    return this.world.getElement('#project-name');
  }

  get projectDescriptionInput() {
    return this.world.getElement('#project-description');
  }

  get projectVersionInput() {
    return this.world.getElement('#project-version');
  }

  get projectStatusIndicator() {
    return this.world.getElement('#project-status');
  }

  // Action Buttons
  get newProjectButton() {
    return this.world.getElement('#new-project-btn, .new-project-btn');
  }

  get saveProjectButton() {
    return this.world.getElement('#save-project-btn, .save-project-btn');
  }

  get loadProjectButton() {
    return this.world.getElement('#load-project-btn, .load-project-btn');
  }

  get exportButton() {
    return this.world.getElement('#export-btn, .export-button, [data-export]');
  }

  // Export Menu
  get exportMenu() {
    return this.world.getElement('.export-menu, .context-menu, .dropdown-menu.show');
  }

  get exportToJSONOption() {
    return this.world.getElement('.export-menu a[data-format="json"], .export-menu button[data-format="json"]');
  }

  get exportToCSVOption() {
    return this.world.getElement('.export-menu a[data-format="csv"], .export-menu button[data-format="csv"]');
  }

  get exportToExcelOption() {
    return this.world.getElement('.export-menu a[data-format="excel"], .export-menu button[data-format="excel"]');
  }

  // Application State
  async waitForApplicationReady() {
    this.world.log('Waiting for application to be ready');
    
    await this.world.waitForElement('#app-container');
    
    const result = await this.world.executeScript(`
      return {
        isReady: document.readyState === 'complete',
        hasMainComponents: !![
          window.app,
          window.dataManager,
          window.configurationManager,
          window.featureManager
        ].every(c => c)
      };
    `);
    
    if (!result.isReady || !result.hasMainComponents) {
      await this.world.pause(1000);
      return this.waitForApplicationReady();
    }
    
    this.world.log('✅ Application is ready');
  }

  // Navigation Actions
  async navigateToSection(sectionName) {
    this.world.log(`Navigating to ${sectionName} section`);
    
    await this.world.executeScript(`
      if (window.navigationManager && window.navigationManager.showSection) {
        window.navigationManager.showSection('${sectionName}');
      }
    `);
    
    // Wait for section to be visible
    await this.world.waitForElement(`#${sectionName}, .${sectionName}-section`);
    
    this.world.log(`✅ Navigated to ${sectionName} section`);
  }

  // Project Management
  async createNewProject() {
    this.world.log('Creating new project');
    
    await this.world.executeScript('window.app.newProject()');
    
    // Wait for new project to be initialized
    await this.world.waitForElement('#project-name');
    await this.world.pause(500); // Allow initialization to complete
    
    const result = await this.world.executeScript(`
      return {
        hasProject: !!window.app.currentProject,
        projectName: window.app.currentProject?.name,
        isDirty: window.app.currentProject?.isDirty
      };
    `);
    
    this.world.testContext.currentProject = result;
    this.world.log('✅ New project created');
    
    return result;
  }

  async saveProject() {
    this.world.log('Saving project');
    
    await this.world.executeScript(`
      if (window.app && window.app.saveProject) {
        window.app.saveProject();
      }
    `);
    
    this.world.log('✅ Project saved');
  }

  async setProjectName(name) {
    this.world.log(`Setting project name to: ${name}`);
    
    await this.world.executeScript(`
      const nameInput = document.getElementById('project-name');
      if (nameInput) {
        nameInput.value = '${name}';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Project name set to: ${name}`);
  }

  async setProjectDescription(description) {
    this.world.log(`Setting project description`);
    
    await this.world.executeScript(`
      const descInput = document.getElementById('project-description');
      if (descInput) {
        descInput.value = \`${description}\`;
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    
    this.world.log('✅ Project description set');
  }

  // Export Functionality
  async openExportMenu() {
    this.world.log('Opening export menu');
    
    const exportButton = await this.exportButton;
    await exportButton.click();
    
    // Wait for menu to appear
    await this.world.waitForElement('.export-menu, .context-menu');
    
    this.world.log('✅ Export menu opened');
  }

  async selectExportFormat(format) {
    this.world.log(`Selecting export format: ${format}`);
    
    await this.openExportMenu();
    
    let option;
    switch (format.toLowerCase()) {
      case 'json':
        option = await this.exportToJSONOption;
        break;
      case 'csv':
        option = await this.exportToCSVOption;
        break;
      case 'excel':
      case 'xlsx':
        option = await this.exportToExcelOption;
        break;
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
    
    await option.click();
    
    this.world.log(`✅ Selected export format: ${format}`);
  }

  // Status Checking
  async getProjectStatus() {
    const result = await this.world.executeScript(`
      return {
        statusText: document.getElementById('project-status')?.textContent,
        statusClass: document.getElementById('project-status')?.className,
        isDirty: window.app.currentProject?.isDirty || false,
        hasProject: !!window.app.currentProject
      };
    `);
    
    return result;
  }

  async isProjectDirty() {
    const status = await this.getProjectStatus();
    return status.isDirty;
  }

  async hasUnsavedChanges() {
    const status = await this.getProjectStatus();
    return status.statusText?.includes('●') || 
           status.statusClass?.includes('unsaved') || 
           status.isDirty;
  }

  // Utility Methods
  async getCurrentSection() {
    const result = await this.world.executeScript(`
      return window.navigationManager?.currentSection || 'unknown';
    `);
    
    return result;
  }

  async getProjectSummary() {
    const result = await this.world.executeScript(`
      const project = window.app.currentProject;
      return {
        name: project?.name,
        description: project?.description,
        version: project?.version,
        featureCount: (project?.features || []).length,
        phaseCount: Object.keys(project?.phases || {}).length,
        isDirty: project?.isDirty || false,
        totalManDays: (project?.features || []).reduce((sum, f) => sum + (f.manDays || 0), 0)
      };
    `);
    
    return result;
  }

  async takeScreenshot(name) {
    await this.world.takeScreenshot(name || 'main-page');
  }

  // Validation Helpers
  async verifyApplicationState() {
    const result = await this.world.executeScript(`
      return {
        hasApp: !!window.app,
        hasProject: !!window.app?.currentProject,
        componentsLoaded: {
          dataManager: !!window.dataManager,
          configurationManager: !!window.configurationManager,
          featureManager: !!window.featureManager,
          projectPhasesManager: !!window.projectPhasesManager,
          navigationManager: !!window.navigationManager
        },
        uiElements: {
          appContainer: !!document.getElementById('app-container'),
          navigation: !!document.getElementById('navigation-tabs'),
          projectInfo: !!document.getElementById('project-info')
        }
      };
    `);
    
    return result;
  }
}

module.exports = MainPage;