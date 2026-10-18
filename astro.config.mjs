import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import { registryIntegration } from './src/integrations/registry.ts';

/*
 * Static output only (Constitution VII, spec 002 FR-008): every page is generated at build time and
 * deployed to a CDN. No adapter. The registry integration runs the integrity gate before any page is generated and
 * writes the registry's site data after the build (spec 001 T119b, spec 002 US4).
 * Trailing slashes are kept so a page at /about/ is one directory with an index.html, which is also
 * how the destination list in src/shell/destinations.ts writes its hrefs.
 */
export default defineConfig({
  output: 'static',
  // the essay end-to-end build writes elsewhere so it never overwrites the shell build
  outDir: process.env.ASTRO_OUT_DIR ?? './dist',
  site: 'https://terra-chartarum.org',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [registryIntegration(), mdx()],
  devToolbar: { enabled: false },
});
