import { describe, expect, it } from 'vitest';
import { mapCsl, mapExports } from '../../../src/collection/citation.js';

/*
 * Spec 004 T030 (FR-006): a map record is cited through spec 003's generator. The CSL item is of
 * type `map`; the stable URL and the access date ride with it. Golden strings are written by hand.
 */
const MAP = {
  title: 'A fixture map of the frontier',
  makers: ['Fixture Cartographer'],
  date_published: '1595',
  place: 'Fixture Town',
  repository: 'Fixture Library',
  url: 'https://terra-chartarum.org/collection/fixture-map-frontier/',
};
const ACCESSED = '2026-10-18';

describe('mapCsl', () => {
  it('is a CSL map item with the makers as authors, the place, the holder, the URL and the access date', () => {
    expect(mapCsl(MAP, ACCESSED)).toEqual({
      id: 'fixture-map-frontier',
      type: 'map',
      title: 'A fixture map of the frontier',
      author: [{ literal: 'Fixture Cartographer' }],
      issued: { 'date-parts': [[1595]] },
      'publisher-place': 'Fixture Town',
      publisher: 'Fixture Library',
      URL: 'https://terra-chartarum.org/collection/fixture-map-frontier/',
      accessed: { 'date-parts': [[2026, 10, 18]] },
    });
  });

  it('leaves out what the record does not state: no date, place or holder', () => {
    const item = mapCsl({ title: 'Undated', makers: [], url: 'https://terra-chartarum.org/collection/undated/' }, ACCESSED);
    expect(Object.keys(item).sort()).toEqual(['URL', 'accessed', 'id', 'title', 'type']);
  });

  it('keeps an uncertain or imprecise date to its first year, and ignores one with no year', () => {
    expect(mapCsl({ ...MAP, date_published: '1595?' }, ACCESSED).issued).toEqual({ 'date-parts': [[1595]] });
    expect(mapCsl({ ...MAP, date_published: '1595/1602' }, ACCESSED).issued).toEqual({ 'date-parts': [[1595]] });
    expect(mapCsl({ ...MAP, date_published: '159X' }, ACCESSED).issued).toBeUndefined();
  });
});

describe('mapExports', () => {
  const out = mapExports(MAP, ACCESSED);

  it('writes BibTeX as @misc with the title, maker, year, place, holder, URL and access date', () => {
    expect(out.bibtex).toBe(
      [
        '@misc{map-fixture-map-frontier,',
        '  title = {A fixture map of the frontier},',
        '  author = {{Fixture Cartographer}},',
        '  year = {1595},',
        '  address = {Fixture Town},',
        '  publisher = {Fixture Library},',
        '  url = {https://terra-chartarum.org/collection/fixture-map-frontier/},',
        '  urldate = {2026-10-18},',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('writes RIS as a MAP record', () => {
    expect(out.ris).toBe(
      ['TY  - MAP', 'TI  - A fixture map of the frontier', 'AU  - Fixture Cartographer', 'PY  - 1595', 'CY  - Fixture Town', 'PB  - Fixture Library', 'UR  - https://terra-chartarum.org/collection/fixture-map-frontier/', 'Y2  - 2026/10/18', 'ER  - ', ''].join('\r\n'),
    );
  });

  it('writes CSL-JSON that parses back to the item', () => {
    expect(JSON.parse(out.csljson)).toEqual(mapCsl(MAP, ACCESSED));
  });

  it('gives a Chicago bibliography entry with the maker, title, year and address', () => {
    // Chicago capitalises the title and puts the maker first
    expect(out.chicago).toMatch(/^Fixture Cartographer\. A Fixture Map of the Frontier\./);
    expect(out.chicago).toContain('1595');
    expect(out.chicago).toContain('https://terra-chartarum.org/collection/fixture-map-frontier/');
  });

  it('is the same bytes for the same inputs', () => {
    expect(mapExports(MAP, ACCESSED)).toEqual(out);
  });

  it('escapes what BibTeX reads as markup', () => {
    expect(mapExports({ ...MAP, title: 'Tabula & {Daciae} 100%' }, ACCESSED).bibtex).toContain('title = {Tabula \\& \\{Daciae\\} 100\\%}');
  });
});
