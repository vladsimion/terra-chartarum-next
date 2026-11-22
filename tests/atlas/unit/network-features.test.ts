import { describe, expect, it } from 'vitest';
import { networkFeatures } from '../../../src/atlas/build/network-features.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { HELD, PUBLIC, entry } from '../../registry/support/bibliography.js';
import { record } from '../../registry/support/builders.js';

/*
 * Spec 012 T024 (US2; FR-004 to FR-007, FR-012; contracts/network-layer.md): the network layer is
 * derived from the records, one point per public edition and place role, at its place's location.
 * Nothing is drawn for a held edition, a superseded attribution or paper; a role on a held place is
 * a build failure naming the edition and the place, never a silent gap.
 */
const LAYER = 'printing-network';
const place = (n: number, o: Partial<RegistryRecord> = {}) =>
  record('place', n, { ...PUBLIC, place_type: 'settlement', names: [{ name: `Place ${n}`, language: 'en', kind: 'modern' }], location: { lon: 25 + n, lat: 45 }, ...o });

const dealu = place(1, { title: 'Dealu Monastery' });
const library = place(2, { title: 'Bucharest' });
const venice = place(3, { title: 'Venice' });

const made = { place: dealu.id, role: 'produced_at', basis: 'attributed', confidence: 'probable', valid_from: '1508-11-10', evidence: [] };
const copy = { place: library.id, role: 'held_at', basis: 'stated', confidence: 'probable', holder: 'Library of the Academy', shelfmark: 'CRV 1', valid_from: '1950', evidence: [] };
const former = { place: dealu.id, role: 'held_at', basis: 'stated', confidence: 'possible', holder: 'Dealu Monastery library', valid_from: '1508', valid_to: '1821', evidence: [] };

const edition = (o: Partial<RegistryRecord> = {}) =>
  entry(1, { ...PUBLIC, title: 'Liturghier, 1508', section: 'primary_sources', place_roles: [made, copy, former], attribution_history: [{ place: venice.id, note: 'Venice, from the type.' }], ...o });

const build = (records: RegistryRecord[]) => networkFeatures(records, LAYER);

describe('networkFeatures', () => {
  it('makes one point per place role of a public edition, at the place’s location', () => {
    const { features, failures } = build([dealu, library, venice, edition()]);
    expect(failures).toEqual([]);
    expect(features.map((f) => [f.properties.id, f.properties.role, f.geometry.coordinates])).toEqual([
      ['bibliography_entry-000001:0', 'produced_at', [26, 45]],
      ['bibliography_entry-000001:1', 'held_at', [27, 45]],
      ['bibliography_entry-000001:2', 'held_at', [26, 45]],
    ]);
    for (const f of features) expect(f.geometry.type).toBe('Point');
  });

  it('carries the contract’s properties, and says in words what each pin is', () => {
    const [m, c, f] = build([dealu, library, venice, edition()]).features;
    expect(m?.properties).toMatchObject({
      edition: entry(1).id,
      title: 'Liturghier, 1508',
      place: dealu.id,
      place_name: 'Dealu Monastery',
      role: 'produced_at',
      basis: 'attributed',
      confidence: 'probable',
      valid_from: '1508-11-10',
      valid_to: '1508-11-10',
      formerly: false,
      label: 'Made here (attributed, probable): Liturghier, 1508',
    });
    // the no-WebGL feature table reads `name`: it says the same as the pin
    for (const feature of [m, c, f]) expect(feature?.properties.name).toBe(feature?.properties.label);
    expect(c?.properties).toMatchObject({ holder: 'Library of the Academy', shelfmark: 'CRV 1', held_from: '1950', formerly: false, label: 'A copy is kept here: Library of the Academy (Liturghier, 1508)' });
    expect(f?.properties).toMatchObject({ held_from: '1508', held_to: '1821', formerly: true, label: 'Formerly kept here: Dealu Monastery library, until 1821 (Liturghier, 1508)' });
  });

  it('never gives a holding the network’s own time: custody dates are text only', () => {
    const [, c, f] = build([dealu, library, venice, edition()]).features;
    for (const holding of [c, f]) {
      expect(holding?.properties.valid_from).toBeUndefined();
      expect(holding?.properties.valid_to).toBeUndefined();
    }
  });

  it('draws nothing for an earlier attribution', () => {
    const { features } = build([dealu, library, venice, edition()]);
    expect(features.some((f) => f.properties.place === venice.id)).toBe(false);
  });

  it('draws nothing for a held edition, or an entry without place roles', () => {
    expect(build([dealu, library, venice, edition(HELD)]).features).toEqual([]);
    expect(build([dealu, library, venice, edition({ place_roles: undefined })]).features).toEqual([]);
  });

  it('fails, naming edition and place, when a role points at a held place (ATLAS-ROLE-PLACE-HELD)', () => {
    const heldLibrary = { ...library, ...HELD };
    const { features, failures } = build([dealu, heldLibrary, venice, edition()]);
    expect(failures).toEqual([
      { check: 'ATLAS-ROLE-PLACE-HELD', layer: LAYER, message: `${entry(1).id} place_roles[1] names a place that is not public (${library.id}), so its pin cannot be drawn` },
    ]);
    expect(features).toEqual([]);
  });

  it('fails when a public place has no location to draw it at (ATLAS-ROLE-PLACE-LOCATION)', () => {
    const { failures } = build([{ ...dealu, location: undefined }, library, venice, edition()]);
    expect(failures.map((f) => f.check)).toEqual(['ATLAS-ROLE-PLACE-LOCATION', 'ATLAS-ROLE-PLACE-LOCATION']);
  });

  it('yields an empty network for a registry with no editions', () => {
    expect(build([dealu])).toEqual({ features: [], failures: [] });
  });
});
