/**
 * Test Helper Utilities
 * Common functions for test setup, data manipulation, and validation
 */

class TestHelpers {
  /**
   * Load fixture data from JSON files
   */
  static loadFixture(type, name) {
    const path = require('path');
    const fs = require('fs');
    
    const fixturePath = path.join(__dirname, '../fixtures', `${type}.json`);
    
    try {
      if (fs.existsSync(fixturePath)) {
        const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        return fixtures[name] || null;
      }
    } catch (error) {
      console.warn(`Could not load fixture ${type}/${name}:`, error.message);
    }
    
    return null;
  }

  /**
   * Generate random test data
   */
  static generateTestData() {
    const randomId = () => `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const randomText = (length = 20) => Math.random().toString(36).substring(2, length + 2);
    
    return {
      project: {
        name: `Test Project ${randomText(8)}`,
        description: `Generated test project for ${new Date().toISOString()}`,
        version: '1.0.0',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      feature: {
        id: randomId(),
        description: `Test Feature ${randomText(15)}`,
        category: 'Test Category',
        type: 'Test Type',
        supplier: 'Test Team',
        realManDays: Math.floor(Math.random() * 20) + 1,
        expertiseLevel: Math.floor(Math.random() * 40) + 60, // 60-100
        riskMargin: Math.floor(Math.random() * 30) + 10, // 10-40
        notes: `Test notes for ${randomId()}`
      }
    };
  }

  /**
   * Calculate expected man days using the application formula
   */
  static calculateExpectedManDays(realManDays, expertiseLevel, riskMargin) {
    if (expertiseLevel === 0) {
      return null; // Division by zero case
    }
    
    return (realManDays * (100 + riskMargin)) / expertiseLevel;
  }

  /**
   * Validate feature data structure
   */
  static validateFeature(feature) {
    const errors = [];
    
    if (!feature.id || feature.id.trim().length === 0) {
      errors.push('Feature ID is required');
    }
    
    if (!feature.description || feature.description.trim().length < 3) {
      errors.push('Feature description must be at least 3 characters');
    }
    
    if (!feature.category || feature.category.trim().length === 0) {
      errors.push('Category is required');
    }
    
    if (typeof feature.realManDays !== 'number' || feature.realManDays <= 0) {
      errors.push('Real man days must be a positive number');
    }
    
    if (typeof feature.expertiseLevel !== 'number' || feature.expertiseLevel < 0 || feature.expertiseLevel > 100) {
      errors.push('Expertise level must be between 0 and 100');
    }
    
    if (typeof feature.riskMargin !== 'number' || feature.riskMargin < 0) {
      errors.push('Risk margin must be non-negative');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate project data structure
   */
  static validateProject(project) {
    const errors = [];
    
    if (!project.name || project.name.trim().length === 0) {
      errors.push('Project name is required');
    }
    
    if (!project.version || project.version.trim().length === 0) {
      errors.push('Project version is required');
    }
    
    if (!Array.isArray(project.features)) {
      errors.push('Project features must be an array');
    }
    
    if (!project.phases || typeof project.phases !== 'object') {
      errors.push('Project phases must be an object');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Create CSV string from array of objects
   */
  static arrayToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Escape CSV values
    const escapeCSVValue = (value) => {
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      
      // If contains comma, newline, or quotes, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };
    
    // Create CSV
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => escapeCSVValue(row[header])).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }

  /**
   * Parse CSV string to array of objects
   */
  static parseCSV(csvString) {
    const lines = csvString.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return [];
    }
    
    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return data;
  }

  /**
   * Deep clone object (simple implementation)
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Compare two objects for deep equality
   */
  static deepEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Generate version ID based on existing versions
   */
  static generateVersionId(existingVersions = []) {
    const versionNumbers = existingVersions
      .map(v => v.id)
      .filter(id => id && id.startsWith('V'))
      .map(id => parseInt(id.substring(1)))
      .filter(num => !isNaN(num));
    
    const nextNumber = versionNumbers.length > 0 ? Math.max(...versionNumbers) + 1 : 1;
    return `V${nextNumber}`;
  }

  /**
   * Generate checksum for data integrity
   */
  static generateChecksum(data) {
    const dataString = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Format date for display
   */
  static formatDate(date, format = 'yyyy-mm-dd') {
    const d = new Date(date);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    switch (format) {
      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`;
      case 'yyyy-mm-dd hh:mm':
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      case 'yyyy-mm-dd hh:mm:ss':
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      default:
        return d.toISOString();
    }
  }

  /**
   * Sleep/pause execution
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation(operation, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Sanitize filename for export
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Calculate project statistics
   */
  static calculateProjectStats(project) {
    const features = project.features || [];
    
    const stats = {
      featureCount: features.length,
      totalRealManDays: features.reduce((sum, f) => sum + (f.realManDays || 0), 0),
      totalCalculatedManDays: features.reduce((sum, f) => sum + (f.manDays || 0), 0),
      totalCost: features.reduce((sum, f) => sum + (f.cost || 0), 0),
      avgExpertiseLevel: 0,
      avgRiskMargin: 0,
      categories: {},
      suppliers: {}
    };
    
    if (features.length > 0) {
      stats.avgExpertiseLevel = features.reduce((sum, f) => sum + (f.expertiseLevel || 0), 0) / features.length;
      stats.avgRiskMargin = features.reduce((sum, f) => sum + (f.riskMargin || 0), 0) / features.length;
    }
    
    // Category breakdown
    features.forEach(feature => {
      const category = feature.category || 'Uncategorized';
      if (!stats.categories[category]) {
        stats.categories[category] = { count: 0, manDays: 0, cost: 0 };
      }
      stats.categories[category].count++;
      stats.categories[category].manDays += feature.manDays || 0;
      stats.categories[category].cost += feature.cost || 0;
    });
    
    // Supplier breakdown
    features.forEach(feature => {
      const supplier = feature.supplier || 'Unknown';
      if (!stats.suppliers[supplier]) {
        stats.suppliers[supplier] = { count: 0, manDays: 0, cost: 0 };
      }
      stats.suppliers[supplier].count++;
      stats.suppliers[supplier].manDays += feature.manDays || 0;
      stats.suppliers[supplier].cost += feature.cost || 0;
    });
    
    return stats;
  }

  /**
   * Validate project phases structure
   */
  static validatePhases(phases) {
    const expectedPhases = [
      'functionalSpec', 'techSpec', 'development', 'sit',
      'uat', 'vapt', 'consolidation', 'postGoLive'
    ];
    
    const errors = [];
    
    if (!phases || typeof phases !== 'object') {
      errors.push('Phases must be an object');
      return { isValid: false, errors };
    }
    
    expectedPhases.forEach(phaseKey => {
      if (!phases[phaseKey]) {
        errors.push(`Missing phase: ${phaseKey}`);
      } else {
        const phase = phases[phaseKey];
        if (typeof phase.manDays !== 'number') {
          errors.push(`Phase ${phaseKey} must have numeric manDays`);
        }
        if (typeof phase.cost !== 'number') {
          errors.push(`Phase ${phaseKey} must have numeric cost`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Mock Electron IPC responses for testing
   */
  static mockElectronIPC() {
    // Mock for testing when Electron isn't available
    if (typeof window !== 'undefined' && !window.electronAPI) {
      window.electronAPI = {
        saveProject: (data) => Promise.resolve({ success: true }),
        loadProject: (path) => Promise.resolve({ success: true, data: null }),
        showSaveDialog: () => Promise.resolve({ canceled: false, filePath: '/tmp/test.json' }),
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: ['/tmp/test.json'] }),
        exportData: (data, format) => Promise.resolve({ success: true })
      };
    }
  }

  /**
   * Create mock data for comprehensive testing
   */
  static createMockProject(complexity = 'simple') {
    const baseProject = {
      name: `Mock ${complexity} Project`,
      description: `Generated mock project for ${complexity} testing`,
      version: '1.0.0',
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      features: [],
      phases: {
        functionalSpec: { manDays: 0, cost: 0, calculated: false },
        techSpec: { manDays: 0, cost: 0, calculated: false },
        development: { manDays: 0, cost: 0, calculated: true },
        sit: { manDays: 0, cost: 0, calculated: false },
        uat: { manDays: 0, cost: 0, calculated: false },
        vapt: { manDays: 0, cost: 0, calculated: false },
        consolidation: { manDays: 0, cost: 0, calculated: false },
        postGoLive: { manDays: 0, cost: 0, calculated: false }
      },
      coverage: 0,
      versionHistory: []
    };
    
    // Add features based on complexity
    let featureCount;
    switch (complexity) {
      case 'simple':
        featureCount = 2;
        break;
      case 'medium':
        featureCount = 5;
        break;
      case 'complex':
        featureCount = 10;
        break;
      default:
        featureCount = 1;
    }
    
    for (let i = 1; i <= featureCount; i++) {
      const feature = this.generateTestData().feature;
      feature.id = `MOCK-${String(i).padStart(3, '0')}`;
      feature.description = `Mock Feature ${i} for ${complexity} testing`;
      
      // Calculate man days
      feature.manDays = this.calculateExpectedManDays(
        feature.realManDays,
        feature.expertiseLevel,
        feature.riskMargin
      );
      
      feature.cost = feature.manDays * 100; // $100 per man day
      
      baseProject.features.push(feature);
    }
    
    // Update development phase
    const totalManDays = baseProject.features.reduce((sum, f) => sum + f.manDays, 0);
    baseProject.phases.development.manDays = totalManDays;
    baseProject.phases.development.cost = totalManDays * 100;
    
    return baseProject;
  }
}

module.exports = TestHelpers;