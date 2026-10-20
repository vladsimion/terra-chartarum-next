import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { localId, map } from './builders.js';

/** Spec 008: a legacy map record as the importer writes it, to break one thing at a time. */
export const LEGACY_ID = 'plan-of-the-city';
export const legacyMap = (over: Partial<RegistryRecord> = {}): RegistryRecord =>
  map(1, {
    id: `tc:tc:map:${LEGACY_ID}`,
    origin: 'legacy',
    slug: LEGACY_ID,
    file: `content/map/${LEGACY_ID}.yaml`,
    lifecycle: 'researching',
    release: 'held',
    record_scope: 'object',
    witness_kind: 'institutional',
    legacy_record_scope: 'object',
    legacy_custody: 'institutional',
    legacy_publication_status: 'published_witness',
    ...over,
  });

/** Violations of one rule over some records. */
export const migrationHits = (rule: string, records: RegistryRecord[]) => validateRegistry(records, { completeness: false }).violations.filter((v) => v.rule === rule);
export { localId };
