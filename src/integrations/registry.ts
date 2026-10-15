import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { loadRecords } from '../registry/load.ts';
import { redirectsFor, toRedirectsFile } from '../registry/redirects.ts';

export interface RegistryIntegrationOptions {
  /** Directory holding registry records. Defaults to `data/registry`. */
  dataDir: string;
}

/**
 * Connects the registry to the site build. For now it writes `_redirects`
 * from previous slugs (spec 001 US1); the integrity gate and relations index
 * join it in later user stories.
 */
export function registry(options: RegistryIntegrationOptions): AstroIntegration {
  return {
    name: 'terra-chartarum:registry',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { records } = await loadRecords(options.dataDir);
        const rules = redirectsFor(records);
        await writeFile(fileURLToPath(new URL('_redirects', dir)), toRedirectsFile(rules), 'utf8');
        logger.info(`wrote ${rules.length} redirect rule(s)`);
      },
    },
  };
}
