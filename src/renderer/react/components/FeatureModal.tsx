import React, { useState, useEffect } from 'react';
import { Feature, useStore } from '../hooks/useStore';

interface FeatureModalProps {
  feature: Feature | null;
  onSave: (featureData: Feature) => void;
  onClose: () => void;
}

const FeatureModal: React.FC<FeatureModalProps> = ({ feature, onSave, onClose }) => {
  const isEditing = feature !== null;
  
  // Get config from store
  const { globalConfig } = useStore(state => ({ globalConfig: state.globalConfig }));
  
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
  
  // Available options from config
  const [categories, setCategories] = useState<string[]>([]);
  const [featureTypes, setFeatureTypes] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  // Initialize form when feature changes
  useEffect(() => {
    if (feature) {
      setFormData(feature);
    } else {
      setFormData({
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
    }
  }, [feature]);

  // Load configuration options
  useEffect(() => {
    if (globalConfig) {
      setCategories(Object.keys(globalConfig.categories || {}));
      setSuppliers(Object.keys(globalConfig.suppliers || {}));
    }
  }, [globalConfig]);

  // Update feature types when category changes
  useEffect(() => {
    if (formData.category && globalConfig?.categories) {
      const categoryData = globalConfig.categories[formData.category];
      setFeatureTypes(categoryData?.featureTypes ? Object.keys(categoryData.featureTypes) : []);
      
      // Reset feature type if it's not valid for the new category
      if (formData.featureType && categoryData?.featureTypes && !categoryData.featureTypes[formData.featureType]) {
        setFormData(prev => ({ ...prev, featureType: '', manDays: 0 }));
      }
    } else {
      setFeatureTypes([]);
    }
  }, [formData.category, globalConfig]);

  // Auto-calculate man days based on feature type
  useEffect(() => {
    if (formData.category && formData.featureType && globalConfig?.categories) {
      const categoryData = globalConfig.categories[formData.category];
      const featureTypeData = categoryData?.featureTypes?.[formData.featureType];
      
      if (featureTypeData?.estimatedManDays) {
        const realMD = featureTypeData.estimatedManDays;
        setFormData(prev => ({ 
          ...prev, 
          realManDays: realMD,
          manDays: calculateManDays(realMD, prev.expertise || 100, prev.riskMargin || 10)
        }));
      }
    }
  }, [formData.category, formData.featureType, globalConfig]);

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
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
                {featureTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
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
                {suppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
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