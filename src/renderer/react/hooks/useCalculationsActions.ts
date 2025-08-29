/**
 * useCalculationsActions Hook
 * 
 * Hook per esporre CalculationsActions ai componenti React
 * Segue pattern State/Actions/Dispatcher
 */

import { useCallback } from 'react';
import { calculationsActions } from '../actions/CalculationsActions';

export const useCalculationsActions = () => {
  const calculateProjectCosts = useCallback(() => {
    try {
      calculationsActions.calculateProjectCosts();
    } catch (error) {
      throw error;
    }
  }, []);

  const updateFinalMDs = useCallback((vendorId: string, role: string, department: string, value: number) => {
    try {
      calculationsActions.updateFinalMDs(vendorId, role, department, value);
    } catch (error) {
      throw error;
    }
  }, []);

  const applyFilters = useCallback((vendorFilter: string, roleFilter: string) => {
    try {
      calculationsActions.applyFilters(vendorFilter, roleFilter);
    } catch (error) {
      throw error;
    }
  }, []);

  const shareByEmail = useCallback(() => {
    try {
      calculationsActions.shareByEmail();
    } catch (error) {
      throw error;
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      await calculationsActions.copyToClipboard();
    } catch (error) {
      throw error;
    }
  }, []);

  const resetAllFinalMDs = useCallback(() => {
    try {
      calculationsActions.resetAllFinalMDs();
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    // Core calculations
    calculateProjectCosts,
    
    // Data editing
    updateFinalMDs,
    resetAllFinalMDs,
    
    // Filtering
    applyFilters,
    
    // Export/Share
    shareByEmail,
    copyToClipboard
  };
};