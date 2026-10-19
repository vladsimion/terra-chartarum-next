import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { checkRegistry } from '../registry/check.js';
import type { CommandResult } from '../registry/promote.js';
import { toJson } from '../registry/report.js';
import { ImportError } from './context.js';
import { ExtractionError } from './extract-ts.js';
import { runProfile } from './profile.js';
import { readSnapshot } from './snapshot.js';
import { apply, compare, writeStaging } from './stage.js';
import { UnmappedTermError } from './vocab.js';

export interface ImportLegacyOptions {
  snapshot?: string;
  profile?: string;
  out?: string;
  apply: boolean;
  dryRun: boolean;
  sha?: string;
  date?: string;
}

/**
 * `registry import-legacy` (spec 008 contracts/cli-additions.md): read the pinned snapshot, run the
 * profile, stage the records, report, and with `--apply` add the new ones to the registry. Exit 0 when
 * the import completed (the gate's report is stamped with the snapshot's date and commit, so staging is
 * byte-identical for one snapshot); 1 on a failed extraction, an unmapped term or a collision (nothing written);
 * 2 on a usage error. The integrity gate's verdict over the staging folder is printed, not an exit code.
 */
export async function importLegacy(root: string, options: ImportLegacyOptions): Promise<CommandResult> {
  const usage = (message: string): CommandResult => ({ code: 2, stdout: '', stderr: `registry import-legacy: ${message}\n` });
  if (!options.snapshot) return usage('--snapshot <path> is needed');
  if (options.profile !== 'v1') return usage('--profile v1 is needed (the only profile)');
  if (!options.out && !options.dryRun) return usage('--out <dir> is needed (the staging folder)');
  if (options.apply && options.dryRun) return usage('--apply and --dry-run cannot be combined');

  try {
    const snapshot = await readSnapshot(options.snapshot, { sha: options.sha, date: options.date });
    const result = await runProfile(snapshot, { root });
    const report = await compare(result, root);
    const lines = [
      `registry import-legacy: ${options.dryRun ? 'would stage' : 'staged'} ${report.created.length} new, ${report.skipped.length} already present, ${report.changed_upstream.length} changed upstream (snapshot ${snapshot.sha.slice(0, 7)})`,
      ...report.dropped.map((d) => `  dropped ${d.field} x${d.count}`),
      ...report.changed_upstream.map((c) => `  changed upstream ${c.id}: ${c.fields.join(', ')}`),
    ];
    if (!options.dryRun) {
      await writeStaging(result, report, options.out as string);
      const gate = await checkRegistry(options.out as string, { completeness: false, now: new Date(snapshot.date), commit: snapshot.sha });
      await writeFile(path.join(options.out as string, 'integrity-report.json'), toJson(gate));
      lines.push(`staging integrity gate: ${gate.pass ? 'PASS' : 'FAIL'} - ${gate.counts.entities} entities, ${gate.counts.errors} errors, ${gate.counts.warnings} warnings`);
    }
    if (options.apply) {
      const written = await apply(result, root);
      lines.push(`applied ${written.length} files; nothing existing was touched`);
    }
    return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' };
  } catch (error) {
    if (error instanceof ExtractionError || error instanceof ImportError || error instanceof UnmappedTermError) {
      return { code: 1, stdout: '', stderr: `registry import-legacy: ${error.message}; nothing was written\n` };
    }
    throw error;
  }
}
