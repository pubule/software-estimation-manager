/**
 * Jest Test Setup
 * Global test configuration and mocks for behavioral tests
 */

// Import testing utilities
import '@testing-library/jest-dom';

// Global test setup
beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Clear any existing timers
  jest.clearAllTimers();
  
  // Reset console spies
  jest.restoreAllMocks();
  
  // Clear localStorage
  if (global.localStorage) {
    global.localStorage.clear();
  }
  
  // Reset global window properties
  delete global.window.app;
  delete global.window.versionManager;
  delete global.window.NotificationManager;
});

// Global mocks that are commonly needed across tests
global.localStorage = {
  store: new Map(),
  getItem: jest.fn((key) => global.localStorage.store.get(key) || null),
  setItem: jest.fn((key, value) => global.localStorage.store.set(key, value)),
  removeItem: jest.fn((key) => global.localStorage.store.delete(key)),
  clear: jest.fn(() => global.localStorage.store.clear()),
  get length() { return global.localStorage.store.size; },
  key: jest.fn((index) => Array.from(global.localStorage.store.keys())[index] || null)
};

// Mock Electron API
global.window = global.window || {};
global.window.electronAPI = {
  saveProjectFile: jest.fn(),
  loadProjectFile: jest.fn(), 
  listProjects: jest.fn(),
  deleteProjectFile: jest.fn(),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  onMenuAction: jest.fn(),
  onCheckBeforeClose: jest.fn(),
  confirmWindowClose: jest.fn()
};

// Mock common DOM APIs
global.URL = {
  createObjectURL: jest.fn(() => 'mock-blob-url'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn();

// Mock File API
global.FileReader = class {
  readAsText = jest.fn();
  addEventListener = jest.fn();
  result = '';
};

// Mock notification API
global.Notification = {
  permission: 'granted',
  requestPermission: jest.fn(() => Promise.resolve('granted'))
};

// Custom matchers for behavioral testing
expect.extend({
  toHaveClass(received, className) {
    const pass = received && received.classList && received.classList.contains(className);
    return {
      message: () => 
        `expected element ${pass ? 'not ' : ''}to have class "${className}"`,
      pass,
    };
  },
  
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => 
        `expected ${received} ${pass ? 'not ' : ''}to be within range ${floor} - ${ceiling}`,
      pass,
    };
  }
});

// Helper functions for behavioral tests
global.createMockProject = (overrides = {}) => ({
  project: {
    id: 'test-project',
    name: 'Test Project',
    version: '1.0.0',
    created: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
    ...overrides.project
  },
  features: overrides.features || [],
  phases: overrides.phases || {},
  coverage: overrides.coverage || 0,
  config: overrides.config || {
    suppliers: [],
    internalResources: [],
    categories: [],
    calculationParams: {},
    projectOverrides: {
      suppliers: [],
      internalResources: [], 
      categories: [],
      calculationParams: {}
    }
  },
  versions: overrides.versions || []
});

global.createMockFeature = (overrides = {}) => ({
  id: 'F1',
  description: 'Test Feature',
  category: 'test-category',
  featureType: 'test-type',
  supplier: 'test-supplier',
  realManDays: 10,
  expertise: 100,
  riskMargin: 10,
  manDays: 11,
  notes: 'Test notes',
  created: '2024-01-01T00:00:00Z',
  modified: '2024-01-01T00:00:00Z',
  ...overrides
});

// Suppress expected console warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are expected in behavioral tests
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('electronAPI not available') ||
        message.includes('Element') && message.includes('not found after') ||
        message.includes('Failed to load')) {
      return; // Suppress expected warnings
    }
  }
  originalConsoleWarn.apply(console, args);
};

// Timer mocks for testing delayed operations
jest.useFakeTimers({
  legacyFakeTimers: true
});

// Reset timers after each test
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers({ legacyFakeTimers: true });
});