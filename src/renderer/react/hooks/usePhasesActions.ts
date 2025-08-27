/**
 * Custom hook for phases actions - Following React patterns
 * Provides clean interface for React components to interact with phases operations
 */

import { useCallback } from 'react';
import { phasesActions } from '../actions/PhasesActions';
import { useStore } from './useStore';

export const usePhasesActions = () => {
  // Access to notification actions from store
  const { addNotification } = useStore(state => ({
    addNotification: state.addNotification
  }));

  const loadPhaseData = useCallback(async () => {
    try {
      await phasesActions.loadPhaseData();
    } catch (error) {
      throw error;
    }
  }, []);

  const updatePhaseManDays = useCallback(async (phaseId: string, manDays: number) => {
    try {
      await phasesActions.updatePhaseManDays(phaseId, manDays);
    } catch (error) {
      throw error;
    }
  }, []);

  const updatePhaseEffort = useCallback(async (phaseId: string, resourceType: string, percentage: number) => {
    try {
      await phasesActions.updatePhaseEffort(phaseId, resourceType, percentage);
    } catch (error) {
      throw error;
    }
  }, []);

  const setSelectedSupplier = useCallback(async (resourceType: string, supplierId: string) => {
    try {
      await phasesActions.setSelectedSupplier(resourceType, supplierId);
    } catch (error) {
      throw error;
    }
  }, []);

  const calculateDevelopmentPhase = useCallback(() => {
    try {
      phasesActions.calculateDevelopmentPhase();
    } catch (error) {
      throw error;
    }
  }, []);

  const calculateTotals = useCallback(() => {
    try {
      phasesActions.calculateTotals();
    } catch (error) {
      throw error;
    }
  }, []);

  const savePhases = useCallback(async () => {
    try {
      await phasesActions.savePhases();
    } catch (error) {
      throw error;
    }
  }, []);

  const validateEffortPercentages = useCallback((phaseId: string) => {
    try {
      return phasesActions.validateEffortPercentages(phaseId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getAvailableSuppliersByRole = useCallback((role: string) => {
    try {
      return phasesActions.getAvailableSuppliersByRole(role);
    } catch (error) {
      throw error;
    }
  }, []);

  const calculateCostByResourceForPhase = useCallback((phase: any) => {
    try {
      return phasesActions.calculateCostByResourceForPhase(phase);
    } catch (error) {
      console.error('Failed to calculate cost by resource:', error);
      return { G1: 0, G2: 0, TA: 0, PM: 0 };
    }
  }, []);

  const getDevelopmentNoticeText = useCallback(() => {
    try {
      return phasesActions.getDevelopmentNoticeText();
    } catch (error) {
      throw error;
    }
  }, []);

  // Notification helpers
  const showSuccessNotification = useCallback((message: string) => {
    try {
      addNotification({
        type: 'success',
        title: 'Success',
        message: message,
        duration: 5000,
        actions: []
      });
    } catch (error) {
      console.error('Failed to show success notification:', error);
    }
  }, [addNotification]);

  const showErrorNotification = useCallback((message: string) => {
    try {
      addNotification({
        type: 'error',
        title: 'Error',
        message: message,
        duration: 5000,
        actions: []
      });
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }, [addNotification]);

  const showWarningNotification = useCallback((message: string) => {
    try {
      addNotification({
        type: 'warning',
        title: 'Warning',
        message: message,
        duration: 5000,
        actions: []
      });
    } catch (error) {
      console.error('Failed to show warning notification:', error);
    }
  }, [addNotification]);

  return {
    // Core phase operations
    loadPhaseData,
    updatePhaseManDays,
    updatePhaseEffort,
    setSelectedSupplier,
    calculateDevelopmentPhase,
    calculateTotals,
    savePhases,
    
    // Utility functions
    validateEffortPercentages,
    getAvailableSuppliersByRole,
    calculateCostByResourceForPhase,
    getDevelopmentNoticeText,
    
    // Notification helpers
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification
  };
};

export default usePhasesActions;