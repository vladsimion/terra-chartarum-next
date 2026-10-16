import type { RegistryRecord } from './types.js';

/**
 * Specialist vocabularies (TC-D016, spec 001 edge case): a corpus keeps its own, stricter terms in
 * its records, and a mapping file names what each one means in the shared vocabularies. Rules judge
 * the shared meaning; the stored record is never rewritten.
 */
export const MAPPABLE_FIELDS = ['lifecycle', 'confidence', 'evidence_type', 'geometry_provenance'] as const;
export type MappableField = (typeof MAPPABLE_FIELDS)[number];

export interface Vocabulary {
  name: string;
  /** Path of the mapping file relative to the registry root, for violations. */
  file: string;
  /** field -> specialist term -> shared term */
  tables: Partial<Record<MappableField, Record<string, string>>>;
}

/** The record as the rules should see it: each mapped specialist term replaced by its shared meaning. */
export function applyVocabulary(record: RegistryRecord, vocabularies: ReadonlyMap<string, Vocabulary>): RegistryRecord {
  const name = record.vocabulary;
  const vocabulary = typeof name === 'string' ? vocabularies.get(name) : undefined;
  if (!vocabulary) return record;
  const mapped: RegistryRecord = { ...record };
  for (const field of MAPPABLE_FIELDS) {
    const value = record[field];
    const table = vocabulary.tables[field];
    if (typeof value === 'string' && table && Object.hasOwn(table, value)) mapped[field] = table[value];
  }
  return mapped;
}

export function applyVocabularies(
  records: readonly RegistryRecord[],
  vocabularies: ReadonlyMap<string, Vocabulary> | undefined,
): readonly RegistryRecord[] {
  if (!vocabularies || vocabularies.size === 0) return records;
  return records.map((record) => applyVocabulary(record, vocabularies));
}
