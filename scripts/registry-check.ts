/**
 * Registry integrity gate CLI (specs/001-scholarly-registry/contracts/relations-and-cli.md).
 *
 *   npm run registry:check [-- --data <dir>] [--mappings <dir>] [--assets <dir>] [--report <dir>]
 *
 * Exit codes: 0 gate passed · 1 one or more violations (report written) · 2 could not run.
 */
import { stat } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runGate } from '../src/registry/gate.ts';

async function main(): Promise<number> {
  let options: { data: string; report: string; mappings: string; assets?: string };
  try {
    const { values } = parseArgs({
      options: {
        data: { type: 'string', default: 'data/registry' },
        report: { type: 'string', default: 'reports' },
        mappings: { type: 'string', default: 'data/vocab-mappings' },
        assets: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
    options = {
      data: values.data,
      report: values.report,
      mappings: values.mappings,
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

  const { report, mdPath } = await runGate({
    dataDir: options.data,
    reportDir: options.report,
    mappingsDir: options.mappings,
  });

  const summary = `${report.counts.entities} entities, ${report.counts.violations} violation(s)`;
  if (report.status === 'pass') {
    console.log(`registry-check: pass (${summary})`);
    return 0;
  }
  console.error(`registry-check: FAIL (${summary}). See ${mdPath}`);
  return 1;
}

process.exitCode = await main();
