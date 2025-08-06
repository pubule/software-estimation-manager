const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const TestHelpers = require('../utils/test-helpers');
const MainPage = require('../page-objects/main-page');
const FeatureModal = require('../page-objects/feature-modal');

/**
 * Custom World class for Software Estimation Manager testing
 * Provides Electron app testing capabilities and shared state management
 */
class SoftwareEstimationWorld {
  constructor({ attach, log, parameters }) {
    this.attach = attach;
    this.log = log;
    this.parameters = parameters;
    
    // Electron application instance
    this.electronApp = null;
    this.isAppRunning = false;
    this.playwright = null;
    this.electronAppProcess = null;
    
    // Test context and shared state
    this.testContext = {
      currentProject: null,
      currentFeature: null,
      lastError: null,
      modalState: null,
      navigationState: null,
      exportData: null
    };
    
    // UI element references (populated by page objects)
    this.elements = {};
    
    // Test fixtures and mock data
    this.fixtures = {
      projects: {},
      features: {},
      configurations: {}
    };
    
    // Timeouts from configuration
    this.timeouts = parameters.timeouts || {
      default: 30000,
      electron: 60000,
      fileOperation: 10000,
      modal: 5000
    };

    // Page Objects
    this.mainPage = new MainPage(this);
    this.featureModal = new FeatureModal(this);
    
    // Test Helpers
    this.helpers = TestHelpers;
    
    // Initialize fixtures
    this.loadFixtures();
  }

  /**
   * Launch Electron application for testing
   */
  async launchElectronApp() {
    if (this.isAppRunning) {
      this.log('Electron app already running');
      return;
    }

    const electronPath = require('electron');
    const appPath = path.join(__dirname, '../../src/main.js');
    
    this.log(`Launching Electron app: ${appPath}`);
    
    try {
      // Launch Electron with test environment variables
      this.electronApp = spawn(electronPath, [appPath], {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ELECTRON_IS_TEST: 'true',
          HEADLESS: this.parameters.testConfig?.headless ? 'true' : 'false'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.electronApp.stdout.on('data', (data) => {
        this.log(`Electron stdout: ${data}`);
      });

      this.electronApp.stderr.on('data', (data) => {
        this.log(`Electron stderr: ${data}`);
      });

      // Wait for app to be ready
      await this.waitForAppReady();
      this.isAppRunning = true;
      
      this.log('Electron app launched successfully');
    } catch (error) {
      this.log(`Failed to launch Electron app: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for Electron app to be ready for testing
   */
  async waitForAppReady(timeout = this.timeouts.electron) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for Electron app to be ready'));
          return;
        }
        
        // Check if main window is created and ready
        // In a real implementation, you'd check for specific app signals
        setTimeout(() => {
          resolve();
        }, 2000); // Basic delay for app startup
      };
      
      checkReady();
    });
  }

  /**
   * Close Electron application
   */
  async closeElectronApp() {
    if (!this.isAppRunning || !this.electronApp) {
      return;
    }

    this.log('Closing Electron app');
    
    try {
      // Send termination signal
      this.electronApp.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        this.electronApp.on('exit', resolve);
        
        // Force kill after timeout
        setTimeout(() => {
          if (this.electronApp && !this.electronApp.killed) {
            this.electronApp.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
      
      this.electronApp = null;
      this.isAppRunning = false;
      
      this.log('Electron app closed successfully');
    } catch (error) {
      this.log(`Error closing Electron app: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute JavaScript in the Electron renderer process
   */
  async executeScript(script) {
    // In a real implementation, this would use IPC or WebDriver protocol
    // to execute scripts in the Electron renderer process
    this.log(`Executing script: ${script}`);
    
    // Mock implementation - would be replaced with actual IPC calls
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, result: null });
      }, 100);
    });
  }

  /**
   * Get element from the UI (mock implementation)
   */
  async getElement(selector) {
    this.log(`Getting element: ${selector}`);
    
    // Mock element object
    return {
      selector,
      click: async () => this.log(`Clicking element: ${selector}`),
      type: async (text) => this.log(`Typing '${text}' in element: ${selector}`),
      getValue: async () => '',
      isVisible: async () => true,
      waitFor: async (timeout = 5000) => this.log(`Waiting for element: ${selector}`)
    };
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector, timeout = this.timeouts.default) {
    this.log(`Waiting for element: ${selector}`);
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  /**
   * Take screenshot for test documentation
   */
  async takeScreenshot(name) {
    this.log(`Taking screenshot: ${name}`);
    
    // Mock screenshot - in real implementation would capture actual screen
    const mockImageBuffer = Buffer.from('mock-screenshot-data');
    this.attach(mockImageBuffer, 'image/png');
  }

  /**
   * Reset test context between scenarios
   */
  resetTestContext() {
    this.testContext = {
      currentProject: null,
      currentFeature: null,
      lastError: null,
      modalState: null,
      navigationState: null,
      exportData: null
    };
    
    this.elements = {};
    this.log('Test context reset');
  }

  /**
   * Load test fixture data
   */
  loadFixture(type, name) {
    const fixturePath = path.join(__dirname, '../fixtures', `${type}.json`);
    
    if (fs.existsSync(fixturePath)) {
      const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      return fixtures[name];
    }
    
    return null;
  }

  /**
   * Utility method to pause execution (for debugging)
   */
  async pause(ms = 1000) {
    this.log(`Pausing for ${ms}ms`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load fixture data from JSON files
   */
  loadFixtures() {
    try {
      this.fixtures.projects = this.helpers.loadFixture('projects', 'all') || {};
      this.fixtures.features = this.helpers.loadFixture('features', 'all') || {};
      this.fixtures.configurations = this.helpers.loadFixture('configurations', 'all') || {};
      
      this.log('Fixtures loaded successfully');
    } catch (error) {
      this.log(`Warning: Could not load fixtures: ${error.message}`);
    }
  }

  /**
   * Get fixture data by type and name
   */
  getFixture(type, name) {
    return this.helpers.loadFixture(type, name);
  }

  /**
   * Create mock project data
   */
  createMockProject(complexity = 'simple') {
    return this.helpers.createMockProject(complexity);
  }

  /**
   * Validate feature data
   */
  validateFeature(feature) {
    return this.helpers.validateFeature(feature);
  }

  /**
   * Calculate expected man days
   */
  calculateExpectedManDays(realManDays, expertiseLevel, riskMargin) {
    return this.helpers.calculateExpectedManDays(realManDays, expertiseLevel, riskMargin);
  }

  /**
   * Generate test data
   */
  generateTestData() {
    return this.helpers.generateTestData();
  }

  /**
   * Enhanced Playwright integration for Electron testing
   * TODO: Implement when Playwright Electron support is needed
   */
  async launchPlaywrightElectron() {
    this.log('Playwright Electron integration not yet implemented - using basic spawn method');
    return this.launchElectronApp();
  }

  /**
   * Enhanced element interaction with retry logic
   */
  async getElementWithRetry(selector, timeout = this.timeouts.default) {
    return this.helpers.retryOperation(async () => {
      return this.getElement(selector);
    }, 3, 500);
  }

  /**
   * Wait for element with enhanced error reporting
   */
  async waitForElementEnhanced(selector, timeout = this.timeouts.default) {
    this.log(`Waiting for element: ${selector} (timeout: ${timeout}ms)`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await this.executeScript(`
        return {
          exists: !!document.querySelector('${selector}'),
          visible: !!document.querySelector('${selector}:not([style*="display: none"])'),
          count: document.querySelectorAll('${selector}').length
        };
      `);
      
      if (result.exists && result.visible) {
        this.log(`✅ Element found: ${selector} (${Date.now() - startTime}ms)`);
        return;
      }
      
      await this.pause(100);
    }
    
    // Final check with detailed error info
    const finalResult = await this.executeScript(`
      return {
        exists: !!document.querySelector('${selector}'),
        visible: !!document.querySelector('${selector}:not([style*="display: none"])'),
        count: document.querySelectorAll('${selector}').length,
        similarElements: Array.from(document.querySelectorAll('*')).filter(el => 
          el.id?.includes('${selector.replace(/[#.]/, '')}') || 
          el.className?.includes('${selector.replace(/[#.]/, '')}')
        ).map(el => ({ tag: el.tagName, id: el.id, class: el.className }))
      };
    `);
    
    const errorMsg = `Element not found: ${selector}
      - Exists: ${finalResult.exists}
      - Visible: ${finalResult.visible} 
      - Count: ${finalResult.count}
      - Similar elements: ${JSON.stringify(finalResult.similarElements, null, 2)}`;
    
    throw new Error(errorMsg);
  }

  /**
   * Execute script with enhanced error handling
   */
  async executeScriptEnhanced(script) {
    try {
      this.log(`Executing script: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
      
      const result = await this.executeScript(script);
      return result;
    } catch (error) {
      this.testContext.lastError = {
        script: script,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.log(`❌ Script execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup project with fixture data
   */
  async setupProjectWithFixture(fixtureName) {
    this.log(`Setting up project with fixture: ${fixtureName}`);
    
    const projectData = this.getFixture('projects', fixtureName);
    
    if (!projectData) {
      throw new Error(`Project fixture '${fixtureName}' not found`);
    }
    
    await this.executeScript(`
      if (!window.app.currentProject) {
        window.app.newProject();
      }
      
      // Load fixture data into current project
      Object.assign(window.app.currentProject, ${JSON.stringify(projectData)});
      
      // Update UI if needed
      if (window.featureManager && window.featureManager.updateTable) {
        window.featureManager.updateTable();
      }
      
      if (window.projectPhasesManager && window.projectPhasesManager.calculatePhases) {
        window.projectPhasesManager.calculatePhases();
      }
    `);
    
    this.testContext.currentProject = projectData;
    this.log(`✅ Project setup with fixture: ${fixtureName}`);
    
    return projectData;
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    this.log('Cleaning up test environment');
    
    try {
      // Close any open modals
      await this.executeScript(`
        const modals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
        modals.forEach(modal => {
          modal.style.display = 'none';
          modal.classList.remove('show');
        });
      `);
      
      // Clear project data
      await this.executeScript(`
        if (window.app && window.app.newProject) {
          window.app.newProject();
        }
      `);
      
      // Reset navigation
      await this.executeScript(`
        if (window.navigationManager && window.navigationManager.showSection) {
          window.navigationManager.showSection('features');
        }
      `);
      
      this.log('✅ Test environment cleaned up');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`);
    }
  }
}

// Set the custom World constructor
setWorldConstructor(SoftwareEstimationWorld);

// Set default timeout for all steps
setDefaultTimeout(30 * 1000);