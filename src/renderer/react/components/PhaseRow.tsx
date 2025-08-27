import React, { useCallback } from 'react';

interface PhaseData {
  id: string;
  name: string;
  description: string;
  type: string;
  calculated?: boolean;
  manDays: number;
  effort: { G1: number; G2: number; TA: number; PM: number };
}

interface PhaseRowProps {
  phase: PhaseData;
  manDaysByResource: { G1: number; G2: number; TA: number; PM: number };
  costByResource: { G1: number; G2: number; TA: number; PM: number };
  onManDaysChange: (phaseId: string, manDays: number) => void;
  onEffortChange: (phaseId: string, resourceType: string, percentage: number) => void;
}

const PhaseRow: React.FC<PhaseRowProps> = ({
  phase,
  manDaysByResource,
  costByResource,
  onManDaysChange,
  onEffortChange
}) => {
  const effort = phase.effort;
  const effortTotal = Object.values(effort).reduce((sum, val) => sum + val, 0);
  const effortClass = effortTotal === 100 ? 'valid' : (effortTotal > 100 ? 'invalid' : 'warning');

  const handleManDaysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onManDaysChange(phase.id, value);
  }, [phase.id, onManDaysChange]);

  const handleEffortChange = useCallback((resourceType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    // Validate range 0-100
    const clampedValue = Math.max(0, Math.min(100, value));
    if (clampedValue !== value) {
      e.target.value = clampedValue.toString();
    }
    onEffortChange(phase.id, resourceType, clampedValue);
  }, [phase.id, onEffortChange]);

  return (
    <tr className={`phase-row ${phase.type ? 'phase-' + phase.type : ''} ${effortClass}`} data-phase-id={phase.id}>
      <td className="phase-name">
        <strong>{phase.name}</strong>
        {phase.description && (
          <span className="phase-description">{phase.description}</span>
        )}
      </td>
      <td>
        <input 
          type="number"
          value={phase.manDays}
          onChange={handleManDaysChange}
          readOnly={phase.calculated}
          className={phase.calculated ? 'calculated tooltip' : ''}
          data-tooltip={phase.calculated ? 'Calculated from features list' : undefined}
          min="0"
          step="0.5"
        />
      </td>
      <td className="effort-cell">
        <input 
          type="number"
          value={effort.G1}
          onChange={handleEffortChange('G1')}
          min="0"
          max="100"
          step="1"
          className="effort-input"
        />
        <span className="percentage-sign">%</span>
      </td>
      <td className="effort-cell">
        <input 
          type="number"
          value={effort.G2}
          onChange={handleEffortChange('G2')}
          min="0"
          max="100"
          step="1"
          className="effort-input"
        />
        <span className="percentage-sign">%</span>
      </td>
      <td className="effort-cell">
        <input 
          type="number"
          value={effort.TA}
          onChange={handleEffortChange('TA')}
          min="0"
          max="100"
          step="1"
          className="effort-input"
        />
        <span className="percentage-sign">%</span>
      </td>
      <td className="effort-cell">
        <input 
          type="number"
          value={effort.PM}
          onChange={handleEffortChange('PM')}
          min="0"
          max="100"
          step="1"
          className="effort-input"
        />
        <span className="percentage-sign">%</span>
      </td>
      <td className="phases-currency resource-g1">{(manDaysByResource?.G1 || 0).toFixed(1)}</td>
      <td className="phases-currency resource-g2">{(manDaysByResource?.G2 || 0).toFixed(1)}</td>
      <td className="phases-currency resource-ta">{(manDaysByResource?.TA || 0).toFixed(1)}</td>
      <td className="phases-currency resource-pm">{(manDaysByResource?.PM || 0).toFixed(1)}</td>
      <td className="phases-currency resource-g1">€{(costByResource?.G1 || 0).toLocaleString()}</td>
      <td className="phases-currency resource-g2">€{(costByResource?.G2 || 0).toLocaleString()}</td>
      <td className="phases-currency resource-ta">€{(costByResource?.TA || 0).toLocaleString()}</td>
      <td className="phases-currency resource-pm">€{(costByResource?.PM || 0).toLocaleString()}</td>
    </tr>
  );
};

export default PhaseRow;