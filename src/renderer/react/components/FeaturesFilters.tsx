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

  const [availableFeatureTypes, setAvailableFeatureTypes] = useState<any[]>([]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
        // Convert featureTypes IDs to objects with proper names
        const featureTypesAsObjects = options.featureTypes.map(ftId => {
          // Find the feature type name from categories
          let ftName = ftId; // fallback to ID if name not found
          for (const category of options.categories) {
            if (category.featureTypes) {
              const ft = category.featureTypes.find(ft => ft.id === ftId);
              if (ft && ft.name) {
                ftName = ft.name;
                break;
              }
            }
          }
          return { id: ftId, name: ftName };
        });
        setAvailableFeatureTypes(featureTypesAsObjects);
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
      const featureTypesAsObjects = filterOptions.featureTypes.map(ftId => {
        // Find the feature type name from categories
        let ftName = ftId; // fallback to ID if name not found
        for (const category of filterOptions.categories) {
          if (category.featureTypes) {
            const ft = category.featureTypes.find(ft => ft.id === ftId);
            if (ft && ft.name) {
              ftName = ft.name;
              break;
            }
          }
        }
        return { id: ftId, name: ftName };
      });
      setAvailableFeatureTypes(featureTypesAsObjects);
    } else {
      // Filter feature types based on selected category
      const selectedCategory = filterOptions.categories.find(
        cat => cat.id === categoryFilter
      );
      
      if (selectedCategory && selectedCategory.featureTypes) {
        // Keep feature types as objects with id and name
        setAvailableFeatureTypes(selectedCategory.featureTypes);
      } else {
        setAvailableFeatureTypes([]);
      }
    }
    
    // Reset feature type filter when category changes
    if (featureTypeFilter && categoryFilter) {
      const selectedCategory = filterOptions.categories.find(
        cat => cat.id === categoryFilter
      );
      const isFeatureTypeInCategory = selectedCategory?.featureTypes?.some(
        ft => ft.id === featureTypeFilter || ft.name === featureTypeFilter
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
            <option key={category.id || `category-${index}`} value={category.id}>
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
            <option key={featureType.id || `featureType-${index}`} value={featureType.id}>
              {featureType.name}
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
            const isInternal = supplier.type?.toLowerCase() === 'internal' || supplier.isInternal;
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