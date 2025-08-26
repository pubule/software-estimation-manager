import React, { useState, useEffect } from 'react';
import { useFeatureActions } from '../hooks/useFeatureActions';
import { useStore } from '../hooks/useStore';

interface FeaturesSummaryProps {
  filteredFeatures: any[];
}

const FeaturesSummary: React.FC<FeaturesSummaryProps> = ({ filteredFeatures }) => {
  const { calculateSummary, updateCoverage, resetCoverage } = useFeatureActions();
  const { currentProject } = useStore(state => ({
    currentProject: state.currentProject
  }));
  
  const [coverageValue, setCoverageValue] = useState<number>(0);

  // Calculate summary statistics
  const summary = calculateSummary(filteredFeatures);

  // Initialize coverage value from project
  useEffect(() => {
    if (currentProject?.coverage?.manDays !== undefined) {
      setCoverageValue(currentProject.coverage.manDays);
    } else {
      // Auto-calculate 30% if not set
      const autoCalculated = summary.totalManDays * 0.3;
      setCoverageValue(autoCalculated);
    }
  }, [currentProject?.coverage?.manDays, summary.totalManDays]);

  const handleCoverageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    setCoverageValue(newValue);
  };

  const handleCoverageBlur = async () => {
    try {
      await updateCoverage(coverageValue);
    } catch (error) {
      console.error('Failed to update coverage:', error);
    }
  };

  const handleCoverageReset = async () => {
    try {
      await resetCoverage();
      // Coverage will be updated through the useEffect when project changes
    } catch (error) {
      console.error('Failed to reset coverage:', error);
    }
  };

  const handleCoverageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCoverageBlur();
    }
  };

  return (
    <div className="summary-bar">
      <div className="summary-item">
        <label>Total Features:</label>
        <span>{summary.totalFeatures}</span>
      </div>
      
      <div className="summary-item">
        <label>Total Man Days:</label>
        <span>{summary.totalManDays.toFixed(1)}</span>
      </div>
      
      <div className="summary-item">
        <label>Average per Feature:</label>
        <span>{summary.averageManDays.toFixed(1)}</span>
      </div>
      
      <div className="summary-item">
        <label>Filtered Man Days:</label>
        <span>{summary.filteredManDays.toFixed(1)}</span>
      </div>
      
      <div className="summary-item coverage-item">
        <label>Coverage:</label>
        <div className="coverage-controls">
          <input 
            type="number" 
            value={coverageValue}
            onChange={handleCoverageChange}
            onBlur={handleCoverageBlur}
            onKeyPress={handleCoverageKeyPress}
            min="0" 
            step="0.1" 
            className="coverage-input"
          />
          <button 
            type="button" 
            onClick={handleCoverageReset}
            className="coverage-reset-btn" 
            title="Reset to 30% of Total Man Days"
          >
            <i className="fas fa-undo"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturesSummary;