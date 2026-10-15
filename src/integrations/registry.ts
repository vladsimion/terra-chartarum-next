import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { runGate } from '../registry/gate.ts';
import { loadRecords } from '../registry/load.ts';
import { redirectsFor, toRedirectsFile } from '../registry/redirects.ts';

export interface RegistryIntegrationOptions {
  /** Directory holding registry records. */
  dataDir: string;
  /** Directory the integrity reports are written to. */
  reportDir: string;
}

/**
 * Connects the registry to the site build:
 * - at build start, runs the integrity gate and aborts before any page is
 *   generated if it fails (spec 001 US3, SC-001);
 * - after the build, writes `_redirects` from previous slugs (US1).
 */
export function registry(options: RegistryIntegrationOptions): AstroIntegration {
  return {
    name: 'terra-chartarum:registry',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        const { report, mdPath } = await runGate(options);
        if (report.status === 'fail') {
          throw new Error(
            `Registry integrity gate failed with ${report.counts.violations} violation(s). See ${mdPath}`,
          );
        }
        logger.info(`integrity gate passed (${report.counts.entities} entities, ${report.counts.references} references)`);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const { records } = await loadRecords(options.dataDir);
        const rules = redirectsFor(records);
        await writeFile(fileURLToPath(new URL('_redirects', dir)), toRedirectsFile(rules), 'utf8');
        logger.info(`wrote ${rules.length} redirect rule(s)`);
      },
    },
  };
}
