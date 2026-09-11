import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Fixtures are edited during visual QA; a Vite config reload must refresh them.
delete require.cache[require.resolve('./tests/visual-qa.cjs')];
const visualQaPlugin = require('./tests/visual-qa.cjs');

// Development preview only; GitHub Pages continues to serve the existing files.
export default defineConfig({
  plugins: [visualQaPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
});
