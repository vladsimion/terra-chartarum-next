import { describe, expect, it } from 'vitest';
import { map } from '../support/builders.js';
import { legacyMap, migrationHits } from '../support/migration.js';

/*
 * Spec 008 T009 (FR-013): the three import-only fields appear only on legacy records, take only the
 * legacy value sets, and agree with `record_scope` and `witness_kind`.
 */
const fields = (over: Record<string, unknown>) => migrationHits('MIG-LEGACY', [legacyMap(over as never)]).map((v) => [v.field, v.severity]);

describe('MIG-LEGACY', () => {
  it('passes a legacy object, work and concept as the importer writes them', () => {
    expect(migrationHits('MIG-LEGACY', [legacyMap()])).toEqual([]);
    expect(fields({ record_scope: 'work', legacy_record_scope: 'work', witness_kind: undefined, legacy_custody: undefined })).toEqual([]);
    expect(fields({ record_scope: 'concept', legacy_record_scope: 'concept', witness_kind: undefined, legacy_custody: undefined })).toEqual([]);
  });

  it('flags a legacy_* field on a minted record', () => {
    const found = migrationHits('MIG-LEGACY', [map(1, { legacy_record_scope: 'object', legacy_custody: 'held', legacy_publication_status: 'reference_only' })]);
    expect(found.map((v) => v.field).sort()).toEqual(['legacy_custody', 'legacy_publication_status', 'legacy_record_scope']);
    expect(found.every((v) => v.severity === 'error')).toBe(true);
  });

  it.each([
    ['legacy_record_scope', 'artefact'],
    ['legacy_custody', 'lost'],
    ['legacy_publication_status', 'draft'],
  ])('flags a %s outside the legacy value set', (field, value) => {
    expect(fields({ [field]: value })).toEqual([[field, 'error']]);
  });

  it('flags a legacy work that is not record_scope work, and a legacy concept that is not concept', () => {
    expect(fields({ legacy_record_scope: 'work', record_scope: 'object' })).toEqual([['record_scope', 'error']]);
    expect(fields({ legacy_record_scope: 'concept', record_scope: 'work', witness_kind: undefined, legacy_custody: undefined })).toEqual([['record_scope', 'error']]);
  });

  it('reads an absent legacy_record_scope as object', () => {
    expect(fields({ legacy_record_scope: undefined, record_scope: 'work', witness_kind: undefined, legacy_custody: undefined })).toEqual([['record_scope', 'error']]);
  });

  it('flags a legacy custody that disagrees with the witness_kind of an object', () => {
    expect(fields({ legacy_custody: 'unlocated', witness_kind: 'institutional' })).toEqual([['witness_kind', 'error']]);
  });

  it('does not compare custody and witness_kind when the object has no witness_kind yet', () => {
    expect(fields({ witness_kind: undefined, legacy_custody: 'institutional' })).toEqual([]);
  });

  it('is an error whatever the lifecycle', () => {
    expect(migrationHits('MIG-LEGACY', [legacyMap({ legacy_custody: 'lost', lifecycle: 'proposed' })]).map((v) => v.severity)).toEqual(['error']);
  });
});
