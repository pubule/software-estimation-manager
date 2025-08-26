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

// Import the existing store
import '../js/store/app-store.js';

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
    };
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
  LoadProjectModal
};

console.log('✅ React components exported globally:', Object.keys(window.ReactComponents));