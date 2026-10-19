import { knownFields } from '../schemas/index.js';
import { defineRule, type Finding } from './framework.js';

/**
 * Minimum fields per family (data-model.md "Family fields"). `source.is_finding_aid` defaults to
 * false and is not listed. From `ready_for_build` a missing field is an error; before that a
 * warning, so early research can be registered without being blocked (ADR 0006 item 6).
 */
const REQUIRED: Record<string, string[]> = {
  map: ['makers', 'witness_kind'],
  cartographer: ['kind'],
  place: ['place_type'],
  dataset: ['version'],
  layer: ['role', 'asset', 'dataset'],
  bibliography_entry: ['csl'],
};

function present(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' ? value.trim() !== '' : value !== undefined && value !== null;
}

export const famRequired = defineRule({
  id: 'FAM-REQUIRED',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      for (const field of REQUIRED[record.family] ?? []) {
        // only a single physical object has a witness (ADR 0016); a work or a concept is not one
        if (record.family === 'map' && field === 'witness_kind' && (record.record_scope === 'work' || record.record_scope === 'concept')) continue;
        if (!present(record[field])) {
          findings.push({ record, field, value: null, expected: `${field} on every ${record.family} record` });
        }
      }
    }
    return findings;
  },
});

/**
 * A field no schema defines for the family. Left alone it is dropped without a trace, so a
 * misspelt `slug_history` loses a redirect while everything stays green. `file` is where the
 * loader says the record came from, not a field of the file.
 */
export const famUnknown = defineRule({
  id: 'FAM-UNKNOWN',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const known = knownFields(record.family);
      if (!known) continue;
      for (const field of Object.keys(record)) {
        // `file` and an essay's `body` are attached by the loader; neither is a field of the YAML
        if (field !== 'file' && !(field === 'body' && (record.family === 'essay' || record.family === 'room')) && !known.has(field)) {
          findings.push({ record, field, value: record[field], expected: `a field defined for ${record.family} records` });
        }
      }
    }
    return findings;
  },
});
