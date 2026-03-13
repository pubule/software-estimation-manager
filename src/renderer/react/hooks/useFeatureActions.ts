/**
 * Custom hook for feature actions - Following React patterns
 * Provides clean interface for React components to interact with feature operations
 */

import { useCallback } from 'react';
import { featureActions, FeatureFormData, FeatureFilters } from '../actions/FeatureActions';

export const useFeatureActions = () => {
  const addFeature = useCallback((featureData: FeatureFormData) => {
    try {
      featureActions.addFeature(featureData);
    } catch (error) {
      // Error is already logged in actions, just re-throw for component handling
      throw error;
    }
  }, []);

  const updateFeature = useCallback((featureIndex: number, featureData: FeatureFormData) => {
    try {
      featureActions.updateFeature(featureIndex, featureData);
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteFeature = useCallback((featureIndex: number) => {
    try {
      featureActions.deleteFeature(featureIndex);
    } catch (error) {
      throw error;
    }
  }, []);

  const filterFeatures = useCallback((features: any[], filters: FeatureFilters): any[] => {
    try {
      return featureActions.filterFeatures(features, filters);
    } catch (error) {
      throw error;
    }
  }, []);

  const calculateSummary = useCallback((features: any[]) => {
    try {
      return featureActions.calculateSummary(features);
    } catch (error) {
      throw error;
    }
  }, []);

  const updateCoverage = useCallback((coverageValue: number, isAutoCalculated?: boolean) => {
    try {
      featureActions.updateCoverage(coverageValue, isAutoCalculated);
    } catch (error) {
      throw error;
    }
  }, []);

  const resetCoverage = useCallback(() => {
    try {
      featureActions.resetCoverage();
    } catch (error) {
      throw error;
    }
  }, []);

  const getFilterOptions = useCallback(async () => {
    try {
      return await featureActions.getFilterOptions();
    } catch (error) {
      throw error;
    }
  }, []);

  const openAddModal = useCallback(() => {
    try {
      featureActions.openAddFeatureModal();
    } catch (error) {
      throw error;
    }
  }, []);

  const openEditModal = useCallback((feature: any) => {
    try {
      featureActions.openEditFeatureModal(feature);
    } catch (error) {
      throw error;
    }
  }, []);

  const closeModal = useCallback(() => {
    try {
      featureActions.closeFeatureModal();
    } catch (error) {
      throw error;
    }
  }, []);

  const duplicateFeature = useCallback((feature: any) => {
    try {
      featureActions.duplicateFeature(feature);
    } catch (error) {
      throw error;
    }
  }, []);

  const generateNextId = useCallback(() => {
    try {
      return featureActions.generateNextFeatureId();
    } catch (error) {
      throw error;
    }
  }, []);

  const getDefaultManDays = useCallback((categoryId: string, featureTypeId: string) => {
    try {
      return featureActions.getDefaultManDays(categoryId, featureTypeId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getFeatureTypesForCategory = useCallback((categoryId: string) => {
    try {
      return featureActions.getFeatureTypesForCategory(categoryId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getCategoryNameById = useCallback((categoryId: string) => {
    try {
      return featureActions.getCategoryNameById(categoryId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getFeatureTypeNameById = useCallback((categoryId: string, featureTypeId: string) => {
    try {
      return featureActions.getFeatureTypeNameById(categoryId, featureTypeId);
    } catch (error) {
      throw error;
    }
  }, []);

  const getFormattedFeatureResourceDisplay = useCallback((feature: any) => {
    try {
      return featureActions.getFormattedFeatureResourceDisplay(feature);
    } catch (error) {
      throw error;
    }
  }, []);

  const showSuccessNotification = useCallback((message: string) => {
    try {
      featureActions.showSuccessNotification(message);
    } catch (error) {
      throw error;
    }
  }, []);

  const showErrorNotification = useCallback((message: string) => {
    try {
      featureActions.showErrorNotification(message);
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    // Feature operations
    addFeature,
    updateFeature,
    deleteFeature,
    
    // Feature filtering and search
    filterFeatures,
    calculateSummary,
    
    // Coverage operations
    updateCoverage,
    resetCoverage,
    
    // Configuration
    getFilterOptions,
    
    // Modal operations
    openAddModal,
    openEditModal,
    closeModal,
    duplicateFeature,
    
    // Modal helpers
    generateNextId,
    getDefaultManDays,
    getFeatureTypesForCategory,
    
    // Display helpers
    getCategoryNameById,
    getFeatureTypeNameById,
    getFormattedFeatureResourceDisplay,
    
    // Notifications
    showSuccessNotification,
    showErrorNotification
  };
};