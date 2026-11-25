import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { writeSecurityHeaders } from '../security/headers.js';

/*
 * Writes the site's security headers to `_headers` once every page is built, so the policy allows
 * exactly the inline scripts this build produced (src/security/headers.ts).
 */
export function securityHeadersIntegration(): AstroIntegration {
  return {
    name: 'terra-chartarum:security-headers',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const hashes = writeSecurityHeaders(fileURLToPath(dir));
        logger.info(`wrote _headers (${hashes.length} inline script hash(es))`);
      },
    },
  };
}
