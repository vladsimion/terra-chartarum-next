import { describe, expect, it } from 'vitest';
import type { IndexEntry } from '../../../src/collection/index-data.js';
import { applyFilters, parseQuery, serialise } from '../../../src/collection/filter.js';

/*
 * Spec 004 T033 (US2, contracts/collection-pages.md "Query string"): each facet alone and combined;
 * a date range matches any possibly overlapping date and never an undated record; the three sorts
 * are stable and put undated records last; an address means the same view every time.
 */
const entry = (n: number, over: Partial<IndexEntry> = {}): IndexEntry => ({
  id: `tc:tc:map:map-${String(n).padStart(6, '0')}`,
  slug: `map-${n}`,
  title: `Map ${n}`,
  makers: [{ id: 'c1', name: 'Alpha' }],
  date_label: '1595',
  from: 1595,
  to: 1595,
  uncertain: false,
  regions: ['r1'],
  rooms: ['tc:tc:room:map'],
  witness: 'institutional',
  ...over,
});
const ids = (entries: IndexEntry[]) => entries.map((e) => Number(e.id.slice(-6)));
const run = (entries: IndexEntry[], query: string) => ids(applyFilters(entries, parseQuery(query)));

describe('each facet alone', () => {
  const all = [
    entry(1, { makers: [{ id: 'c1', name: 'Alpha' }], regions: ['r1'], rooms: ['tc:tc:room:map'], witness: 'held' }),
    entry(2, { makers: [{ id: 'c2', name: 'Beta' }], regions: ['r2'], rooms: ['tc:tc:room:city'], witness: 'institutional' }),
    entry(3, { makers: [{ id: 'c1', name: 'Alpha' }, { id: 'c2', name: 'Beta' }], regions: ['r1', 'r2'], rooms: [], witness: 'institutional' }),
  ];

  it('filters by cartographer, and a map with several makers matches any of them', () => {
    expect(run(all, 'cartographer=c2')).toEqual([2, 3]);
  });

  it('filters by region', () => {
    expect(run(all, 'region=r2')).toEqual([2, 3]);
  });

  it('filters by room, and a map in no room matches no room filter', () => {
    expect(run(all, 'room=tc:tc:room:city')).toEqual([2]);
    expect(run(all, 'room=tc:tc:room:map&room=tc:tc:room:city')).toEqual([1, 2]);
  });

  it('filters by witness kind', () => {
    expect(run(all, 'witness=held')).toEqual([1]);
    expect(run(all, 'witness=institutional')).toEqual([2, 3]);
  });

  it('lists everything with no filter', () => {
    expect(run(all, '')).toEqual([1, 2, 3]);
  });
});

describe('combined facets', () => {
  const all = [
    entry(1, { makers: [{ id: 'c1', name: 'Alpha' }], regions: ['r1'], witness: 'held' }),
    entry(2, { makers: [{ id: 'c1', name: 'Alpha' }], regions: ['r2'], witness: 'institutional' }),
    entry(3, { makers: [{ id: 'c2', name: 'Beta' }], regions: ['r1'], witness: 'institutional' }),
  ];

  it('needs every facet to match, and any of a facet’s values', () => {
    expect(run(all, 'cartographer=c1&region=r1')).toEqual([1]);
    expect(run(all, 'cartographer=c1&cartographer=c2&witness=institutional')).toEqual([2, 3]);
    expect(run(all, 'cartographer=c2&witness=held')).toEqual([]);
  });
});

describe('the date range (US2.1)', () => {
  const all = [
    entry(1, { from: 1595, to: 1595, date_label: '1595' }),
    entry(2, { from: 1595, to: 1602, date_label: '1595–1602' }),
    entry(3, { from: 1590, to: 1599, date_label: '1590s' }),
    entry(4, { from: 1700, to: 1700, date_label: '1700' }),
    entry(5, { from: null, to: null, date_label: null }),
    entry(6, { from: 1595, to: 1595, uncertain: true, date_label: '1595 (uncertain)' }),
  ];

  it('lists every record whose possible years overlap the range', () => {
    expect(run(all, 'from=1600&to=1610')).toEqual([2]);
    expect(run(all, 'from=1598&to=1600')).toEqual([3, 2]);
    // in date order: the 1590s start first, then the 1595 records by their end, then ties by title
    expect(run(all, 'from=1595&to=1595')).toEqual([3, 1, 6, 2]);
  });

  it('treats a missing end as open', () => {
    expect(run(all, 'from=1650')).toEqual([4]);
    expect(run(all, 'to=1590')).toEqual([3]);
  });

  it('matches an uncertain date by the years it can mean', () => {
    expect(run(all, 'from=1595&to=1595')).toContain(6);
  });

  it('never matches an undated record once a date filter is set, and keeps it when there is none', () => {
    expect(run(all, 'from=1500&to=1900')).not.toContain(5);
    expect(run(all, '')).toContain(5);
  });

  it('reads a BCE range', () => {
    const bce = [entry(1, { from: -106, to: -106, date_label: '106 BCE' })];
    expect(run(bce, 'from=-200&to=-100')).toEqual([1]);
    expect(run(bce, 'from=0')).toEqual([]);
  });
});

describe('sorting (US2.3)', () => {
  const all = [
    entry(1, { title: 'Delta', from: 1700, to: 1700, makers: [{ id: 'c', name: 'zeta' }] }),
    entry(2, { title: 'alpha', from: 1595, to: 1595, makers: [{ id: 'c', name: 'Beta' }] }),
    entry(3, { title: 'Bravo', from: null, to: null, makers: [] }),
    entry(4, { title: 'Charlie', from: 1595, to: 1595, makers: [{ id: 'c', name: 'Beta' }] }),
    entry(5, { title: 'Echo', from: 1595, to: 1602, makers: [{ id: 'c', name: 'Alpha' }] }),
  ];

  it('sorts by date by default, ties by title, undated last', () => {
    expect(run(all, '')).toEqual([2, 4, 5, 1, 3]);
    expect(run(all, 'sort=date')).toEqual([2, 4, 5, 1, 3]);
  });

  it('sorts by title without regard to case', () => {
    expect(run(all, 'sort=title')).toEqual([2, 3, 4, 1, 5]);
  });

  it('sorts by maker, ties by title, a map with no maker last', () => {
    expect(run(all, 'sort=maker')).toEqual([5, 2, 4, 1, 3]);
  });

  it('is stable: the same records in any input order come out the same', () => {
    for (const sort of ['date', 'title', 'maker']) {
      expect(ids(applyFilters([...all].reverse(), parseQuery(`sort=${sort}`)))).toEqual(run(all, `sort=${sort}`));
    }
  });

  it('keeps equal records in id order', () => {
    const twins = [entry(2, { title: 'Same' }), entry(1, { title: 'Same' })];
    expect(run(twins, 'sort=title')).toEqual([1, 2]);
  });
});

describe('the query string', () => {
  it('reads every key', () => {
    expect(parseQuery('cartographer=c1&cartographer=c2&from=1590&to=1610&region=r1&room=tc:tc:room:map&witness=held&sort=title')).toEqual({
      cartographer: ['c1', 'c2'],
      from: 1590,
      to: 1610,
      region: ['r1'],
      room: ['tc:tc:room:map'],
      witness: 'held',
      sort: 'title',
    });
  });

  it('ignores an unknown key and an unknown or unreadable value', () => {
    expect(parseQuery('bogus=1&witness=weird&from=abc&to=&sort=weird&cartographer=')).toEqual(parseQuery(''));
  });

  it('accepts a URLSearchParams as well as a string, with or without the leading question mark', () => {
    expect(parseQuery('?witness=held')).toEqual(parseQuery(new URLSearchParams('witness=held')));
  });

  it('serialises to a stable address: fixed key order, default sort left out, nothing for an empty view', () => {
    expect(serialise(parseQuery(''))).toBe('');
    expect(serialise(parseQuery('sort=date'))).toBe('');
    expect(serialise(parseQuery('sort=title&witness=held&region=r2&region=r1&from=1590'))).toBe('from=1590&region=r1&region=r2&witness=held&sort=title');
  });

  it('gives the same view when an address is read again (US2.2)', () => {
    const view = parseQuery('room=tc:tc:room:map&from=1590&sort=maker&cartographer=c2');
    expect(parseQuery(serialise(view))).toEqual(view);
  });
});
