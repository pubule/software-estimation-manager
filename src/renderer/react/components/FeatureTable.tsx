import React, { useMemo } from 'react';
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
            <th>ID</th>
            <th>Description</th>
            <th>Category</th>
            <th>Type</th>
            <th>Real MD</th>
            <th>Calculated MD</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.id}>
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
              <td className="feature-type">
                {featureActions.getFeatureTypeNameById(feature.category, feature.featureType)}
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeatureTable;