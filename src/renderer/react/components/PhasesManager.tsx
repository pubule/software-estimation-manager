import React, { useEffect, useState } from 'react';
import { useProject } from '../hooks/useStore';
import { useStore } from '../hooks/useStore';
import { usePhasesActions } from '../hooks/usePhasesActions';
import DevelopmentNotice from './DevelopmentNotice';
import SupplierSelectors from './SupplierSelectors';
import PhasesTable from './PhasesTable';

interface PhasesManagerProps {
  className?: string;
}

const PhasesManager: React.FC<PhasesManagerProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { currentProject } = useProject();
  
  // Get phases state from store
  const { 
    currentPhases, 
    selectedSuppliers, 
    resourceRates, 
    availableSuppliers, 
    phasesTotals 
  } = useStore(state => ({
    currentPhases: state.currentPhases,
    selectedSuppliers: state.selectedSuppliers,
    resourceRates: state.resourceRates,
    availableSuppliers: state.availableSuppliers,
    phasesTotals: state.phasesTotals
  }));
  
  const { 
    loadPhaseData,
    updatePhaseManDays,
    updatePhaseEffort,
    setSelectedSupplier,
    calculateDevelopmentPhase,
    calculateTotals,
    showSuccessNotification,
    showErrorNotification
  } = usePhasesActions();

  // Load phases data when component mounts or project changes
  useEffect(() => {
    if (currentProject) {
      setIsLoading(true);
      loadPhaseData()
        .then(() => {
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to load phases data:', error);
          showErrorNotification('Failed to load phases data');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [currentProject, loadPhaseData, showErrorNotification]);

  // Recalculate development phase when features change
  useEffect(() => {
    if (currentProject?.features) {
      calculateDevelopmentPhase();
    }
  }, [currentProject?.features, currentProject?.coverage, calculateDevelopmentPhase]);

  // Recalculate totals when phases or rates change
  useEffect(() => {
    calculateTotals();
  }, [currentPhases, resourceRates, calculateTotals]);

  const handlePhaseManDaysChange = async (phaseId: string, manDays: number) => {
    try {
      await updatePhaseManDays(phaseId, manDays);
    } catch (error) {
      console.error('Failed to update phase man days:', error);
      showErrorNotification('Failed to update phase man days');
    }
  };

  const handlePhaseEffortChange = async (phaseId: string, resourceType: string, percentage: number) => {
    try {
      await updatePhaseEffort(phaseId, resourceType, percentage);
    } catch (error) {
      console.error('Failed to update phase effort:', error);
      showErrorNotification('Failed to update phase effort');
    }
  };

  const handleSupplierChange = async (resourceType: string, supplierId: string) => {
    try {
      await setSelectedSupplier(resourceType, supplierId);
      showSuccessNotification(`Updated ${resourceType} supplier`);
    } catch (error) {
      console.error('Failed to set supplier:', error);
      showErrorNotification('Failed to update supplier');
    }
  };


  if (!currentProject) {
    return (
      <div className={`phases-manager ${className}`}>
        <div className="phases-no-project">
          <p>No project loaded. Please create or load a project to configure phases.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`phases-manager ${className}`}>
        <div className="phases-loading">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
          <p>Loading phases configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`phases-manager ${className}`}>
      <div className="phases-configuration">
        <div className="phases-header">
          <h2><i className="fas fa-project-diagram"></i> Project Phases Configuration</h2>
          <p className="phases-description">
            Configure effort distribution and costs for each project phase across different resource types.
          </p>
        </div>

        <DevelopmentNotice 
          featuresCount={currentProject.features?.length || 0}
          developmentPhase={currentPhases.find(p => p.id === 'development')}
          coverage={parseFloat(currentProject.coverage as string) || 0}
        />

        <div className="phases-controls">
          <SupplierSelectors
            selectedSuppliers={selectedSuppliers}
            availableSuppliers={availableSuppliers}
            onSupplierChange={handleSupplierChange}
          />
        </div>

        <PhasesTable
          phases={currentPhases}
          resourceRates={resourceRates}
          totals={phasesTotals}
          onManDaysChange={handlePhaseManDaysChange}
          onEffortChange={handlePhaseEffortChange}
        />
      </div>
    </div>
  );
};

export default PhasesManager;