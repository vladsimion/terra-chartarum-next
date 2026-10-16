import { buildReport, type IntegrityReport, type Violation } from './report.js';
import { toViolation, type RuleContext, type ValidateOptions } from './rules/framework.js';
import { ALL_RULES } from './rules/index.js';
import type { RegistryRecord } from './types.js';
import { applyVocabularies } from './vocab-map.js';

/** Canonical id -> record. The first record wins; `ID-DUPLICATE` reports the rest. */
function buildIndex(records: readonly RegistryRecord[]): Map<string, RegistryRecord> {
  const index = new Map<string, RegistryRecord>();
  for (const record of records) {
    if (!index.has(record.id)) index.set(record.id, record);
  }
  return index;
}

/**
 * Seam 2: every rule, pure, no I/O. Deterministic for equal input and options.
 */
export function validateRegistry(stored: readonly RegistryRecord[], options: ValidateOptions = {}): IntegrityReport {
  // Rules judge the shared meaning of a specialist term; the stored records stay as written.
  const records = applyVocabularies(stored, options.vocabularies);
  const ctx: RuleContext = { records, index: buildIndex(records), options };
  const violations: Violation[] = [];
  for (const rule of ALL_RULES) {
    if (rule.completeness && !options.completeness) continue;
    for (const finding of rule.check(ctx)) violations.push(toViolation(rule, finding));
  }
  return buildReport(violations, records.length, { now: options.now, commit: options.commit });
}
