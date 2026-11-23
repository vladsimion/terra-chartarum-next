import { describe, expect, it } from 'vitest';
import { editionMapLink } from '../../../src/bibliography/addresses.js';
import { projectPublic } from '../../../src/registry/project.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { validLayer } from '../../registry/support/atlas.js';
import { HELD, PUBLIC, entry } from '../../registry/support/bibliography.js';
import { record } from '../../registry/support/builders.js';

/*
 * Spec 012 T062 (FR-014; contracts/pages.md "Edition" item 7): "See on the map" opens the network
 * collection in the Atlas, marked at the production place, with the address as the only state
 * (ADR 0013). No link when there is nothing public to open: no public network layer, no public
 * collection holding it, or no public production place with a location.
 */
const named = (r: RegistryRecord, slug: string): RegistryRecord => ({ ...r, slug, title: slug });
const dealu = named(record('place', 1, { ...PUBLIC, place_type: 'settlement', names: [{ name: 'Dealu', language: 'ro', kind: 'modern' }], location: { lon: 25.5, lat: 44.9 } }), 'dealu');
const network = named(validLayer(1, { ...PUBLIC, asset: 'derived:place-roles', envelope: '1508/1600' }), 'printing-network');
const corridors = named(validLayer(2, { ...PUBLIC, envelope: '1400/1700' }), 'corridors');
const collection = (o: Partial<RegistryRecord> = {}) =>
  named(record('collection', 1, { ...PUBLIC, members: [network.id, corridors.id], default_layers: [network.id], ...o }), 'the-printing-network');
const made = { place: dealu.id, role: 'produced_at', basis: 'attributed', confidence: 'probable', valid_from: '1508-11-10', evidence: [] };
const edition = (roles: unknown[] = [made]) => entry(1, { ...PUBLIC, place_roles: roles });

function link(records: RegistryRecord[]): string | null {
  const pub = projectPublic(records);
  const e = pub.find((r) => r.id === entry(1).id);
  return e ? editionMapLink(e, pub) : null;
}

describe('editionMapLink', () => {
  it('opens the network collection on the edition’s year, marked at its production place', () => {
    expect(link([dealu, network, corridors, collection(), edition()])).toBe('/atlas/?y=1508&l=printing-network&lens=collection&c=the-printing-network&p=dealu');
  });

  it('activates the network layer even when the collection does not default to it', () => {
    expect(link([dealu, network, corridors, collection({ default_layers: [corridors.id] }), edition()])).toBe(
      '/atlas/?y=1508&l=corridors,printing-network&lens=collection&c=the-printing-network&p=dealu',
    );
  });

  it('leaves the year out when the production date has none to read', () => {
    expect(link([dealu, network, corridors, collection(), edition([{ ...made, valid_from: undefined }])])).toBe(
      '/atlas/?l=printing-network&lens=collection&c=the-printing-network&p=dealu',
    );
  });

  it('gives no link while the network layer is held', () => {
    expect(link([dealu, { ...network, ...HELD }, corridors, collection(), edition()])).toBeNull();
  });

  it('gives no link while no public collection holds the network layer', () => {
    expect(link([dealu, network, corridors, collection({ ...HELD }), edition()])).toBeNull();
    expect(link([dealu, network, corridors, collection({ members: [corridors.id] }), edition()])).toBeNull();
  });

  it('gives no link without a public production place that has a location', () => {
    const copy = { ...made, role: 'held_at', holder: 'A library', valid_from: '1900' };
    expect(link([dealu, network, corridors, collection(), edition([copy])])).toBeNull();
    expect(link([{ ...dealu, ...HELD }, network, corridors, collection(), edition()])).toBeNull();
    expect(link([{ ...dealu, location: undefined }, network, corridors, collection(), edition()])).toBeNull();
  });

  it('gives no link to a layer whose asset is a file, however it is named', () => {
    expect(link([dealu, { ...network, asset: 'data/layers/printing-network.geojson' }, corridors, collection(), edition()])).toBeNull();
  });
});
