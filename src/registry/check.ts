import { loadRegistry } from './load.js';
import { buildReport, type IntegrityReport, type Violation } from './report.js';
import type { ValidateOptions } from './rules/framework.js';
import { validateRegistry } from './validate.js';

/** Load a registry from disk, validate it, and fold load errors into the same report. */
export async function checkRegistry(rootDir: string, options: ValidateOptions = {}): Promise<IntegrityReport> {
  const { records, loadErrors, provenanceIndex, featureIndex, assetIndex } = await loadRegistry(rootDir);
  // A whole registry on disk is checked for completeness too (ROOM-SET) unless the caller opts out.
  const report = validateRegistry(records, {
    ...options,
    completeness: options.completeness ?? true,
    provenanceIndex,
    featureIndex,
    assetIndex,
  });
  const loadViolations: Violation[] = loadErrors.map((e) => ({
    rule: 'LOAD-PARSE',
    severity: 'error',
    entity: null,
    file: e.file,
    field: null,
    value: e.message,
    expected: 'a file that parses and matches the expected structure',
  }));
  return buildReport([...report.violations, ...loadViolations], records.length, {
    now: options.now,
    commit: options.commit,
  });
}
