import { defineConfig } from 'astro/config';

/*
 * Static output only (Constitution VII, spec 002 FR-008): every page is generated at build time and
 * deployed to a CDN. No adapter, no integrations yet; the registry integration arrives with T040.
 * Trailing slashes are kept so a page at /about/ is one directory with an index.html, which is also
 * how the destination list in src/shell/destinations.ts writes its hrefs.
 */
export default defineConfig({
  output: 'static',
  site: 'https://terra-chartarum.org',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
