import { describe, expect, it } from 'vitest';
import { classesPresent, summarise, type BuiltFeature } from '../../../src/atlas/visible.js';

/*
 * Spec 005 T031 support (FR-013, FR-015): what a layer's loaded features make of a year, and which
 * provenance classes they carry. The map applies the same rule as an expression; this is the
 * tested definition the page's text (counts, legend) is built from.
 */
const feature = (from: number, to: number, over: Partial<BuiltFeature> = {}): BuiltFeature => ({
  _from_min: from,
  _from_max: from,
  _to_min: to,
  _to_max: to,
  _from_unc: 0,
  _to_unc: 0,
  ...over,
});

describe('summarise', () => {
  const features = [feature(106, 170), feature(120, 200, { _from_unc: 1 }), feature(170, 271)];

  it('counts the features shown at a year, and how many of them are only possibly valid', () => {
    expect(summarise(features, 150)).toEqual({ shown: 2, uncertain: 0, total: 3 });
    // the second starts at an uncertain 120: possible there, certain after
    expect(summarise(features, 120)).toEqual({ shown: 2, uncertain: 1, total: 3 });
    expect(summarise(features, 170)).toEqual({ shown: 3, uncertain: 0, total: 3 });
  });

  it('shows nothing outside every interval, and everything certain inside', () => {
    expect(summarise(features, 50)).toEqual({ shown: 0, uncertain: 0, total: 3 });
    expect(summarise(features, 300)).toEqual({ shown: 0, uncertain: 0, total: 3 });
    expect(summarise([feature(100, 200)], 150)).toEqual({ shown: 1, uncertain: 0, total: 1 });
  });

  it('counts an empty layer as nothing', () => {
    expect(summarise([], 1400)).toEqual({ shown: 0, uncertain: 0, total: 0 });
  });
});

describe('summarise with a facet selection', () => {
  const features = [feature(100, 200), feature(100, 200, { status: 'attested' } as never), feature(100, 200, { status: 'proposed' } as never)];

  it('counts only the features the selection keeps, out of all of them', () => {
    const keep = (f: BuiltFeature) => (f as BuiltFeature & { status?: string }).status === 'attested';
    expect(summarise(features, 150, keep)).toEqual({ shown: 1, uncertain: 0, total: 3 });
    expect(summarise(features, 150)).toEqual({ shown: 3, uncertain: 0, total: 3 });
  });
});

describe('classesPresent', () => {
  it('reads a feature\'s own provenance, else the layer\'s', () => {
    const features = [feature(1, 2), feature(1, 2, { geometry_provenance: 'scholarly_reconstruction' })];
    expect(classesPresent(features, 'georeferenced_trace').map((c) => c.id)).toEqual(['documentary', 'reconstruction']);
  });

  it('reads empty text as no own provenance, which is how FlatGeobuf returns a property a feature lacks', () => {
    expect(classesPresent([feature(1, 2, { geometry_provenance: '' })], 'scholarly_reconstruction').map((c) => c.id)).toEqual(['reconstruction']);
  });

  it('lists each class once, in the legend order, and ignores a value it does not know', () => {
    const features = [feature(1, 2, { geometry_provenance: 'generalized_editorial' }), feature(1, 2, { geometry_provenance: 'generalized_editorial' }), feature(1, 2, { geometry_provenance: 'guess' }), feature(1, 2)];
    expect(classesPresent(features, 'source_geometry').map((c) => c.id)).toEqual(['documentary', 'generalised']);
  });
});
