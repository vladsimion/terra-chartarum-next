import { describe, expect, it } from 'vitest';
import { cartographerView } from '../../../src/collection/cartographer-view.js';
import type { PublicRecord } from '../../../src/registry/project.js';

/*
 * Spec 004 US3 and FR-011: a workshop's unresolved maps are listed apart, are never its exact work in
 * any list, and the essays shown are the ones that use maps it is exactly credited with.
 */
const workshop: PublicRecord = { id: 'tc:tc:cartographer:cartographer-000002', family: 'cartographer', title: 'Workshop', slug: 'workshop', kind: 'workshop' };
const person: PublicRecord = { id: 'tc:tc:cartographer:cartographer-000001', family: 'cartographer', title: 'Person', slug: 'person', kind: 'person' };
const map = (n: number, makers: string[], attribution?: string): PublicRecord => ({
  id: `tc:tc:map:map-00000${n}`, family: 'map', title: `Map ${n}`, slug: `map-${n}`, makers, ...(attribution ? { attribution } : {}),
});
const essay = (n: number, maps: string[]): PublicRecord => ({ id: `tc:tc:essay:essay-00000${n}`, family: 'essay', title: `Essay ${n}`, slug: `essay-${n}`, maps });

describe('cartographerView', () => {
  const records = [
    person, workshop,
    map(1, [person.id]), map(2, [workshop.id], 'unresolved'), map(3, [workshop.id, person.id], 'unresolved'),
    essay(1, ['tc:tc:map:map-000001']), essay(2, ['tc:tc:map:map-000002']),
  ];

  it('lists a workshop’s unresolved maps apart and none as exact', () => {
    const v = cartographerView(workshop, records);
    expect(v.maps).toEqual([]);
    expect(v.unresolved.map((m) => m.title)).toEqual(['Map 2', 'Map 3']);
  });

  it('does not show a workshop the essays that use only its unresolved maps', () => {
    expect(cartographerView(workshop, records).essays).toEqual([]);
  });

  it('shows a person the essays that use the maps it is exactly credited with', () => {
    expect(cartographerView(person, records).maps.map((m) => m.title)).toEqual(['Map 1']);
    expect(cartographerView(person, records).essays.map((e) => e.title)).toEqual(['Essay 1']);
  });

  it('does not count an unresolved map towards a person named beside a workshop', () => {
    expect(cartographerView(person, records).unresolved.map((m) => m.title)).toEqual(['Map 3']);
  });
});
