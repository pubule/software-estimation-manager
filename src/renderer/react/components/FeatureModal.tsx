import React, { useState, useEffect } from 'react';
import { Feature, useStore } from '../hooks/useStore';
import { useFeatureActions } from '../hooks/useFeatureActions';

interface FeatureModalProps {
  feature: Feature | null;
  onSave: (featureData: Feature) => void;
  onClose: () => void;
}

const FeatureModal: React.FC<FeatureModalProps> = ({ feature, onSave, onClose }) => {
  const isEditing = feature !== null;
  
  const { currentProject, duplicateSourceData } = useStore(state => ({
    currentProject: state.currentProject,
    duplicateSourceData: state.duplicateSourceData
  }));

  const { 
    generateNextId, 
    getFilterOptions, 
    getFeatureTypesForCategory,
    getDefaultManDays 
  } = useFeatureActions();
  
  // Form state
  const [formData, setFormData] = useState<Partial<Feature>>({
    id: '',
    description: '',
    category: '',
    featureType: '',
    supplier: '',
    realManDays: 0,
    expertise: 100,
    riskMargin: 10,
    manDays: 0,
    notes: ''
  });
  
  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Available options from actions
  const [filterOptions, setFilterOptions] = useState<{
    categories: any[];
    suppliers: any[];
  }>({
    categories: [],
    suppliers: []
  });
  const [availableFeatureTypes, setAvailableFeatureTypes] = useState<any[]>([]);

  // Initialize form when feature or duplicate data changes
  useEffect(() => {
    if (feature) {
      // Edit mode - use existing feature data
      setFormData(feature);
    } else if (duplicateSourceData) {
      // Duplicate mode - use source data with new ID
      const newId = generateNextId();
      setFormData({
        ...duplicateSourceData,
        id: newId,
        // Reset timestamps for new feature
        created: undefined,
        modified: undefined
      });
    } else {
      // Add mode - new feature
      const newId = generateNextId();
      setFormData({
        id: newId,
        description: '',
        category: '',
        featureType: '',
        supplier: '',
        realManDays: 0,
        expertise: 100,
        riskMargin: 10,
        manDays: 0,
        notes: ''
      });
    }
  }, [feature, duplicateSourceData, generateNextId]);

  // Load filter options (categories, suppliers)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions({
          categories: options.categories,
          suppliers: options.suppliers
        });
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    loadOptions();
  }, [getFilterOptions]);

  // Update feature types when category changes
  useEffect(() => {
    if (formData.category) {
      const featureTypes = getFeatureTypesForCategory(formData.category);
      setAvailableFeatureTypes(featureTypes);
      
      // Reset feature type if it's not valid for the new category
      if (formData.featureType && !featureTypes.some(ft => ft.id === formData.featureType || ft.name === formData.featureType)) {
        setFormData(prev => ({ ...prev, featureType: '', realManDays: 0 }));
      }
    } else {
      setAvailableFeatureTypes([]);
    }
  }, [formData.category, getFeatureTypesForCategory]);

  // Auto-populate man days when feature type selected
  useEffect(() => {
    if (formData.category && formData.featureType) {
      const defaultMDs = getDefaultManDays(formData.category, formData.featureType);
      if (defaultMDs > 0) {
        setFormData(prev => ({ 
          ...prev, 
          realManDays: defaultMDs,
          manDays: calculateManDays(defaultMDs, prev.expertise || 100, prev.riskMargin || 10)
        }));
      }
    }
  }, [formData.category, formData.featureType, getDefaultManDays]);

  // Recalculate man days when expertise or risk margin changes
  useEffect(() => {
    const calculated = calculateManDays(
      formData.realManDays || 0, 
      formData.expertise || 100, 
      formData.riskMargin || 10
    );
    
    setFormData(prev => ({ ...prev, manDays: calculated }));
  }, [formData.realManDays, formData.expertise, formData.riskMargin]);

  const calculateManDays = (realManDays: number, expertise: number, riskMargin: number): number => {
    return Math.round((realManDays * (100 + riskMargin) / expertise) * 10) / 10;
  };

  const handleInputChange = (field: keyof Feature, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.id?.trim()) {
      newErrors.id = 'ID is required';
    } else if (!/^[A-Za-z0-9_-]+$/.test(formData.id)) {
      newErrors.id = 'ID must contain only letters, numbers, hyphens and underscores';
    } else {
      // Check for duplicate ID (only when not editing existing feature)
      const existingFeature = currentProject?.features?.find(f => f.id === formData.id);
      if (existingFeature && (!feature || feature.id !== formData.id)) {
        newErrors.id = 'This ID already exists. Please choose a different ID.';
      }
    }
    
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.supplier) {
      newErrors.supplier = 'Supplier is required';
    }
    
    if (!formData.realManDays || formData.realManDays <= 0) {
      newErrors.realManDays = 'Real Man Days must be greater than 0';
    }
    
    if (!formData.expertise || formData.expertise <= 0 || formData.expertise > 100) {
      newErrors.expertise = 'Expertise must be between 1 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData as Feature);
    }
  };

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Feature' : 'Add Feature'}</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* ID Field */}
            <div className="form-group">
              <label htmlFor="feature-id">ID:</label>
              <input
                type="text"
                id="feature-id"
                value={formData.id || ''}
                onChange={(e) => handleInputChange('id', e.target.value)}
                className={errors.id ? 'error' : ''}
                required
                disabled={isEditing} // Don't allow changing ID when editing
              />
              {errors.id && <span className="error-message">{errors.id}</span>}
            </div>


            {/* Description Field */}
            <div className="form-group">
              <label htmlFor="feature-description">Description:</label>
              <textarea
                id="feature-description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? 'error' : ''}
                rows={3}
                required
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            {/* Category Field */}
            <div className="form-group">
              <label htmlFor="feature-category">Category:</label>
              <select
                id="feature-category"
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={errors.category ? 'error' : ''}
                required
              >
                <option value="">Select Category</option>
                {filterOptions.categories.map(category => (
                  <option key={category.id || category.name} value={category.name || category.id}>
                    {category.name || category.id}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-message">{errors.category}</span>}
            </div>

            {/* Feature Type Field */}
            <div className="form-group">
              <label htmlFor="feature-type">Feature Type:</label>
              <select
                id="feature-type"
                value={formData.featureType || ''}
                onChange={(e) => handleInputChange('featureType', e.target.value)}
                disabled={!formData.category}
              >
                <option value="">Select Feature Type</option>
                {availableFeatureTypes.map(featureType => (
                  <option key={featureType.id || featureType.name} value={featureType.name || featureType.id}>
                    {featureType.name || featureType.id}
                  </option>
                ))}
              </select>
              <small className="form-help">Choose a feature type to auto-populate estimated man days</small>
            </div>

            {/* Supplier Field */}
            <div className="form-group">
              <label htmlFor="feature-supplier">Supplier:</label>
              <select
                id="feature-supplier"
                value={formData.supplier || ''}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className={errors.supplier ? 'error' : ''}
                required
              >
                <option value="">Select Supplier</option>
                {filterOptions.suppliers.map(supplier => {
                  const rate = supplier.realRate || supplier.officialRate || 0;
                  const isInternal = supplier.type === 'internal';
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
              {errors.supplier && <span className="error-message">{errors.supplier}</span>}
            </div>

            {/* Real Man Days Field */}
            <div className="form-group">
              <label htmlFor="feature-real-man-days">Real Man Days:</label>
              <input
                type="number"
                id="feature-real-man-days"
                value={formData.realManDays || 0}
                onChange={(e) => handleInputChange('realManDays', parseFloat(e.target.value) || 0)}
                className={errors.realManDays ? 'error' : ''}
                min="0.1"
                step="0.1"
                required
              />
              <small className="form-help">Actual effort needed without considering expertise level</small>
              {errors.realManDays && <span className="error-message">{errors.realManDays}</span>}
            </div>

            {/* Expertise Field */}
            <div className="form-group">
              <label htmlFor="feature-expertise">Expertise (%):</label>
              <input
                type="number"
                id="feature-expertise"
                value={formData.expertise || 100}
                onChange={(e) => handleInputChange('expertise', parseInt(e.target.value) || 100)}
                className={errors.expertise ? 'error' : ''}
                min="1"
                max="100"
                required
              />
              <small className="form-help">Team expertise level (100% = fully experienced, 50% = less experienced)</small>
              {errors.expertise && <span className="error-message">{errors.expertise}</span>}
            </div>

            {/* Risk Margin Field */}
            <div className="form-group">
              <label htmlFor="feature-risk-margin">Risk Margin (%):</label>
              <input
                type="number"
                id="feature-risk-margin"
                value={formData.riskMargin || 10}
                onChange={(e) => handleInputChange('riskMargin', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
              />
              <small className="form-help">Risk buffer to account for unexpected issues (0% = no buffer, 20% = high risk)</small>
            </div>

            {/* Calculated Man Days (Read-only) */}
            <div className="form-group calculated-field">
              <label htmlFor="feature-calculated-man-days">Calculated Man Days:</label>
              <input
                type="number"
                id="feature-calculated-man-days"
                value={formData.manDays || 0}
                readOnly
                className="calculated-value"
              />
              <small className="form-help">Calculated: Real Man Days × (100 + Risk Margin) ÷ Expertise</small>
            </div>

            {/* Notes Field */}
            <div className="form-group">
              <label htmlFor="feature-notes">Notes:</label>
              <textarea
                id="feature-notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Update' : 'Create'} Feature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeatureModal;