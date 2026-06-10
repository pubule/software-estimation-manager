// src/renderer/react/utils/electronBridge.ts

export interface ElectronAPI {
  saveProjectFile: (projectData: any) => Promise<{ success: boolean; filePath?: string }>;
  loadProjectFile: (filePath: string) => Promise<{ success: boolean; data?: any }>;
  deleteProjectFile: (filePath: string) => Promise<{ success: boolean }>;
  checkFileExists: (filePath: string) => Promise<{ exists: boolean }>;
  listProjects: () => Promise<{ success: boolean; projects: any[] }>;
  getProjectsPath: () => Promise<{ path: string }>;
  setProjectsPath: (newPath: string) => Promise<{ success: boolean; path: string }>;
  chooseProjectsFolder: () => Promise<{ success: boolean; path?: string }>;
  openProjectsFolder: () => Promise<{ success: boolean }>;
  getSettings: () => Promise<{ success: boolean; settings: any }>;
  saveSettings: (settings: any) => Promise<{ success: boolean }>;
  createDefaultConfig: (configData: any) => Promise<{ success: boolean; filePath?: string }>;
  updateDefaultConfig: (configData: any) => Promise<{ success: boolean; filePath?: string }>;
  loadResourceAllocations: () => Promise<{ success: boolean; data: any[] }>;
  saveResourceAllocations: (allocations: any) => Promise<{ success: boolean; filePath?: string }>;
  onMenuAction: (callback: (...args: any[]) => void) => void;
  onCheckBeforeClose: (callback: (...args: any[]) => void) => void;
  confirmWindowClose: (canClose: boolean) => Promise<void>;
  saveFile: (defaultPath: string, data: any) => Promise<{ success: boolean; filePath?: string }>;
  openFile: () => Promise<any>;
  saveExcelFile: (filename: string, data: any) => Promise<{ success: boolean; filename?: string; path?: string }>;
  exportTicketReport: (exportData: any) => Promise<{ success: boolean }>;
  exportResourceOverview: (exportData: any) => Promise<{ success: boolean }>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  setWindowTitle: (title: string) => Promise<void>;
}

interface AppStoreInstance {
  getState: () => any;
  subscribe: (listener: (state: any) => void) => () => void;
}

interface NavigationManager {
  updateProjectSubSections: () => void;
  updateProjectStatus: () => void;
}

interface ConfigManager {
  getVendors: () => any[];
  getRate: (options: { vendorId: string; jobCluster: string; seniority: string }) => any;
  getVendorById: (id: string) => any;
  globalConfig: any;
}

interface ApplicationController {
  navigationManager: NavigationManager;
  configManager: ConfigManager | null;
  managers: {
    data: any;
    feature: any;
    config: ConfigManager | null;
  };
}

export function getElectronAPI(): ElectronAPI {
  return (window as any).electronAPI;
}

export function getAppStore(): AppStoreInstance {
  return (window as any).appStore;
}

export function getApp(): ApplicationController {
  return (window as any).app;
}

export function getTeamHelpers(): { getAllTeamMembers: () => any[] } {
  return (window as any).TeamHelpers;
}

export function getWorkingDaysCalculator(): any {
  return (window as any).WorkingDaysCalculator;
}

export function getPhasesActions(): { calculateCostByResourceForPhase: (...args: any[]) => any } {
  return (window as any).phasesActions;
}
