import { describe, expect, it } from 'vitest';
import { accessDate, essayExports } from '../../../src/essays/exports.js';

/*
 * Spec 003 T027 (FR-009, research R9): BibTeX, RIS and CSL-JSON for the essay itself, carrying the
 * title, authors, publication date, the stable URL and the access date. The access date is the
 * build's, fixed by SOURCE_DATE_EPOCH when set so a build is reproducible.
 */
const ESSAY = {
  title: 'The Frontier Line',
  authors: ['A. Editor', 'Mary Q. Smith'],
  published_on: '2026-10-17',
  url: 'https://terra-chartarum.org/essays/the-frontier-line/',
};
const ACCESSED = '2026-10-18';

describe('accessDate', () => {
  it('uses SOURCE_DATE_EPOCH when it is set', () => {
    expect(accessDate({ SOURCE_DATE_EPOCH: '1792281600' }, new Date('2030-01-01T00:00:00Z'))).toBe('2026-10-18');
  });

  it('uses the build date otherwise, in UTC', () => {
    expect(accessDate({}, new Date('2026-10-18T23:59:59Z'))).toBe('2026-10-18');
  });

  it('ignores an epoch that is not a number', () => {
    expect(accessDate({ SOURCE_DATE_EPOCH: 'soon' }, new Date('2026-10-18T10:00:00Z'))).toBe('2026-10-18');
  });
});

describe('essayExports', () => {
  const { bibtex, ris, csljson } = essayExports(ESSAY, ACCESSED);

  it('writes BibTeX with the title, authors, year, URL and access date', () => {
    expect(bibtex).toMatch(/^@online\{/);
    expect(bibtex).toContain('title = {The Frontier Line}');
    expect(bibtex).toContain('author = {Editor, A. and Smith, Mary Q.}');
    expect(bibtex).toContain('year = {2026}');
    expect(bibtex).toContain('url = {https://terra-chartarum.org/essays/the-frontier-line/}');
    expect(bibtex).toContain('urldate = {2026-10-18}');
  });

  it('writes RIS with the same facts', () => {
    expect(ris).toMatch(/^TY {2}- ELEC\r?\n/);
    expect(ris).toContain('TI  - The Frontier Line');
    expect(ris).toContain('AU  - Editor, A.');
    expect(ris).toContain('AU  - Smith, Mary Q.');
    expect(ris).toContain('DA  - 2026/10/17');
    expect(ris).toContain('UR  - https://terra-chartarum.org/essays/the-frontier-line/');
    expect(ris).toContain('Y2  - 2026/10/18');
    expect(ris).toMatch(/ER {2}- \r?\n$/);
  });

  it('writes CSL-JSON that parses, with dates in date-parts', () => {
    const item = JSON.parse(csljson);
    expect(item).toMatchObject({
      type: 'webpage',
      title: 'The Frontier Line',
      author: [
        { family: 'Editor', given: 'A.' },
        { family: 'Smith', given: 'Mary Q.' },
      ],
      issued: { 'date-parts': [[2026, 10, 17]] },
      accessed: { 'date-parts': [[2026, 10, 18]] },
      URL: 'https://terra-chartarum.org/essays/the-frontier-line/',
    });
  });

  it('is the same for the same input', () => {
    expect(essayExports(ESSAY, ACCESSED)).toEqual({ bibtex, ris, csljson });
  });

  it('changes only the access date when the access date changes', () => {
    const other = essayExports(ESSAY, '2027-01-02');
    expect(other.bibtex).toContain('urldate = {2027-01-02}');
    expect(other.bibtex.replace('2027-01-02', ACCESSED)).toBe(bibtex);
  });

  it('keeps a year-only publication date as a year', () => {
    const item = JSON.parse(essayExports({ ...ESSAY, published_on: '2026' }, ACCESSED).csljson);
    expect(item.issued).toEqual({ 'date-parts': [[2026]] });
  });

  it('escapes BibTeX special characters in the title', () => {
    const { bibtex: escaped } = essayExports({ ...ESSAY, title: 'Maps & {Borders} 100%' }, ACCESSED);
    expect(escaped).toContain('title = {Maps \\& \\{Borders\\} 100\\%}');
  });

  it('writes a single-name author as a literal, not as a family and given name', () => {
    const item = JSON.parse(essayExports({ ...ESSAY, authors: ['Anonymous'] }, ACCESSED).csljson);
    expect(item.author).toEqual([{ literal: 'Anonymous' }]);
  });
});
