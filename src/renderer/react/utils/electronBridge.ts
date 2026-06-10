/**
 * Electron Bridge - Typed accessors for window globals
 *
 * Centralizes all access to window.electronAPI, window.appStore,
 * window.app, window.TeamHelpers, window.WorkingDaysCalculator,
 * and window.phasesActions.
 *
 * WHY: The renderer process exposes several globals via preload.js
 * (electronAPI) and legacy JS modules (appStore, app, TeamHelpers, etc.).
 * React/TS code accesses them through scattered `(window as any).X` casts,
 * which is untyped and fragile. This module provides:
 *   1. Interfaces that describe the actual shape of each global.
 *   2. Typed accessor functions with runtime guards.
 *   3. A single import point so refactors only touch one file.
 *
 * PATTERN: Read-only accessors -- no mutations, no caching.
 * Each call reads the current value from `window`, which lets legacy
 * bootstrap code assign globals at any point during startup.
 */

// ---------------------------------------------------------------------------
// ElectronAPI -- shape exposed by src/preload.js via contextBridge
// ---------------------------------------------------------------------------

export interface ElectronAPI {
  // Project file operations
  saveProjectFile: (projectData: unknown) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadProjectFile: (filePath: string) => Promise<unknown>;
  deleteProjectFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  checkFileExists: (filePath: string) => Promise<boolean>;
  listProjects: () => Promise<unknown[]>;

  // Projects folder operations
  getProjectsPath: () => Promise<string>;
  setProjectsPath: (newPath: string) => Promise<{ success: boolean; error?: string }>;
  chooseProjectsFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openProjectsFolder: () => Promise<void>;

  // Settings operations
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

  // Configuration file operations
  createDefaultConfig: (configData: unknown) => Promise<{ success: boolean; error?: string }>;
  updateDefaultConfig: (configData: unknown) => Promise<{ success: boolean; error?: string }>;

  // Resource Allocations (global capacity/allocations.json)
  loadResourceAllocations: () => Promise<unknown[]>;
  saveResourceAllocations: (allocations: unknown[]) => Promise<{ success: boolean; error?: string }>;

  // Menu actions
  onMenuAction: (callback: (event: unknown, action: string) => void) => void;

  // Application close handling
  onCheckBeforeClose: (callback: (event: unknown) => void) => void;
  confirmWindowClose: (canClose: boolean) => Promise<void>;

  // File operations (legacy export helpers)
  saveFile: (defaultPath: string, data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  openFile: () => Promise<string | null>;

  // Excel export
  saveExcelFile: (filename: string, data: unknown) => Promise<{ success: boolean; error?: string }>;
  exportTicketReport: (exportData: unknown) => Promise<{ success: boolean; error?: string }>;
  exportResourceOverview: (exportData: unknown) => Promise<{ success: boolean; error?: string }>;

  // Window controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  setWindowTitle: (title: string) => Promise<{ success: boolean; error?: string }>;

  // Optional / added later -- may not exist in all builds
  saveFileBuffer?: (filePath: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
  saveFileToPath?: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  clearAllProjectData?: () => Promise<{ success: boolean; error?: string }>;
}

// ---------------------------------------------------------------------------
// AppStoreInstance -- the Zustand vanilla store on window.appStore
// ---------------------------------------------------------------------------

/**
 * Minimal typed surface for the Zustand vanilla store.
 *
 * The full state shape lives in app-store.js (plain JS, not typed yet).
 * This interface covers only the accessors that bridge code and React
 * actions actually invoke. Extend as slices get migrated to TS.
 */
export interface AppStoreState {
  // Project
  currentProject: Record<string, unknown> | null;
  isDirty: boolean;
  lastSavedTime: string | null;

  // UI
  currentPage: string;
  currentSection: string;

  // Global config
  globalConfig: Record<string, unknown> | null;

  // Resource allocations
  resourceAllocations: unknown[];

  // Mutators (subset -- add as needed)
  setProject: (project: unknown) => void;
  markDirty: () => void;
  setGlobalConfig: (config: unknown) => void;
  setResourceAllocations: (allocations: unknown[]) => void;
  addProjectFeature: (feature: unknown) => void;

  [key: string]: unknown; // escape hatch for untyped slices
}

export interface AppStoreInstance {
  getState: () => AppStoreState;
  setState: (partial: Partial<AppStoreState> | ((state: AppStoreState) => Partial<AppStoreState>)) => void;
  subscribe: (listener: (state: AppStoreState, prevState: AppStoreState) => void) => () => void;
}

// ---------------------------------------------------------------------------
// NavigationManager -- window.app.navigationManager
// ---------------------------------------------------------------------------

export interface NavigationManager {
  updateProjectSubSections: () => void;
  updateProjectStatus: () => void;
  navigateTo?: (section: string) => void;
  testSidebar?: () => void;
}

// ---------------------------------------------------------------------------
// ConfigManager -- window.app.configManager / window.app.managers.config
// ---------------------------------------------------------------------------

export interface VendorRate {
  seniority: string;
  officialRate: number;
  realRate: number;
}

export interface JobCluster {
  id: string;
  role?: string;
  rates?: VendorRate[];
}

export interface Vendor {
  id: string;
  name: string;
  jobClusters?: JobCluster[];
}

export interface ConfigManager {
  getVendors: () => Vendor[];
  getRate: (options: { vendorId: string; jobCluster: string; seniority: string }) => VendorRate | null;
  getVendorById: (id: string) => Vendor | undefined;
  globalConfig: Record<string, unknown>;
  initializeProjectConfig?: () => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// DataManager -- window.app.managers.data
// ---------------------------------------------------------------------------

export interface DataManager {
  saveAllocations: (allocations: unknown) => Promise<{ success: boolean }>;
  loadAllocations: () => Promise<unknown[]>;
  saveProject: (project: unknown) => Promise<{ success: boolean }>;
  loadProject: (filePath?: string) => Promise<unknown | null>;
  listProjects: () => Promise<unknown[]>;
  saveResourceAllocations?: (allocations: unknown) => Promise<{ success: boolean }>;
  loadResourceAllocations?: () => Promise<unknown[]>;
}

// ---------------------------------------------------------------------------
// ApplicationController -- window.app
// ---------------------------------------------------------------------------

export interface ApplicationController {
  navigationManager: NavigationManager;
  configManager: ConfigManager | null;
  managers: {
    data: DataManager | null;
    feature: unknown | null;
    config: ConfigManager | null;
    navigation?: NavigationManager;
    notification?: { show: (message: string, type?: string, options?: Record<string, unknown>) => void };
    modal?: unknown;
    project?: unknown;
    defaultConfig?: unknown;
    teams?: unknown;
    configurationUI?: unknown;
  };
  store?: AppStoreInstance;
  dataManager?: DataManager;
  exportAllProjects?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// TeamHelpers -- window.TeamHelpers
// ---------------------------------------------------------------------------

export interface TeamMemberInfo {
  id: string;
  name: string;
  surname?: string;
  email?: string;
  role?: string;
  vendorId?: string;
  country?: string;
  capacity?: number;
  vacationDays?: string[];
  dailyRate?: number;
  [key: string]: unknown;
}

export interface TeamInfo {
  id: string;
  name: string;
  members: TeamMemberInfo[];
}

export interface TeamHelpers {
  getAllTeamMembers: () => TeamMemberInfo[];
  getTeamMemberById: (memberId: string) => TeamMemberInfo | null;
  getTeamMembersByVendor: (vendorId: string) => TeamMemberInfo[];
  getTeamMembersByVendorType: (vendorType: string) => TeamMemberInfo[];
  getTeamMembersByRole: (role: string) => TeamMemberInfo[];
  getTeamForMember: (memberId: string) => TeamInfo | null;
  getTeamMemberCapacity: (memberId: string) => number;
  getTeamMemberFullName: (memberId: string) => string;
  searchTeamMembers: (query: string) => TeamMemberInfo[];
  getVendorNameForMember: (memberId: string) => string;
  getAllRoles: () => string[];
  getAllVendors: () => string[];
  teamMemberExists: (memberId: string) => boolean;
  getTeamMembersCount: () => number;
  getTeamMemberEmail: (memberId: string) => string | null;
}

// ---------------------------------------------------------------------------
// WorkingDaysCalculator -- window.WorkingDaysCalculator (instance, not class)
// ---------------------------------------------------------------------------

export interface WorkingDaysCalculator {
  calculateWorkingDays: (month: number, year: number, country?: string) => number;
  calculateAvailableCapacity: (
    teamMember: TeamMemberInfo,
    monthString: string,
    startDate?: string | null,
    excludeExistingAllocations?: boolean,
    phaseEndDate?: string | null
  ) => number;
  calculateWorkingDaysBetween: (startDate: string | Date, endDate: string | Date) => number;
  isNationalHoliday: (date: Date, country?: string) => boolean;
  setExistingAllocations: (teamMemberId: string, month: string, allocatedMDs: number) => void;
  clearCache: () => void;
}

// ---------------------------------------------------------------------------
// PhasesActions -- window.phasesActions
// ---------------------------------------------------------------------------

export interface ResourceCosts {
  G1: number;
  G2: number;
  TA: number;
  PM: number;
}

export interface PhasesActionsGlobal {
  calculateCostByResourceForPhase: (phase: unknown) => ResourceCosts;
  savePhases?: () => Promise<void>;
  calculateTotals?: () => void;
}

// ---------------------------------------------------------------------------
// ProjectActions -- window.projectActions
// ---------------------------------------------------------------------------

export interface ProjectActionsGlobal {
  updateWindowTitle: (project?: unknown) => void;
  resetWindowTitle: () => void;
}

// ---------------------------------------------------------------------------
// Typed accessor functions
// ---------------------------------------------------------------------------

/**
 * Get the Electron API exposed by preload.js.
 * Returns `null` when running outside Electron (e.g. in tests).
 */
export function getElectronAPI(): ElectronAPI | null {
  return ((window as unknown as Record<string, unknown>).electronAPI as ElectronAPI) ?? null;
}

/**
 * Get the Zustand vanilla store instance.
 * Returns `null` before the store script has been loaded.
 */
export function getAppStore(): AppStoreInstance | null {
  return ((window as unknown as Record<string, unknown>).appStore as AppStoreInstance) ?? null;
}

/**
 * Get the ApplicationController singleton (`window.app`).
 * Returns `null` before the controller has been initialised.
 */
export function getApp(): ApplicationController | null {
  return ((window as unknown as Record<string, unknown>).app as ApplicationController) ?? null;
}

/**
 * Get the TeamHelpers utility object.
 * Returns `null` before team-helpers.js has been loaded.
 */
export function getTeamHelpers(): TeamHelpers | null {
  return ((window as unknown as Record<string, unknown>).TeamHelpers as TeamHelpers) ?? null;
}

/**
 * Get the WorkingDaysCalculator instance.
 *
 * NOTE: `window.WorkingDaysCalculator` starts as the *class* and is
 * replaced with an *instance* during ApplicationController.initializeCoreManagers().
 * This accessor returns `null` if the value is still a constructor function.
 */
export function getWorkingDaysCalculator(): WorkingDaysCalculator | null {
  const value = (window as unknown as Record<string, unknown>).WorkingDaysCalculator;
  if (!value || typeof value === 'function') {
    // Still the class, not yet instantiated
    return null;
  }
  return value as WorkingDaysCalculator;
}

/**
 * Get the global phasesActions object.
 * Returns `null` before PhasesActions has been registered on window.
 */
export function getPhasesActions(): PhasesActionsGlobal | null {
  return ((window as unknown as Record<string, unknown>).phasesActions as PhasesActionsGlobal) ?? null;
}

/**
 * Get the global projectActions object.
 * Returns `null` before ProjectActions has been registered on window.
 */
export function getProjectActions(): ProjectActionsGlobal | null {
  return ((window as unknown as Record<string, unknown>).projectActions as ProjectActionsGlobal) ?? null;
}

/**
 * Get the ConfigManager from the app controller.
 * Convenience shortcut for `getApp()?.managers?.config`.
 */
export function getConfigManager(): ConfigManager | null {
  const app = getApp();
  return app?.managers?.config ?? app?.configManager ?? null;
}

/**
 * Get the DataManager from the app controller.
 * Convenience shortcut for `getApp()?.managers?.data`.
 */
export function getDataManager(): DataManager | null {
  return getApp()?.managers?.data ?? null;
}

/**
 * Get the NavigationManager from the app controller.
 * Convenience shortcut for `getApp()?.navigationManager`.
 */
export function getNavigationManager(): NavigationManager | null {
  return getApp()?.navigationManager ?? null;
}
