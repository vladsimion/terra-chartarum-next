import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { buildSiteData } from '../registry/build.js';
import { checkRegistry } from '../registry/check.js';
import type { IntegrityReport } from '../registry/report.js';
import { hasContentDir, registryRoot } from '../shell/public-records.js';

/*
 * Connects the registry to the site build (spec 001 T119b, spec 002 contracts/registry-integration.md):
 * the integrity gate runs before any page is generated and stops the build on an error, and after
 * the build the registry's own build step writes `_redirects` and `data/relations.json`. With no
 * `content/` directory yet the shell builds on its own, and both hooks say so and carry on.
 */
function failure(report: IntegrityReport): Error {
  const errors = report.violations.filter((v) => v.severity === 'error');
  const lines = errors.slice(0, 20).map((v) => `  ${v.rule} ${v.entity ?? '(unparsed)'} [${v.file}]${v.field ? ` ${v.field}` : ''}`);
  const more = errors.length > 20 ? `\n  … and ${errors.length - 20} more` : '';
  return new Error(`registry integrity gate failed with ${errors.length} error(s):\n${lines.join('\n')}${more}`);
}

export function registryIntegration(options: { root?: string } = {}): AstroIntegration {
  const root = options.root ?? registryRoot();
  return {
    name: 'terra-chartarum:registry',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        if (!(await hasContentDir(root))) {
          logger.info('no content/ directory yet; skipping the registry gate');
          return;
        }
        const report = await checkRegistry(root);
        if (!report.pass) throw failure(report);
        logger.info(`integrity gate passed: ${report.counts.entities} entities, ${report.counts.warnings} warning(s)`);
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!(await hasContentDir(root))) {
          logger.info('no content/ directory yet; no site data written');
          return;
        }
        const { report, written, leaks } = await buildSiteData(root, fileURLToPath(dir));
        if (!report.pass) throw failure(report);
        if (leaks.length > 0) throw new Error(`the site data leaks a private value or a non-public id (${leaks.length}); nothing was kept`);
        logger.info(`wrote ${written.join(', ')}`);
      },
    },
  };
}
