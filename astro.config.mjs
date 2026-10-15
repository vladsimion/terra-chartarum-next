// @ts-check
import { defineConfig } from 'astro/config';
import { registry } from './src/integrations/registry.ts';

// Static output only (constitution Principle VII; ADR 0005).
// TC_REGISTRY_DIR, TC_OUT_DIR and TC_REPORT_DIR let tests build against a temporary registry.
export default defineConfig({
  site: 'https://terra-chartarum.org',
  output: 'static',
  outDir: process.env.TC_OUT_DIR ?? './dist',
  integrations: [
    registry({
      dataDir: process.env.TC_REGISTRY_DIR ?? 'data/registry',
      reportDir: process.env.TC_REPORT_DIR ?? 'reports',
    }),
  ],
});
