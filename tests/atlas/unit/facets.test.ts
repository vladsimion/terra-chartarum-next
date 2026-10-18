import { describe, expect, it } from 'vitest';
import { facetExpression, matchesFacets } from '../../../src/atlas/facets.js';
import type { AtlasIndex, FacetSelection } from '../../../src/atlas/types.js';
import { activate, clearFacet, deactivate, initialState, resetFacets, setFacet } from '../../../src/atlas/view-state.js';

/*
 * Spec 005 T040 (US3, FR-014): facets are a layer's own. A selection filters that layer's features
 * and no other layer's; reset restores them; the same rule is written once as a test on a feature's
 * properties and once as the map expression, and they agree.
 */
const status: FacetSelection = { kind: 'category', values: ['attested', 'proposed'] };
const width: FacetSelection = { kind: 'range', min: 8, max: 20 };
const feature = (properties: Record<string, unknown>) => properties;

describe('matchesFacets', () => {
  it('matches everything when nothing is selected', () => {
    expect(matchesFacets(feature({ status: 'x' }), {})).toBe(true);
  });

  it('matches a category feature whose value is among the chosen, and no other', () => {
    expect(matchesFacets(feature({ status: 'attested' }), { status })).toBe(true);
    expect(matchesFacets(feature({ status: 'reconstructed' }), { status })).toBe(false);
  });

  it('does not match a feature that lacks the property while a category is chosen', () => {
    expect(matchesFacets(feature({}), { status })).toBe(false);
    expect(matchesFacets(feature({ status: '' }), { status })).toBe(false);
  });

  it('matches a range feature inside the bounds, edges included', () => {
    expect(matchesFacets(feature({ width_m: 8 }), { width_m: width })).toBe(true);
    expect(matchesFacets(feature({ width_m: 20 }), { width_m: width })).toBe(true);
    expect(matchesFacets(feature({ width_m: 7.9 }), { width_m: width })).toBe(false);
    expect(matchesFacets(feature({ width_m: 21 }), { width_m: width })).toBe(false);
  });

  it('treats a range with one bound as open on the other side, and a non-number as outside', () => {
    expect(matchesFacets(feature({ width_m: 1000 }), { width_m: { kind: 'range', min: 8, max: Number.POSITIVE_INFINITY } })).toBe(true);
    expect(matchesFacets(feature({ width_m: 'wide' }), { width_m: width })).toBe(false);
    expect(matchesFacets(feature({}), { width_m: width })).toBe(false);
  });

  it('needs every selected property to match', () => {
    const selections = { status, width_m: width };
    expect(matchesFacets(feature({ status: 'attested', width_m: 12 }), selections)).toBe(true);
    expect(matchesFacets(feature({ status: 'attested', width_m: 30 }), selections)).toBe(false);
    expect(matchesFacets(feature({ status: 'reconstructed', width_m: 12 }), selections)).toBe(false);
  });

  it('treats an empty category as no selection', () => {
    expect(matchesFacets(feature({ status: 'x' }), { status: { kind: 'category', values: [] } })).toBe(true);
  });
});

describe('facetExpression', () => {
  it('is null when nothing is selected', () => {
    expect(facetExpression({})).toBeNull();
    expect(facetExpression({ status: { kind: 'category', values: [] } })).toBeNull();
  });

  it('writes a category as membership and a range as two comparisons', () => {
    expect(facetExpression({ status })).toEqual(['all', ['in', ['get', 'status'], ['literal', ['attested', 'proposed']]]]);
    expect(facetExpression({ width_m: width })).toEqual(['all', ['>=', ['to-number', ['get', 'width_m'], Number.NaN], 8], ['<=', ['to-number', ['get', 'width_m'], Number.NaN], 20]]);
  });

  it('leaves an open side of a range out', () => {
    expect(facetExpression({ width_m: { kind: 'range', min: 8, max: Number.POSITIVE_INFINITY } })).toEqual(['all', ['>=', ['to-number', ['get', 'width_m'], Number.NaN], 8]]);
  });
});

describe('facet selections in the view', () => {
  const index: AtlasIndex = {
    layers: ['a', 'b'].map((slug) => ({
      slug,
      title: slug,
      role: 'historical',
      theme: 'territories-boundaries',
      provenance: 'source_geometry',
      collections: [],
      rooms: [],
      tags: [],
      synonyms: [],
      envelope: { from: '0100', to: '0200' },
      time_mode: 'envelope_only' as const,
      description: '',
    })),
    collections: [],
  };
  const start = () => activate(activate(initialState(index), 'a', index), 'b', index);

  it('keeps a selection per layer, so one layer\'s selection does not touch the other', () => {
    const state = setFacet(start(), 'a', 'status', status);
    expect(state.facets).toEqual({ a: { status } });
    expect(state.facets.b).toBeUndefined();
  });

  it('adds a second property to the same layer, and replaces a property\'s selection', () => {
    let state = setFacet(start(), 'a', 'status', status);
    state = setFacet(state, 'a', 'width_m', width);
    state = setFacet(state, 'a', 'status', { kind: 'category', values: ['proposed'] });
    expect(state.facets.a).toEqual({ status: { kind: 'category', values: ['proposed'] }, width_m: width });
  });

  it('clears one property, and drops the layer\'s entry when it was the last', () => {
    const state = clearFacet(setFacet(setFacet(start(), 'a', 'status', status), 'a', 'width_m', width), 'a', 'status');
    expect(state.facets.a).toEqual({ width_m: width });
    expect(clearFacet(state, 'a', 'width_m').facets).toEqual({});
  });

  it('resets one layer and leaves the other\'s selection', () => {
    const state = resetFacets(setFacet(setFacet(start(), 'a', 'status', status), 'b', 'status', status), 'a');
    expect(state.facets).toEqual({ b: { status } });
  });

  it('ignores a facet on a layer that is not active, and stores nothing when the selection is empty', () => {
    expect(setFacet(start(), 'ghost', 'status', status)).toEqual(start());
    expect(setFacet(start(), 'a', 'status', { kind: 'category', values: [] }).facets).toEqual({});
  });

  it('forgets a layer\'s selection when the layer is removed', () => {
    expect(deactivate(setFacet(start(), 'a', 'status', status), 'a').facets).toEqual({});
  });
});
