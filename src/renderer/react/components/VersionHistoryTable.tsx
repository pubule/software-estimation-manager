/**
 * VersionHistoryTable - Tabella React per visualizzazione Version History
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers da VersionHistoryPage
 */

import React from 'react';
import Button from './Button';

interface Version {
  id: string;
  timestamp: string;
  reason: string;
  checksum: string;
  data?: any;
}

interface VersionHistoryTableProps {
  versions: Version[];
  onCompare: (versionId: string) => void;
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onExport: (versionId: string) => void;
  isLoading?: boolean;
}

const VersionHistoryTable: React.FC<VersionHistoryTableProps> = ({ 
  versions, 
  onCompare, 
  onRestore, 
  onDelete, 
  onExport,
  isLoading = false 
}) => {
  
  // Format date helper
  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time helper
  const formatRelativeTime = (timestamp: string) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(timestamp);
  };

  // Truncate reason helper
  const truncateReason = (reason: string, maxLength: number = 80) => {
    if (!reason || reason.length <= maxLength) return reason;
    return reason.substring(0, maxLength) + '...';
  };

  if (versions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <i className="fas fa-history"></i>
        </div>
        <h3>No Versions Found</h3>
        <p>No versions match your current filters, or no versions have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="version-table-container">
      <table className="data-table version-table">
        <thead>
          <tr>
            <th>Version ID</th>
            <th>Created</th>
            <th>Reason</th>
            <th>Checksum</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version, index) => (
            <tr 
              key={version.id} 
              className={`version-row ${index === 0 ? 'current-version' : ''}`}
            >
              <td className="version-id">
                <div className="version-id-container">
                  <code>{version.id}</code>
                  {index === 0 && (
                    <span className="current-badge">
                      <i className="fas fa-star"></i>
                      CURRENT
                    </span>
                  )}
                </div>
              </td>
              <td className="version-timestamp">
                <div className="timestamp-content">
                  <div className="timestamp-date">{formatDate(version.timestamp)}</div>
                  <div className="timestamp-relative">{formatRelativeTime(version.timestamp)}</div>
                </div>
              </td>
              <td className="version-reason">
                <span 
                  className="reason-text" 
                  title={version.reason}
                >
                  {truncateReason(version.reason)}
                </span>
              </td>
              <td className="version-checksum">
                <code className="checksum-short" title={version.checksum}>
                  {version.checksum.substring(0, 8)}...
                </code>
              </td>
              <td className="version-actions">
                <div className="row-actions">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onCompare(version.id)}
                    disabled={isLoading}
                    title="Compare with previous version"
                    icon={<i className="fas fa-balance-scale" />}
                  />
                  <Button
                    variant="warning"
                    size="small"
                    onClick={() => onRestore(version.id)}
                    disabled={isLoading || index === 0}
                    title={index === 0 ? "This is the current version" : "Restore this version"}
                    icon={<i className="fas fa-undo" />}
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onExport(version.id)}
                    disabled={isLoading}
                    title="Export version"
                    icon={<i className="fas fa-download" />}
                  />
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => onDelete(version.id)}
                    disabled={isLoading || index === 0}
                    title={index === 0 ? "Cannot delete current version" : "Delete version"}
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

export default VersionHistoryTable;