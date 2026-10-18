import { describe, expect, it } from 'vitest';
import { schemaFor } from '../../../src/registry/schemas/index.js';
import { GEOREF, atlasNeighbours, hitsOf, validLayer, validOverlay, validPlace } from '../support/atlas.js';

/*
 * Spec 005 T006 (FR-001, FR-009, FR-019, FR-023): the layer and place shapes of the clarified spec.
 * Enumerated values are judged by rules, so the schema only types them.
 */
describe('the layer schema', () => {
  it('loads a layer with every clarified field', () => {
    const parsed = schemaFor('layer').parse(validOverlay(1, { tags: ['a'], synonyms: ['b'] }));
    expect(parsed.theme).toBe('territories-boundaries');
    expect(parsed.time_mode).toBe('envelope_only');
    expect(parsed.envelope).toBe('0106/0271');
    expect(parsed.tags).toEqual(['a']);
    expect(parsed.georef).toEqual(GEOREF);
    expect(parsed.documentation).toEqual([{ label: 'Method', url: 'https://example.org/method' }]);
  });

  it('loads facets as property, label and kind', () => {
    expect(schemaFor('layer').parse(validLayer()).facets).toEqual([{ property: 'status', label: 'Status', kind: 'category' }]);
  });

  it('leaves a value outside its set to the rules (a theme, a time mode, a facet kind)', () => {
    const parsed = schemaFor('layer').safeParse(validLayer(1, { theme: 'nonsense', time_mode: 'sometimes', facets: [{ property: 'p', label: 'P', kind: 'blob' }] }));
    expect(parsed.success).toBe(true);
  });

  it('takes documentation as label and https url, and rejects anything else', () => {
    const parse = (documentation: unknown) => schemaFor('layer').safeParse(validLayer(1, { documentation: documentation as never })).success;
    expect(parse([{ label: 'Method', url: 'https://example.org/m' }])).toBe(true);
    expect(parse([{ label: 'Method', url: 'http://example.org/m' }])).toBe(false);
    expect(parse([{ label: 'Method' }])).toBe(false);
    expect(parse(['https://example.org/m'])).toBe(false);
  });

  it('rejects tags that are not strings', () => {
    expect(schemaFor('layer').safeParse(validLayer(1, { tags: [1] as never })).success).toBe(false);
  });

  it('still rejects an unlisted field (FAM-UNKNOWN)', () => {
    expect(hitsOf('FAM-UNKNOWN', [validLayer(1, { colour: 'red' }), ...atlasNeighbours()]).map((v) => v.field)).toEqual(['colour']);
    expect(hitsOf('FAM-UNKNOWN', [validOverlay(), ...atlasNeighbours()])).toEqual([]);
  });
});

describe('georef.map', () => {
  it('resolves to a map record', () => {
    expect(hitsOf('REF-UNKNOWN', [validOverlay(), ...atlasNeighbours()])).toEqual([]);
    expect(hitsOf('REF-FAMILY', [validOverlay(), ...atlasNeighbours()])).toEqual([]);
  });

  it('reports an unknown id (REF-UNKNOWN) and the wrong family (REF-FAMILY)', () => {
    const unknown = validOverlay(1, { georef: { ...GEOREF, map: 'tc:tc:map:map-000099' } });
    expect(hitsOf('REF-UNKNOWN', [unknown, ...atlasNeighbours()]).map((v) => v.field)).toEqual(['georef.map']);
    const wrong = validOverlay(1, { georef: { ...GEOREF, map: 'tc:tc:dataset:dataset-000001' } });
    expect(hitsOf('REF-FAMILY', [wrong, ...atlasNeighbours()]).map((v) => v.field)).toEqual(['georef.map']);
  });
});

describe('the place schema', () => {
  it('loads names and a location', () => {
    const parsed = schemaFor('place').parse(validPlace());
    expect(parsed.names).toHaveLength(2);
    expect(parsed.location).toEqual({ lon: 23.57, lat: 46.07 });
  });

  it('leaves a bad kind, language or coordinate to the rules', () => {
    const parsed = schemaFor('place').safeParse(validPlace(1, { names: [{ name: 'x', language: '??', kind: 'odd' }], location: { lon: 999, lat: 'north' } }));
    expect(parsed.success).toBe(true);
  });

  it('still rejects an unlisted field (FAM-UNKNOWN)', () => {
    expect(hitsOf('FAM-UNKNOWN', [validPlace(1, { elevation: 100 })]).map((v) => v.field)).toEqual(['elevation']);
    expect(hitsOf('FAM-UNKNOWN', [validPlace()])).toEqual([]);
  });
});
