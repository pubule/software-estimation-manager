import React from 'react';

interface ApprovalStatusSelectorProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

const ApprovalStatusSelector: React.FC<ApprovalStatusSelectorProps> = ({
  currentStatus,
  onStatusChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(e.target.value);
  };

  return (
    <div className="approval-status-selector">
      <label htmlFor="approval-status-select">
        Project Approval Status:
      </label>
      <select
        id="approval-status-select"
        value={currentStatus || "Pending Approval"}
        onChange={handleChange}
        className="approval-status-select"
      >
        <option value="Pending Approval">Pending Approval</option>
        <option value="Approved">Approved</option>
      </select>
    </div>
  );
};

export default ApprovalStatusSelector;
