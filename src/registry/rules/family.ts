import { defineRule, type Finding } from './framework.js';

/**
 * Minimum fields per family (data-model.md "Family fields"). `source.is_finding_aid` defaults to
 * false and is not listed. From `ready_for_build` a missing field is an error; before that a
 * warning, so early research can be registered without being blocked (ADR 0006 item 6).
 */
const REQUIRED: Record<string, string[]> = {
  map: ['makers'],
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
        if (!present(record[field])) {
          findings.push({ record, field, value: null, expected: `${field} on every ${record.family} record` });
        }
      }
    }
    return findings;
  },
});
