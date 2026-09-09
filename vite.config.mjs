import { defineConfig } from 'vite';
import visualQaPlugin from './tests/visual-qa.cjs';

// Development preview only; GitHub Pages continues to serve the existing files.
export default defineConfig({
  plugins: [visualQaPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
});
