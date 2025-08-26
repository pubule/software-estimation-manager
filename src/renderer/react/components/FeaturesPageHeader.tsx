import React from 'react';

interface FeaturesPageHeaderProps {
  onAddFeature: () => void;
}

const FeaturesPageHeader: React.FC<FeaturesPageHeaderProps> = ({ onAddFeature }) => {
  return (
    <div className="page-header">
      <h2>Features Management</h2>
      <div className="page-actions">
        <button 
          className="btn btn-primary" 
          onClick={onAddFeature}
        >
          <i className="fas fa-plus"></i> Add Feature
        </button>
      </div>
    </div>
  );
};

export default FeaturesPageHeader;