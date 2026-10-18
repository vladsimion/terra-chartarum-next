import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { buildAtlas } from '../atlas/build/write-outputs.js';
import { hasContentDir, registryRoot } from '../shell/public-records.js';

/*
 * Connects the Atlas build to the site build (spec 005 contracts/build-outputs.md). It runs after
 * the registry's own hook, reads public layers only, and fails the build, writing nothing, on any
 * build-time check of contracts/atlas-rule-ids.md. With no `content/` directory it says so and carries on.
 */
export function atlasIntegration(options: { root?: string } = {}): AstroIntegration {
  const root = options.root ?? registryRoot();
  return {
    name: 'terra-chartarum:atlas',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (!(await hasContentDir(root))) {
          logger.info('no content/ directory yet; no Atlas data written');
          return;
        }
        const { written, failures } = await buildAtlas({ root, outDir: fileURLToPath(dir) });
        if (failures.length > 0) {
          const lines = failures.slice(0, 20).map((f) => `  ${f.check} ${f.layer}${f.feature === undefined ? '' : ` feature ${f.feature}`}: ${f.message}`);
          const more = failures.length > 20 ? `\n  … and ${failures.length - 20} more` : '';
          throw new Error(`the Atlas build failed ${failures.length} check(s); nothing was written:\n${lines.join('\n')}${more}`);
        }
        logger.info(`wrote ${written.length} Atlas file(s)`);
      },
    },
  };
}
