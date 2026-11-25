import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import { allmapsMaplibre } from './src/atlas/build/allmaps-vite.ts';
import { atlasIntegration } from './src/integrations/atlas.ts';
import { registryIntegration } from './src/integrations/registry.ts';

/*
 * Static output only (Constitution VII, spec 002 FR-008): every page is generated at build time and
 * deployed to a CDN. No adapter. The registry integration runs the integrity gate before any page is generated and
 * writes the registry's site data after the build (spec 001 T119b, spec 002 US4); the Atlas integration then
 * writes the layer assets and indexes (spec 005).
 * Trailing slashes are kept so a page at /about/ is one directory with an index.html, which is also
 * how the destination list in src/shell/destinations.ts writes its hrefs.
 */
export default defineConfig({
  output: 'static',
  // the essay end-to-end build writes elsewhere so it never overwrites the shell build
  outDir: process.env.ASTRO_OUT_DIR ?? './dist',
  /*
   * The content layer's store records the absolute path of every entry it loads. A preview of a held
   * essay builds from a fresh temporary copy of the registry each time, so it takes a cache of its
   * own: sharing the usual one would leave entries pointing at a directory that has been thrown
   * away, and clearing the usual one would pull the cache out from under everything else that uses it.
   */
  cacheDir: process.env.ASTRO_CACHE_DIR ?? './node_modules/.astro',
  site: 'https://terra-chartarum.org',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [registryIntegration(), atlasIntegration(), mdx()],
  vite: {
    // the overlay plugin imports MapLibre from the copy the Atlas serves, not a second one (src/atlas/build/allmaps-vite.ts)
    plugins: [allmapsMaplibre()],
    // and ships as one chunk of its own, named, loaded only when a map overlay is added (spec 005 US6)
    build: { rollupOptions: { output: { manualChunks: (id) => (id.includes('/node_modules/@allmaps/') ? 'allmaps' : undefined) } } },
  },
  devToolbar: { enabled: false },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ],
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
      styleDirective: {
        resources: ["'self'", "'unsafe-hashes'"],
        // OpenSeadragon appends one fixed <style data-openseadragon-mobile-css> when a viewer opens
        // (spec 004 deep-zoom viewer). If an upgrade changes that text, tests/collection/e2e/csp.spec.ts fails
        // and names the new hash.
        // The anchor essay keeps one style attribute, `max-height:70vh;width:auto` on its core-sample SVG
        // (content/essay/essay-000001.mdx; ADR 0017 ports it as it is). 'unsafe-hashes' admits that one value
        // and no other attribute; tests/essays/e2e-anchor/csp.spec.ts fails if it changes.
        hashes: ['sha256-9xTiqzfwFaL2SGb1rmr8gysEwVVjIvqWAgmZgqFqpEE=', 'sha256-JfE7wkQPv91y3/uhvOje9Pj1nkTCfQrHZHLCMA93oXw='],
      },
    },
  },
});
