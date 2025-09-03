/**
 * Custom hook for version history actions - Following React patterns
 * Provides clean interface for React components to interact with version history operations
 */

import { useCallback } from 'react';
import { versionHistoryActions } from '../actions/VersionHistoryActions';

export const useVersionHistoryActions = () => {
  // Version CRUD operations
  const createVersion = useCallback(async (reason: string) => {
    try {
      return await versionHistoryActions.createVersion(reason);
    } catch (error) {
      throw error;
    }
  }, []);

  const restoreVersion = useCallback(async (versionId: string) => {
    try {
      return await versionHistoryActions.restoreVersion(versionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteVersion = useCallback(async (versionId: string) => {
    try {
      return await versionHistoryActions.deleteVersion(versionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const exportVersion = useCallback(async (versionId: string) => {
    try {
      return await versionHistoryActions.exportVersion(versionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const importVersion = useCallback(async (versionData: any) => {
    try {
      return await versionHistoryActions.importVersion(versionData);
    } catch (error) {
      throw error;
    }
  }, []);

  // Comparison operations
  const compareVersion = useCallback((versionId: string) => {
    try {
      return versionHistoryActions.compareVersion(versionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const generateComparisonData = useCallback((version: any) => {
    try {
      return versionHistoryActions.generateComparisonData(version);
    } catch (error) {
      throw error;
    }
  }, []);

  // NEW: Enhanced comparison with navigation
  const generateComparisonDataWithNavigation = useCallback((version: any) => {
    try {
      return versionHistoryActions.generateComparisonDataWithNavigation(version);
    } catch (error) {
      throw error;
    }
  }, []);

  // NEW: Version navigation methods
  const navigateToPreviousVersion = useCallback((currentVersionId: string) => {
    try {
      versionHistoryActions.navigateToPreviousVersion(currentVersionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const navigateToNextVersion = useCallback((currentVersionId: string) => {
    try {
      versionHistoryActions.navigateToNextVersion(currentVersionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getVersionContext = useCallback((versionId: string) => {
    try {
      return versionHistoryActions.getVersionContext(versionId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getVersionTimeline = useCallback(() => {
    try {
      return versionHistoryActions.getVersionTimeline();
    } catch (error) {
      throw error;
    }
  }, []);

  // Filtering operations
  const getFilteredVersions = useCallback(() => {
    try {
      return versionHistoryActions.getFilteredVersions();
    } catch (error) {
      throw error;
    }
  }, []);

  const applyFilters = useCallback((filters: any) => {
    try {
      versionHistoryActions.applyFilters(filters);
    } catch (error) {
      throw error;
    }
  }, []);

  const resetFilters = useCallback(() => {
    try {
      versionHistoryActions.resetFilters();
    } catch (error) {
      throw error;
    }
  }, []);

  // Modal operations - Create Version Modal
  const openCreateVersionModal = useCallback(() => {
    try {
      versionHistoryActions.openCreateVersionModal();
    } catch (error) {
      throw error;
    }
  }, []);

  const closeCreateVersionModal = useCallback(() => {
    try {
      versionHistoryActions.closeCreateVersionModal();
    } catch (error) {
      throw error;
    }
  }, []);

  // Modal operations - Compare Modal
  const openCompareModal = useCallback((version: any) => {
    try {
      versionHistoryActions.openCompareModal(version);
    } catch (error) {
      throw error;
    }
  }, []);

  const closeCompareModal = useCallback(() => {
    try {
      versionHistoryActions.closeCompareModal();
    } catch (error) {
      throw error;
    }
  }, []);

  // Modal operations - Restore Modal
  const openRestoreModal = useCallback((version: any) => {
    try {
      versionHistoryActions.openRestoreModal(version);
    } catch (error) {
      throw error;
    }
  }, []);

  const closeRestoreModal = useCallback(() => {
    try {
      versionHistoryActions.closeRestoreModal();
    } catch (error) {
      throw error;
    }
  }, []);

  // Utility operations
  const validateProjectData = useCallback((data: any) => {
    try {
      return versionHistoryActions.validateProjectData(data);
    } catch (error) {
      throw error;
    }
  }, []);

  const calculateChecksum = useCallback((data: any) => {
    try {
      return versionHistoryActions.calculateChecksum(data);
    } catch (error) {
      throw error;
    }
  }, []);

  const verifyDataIntegrity = useCallback((version: any, currentData: any) => {
    try {
      return versionHistoryActions.verifyDataIntegrity(version, currentData);
    } catch (error) {
      throw error;
    }
  }, []);

  // Notification operations
  const showSuccessNotification = useCallback((message: string) => {
    try {
      versionHistoryActions.showSuccessNotification(message);
    } catch (error) {
      throw error;
    }
  }, []);

  const showErrorNotification = useCallback((message: string) => {
    try {
      versionHistoryActions.showErrorNotification(message);
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    // Version CRUD operations
    createVersion,
    restoreVersion,
    deleteVersion,
    exportVersion,
    importVersion,

    // Comparison operations
    compareVersion,
    generateComparisonData,
    generateComparisonDataWithNavigation, // NEW

    // Version navigation operations - NEW
    navigateToPreviousVersion,
    navigateToNextVersion,
    getVersionContext,
    getVersionTimeline,

    // Filtering operations
    getFilteredVersions,
    applyFilters,
    resetFilters,

    // Modal operations - Create Version
    openCreateVersionModal,
    closeCreateVersionModal,

    // Modal operations - Compare
    openCompareModal,
    closeCompareModal,

    // Modal operations - Restore
    openRestoreModal,
    closeRestoreModal,

    // Utility operations
    validateProjectData,
    calculateChecksum,
    verifyDataIntegrity,

    // Notifications
    showSuccessNotification,
    showErrorNotification
  };
};;