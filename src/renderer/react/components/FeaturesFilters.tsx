import React, { useEffect, useState } from 'react';
import { useFeatureActions } from '../hooks/useFeatureActions';

interface FeaturesFiltersProps {
  categoryFilter: string;
  featureTypeFilter: string;
  supplierFilter: string;
  onCategoryChange: (category: string) => void;
  onFeatureTypeChange: (featureType: string) => void;
  onSupplierChange: (supplier: string) => void;
}

const FeaturesFilters: React.FC<FeaturesFiltersProps> = ({ 
  categoryFilter,
  featureTypeFilter,
  supplierFilter,
  onCategoryChange,
  onFeatureTypeChange,
  onSupplierChange
}) => {
  const { getFilterOptions } = useFeatureActions();
  const [filterOptions, setFilterOptions] = useState<{
    categories: any[];
    featureTypes: string[];
    suppliers: any[];
  }>({
    categories: [],
    featureTypes: [],
    suppliers: []
  });

  const [availableFeatureTypes, setAvailableFeatureTypes] = useState<string[]>([]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
        setAvailableFeatureTypes(options.featureTypes);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, [getFilterOptions]);

  // Update available feature types when category filter changes
  useEffect(() => {
    if (!filterOptions.categories.length) return;
    
    if (!categoryFilter || categoryFilter === '') {
      // Show all feature types when no category is selected
      setAvailableFeatureTypes(filterOptions.featureTypes);
    } else {
      // Filter feature types based on selected category
      const selectedCategory = filterOptions.categories.find(
        cat => cat.name === categoryFilter || cat.id === categoryFilter
      );
      
      if (selectedCategory && selectedCategory.featureTypes) {
        const categoryFeatureTypes = selectedCategory.featureTypes.map(ft => ft.name);
        setAvailableFeatureTypes(categoryFeatureTypes);
      } else {
        setAvailableFeatureTypes([]);
      }
    }
    
    // Reset feature type filter when category changes
    if (featureTypeFilter && categoryFilter) {
      const selectedCategory = filterOptions.categories.find(
        cat => cat.name === categoryFilter || cat.id === categoryFilter
      );
      const isFeatureTypeInCategory = selectedCategory?.featureTypes?.some(
        ft => ft.name === featureTypeFilter
      );
      
      if (!isFeatureTypeInCategory) {
        onFeatureTypeChange('');
      }
    }
  }, [categoryFilter, filterOptions.categories, filterOptions.featureTypes, featureTypeFilter, onFeatureTypeChange]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCategoryChange(e.target.value);
  };

  const handleFeatureTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFeatureTypeChange(e.target.value);
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSupplierChange(e.target.value);
  };

  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label>Category:</label>
        <select 
          value={categoryFilter} 
          onChange={handleCategoryChange}
        >
          <option value="">All Categories</option>
          {filterOptions.categories.map((category, index) => (
            <option key={category.id || `category-${index}`} value={category.name || category.id}>
              {category.name || category.id}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <label>Feature Type:</label>
        <select 
          value={featureTypeFilter} 
          onChange={handleFeatureTypeChange}
        >
          <option value="">All Feature Types</option>
          {availableFeatureTypes.map((featureType, index) => (
            <option key={`featureType-${index}`} value={featureType}>
              {featureType}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <label>Supplier:</label>
        <select 
          value={supplierFilter} 
          onChange={handleSupplierChange}
        >
          <option value="">All Suppliers</option>
          {filterOptions.suppliers.map(supplier => {
            const rate = supplier.realRate || supplier.officialRate || 0;
            const isInternal = supplier.type === 'internal' || supplier.isInternal;
            const internalSuffix = isInternal ? ' - Internal' : '';
            const displayName = `${supplier.department} - ${supplier.name} (€${rate}/day)${internalSuffix}`;
            
            return (
              <option key={supplier.id} value={supplier.id}>
                {displayName}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};

export default FeaturesFilters;