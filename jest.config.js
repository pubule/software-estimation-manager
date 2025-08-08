module.exports = {
  // Test environment for DOM testing
  testEnvironment: 'jsdom',
  
  // Setup files to run after test environment is set up
  setupFilesAfterEnv: ['<rootDir>/tests/jest-setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.js'
  ],
  
  // Coverage collection
  collectCoverageFrom: [
    'src/renderer/js/**/*.js',
    '!src/renderer/js/**/*.test.js',
    '!src/renderer/js/**/node_modules/**'
  ],
  
  // Coverage thresholds (set low initially since these are behavioral documentation tests)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  
  // Module name mapping for cleaner imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/jest-setup.js'
  ],
  
  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage report formats
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Maximum number of worker processes
  maxWorkers: '50%',
  
  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Test timeout (30 seconds for comprehensive behavioral tests)
  testTimeout: 30000
};