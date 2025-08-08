/**
 * Shared Browser Instance Manager
 * Evita multiple istanze del browser durante i test e2e
 */

class SharedBrowserManager {
  constructor() {
    this.sharedBrowser = null;
    this.sharedPage = null;
    this.isInitialized = false;
  }

  /**
   * Ottiene o crea istanza condivisa del browser
   */
  async getBrowser() {
    if (!this.sharedBrowser) {
      // Usa playwright che è già installato
      const { chromium } = require('playwright');
      const testConfig = require('./test-config');
      
      console.log('🚀 Avvio istanza condivisa del browser (Playwright)...');
      console.log(`   Mode: ${testConfig.browser.headless ? 'HEADLESS' : 'VISIBLE'}`);
      
      this.sharedBrowser = await chromium.launch({
        headless: testConfig.browser.headless,
        slowMo: testConfig.browser.slowMo, // Rallenta l'esecuzione se configurato
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      });

      // Gestisci la chiusura pulita
      process.on('SIGINT', () => this.cleanup());
      process.on('SIGTERM', () => this.cleanup());
      process.on('exit', () => this.cleanup());
    }
    
    return this.sharedBrowser;
  }

  /**
   * Ottiene o crea pagina condivisa
   */
  async getPage() {
    if (!this.sharedPage) {
      const browser = await this.getBrowser();
      const testConfig = require('./test-config');
      
      this.sharedPage = await browser.newPage();
      
      // Setup della pagina condivisa (playwright syntax)
      await this.sharedPage.setViewportSize(testConfig.browser.viewport);
      
      // Carica l'applicazione UNA VOLTA SOLA
      const path = require('path');
      const htmlPath = path.resolve(__dirname, testConfig.application.htmlPath);
      await this.sharedPage.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
      
      console.log('📄 Applicazione caricata nella pagina condivisa');
      
      // Aspetta che l'app si inizializzi
      await this.sharedPage.waitForTimeout(testConfig.application.initTimeout);
      
      this.isInitialized = true;
    }
    
    return this.sharedPage;
  }

  /**
   * Resetta lo stato dell'applicazione senza chiudere il browser
   */
  async resetAppState() {
    if (!this.sharedPage) return;
    
    const testConfig = require('./test-config');
    console.log('🔄 Reset stato applicazione...');
    
    try {
      // Esegui reset JavaScript nell'applicazione
      await this.sharedPage.evaluate(() => {
        // Chiudi modali
        const modals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
        modals.forEach(modal => {
          modal.style.display = 'none';
          modal.classList.remove('show');
        });
        
        // Reset dati progetto
        if (window.app && window.app.newProject) {
          window.app.newProject();
        }
        
        // Reset navigazione
        if (window.navigationManager && window.navigationManager.showSection) {
          window.navigationManager.showSection('features');
        }
        
        // Reset form
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());
        
        return true;
      });
      
      // Pausa configurabile per permettere al reset di completarsi
      await this.sharedPage.waitForTimeout(testConfig.execution.pauseBetweenTests);
      
    } catch (error) {
      console.warn('⚠️  Errore durante il reset:', error.message);
    }
  }

  /**
   * Cleanup finale - chiude browser alla fine di tutti i test
   */
  async cleanup() {
    if (this.sharedBrowser) {
      console.log('🧹 Chiusura browser condiviso...');
      try {
        await this.sharedBrowser.close();
        this.sharedBrowser = null;
        this.sharedPage = null;
        this.isInitialized = false;
      } catch (error) {
        console.warn('⚠️  Errore durante cleanup:', error.message);
      }
    }
  }

  /**
   * Prende screenshot per debugging
   */
  async takeScreenshot(filename) {
    if (!this.sharedPage) return;
    
    const fs = require('fs');
    const path = require('path');
    
    const screenshotsDir = path.join(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotsDir, `${filename}-${Date.now()}.png`);
    await this.sharedPage.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`📸 Screenshot salvato: ${screenshotPath}`);
    return screenshotPath;
  }
}

// Esporta istanza singleton
const sharedBrowserManager = new SharedBrowserManager();
module.exports = sharedBrowserManager;