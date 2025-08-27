import React from 'react';

interface DevelopmentNoticeProps {
  featuresCount: number;
  developmentPhase?: {
    id: string;
    manDays: number;
  };
  coverage: number;
}

const DevelopmentNotice: React.FC<DevelopmentNoticeProps> = ({ 
  featuresCount, 
  developmentPhase,
  coverage 
}) => {
  const developmentDays = developmentPhase?.manDays || 0;

  return (
    <div className="development-notice">
      <i className="fas fa-info-circle"></i>
      <div>
        <strong>Development Phase:</strong> 
        Man Days are automatically calculated from {featuresCount} features + coverage 
        (Coverage: {coverage.toFixed(1)} days, Total: {developmentDays.toFixed(1)} days). 
        You can configure effort distribution percentages.
      </div>
    </div>
  );
};

export default DevelopmentNotice;