import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useFeatureActions } from '../hooks/useFeatureActions';
import FeaturesPageHeader from './FeaturesPageHeader';
import FeaturesSearchBar from './FeaturesSearchBar';
import FeaturesFilters from './FeaturesFilters';
import FeatureManager from './FeatureManager';
import FeaturesSummary from './FeaturesSummary';

const FeaturesPage: React.FC = () => {
  const { currentProject } = useStore(state => ({
    currentProject: state.currentProject
  }));

  const { filterFeatures, openAddModal } = useFeatureActions();
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featureTypeFilter, setFeatureTypeFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Filtered features calculation
  const filteredFeatures = useMemo(() => {
    if (!currentProject?.features) return [];
    
    return filterFeatures(currentProject.features, {
      searchTerm,
      category: categoryFilter,
      featureType: featureTypeFilter,
      supplier: supplierFilter
    });
  }, [
    currentProject?.features, 
    searchTerm, 
    categoryFilter, 
    featureTypeFilter, 
    supplierFilter, 
    filterFeatures
  ]);

  // Reset filters when project changes
  useEffect(() => {
    setSearchTerm('');
    setCategoryFilter('');
    setFeatureTypeFilter('');
    setSupplierFilter('');
  }, [currentProject?.project?.id]);

  const handleAddFeature = () => {
    openAddModal();
  };

  if (!currentProject) {
    return (
      <div className="features-page-no-project">
        <div className="empty-state">
          <i className="fas fa-folder-open"></i>
          <h3>No Project Loaded</h3>
          <p>Please load or create a project to manage features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="features-page">
      <FeaturesPageHeader 
        onAddFeature={handleAddFeature}
      />

      <FeaturesSearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <FeaturesFilters 
        categoryFilter={categoryFilter}
        featureTypeFilter={featureTypeFilter}
        supplierFilter={supplierFilter}
        onCategoryChange={setCategoryFilter}
        onFeatureTypeChange={setFeatureTypeFilter}
        onSupplierChange={setSupplierFilter}
      />

      <FeatureManager 
        customFilteredFeatures={filteredFeatures}
      />

      <FeaturesSummary 
        filteredFeatures={filteredFeatures}
      />
    </div>
  );
};

export default FeaturesPage;