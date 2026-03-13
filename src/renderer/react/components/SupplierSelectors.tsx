import React from 'react';

interface ResourceDisplayStrings {
    G1: string;
    G2: string;
    TA: string;
    PM: string;
}

interface SupplierSelectorsProps {
  resourceDisplayStrings: ResourceDisplayStrings;
  onSpecifyRateClick: (resourceType: string) => void;
}

const SupplierSelectors: React.FC<SupplierSelectorsProps> = ({
  resourceDisplayStrings,
  onSpecifyRateClick
}) => {
  const resourceTypes = [
    { key: 'G1', label: 'G1 (Grade 1 Developer)' },
    { key: 'G2', label: 'G2 (Grade 2 Developer)' },
    { key: 'TA', label: 'TA (Technical Analyst)' },
    { key: 'PM', label: 'PM (Project Manager)' }
  ];

  const renderResourceSelector = (resourceType: string, label: string) => {
    const displayString = resourceDisplayStrings[resourceType as keyof ResourceDisplayStrings] || 'Not Specified';
    
    return (
      <div key={resourceType} className="supplier-selector">
        <label htmlFor={`${resourceType.toLowerCase()}-resource`}>
          {label}:
        </label>
        <div className="supplier-control-group">
            <div id={`${resourceType.toLowerCase()}-resource`} className="resource-display">
                {displayString}
            </div>
            <button 
                className="btn btn-small btn-secondary btn-specify-rate"
                onClick={() => onSpecifyRateClick(resourceType)}
                title="Specify full rate details"
            >
                <i className="fas fa-edit"></i>
            </button>
        </div>
        {resourceType === 'G2' && (
          <small className="supplier-note">
            Note: Development phase uses feature-specific suppliers
          </small>
        )}
      </div>
    );
  };

  return (
    <div className="supplier-selectors">
      {resourceTypes.map(({ key, label }) =>
        renderResourceSelector(key, label)
      )}
    </div>
  );
};

export default SupplierSelectors;