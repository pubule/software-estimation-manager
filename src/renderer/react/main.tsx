import React from 'react';
import ReactDOM from 'react-dom/client';

// Import React components
import FeatureManager from './components/FeatureManager';
import FeatureTable from './components/FeatureTable';
import FeatureModal from './components/FeatureModal';
import FeaturesPage from './components/FeaturesPage';
import ProjectManager from './components/ProjectManager';
import CurrentProjectCard from './components/CurrentProjectCard';
import RecentProjectsList from './components/RecentProjectsList';
import SavedProjectsList from './components/SavedProjectsList';
import ProjectItem from './components/ProjectItem';
import NewProjectModal from './components/NewProjectModal';
import LoadProjectModal from './components/LoadProjectModal';

// Import phases components
import PhasesManager from './components/PhasesManager';
import PhasesTable from './components/PhasesTable';
import PhaseRow from './components/PhaseRow';
import PhasesTotals from './components/PhasesTotals';
import DevelopmentNotice from './components/DevelopmentNotice';
import SupplierSelectors from './components/SupplierSelectors';

// Import calculations components
import CalculationsPage from './components/CalculationsPage';

// Import assumptions components
import AssumptionsPage from './components/AssumptionsPage';

// Import version history components
import VersionHistoryPage from './components/VersionHistoryPage';
import VersionHistoryTable from './components/VersionHistoryTable';
import VersionFilters from './components/VersionFilters';
import CreateVersionModal from './components/CreateVersionModal';
import VersionComparisonModal from './components/VersionComparisonModal';
import RestoreVersionModal from './components/RestoreVersionModal';

// Import ticket dashboard components
import TicketDashboard from './components/TicketDashboard';

// Import capacity/resource management components
import ResourceOverviewDashboard from './components/ResourceOverviewDashboard';
import ResourceOverviewHeatmap from './components/ResourceOverviewHeatmap';
import ResourceCapacityCard from './components/ResourceCapacityCard';
import ResourceFilters from './components/ResourceFilters';
import CapacityTimeline from './components/CapacityTimeline';
import TimelineHeader from './components/TimelineHeader';
import TimelineRow from './components/TimelineRow';
import TimelineMonthCell from './components/TimelineMonthCell';
import AssignmentModal from './components/AssignmentModal';

// Import Actions classes for global registration
import { NavigationActions } from './actions/NavigationActions';
import { versionHistoryActions } from './actions/VersionHistoryActions';
import { calculationsActions } from './actions/CalculationsActions';
import { CapacityActions } from './actions/CapacityActions';
import { AllocationActions } from './actions/AllocationActions';
import '../js/actions/ReactPageWrapperActions.js';

// Import the existing store
import '../js/store/app-store.js';

// ⚠️ CRITICAL: Export Actions BEFORE mounting components!
// This ensures Actions are available when React components initialize
window.CapacityActions = CapacityActions;
window.AllocationActions = AllocationActions;
console.log('✅ Actions exported BEFORE React components mount');

// Export React components globally for use by vanilla JS
declare global {
  interface Window {
    ReactComponents: {
      FeatureManager: typeof FeatureManager;
      FeatureTable: typeof FeatureTable;  
      FeatureModal: typeof FeatureModal;
      FeaturesPage: typeof FeaturesPage;
      ProjectManager: typeof ProjectManager;
      CurrentProjectCard: typeof CurrentProjectCard;
      RecentProjectsList: typeof RecentProjectsList;
      SavedProjectsList: typeof SavedProjectsList;
      ProjectItem: typeof ProjectItem;
      NewProjectModal: typeof NewProjectModal;
      LoadProjectModal: typeof LoadProjectModal;
      PhasesManager: typeof PhasesManager;
      PhasesTable: typeof PhasesTable;
      PhaseRow: typeof PhaseRow;
      PhasesTotals: typeof PhasesTotals;
      DevelopmentNotice: typeof DevelopmentNotice;
      SupplierSelectors: typeof SupplierSelectors;
      CalculationsPage: typeof CalculationsPage;
      AssumptionsPage: typeof AssumptionsPage;
      VersionHistoryPage: typeof VersionHistoryPage;
      VersionHistoryTable: typeof VersionHistoryTable;
      VersionFilters: typeof VersionFilters;
      CreateVersionModal: typeof CreateVersionModal;
      VersionComparisonModal: typeof VersionComparisonModal;
      RestoreVersionModal: typeof RestoreVersionModal;
      TicketDashboard: typeof TicketDashboard;
      ResourceOverviewDashboard: typeof ResourceOverviewDashboard;
      ResourceOverviewHeatmap: typeof ResourceOverviewHeatmap;
      ResourceCapacityCard: typeof ResourceCapacityCard;
      ResourceFilters: typeof ResourceFilters;
      CapacityTimeline: typeof CapacityTimeline;
      TimelineHeader: typeof TimelineHeader;
      TimelineRow: typeof TimelineRow;
      TimelineMonthCell: typeof TimelineMonthCell;
      AssignmentModal: typeof AssignmentModal;
    };
    NavigationActions: typeof NavigationActions;
    versionHistoryActions: typeof versionHistoryActions;
    calculationsActions: typeof calculationsActions;
    CapacityActions: typeof CapacityActions;
    AllocationActions: typeof AllocationActions;
    ReactPageWrapperActions: any;
  }
}

// Make React components available globally
window.ReactComponents = {
  FeatureManager,
  FeatureTable,
  FeatureModal,
  FeaturesPage,
  ProjectManager,
  CurrentProjectCard,
  RecentProjectsList,
  SavedProjectsList,
  ProjectItem,
  NewProjectModal,
  LoadProjectModal,
  PhasesManager,
  PhasesTable,
  PhaseRow,
  PhasesTotals,
  DevelopmentNotice,
  SupplierSelectors,
  CalculationsPage,
  AssumptionsPage,
  VersionHistoryPage,
  VersionHistoryTable,
  VersionFilters,
  CreateVersionModal,
  VersionComparisonModal,
  RestoreVersionModal,
  TicketDashboard,
  ResourceOverviewDashboard,
  ResourceOverviewHeatmap,
  ResourceCapacityCard,
  ResourceFilters,
  CapacityTimeline,
  TimelineHeader,
  TimelineRow,
  TimelineMonthCell,
  AssignmentModal
};

// Make remaining Actions classes available globally
window.NavigationActions = NavigationActions;
window.versionHistoryActions = versionHistoryActions;
window.calculationsActions = calculationsActions;
// Note: CapacityActions and AllocationActions already exported at top of file

console.log('✅ React components exported globally:', Object.keys(window.ReactComponents));
console.log('✅ NavigationActions exported globally');
console.log('✅ versionHistoryActions exported globally');
console.log('✅ calculationsActions exported globally');