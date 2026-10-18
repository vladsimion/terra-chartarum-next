import { beforeAll, describe, expect, it } from 'vitest';
import type { PublicRecord } from '../../../src/registry/project.js';
import { buildIndex, dateInterval } from '../../../src/collection/index-data.js';
import { loadFixture, mapId } from '../support/fixture.js';

/*
 * Spec 004 T031 (contracts/collection-pages.md "Index entry", FR-019): the filter index holds only
 * the contract's fields, for public maps. The year interval comes from the EDTF value, the rooms
 * from the one membership module, the regions from the places a map covers.
 */
describe('dateInterval', () => {
  it.each([
    ['1595', { from: 1595, to: 1595, uncertain: false, label: '1595' }],
    ['1595-03', { from: 1595, to: 1595, uncertain: false, label: '1595' }],
    ['1595?', { from: 1595, to: 1595, uncertain: true, label: '1595 (uncertain)' }],
    ['159X', { from: 1590, to: 1599, uncertain: false, label: '1590s' }],
    ['15XX', { from: 1500, to: 1599, uncertain: false, label: '1500s' }],
    ['1595/1602', { from: 1595, to: 1602, uncertain: false, label: '1595–1602' }],
    ['-0106', { from: -106, to: -106, uncertain: false, label: '106 BCE' }],
  ])('reads %s', (value, expected) => {
    expect(dateInterval(value)).toEqual(expected);
  });

  it('gives nothing for a missing or unreadable date', () => {
    expect(dateInterval(undefined)).toBeNull();
    expect(dateInterval('last Tuesday')).toBeNull();
  });
});

describe('buildIndex on the fixture registry', () => {
  let records: PublicRecord[] = [];
  let index: ReturnType<typeof buildIndex> = [];
  beforeAll(async () => {
    records = await loadFixture();
    index = buildIndex(records);
  });
  const entry = (n: number) => index.find((e) => e.id === mapId(n))!;

  it('lists the public maps and no held one', () => {
    expect(index.map((e) => e.id).sort()).toEqual([1, 2, 3, 4, 6].map(mapId));
  });

  it('holds exactly the contract’s fields and no other', () => {
    for (const e of index) {
      expect(Object.keys(e).sort()).toEqual(['date_label', 'from', 'id', 'makers', 'regions', 'rooms', 'slug', 'title', 'to', 'uncertain', 'witness']);
    }
  });

  it('names the makers by id and name', () => {
    expect(entry(1).makers).toEqual([{ id: 'tc:tc:cartographer:cartographer-000001', name: 'A fixture cartographer' }]);
    // FR-011: an unresolved attribution to a workshop is not an exact maker in any list
    expect(entry(3).makers).toEqual([]);
  });

  it('reads the date, and leaves an undated map without an interval', () => {
    expect(entry(1)).toMatchObject({ date_label: '1595', from: 1595, to: 1595, uncertain: false });
    expect(entry(6)).toMatchObject({ date_label: null, from: null, to: null, uncertain: false });
  });

  it('takes regions from covered places of type region or country, not settlements', () => {
    expect(entry(1).regions).toEqual(['tc:tc:place:place-000001', 'tc:tc:place:place-000002']);
    expect(entry(6).regions).toEqual(['tc:tc:place:place-000001']);
  });

  it('takes rooms from the public essays that cite the map, and a held essay adds none', () => {
    expect(entry(1).rooms).toEqual(['tc:tc:room:map', 'tc:tc:room:border']);
    expect(entry(3).rooms).toEqual([]);
  });

  it('says whose copy it is', () => {
    expect(entry(1).witness).toBe('held');
    expect(entry(2).witness).toBe('institutional');
  });

  it('is in the default order: by date, ties by title, undated last', () => {
    // maps 1 to 4 share 1595; their titles order them 3, 1, 4, 2
    expect(index.map((e) => e.id)).toEqual([3, 1, 4, 2, 6].map(mapId));
    expect(index[index.length - 1]!.from).toBeNull();
  });

  it('carries nothing from a held record or a private field', () => {
    const text = JSON.stringify(index);
    expect(text).not.toContain('dealer');
    expect(text).not.toContain('held-fixture');
    expect(text).not.toContain('private');
  });
});
