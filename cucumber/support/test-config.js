/**
 * Configurazione Test E2E
 * Controlla il comportamento del browser e dell'applicazione durante i test
 */

module.exports = {
  // Browser Settings
  browser: {
    // Headless mode - imposta false per vedere il browser durante i test
    headless: process.env.HEADLESS !== 'false',
    
    // Velocità di esecuzione (milliseconds)
    slowMo: parseInt(process.env.SLOW_MO || '0'),
    
    // Debug mode - più verbose logging
    debug: process.env.DEBUG === 'true',
    
    // Timeout per le operazioni
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
    
    // Dimensioni viewport
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
      height: parseInt(process.env.VIEWPORT_HEIGHT || '720')
    }
  },
  
  // Test Execution Settings
  execution: {
    // Pausa tra i test per permettere al browser di resettare
    pauseBetweenTests: parseInt(process.env.PAUSE_BETWEEN_TESTS || '500'),
    
    // Screenshot su failure
    screenshotOnFailure: process.env.SCREENSHOT_ON_FAILURE !== 'false',
    
    // Directory per report e screenshot
    reportsDir: './reports',
    screenshotsDir: './reports/screenshots'
  },
  
  // Application Settings
  application: {
    // Path dell'app HTML
    htmlPath: '../../src/renderer/index.html',
    
    // Tempo di attesa per l'inizializzazione dell'app
    initTimeout: parseInt(process.env.APP_INIT_TIMEOUT || '5000'),
    
    // Reset completo tra i test o solo stato
    fullResetBetweenTests: process.env.FULL_RESET === 'true'
  }
};

// Utility per logging configurazione
if (process.env.DEBUG === 'true') {
  console.log('🔧 Test Configuration:');
  console.log(`   Headless: ${module.exports.browser.headless}`);
  console.log(`   Slow Motion: ${module.exports.browser.slowMo}ms`);
  console.log(`   Viewport: ${module.exports.browser.viewport.width}x${module.exports.browser.viewport.height}`);
  console.log(`   Pause Between Tests: ${module.exports.execution.pauseBetweenTests}ms`);
}