import React from 'react';
import Button from './Button';

interface FeaturesPageHeaderProps {
  onAddFeature: () => void;
}

const FeaturesPageHeader: React.FC<FeaturesPageHeaderProps> = ({ onAddFeature }) => {
  return (
    <div className="page-header">
      <h2>Features Management</h2>
      <div className="page-actions">
        <Button
          variant="primary"
          onClick={onAddFeature}
          icon={<i className="fas fa-plus" />}
        >
          Add Feature
        </Button>
      </div>
    </div>
  );
};

export default FeaturesPageHeader;