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
    categories: string[];
    featureTypes: string[];
    suppliers: string[];
  }>({
    categories: [],
    featureTypes: [],
    suppliers: []
  });

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, [getFilterOptions]);

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
          {filterOptions.categories.map(category => (
            <option key={category} value={category}>
              {category}
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
          {filterOptions.featureTypes.map(featureType => (
            <option key={featureType} value={featureType}>
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
          {filterOptions.suppliers.map(supplier => (
            <option key={supplier} value={supplier}>
              {supplier}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FeaturesFilters;