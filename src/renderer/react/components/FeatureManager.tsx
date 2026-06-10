import React, { useEffect } from 'react';
import { useProject } from '../hooks/useStore';
import { useStore } from '../hooks/useStore';
import { useFeatureActions } from '../hooks/useFeatureActions';
import FeatureTable from './FeatureTable';
import FeatureModal from './FeatureModal';

interface FeatureManagerProps {
  customFilteredFeatures?: any[];
}

const FeatureManager: React.FC<FeatureManagerProps> = ({ customFilteredFeatures }) => {
  const { currentProject } = useProject();
  
  // Get modal state from store
  const { featureModalOpen, featureModalEditingItem } = useStore(state => ({
    featureModalOpen: state.featureModalOpen,
    featureModalEditingItem: state.featureModalEditingItem
  }));
  
  const { 
    addFeature,
    updateFeature,
    deleteFeature,
    duplicateFeature,
    openEditModal, 
    closeModal,
    showSuccessNotification,
    showErrorNotification
  } = useFeatureActions();

  // Track component initialization in navigation state (Pattern State/Actions/Dispatcher)
  useEffect(() => {
    const store = (window as any).appStore;
    if (store) {
      store.getState().setComponentInitialized('features', true);
      if (import.meta.env.DEV) console.log('FeatureManager: Component initialized and tracked in store');
    }
    
    return () => {
      // Cleanup on unmount
      if (store) {
        store.getState().setComponentInitialized('features', false);
        if (import.meta.env.DEV) console.log('FeatureManager: Component unmounted, tracking cleared');
      }
    };
  }, []);

  // Use custom filtered features if provided, otherwise use all project features
  const displayFeatures = customFilteredFeatures || currentProject?.features || [];

  const handleEditFeature = (feature: any) => {
    openEditModal(feature);
  };

  const handleDuplicateFeature = (feature: any) => {
    duplicateFeature(feature);
  };

  const handleDeleteFeature = (featureId: string) => {
    if (!currentProject?.features) return;
    
    if (window.confirm('Are you sure you want to delete this feature?')) {
      const featureIndex = currentProject.features.findIndex(f => f.id === featureId);
      if (featureIndex >= 0) {
        deleteFeature(featureIndex);
        
        // Feature deletion will trigger parent component to re-filter
        
        // Show notification
        showSuccessNotification(`Feature ${featureId} deleted successfully`);
      }
    }
  };

  const handleSaveFeature = (featureData: any) => {
    try {
      const now = new Date().toISOString();
      
      if (featureModalEditingItem) {
        // Update existing feature
        if (!currentProject?.features) return;
        
        const featureIndex = currentProject.features.findIndex(f => f.id === featureModalEditingItem.id);
        if (featureIndex >= 0) {
          const updatedFeature = {
            ...featureData,
            modified: now
          };
          
          updateFeature(featureIndex, updatedFeature);
          
          // Feature update will trigger parent component to re-filter
          
          showSuccessNotification(`Feature ${updatedFeature.id} updated successfully`);
        }
      } else {
        // Add new feature
        const newFeature = {
          ...featureData,
          created: now,
          modified: now
        };
        
        addFeature(newFeature);
        
        // Feature addition will trigger parent component to re-filter
        
        showSuccessNotification(`Feature ${newFeature.id} added successfully`);
      }
      
      // Close modal
      closeModal();
      
    } catch (error) {
      console.error('Error saving feature:', error);
      showErrorNotification('Failed to save feature');
    }
  };

  const handleCloseModal = () => {
    closeModal();
  };

  if (!currentProject) {
    return (
      <div className="feature-manager-no-project">
        <div className="empty-state">
          <i className="fas fa-folder-open"></i>
          <h3>No Project Loaded</h3>
          <p>Please load or create a project to manage features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-manager">
      <FeatureTable 
        features={displayFeatures}
        onEdit={handleEditFeature}
        onDelete={handleDeleteFeature}
        onDuplicate={handleDuplicateFeature}
      />

      {featureModalOpen && (
        <FeatureModal 
          feature={featureModalEditingItem}
          onSave={handleSaveFeature}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default FeatureManager;