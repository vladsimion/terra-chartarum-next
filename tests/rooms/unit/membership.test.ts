import { describe, expect, it } from 'vitest';
import type { PublicRecord } from '../../../src/registry/project.js';
import { membership } from '../../../src/rooms/membership.js';

/*
 * Spec 007 T013 (FR-007, FR-008, contracts/membership.md): a room's own contents, derived from the
 * public essays that name it. `roomsOf` (the inverse) is tested in roomsof.test.ts.
 */
const NAMES = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'];
const rooms: PublicRecord[] = NAMES.map((name, i) => ({ id: `tc:tc:room:${name}`, family: 'room', title: name[0]!.toUpperCase() + name.slice(1), slug: name, order: i + 1 }));
const essay = (n: number, selection: { primary?: string; secondary?: string[] }, extra: Record<string, unknown> = {}): PublicRecord => ({
  id: `tc:tc:essay:essay-00000${n}`,
  family: 'essay',
  title: `Essay ${n}`,
  slug: `essay-${n}`,
  rooms: { primary: selection.primary && `tc:tc:room:${selection.primary}`, secondary: (selection.secondary ?? []).map((s) => `tc:tc:room:${s}`) },
  ...extra,
});
const map = (n: number, title = `Map ${n}`): PublicRecord => ({ id: `tc:tc:map:map-00000${n}`, family: 'map', title, slug: `map-${n}` });
const layer = (n: number, title = `Layer ${n}`): PublicRecord => ({ id: `tc:tc:layer:layer-00000${n}`, family: 'layer', title, slug: `layer-${n}` });
const of = (records: PublicRecord[], name: string) => membership(records).find((m) => m.room === name)!;
const titles = (records: PublicRecord[]) => records.map((r) => r.title);

describe('membership', () => {
  it('gives all seven rooms, in canonical order, even with no essay', () => {
    expect(membership(rooms).map((m) => m.room)).toEqual(NAMES);
    expect(of(rooms, 'earth')).toMatchObject({ primaryEssays: [], secondaryEssays: [], maps: [], layers: [] });
  });

  it('lists primary and secondary essays apart, each in title order', () => {
    const records = [
      ...rooms,
      essay(3, { primary: 'road' }, { title: 'Zebra roads' }),
      essay(1, { primary: 'road' }, { title: 'Alpine roads' }),
      essay(2, { primary: 'city', secondary: ['road'] }, { title: 'Mountain towns' }),
      essay(4, { primary: 'city', secondary: ['road'] }, { title: 'Anthills' }),
    ];
    expect(titles(of(records, 'road').primaryEssays)).toEqual(['Alpine roads', 'Zebra roads']);
    expect(titles(of(records, 'road').secondaryEssays)).toEqual(['Anthills', 'Mountain towns']);
  });

  it('orders titles without regard to case or diacritics, ties by slug', () => {
    const records = [
      ...rooms,
      essay(1, { primary: 'map' }, { title: 'étude', slug: 'b' }),
      essay(2, { primary: 'map' }, { title: 'Etude', slug: 'a' }),
      essay(3, { primary: 'map' }, { title: 'abacus', slug: 'c' }),
    ];
    expect(of(records, 'map').primaryEssays.map((e) => e.slug)).toEqual(['c', 'a', 'b']);
  });

  it('puts an essay named both primary and secondary under primary only', () => {
    const records = [...rooms, essay(1, { primary: 'city', secondary: ['city'] })];
    expect(of(records, 'city').primaryEssays).toHaveLength(1);
    expect(of(records, 'city').secondaryEssays).toEqual([]);
  });

  it('lists the maps and layers of an essay in either role, once, in title order', () => {
    const records = [
      ...rooms,
      map(1, 'Zeta map'),
      map(2, 'Alpha map'),
      layer(1, 'Roads'),
      essay(1, { primary: 'road' }, { maps: [map(1).id, map(2).id], layers: [layer(1).id] }),
      essay(2, { primary: 'city', secondary: ['road'] }, { maps: [map(2).id], layers: [layer(1).id] }),
    ];
    expect(titles(of(records, 'road').maps)).toEqual(['Alpha map', 'Zeta map']);
    expect(titles(of(records, 'road').layers)).toEqual(['Roads']);
  });

  it('lists a map used by essays in several rooms in each of them', () => {
    const records = [...rooms, map(1), essay(1, { primary: 'earth' }, { maps: [map(1).id] }), essay(2, { primary: 'border', secondary: ['archive'] }, { maps: [map(1).id] })];
    expect(['earth', 'border', 'archive'].map((r) => of(records, r).maps.length)).toEqual([1, 1, 1]);
    expect(of(records, 'city').maps).toEqual([]);
  });

  it('lists a map or layer no public essay uses in no room', () => {
    const records = [...rooms, map(1), layer(1), essay(1, { primary: 'map' })];
    expect(membership(records).flatMap((m) => [...m.maps, ...m.layers])).toEqual([]);
  });

  it('returns nothing for a reference that is not in the input (a held map or layer is not a public record)', () => {
    const records = [...rooms, essay(1, { primary: 'map' }, { maps: ['tc:tc:map:map-000009'], layers: ['tc:tc:layer:layer-000009'] })];
    expect(of(records, 'map')).toMatchObject({ maps: [], layers: [] });
  });

  it('ignores an essay that names a room not in the input', () => {
    expect(membership([rooms[0]!, essay(1, { primary: 'theatre' })]).map((m) => m.room)).toEqual(['earth']);
  });

  it('is deterministic', () => {
    const records = [...rooms, map(1), essay(1, { primary: 'archive', secondary: ['earth'] }, { maps: [map(1).id] }), essay(2, { primary: 'archive' }, { maps: [map(1).id] })];
    expect(membership(records)).toEqual(membership([...records].reverse()));
  });
});
