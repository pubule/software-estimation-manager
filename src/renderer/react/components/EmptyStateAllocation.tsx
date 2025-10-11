/**
 * Empty State Allocation Component
 *
 * Displays empty state when no team member allocations are available
 * Shown in TEAM MEMBER ALLOCATIONS section when members.length === 0
 *
 * Features:
 * - Centered layout with icon
 * - Clear messaging
 * - Call-to-action hint
 */

import React from 'react';
import '../../styles/capacity-modern.css';

interface EmptyStateAllocationProps {
    message?: string;
    hint?: string;
}

export const EmptyStateAllocation: React.FC<EmptyStateAllocationProps> = ({
    message = 'No team member allocations available',
    hint = 'Create assignments to see team member allocations here'
}) => {
    return (
        <div className="capacity-modern-empty-allocations">
            {/* Icon */}
            <i className="fas fa-users capacity-modern-empty-icon"></i>

            {/* Message */}
            <h3 className="capacity-modern-empty-message">{message}</h3>

            {/* Hint */}
            <p className="capacity-modern-empty-hint">{hint}</p>
        </div>
    );
};

export default EmptyStateAllocation;
