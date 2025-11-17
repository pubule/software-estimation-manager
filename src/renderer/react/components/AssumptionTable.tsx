/**
 * AssumptionTable - Tabella React per visualizzazione assumptions
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers
 */

import React, { useState, useMemo } from 'react';
import { Assumption } from '../actions/AssumptionsActions';
import Button from './Button';
import '../../styles/assumptions.css';

interface AssumptionTableProps {
  assumptions: Assumption[];
  onEdit: (assumption: Assumption) => void;
  onDuplicate: (assumptionId: string) => void;
  onDelete: (assumptionId: string) => void;
}

type SortField = 'id' | 'description' | 'type' | 'impact';
type SortDirection = 'asc' | 'desc';

const AssumptionTable: React.FC<AssumptionTableProps> = ({ 
  assumptions, 
  onEdit, 
  onDuplicate, 
  onDelete 
}) => {
  // LOCAL UI state per sorting (non business data)
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sorting logic (presentazione, non business)
  const sortedAssumptions = useMemo(() => {
    if (!assumptions?.length) return [];

    return [...assumptions].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assumptions, sortField, sortDirection]);

  // Handle sorting (solo UI state)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon class
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return 'fas fa-sort';
    return sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  };

  // Get impact badge class
  const getImpactClass = (impact: string) => {
    switch (impact) {
      case 'High': return 'impact-high';
      case 'Medium': return 'impact-medium';
      case 'Low': return 'impact-low';
      default: return '';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Technical': return 'fas fa-cog';
      case 'Business': return 'fas fa-briefcase';
      case 'Resource': return 'fas fa-users';
      case 'Timeline': return 'fas fa-clock';
      default: return 'fas fa-question';
    }
  };

  // Empty state
  if (!assumptions?.length) {
    return (
      <div className="table-container">
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div className="empty-state-message">
            No assumptions found. Click "Add Assumption" to get started.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table assumptions-table">
        <thead>
          <tr>
            <th 
              className="sortable" 
              onClick={() => handleSort('id')}
              title="Sort by ID"
            >
              ID <i className={getSortIcon('id')}></i>
            </th>
            <th 
              className="sortable" 
              onClick={() => handleSort('description')}
              title="Sort by Description"
            >
              Description <i className={getSortIcon('description')}></i>
            </th>
            <th 
              className="sortable" 
              onClick={() => handleSort('type')}
              title="Sort by Type"
            >
              Type <i className={getSortIcon('type')}></i>
            </th>
            <th 
              className="sortable" 
              onClick={() => handleSort('impact')}
              title="Sort by Impact"
            >
              Impact <i className={getSortIcon('impact')}></i>
            </th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedAssumptions.map((assumption) => (
            <tr key={assumption.id} data-assumption-id={assumption.id}>
              <td className="assumption-id">
                <strong>{assumption.id}</strong>
              </td>
              <td className="assumption-description">
                <div className="description-main" title={assumption.description}>
                  {assumption.description}
                </div>
              </td>
              <td className="assumption-type">
                <span className="type-badge">
                  <i className={getTypeIcon(assumption.type)}></i>
                  {' '}
                  {assumption.type}
                </span>
              </td>
              <td className="assumption-impact">
                <span className={`impact-badge ${getImpactClass(assumption.impact)}`}>
                  {assumption.impact}
                </span>
              </td>
              <td className="assumption-notes">
                <div className="notes-preview" title={assumption.notes || ''}>
                  {assumption.notes || '-'}
                </div>
              </td>
              <td className="assumption-actions">
                <div className="row-actions">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onEdit(assumption)}
                    title="Edit Assumption"
                    icon={<i className="fas fa-edit" />}
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onDuplicate(assumption.id)}
                    title="Duplicate Assumption"
                    icon={<i className="fas fa-copy" />}
                  />
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => onDelete(assumption.id)}
                    title="Delete Assumption"
                    icon={<i className="fas fa-trash" />}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssumptionTable;