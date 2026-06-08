const { createStore } = require('zustand/vanilla');

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

  global.window.electronAPI = {
    exportTicketReport: async () => ({ success: true }),
    saveFile: async () => ({ success: true }),
    openFile: async () => null,
    showSaveDialog: async () => ({ canceled: false, filePath: '/tmp/test.json' }),
    showOpenDialog: async () => ({ canceled: false, filePaths: ['/tmp/test.json'] }),
  };

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
  global.window.location = { hostname: 'test', hash: '' };
  global.window.open = () => {};
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
