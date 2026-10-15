import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateRegistry } from './integrity.ts';
import { loadRecords } from './load.ts';
import { buildReport, toMarkdown, type IntegrityReport } from './report.ts';

export interface GateOptions {
  dataDir: string;
  reportDir: string;
}

export interface GateResult {
  report: IntegrityReport;
  jsonPath: string;
  mdPath: string;
}

/**
 * Load the registry, run the integrity check and write both reports.
 * Shared by the CLI and the site build so they can never disagree.
 */
export async function runGate(options: GateOptions): Promise<GateResult> {
  const loaded = await loadRecords(options.dataDir);
  const check = validateRegistry({ records: loaded.records, loadErrors: loaded.errors });
  const report = buildReport(check, { runId: randomUUID(), generatedAt: new Date() });

  await mkdir(options.reportDir, { recursive: true });
  const jsonPath = join(options.reportDir, 'integrity-report.json');
  const mdPath = join(options.reportDir, 'integrity-report.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, toMarkdown(report), 'utf8');

  return { report, jsonPath, mdPath };
}
