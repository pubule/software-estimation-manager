/**
 * Feature Modal Page Object
 * Handles interactions with the feature creation/editing modal
 */
class FeatureModal {
  constructor(world) {
    this.world = world;
  }

  // Modal Elements
  get modal() {
    return this.world.getElement('.modal.show, .modal[style*="display: block"]');
  }

  get modalTitle() {
    return this.world.getElement('.modal-title, .modal h4, .modal h5');
  }

  get modalBody() {
    return this.world.getElement('.modal-body');
  }

  get modalFooter() {
    return this.world.getElement('.modal-footer');
  }

  // Form Elements
  get form() {
    return this.world.getElement('.modal form, #feature-form');
  }

  get featureIdInput() {
    return this.world.getElement('#feature-id, [name="id"], input[placeholder*="ID"]');
  }

  get descriptionInput() {
    return this.world.getElement('#feature-description, [name="description"], textarea[placeholder*="description"]');
  }

  get categorySelect() {
    return this.world.getElement('#feature-category, [name="category"], select[placeholder*="category"]');
  }

  get typeSelect() {
    return this.world.getElement('#feature-type, [name="type"], select[placeholder*="type"]');
  }

  get supplierSelect() {
    return this.world.getElement('#feature-supplier, [name="supplier"], select[placeholder*="supplier"]');
  }

  get realManDaysInput() {
    return this.world.getElement('#real-man-days, [name="realManDays"], input[placeholder*="real"], input[placeholder*="Real"]');
  }

  get expertiseLevelInput() {
    return this.world.getElement('#expertise-level, [name="expertiseLevel"], select[name*="expertise"], input[placeholder*="expertise"]');
  }

  get riskMarginInput() {
    return this.world.getElement('#risk-margin, [name="riskMargin"], input[placeholder*="risk"], select[name*="risk"]');
  }

  get calculatedManDaysField() {
    return this.world.getElement('#calculated-man-days, [name="manDays"], .calculated-value, input[readonly]');
  }

  get notesInput() {
    return this.world.getElement('#feature-notes, [name="notes"], textarea[placeholder*="notes"]');
  }

  // Action Buttons
  get saveButton() {
    return this.world.getElement('.modal-footer .btn-primary, .modal button[type="submit"], .save-feature-btn');
  }

  get cancelButton() {
    return this.world.getElement('.modal-footer .btn-secondary, .cancel-btn, [data-bs-dismiss="modal"]');
  }

  get deleteButton() {
    return this.world.getElement('.modal-footer .btn-danger, .delete-feature-btn');
  }

  // Validation Elements
  get errorMessages() {
    return this.world.getElement('.modal .error, .modal .text-danger, .modal .invalid-feedback');
  }

  // Modal Actions
  async waitForModal(timeout = 5000) {
    this.world.log('Waiting for feature modal to appear');
    
    await this.world.waitForElement('.modal.show', timeout);
    await this.world.pause(300); // Allow modal animation
    
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show, .modal[style*="display: block"]');
      return {
        isVisible: !!modal,
        hasForm: !!modal?.querySelector('form'),
        modalTitle: modal?.querySelector('.modal-title, h4, h5')?.textContent?.trim()
      };
    `);
    
    this.world.log(`✅ Feature modal appeared: ${result.modalTitle}`);
    return result;
  }

  async openModal() {
    this.world.log('Opening feature modal');
    
    await this.world.executeScript(`
      if (window.featureManager && window.featureManager.showModal) {
        window.featureManager.showModal();
      } else {
        // Fallback: look for add button
        const addButton = document.querySelector('#add-feature-btn, .add-feature-btn, [onclick*="addFeature"]');
        if (addButton) {
          addButton.click();
        }
      }
    `);
    
    await this.waitForModal();
  }

  async closeModal() {
    this.world.log('Closing feature modal');
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      if (modal) {
        const closeBtn = modal.querySelector('.btn-close, .close, [data-bs-dismiss="modal"]');
        if (closeBtn) {
          closeBtn.click();
        } else {
          // Fallback: hide modal directly
          modal.style.display = 'none';
          modal.classList.remove('show');
        }
      }
    `);
    
    await this.world.pause(300); // Allow modal to close
    this.world.log('✅ Feature modal closed');
  }

  // Form Field Actions
  async setFeatureId(id) {
    this.world.log(`Setting feature ID: ${id}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const idField = modal?.querySelector('#feature-id, [name="id"], input[type="text"]');
      
      if (idField) {
        idField.value = '${id}';
        idField.dispatchEvent(new Event('input', { bubbles: true }));
        idField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Feature ID set: ${id}`);
  }

  async setDescription(description) {
    this.world.log(`Setting feature description`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const descField = modal?.querySelector('#feature-description, [name="description"], textarea');
      
      if (descField) {
        descField.value = \`${description.replace(/`/g, '\\`')}\`;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
        descField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Feature description set`);
  }

  async selectCategory(category) {
    this.world.log(`Selecting category: ${category}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const categoryField = modal?.querySelector('#feature-category, [name="category"], select');
      
      if (categoryField) {
        categoryField.value = '${category}';
        categoryField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Category selected: ${category}`);
  }

  async selectType(type) {
    this.world.log(`Selecting type: ${type}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const typeField = modal?.querySelector('#feature-type, [name="type"], select');
      
      if (typeField) {
        typeField.value = '${type}';
        typeField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Type selected: ${type}`);
  }

  async selectSupplier(supplier) {
    this.world.log(`Selecting supplier: ${supplier}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const supplierField = modal?.querySelector('#feature-supplier, [name="supplier"], select');
      
      if (supplierField) {
        supplierField.value = '${supplier}';
        supplierField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Supplier selected: ${supplier}`);
  }

  async setRealManDays(manDays) {
    this.world.log(`Setting real man days: ${manDays}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const manDaysField = modal?.querySelector('#real-man-days, [name="realManDays"], input[placeholder*="man"]');
      
      if (manDaysField) {
        manDaysField.value = '${manDays}';
        manDaysField.dispatchEvent(new Event('input', { bubbles: true }));
        manDaysField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Real man days set: ${manDays}`);
  }

  async setExpertiseLevel(level) {
    this.world.log(`Setting expertise level: ${level}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const expertiseField = modal?.querySelector('#expertise-level, [name="expertiseLevel"], select, input[placeholder*="expertise"]');
      
      if (expertiseField) {
        expertiseField.value = '${level}';
        expertiseField.dispatchEvent(new Event('input', { bubbles: true }));
        expertiseField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Expertise level set: ${level}`);
  }

  async setRiskMargin(margin) {
    this.world.log(`Setting risk margin: ${margin}`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const riskField = modal?.querySelector('#risk-margin, [name="riskMargin"], input[placeholder*="risk"], select[name*="risk"]');
      
      if (riskField) {
        riskField.value = '${margin}';
        riskField.dispatchEvent(new Event('input', { bubbles: true }));
        riskField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Risk margin set: ${margin}`);
  }

  async setNotes(notes) {
    this.world.log(`Setting feature notes`);
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const notesField = modal?.querySelector('#feature-notes, [name="notes"], textarea[placeholder*="notes"]');
      
      if (notesField) {
        notesField.value = \`${notes.replace(/`/g, '\\`')}\`;
        notesField.dispatchEvent(new Event('input', { bubbles: true }));
        notesField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    
    this.world.log(`✅ Feature notes set`);
  }

  // Calculation Triggers
  async triggerCalculation() {
    this.world.log('Triggering man days calculation');
    
    await this.world.executeScript(`
      if (window.featureManager && window.featureManager.calculateManDays) {
        window.featureManager.calculateManDays();
      } else {
        // Trigger calculation via input events
        const modal = document.querySelector('.modal.show');
        const inputs = modal?.querySelectorAll('input, select');
        inputs?.forEach(input => {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
    `);
    
    await this.world.pause(300); // Allow calculation to complete
    this.world.log('✅ Calculation triggered');
  }

  // Form Submission
  async saveFeature() {
    this.world.log('Saving feature');
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const saveBtn = modal?.querySelector('.btn-primary, button[type="submit"], .save-feature-btn');
      
      if (saveBtn) {
        saveBtn.click();
      } else if (window.featureManager && window.featureManager.saveFeature) {
        window.featureManager.saveFeature();
      }
    `);
    
    await this.world.pause(500); // Allow save to complete
    this.world.log('✅ Feature saved');
  }

  async deleteFeature() {
    this.world.log('Deleting feature');
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const deleteBtn = modal?.querySelector('.btn-danger, .delete-feature-btn');
      
      if (deleteBtn) {
        deleteBtn.click();
      }
    `);
    
    await this.world.pause(500);
    this.world.log('✅ Feature deleted');
  }

  // Field Value Getters
  async getFeatureId() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const idField = modal?.querySelector('#feature-id, [name="id"], input[type="text"]');
      return idField?.value || '';
    `);
    
    return result;
  }

  async getDescription() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const descField = modal?.querySelector('#feature-description, [name="description"], textarea');
      return descField?.value || '';
    `);
    
    return result;
  }

  async getCalculatedManDays() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const calculatedField = modal?.querySelector('#calculated-man-days, [name="manDays"], .calculated-value, input[readonly]');
      return calculatedField?.value || calculatedField?.textContent || '';
    `);
    
    return result;
  }

  async getRealManDays() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const manDaysField = modal?.querySelector('#real-man-days, [name="realManDays"]');
      return manDaysField?.value || '';
    `);
    
    return result;
  }

  async getExpertiseLevel() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const expertiseField = modal?.querySelector('#expertise-level, [name="expertiseLevel"]');
      return expertiseField?.value || '';
    `);
    
    return result;
  }

  async getRiskMargin() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const riskField = modal?.querySelector('#risk-margin, [name="riskMargin"]');
      return riskField?.value || '';
    `);
    
    return result;
  }

  // Validation Helpers
  async hasValidationErrors() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      return !!modal?.querySelector('.error, .text-danger, .invalid-feedback, .is-invalid');
    `);
    
    return result;
  }

  async getValidationErrors() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const errorElements = modal?.querySelectorAll('.error, .text-danger, .invalid-feedback') || [];
      return Array.from(errorElements).map(el => el.textContent?.trim()).filter(text => text);
    `);
    
    return result;
  }

  async getModalTitle() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      return modal?.querySelector('.modal-title, h4, h5')?.textContent?.trim() || '';
    `);
    
    return result;
  }

  // Form State
  async isModalOpen() {
    const result = await this.world.executeScript(`
      return !!document.querySelector('.modal.show, .modal[style*="display: block"]');
    `);
    
    return result;
  }

  async getAllFieldValues() {
    const result = await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const form = modal?.querySelector('form');
      const inputs = form?.querySelectorAll('input, select, textarea') || [];
      
      const fieldValues = {};
      inputs.forEach((input) => {
        const name = input.name || input.id || input.placeholder || 'unknown';
        fieldValues[name] = {
          value: input.value || '',
          type: input.type || input.tagName.toLowerCase(),
          required: input.required || false,
          readonly: input.readonly || false
        };
      });
      
      return fieldValues;
    `);
    
    return result;
  }

  async clearAllFields() {
    this.world.log('Clearing all form fields');
    
    await this.world.executeScript(`
      const modal = document.querySelector('.modal.show');
      const form = modal?.querySelector('form');
      if (form) {
        form.reset();
      }
    `);
    
    this.world.log('✅ All form fields cleared');
  }

  // Complete Feature Creation Helper
  async createFeature(featureData) {
    this.world.log(`Creating feature: ${featureData.id || 'New Feature'}`);
    
    await this.openModal();
    
    if (featureData.id) await this.setFeatureId(featureData.id);
    if (featureData.description) await this.setDescription(featureData.description);
    if (featureData.category) await this.selectCategory(featureData.category);
    if (featureData.type) await this.selectType(featureData.type);
    if (featureData.supplier) await this.selectSupplier(featureData.supplier);
    if (featureData.realManDays) await this.setRealManDays(featureData.realManDays);
    if (featureData.expertiseLevel) await this.setExpertiseLevel(featureData.expertiseLevel);
    if (featureData.riskMargin) await this.setRiskMargin(featureData.riskMargin);
    if (featureData.notes) await this.setNotes(featureData.notes);
    
    // Trigger calculation if needed
    if (featureData.realManDays || featureData.expertiseLevel || featureData.riskMargin) {
      await this.triggerCalculation();
    }
    
    await this.saveFeature();
    
    this.world.log(`✅ Feature created: ${featureData.id || 'New Feature'}`);
  }
}

module.exports = FeatureModal;