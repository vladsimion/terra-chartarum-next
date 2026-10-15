// @ts-check
import { defineConfig } from 'astro/config';

// Static output only (constitution Principle VII; ADR 0005).
export default defineConfig({
  site: 'https://terra-chartarum.org',
  output: 'static',
});
