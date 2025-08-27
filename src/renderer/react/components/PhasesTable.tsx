import React from 'react';
import PhaseRow from './PhaseRow';
import PhasesTotals from './PhasesTotals';

interface PhaseData {
  id: string;
  name: string;
  description: string;
  type: string;
  calculated?: boolean;
  manDays: number;
  effort: { G1: number; G2: number; TA: number; PM: number };
}

interface ResourceRates {
  G1: number;
  G2: number;
  TA: number;
  PM: number;
}

interface PhasesTotalsData {
  manDays: number;
  manDaysByResource: { G1: number; G2: number; TA: number; PM: number };
  costByResource: { G1: number; G2: number; TA: number; PM: number };
}

interface PhasesTableProps {
  phases: PhaseData[];
  resourceRates: ResourceRates;
  totals: PhasesTotalsData;
  onManDaysChange: (phaseId: string, manDays: number) => void;
  onEffortChange: (phaseId: string, resourceType: string, percentage: number) => void;
}

const PhasesTable: React.FC<PhasesTableProps> = ({
  phases,
  resourceRates,
  totals,
  onManDaysChange,
  onEffortChange
}) => {
  const calculateManDaysByResource = (totalManDays: number, effort: { G1: number; G2: number; TA: number; PM: number }) => {
    return {
      G1: (totalManDays * effort.G1) / 100,
      G2: (totalManDays * effort.G2) / 100,
      TA: (totalManDays * effort.TA) / 100,
      PM: (totalManDays * effort.PM) / 100
    };
  };

  const calculateCostByResource = (manDaysByResource: { G1: number; G2: number; TA: number; PM: number }) => {
    return {
      G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
      G2: Math.round(manDaysByResource.G2 * resourceRates.G2),
      TA: Math.round(manDaysByResource.TA * resourceRates.TA),
      PM: Math.round(manDaysByResource.PM * resourceRates.PM)
    };
  };

  return (
    <div className="phases-table-container">
      <table className="phases-table">
        <thead>
          <tr>
            <th className="phase-name header-group">Phase</th>
            <th className="header-group">Man Days</th>
            <th className="header-group" colSpan={4}>% Effort Distribution</th>
            <th className="header-group" colSpan={4}>Man Days by Resource</th>
            <th className="header-group" colSpan={4}>Cost by Resource (€)</th>
          </tr>
          <tr>
            <th className="phase-name sub-header">Name</th>
            <th className="sub-header">Total</th>
            <th className="sub-header">G1</th>
            <th className="sub-header">G2</th>
            <th className="sub-header">TA</th>
            <th className="sub-header">PM</th>
            <th className="sub-header">G1</th>
            <th className="sub-header">G2</th>
            <th className="sub-header">TA</th>
            <th className="sub-header">PM</th>
            <th className="sub-header">G1</th>
            <th className="sub-header">G2</th>
            <th className="sub-header">TA</th>
            <th className="sub-header">PM</th>
          </tr>
        </thead>
        <tbody>
          {phases.map(phase => {
            const manDaysByResource = calculateManDaysByResource(phase.manDays, phase.effort);
            const costByResource = calculateCostByResource(manDaysByResource);
            
            return (
              <PhaseRow
                key={phase.id}
                phase={phase}
                manDaysByResource={manDaysByResource}
                costByResource={costByResource}
                onManDaysChange={onManDaysChange}
                onEffortChange={onEffortChange}
              />
            );
          })}
        </tbody>
        <tfoot>
          <PhasesTotals totals={totals} />
        </tfoot>
      </table>
    </div>
  );
};

export default PhasesTable;