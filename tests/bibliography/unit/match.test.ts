import { describe, expect, it } from 'vitest';
import { isbn13s, matchItem, normaliseDoi, weakKey } from '../../../src/bibliography/match.js';
import type { CslItem } from '../../../src/essays/citations.js';

/*
 * Spec 006 T036 (FR-012, research R1): an imported item matches an existing entry on, in order, its
 * DOI, its ISBN, then the first author's family name + year + the first six words of the title. The
 * first rule that matches decides. Two different works by one author in one year must not match.
 */
const item = (over: Record<string, unknown>): CslItem => ({ id: 'x', type: 'book', title: 'Untitled', ...over }) as CslItem;
const existing = (id: string, over: Record<string, unknown>) => ({ id, item: item(over) });

describe('normaliseDoi', () => {
  it('lower-cases, and drops the resolver address in any of its forms', () => {
    expect(normaliseDoi('10.1000/ABC.1')).toBe('10.1000/abc.1');
    expect(normaliseDoi('https://doi.org/10.1000/ABC.1')).toBe('10.1000/abc.1');
    expect(normaliseDoi('http://dx.doi.org/10.1000/ABC.1')).toBe('10.1000/abc.1');
    expect(normaliseDoi('doi:10.1000/ABC.1')).toBe('10.1000/abc.1');
    expect(normaliseDoi('  10.1000/abc.1  ')).toBe('10.1000/abc.1');
  });

  it('is null for nothing, and for text that is not a DOI', () => {
    expect(normaliseDoi(undefined)).toBeNull();
    expect(normaliseDoi('')).toBeNull();
    expect(normaliseDoi('see the publisher')).toBeNull();
  });
});

describe('isbn13s', () => {
  it('removes hyphens and spaces', () => {
    expect(isbn13s('978-0-306-40615-7')).toEqual(['9780306406157']);
    expect(isbn13s('978 0 306 40615 7')).toEqual(['9780306406157']);
  });

  it('converts an ISBN-10 to ISBN-13, with the right check digit', () => {
    expect(isbn13s('0306406152')).toEqual(['9780306406157']);
    expect(isbn13s('0-306-40615-2')).toEqual(['9780306406157']);
    expect(isbn13s('080442957X')).toEqual(['9780804429573']);
  });

  it('reads several, however they are separated, and ignores what is not an ISBN', () => {
    expect(isbn13s('0306406152; 978-1-4028-9462-6, nonsense, 12345')).toEqual(['9780306406157', '9781402894626']);
    expect(isbn13s(undefined)).toEqual([]);
  });
});

describe('weakKey', () => {
  it('is the first author’s family name, the year and the first six title words, folded and without punctuation', () => {
    expect(weakKey(item({ author: [{ family: 'Doe', given: 'J.' }], issued: { 'date-parts': [[1991]] }, title: 'A Fixture Chronicle!' }))).toBe('doe|1991|a fixture chronicle');
    expect(weakKey(item({ author: [{ family: 'Roë' }], issued: { 'date-parts': [[1992]] }, title: 'One, two: three; four five six seven eight' }))).toBe('roe|1992|one two three four five six');
  });

  it('uses an organisation’s whole name when the author has no family name', () => {
    expect(weakKey(item({ author: [{ literal: 'Fixture Archive' }], issued: { 'date-parts': [[1999]] }, title: 'Finding aid' }))).toBe('fixture archive|1999|finding aid');
  });

  it('is null without an author or a year: too little to say two works are one', () => {
    expect(weakKey(item({ issued: { 'date-parts': [[1991]] } }))).toBeNull();
    expect(weakKey(item({ author: [{ family: 'Doe' }] }))).toBeNull();
  });
});

describe('matchItem', () => {
  const entries = [
    existing('A', { DOI: '10.1000/abc', title: 'Alpha' }),
    existing('B', { ISBN: '978-0-306-40615-7', title: 'Beta' }),
    existing('C', { author: [{ family: 'Doe' }], issued: { 'date-parts': [[1991]] }, title: 'A fixture chronicle of the northern frontier line' }),
  ];

  it('matches on the DOI, whatever its form', () => {
    expect(matchItem(item({ DOI: 'https://doi.org/10.1000/ABC' }), entries)).toEqual({ id: 'A', rule: 'doi' });
  });

  it('matches on the ISBN, ISBN-10 or ISBN-13', () => {
    expect(matchItem(item({ ISBN: '0306406152' }), entries)).toEqual({ id: 'B', rule: 'isbn' });
  });

  it('matches on author, year and the first six title words, ignoring case and punctuation', () => {
    expect(matchItem(item({ author: [{ family: 'DOE' }], issued: { 'date-parts': [[1991]] }, title: 'A Fixture Chronicle, of the Northern (and more)' }), entries)).toEqual({ id: 'C', rule: 'weak' });
  });

  it('never weak-matches two works whose DOIs both exist and differ (an article and its replication data)', () => {
    const base = { author: [{ family: 'Marczinek' }], issued: { 'date-parts': [[2025]] } };
    const article = existing('P', { ...base, title: 'Networks in trade - Evidence from the legacy of the Hanseatic league', DOI: '10.1016/j.jinteco.2025.104102' });
    const data = item({ ...base, title: 'Networks in Trade - Evidence from the Legacy of the Hanseatic League: replication data', DOI: 'https://doi.org/10.17632/m3w5by2gdh.1' });
    expect(matchItem(data, [article])).toBeNull();
  });

  it('still weak-matches when only one of the two has a DOI', () => {
    const base = { author: [{ family: 'Marczinek' }], issued: { 'date-parts': [[2025]] }, title: 'Networks in trade - Evidence from the legacy' };
    expect(matchItem(item({ ...base }), [existing('P', { ...base, DOI: '10.1016/j.jinteco.2025.104102' })])).toEqual({ id: 'P', rule: 'weak' });
    expect(matchItem(item({ ...base, DOI: '10.1016/j.jinteco.2025.104102' }), [existing('P', { ...base })])).toEqual({ id: 'P', rule: 'weak' });
  });

  it('lets the first rule that matches decide: a DOI beats an ISBN beats the weak key', () => {
    const both = item({ DOI: '10.1000/abc', ISBN: '0306406152', author: [{ family: 'Doe' }], issued: { 'date-parts': [[1991]] }, title: 'A fixture chronicle of the northern' });
    expect(matchItem(both, entries)).toEqual({ id: 'A', rule: 'doi' });
    expect(matchItem({ ...both, DOI: undefined } as CslItem, entries)).toEqual({ id: 'B', rule: 'isbn' });
  });

  it('goes on to the next rule when one finds nothing', () => {
    const second = item({ DOI: '10.1000/other', ISBN: '0306406152' });
    expect(matchItem(second, entries)).toEqual({ id: 'B', rule: 'isbn' });
  });

  it('does not match two different works by one author in one year', () => {
    const other = item({ author: [{ family: 'Doe' }], issued: { 'date-parts': [[1991]] }, title: 'A fixture chronicle of the southern frontier line' });
    expect(matchItem(other, entries)).toBeNull();
  });

  it('matches nothing when it has nothing to go on', () => {
    expect(matchItem(item({ title: 'Something new' }), entries)).toBeNull();
  });

  it('takes the first of several entries that match, in the order given', () => {
    const twice = [existing('Z', { DOI: '10.1000/abc' }), existing('Y', { DOI: '10.1000/abc' })];
    expect(matchItem(item({ DOI: '10.1000/abc' }), twice)?.id).toBe('Z');
  });
});
