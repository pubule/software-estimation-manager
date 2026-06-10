import React, { useState, useMemo } from 'react';
import { Feature } from '../hooks/useStore';
import { useFeatureActions } from '../hooks/useFeatureActions';
import Button from './Button';

interface FeatureTableProps {
  features: Feature[];
  onEdit: (feature: Feature) => void;
  onDelete: (featureId: string) => void;
  onDuplicate: (feature: Feature) => void;
}

const FeatureTable: React.FC<FeatureTableProps> = ({ features, onEdit, onDelete, onDuplicate }) => {
  const featureActions = useFeatureActions();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Memoize resource display strings to prevent infinite loops
  const resourceDisplayStrings = useMemo(() => {
    const cache = new Map<string, string>();
    features.forEach(feature => {
      if (feature.id && !cache.has(feature.id)) {
        try {
          cache.set(feature.id, featureActions.getFormattedFeatureResourceDisplay(feature));
        } catch (error) {
          console.error('Error getting resource display string:', error);
          cache.set(feature.id, feature.supplier || 'N/A');
        }
      }
    });
    return cache;
  }, [features, featureActions]);

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

  // Format man days to 1 decimal place
  const formatManDays = (value: number) => {
    return parseFloat(value.toFixed(1));
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
                      aria-expanded={isExpanded}
                    >
                      <i className="fas fa-chevron-right"></i>
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
                {resourceDisplayStrings.get(feature.id) || 'N/A'}
              </td>
              <td className="feature-real-md">
                {feature.realManDays || 0}
              </td>
              <td className="feature-calculated-md">
                <strong>{formatManDays(feature.manDays || 0)}</strong>
              </td>
              <td className="feature-actions">
                <div className="row-actions">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onEdit(feature)}
                    title="Edit Feature"
                    icon={<i className="fas fa-edit" />}
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onDuplicate(feature)}
                    title="Duplicate Feature"
                    icon={<i className="fas fa-copy" />}
                  />
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => onDelete(feature.id)}
                    title="Delete Feature"
                    icon={<i className="fas fa-trash" />}
                  />
                </div>
              </td>
            </tr>
            
            {/* Expanded Row */}
            {isExpanded && (
              <tr className="feature-expanded-row">
                <td colSpan={8} className="expanded-content">
                  <div className="expanded-detail-grid">
                    <div className="expanded-detail-entry">
                      <span className="expanded-detail-label">Feature Type</span>
                      <span className="expanded-detail-value">
                        {featureActions.getFeatureTypeNameById(feature.category, feature.featureType)}
                      </span>
                    </div>
                    <div className="expanded-detail-entry">
                      <span className="expanded-detail-label">Expertise</span>
                      <span className="expanded-detail-value expertise-value">{formatPercentage(feature.expertise)}</span>
                    </div>
                    <div className="expanded-detail-entry">
                      <span className="expanded-detail-label">Risk Margin</span>
                      <span className="expanded-detail-value risk-value">{formatPercentage(feature.riskMargin)}</span>
                    </div>
                    <div className="expanded-detail-entry">
                      <span className="expanded-detail-label">Created</span>
                      <span className="expanded-detail-value">{formatDate(feature.created)}</span>
                    </div>
                    <div className="expanded-detail-entry">
                      <span className="expanded-detail-label">Modified</span>
                      <span className="expanded-detail-value">{formatDate(feature.modified)}</span>
                    </div>
                  </div>
                  {feature.notes && (
                    <div className="expanded-detail-notes">
                      <span className="expanded-detail-label">Notes</span>
                      <p className="expanded-detail-notes-text">{feature.notes}</p>
                    </div>
                  )}
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