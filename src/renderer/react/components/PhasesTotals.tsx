import React from 'react';

interface PhasesTotalsData {
  manDays: number;
  manDaysByResource: { G1: number; G2: number; TA: number; PM: number };
  costByResource: { G1: number; G2: number; TA: number; PM: number };
}

interface PhasesTotalsProps {
  totals: PhasesTotalsData;
}

const PhasesTotals: React.FC<PhasesTotalsProps> = ({ totals }) => {
  // Safe defaults to prevent undefined errors
  const safeManDays = totals?.manDays || 0;
  const safeManDaysByResource = {
    G1: totals?.manDaysByResource?.G1 || 0,
    G2: totals?.manDaysByResource?.G2 || 0,
    TA: totals?.manDaysByResource?.TA || 0,
    PM: totals?.manDaysByResource?.PM || 0
  };
  const safeCostByResource = {
    G1: totals?.costByResource?.G1 || 0,
    G2: totals?.costByResource?.G2 || 0,
    TA: totals?.costByResource?.TA || 0,
    PM: totals?.costByResource?.PM || 0
  };

  return (
    <tr className="phases-totals-row">
      <td className="phase-name"><strong>TOTALS</strong></td>
      <td className="phases-currency">{safeManDays.toFixed(1)}</td>
      <td colSpan={4}></td>
      <td className="phases-currency">{safeManDaysByResource.G1.toFixed(1)}</td>
      <td className="phases-currency">{safeManDaysByResource.G2.toFixed(1)}</td>
      <td className="phases-currency">{safeManDaysByResource.TA.toFixed(1)}</td>
      <td className="phases-currency">{safeManDaysByResource.PM.toFixed(1)}</td>
      <td className="phases-currency">€{safeCostByResource.G1.toLocaleString()}</td>
      <td className="phases-currency">€{safeCostByResource.G2.toLocaleString()}</td>
      <td className="phases-currency">€{safeCostByResource.TA.toLocaleString()}</td>
      <td className="phases-currency">€{safeCostByResource.PM.toLocaleString()}</td>
    </tr>
  );
};

export default PhasesTotals;