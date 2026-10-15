import { describe, expect, test } from 'vitest';
import { validateRegistry } from '../../src/registry/integrity.ts';
import type { LoadedRecord } from '../../src/registry/load.ts';

// Seam 1: the whole-registry check. Tests give it records and read its report;
// they never call ID parsing or schemas directly (plan.md, "Test seams").

function rec(file: string, record: Record<string, unknown>): LoadedRecord {
  return { file, record };
}

const apulum = rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum' });

function codes(result: ReturnType<typeof validateRegistry>, code: string) {
  return result.violations.filter((v) => v.code === code);
}

describe('ID_SYNTAX', () => {
  test('a well-formed registry has no ID_SYNTAX violations and passes', () => {
    const result = validateRegistry({ records: [apulum] });

    expect(codes(result, 'ID_SYNTAX')).toEqual([]);
    expect(result.status).toBe('pass');
  });

  test.each([
    ['uppercase letters', 'Apulum'],
    ['a leading hyphen', '-apulum'],
    ['a space', 'alba iulia'],
    ['more than 128 characters', 'a'.repeat(129)],
  ])('a local id with %s is rejected, naming the value, the rule and the file', (_label, badId) => {
    const result = validateRegistry({
      records: [rec('place/bad.yaml', { id: badId, family: 'place', title: 'Bad', slug: 'bad' })],
    });

    const violations = codes(result, 'ID_SYNTAX');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'id', value: badId, files: ['place/bad.yaml'] });
    expect(violations[0]?.message).toContain('[a-z0-9][a-z0-9._-]{0,127}');
    expect(result.status).toBe('fail');
  });

  test('legacy-style ids with dots and underscores are accepted unchanged', () => {
    const result = validateRegistry({
      records: [rec('map/legacy.yaml', { id: 'map-ortelius_1595.dacia', family: 'map', title: 'Daciarum', slug: 'daciarum' })],
    });

    expect(codes(result, 'ID_SYNTAX')).toEqual([]);
  });

  test('an authority that does not match the rule is rejected', () => {
    const result = validateRegistry({
      records: [rec('place/x.yaml', { id: 'apulum', authority: 'C', family: 'place', title: 'Apulum', slug: 'apulum' })],
    });

    const violations = codes(result, 'ID_SYNTAX');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'authority', value: 'C', files: ['place/x.yaml'] });
    expect(violations[0]?.message).toContain('[a-z][a-z0-9]{1,15}');
  });

  test('an unknown family is rejected', () => {
    const result = validateRegistry({
      records: [rec('misc/x.yaml', { id: 'x', family: 'monument', title: 'X', slug: 'x' })],
    });

    const violations = codes(result, 'ID_SYNTAX');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'family', value: 'monument', files: ['misc/x.yaml'] });
  });

  test('violations name the entity in qualified form, defaulting the authority to tc', () => {
    const result = validateRegistry({
      records: [
        rec('place/a.yaml', { id: 'Bad', family: 'place', title: 'A', slug: 'a' }),
        rec('attestation/b.yaml', { id: 'Bad', authority: 'cnd', family: 'attestation', title: 'B' }),
      ],
    });

    expect(codes(result, 'ID_SYNTAX').map((v) => v.entity)).toEqual([
      'tc:tc:place:Bad',
      'tc:cnd:attestation:Bad',
    ]);
  });
});

describe('SCHEMA_INVALID', () => {
  test.each(['id', 'family', 'title'])('a record without "%s" is rejected, naming the field', (field) => {
    const record: Record<string, unknown> = { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum' };
    delete record[field];

    const result = validateRegistry({ records: [rec('place/apulum.yaml', record)] });

    const violations = codes(result, 'SCHEMA_INVALID');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field, files: ['place/apulum.yaml'] });
  });

  test('an empty title is rejected', () => {
    const result = validateRegistry({
      records: [rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: '', slug: 'apulum' })],
    });

    expect(codes(result, 'SCHEMA_INVALID')[0]).toMatchObject({ field: 'title' });
  });

  test('a routable family without a slug is rejected', () => {
    const result = validateRegistry({
      records: [rec('map/m.yaml', { id: 'm', family: 'map', title: 'M' })],
    });

    expect(codes(result, 'SCHEMA_INVALID')[0]).toMatchObject({ field: 'slug', files: ['map/m.yaml'] });
  });

  test('a non-routable family needs no slug', () => {
    const result = validateRegistry({
      records: [rec('source/s.yaml', { id: 's', family: 'source', title: 'S', kind: 'source', bibliography: 'bibliography:b' })],
    });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([]);
  });

  test('an unknown top-level field is rejected, so misspellings never pass silently', () => {
    const result = validateRegistry({
      records: [rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum', tittle: 'x' })],
    });

    const violations = codes(result, 'SCHEMA_INVALID');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'tittle' });
  });

  test('a private block is accepted as an opaque object', () => {
    const result = validateRegistry({
      records: [
        rec('map/m.yaml', {
          id: 'm',
          family: 'map',
          title: 'M',
          slug: 'm',
          private: { price_paid: 420, dealer: { name: 'X', notes: ['a', 'b'] } },
        }),
      ],
    });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([]);
  });

  test('previous_slugs must be a list of strings', () => {
    const result = validateRegistry({
      records: [rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum', previous_slugs: 'old' })],
    });

    expect(codes(result, 'SCHEMA_INVALID')[0]).toMatchObject({ field: 'previous_slugs' });
  });
});

describe('FILE_UNREADABLE', () => {
  test('loader errors appear as violations with their file and line', () => {
    const result = validateRegistry({
      records: [apulum],
      loadErrors: [{ file: 'place/broken.yaml', line: 3, message: 'Map keys must be unique' }],
    });

    const violations = codes(result, 'FILE_UNREADABLE');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ files: ['place/broken.yaml'] });
    expect(violations[0]?.message).toContain('line 3');
    expect(violations[0]?.message).toContain('Map keys must be unique');
    expect(result.status).toBe('fail');
  });
});

describe('ID_DUPLICATE', () => {
  test('the same authority, family and id in two files is one violation listing both files', () => {
    const result = validateRegistry({
      records: [
        rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum' }),
        rec('place/apulum-copy.yaml', { id: 'apulum', family: 'place', title: 'Apulum again', slug: 'apulum-2' }),
      ],
    });

    const violations = codes(result, 'ID_DUPLICATE');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      entity: 'tc:tc:place:apulum',
      files: ['place/apulum-copy.yaml', 'place/apulum.yaml'],
    });
  });

  test('the same local id in different families or authorities is not a duplicate', () => {
    const result = validateRegistry({
      records: [
        rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum' }),
        rec('source/apulum.yaml', { id: 'apulum', family: 'source', title: 'Apulum inscription' }),
        rec('place/cnd-apulum.yaml', { id: 'apulum', authority: 'cnd', family: 'place', title: 'Apulum (CND)', slug: 'apulum-cnd' }),
      ],
    });

    expect(codes(result, 'ID_DUPLICATE')).toEqual([]);
  });

  test('three copies produce one violation listing all three files', () => {
    const copy = (file: string) => rec(file, { id: 'x', family: 'source', title: 'X' });
    const result = validateRegistry({ records: [copy('a.yaml'), copy('b.yaml'), copy('c.yaml')] });

    expect(codes(result, 'ID_DUPLICATE')).toEqual([
      expect.objectContaining({ files: ['a.yaml', 'b.yaml', 'c.yaml'] }),
    ]);
  });
});

describe('family fields', () => {
  const base = (family: string, extra: Record<string, unknown> = {}) =>
    rec(`${family}/x.yaml`, { id: 'x', family, title: 'X', ...extra });

  test.each([
    ['essay', { slug: 'x', stage: 'draft', question: 'Q?', maps: ['map:m'], layers: [], places: [], sources: [], bibliography: [] }],
    ['map', { slug: 'x', cartographers: ['cartographer:c'], places: [], layers: [], bibliography: [] }],
    ['cartographer', { slug: 'x', names: ['Ortelius'], roles: ['cartographer'], maps: [], bibliography: [] }],
    ['place', { slug: 'x', names: [{ form: 'Apulum', language: 'la' }], sources: [] }],
    ['source', { kind: 'source', bibliography: 'bibliography:b' }],
    ['attestation', { place: 'place:p', source: 'source:s', name_form: 'Apulon', language: 'grc', locator: '3.8.4' }],
    ['dataset', { question: 'Q?', crs: 'EPSG:4326', format: 'geojson', layers: [], sources: [] }],
    ['layer', { role: 'historical', theme: 'networks-circulation', dataset: 'dataset:d', collections: [], asset: 'layers/x.fgb' }],
    ['collection', { slug: 'x', question: 'Q?', layer_ids: ['layer:l'], default_layer_ids: ['layer:l'] }],
    ['route', { valid_from: '0106', valid_to: '0271', places: [], sources: [] }],
    ['event', { valid_from: '0106', places: [], sources: [] }],
    ['period', { valid_from: '0106', valid_to: '0271', places: [], sources: [] }],
    ['room', { slug: 'x', order: 1, description: 'D' }],
    ['bibliography', { section: 'primary_sources', citation: { type: 'book', title: 'Geographia' } }],
  ])('a %s accepts its own fields', (family, extra) => {
    const result = validateRegistry({ records: [base(family, extra)] });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([]);
  });

  test('a field belonging to another family is rejected', () => {
    const result = validateRegistry({ records: [base('place', { slug: 'x', layer_ids: [] })] });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'layer_ids' })]);
  });

  test('a source must point to its bibliography entry and may not hold its own citation (Principle V)', () => {
    const withoutBib = validateRegistry({ records: [base('source', { kind: 'source' })] });
    expect(codes(withoutBib, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'bibliography' })]);

    const withCitation = validateRegistry({
      records: [base('source', { kind: 'source', bibliography: 'bibliography:b', citation: { title: 'X' } })],
    });
    expect(codes(withCitation, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'citation' })]);
  });

  test('an attestation needs a place and a source', () => {
    const result = validateRegistry({ records: [base('attestation', { name_form: 'Apulon' })] });

    expect(codes(result, 'SCHEMA_INVALID').map((v) => v.field).sort()).toEqual(['place', 'source']);
  });

  test('a collection needs layer_ids and default_layer_ids', () => {
    const result = validateRegistry({ records: [base('collection', { slug: 'x' })] });

    expect(codes(result, 'SCHEMA_INVALID').map((v) => v.field).sort()).toEqual(['default_layer_ids', 'layer_ids']);
  });

  test.each([['ptolemy'], ['Source:ptolemy'], ['source:'], ['a:b:c:d']])(
    'a reference written as "%s" is malformed',
    (ref) => {
      const result = validateRegistry({ records: [base('source', { kind: 'source', bibliography: ref })] });

      expect(codes(result, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'bibliography' })]);
    },
  );
});

describe('references (REF_UNKNOWN, REF_FAMILY)', () => {
  const map = rec('map/ortelius.yaml', { id: 'ortelius', family: 'map', title: 'Daciarum', slug: 'daciarum' });
  const essay = (refs: Record<string, unknown>) =>
    rec('essay/terra-sigillata.yaml', {
      id: 'terra-sigillata',
      family: 'essay',
      title: 'Terra Sigillata',
      slug: 'terra-sigillata',
      stage: 'draft',
      ...refs,
    });

  test('references that resolve produce no violation and are counted', () => {
    const result = validateRegistry({ records: [map, essay({ maps: ['map:ortelius'] })] });

    expect(codes(result, 'REF_UNKNOWN')).toEqual([]);
    expect(codes(result, 'REF_FAMILY')).toEqual([]);
    expect(result.counts.references).toBe(1);
  });

  test('a reference to a map that does not exist names the entity, the field and the missing id', () => {
    const result = validateRegistry({ records: [map, essay({ maps: ['map:ortelius', 'map:mercator'] })] });

    expect(codes(result, 'REF_UNKNOWN')).toEqual([
      expect.objectContaining({
        entity: 'tc:tc:essay:terra-sigillata',
        field: 'maps.1',
        value: 'map:mercator',
        files: ['essay/terra-sigillata.yaml'],
      }),
    ]);
    expect(result.status).toBe('fail');
  });

  test('a reference with an explicit authority must match that authority', () => {
    const result = validateRegistry({ records: [map, essay({ maps: ['cnd:map:ortelius'] })] });

    expect(codes(result, 'REF_UNKNOWN')).toEqual([expect.objectContaining({ value: 'cnd:map:ortelius' })]);
  });

  test('a reference naming the wrong family for its field is REF_FAMILY', () => {
    const place = rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum' });
    const result = validateRegistry({ records: [map, place, essay({ maps: ['place:apulum'] })] });

    expect(codes(result, 'REF_FAMILY')).toEqual([
      expect.objectContaining({ field: 'maps.0', value: 'place:apulum' }),
    ]);
    expect(codes(result, 'REF_UNKNOWN')).toEqual([]);
  });

  test('single-valued reference fields are resolved too', () => {
    const result = validateRegistry({
      records: [rec('source/s.yaml', { id: 's', family: 'source', title: 'S', kind: 'source', bibliography: 'bibliography:none' })],
    });

    expect(codes(result, 'REF_UNKNOWN')).toEqual([expect.objectContaining({ field: 'bibliography' })]);
  });

  test('room assignments and superseded_by are references too', () => {
    const result = validateRegistry({
      records: [
        rec('room/border.yaml', { id: 'border', family: 'room', title: 'The Border', slug: 'border' }),
        rec('map/old.yaml', {
          id: 'old',
          family: 'map',
          title: 'Old',
          slug: 'old',
          rooms: { primary: 'room:border', secondary: ['room:sea'] },
          superseded_by: 'map:new',
        }),
      ],
    });

    expect(codes(result, 'REF_UNKNOWN').map((v) => v.field).sort()).toEqual(['rooms.secondary.0', 'superseded_by']);
  });

  test('superseded_by must point to the same family', () => {
    const result = validateRegistry({
      records: [
        map,
        rec('place/p.yaml', { id: 'p', family: 'place', title: 'P', slug: 'p', superseded_by: 'map:ortelius' }),
      ],
    });

    expect(codes(result, 'REF_FAMILY')).toEqual([expect.objectContaining({ field: 'superseded_by' })]);
  });
});

describe('COLLECTION_DEFAULTS', () => {
  const layer = (id: string) =>
    rec(`layer/${id}.yaml`, { id, family: 'layer', title: id });
  const collection = (layer_ids: string[], default_layer_ids: string[]) =>
    rec('collection/dacia.yaml', {
      id: 'dacia',
      family: 'collection',
      title: 'Corpus Chartarum Daciae',
      slug: 'dacia',
      layer_ids,
      default_layer_ids,
    });

  test('defaults drawn from the members are fine', () => {
    const result = validateRegistry({
      records: [layer('roads'), layer('limes'), collection(['layer:roads', 'layer:limes'], ['layer:roads'])],
    });

    expect(codes(result, 'COLLECTION_DEFAULTS')).toEqual([]);
  });

  test('a default that is not a member fails', () => {
    const result = validateRegistry({
      records: [layer('roads'), layer('limes'), collection(['layer:roads'], ['layer:limes'])],
    });

    expect(codes(result, 'COLLECTION_DEFAULTS')).toEqual([
      expect.objectContaining({ entity: 'tc:tc:collection:dacia', field: 'default_layer_ids.0', value: 'layer:limes' }),
    ]);
  });

  test('a member listed twice fails', () => {
    const result = validateRegistry({
      records: [layer('roads'), collection(['layer:roads', 'layer:roads'], [])],
    });

    expect(codes(result, 'COLLECTION_DEFAULTS')).toEqual([
      expect.objectContaining({ field: 'layer_ids.1', value: 'layer:roads' }),
    ]);
  });
});

const bib = rec('bibliography/b.yaml', { id: 'b', family: 'bibliography', title: 'B' });
const geographia = rec('source/geographia.yaml', {
  id: 'geographia',
  family: 'source',
  title: 'Geographia',
  kind: 'source',
  bibliography: 'bibliography:b',
});
const placeWith = (extra: Record<string, unknown>) =>
  rec('place/apulum.yaml', { id: 'apulum', family: 'place', title: 'Apulum', slug: 'apulum', ...extra });

describe('evidence', () => {
  const fullEvidence = {
    source: 'source:geographia',
    locator: '3.8.4',
    locator_state: 'verified',
    verified_by: 'Vlad Simion',
    verified_on: '2026-10-01',
    consulted_copy: 'Nobbe 1843 edition, scan at archive.org/details/x',
    evidence_type: 'textual',
    valid_from: '0106',
    valid_to: '0271',
    geometry_provenance: 'scholarly_reconstruction',
    reconstruction: 'partial',
    confidence: 'probable',
    last_verified: '2026-10-01',
  };

  test('a fully described evidence entry is accepted', () => {
    const result = validateRegistry({ records: [bib, geographia, placeWith({ evidence: [fullEvidence] })] });

    expect(result.violations).toEqual([]);
  });

  test('a source-geometry claim and a reconstructed claim can sit side by side', () => {
    const result = validateRegistry({
      records: [
        bib,
        geographia,
        placeWith({
          evidence: [
            { source: 'source:geographia', geometry_provenance: 'source_geometry', confidence: 'possible' },
            { source: 'source:geographia', geometry_provenance: 'scholarly_reconstruction', confidence: 'conjectural' },
          ],
        }),
      ],
    });

    expect(result.violations).toEqual([]);
  });

  test('an absence carries a typed silence state', () => {
    const result = validateRegistry({
      records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', silence_state: 'meaningful_silence' }] })],
    });

    expect(result.violations).toEqual([]);
  });

  test('evidence must name its source', () => {
    const result = validateRegistry({ records: [placeWith({ evidence: [{ locator: '3.8.4' }] })] });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'evidence.0.source' })]);
  });

  test.each([
    ['evidence_type', 'oral'],
    ['geometry_provenance', 'guess'],
    ['reconstruction', 'some'],
    ['confidence', 'high'],
    ['silence_state', 'absent'],
    ['locator_state', 'checked'],
  ])('a %s outside the shared vocabulary is ENUM_INVALID', (field, value) => {
    const result = validateRegistry({
      records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', [field]: value }] })],
    });

    expect(codes(result, 'ENUM_INVALID')).toEqual([
      expect.objectContaining({ field: `evidence.0.${field}`, value, files: ['place/apulum.yaml'] }),
    ]);
  });

  test('date_precision is derived and may not be authored (ADR 0006)', () => {
    const result = validateRegistry({
      records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', date_precision: 'century' }] })],
    });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'evidence.0.date_precision' })]);
  });

  test('verification dates are calendar dates', () => {
    const result = validateRegistry({
      records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', last_verified: 'last week' }] })],
    });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'evidence.0.last_verified' })]);
  });
});

describe('rights and extraction', () => {
  test('rights keep text copyright and reproduction clearance separate', () => {
    const result = validateRegistry({
      records: [
        placeWith({
          rights: {
            licence: 'CC-BY-4.0',
            attribution: 'Terra Chartarum',
            text_copyright_status: 'public_domain',
            reproduction_cleared: false,
          },
        }),
      ],
    });

    expect(result.violations).toEqual([]);
  });

  test('reproduction_cleared must be true or false', () => {
    const result = validateRegistry({ records: [placeWith({ rights: { licence: 'CC-BY-4.0', reproduction_cleared: 'yes' } })] });

    expect(codes(result, 'SCHEMA_INVALID')).toEqual([expect.objectContaining({ field: 'rights.reproduction_cleared' })]);
  });

  test('a manual extraction needs nothing more', () => {
    const result = validateRegistry({ records: [placeWith({ extraction: { method: 'manual' } })] });

    expect(result.violations).toEqual([]);
  });

  test('an automated extraction must keep its raw evidence and transformation log', () => {
    const result = validateRegistry({ records: [placeWith({ extraction: { method: 'llm' } })] });

    expect(codes(result, 'SCHEMA_INVALID').map((v) => v.field).sort()).toEqual([
      'extraction.raw_evidence_ref',
      'extraction.transformation_log_ref',
    ]);
  });

  test('an unknown extraction method is ENUM_INVALID', () => {
    const result = validateRegistry({ records: [placeWith({ extraction: { method: 'guesswork' } })] });

    expect(codes(result, 'ENUM_INVALID')).toEqual([expect.objectContaining({ field: 'extraction.method' })]);
  });
});

describe('locators (LOCATOR_VERIFICATION_INCOMPLETE, LOCATOR_UNVERIFIED_SECURE)', () => {
  const withEvidence = (evidence: Record<string, unknown>) =>
    validateRegistry({ records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', ...evidence }] })] });

  test('a verified locator names who read it, when, and which copy', () => {
    const result = withEvidence({
      locator: '3.8.4',
      locator_state: 'verified',
      verified_by: 'Vlad Simion',
      verified_on: '2026-10-01',
      consulted_copy: 'Nobbe 1843, archive.org scan',
    });

    expect(result.violations).toEqual([]);
  });

  test('a verified locator missing any of the three is incomplete, naming what is missing', () => {
    const result = withEvidence({ locator: '3.8.4', locator_state: 'verified', verified_by: 'Vlad Simion' });

    const violations = codes(result, 'LOCATOR_VERIFICATION_INCOMPLETE');
    expect(violations).toEqual([expect.objectContaining({ field: 'evidence.0', files: ['place/apulum.yaml'] })]);
    expect(violations[0]?.message).toContain('verified_on');
    expect(violations[0]?.message).toContain('consulted_copy');
  });

  test('a pending locator needs no verification details', () => {
    expect(withEvidence({ locator: '3.8.4', locator_state: 'pending', confidence: 'probable' }).violations).toEqual([]);
  });

  test('a secure claim may not rest on a pending locator', () => {
    const result = withEvidence({ locator: '3.8.4', locator_state: 'pending', confidence: 'secure' });

    expect(codes(result, 'LOCATOR_UNVERIFIED_SECURE')).toEqual([expect.objectContaining({ field: 'evidence.0' })]);
  });

  test('a secure claim with no locator at all is also unsupported', () => {
    const result = withEvidence({ confidence: 'secure' });

    expect(codes(result, 'LOCATOR_UNVERIFIED_SECURE')).toHaveLength(1);
  });

  test('a secure claim on a fully verified locator passes', () => {
    const result = withEvidence({
      locator: '3.8.4',
      locator_state: 'verified',
      verified_by: 'Vlad Simion',
      verified_on: '2026-10-01',
      consulted_copy: 'Nobbe 1843',
      confidence: 'secure',
    });

    expect(result.violations).toEqual([]);
  });
});

describe('PROVENANCE_MISSING', () => {
  test.each(['publishable', 'published'])('a %s record without rights fails', (lifecycle) => {
    const result = validateRegistry({ records: [placeWith({ lifecycle })] });

    expect(codes(result, 'PROVENANCE_MISSING')).toEqual([
      expect.objectContaining({ entity: 'tc:tc:place:apulum', field: 'rights' }),
    ]);
  });

  test('a published record with a licence passes', () => {
    const result = validateRegistry({ records: [placeWith({ lifecycle: 'published', rights: { licence: 'CC-BY-4.0' } })] });

    expect(codes(result, 'PROVENANCE_MISSING')).toEqual([]);
  });

  test('rights without a licence still fail on a published record', () => {
    const result = validateRegistry({ records: [placeWith({ lifecycle: 'published', rights: { attribution: 'X' } })] });

    expect(codes(result, 'PROVENANCE_MISSING')).toEqual([expect.objectContaining({ field: 'rights.licence' })]);
  });

  test('records still in research need no rights yet', () => {
    expect(codes(validateRegistry({ records: [placeWith({ lifecycle: 'researching' })] }), 'PROVENANCE_MISSING')).toEqual([]);
  });
});

describe('FINDING_AID_AS_SOURCE', () => {
  test('evidence citing a finding aid is rejected', () => {
    const aid = rec('source/survey.yaml', {
      id: 'survey',
      family: 'source',
      title: 'A survey',
      kind: 'finding_aid',
      bibliography: 'bibliography:b',
    });
    const result = validateRegistry({ records: [bib, aid, placeWith({ evidence: [{ source: 'source:survey' }] })] });

    expect(codes(result, 'FINDING_AID_AS_SOURCE')).toEqual([
      expect.objectContaining({ field: 'evidence.0.source', value: 'source:survey' }),
    ]);
  });

  test('evidence sources must resolve like any other reference', () => {
    const result = validateRegistry({ records: [placeWith({ evidence: [{ source: 'source:missing' }] })] });

    expect(codes(result, 'REF_UNKNOWN')).toEqual([expect.objectContaining({ field: 'evidence.0.source' })]);
  });
});

describe('DATE_INVALID', () => {
  test.each(['0106', '-0106', '159X', '15XX', '1595?', '1595~', '1595%', '1595/1602', '1595-03', '1595-03-12'])(
    '"%s" is valid EDTF',
    (date) => {
      const result = validateRegistry({
        records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', valid_from: date }] })],
      });

      expect(codes(result, 'DATE_INVALID')).toEqual([]);
    },
  );

  test.each(['106', '1595-13', 'c. 1595', '16th century', ''])('"%s" is not valid EDTF', (date) => {
    const result = validateRegistry({
      records: [bib, geographia, placeWith({ evidence: [{ source: 'source:geographia', valid_from: date }] })],
    });

    expect(codes(result, 'DATE_INVALID')).toEqual([
      expect.objectContaining({ field: 'evidence.0.valid_from', value: date }),
    ]);
  });

  test('dates on place names and on dated families are checked too', () => {
    const result = validateRegistry({
      records: [
        placeWith({ names: [{ form: 'Apulum', valid_from: 'second century' }] }),
        rec('period/p.yaml', { id: 'p', family: 'period', title: 'P', valid_from: '0106', valid_to: 'late' }),
      ],
    });

    expect(codes(result, 'DATE_INVALID').map((v) => v.field).sort()).toEqual(['names.0.valid_from', 'valid_to']);
  });
});

describe('EXTRACTION_UNADJUDICATED', () => {
  const llm = { method: 'llm', raw_evidence_ref: 'raw/x.json', transformation_log_ref: 'logs/x.md' };

  test.each(['ready_for_build', 'in_build', 'qa', 'publishable', 'published'])(
    'an unadjudicated automated extraction may not be %s',
    (lifecycle) => {
      const result = validateRegistry({
        records: [placeWith({ lifecycle, extraction: llm, rights: { licence: 'CC-BY-4.0' } })],
      });

      expect(codes(result, 'EXTRACTION_UNADJUDICATED')).toEqual([expect.objectContaining({ field: 'extraction' })]);
    },
  );

  test('it may stay in research while awaiting adjudication', () => {
    const result = validateRegistry({ records: [placeWith({ lifecycle: 'verified', extraction: llm })] });

    expect(codes(result, 'EXTRACTION_UNADJUDICATED')).toEqual([]);
  });

  test('once a person has adjudicated it, it may be published', () => {
    const result = validateRegistry({
      records: [
        placeWith({
          lifecycle: 'published',
          rights: { licence: 'CC-BY-4.0' },
          extraction: { ...llm, adjudicated_by: 'Vlad Simion', adjudicated_on: '2026-10-02' },
        }),
      ],
    });

    expect(codes(result, 'EXTRACTION_UNADJUDICATED')).toEqual([]);
  });
});

describe('essay lifecycle (derived from stage)', () => {
  const essayAt = (stage: string, extra: Record<string, unknown> = {}) =>
    rec('essay/e.yaml', { id: 'e', family: 'essay', title: 'E', slug: 'e', stage, ...extra });

  test.each(['publish', 'cross_link'])('an essay at %s is published, so it needs a licence', (stage) => {
    const result = validateRegistry({ records: [essayAt(stage)] });

    expect(codes(result, 'PROVENANCE_MISSING')).toEqual([expect.objectContaining({ entity: 'tc:tc:essay:e', field: 'rights' })]);
  });

  test.each(['concept', 'corpus', 'research', 'outline', 'draft', 'build', 'design_qa'])(
    'an essay at %s is not yet publishable, so it needs no licence',
    (stage) => {
      expect(codes(validateRegistry({ records: [essayAt(stage)] }), 'PROVENANCE_MISSING')).toEqual([]);
    },
  );

  test('an essay at build with an unadjudicated automated extraction fails (in_build is past verified)', () => {
    const result = validateRegistry({
      records: [essayAt('build', { extraction: { method: 'ocr', raw_evidence_ref: 'r', transformation_log_ref: 'l' } })],
    });

    expect(codes(result, 'EXTRACTION_UNADJUDICATED')).toHaveLength(1);
  });

  test('an essay at draft with the same extraction passes (verified is not past verified)', () => {
    const result = validateRegistry({
      records: [essayAt('draft', { extraction: { method: 'ocr', raw_evidence_ref: 'r', transformation_log_ref: 'l' } })],
    });

    expect(codes(result, 'EXTRACTION_UNADJUDICATED')).toEqual([]);
  });
});

describe('lifecycle and stage values (ESSAY_LIFECYCLE_DECLARED, SUPERSEDED_WITHOUT_SUCCESSOR, ENUM_INVALID)', () => {
  test('an essay may not declare a lifecycle; it is derived from its stage', () => {
    const result = validateRegistry({
      records: [rec('essay/e.yaml', { id: 'e', family: 'essay', title: 'E', slug: 'e', stage: 'draft', lifecycle: 'published' })],
    });

    expect(codes(result, 'ESSAY_LIFECYCLE_DECLARED')).toEqual([expect.objectContaining({ field: 'lifecycle' })]);
    expect(codes(result, 'SCHEMA_INVALID')).toEqual([]);
  });

  test('a superseded record must name its successor', () => {
    const result = validateRegistry({ records: [placeWith({ lifecycle: 'superseded' })] });

    expect(codes(result, 'SUPERSEDED_WITHOUT_SUCCESSOR')).toEqual([
      expect.objectContaining({ entity: 'tc:tc:place:apulum', field: 'superseded_by' }),
    ]);
  });

  test('a superseded record that names a successor passes', () => {
    const result = validateRegistry({
      records: [
        placeWith({ lifecycle: 'superseded', superseded_by: 'place:apulum-2' }),
        rec('place/apulum-2.yaml', { id: 'apulum-2', family: 'place', title: 'Apulum', slug: 'apulum-2' }),
      ],
    });

    expect(result.violations).toEqual([]);
  });

  test('a lifecycle outside the shared vocabulary is ENUM_INVALID', () => {
    const result = validateRegistry({ records: [placeWith({ lifecycle: 'draft' })] });

    expect(codes(result, 'ENUM_INVALID')).toEqual([expect.objectContaining({ field: 'lifecycle', value: 'draft' })]);
  });

  test('an essay stage outside the nine editorial stages is ENUM_INVALID', () => {
    const result = validateRegistry({
      records: [rec('essay/e.yaml', { id: 'e', family: 'essay', title: 'E', slug: 'e', stage: 'writing' })],
    });

    expect(codes(result, 'ENUM_INVALID')).toEqual([expect.objectContaining({ field: 'stage', value: 'writing' })]);
  });
});

describe('specialist vocabularies (FR-011, TC-D016)', () => {
  const cndPlace = (extra: Record<string, unknown>) =>
    rec('place/cnd.yaml', { id: 'apulum', authority: 'cnd', family: 'place', title: 'Apulum', slug: 'apulum-cnd', ...extra });
  const vocabMappings = {
    cnd: {
      lifecycle: { candidate: 'researching', accepted: 'published' },
      confidence: { A: 'secure', B: 'probable' },
    },
  };

  test('a mapped specialist term is accepted', () => {
    const result = validateRegistry({ records: [cndPlace({ lifecycle: 'candidate' })], vocabMappings });

    expect(result.violations).toEqual([]);
  });

  test('the shared meaning of a specialist term drives every rule', () => {
    const published = validateRegistry({ records: [cndPlace({ lifecycle: 'accepted' })], vocabMappings });
    expect(codes(published, 'PROVENANCE_MISSING')).toHaveLength(1);

    const secure = validateRegistry({
      records: [bib, geographia, cndPlace({ evidence: [{ source: 'source:geographia', confidence: 'A' }] })],
      vocabMappings,
    });
    expect(codes(secure, 'LOCATOR_UNVERIFIED_SECURE')).toHaveLength(1);
  });

  test('an unmapped specialist term is ENUM_INVALID, reported as written', () => {
    const result = validateRegistry({ records: [cndPlace({ lifecycle: 'withdrawn' })], vocabMappings });

    expect(codes(result, 'ENUM_INVALID')).toEqual([expect.objectContaining({ field: 'lifecycle', value: 'withdrawn' })]);
  });

  test('mappings apply only to their own authority', () => {
    const result = validateRegistry({ records: [placeWith({ lifecycle: 'candidate' })], vocabMappings });

    expect(codes(result, 'ENUM_INVALID')).toEqual([expect.objectContaining({ value: 'candidate' })]);
  });
});

describe('ASSET_MISSING', () => {
  const layer = (extra: Record<string, unknown>) =>
    rec('layer/roads.yaml', { id: 'roads', family: 'layer', title: 'Roads', asset: 'layers/roads.fgb', ...extra });
  const licence = { rights: { licence: 'CC-BY-4.0' } };

  test('a published layer whose asset is available passes', () => {
    const result = validateRegistry({
      records: [layer({ lifecycle: 'published', ...licence })],
      assets: new Set(['layers/roads.fgb']),
    });

    expect(result.violations).toEqual([]);
  });

  test('a published layer whose asset is not available fails, naming the path', () => {
    const result = validateRegistry({ records: [layer({ lifecycle: 'published', ...licence })], assets: new Set() });

    expect(codes(result, 'ASSET_MISSING')).toEqual([
      expect.objectContaining({ entity: 'tc:tc:layer:roads', field: 'asset', value: 'layers/roads.fgb' }),
    ]);
  });

  test('a published layer with no asset at all fails', () => {
    const result = validateRegistry({
      records: [rec('layer/x.yaml', { id: 'x', family: 'layer', title: 'X', lifecycle: 'published', ...licence })],
      assets: new Set(),
    });

    expect(codes(result, 'ASSET_MISSING')).toEqual([expect.objectContaining({ field: 'asset' })]);
  });

  test.each(['proposed', 'in_build', 'qa'])(
    'a %s layer may lack its asset',
    (lifecycle) => {
      expect(codes(validateRegistry({ records: [layer({ lifecycle })], assets: new Set() }), 'ASSET_MISSING')).toEqual([]);
    },
  );
});

describe('portal dimensions (FR-012)', () => {
  const essay = (extra: Record<string, unknown>) =>
    rec('essay/e.yaml', { id: 'e', family: 'essay', title: 'E', slug: 'e', stage: 'draft', ...extra });

  test('an essay may carry any of the six portal dimensions, or none', () => {
    const all = ['measure', 'witness', 'use', 'cosmos', 'power', 'silence'];
    expect(validateRegistry({ records: [essay({ dimensions: all })] }).violations).toEqual([]);
    expect(validateRegistry({ records: [essay({})] }).violations).toEqual([]);
  });

  test('a dimension outside the six is ENUM_INVALID', () => {
    const result = validateRegistry({ records: [essay({ dimensions: ['witness', 'theme'] })] });

    expect(codes(result, 'ENUM_INVALID')).toEqual([
      expect.objectContaining({ field: 'dimensions.1', value: 'theme' }),
    ]);
  });
});
