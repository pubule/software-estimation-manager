/**
 * Collapsible Section Component
 *
 * Generic collapsible section with header and content
 * Used for organizing large sections like "PROJECT PHASES TIMELINE" and "TEAM MEMBER ALLOCATIONS"
 *
 * Features:
 * - Clickable header with chevron indicator
 * - Smooth expand/collapse animation
 * - Icon support
 * - Customizable styling
 */

import React from 'react';
import '../../styles/capacity-modern.css';

interface CollapsibleSectionProps {
    title: string;
    icon?: string; // FontAwesome icon class (e.g., "fas fa-users")
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    isExpanded,
    onToggle,
    children,
    className = ''
}) => {
    return (
        <div className={`capacity-modern-collapsible-section ${className}`}>
            {/* Section Header (clickable) */}
            <div
                className="capacity-modern-collapsible-header"
                onClick={onToggle}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        onToggle();
                    }
                }}
            >
                {/* Chevron Indicator */}
                <div className={`capacity-modern-collapsible-chevron ${isExpanded ? 'expanded' : ''}`}>
                    <i className="fas fa-chevron-right"></i>
                </div>

                {/* Icon (optional) */}
                {icon && (
                    <i className={`${icon} capacity-modern-collapsible-icon`}></i>
                )}

                {/* Title */}
                <h3 className="capacity-modern-collapsible-title">{title}</h3>
            </div>

            {/* Section Content (collapsible) */}
            {isExpanded && (
                <div className="capacity-modern-collapsible-content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
