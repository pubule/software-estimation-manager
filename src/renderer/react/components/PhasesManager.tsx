import React, { useEffect, useState } from 'react';
import { useProject } from '../hooks/useStore';
import { useStore } from '../hooks/useStore';
import { usePhasesActions } from '../hooks/usePhasesActions';
import { useNavigationActions } from '../hooks/useNavigationActions';
import { useProjectActions } from '../hooks/useProjectActions';
import DevelopmentNotice from './DevelopmentNotice';
import ApprovalStatusSelector from './ApprovalStatusSelector';
import SupplierSelectors from './SupplierSelectors';
import PhasesTable from './PhasesTable';
import RateSpecificationModal from './RateSpecificationModal';

interface PhasesManagerProps {
  className?: string;
}

const PhasesManager: React.FC<PhasesManagerProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { currentProject } = useProject();

  // PATTERN: State/Actions/Dispatcher - Use hook for navigation actions
  const { setComponentInitialized } = useNavigationActions();

  // Get phases state from store
  const {
    currentPhases,
    selectedPhaseResources,
    resourceRates,
    phasesTotals,
    currentApprovalStatus,
    resourceDisplayStrings
  } = useStore(state => ({
    currentPhases: state.currentPhases,
    selectedPhaseResources: state.selectedPhaseResources,
    resourceRates: state.resourceRates,
    phasesTotals: state.phasesTotals,
    currentApprovalStatus: state.currentProject?.project?.approvalStatus || "Pending Approval",
    resourceDisplayStrings: {
      G1: state.getFormattedPhaseResourceDisplay('G1'),
      G2: state.getFormattedPhaseResourceDisplay('G2'),
      TA: state.getFormattedPhaseResourceDisplay('TA'),
      PM: state.getFormattedPhaseResourceDisplay('PM'),
    }
  }));

  const {
    loadPhaseData,
    updatePhaseManDays,
    updatePhaseEffort,
    calculateDevelopmentPhase,
    calculateTotals,
    showSuccessNotification,
    showErrorNotification,
    updateSelectedPhaseResource,
    openRateSpecModal
  } = usePhasesActions();

  // Get approval status action from custom hook
  const { updateApprovalStatus } = useProjectActions();

  // PATTERN: State/Actions/Dispatcher - NO business logic in component!
  // Track previous project ID to detect real project changes
  const [previousProjectId, setPreviousProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      // Only reload if project ID actually changed (not just metadata like lastModified)
      const projectChanged = currentProject.projectId !== previousProjectId;

      if (projectChanged) {
        setIsLoading(true);
        setPreviousProjectId(currentProject.projectId);

        // PATTERN: Delegate ALL business logic to Actions
        if (import.meta.env.DEV) console.log('PhasesManager: Loading phase data - new project detected');
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
        if (import.meta.env.DEV) console.log('PhasesManager: Skipping reload - only metadata changed');
      }
    } else {
      setIsLoading(false);
      setPreviousProjectId(null);
    }
  }, [currentProject, loadPhaseData, previousProjectId]); // Include all dependencies

  // Track component initialization in navigation state
  useEffect(() => {
    // PATTERN: State/Actions/Dispatcher - Use Actions through hook
    setComponentInitialized('phases', true);

    return () => {
      // Cleanup on unmount
      setComponentInitialized('phases', false);
    };
  }, [setComponentInitialized]);

  // Recalculate development phase when features change
  useEffect(() => {
    if (currentProject?.features) {
      calculateDevelopmentPhase();
    }
  }, [currentProject?.features, currentProject?.coverage, calculateDevelopmentPhase]);

  // Recalculate totals when phases, rates, or selected resources change
  useEffect(() => {
    calculateTotals();
  }, [currentPhases, resourceRates, selectedPhaseResources, calculateTotals]);

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

  const handleResourceChange = async (resourceType: string, resource: any) => {
    try {
      await updateSelectedPhaseResource(resourceType, resource);
      showSuccessNotification(`Updated ${resourceType} selection`);
    } catch (error) {
      console.error('Failed to set resource:', error);
      showErrorNotification('Failed to update resource selection');
    }
  };

  const handleSpecifyRateClick = (resourceType: string) => {
    openRateSpecModal(resourceType);
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
          coverage={currentProject.coverage || 0}
        />

        <div className="phases-controls">
          <ApprovalStatusSelector
            currentStatus={currentApprovalStatus}
            onStatusChange={updateApprovalStatus}
          />
          <SupplierSelectors
            resourceDisplayStrings={resourceDisplayStrings}
            onSpecifyRateClick={handleSpecifyRateClick}
          />
        </div>

        <PhasesTable
          phases={currentPhases}
          resourceRates={resourceRates}
          totals={phasesTotals}
          onManDaysChange={handlePhaseManDaysChange}
          onEffortChange={handlePhaseEffortChange}
        />
        <RateSpecificationModal />
      </div>
    </div>
  );
};

export default PhasesManager;
