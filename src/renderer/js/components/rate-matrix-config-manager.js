/**
 * Rate Matrix Configuration Manager
 * Manages the unified configuration for Vendors (Suppliers and Internal Resources)
 * and their complex rate structures.
 */
class RateMatrixConfigManager {
    constructor(configManager, app) {
        this.configManager = configManager;
        this.app = app;
        this.containerId = 'vendors-rates-content'; // Match the ID in ConfigurationUIManager
        this.vendors = [];
        this.selectedVendor = null;
        this.vendorFilter = 'all'; // 'all', 'Supplier', or 'Internal'
        this.jobClusterFilter = null;
        this.locationFilter = null;
    }

    async render() {
        const contentDiv = document.getElementById(this.containerId);
        if (!contentDiv) {
            console.error('Rate Matrix content container not found');
            return;
        }

        this.vendors = this.configManager.globalConfig.vendors || [];
        contentDiv.innerHTML = this.generateHTML();
        this.renderVendorList();
        this.setupEventListeners();
    }

    generateHTML() {
        return `
            <div class="rate-matrix-container master-detail-layout">
                <div class="master-panel">
                    <div class="panel-header">
                        <h3>Vendors</h3>
                        <div class="panel-actions">
                            <select id="vendor-filter" class="filter-dropdown">
                                <option value="all">All</option>
                                <option value="External">External</option>
                                <option value="Internal">Internal</option>
                            </select>
                            <button class="btn btn-small btn-primary" data-action="add-vendor">
                                <i class="fas fa-plus"></i> Add Vendor
                            </button>
                        </div>
                    </div>
                    <div class="vendor-list" id="vendor-list">
                        <!-- Vendor list will be rendered here -->
                    </div>
                </div>
                <div class="detail-panel" id="rate-matrix-detail">
                    <!-- Detail view will be rendered here -->
                    <div class="no-selection-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Select a vendor to manage their rates.</p>
                    </div>
                </div>
            </div>
            ${this.generateAddVendorModalHTML()}
        `;
    }

    generateAddVendorModalHTML() {
        return `
            <div id="add-vendor-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add New Vendor</h3>
                        <button class="modal-close" data-action="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-vendor-form">
                            <div class="form-group">
                                <label for="new-vendor-name">Vendor Name</label>
                                <input type="text" id="new-vendor-name" required />
                            </div>
                            <div class="form-group">
                                <label for="new-vendor-type">Vendor Type</label>
                                <select id="new-vendor-type" required>
                                    <option value="External">External</option>
                                    <option value="Internal">Internal</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="add-vendor-form">Save Vendor</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderVendorList() {
        const listContainer = document.getElementById('vendor-list');
        if (!listContainer) return;

        const filteredVendors = this.vendors.filter(vendor => {
            if (this.vendorFilter === 'all') return true;
            return vendor.type === this.vendorFilter;
        });

        listContainer.innerHTML = filteredVendors.map(vendor => `
            <div class="vendor-item ${this.selectedVendor?.id === vendor.id ? 'selected' : ''}" data-vendor-id="${vendor.id}">
                <strong>${this.escapeHtml(vendor.name)}</strong>
                <span class="badge ${vendor.type === 'External' ? 'badge-primary' : 'badge-success'}">
                    ${vendor.type}
                </span>
            </div>
        `).join('');
    }

    renderDetailView() {
        const detailContainer = document.getElementById('rate-matrix-detail');
        if (!detailContainer) return;

        if (!this.selectedVendor) {
            detailContainer.innerHTML = `
                <div class="no-selection-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a vendor to manage their rates.</p>
                </div>
            `;
            return;
        }

        const rateMatrixConfig = this.configManager.globalConfig.rateMatrixConfig;
        if (!this.jobClusterFilter && rateMatrixConfig.jobClusters.length > 0) {
            this.jobClusterFilter = rateMatrixConfig.jobClusters[0];
        }
        if (!this.locationFilter && rateMatrixConfig.locations.length > 0) {
            this.locationFilter = rateMatrixConfig.locations[0].id;
        }

        detailContainer.innerHTML = this.generateDetailHTML(this.selectedVendor, rateMatrixConfig);
        
        const jobClusterFilterDropdown = detailContainer.querySelector('#job-cluster-filter');
        if(jobClusterFilterDropdown) {
            jobClusterFilterDropdown.addEventListener('change', this.handleJobClusterFilterChange.bind(this));
        }
        
        const locationFilterDropdown = detailContainer.querySelector('#location-filter');
        if(locationFilterDropdown) {
            locationFilterDropdown.addEventListener('change', this.handleLocationFilterChange.bind(this));
        }
    }
    
    generateDetailHTML(vendor, rateMatrixConfig) {
        const { jobClusters, seniorities, locations } = rateMatrixConfig;
        
        const selectedLocation = locations.find(l => l.id === this.locationFilter) || locations[0];
        const headerCols = selectedLocation.deliveryModels.map(model => ({
            id: `${selectedLocation.id}-${model}`,
            label: `${selectedLocation.name} (${model})`
        }));

        const getRate = (clusterId, seniority, locationId, model) => {
            const cluster = vendor.jobClusters?.find(jc => jc.clusterId === clusterId);
            const rate = cluster?.rates?.find(r => r.seniority === seniority);
            return rate?.locations?.[locationId]?.[model] ?? '';
        };
        
        const selectedCluster = this.jobClusterFilter || jobClusters[0];
        const selectedJobCluster = vendor.jobClusters?.find(jc => jc.clusterId === selectedCluster);
        const selectedClusterRole = selectedJobCluster?.role || '';

        return `
            <div class="panel-header">
                <h3>${this.escapeHtml(vendor.name)}</h3>
                <div class="panel-actions">
                    <select id="job-cluster-filter" class="filter-dropdown">
                        ${jobClusters.map(c => `<option value="${c}" ${selectedCluster === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                    <select id="location-filter" class="filter-dropdown">
                        ${locations.map(l => `<option value="${l.id}" ${this.locationFilter === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
                    </select>
                    <button class="btn btn-primary" data-action="save-rates" data-vendor-id="${vendor.id}">
                        <i class="fas fa-save"></i> Save Rates
                    </button>
                </div>
            </div>
            <div class="vendor-properties-editor">
                <div class="form-group">
                    <label for="vendor-type-edit">Type</label>
                    <select id="vendor-type-edit" title="Vendor Type">
                        <option value="External" ${vendor.type === 'External' ? 'selected' : ''}>External</option>
                        <option value="Internal" ${vendor.type === 'Internal' ? 'selected' : ''}>Internal</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="job-cluster-role">Role for <strong>${selectedCluster}</strong></label>
                    <select id="job-cluster-role" class="job-cluster-role-select" data-cluster-id="${selectedCluster}">
                        <option value="" ${selectedClusterRole === '' ? 'selected' : ''}>None</option>
                        <option value="G1" ${selectedClusterRole === 'G1' ? 'selected' : ''}>G1</option>
                        <option value="G2" ${selectedClusterRole === 'G2' ? 'selected' : ''}>G2</option>
                        <option value="TA" ${selectedClusterRole === 'TA' ? 'selected' : ''}>TA</option>
                        <option value="PM" ${selectedClusterRole === 'PM' ? 'selected' : ''}>PM</option>
                    </select>
                </div>
            </div>
            <div class="rate-matrix-editor">
                <div class="table-wrapper">
                    <table class="data-table rate-matrix-table">
                        <thead>
                            <tr>
                                <th>Seniority</th>
                                ${headerCols.map(h => `<th>${h.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${seniorities.map(seniority => `
                                <tr>
                                    <td>${seniority}</td>
                                    ${headerCols.map(h => {
                                        const [locationId, model] = h.id.split('-');
                                        const rateValue = getRate(selectedCluster, seniority, locationId, model);
                                        return `
                                            <td>
                                                <input 
                                                    type="number"
                                                    class="rate-input"
                                                    data-vendor-id="${vendor.id}"
                                                    data-cluster="${selectedCluster}"
                                                    data-seniority="${seniority}"
                                                    data-location="${locationId}"
                                                    data-model="${model}"
                                                    value="${rateValue}"
                                                    placeholder="N/A"
                                                />
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const container = document.getElementById('vendors-rates-content');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const vendorItem = e.target.closest('.vendor-item');
            if (vendorItem) {
                this.handleVendorSelection(vendorItem.dataset.vendorId);
                return;
            }

            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;

            e.preventDefault();
            const action = actionTarget.dataset.action;
            const vendorId = actionTarget.dataset.vendorId;

            if (action === 'add-vendor') {
                this.openAddVendorModal();
            } else if (action === 'save-rates') {
                this.saveRates(vendorId);
            } else if (action === 'close-modal') {
                this.closeAddVendorModal();
            }
        });
        
        const form = document.getElementById('add-vendor-form');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNewVendor();
            });
        }
        
        const filterDropdown = document.getElementById('vendor-filter');
        if (filterDropdown) {
            filterDropdown.addEventListener('change', (e) => {
                this.vendorFilter = e.target.value;
                this.renderVendorList();
            });
        }
    }
    
    handleJobClusterFilterChange(e) {
        this.jobClusterFilter = e.target.value;
        this.renderDetailView();
    }
    
    handleLocationFilterChange(e) {
        this.locationFilter = e.target.value;
        this.renderDetailView();
    }

    handleVendorSelection(vendorId) {
        this.selectedVendor = this.vendors.find(v => v.id === vendorId) || null;
        this.jobClusterFilter = null; // Reset job cluster filter on new vendor selection
        this.locationFilter = null; // Reset location filter on new vendor selection
        this.renderVendorList(); // Re-render list to show selection
        this.renderDetailView(); // Render the detail view for the selected vendor
    }

    escapeHtml(text) {
        if (text === undefined || text === null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openAddVendorModal() {
        const modal = document.getElementById('add-vendor-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeAddVendorModal() {
        const modal = document.getElementById('add-vendor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async saveNewVendor() {
        const name = document.getElementById('new-vendor-name').value;
        const type = document.getElementById('new-vendor-type').value;

        if (!name || !type) {
            this.app.showNotification('Vendor name and type are required.', 'error');
            return;
        }

        const newVendor = {
            id: `vendor-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name,
            type,
            jobClusters: []
        };

        this.configManager.globalConfig.vendors.push(newVendor);
        await this.configManager.saveGlobalConfig();
        
        this.closeAddVendorModal();
        this.vendors = this.configManager.globalConfig.vendors;
        this.handleVendorSelection(newVendor.id); // Select the new vendor
        this.app.showNotification('Vendor added successfully.', 'success');
    }

    async saveRates(vendorId) {
        const vendor = this.configManager.globalConfig.vendors.find(v => v.id === vendorId);
        if (!vendor) {
            this.app.showNotification('Could not find vendor to save rates.', 'error');
            return;
        }

        // Update the vendor's type
        const typeSelect = document.getElementById('vendor-type-edit');
        if (typeSelect) {
            vendor.type = typeSelect.value;
        }
        
        if (!vendor.jobClusters) {
            vendor.jobClusters = [];
        }

        // Save job cluster role for the selected cluster only
        const roleSelect = document.getElementById('job-cluster-role');
        if (roleSelect) {
            const clusterId = roleSelect.dataset.clusterId;
            let jobCluster = vendor.jobClusters.find(jc => jc.clusterId === clusterId);
            if (!jobCluster) {
                jobCluster = { clusterId: clusterId, rates: [] };
                vendor.jobClusters.push(jobCluster);
            }
            jobCluster.role = roleSelect.value || null;
        }

        const inputs = document.querySelectorAll('#rate-matrix-detail .rate-input');
        
        inputs.forEach(input => {
            const { cluster, seniority, location, model } = input.dataset;
            const value = input.value;

            if (!value) return; // Don't save empty rates

            let jobCluster = vendor.jobClusters.find(jc => jc.clusterId === cluster);
            if (!jobCluster) {
                jobCluster = { clusterId: cluster, rates: [] };
                vendor.jobClusters.push(jobCluster);
            }

            let rate = jobCluster.rates.find(r => r.seniority === seniority);
            if (!rate) {
                rate = { seniority: seniority, locations: {} };
                jobCluster.rates.push(rate);
            }
            
            if (!rate.locations[location]) {
                rate.locations[location] = {};
            }

            rate.locations[location][model] = parseFloat(value);
        });

        const result = await this.configManager.saveGlobalConfig();
        if (result.success) {
            this.app.showNotification('Rates saved successfully!', 'success');
        } else {
            this.app.showNotification(`Error saving rates: ${result.error}`, 'error');
        }
    }
}

if (typeof window !== 'undefined') {
    window.RateMatrixConfigManager = RateMatrixConfigManager;
}
