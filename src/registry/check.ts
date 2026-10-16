import { loadRegistry, type LoadResult } from './load.js';
import { buildReport, type IntegrityReport, type Violation } from './report.js';
import type { ValidateOptions } from './rules/framework.js';
import { validateRegistry } from './validate.js';

/** Load a registry from disk, validate it, and fold load errors into the same report. */
export async function checkRegistry(rootDir: string, options: ValidateOptions = {}): Promise<IntegrityReport> {
  return (await loadAndCheck(rootDir, options)).report;
}

/** As `checkRegistry`, and hand back what was loaded for a caller that goes on to use the records. */
export async function loadAndCheck(
  rootDir: string,
  options: ValidateOptions = {},
): Promise<{ report: IntegrityReport; loaded: LoadResult }> {
  const loaded = await loadRegistry(rootDir);
  const { records, loadErrors, provenanceIndex, vocabularies, featureIndex, assetIndex } = loaded;
  // A whole registry on disk is checked for completeness too (ROOM-SET) unless the caller opts out.
  const report = validateRegistry(records, {
    ...options,
    completeness: options.completeness ?? true,
    provenanceIndex,
    vocabularies,
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
  return {
    report: buildReport([...report.violations, ...loadViolations], records.length, {
      now: options.now,
      commit: options.commit,
    }),
    loaded,
  };
}
