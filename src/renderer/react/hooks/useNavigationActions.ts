/**
 * Custom hook for navigation actions - Following React patterns  
 * Provides clean interface for React components to interact with navigation operations
 * PATTERN: State/Actions/Dispatcher - Hook layer for Actions access
 */

import { useCallback } from 'react';
import { NavigationActions } from '../actions/NavigationActions';
import { useStore } from './useStore';

// Create singleton instance following the existing pattern
const navigationActions = new NavigationActions();

export const useNavigationActions = () => {
  // Access notification system from store if needed
  const { addNotification } = useStore(state => ({
    addNotification: state.addNotification
  }));

  const navigateTo = useCallback(async (section: string) => {
    try {
      await navigationActions.navigateTo(section);
    } catch (error) {
      throw error;
    }
  }, []);

  const preserveState = useCallback(async (section: string, state: any) => {
    try {
      await navigationActions.preserveState(section, state);
    } catch (error) {
      throw error;
    }
  }, []);

  const restoreState = useCallback(async (section: string) => {
    try {
      return await navigationActions.restoreState(section);
    } catch (error) {
      throw error;
    }
  }, []);

  const setComponentInitialized = useCallback((component: string, initialized: boolean) => {
    try {
      navigationActions.setComponentInitialized(component, initialized);
    } catch (error) {
      throw error;
    }
  }, []);

  // Notification helpers consistent with other hooks
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

  return {
    // Core navigation operations
    navigateTo,
    preserveState,
    restoreState,
    setComponentInitialized,
    
    // Notification helpers
    showSuccessNotification,
    showErrorNotification
  };
};

export default useNavigationActions;