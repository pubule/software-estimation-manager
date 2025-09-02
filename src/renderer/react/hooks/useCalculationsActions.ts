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

  const applyFilters = useCallback((vendorFilter: string, roleFilter: string, categoryFilter?: string) => {
    try {
      calculationsActions.applyFilters(vendorFilter, roleFilter, categoryFilter);
    } catch (error) {
      throw error;
    }
  }, []);

  const applyCategoryFilter = useCallback((category: 'all' | 'gto' | 'gds') => {
    try {
      calculationsActions.applyCategoryFilter(category);
    } catch (error) {
      throw error;
    }
  }, []);

  const resetSingleFinalMD = useCallback((vendorId: string, role: string, department: string) => {
    try {
      calculationsActions.resetSingleFinalMD(vendorId, role, department);
    } catch (error) {
      throw error;
    }
  }, []);

  const getVendorCountsByCategory = useCallback(() => {
    try {
      return calculationsActions.getVendorCountsByCategory();
    } catch (error) {
      throw error;
    }
  }, []);

  const getFilteredCosts = useCallback(() => {
    try {
      return calculationsActions.getFilteredCosts();
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
    resetSingleFinalMD,
    
    // Filtering
    applyFilters,
    applyCategoryFilter,
    getVendorCountsByCategory,
    getFilteredCosts,
    
    // Export/Share
    shareByEmail,
    copyToClipboard
  };
};