import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { runGate } from '../registry/gate.ts';
import { loadRecords } from '../registry/load.ts';
import { loadVocabMappings } from '../registry/mappings.ts';
import { redirectsFor, toRedirectsFile } from '../registry/redirects.ts';
import { buildRelations } from '../registry/relations.ts';

export interface RegistryIntegrationOptions {
  /** Directory holding registry records. */
  dataDir: string;
  /** Directory the integrity reports are written to. */
  reportDir: string;
  /** Specialist vocabulary mappings; defaults to `data/vocab-mappings`. */
  mappingsDir?: string;
}

/**
 * Connects the registry to the site build:
 * - at build start, runs the integrity gate and aborts before any page is
 *   generated if it fails (spec 001 US3, SC-001);
 * - after the build, writes `_redirects` from previous slugs (US1) and the
 *   relations index (US4): released-only into the site, the full editor view
 *   into the report directory, which is never published.
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
        const vocabMappings = await loadVocabMappings(options.mappingsDir ?? 'data/vocab-mappings');
        const outDir = fileURLToPath(dir);

        const rules = redirectsFor(records, { vocabMappings });
        await writeFile(join(outDir, '_redirects'), toRedirectsFile(rules), 'utf8');
        logger.info(`wrote ${rules.length} redirect rule(s)`);

        const publicRelations = buildRelations(records, { releasedOnly: true, vocabMappings });
        await mkdir(join(outDir, 'data'), { recursive: true });
        await writeFile(join(outDir, 'data/relations.json'), `${JSON.stringify(publicRelations, null, 2)}\n`, 'utf8');
        await mkdir(options.reportDir, { recursive: true });
        await writeFile(
          join(options.reportDir, 'relations.full.json'),
          `${JSON.stringify(buildRelations(records, { releasedOnly: false, vocabMappings }), null, 2)}\n`,
          'utf8',
        );
        logger.info(`wrote relations for ${Object.keys(publicRelations).length} released entities`);
      },
    },
  };
}
