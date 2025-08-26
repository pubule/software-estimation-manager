/**
 * Custom hook for feature actions - Following React patterns
 * Provides clean interface for React components to interact with feature operations
 */

import { useCallback } from 'react';
import { featureActions, FeatureFormData, FeatureFilters } from '../actions/FeatureActions';

export const useFeatureActions = () => {
  const addFeature = useCallback(async (featureData: FeatureFormData) => {
    try {
      await featureActions.addFeature(featureData);
    } catch (error) {
      // Error is already logged in actions, just re-throw for component handling
      throw error;
    }
  }, []);

  const updateFeature = useCallback(async (featureIndex: number, featureData: FeatureFormData) => {
    try {
      await featureActions.updateFeature(featureIndex, featureData);
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteFeature = useCallback(async (featureIndex: number) => {
    try {
      await featureActions.deleteFeature(featureIndex);
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

  const updateCoverage = useCallback(async (coverageValue: number) => {
    try {
      await featureActions.updateCoverage(coverageValue);
    } catch (error) {
      throw error;
    }
  }, []);

  const resetCoverage = useCallback(async () => {
    try {
      await featureActions.resetCoverage();
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
    getFilterOptions
  };
};