/**
 * Categories Configuration Manager
 * Manages categories and their associated feature types with CRUD operations
 */

class CategoriesConfigManager {
    constructor(app, configManager) {
        this.app = app;
        this.configManager = configManager;
        this.currentScope = 'global'; // 'global' or 'project'
        this.selectedCategory = null;
        this.editingItem = null;
        this.editingFeatureType = null;
        
        // Default categories with feature types based on provided data
        this.defaultCategories = [
            {
                id: 'db-activities',
                name: 'DATABASE ACTIVITIES',
                description: 'Database operations and data management',
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'db-create-table',
                        name: 'Create new DB table',
                        description: 'Create new database table with schema',
                        averageMDs: 3
                    },
                    {
                        id: 'db-modify-table',
                        name: 'Modify existing table (add column)',
                        description: 'Modify existing table structure',
                        averageMDs: 2
                    },
                    {
                        id: 'db-create-view',
                        name: 'Create view/stored procedure',
                        description: 'Create database views or stored procedures',
                        averageMDs: 3
                    },
                    {
                        id: 'db-dao-crud',
                        name: 'DAO/CRUD operations',
                        description: 'Data Access Object and CRUD implementations',
                        averageMDs: 2
                    }
                ]
            },
            {
                id: 'backend-api-activities',
                name: 'BACKEND/API ACTIVITIES',
                description: 'Backend services and API development',
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'backend-rest-service',
                        name: 'Create new REST web service',
                        description: 'Develop new REST API endpoints',
                        averageMDs: 3
                    },
                    {
                        id: 'backend-soap-client',
                        name: 'Create new SOAP client',
                        description: 'Implement SOAP client integration',
                        averageMDs: 5
                    },
                    {
                        id: 'backend-business-logic',
                        name: 'Business logic implementation',
                        description: 'Core business logic development',
                        averageMDs: 4
                    },
                    {
                        id: 'backend-client-adjustment',
                        name: 'Client adjustment',
                        description: 'Client-specific customizations',
                        averageMDs: 3
                    }
                ]
            },
            {
                id: 'frontend-activities',
                name: 'FRONTEND ACTIVITIES',
                description: 'Frontend development and UI components',
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'frontend-new-page',
                        name: 'Develop new page/component',
                        description: 'Create new frontend pages or components',
                        averageMDs: 7
                    },
                    {
                        id: 'frontend-modify-page',
                        name: 'Modify existing page',
                        description: 'Update existing frontend pages',
                        averageMDs: 3
                    },
                    {
                        id: 'frontend-form-management',
                        name: 'Form/input field management',
                        description: 'Form handling and input validation',
                        averageMDs: 3
                    }
                ]
            },
            {
                id: 'integration-config',
                name: 'INTEGRATION & CONFIGURATION',
                description: 'System integration and configuration',
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'integration-external',
                        name: 'External system integration',
                        description: 'Integration with external systems',
                        averageMDs: 4
                    },
                    {
                        id: 'integration-config-setup',
                        name: 'Configuration/properties setup',
                        description: 'System configuration and properties management',
                        averageMDs: 7
                    }
                ]
            }
        ];
        
        this.init();
    }

    init() {
        console.log('CategoriesConfigManager initialized');
        // Delay initialization to ensure ConfigurationManager is ready
        setTimeout(() => {
            this.ensureDefaultCategories();
        }, 100);
        this.setupEventListeners();
    }

    /**
     * Ensure default categories exist in global configuration
     */
    ensureDefaultCategories(forceReset = false) {
        console.log('ensureDefaultCategories called, forceReset:', forceReset);
        console.log('configManager:', !!this.configManager);
        console.log('globalConfig:', !!this.configManager?.globalConfig);
        
        if (!this.configManager || !this.configManager.globalConfig) {
            console.log('ConfigManager or globalConfig not available');
            return;
        }
        
        const existingCategories = this.configManager.globalConfig.categories;
        console.log('Existing categories:', existingCategories?.length || 0);
        
        if (!existingCategories || existingCategories.length === 0 || forceReset) {
            console.log('Initializing default categories:', this.defaultCategories.length);
            console.log('Force reset:', forceReset);
            this.configManager.globalConfig.categories = [...this.defaultCategories];
            this.configManager.saveGlobalConfig();
            console.log('Default categories initialized successfully');
        } else {
            console.log('Categories already exist, skipping initialization');
            // Log the existing categories to see their structure
            console.log('Existing categories structure:', JSON.stringify(existingCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                featureTypesCount: cat.featureTypes?.length || 0
            })), null, 2));
        }
    }

    /**
     * Setup event listeners for the categories configuration
     */
    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('.categories-scope-tab')) {
                this.switchScope(e.target.dataset.scope);
            }
        });

        // Category selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.category-item')) {
                const categoryId = e.target.closest('.category-item').dataset.categoryId;
                this.selectCategory(categoryId);
            }
        });

        // Action buttons
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch (action) {
                case 'add-category':
                    this.showAddCategoryModal();
                    break;
                case 'edit-category':
                    this.editCategory(e.target.dataset.categoryId);
                    break;
                case 'duplicate-category':
                    this.duplicateCategory(e.target.dataset.categoryId);
                    break;
                case 'delete-category':
                    this.deleteCategory(e.target.dataset.categoryId);
                    break;
                case 'add-feature-type':
                    this.showAddFeatureTypeModal();
                    break;
                case 'edit-feature-type':
                    this.editFeatureType(e.target.dataset.featureTypeId);
                    break;
                case 'duplicate-feature-type':
                    this.duplicateFeatureType(e.target.dataset.featureTypeId);
                    break;
                case 'delete-feature-type':
                    this.deleteFeatureType(e.target.dataset.featureTypeId);
                    break;
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'category-form') {
                e.preventDefault();
                this.saveCategoryForm();
            }
            if (e.target.id === 'feature-type-form') {
                e.preventDefault();
                this.saveFeatureTypeForm();
            }
        });
    }

    /**
     * Render the categories configuration page
     */
    renderCategoriesPage(container) {        
        if (!container) {
            console.log('No container provided to renderCategoriesPage');
            return;
        }

        // Ensure default categories are initialized before rendering
        this.ensureDefaultCategories();

        container.innerHTML = `
            <div class="categories-config-container">
                <div class="categories-header">
                    <h2><i class="fas fa-tags"></i> Categories Configuration</h2>
                    <p class="categories-description">
                        Manage project categories and their associated feature types. Each feature type includes an average Man Days estimation.
                    </p>
                </div>

                <!-- Scope Selector -->
                <div class="categories-scope-selector">
                    <div class="scope-tabs">
                        <button class="scope-tab categories-scope-tab active" data-scope="global">
                            <i class="fas fa-globe"></i>
                            Global Categories
                            <span class="count" id="global-categories-count">0</span>
                        </button>
                        <button class="scope-tab categories-scope-tab" data-scope="project">
                            <i class="fas fa-project-diagram"></i>
                            Project Categories
                            <span class="count" id="project-categories-count">0</span>
                        </button>
                    </div>
                </div>

                <!-- Main Layout -->
                <div class="categories-table-container">
                    <div class="categories-master-detail-layout">
                        <!-- Categories List -->
                        <div class="categories-master-panel">
                            <div class="panel-header">
                                <h3>Categories</h3>
                                <button class="btn btn-small btn-primary" data-action="add-category">
                                    <i class="fas fa-plus"></i> Add Category
                                </button>
                            </div>
                            <div class="categories-list" id="categories-list">
                                <!-- Categories will be populated here -->
                            </div>
                        </div>

                        <!-- Category Details and Feature Types -->
                        <div class="categories-detail-panel">
                            <div class="category-details-section" id="category-details-section">
                                <div class="no-selection-message">
                                    <i class="fas fa-info-circle"></i>
                                    <p>Select a category to view and manage its feature types</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Category Modal -->
            <div id="category-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="category-modal-title">Add Category</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="category-form">
                            <div class="form-group">
                                <label for="category-name">Name *</label>
                                <input type="text" id="category-name" name="name" required maxlength="100">
                            </div>
                            <div class="form-group">
                                <label for="category-description">Description</label>
                                <textarea id="category-description" name="description" rows="3" maxlength="500"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="category-status">Status</label>
                                <select id="category-status" name="status">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="category-form">Save Category</button>
                    </div>
                </div>
            </div>

            <!-- Feature Type Modal -->
            <div id="feature-type-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="feature-type-modal-title">Add Feature Type</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="feature-type-form">
                            <div class="form-group">
                                <label for="feature-type-name">Name *</label>
                                <input type="text" id="feature-type-name" name="name" required maxlength="100">
                            </div>
                            <div class="form-group">
                                <label for="feature-type-description">Description</label>
                                <textarea id="feature-type-description" name="description" rows="3" maxlength="500"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="feature-type-average-mds">Average Man Days *</label>
                                <input type="number" id="feature-type-average-mds" name="averageMDs" 
                                       min="0.1" max="100" step="0.1" required>
                                <small class="form-help">Estimated average effort in man days</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="feature-type-form">Save Feature Type</button>
                    </div>
                </div>
            </div>
        `;

        this.refreshCategoriesDisplay();
    }

    /**
     * Switch between global and project scope
     */
    switchScope(scope) {
        this.currentScope = scope;
        
        // Update tab states
        document.querySelectorAll('.categories-scope-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.scope === scope);
        });

        // Clear selection when switching scope
        this.selectedCategory = null;
        
        this.refreshCategoriesDisplay();
    }

    /**
     * Get categories for current scope
     */
    getCurrentCategories() {
        console.log('getCurrentCategories called, scope:', this.currentScope);
        
        if (!this.configManager) {
            console.log('No configManager available');
            return [];
        }

        if (this.currentScope === 'global') {
            const categories = this.configManager.globalConfig?.categories || [];
            return categories;
        } else {
            const currentProject = this.app?.currentProject;
            if (!currentProject) {
                console.log('No current project available');
                return [];
            }
            
            const projectConfig = this.configManager.getProjectConfig(currentProject.config);
            const categories = projectConfig.categories || [];
            console.log('Project categories found:', categories.length);
            return categories;
        }
    }

    /**
     * Refresh the categories display
     */
    refreshCategoriesDisplay() {
        this.updateCategoriesCounts();
        this.renderCategoriesList();
        this.renderCategoryDetails();
    }

    /**
     * Update categories counts in tabs
     */
    updateCategoriesCounts() {
        if (!this.configManager) return;

        const globalCount = this.configManager.globalConfig?.categories?.length || 0;
        const globalCountEl = document.getElementById('global-categories-count');
        if (globalCountEl) globalCountEl.textContent = globalCount;

        const currentProject = this.app?.currentProject;
        let projectCount = 0;
        if (currentProject) {
            const projectConfig = this.configManager.getProjectConfig(currentProject.config);
            projectCount = projectConfig.categories?.length || 0;
        }
        
        const projectCountEl = document.getElementById('project-categories-count');
        if (projectCountEl) projectCountEl.textContent = projectCount;
    }

    /**
     * Render the categories list
     */
    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        const categories = this.getCurrentCategories();
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>No categories found</p>
                    <small>Click "Add Category" to create your first category</small>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map(category => `
            <div class="category-item ${this.selectedCategory?.id === category.id ? 'selected' : ''}" 
                 data-category-id="${category.id}">
                <div class="category-info">
                    <div class="category-header">
                        <h4 class="category-name">${this.escapeHtml(category.name)}</h4>
                        <div class="category-status">
                            <span class="status-badge ${category.status}">${category.status}</span>
                        </div>
                    </div>
                    <p class="category-description">${this.escapeHtml(category.description || '')}</p>
                    <div class="category-meta">
                        <span class="feature-types-count">
                            <i class="fas fa-list"></i>
                            ${category.featureTypes?.length || 0} feature types
                        </span>
                        <div class="category-actions">
                            <button class="btn btn-small btn-secondary" data-action="edit-category" 
                                    data-category-id="${category.id}" title="Edit Category">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-secondary" data-action="duplicate-category" 
                                    data-category-id="${category.id}" title="Duplicate Category">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-small btn-danger" data-action="delete-category" 
                                    data-category-id="${category.id}" title="Delete Category">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Select a category and show its details
     */
    selectCategory(categoryId) {
        const categories = this.getCurrentCategories();
        this.selectedCategory = categories.find(cat => cat.id === categoryId);
        
        // Update selection visual state
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.categoryId === categoryId);
        });

        this.renderCategoryDetails();
    }

    /**
     * Render category details and feature types
     */
    renderCategoryDetails() {
        const container = document.getElementById('category-details-section');
        if (!container) return;

        if (!this.selectedCategory) {
            container.innerHTML = `
                <div class="no-selection-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a category to view and manage its feature types</p>
                </div>
            `;
            return;
        }

        const featureTypes = this.selectedCategory.featureTypes || [];

        container.innerHTML = `
            <div class="category-detail-header">
                <div class="category-detail-info">
                    <h3>${this.escapeHtml(this.selectedCategory.name)}</h3>
                    <p>${this.escapeHtml(this.selectedCategory.description || '')}</p>
                </div>
                <button class="btn btn-small btn-primary" data-action="add-feature-type">
                    <i class="fas fa-plus"></i> Add Feature Type
                </button>
            </div>

            <div class="feature-types-section">
                <h4>Feature Types (${featureTypes.length})</h4>
                
                ${featureTypes.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-list"></i>
                        <p>No feature types defined</p>
                        <small>Add feature types to categorize specific development tasks</small>
                    </div>
                ` : `
                    <div class="feature-types-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Average MDs</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${featureTypes.map(ft => `
                                    <tr>
                                        <td class="feature-type-name">${this.escapeHtml(ft.name)}</td>
                                        <td class="feature-type-description">${this.escapeHtml(ft.description || '')}</td>
                                        <td class="feature-type-average-mds">
                                            <span class="average-mds-value">${ft.averageMDs}</span>
                                        </td>
                                        <td class="feature-type-actions">
                                            <button class="btn btn-small btn-secondary" 
                                                    data-action="edit-feature-type" 
                                                    data-feature-type-id="${ft.id}" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-small btn-secondary" 
                                                    data-action="duplicate-feature-type" 
                                                    data-feature-type-id="${ft.id}" title="Duplicate">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                            <button class="btn btn-small btn-danger" 
                                                    data-action="delete-feature-type" 
                                                    data-feature-type-id="${ft.id}" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    }

    // Category CRUD Operations
    showAddCategoryModal() {
        this.editingItem = null;
        document.getElementById('category-modal-title').textContent = 'Add Category';
        document.getElementById('category-form').reset();
        document.getElementById('category-modal').classList.add('active');
    }

    editCategory(categoryId) {
        const categories = this.getCurrentCategories();
        this.editingItem = categories.find(cat => cat.id === categoryId);
        
        if (!this.editingItem) return;

        document.getElementById('category-modal-title').textContent = 'Edit Category';
        document.getElementById('category-name').value = this.editingItem.name;
        document.getElementById('category-description').value = this.editingItem.description || '';
        document.getElementById('category-status').value = this.editingItem.status;
        document.getElementById('category-modal').classList.add('active');
    }

    duplicateCategory(categoryId) {
        const categories = this.getCurrentCategories();
        const original = categories.find(cat => cat.id === categoryId);
        
        if (!original) return;

        this.editingItem = null;
        document.getElementById('category-modal-title').textContent = 'Duplicate Category';
        document.getElementById('category-name').value = `${original.name} (Copy)`;
        document.getElementById('category-description').value = original.description || '';
        document.getElementById('category-status').value = original.status;
        document.getElementById('category-modal').classList.add('active');
    }

    async deleteCategory(categoryId) {
        const categories = this.getCurrentCategories();
        const category = categories.find(cat => cat.id === categoryId);
        
        if (!category) return;

        if (!confirm(`Are you sure you want to delete the category "${category.name}"? This will also delete all associated feature types.`)) {
            return;
        }

        // Remove category
        const index = categories.findIndex(cat => cat.id === categoryId);
        if (index !== -1) {
            categories.splice(index, 1);
        }

        // Clear selection if deleted category was selected
        if (this.selectedCategory?.id === categoryId) {
            this.selectedCategory = null;
        }

        await this.saveCurrentConfiguration();
        this.refreshCategoriesDisplay();
        
        this.showNotification(`Category "${category.name}" deleted successfully`, 'success');
    }

    async saveCategoryForm() {
        const formData = {
            name: document.getElementById('category-name').value.trim(),
            description: document.getElementById('category-description').value.trim(),
            status: document.getElementById('category-status').value
        };

        // Validation
        if (!formData.name) {
            this.showNotification('Category name is required', 'error');
            return;
        }

        const categories = this.getCurrentCategories();

        if (this.editingItem) {
            // Update existing category
            Object.assign(this.editingItem, formData);
        } else {
            // Create new category
            const newCategory = {
                id: this.generateId('cat-'),
                ...formData,
                featureTypes: [],
                isGlobal: this.currentScope === 'global'
            };
            categories.push(newCategory);
        }

        await this.saveCurrentConfiguration();
        this.closeModal('category-modal');
        this.refreshCategoriesDisplay();
        
        const action = this.editingItem ? 'updated' : 'created';
        this.showNotification(`Category "${formData.name}" ${action} successfully`, 'success');
    }

    // Feature Type CRUD Operations
    showAddFeatureTypeModal() {
        if (!this.selectedCategory) return;

        this.editingFeatureType = null;
        document.getElementById('feature-type-modal-title').textContent = 'Add Feature Type';
        document.getElementById('feature-type-form').reset();
        document.getElementById('feature-type-modal').classList.add('active');
    }

    editFeatureType(featureTypeId) {
        if (!this.selectedCategory) return;

        this.editingFeatureType = this.selectedCategory.featureTypes?.find(ft => ft.id === featureTypeId);
        if (!this.editingFeatureType) return;

        document.getElementById('feature-type-modal-title').textContent = 'Edit Feature Type';
        document.getElementById('feature-type-name').value = this.editingFeatureType.name;
        document.getElementById('feature-type-description').value = this.editingFeatureType.description || '';
        document.getElementById('feature-type-average-mds').value = this.editingFeatureType.averageMDs;
        document.getElementById('feature-type-modal').classList.add('active');
    }

    duplicateFeatureType(featureTypeId) {
        if (!this.selectedCategory) return;

        const original = this.selectedCategory.featureTypes?.find(ft => ft.id === featureTypeId);
        if (!original) return;

        this.editingFeatureType = null;
        document.getElementById('feature-type-modal-title').textContent = 'Duplicate Feature Type';
        document.getElementById('feature-type-name').value = `${original.name} (Copy)`;
        document.getElementById('feature-type-description').value = original.description || '';
        document.getElementById('feature-type-average-mds').value = original.averageMDs;
        document.getElementById('feature-type-modal').classList.add('active');
    }

    async deleteFeatureType(featureTypeId) {
        if (!this.selectedCategory) return;

        const featureType = this.selectedCategory.featureTypes?.find(ft => ft.id === featureTypeId);
        if (!featureType) return;

        if (!confirm(`Are you sure you want to delete the feature type "${featureType.name}"?`)) {
            return;
        }

        // Remove feature type
        const index = this.selectedCategory.featureTypes.findIndex(ft => ft.id === featureTypeId);
        if (index !== -1) {
            this.selectedCategory.featureTypes.splice(index, 1);
        }

        await this.saveCurrentConfiguration();
        this.renderCategoryDetails();
        
        this.showNotification(`Feature type "${featureType.name}" deleted successfully`, 'success');
    }

    async saveFeatureTypeForm() {
        if (!this.selectedCategory) return;

        const formData = {
            name: document.getElementById('feature-type-name').value.trim(),
            description: document.getElementById('feature-type-description').value.trim(),
            averageMDs: parseFloat(document.getElementById('feature-type-average-mds').value)
        };

        // Validation
        if (!formData.name) {
            this.showNotification('Feature type name is required', 'error');
            return;
        }

        if (!formData.averageMDs || formData.averageMDs <= 0) {
            this.showNotification('Average Man Days must be greater than 0', 'error');
            return;
        }

        if (!this.selectedCategory.featureTypes) {
            this.selectedCategory.featureTypes = [];
        }

        if (this.editingFeatureType) {
            // Update existing feature type
            Object.assign(this.editingFeatureType, formData);
        } else {
            // Create new feature type
            const newFeatureType = {
                id: this.generateId('ft-'),
                ...formData
            };
            this.selectedCategory.featureTypes.push(newFeatureType);
        }

        await this.saveCurrentConfiguration();
        this.closeModal('feature-type-modal');
        this.renderCategoryDetails();
        this.refreshCategoriesDisplay(); // Update counts
        
        const action = this.editingFeatureType ? 'updated' : 'created';
        this.showNotification(`Feature type "${formData.name}" ${action} successfully`, 'success');
    }

    /**
     * Save current configuration based on scope
     */
    async saveCurrentConfiguration() {
        if (!this.configManager) return;

        if (this.currentScope === 'global') {
            await this.configManager.saveGlobalConfig();
        } else {
            const currentProject = this.app?.currentProject;
            if (currentProject) {
                await this.configManager.saveProjectConfig(currentProject.config);
            }
        }
    }

    /**
     * Utility methods
     */
    generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    escapeHtml(text) {
        // Handle null, undefined, or empty values
        if (text === null || text === undefined || text === '') {
            return '';
        }
        
        // Convert to string if not already
        text = String(text);
        
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showNotification(message, type = 'info') {
        if (window.NotificationManager) {
            window.NotificationManager.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Make CategoriesConfigManager available globally
if (typeof window !== 'undefined') {
    window.CategoriesConfigManager = CategoriesConfigManager;
}