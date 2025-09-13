import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: './assets',  // Output direttamente in src/renderer/assets
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/react/main.tsx')
      },
      external: ['react', 'react-dom'], // Don't bundle React - use global
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        format: 'iife', // Immediately Invoked Function Expression
        name: 'ReactComponents',
        entryFileNames: 'main.js', // Nome fisso senza hash, direttamente in assets/
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 3000
  },
  base: './',
  define: {
    global: 'globalThis'
  }
});