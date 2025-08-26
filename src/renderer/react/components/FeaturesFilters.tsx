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
    suppliers: any[];
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
          {filterOptions.categories.map((category, index) => (
            <option key={`category-${index}`} value={category}>
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
          {filterOptions.featureTypes.map((featureType, index) => (
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
            const optionValue = `${supplier.name.toLowerCase()}-${supplier.role.toLowerCase()}-${supplier.department.toLowerCase()}`;
            
            return (
              <option key={supplier.id} value={optionValue}>
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