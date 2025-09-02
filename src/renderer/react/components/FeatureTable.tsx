import React, { useState, useMemo } from 'react';
import { Feature } from '../hooks/useStore';
import { useFeatureActions } from '../hooks/useFeatureActions';

interface FeatureTableProps {
  features: Feature[];
  onEdit: (feature: Feature) => void;
  onDelete: (featureId: string) => void;
  onDuplicate: (feature: Feature) => void;
}

const FeatureTable: React.FC<FeatureTableProps> = ({ features, onEdit, onDelete, onDuplicate }) => {
  const featureActions = useFeatureActions();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Toggle row expansion
  const toggleRowExpansion = (featureId: string) => {
    setExpandedRows(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Format percentage helper
  const formatPercentage = (value: number) => {
    return value ? `${value}%` : '0%';
  };
  if (features.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-list"></i>
        <h3>No features found</h3>
        <p>Start by adding your first feature to the project.</p>
      </div>
    );
  }

  return (
    <div className="feature-table-container">
      <table className="data-table feature-table">
        <thead>
          <tr>
            <th className="expand-column"></th>
            <th>ID</th>
            <th>Description</th>
            <th>Category</th>
            <th>Supplier</th>
            <th>Real MD</th>
            <th>Calculated MD</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => {
            const isExpanded = expandedRows.includes(feature.id);
            return (
              <React.Fragment key={feature.id}>
                <tr className={`feature-row ${isExpanded ? 'expanded' : ''}`}>
                  <td className="expand-column">
                    <button 
                      className="expand-btn"
                      onClick={() => toggleRowExpansion(feature.id)}
                      aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                    >
                      <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                    </button>
                  </td>
                  <td className="feature-id">
                    <code>{feature.id}</code>
                  </td>
              <td className="feature-description">
                {feature.description}
              </td>
              <td className="feature-category">
                <span className="category-badge">
                  {featureActions.getCategoryNameById(feature.category)}
                </span>
              </td>
              <td className="feature-supplier">
                {featureActions.getSupplierDisplayName(feature.supplier)}
              </td>
              <td className="feature-real-md">
                {feature.realManDays || 0}
              </td>
              <td className="feature-calculated-md">
                <strong>{feature.manDays || 0}</strong>
              </td>
              <td className="feature-actions">
                <div className="row-actions">
                  <button 
                    className="btn btn-small btn-secondary edit-btn"
                    data-action="edit"
                    data-feature-id={feature.id}
                    onClick={() => onEdit(feature)}
                    title="Edit Feature"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn btn-small btn-secondary duplicate-btn"
                    data-action="duplicate"
                    data-feature-id={feature.id}
                    onClick={() => onDuplicate(feature)}
                    title="Duplicate Feature"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                  <button 
                    className="btn btn-small btn-danger delete-btn"
                    data-action="delete"
                    data-feature-id={feature.id}
                    onClick={() => onDelete(feature.id)}
                    title="Delete Feature"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            
            {/* Expanded Row */}
            {isExpanded && (
              <tr className="feature-expanded-row">
                <td colSpan={8} className="expanded-content">
                  <div className="expanded-details">
                    {/* Technical Information Card */}
                    <div className="detail-card technical-card">
                      <div className="card-header">
                        <i className="fas fa-cog card-icon"></i>
                        <h4>Technical Details</h4>
                      </div>
                      <div className="card-content">
                        <div className="detail-item">
                          <i className="fas fa-tag detail-icon"></i>
                          <span className="detail-label">Feature Type</span>
                          <span className="detail-value">
                            {featureActions.getFeatureTypeNameById(feature.category, feature.featureType)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-chart-line detail-icon"></i>
                          <span className="detail-label">Expertise</span>
                          <span className="detail-value expertise-value">{formatPercentage(feature.expertise)}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-exclamation-triangle detail-icon"></i>
                          <span className="detail-label">Risk Margin</span>
                          <span className="detail-value risk-value">{formatPercentage(feature.riskMargin)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes Card */}
                    <div className="detail-card notes-card">
                      <div className="card-header">
                        <i className="fas fa-sticky-note card-icon"></i>
                        <h4>Notes</h4>
                      </div>
                      <div className="card-content notes-content">
                        {feature.notes || 'No notes available'}
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="detail-card timeline-card">
                      <div className="card-header">
                        <i className="fas fa-calendar card-icon"></i>
                        <h4>Timeline</h4>
                      </div>
                      <div className="card-content">
                        <div className="detail-item">
                          <i className="fas fa-plus-circle detail-icon"></i>
                          <span className="detail-label">Created</span>
                          <span className="detail-value">{formatDate(feature.created)}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-edit detail-icon"></i>
                          <span className="detail-label">Modified</span>
                          <span className="detail-value">{formatDate(feature.modified)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
          );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FeatureTable;