/**
 * Registry integrity gate CLI (specs/001-scholarly-registry/contracts/relations-and-cli.md).
 *
 *   npm run registry:check [-- --data <dir>] [--assets <dir>] [--report <dir>]
 *
 * Exit codes: 0 gate passed · 1 one or more violations (report written) · 2 could not run.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { validateRegistry } from '../src/registry/integrity.ts';
import { loadRecords } from '../src/registry/load.ts';
import { buildReport, toMarkdown } from '../src/registry/report.ts';

async function main(): Promise<number> {
  let options: { data: string; report: string; assets?: string };
  try {
    const { values } = parseArgs({
      options: {
        data: { type: 'string', default: 'data/registry' },
        report: { type: 'string', default: 'reports' },
        assets: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
    options = {
      data: values.data,
      report: values.report,
      ...(values.assets === undefined ? {} : { assets: values.assets }),
    };
  } catch (error) {
    console.error(`registry-check: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  try {
    if (!(await stat(options.data)).isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`registry-check: cannot read data directory "${options.data}"`);
    return 2;
  }

  const loaded = await loadRecords(options.data);
  const check = validateRegistry({ records: loaded.records, loadErrors: loaded.errors });
  const report = buildReport(check, { runId: randomUUID(), generatedAt: new Date() });

  await mkdir(options.report, { recursive: true });
  const jsonPath = join(options.report, 'integrity-report.json');
  const mdPath = join(options.report, 'integrity-report.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, toMarkdown(report), 'utf8');

  const summary = `${report.counts.entities} entities, ${report.counts.violations} violation(s)`;
  if (report.status === 'pass') {
    console.log(`registry-check: pass (${summary})`);
    return 0;
  }
  console.error(`registry-check: FAIL (${summary}). See ${mdPath}`);
  return 1;
}

process.exitCode = await main();
