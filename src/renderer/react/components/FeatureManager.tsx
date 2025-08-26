import React, { useState } from 'react';
import { useFeatures, useProject, useStoreActions } from '../hooks/useStore';
import FeatureTable from './FeatureTable';
import FeatureModal from './FeatureModal';

interface FeatureManagerProps {
  customFilteredFeatures?: any[];
}

const FeatureManager: React.FC<FeatureManagerProps> = ({ customFilteredFeatures }) => {
  const { currentProject } = useProject();
  const { 
    editingFeature, 
    setEditingFeature,
    addFeature,
    updateFeature,
    deleteFeature 
  } = useFeatures();
  
  const { addNotification } = useStoreActions();
  const [modalOpen, setModalOpen] = useState(false);

  // Use custom filtered features if provided, otherwise use all project features
  const displayFeatures = customFilteredFeatures || currentProject?.features || [];

  const handleAddFeature = () => {
    setEditingFeature(null);
    setModalOpen(true);
  };

  const handleEditFeature = (feature: any) => {
    setEditingFeature(feature);
    setModalOpen(true);
  };

  const handleDeleteFeature = (featureId: string) => {
    if (!currentProject?.features) return;
    
    if (window.confirm('Are you sure you want to delete this feature?')) {
      const featureIndex = currentProject.features.findIndex(f => f.id === featureId);
      if (featureIndex >= 0) {
        deleteFeature(featureIndex);
        
        // Feature deletion will trigger parent component to re-filter
        
        // Show notification
        addNotification({
          type: 'success',
          message: `Feature ${featureId} deleted successfully`
        });
      }
    }
  };

  const handleSaveFeature = (featureData: any) => {
    try {
      const now = new Date().toISOString();
      
      if (editingFeature) {
        // Update existing feature
        if (!currentProject?.features) return;
        
        const featureIndex = currentProject.features.findIndex(f => f.id === editingFeature.id);
        if (featureIndex >= 0) {
          const updatedFeature = {
            ...featureData,
            modified: now
          };
          
          updateFeature(featureIndex, updatedFeature);
          
          // Feature update will trigger parent component to re-filter
          
          addNotification({
            type: 'success',
            message: `Feature ${updatedFeature.id} updated successfully`
          });
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
        
        addNotification({
          type: 'success',
          message: `Feature ${newFeature.id} added successfully`
        });
      }
      
      // Close modal
      setModalOpen(false);
      setEditingFeature(null);
      
    } catch (error) {
      console.error('Error saving feature:', error);
      addNotification({
        type: 'error',
        message: 'Failed to save feature'
      });
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingFeature(null);
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
      />

      {modalOpen && (
        <FeatureModal 
          feature={editingFeature}
          onSave={handleSaveFeature}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default FeatureManager;