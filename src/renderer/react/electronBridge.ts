/**
 * electronBridge.ts - Typed accessors for window globals
 *
 * Centralizes all (window as any) access behind typed functions.
 * Legacy JS code exposes globals on window (appStore, app, electronAPI,
 * CapacityActions, TeamHelpers, WorkingDaysCalculator). React components
 * should import from this module instead of casting window directly.
 *
 * Each accessor is a function (not a constant) because the globals are
 * assigned asynchronously by legacy boot code and may not exist at
 * import time.
 */

// ---------------------------------------------------------------------------
// Type definitions for window globals
// ---------------------------------------------------------------------------

/** Subset of the Zustand store API used by components */
export interface AppStore {
  getState: () => AppStoreState;
  subscribe: (listener: (state: AppStoreState) => void) => () => void;
}

export interface AppStoreState {
  setComponentInitialized: (component: string, initialized: boolean) => void;
  [key: string]: any;
}

/** Subset of the legacy app controller used by components */
export interface AppController {
  dataManager?: {
    currentProjectPath?: string;
    [key: string]: any;
  };
  managers?: {
    config?: ConfigManager;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ConfigManager {
  getVendors: () => any[];
  [key: string]: any;
}

/** Electron preload API exposed via contextBridge */
export interface ElectronAPI {
  saveProjectFile: (projectData: any) => Promise<any>;
  loadProjectFile: (filePath: string) => Promise<any>;
  deleteProjectFile: (filePath: string) => Promise<any>;
  checkFileExists: (filePath: string) => Promise<any>;
  listProjects: () => Promise<any>;
  getProjectsPath: () => Promise<string>;
  setProjectsPath: (newPath: string) => Promise<any>;
  chooseProjectsFolder: () => Promise<any>;
  openProjectsFolder: () => Promise<any>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<any>;
  createDefaultConfig: (configData: any) => Promise<any>;
  updateDefaultConfig: (configData: any) => Promise<any>;
  loadResourceAllocations: () => Promise<any>;
  saveResourceAllocations: (allocations: any) => Promise<any>;
  onMenuAction: (callback: (...args: any[]) => void) => void;
  onCheckBeforeClose: (callback: (...args: any[]) => void) => void;
  confirmWindowClose: (canClose: boolean) => Promise<any>;
  saveFile: (defaultPath: string, data: string) => Promise<any>;
  openFile: () => Promise<any>;
  saveExcelFile: (filename: string, data: any) => Promise<any>;
  exportTicketReport: (exportData: any) => Promise<any>;
  exportResourceOverview: (exportData: any) => Promise<{ success: boolean; filename?: string; error?: string }>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  setWindowTitle: (title: string) => Promise<any>;
}

/** CapacityActions class exposed on window by legacy boot code */
export interface CapacityActionsClass {
  new (): CapacityActionsInstance;
}

export interface CapacityActionsInstance {
  calculateAvailableCapacity: (memberId: string, monthString: string) => any;
  [key: string]: any;
}

/** TeamHelpers singleton exposed on window */
export interface TeamHelpersAPI {
  getAllTeamMembers: () => any[];
  [key: string]: any;
}

/** WorkingDaysCalculator exposed on window (may be constructor or instance) */
export interface WorkingDaysCalculatorInstance {
  isNationalHoliday: (date: Date, countryCode: string) => boolean;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Typed accessor functions
// ---------------------------------------------------------------------------

/**
 * Get the global Zustand appStore.
 * Returns null if the store has not been initialized yet.
 */
export function getAppStore(): AppStore | null {
  return (window as any).appStore ?? null;
}

/**
 * Get the legacy application controller (window.app).
 * Returns null if the app has not been initialized yet.
 */
export function getAppController(): AppController | null {
  return (window as any).app ?? null;
}

/**
 * Get the Electron preload API (window.electronAPI).
 * Returns null when running outside Electron or before preload executes.
 */
export function getElectronAPI(): ElectronAPI | null {
  return (window as any).electronAPI ?? null;
}

/**
 * Get the CapacityActions constructor from window.
 * Returns null if not yet loaded by legacy boot code.
 */
export function getCapacityActionsClass(): CapacityActionsClass | null {
  return (window as any).CapacityActions ?? null;
}

/**
 * Get the TeamHelpers singleton from window.
 * Returns null if not yet loaded by legacy boot code.
 */
export function getTeamHelpers(): TeamHelpersAPI | null {
  return (window as any).TeamHelpers ?? null;
}

/**
 * Get the WorkingDaysCalculator from window.
 * May be a constructor (function) or a pre-instantiated object depending
 * on whether application-controller.js has run its init sequence.
 * Returns null if not yet loaded.
 */
export function getWorkingDaysCalculator(): WorkingDaysCalculatorInstance | (new () => WorkingDaysCalculatorInstance) | null {
  return (window as any).WorkingDaysCalculator ?? null;
}
