import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { calculationsActions } from '../actions/CalculationsActions';

const RateSpecificationModal: React.FC = () => {
    const { rateSpecModal, closeRateSpecModal, globalConfig, selectedPhaseResources, updateSelectedPhaseResource, workingPackageResources } = useStore(state => ({
        rateSpecModal: state.rateSpecModal,
        closeRateSpecModal: state.closeRateSpecModal,
        globalConfig: state.globalConfig,
        selectedPhaseResources: state.selectedPhaseResources,
        updateSelectedPhaseResource: state.updateSelectedPhaseResource,
        workingPackageResources: state.workingPackageResources,
    }));

    const [localSelection, setLocalSelection] = useState<any>(null);

    useEffect(() => {
        if (rateSpecModal.isOpen && rateSpecModal.role) {
            // Determine which resource to load based on mode
            if (rateSpecModal.mode === 'wp') {
                // For WP mode, we need to determine the category (gto/gds) from the role
                // G2/TA -> gto, G1/PM -> gds
                const category = rateSpecModal.role === 'G2' || rateSpecModal.role === 'TA' ? 'gto' : 'gds';
                const resourceType = rateSpecModal.role === 'G2' || rateSpecModal.role === 'G1' ? 'primaryResource' : 'secondaryResource';

                const currentResource = workingPackageResources[category]?.[resourceType as keyof typeof workingPackageResources[category]];
                setLocalSelection(currentResource || {});
            } else {
                // Phase mode
                const currentResource = selectedPhaseResources[rateSpecModal.role as keyof typeof selectedPhaseResources];
                setLocalSelection(currentResource || {});
            }
        }
    }, [rateSpecModal, selectedPhaseResources, workingPackageResources]);

    if (!rateSpecModal.isOpen || !rateSpecModal.role || !globalConfig) {
        return null;
    }

    const handleSave = () => {
        if (rateSpecModal.role && localSelection?.vendorId) {
            if (rateSpecModal.mode === 'wp') {
                // For WP mode, determine category and resourceType
                const category = rateSpecModal.role === 'G2' || rateSpecModal.role === 'TA' ? 'gto' : 'gds';
                const resourceType = rateSpecModal.role === 'G2' || rateSpecModal.role === 'G1' ? 'primaryResource' : 'secondaryResource';
                calculationsActions.updateWorkingPackageVendorAndResource(category, resourceType, localSelection);
            } else {
                updateSelectedPhaseResource(rateSpecModal.role, localSelection);
            }
        }
        closeRateSpecModal();
    };

    const handleChange = (field: string, value: string) => {
        setLocalSelection((prev: any) => ({ ...prev, [field]: value }));
    };

    const { vendors, rateMatrixConfig } = globalConfig;
    const { jobClusters, seniorities, locations } = rateMatrixConfig;

    const selectedLocation = locations.find((l: any) => l.id === localSelection?.location);
    const deliveryModels = selectedLocation ? selectedLocation.deliveryModels : [];

    // Determine modal title based on role
    const getModalTitle = () => {
        if (rateSpecModal.role === 'G2') return 'Specify Rate for G2';
        if (rateSpecModal.role === 'G1') return 'Specify Rate for G1';
        if (rateSpecModal.role === 'TA') return 'Specify Rate for TA';
        if (rateSpecModal.role === 'PM') return 'Specify Rate for PM';
        return `Specify Rate for ${rateSpecModal.role}`;
    };

    return (
        <div className="modal active">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{getModalTitle()}</h3>
                    <button className="modal-close" onClick={closeRateSpecModal}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Vendor</label>
                        <select value={localSelection?.vendorId || ''} onChange={(e) => handleChange('vendorId', e.target.value)}>
                            <option value="">Select Vendor</option>
                            {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Job Cluster</label>
                        <select value={localSelection?.jobCluster || ''} onChange={(e) => handleChange('jobCluster', e.target.value)}>
                            <option value="">Select Job Cluster</option>
                            {jobClusters.map((jc: string) => <option key={jc} value={jc}>{jc}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Seniority</label>
                        <select value={localSelection?.seniority || ''} onChange={(e) => handleChange('seniority', e.target.value)}>
                            <option value="">Select Seniority</option>
                            {seniorities.map((s: string) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Location</label>
                        <select value={localSelection?.location || ''} onChange={(e) => handleChange('location', e.target.value)}>
                            <option value="">Select Location</option>
                            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Delivery Model</label>
                        <select value={localSelection?.deliveryModel || ''} onChange={(e) => handleChange('deliveryModel', e.target.value)} disabled={!selectedLocation}>
                            <option value="">Select Delivery Model</option>
                            {deliveryModels.map((dm: string) => <option key={dm} value={dm}>{dm}</option>)}
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeRateSpecModal}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default RateSpecificationModal;
