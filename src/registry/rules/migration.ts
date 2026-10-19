import { LEGACY_CUSTODY_VALUES, LEGACY_PUBLICATION_STATUS_VALUES, LEGACY_RECORD_SCOPE_VALUES } from '../schemas/import.js';
import type { RegistryRecord } from '../types.js';
import { isObject } from '../values.js';
import { defineRule, type Finding } from './framework.js';
import { confirmed } from './import.js';

/*
 * Rules for records brought in from the legacy site (spec 008, contracts/migration-rule-ids.md).
 * Each is an error at every lifecycle: an import that breaks one is wrong, not unfinished.
 */
const legacy = (record: RegistryRecord): boolean => record.origin === 'legacy';
const includes = (values: readonly string[], value: unknown): boolean => typeof value === 'string' && values.includes(value);

/** A legacy record keeps its legacy local-id as its slug, or in its slug history, so the old path resolves (FR-001). */
export const migSlug = defineRule({
  id: 'MIG-SLUG',
  from: 'always',
  check: ({ records }) =>
    records
      .filter(legacy)
      .filter((record) => {
        const localId = String(record.id).split(':').slice(3).join(':');
        return record.slug !== localId && !(record.slug_history ?? []).includes(localId);
      })
      .map((record) => ({ record, field: 'slug', value: record.slug ?? null, expected: `the legacy local-id (${String(record.id).split(':').slice(3).join(':')}) as the slug or in slug_history` })),
});

const LEGACY_FIELDS = [
  ['legacy_record_scope', LEGACY_RECORD_SCOPE_VALUES],
  ['legacy_custody', LEGACY_CUSTODY_VALUES],
  ['legacy_publication_status', LEGACY_PUBLICATION_STATUS_VALUES],
] as const;

/** The import-only map fields are on legacy records only, hold legacy values, and agree with `record_scope` and `witness_kind` (FR-013). */
export const migLegacy = defineRule({
  id: 'MIG-LEGACY',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      for (const [field, values] of LEGACY_FIELDS) {
        const value = record[field];
        if (value === undefined) continue;
        if (!legacy(record)) {
          findings.push({ record, field, value, expected: 'a field of imported (origin: legacy) records only' });
        } else if (!includes(values, value)) {
          findings.push({ record, field, value, expected: `one of ${values.join(', ')}` });
        }
      }
      if (!legacy(record) || record.family !== 'map') continue;
      // an absent legacy scope was read as `object`
      const scope = record.legacy_record_scope ?? 'object';
      if (includes(LEGACY_RECORD_SCOPE_VALUES, scope) && (record.record_scope ?? 'object') !== scope) {
        findings.push({ record, field: 'record_scope', value: record.record_scope ?? null, expected: `${String(scope)}, as the legacy record_scope` });
      }
      if (scope === 'object' && record.legacy_custody !== undefined && record.witness_kind !== undefined && includes(LEGACY_CUSTODY_VALUES, record.legacy_custody) && record.witness_kind !== record.legacy_custody) {
        findings.push({ record, field: 'witness_kind', value: record.witness_kind, expected: `${String(record.legacy_custody)}, as the legacy custody` });
      }
    }
    return findings;
  },
});

/** An imported image is withheld until the editor clears it by name and date (FR-015, ADR 0016). */
export const migImageCleared = defineRule({
  id: 'MIG-IMAGE-CLEARED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (!legacy(record) || record.family !== 'map' || !Array.isArray(record.images) || confirmed(record)) continue;
      record.images.forEach((image, i) => {
        if (isObject(image) && image.reproduction_cleared === true) {
          findings.push({ record, field: `images[${i}].reproduction_cleared`, value: true, expected: 'false until the editor confirms the record by name and date' });
        }
      });
    }
    return findings;
  },
});

export const MIGRATION_RULES = [migSlug, migLegacy, migImageCleared];
