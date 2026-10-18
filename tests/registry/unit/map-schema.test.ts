import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { schemaFor } from '../../../src/registry/schemas/index.js';
import { place, record } from '../support/builders.js';
import { CART, EVIDENCE, FILLED, IMAGE, MAP, PLACE, cartographer, neighbours, validMap } from '../support/maps.js';

/*
 * Spec 004 T004 (FR-001): the map and cartographer shapes, their typed references and the fields
 * required from ready_for_build. Enumerated values are judged by rules, so the schema only types.
 */
const hits = (rule: string, records: ReturnType<typeof validMap>[]) => validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('the map schema', () => {
  it('loads a map with every clarified field', () => {
    const parsed = schemaFor('map').parse({
      ...validMap(),
      record_scope: 'object',
      open_questions: [{ field: 'provenance', question: 'Which bequest?', would_resolve: 'the library accession register' }],
      field_status: { significance: 'recorded' },
      basis: { provenance: 'observed', atlas_context: 'inferred' },
      last_verified: '2026-10-01',
      physical: { platemark: { value: 'present', basis: 'observed' } },
    });
    expect(parsed.witness_kind).toBe('institutional');
    expect(parsed.record_scope).toBe('object');
    expect(parsed.images).toEqual([IMAGE]);
  });

  it('rejects the old images: string[] placeholder', () => {
    expect(schemaFor('map').safeParse({ ...validMap(), images: ['a.jpg'] }).success).toBe(false);
  });

  it('rejects a dimension that is not a positive number', () => {
    expect(schemaFor('map').safeParse({ ...validMap(), dimensions: { height_mm: 'tall', width_mm: 500 } }).success).toBe(false);
  });

  it('loads a cartographer with kind, names, roles and active', () => {
    const parsed = schemaFor('cartographer').parse({ ...cartographer({ kind: 'workshop' }), names: ['Blaeu'], roles: ['publisher'], active: '1600/1650' });
    expect(parsed.kind).toBe('workshop');
    expect(parsed.names).toEqual(['Blaeu']);
  });

  it('still rejects an unlisted field (FAM-UNKNOWN)', () => {
    expect(hits('FAM-UNKNOWN', [validMap({ price: 5 })]).map((v) => v.field)).toEqual(['price']);
    expect(hits('FAM-UNKNOWN', [validMap(), ...neighbours()])).toEqual([]);
  });
});

describe('the map references', () => {
  const pointsAt = (field: string, id: string) => hits('REF-UNKNOWN', [validMap({ [field]: Array.isArray(FILLED[field as keyof typeof FILLED]) || field === 'attribution_evidence' || field === 'bibliography' ? [id] : id }), ...neighbours()]);

  it('resolves coverage, publication_place, attribution_evidence and bibliography', () => {
    const records = [validMap({ bibliography: ['tc:tc:bibliography_entry:bibliography_entry-000001'] }), ...neighbours(), record('bibliography_entry', 1, { csl: 'x.json', section: 'primary_sources' })];
    expect(hits('REF-UNKNOWN', records)).toEqual([]);
    expect(hits('REF-FAMILY', records)).toEqual([]);
  });

  it('reports an unknown id in each reference field', () => {
    expect(pointsAt('coverage', 'tc:tc:place:place-000099').map((v) => v.field)).toEqual(['coverage[0]']);
    expect(pointsAt('publication_place', 'tc:tc:place:place-000099').map((v) => v.field)).toEqual(['publication_place']);
    expect(pointsAt('attribution_evidence', 'tc:tc:evidence:evidence-000099').map((v) => v.field)).toEqual(['attribution_evidence[0]']);
    expect(pointsAt('bibliography', 'tc:tc:bibliography_entry:bibliography_entry-000099').map((v) => v.field)).toEqual(['bibliography[0]']);
  });

  it('reports a reference of the wrong family', () => {
    const wrong = hits('REF-FAMILY', [validMap({ coverage: [CART], publication_place: EVIDENCE, attribution_evidence: [PLACE] }), ...neighbours()]);
    expect(wrong.map((v) => v.field).sort()).toEqual(['attribution_evidence[0]', 'coverage[0]', 'publication_place']);
  });
});

describe('required fields', () => {
  const required = (records: ReturnType<typeof validMap>[]) => hits('FAM-REQUIRED', records).map((v) => `${v.entity?.split(':')[2]}.${v.field}`);

  it('asks a map for witness_kind and a cartographer for kind from ready_for_build', () => {
    const noKind = { ...cartographer(), kind: undefined };
    expect(required([validMap({ witness_kind: undefined }), noKind]).sort()).toEqual(['cartographer.kind', 'map.witness_kind']);
  });

  it('does not ask a work or a concept for witness_kind', () => {
    expect(required([validMap({ record_scope: 'work', witness_kind: undefined, images: [] })])).toEqual([]);
    expect(required([validMap({ record_scope: 'concept', witness_kind: undefined, images: [] })])).toEqual([]);
  });

  it('is a warning before ready_for_build and an error from it', () => {
    const at = (lifecycle: string) => hits('FAM-REQUIRED', [validMap({ lifecycle, witness_kind: undefined })])[0]?.severity;
    expect(at('researching')).toBe('warning');
    expect(at('ready_for_build')).toBe('error');
  });
});

describe('the place builder', () => {
  it('is still a valid neighbour', () => {
    expect(place(1).family).toBe('place');
    expect(MAP).toContain('map-000001');
  });
});
