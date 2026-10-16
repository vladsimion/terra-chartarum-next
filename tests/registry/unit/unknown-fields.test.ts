import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[]) =>
  validateRegistry(records).violations.filter((v) => v.rule === 'FAM-UNKNOWN');

describe('FAM-UNKNOWN (T122)', () => {
  it('reports a misspelt field by name, as an error whatever the lifecycle', () => {
    for (const lifecycle of ['proposed', 'researching', 'published']) {
      const found = hits([record('place', 1, { lifecycle, slug_histroy: ['old'] })]);
      expect(found, lifecycle).toHaveLength(1);
      expect(found[0]).toMatchObject({ field: 'slug_histroy', severity: 'error', entity: 'tc:tc:place:place-000001' });
    }
  });

  it('reports every unknown field, not only the first', () => {
    const found = hits([record('map', 1, { cartographers: [], rooms: {} })]);
    expect(found.map((v) => v.field).sort()).toEqual(['cartographers', 'rooms']);
  });

  it('judges a field by the family: place_type is a place field, not a source field', () => {
    expect(hits([record('place', 1, { place_type: 'settlement' })])).toEqual([]);
    expect(hits([record('source', 1, { place_type: 'settlement' })]).map((v) => v.field)).toEqual(['place_type']);
  });

  it('accepts the entity fields, the private block and the import fields', () => {
    const found = hits([
      record('place', 1, {
        same_as: [{ authority: 'pleiades', id: '1' }],
        superseded_by: 'tc:tc:place:place-000002',
        withdrawn: true,
        private: { note: 'x' },
        legacy_family: 'port',
        legacy_confidence: 'high',
        legacy_review_state: 'pending',
        legacy_layer_status: 'draft',
        legacy_reviewer: 'a',
        legacy_review_date: '2026-01-01',
        legacy_normalization_method: 'rule_based',
        editor_confirmed: true,
        confirmed_by: 'a',
        confirmed_on: '2026-01-02',
        adjudicated_by: 'a',
        adjudicated_on: '2026-01-02',
      }),
    ]);
    expect(found).toEqual([]);
  });

  it('accepts the fields of every family that the other rules read', () => {
    const dates = { valid_from: '0106', valid_to: '0271', date_label: 'c. 106', date_precision: 'year' };
    const cases: [string, Record<string, unknown>][] = [
      ['collection', { members: [], default_layers: [] }],
      ['route', dates],
      ['event', dates],
      ['period', dates],
      ['essay', { stage: 'Draft', design_qa_passed: false, portal_dimensions: [], evidence: [], maps: [], places: [], sources: [], rights: {} }],
      ['evidence', { target: { entity: 'x' }, source: 'y', locator: {}, evidence_type: 'textual', geometry_provenance: 'source_geometry', reconstruction: false, confidence: 'probable', rights: {}, last_verified: '2026-01-01', provenance_chain: [], ...dates }],
      ['attestation', { place: 'x', source: 'y', form: 'silence', silence_state: 'non_survey', source_coverage_verified: true, confidence: 'possible', locator: {}, rights: {} }],
      ['layer', { role: 'context', asset: 'a', dataset: 'd', geometry: 'g', geometry_provenance: 'modern_reference', images: [], rights: {} }],
      ['map', { makers: [], edition_state: 'e', repository: 'r', images: [], rights: {} }],
      ['dataset', { version: '1', licence: 'CC0', rights: {} }],
      ['source', { is_finding_aid: false, source_kind: 'printed' }],
      ['cartographer', { life_dates: '1527-1598' }],
      ['bibliography_entry', { csl: 'bib/x.json' }],
    ];
    for (const [family, extra] of cases) {
      expect(hits([record(family, 1, extra)]), family).toEqual([]);
    }
  });
});
