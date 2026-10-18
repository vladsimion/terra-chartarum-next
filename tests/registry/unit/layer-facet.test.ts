import { describe, expect, it } from 'vitest';
import { atLifecycle, validLayer } from '../support/atlas.js';

/* Spec 005 T010 (FR-014): `LAYER-FACET`. An error at any lifecycle, like the other structural rules. */
const facet = (over: Record<string, unknown> = {}) => ({ property: 'status', label: 'Status', kind: 'category', ...over });
const hits = (facets: unknown, over: Record<string, unknown> = {}, lifecycle = 'researching') =>
  atLifecycle('LAYER-FACET', lifecycle, validLayer(1, { facets: facets as never, ...over }));

describe('LAYER-FACET', () => {
  it('accepts category and range facets, and a layer with none', () => {
    expect(hits([facet(), facet({ property: 'width', label: 'Width', kind: 'range' })])).toEqual([]);
    expect(hits(undefined)).toEqual([]);
    expect(hits([])).toEqual([]);
  });

  it('flags a facet missing its property, label or kind', () => {
    expect(hits([facet({ property: undefined })]).map((v) => v.field)).toEqual(['facets[0].property']);
    expect(hits([facet({ label: ' ' })]).map((v) => v.field)).toEqual(['facets[0].label']);
    expect(hits([facet({ kind: undefined })]).map((v) => v.field)).toEqual(['facets[0].kind']);
  });

  it('flags a kind that is neither category nor range', () => {
    expect(hits([facet({ kind: 'cloud' })]).map((v) => [v.field, v.value])).toEqual([['facets[0].kind', 'cloud']]);
  });

  it('flags a property used twice, once, on the second', () => {
    expect(hits([facet(), facet({ label: 'Again' })]).map((v) => v.field)).toEqual(['facets[1].property']);
  });

  it('flags valid_from and valid_to as facets on a per-feature layer, but not on an envelope-only one', () => {
    expect(hits([facet({ property: 'valid_from' })], { time_mode: 'per_feature' }).map((v) => v.field)).toEqual(['facets[0].property']);
    expect(hits([facet({ property: 'valid_to' })], { time_mode: 'per_feature' }).map((v) => v.field)).toEqual(['facets[0].property']);
    expect(hits([facet({ property: 'valid_from' })], { time_mode: 'envelope_only' })).toEqual([]);
  });

  it('flags a facets field that is not a list, and an entry that is not an object', () => {
    expect(hits('status').map((v) => v.field)).toEqual(['facets']);
    expect(hits(['status']).map((v) => v.field)).toEqual(['facets[0]']);
  });

  it('is an error at every lifecycle', () => {
    for (const lifecycle of ['proposed', 'ready_for_build', 'published']) {
      expect(hits([facet({ kind: 'cloud' })], {}, lifecycle).map((v) => v.severity)).toEqual(['error']);
    }
  });
});
