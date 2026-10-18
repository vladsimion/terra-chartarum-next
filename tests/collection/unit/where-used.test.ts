import { beforeAll, describe, expect, it } from 'vitest';
import type { PublicRecord } from '../../../src/registry/project.js';
import { whereUsed } from '../../../src/collection/where-used.js';
import { byId, loadFixture, mapId } from '../support/fixture.js';

/*
 * Spec 004 T038 (US4): the public records that refer to a map, derived and never stored: essays that
 * list it in maps[], layers that relate to it, places that relate to it or that it covers. Held
 * records are not in the public projection, so none can appear; the lists are in title order.
 */
let records: PublicRecord[] = [];
beforeAll(async () => {
  records = await loadFixture();
});
const used = (n: number) => whereUsed(byId(records, mapId(n)), records);

describe('whereUsed on the fixture registry', () => {
  it('lists the public essays that cite the map, in title order, linked to their pages', () => {
    expect(used(2).essays).toEqual([
      { id: 'tc:tc:essay:essay-000002', title: 'A related fixture essay', href: '/essays/fixture-related/' },
      { id: 'tc:tc:essay:essay-000001', title: 'Fixture essay, how a frontier line was drawn', href: '/essays/fixture-frontier/' },
    ]);
  });

  it('omits the held essay that cites the same map', () => {
    expect(JSON.stringify(used(2))).not.toContain('Zephyr');
    expect(used(1).essays.map((e) => e.id)).not.toContain('tc:tc:essay:essay-000003');
  });

  it('lists the public layers related to the map, and omits a held layer', () => {
    expect(used(2).layers).toEqual([{ id: 'tc:tc:layer:layer-000001', title: 'Fixture road network', href: null }]);
    expect(JSON.stringify(used(2))).not.toContain('A held fixture layer');
  });

  it('lists the places the map covers and the places related to it, once each, and omits a held place', () => {
    expect(used(2).places.map((p) => p.title)).toEqual(['Fixture Town', 'Fixture Valley', 'Fixtureland']);
    expect(JSON.stringify(used(2))).not.toContain('A held fixture place');
  });

  it('is empty in each list that has nothing', () => {
    expect(used(3).essays).toEqual([]);
    expect(used(3).layers).toEqual([]);
  });
});

describe('whereUsed on a map nothing refers to', () => {
  it('is empty throughout', () => {
    const lonely: PublicRecord = { id: 'tc:tc:map:map-000099', family: 'map', title: 'Lonely', slug: 'lonely' };
    expect(whereUsed(lonely, [...records, lonely])).toEqual({ essays: [], layers: [], places: [] });
  });
});

describe('whereUsed in general', () => {
  const map: PublicRecord = { id: 'tc:tc:map:map-000001', family: 'map', title: 'M', slug: 'm', coverage: ['tc:tc:place:place-000001'] };
  const place = (n: number, extra: Record<string, unknown> = {}): PublicRecord => ({ id: `tc:tc:place:place-00000${n}`, family: 'place', title: `Place ${n}`, slug: `p${n}`, ...extra });

  it('lists a place once when it is both covered and related', () => {
    const records = [map, place(1, { relations: [map.id] })];
    expect(whereUsed(map, records).places).toHaveLength(1);
  });

  it('ignores a covered place that is not in the public records', () => {
    expect(whereUsed(map, [map]).places).toEqual([]);
  });

  it('orders titles without regard to case or accents', () => {
    const records = [map, place(1, { title: 'émile', relations: [map.id] }), place(2, { title: 'Zed', relations: [map.id] }), place(3, { title: 'alpha', relations: [map.id] })];
    expect(whereUsed(map, records).places.map((p) => p.title)).toEqual(['alpha', 'émile', 'Zed']);
  });
});
