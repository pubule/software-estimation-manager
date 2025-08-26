import React, { useEffect, useState } from 'react';
import { useFeatures, useProject, useStoreActions } from '../hooks/useStore';
import FeatureTable from './FeatureTable';
import FeatureModal from './FeatureModal';

const FeatureManager: React.FC = () => {
  const { currentProject } = useProject();
  const { 
    filteredFeatures, 
    editingFeature, 
    setFilteredFeatures,
    setEditingFeature,
    addFeature,
    updateFeature,
    deleteFeature 
  } = useFeatures();
  
  const { addNotification } = useStoreActions();
  const [modalOpen, setModalOpen] = useState(false);

  // Filter features when project changes
  useEffect(() => {
    if (currentProject?.features) {
      console.log('React FeatureManager: Project changed, updating filtered features');
      setFilteredFeatures(currentProject.features);
    } else {
      setFilteredFeatures([]);
    }
  }, [currentProject?.features, setFilteredFeatures]);

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
        
        // Update filtered features
        const updatedFiltered = filteredFeatures.filter(f => f.id !== featureId);
        setFilteredFeatures(updatedFiltered);
        
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
          
          // Update filtered features
          const updatedFiltered = filteredFeatures.map(f => 
            f.id === editingFeature.id ? updatedFeature : f
          );
          setFilteredFeatures(updatedFiltered);
          
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
        
        // Add to filtered features
        setFilteredFeatures([...filteredFeatures, newFeature]);
        
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
      <div className="feature-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Features:</span>
            <span className="stat-value">{filteredFeatures.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Man Days:</span>
            <span className="stat-value">
              {filteredFeatures.reduce((sum, f) => sum + (f.manDays || 0), 0).toFixed(1)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average per Feature:</span>
            <span className="stat-value">
              {filteredFeatures.length > 0 
                ? (filteredFeatures.reduce((sum, f) => sum + (f.manDays || 0), 0) / filteredFeatures.length).toFixed(1)
                : '0.0'
              }
            </span>
          </div>
        </div>
      </div>

      <FeatureTable 
        features={filteredFeatures}
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