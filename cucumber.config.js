const common = {
  // Feature file paths
  paths: ['features/**/*.feature'],
  
  // Step definition paths
  require: [
    'cucumber/support/**/*.js',
    'cucumber/step-definitions/**/*.js'
  ],
  
  // Formatting options
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
    'junit:reports/cucumber-junit.xml'
  ],
  
  // World parameters (shared across all scenarios)
  worldParameters: {
    // Timeouts for different operations
    timeouts: {
      default: 30000,
      electron: 60000,
      fileOperation: 10000,
      modal: 5000
    },
    
    // Test configuration
    testConfig: {
      electronPath: './src/main.js',
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
      devtools: process.env.DEVTOOLS === 'true'
    }
  },
  
  // Parallel execution
  parallel: process.env.CI ? 1 : 2,
  
  // Retry failed scenarios
  retry: process.env.CI ? 2 : 0,
  
  // Exit on first failure in CI
  failFast: process.env.CI === 'true'
};

module.exports = {
  default: common,
  
  // Profile for running specific features
  'project-management': {
    ...common,
    paths: ['features/project-management.feature']
  },
  
  'feature-management': {
    ...common,
    paths: ['features/feature-management.feature']
  },
  
  'configuration-management': {
    ...common,
    paths: ['features/configuration-management.feature']
  },
  
  'project-phases': {
    ...common,
    paths: ['features/project-phases-management.feature']
  },
  
  'data-persistence': {
    ...common,
    paths: ['features/data-persistence.feature']
  },
  
  'export-functionality': {
    ...common,
    paths: ['features/export-functionality.feature']
  },
  
  'ui-interactions': {
    ...common,
    paths: ['features/ui-interactions.feature']
  },
  
  'version-management': {
    ...common,
    paths: ['features/version-management.feature']
  },
  
  'bugs-and-issues': {
    ...common,
    paths: ['features/bugs-and-known-issues.feature']
  },
  
  // Profile for smoke tests (key scenarios only)
  'smoke': {
    ...common,
    paths: ['features/**/*.feature'],
    tags: '@smoke'
  }
};