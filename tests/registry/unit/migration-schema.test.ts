import { describe, expect, it } from 'vitest';
import { schemaFor } from '../../../src/registry/schemas/index.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place } from '../support/builders.js';
import { legacyMap } from '../support/migration.js';

/*
 * Spec 008 T005 (FR-013, FR-021, data-model.md): a map carries the import-only `legacy_record_scope`,
 * `legacy_custody` and `legacy_publication_status`. The schema takes membership and MIG-LEGACY judges
 * the values and where they may appear, as for the other `legacy_*` fields. FAM-UNKNOWN stays strict.
 */
const unknownFields = (records: ReturnType<typeof legacyMap>[]) => validateRegistry(records).violations.filter((v) => v.rule === 'FAM-UNKNOWN').map((v) => v.field);

describe('the import-only legacy fields on a map', () => {
  it('load with the original legacy values', () => {
    const parsed = schemaFor('map').safeParse(legacyMap());
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ legacy_record_scope: 'object', legacy_custody: 'institutional', legacy_publication_status: 'published_witness' });
  });

  it('are known fields of a map, so FAM-UNKNOWN does not reject them', () => {
    expect(unknownFields([legacyMap()])).toEqual([]);
  });

  it('are rejected by FAM-UNKNOWN on any other family', () => {
    const wrongPlace = { ...place(1), legacy_record_scope: 'object', legacy_custody: 'held', legacy_publication_status: 'reference_only' };
    expect(unknownFields([wrongPlace]).sort()).toEqual(['legacy_custody', 'legacy_publication_status', 'legacy_record_scope']);
  });
});
