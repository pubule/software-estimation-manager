const { createStore } = require('zustand/vanilla');
const WorkingDaysCalculator = require('../../../src/renderer/js/components/working-days-calculator.js');

function setupWindowMock() {
  if (typeof global.window === 'undefined') {
    global.window = {};
  }

  global.window.zustand = { createStore };

  global.window.app = {
    navigationManager: {
      updateProjectSubSections: () => {},
      updateProjectStatus: () => {},
    },
    configManager: null,
    managers: {
      data: {
        saveAllocations: async () => ({ success: true }),
        loadAllocations: async () => ([]),
        saveProject: async () => ({ success: true }),
        loadProject: async () => null,
        listProjects: async () => ([]),
      },
      feature: null,
      config: null,
    },
  };

  // Full electronAPI mock matching preload.js surface (all 27 methods)
  // plus additional methods referenced in source code (3 extra)
  global.window.electronAPI = {
    // Project file operations
    saveProjectFile: async () => ({ success: true }),
    loadProjectFile: async () => null,
    deleteProjectFile: async () => ({ success: true }),
    checkFileExists: async () => false,
    listProjects: async () => ([]),

    // Projects folder operations
    getProjectsPath: async () => '/tmp/test-projects',
    setProjectsPath: async () => ({ success: true }),
    chooseProjectsFolder: async () => ({ success: true, path: '/tmp/test-projects' }),
    openProjectsFolder: async () => ({ success: true }),

    // Settings operations
    getSettings: async () => ({}),
    saveSettings: async () => ({ success: true }),

    // Configuration file operations
    createDefaultConfig: async () => ({ success: true }),
    updateDefaultConfig: async () => ({ success: true }),

    // Resource Allocations
    loadResourceAllocations: async () => ([]),
    saveResourceAllocations: async () => ({ success: true }),

    // Menu actions
    onMenuAction: () => {},

    // Application close handling
    onCheckBeforeClose: () => {},
    confirmWindowClose: async () => ({ success: true }),

    // File operations (legacy for export)
    saveFile: async () => ({ success: true }),
    openFile: async () => null,

    // Excel export file operations
    saveExcelFile: async () => ({ success: true }),
    exportTicketReport: async () => ({ success: true }),
    exportResourceOverview: async () => ({ success: true }),

    // Window controls
    minimize: async () => {},
    maximize: async () => {},
    close: async () => {},
    setWindowTitle: async () => {},

    // Additional methods referenced in source but not in preload.js
    clearAllProjectData: async () => ({ success: true }),
    saveFileBuffer: async () => ({ success: true }),
    saveFileToPath: async () => ({ success: true }),
  };

  // TeamHelpers mock - mirrors window.TeamHelpers from team-helpers.js
  // All 15 helper functions with safe default return values
  global.window.TeamHelpers = {
    getAllTeamMembers: () => [],
    getTeamMemberById: () => null,
    getTeamMembersByVendor: () => [],
    getTeamMembersByVendorType: () => [],
    getTeamMembersByRole: () => [],
    getTeamForMember: () => null,
    getTeamMemberCapacity: () => 22,
    getTeamMemberFullName: () => 'Unknown',
    searchTeamMembers: () => [],
    getVendorNameForMember: () => 'Unknown',
    getAllRoles: () => [],
    getAllVendors: () => [],
    teamMemberExists: () => false,
    getTeamMembersCount: () => 0,
    getTeamMemberEmail: () => null,
  };

  // WorkingDaysCalculator - expose the real class for accurate calculations in tests
  global.window.WorkingDaysCalculator = WorkingDaysCalculator;

  global.window.phasesActions = {
    calculateCostByResourceForPhase: () => ({ G1: 0, G2: 0, TA: 0, PM: 0 }),
  };

  global.window.projectActions = {
    updateWindowTitle: () => {},
    resetWindowTitle: () => {},
  };

  global.window.forceUpdateMenu = () => {};
  global.window.dispatchEvent = () => {};
  global.window.addEventListener = () => {};
  global.window.removeEventListener = () => {};
  global.window.CustomEvent = class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  };
  global.window.confirm = () => true;
  global.window.location = { hostname: 'test', hash: '' };
  global.window.open = () => {};
  global.window.alert = () => {};
  global.window.isSecureContext = false;
  global.window.URL = {
    createObjectURL: () => 'blob:test',
    revokeObjectURL: () => {},
  };

  if (typeof global.document === 'undefined') {
    global.document = {};
  }
  global.document.getElementById = () => null;
  global.document.querySelector = () => null;
  global.document.querySelectorAll = () => [];
  global.document.createElement = () => ({
    setAttribute: () => {},
    click: () => {},
    remove: () => {},
    style: {},
    appendChild: () => {},
  });
  global.document.body = { appendChild: () => {}, removeChild: () => {} };

  if (typeof global.navigator === 'undefined') {
    global.navigator = {};
  }
  global.navigator.clipboard = null;

  if (typeof global.console === 'undefined') {
    global.console = console;
  }

  global.confirm = () => true;
  global.alert = () => {};
}

function loadStore() {
  delete require.cache[require.resolve('../../../src/renderer/js/store/app-store.js')];
  require('../../../src/renderer/js/store/app-store.js');
  return global.window.appStore;
}

function resetStore() {
  const store = loadStore();
  return store;
}

function setConfigManager(configData) {
  const manager = {
    getVendors: () => configData.vendors || [],
    getRate: (options) => {
      const vendor = (configData.vendors || []).find(v => v.id === options.vendorId);
      if (!vendor) return null;
      const jc = (vendor.jobClusters || []).find(j => j.id === options.jobCluster);
      if (!jc) return null;
      const seniorityRate = (jc.rates || []).find(r => r.seniority === options.seniority);
      if (!seniorityRate) return jc.rates?.[0] || { officialRate: 0, realRate: 0 };
      return seniorityRate;
    },
    getVendorById: (id) => (configData.vendors || []).find(v => v.id === id),
    globalConfig: configData,
  };
  global.window.app.configManager = manager;
  global.window.app.managers.config = manager;
  return manager;
}

module.exports = { setupWindowMock, loadStore, resetStore, setConfigManager };
