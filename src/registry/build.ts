import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAndCheck } from './check.js';
import { scanOutput } from './leak-scan.js';
import { redirects, renderRedirects } from './redirects.js';
import type { IntegrityReport, Violation } from './report.js';
import { reverseRelationships } from './reverse.js';
import { applyVocabularies } from './vocab-map.js';

export interface BuildResult {
  report: IntegrityReport;
  /** Files written under the output directory, relative to it. Empty when the gate failed. */
  written: string[];
  /** Leaks found in what was just written; the files are then removed again. */
  leaks: Violation[];
}

/**
 * The registry's part of a site build, with no framework in it: run the integrity gate and, only
 * if it passes, write what the site needs from the registry (`_redirects`, `data/relations.json`).
 * Records are judged by the shared meaning of any specialist term (TC-D016) before anything is
 * decided to be public, then the output is scanned for private values and non-public ids. A site
 * integration calls this and nothing else (T119).
 */
export async function buildSiteData(rootDir: string, outDir: string, options: { commit?: string } = {}): Promise<BuildResult> {
  const { report, loaded } = await loadAndCheck(rootDir, options);
  if (!report.pass) return { report, written: [], leaks: [] };

  const records = applyVocabularies(loaded.records, loaded.vocabularies);
  const relations = Object.fromEntries([...reverseRelationships(records)].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  const files: Record<string, string> = {
    '_redirects': renderRedirects(redirects(records).rules),
    'data/relations.json': `${JSON.stringify(relations, null, 2)}\n`,
  };

  const written: string[] = [];
  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(outDir, name)), { recursive: true });
    await writeFile(path.join(outDir, name), text);
    written.push(name);
  }
  const leaks = await scanOutput(outDir, records);
  if (leaks.length > 0) {
    await Promise.all(written.map((name) => rm(path.join(outDir, name), { force: true })));
    return { report, written: [], leaks };
  }
  return { report, written, leaks: [] };
}
