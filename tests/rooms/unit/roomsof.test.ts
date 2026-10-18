import { describe, expect, it } from 'vitest';
import type { PublicRecord } from '../../../src/registry/project.js';
import { roomsOf } from '../../../src/rooms/membership.js';

/*
 * `roomsOf` from specs/007-rooms/contracts/membership.md, built early because spec 004's index needs
 * it (ADR 0015: membership is derived once). A map's rooms are the rooms of the public essays that
 * list it in `maps[]`, primary and secondary, in the canonical order of the seven.
 */
const NAMES = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'];
const room = (name: string): PublicRecord => ({ id: `tc:tc:room:${name}`, family: 'room', title: name, slug: name });
const rooms = NAMES.map(room);
const essay = (n: number, selection: { primary?: string; secondary?: string[] }, extra: Record<string, unknown> = {}): PublicRecord => ({
  id: `tc:tc:essay:essay-00000${n}`,
  family: 'essay',
  title: `Essay ${n}`,
  slug: `essay-${n}`,
  rooms: { primary: selection.primary && `tc:tc:room:${selection.primary}`, secondary: (selection.secondary ?? []).map((s) => `tc:tc:room:${s}`) },
  ...extra,
});
const map = (n: number): PublicRecord => ({ id: `tc:tc:map:map-00000${n}`, family: 'map', title: `Map ${n}`, slug: `map-${n}` });
const layer: PublicRecord = { id: 'tc:tc:layer:layer-000001', family: 'layer', title: 'Layer', slug: 'layer' };

describe('roomsOf', () => {
  it('gives the primary and secondary rooms of the essays that cite the map, in canonical order', () => {
    const records = [...rooms, map(1), essay(1, { primary: 'border', secondary: ['map'] }, { maps: [map(1).id] })];
    expect(roomsOf(map(1), records)).toEqual(['map', 'border']);
  });

  it('merges the rooms of several essays and lists each room once', () => {
    const records = [
      ...rooms,
      map(1),
      essay(1, { primary: 'road' }, { maps: [map(1).id] }),
      essay(2, { primary: 'earth', secondary: ['road'] }, { maps: [map(1).id] }),
    ];
    expect(roomsOf(map(1), records)).toEqual(['earth', 'road']);
  });

  it('gives none for a map no public essay cites', () => {
    expect(roomsOf(map(2), [...rooms, map(2), essay(1, { primary: 'map' }, { maps: [map(1).id] })])).toEqual([]);
  });

  it('ignores a reference to a room that is not in the input', () => {
    const records = [room('map'), map(1), essay(1, { primary: 'map', secondary: ['border'] }, { maps: [map(1).id] })];
    expect(roomsOf(map(1), records)).toEqual(['map']);
  });

  it('works for a layer through layers[], and for an essay through its own rooms', () => {
    const records = [...rooms, layer, essay(1, { primary: 'city' }, { layers: [layer.id] })];
    expect(roomsOf(layer, records)).toEqual(['city']);
    expect(roomsOf(records.find((r) => r.family === 'essay')!, records)).toEqual(['city']);
  });

  it('is deterministic: the same input gives the same output', () => {
    const records = [...rooms, map(1), essay(1, { primary: 'archive', secondary: ['earth', 'theatre'] }, { maps: [map(1).id] })];
    expect(roomsOf(map(1), records)).toEqual(roomsOf(map(1), [...records].reverse()));
  });
});
