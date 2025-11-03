import React from 'react';

interface ApprovalStatusIconProps {
  status: "Approved" | "Pending Approval";
  size?: string;
}

const ApprovalStatusIcon: React.FC<ApprovalStatusIconProps> = ({
  status,
  size = '1em'
}) => {
  if (status === "Approved") {
    return (
      <i
        className="fas fa-check-circle approval-status-icon"
        style={{
          color: '#4CAF50',
          fontSize: size,
          marginLeft: '0.25em'
        }}
        title="Approved"
      ></i>
    );
  }

  // Pending Approval
  return (
    <i
      className="fas fa-clock approval-status-icon"
      style={{
        color: '#FF9800',
        fontSize: size,
        marginLeft: '0.25em'
      }}
      title="Pending Approval"
    ></i>
  );
};

export default ApprovalStatusIcon;
