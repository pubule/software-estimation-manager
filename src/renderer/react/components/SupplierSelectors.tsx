import React from 'react';

interface Supplier {
  id: string;
  name: string;
  department: string;
  role: string;
  realRate?: number;
  officialRate: number;
}

interface SelectedSuppliers {
  G1: string | null;
  G2: string | null;
  TA: string | null;
  PM: string | null;
}

interface SupplierSelectorsProps {
  selectedSuppliers: SelectedSuppliers;
  availableSuppliers: Supplier[];
  onSupplierChange: (resourceType: string, supplierId: string) => void;
}

const SupplierSelectors: React.FC<SupplierSelectorsProps> = ({
  selectedSuppliers,
  availableSuppliers,
  onSupplierChange
}) => {
  const resourceTypes = [
    { key: 'G1', label: 'G1 (Grade 1 Developer)' },
    { key: 'G2', label: 'G2 (Grade 2 Developer)' },
    { key: 'TA', label: 'TA (Technical Analyst)' },
    { key: 'PM', label: 'PM (Project Manager)' }
  ];

  const renderSupplierDropdown = (resourceType: string, label: string) => {
    const selectedValue = selectedSuppliers[resourceType as keyof SelectedSuppliers] || '';
    
    // Filter suppliers by role
    const filteredSuppliers = availableSuppliers.filter(supplier => supplier.role === resourceType);
    
    return (
      <div key={resourceType} className="supplier-selector">
        <label htmlFor={`${resourceType.toLowerCase()}-supplier`}>
          {label}:
        </label>
        <select
          id={`${resourceType.toLowerCase()}-supplier`}
          value={selectedValue}
          onChange={(e) => onSupplierChange(resourceType, e.target.value)}
          className="supplier-select"
        >
          <option value="">Select Supplier</option>
          {filteredSuppliers.map(supplier => {
            const rate = supplier.realRate || supplier.officialRate || 0;
            const displayName = `${supplier.department} - ${supplier.name} (€${rate}/day)`;
            return (
              <option 
                key={supplier.id} 
                value={supplier.id}
              >
                {displayName}
              </option>
            );
          })}
        </select>
        {resourceType === 'G2' && (
          <small className="supplier-note">
            Note: Development phase uses feature-specific suppliers
          </small>
        )}
      </div>
    );
  };

  return (
    <div className="supplier-selectors">
      {resourceTypes.map(({ key, label }) => 
        renderSupplierDropdown(key, label)
      )}
    </div>
  );
};

export default SupplierSelectors;