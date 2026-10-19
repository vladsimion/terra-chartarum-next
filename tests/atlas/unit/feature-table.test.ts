import { describe, expect, it } from 'vitest';
import { featureRows } from '../../../src/atlas/feature-table.js';

/*
 * Spec 005 T060 (FR-016, contracts/atlas-page.md "No WebGL"): the per-layer feature table a reader
 * without WebGL gets, with the year filter applied as text: name, dates, provenance, and whether the
 * date is only possible.
 */
const built = (name: string, from: [number, number], to: [number, number], extra: Record<string, unknown> = {}) => ({
  properties: { name, _from_min: from[0], _from_max: from[1], _to_min: to[0], _to_max: to[1], _from_unc: 0, _to_unc: 0, ...extra },
});

describe('featureRows', () => {
  const features = [
    built('Northern limes', [106, 106], [170, 170], { valid_from: '0106', valid_to: '0170' }),
    built('Western line', [120, 120], [200, 200], { valid_from: '0120?', valid_to: '0200', _from_unc: 1 }),
    built('Later road', [250, 250], [300, 300], { valid_from: '0250', valid_to: '0300' }),
  ];

  it('lists the features valid at the year, with their dates and the layer’s provenance in words', () => {
    expect(featureRows(features, 150, 'source_geometry')).toEqual([
      { name: 'Northern limes', dates: '0106 to 0170', provenance: 'Documentary geometry', possible: false },
      { name: 'Western line', dates: '0120? to 0200', provenance: 'Documentary geometry', possible: false },
    ]);
  });

  it('marks a feature only possibly valid on the year its uncertain date begins', () => {
    expect(featureRows(features, 120, 'source_geometry').map((r) => [r.name, r.possible])).toEqual([
      ['Northern limes', false],
      ['Western line', true],
    ]);
  });

  it('leaves out what is outside the year, and what a facet selection rejects', () => {
    expect(featureRows(features, 260, 'source_geometry').map((r) => r.name)).toEqual(['Later road']);
    expect(featureRows(features, 150, 'source_geometry', (f) => (f as unknown as { name: string }).name !== 'Western line').map((r) => r.name)).toEqual(['Northern limes']);
  });

  it('uses a feature’s own provenance over the layer’s, and treats empty text as none', () => {
    const rows = featureRows([built('A', [1, 1], [9, 9], { geometry_provenance: 'scholarly_reconstruction' }), built('B', [1, 1], [9, 9], { geometry_provenance: '' })], 5, 'source_geometry');
    expect(rows.map((r) => r.provenance)).toEqual(['Reconstruction', 'Documentary geometry']);
  });

  it('says so for a feature with no name or no dates of its own', () => {
    const rows = featureRows([built('', [1, 1], [9, 9], { valid_from: '', valid_to: '' })], 5, 'source_geometry');
    expect(rows[0]).toMatchObject({ name: 'Unnamed feature', dates: 'Dated by the layer' });
  });
});
