import { randomUUID } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { validateRegistry } from './integrity.ts';
import { loadRecords } from './load.ts';
import { loadVocabMappings } from './mappings.ts';
import { buildReport, toMarkdown, type IntegrityReport } from './report.ts';

export interface GateOptions {
  dataDir: string;
  reportDir: string;
  /** Specialist vocabulary mappings; defaults to `data/vocab-mappings`. */
  mappingsDir?: string;
  /** Directory of publishable assets; defaults to `public`. */
  assetsDir?: string;
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
  const vocabMappings = await loadVocabMappings(options.mappingsDir ?? 'data/vocab-mappings');
  const assets = await listAssets(options.assetsDir ?? 'public');
  const check = validateRegistry({ records: loaded.records, loadErrors: loaded.errors, vocabMappings, assets });
  const report = buildReport(check, { runId: randomUUID(), generatedAt: new Date() });

  await mkdir(options.reportDir, { recursive: true });
  const jsonPath = join(options.reportDir, 'integrity-report.json');
  const mdPath = join(options.reportDir, 'integrity-report.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, toMarkdown(report), 'utf8');

  return { report, jsonPath, mdPath };
}

/** Every file under the assets directory, as `/`-separated relative paths. A missing directory has no assets. */
async function listAssets(dir: string): Promise<Set<string>> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return new Set(
      entries.filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath, e.name)).split(sep).join('/')),
    );
  } catch {
    return new Set();
  }
}
