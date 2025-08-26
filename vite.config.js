import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
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
        entryFileNames: 'assets/main.js', // Nome fisso senza hash
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
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