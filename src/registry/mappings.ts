import { loadRecords } from './load.ts';

/** Fields whose specialist terms may be mapped to the shared vocabularies (research.md R9). */
export const MAPPABLE_FIELDS = ['lifecycle', 'confidence', 'evidence_type', 'geometry_provenance'] as const;
export type MappableField = (typeof MAPPABLE_FIELDS)[number];

/** authority → field → specialist term → shared term */
export type VocabMappings = Record<string, Partial<Record<MappableField, Record<string, string>>>>;

/**
 * Read mapping files (`authority:` plus one table per mappable field) from a
 * directory. A missing directory means no mappings.
 */
export async function loadVocabMappings(dir: string): Promise<VocabMappings> {
  const { records } = await loadRecords(dir);
  const mappings: VocabMappings = {};
  for (const { record } of records) {
    const authority = record['authority'];
    if (typeof authority !== 'string') continue;
    const tables: Partial<Record<MappableField, Record<string, string>>> = {};
    for (const field of MAPPABLE_FIELDS) {
      const table = record[field];
      if (table !== null && typeof table === 'object') tables[field] = table as Record<string, string>;
    }
    mappings[authority] = tables;
  }
  return mappings;
}

/**
 * The record as the rules should see it: specialist terms replaced by their
 * shared meaning. Unmapped terms are left as written, so they fail as ENUM_INVALID.
 */
export function applyMappings(record: Record<string, unknown>, mappings: VocabMappings | undefined): Record<string, unknown> {
  const authority = typeof record['authority'] === 'string' ? record['authority'] : 'tc';
  const tables = mappings?.[authority];
  if (tables === undefined) return record;

  const map = (field: MappableField, value: unknown) =>
    typeof value === 'string' && tables[field] !== undefined && Object.hasOwn(tables[field], value)
      ? tables[field][value]
      : value;

  const mapped: Record<string, unknown> = { ...record };
  if (record['lifecycle'] !== undefined) mapped['lifecycle'] = map('lifecycle', record['lifecycle']);
  if (Array.isArray(record['evidence'])) {
    mapped['evidence'] = record['evidence'].map((entry: unknown) => {
      if (entry === null || typeof entry !== 'object') return entry;
      const e = { ...(entry as Record<string, unknown>) };
      for (const field of ['confidence', 'evidence_type', 'geometry_provenance'] as const) {
        if (e[field] !== undefined) e[field] = map(field, e[field]);
      }
      return e;
    });
  }
  return mapped;
}
