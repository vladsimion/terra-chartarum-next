import { describe, expect, it } from 'vitest';
import { cslItemFor, formatBibliographyItem, formatNote, parseLocator, type CslItem } from '../../../src/essays/citations.js';

/*
 * Spec 003 T026 (contracts/citations-and-exports.md): Chicago notes-bibliography, built offline from
 * CSL-JSON. The golden strings are written by hand from the style's published examples (CMOS 18th
 * edition, ch. 14, which no longer prints the place of publication), not recomputed from the code
 * under test.
 */
const BOOK: CslItem = {
  id: 'tc:tc:bibliography_entry:bibliography_entry-000001',
  type: 'book',
  title: 'The Frontier Line',
  author: [{ family: 'Doe', given: 'Jane' }],
  publisher: 'University of Chicago Press',
  'publisher-place': 'Chicago',
  issued: { 'date-parts': [[1999]] },
};

const ARTICLE: CslItem = {
  id: 'tc:tc:bibliography_entry:bibliography_entry-000002',
  type: 'article-journal',
  title: 'Omission as Method',
  author: [{ family: 'Roe', given: 'Richard' }],
  'container-title': 'Journal of Maps',
  volume: '4',
  issue: '2',
  page: '101-120',
  issued: { 'date-parts': [[2011]] },
};

describe('formatNote', () => {
  it('formats a book note with the page from the locator', () => {
    const { note } = formatNote(BOOK, { value: 'p. 12', state: 'pending' });
    expect(note).toBe('Jane Doe, The Frontier Line (University of Chicago Press, 1999), 12.');
  });

  it('formats a journal article note with the cited page', () => {
    const { note } = formatNote(ARTICLE, { value: 'p. 105', state: 'pending' });
    expect(note).toBe('Richard Roe, “Omission as Method,” Journal of Maps 4, no. 2 (2011): 105.');
  });

  it('formats a page range', () => {
    const { note } = formatNote(BOOK, { value: 'pp. 12–14', state: 'pending' });
    expect(note).toBe('Jane Doe, The Frontier Line (University of Chicago Press, 1999), 12–14.');
  });

  it('formats a note without a locator value as the bare citation', () => {
    const { note } = formatNote(BOOK, { state: 'pending' });
    expect(note).toBe('Jane Doe, The Frontier Line (University of Chicago Press, 1999).');
  });

  it('shows who verified a locator and when', () => {
    const { verification } = formatNote(BOOK, {
      value: 'p. 12',
      state: 'verified',
      verified_by: 'A. Editor',
      verified_on: '2026-10-10',
      consulted_copy: 'Library copy',
    });
    expect(verification).toMatchObject({ state: 'verified', by: 'A. Editor', on: '2026-10-10' });
    expect(verification.label).toBe('Verified by A. Editor on 2026-10-10');
  });

  it('marks a pending locator in words, not only by colour', () => {
    const { verification } = formatNote(BOOK, { value: 'p. 12', state: 'pending' });
    expect(verification).toEqual({ state: 'pending', label: 'Locator pending verification' });
  });

  it('treats a locator with no state as pending', () => {
    expect(formatNote(BOOK, { value: 'p. 12' }).verification.state).toBe('pending');
  });

  it('treats a verified locator that lacks who or when as pending, never as verified', () => {
    expect(formatNote(BOOK, { value: 'p. 12', state: 'verified' }).verification.state).toBe('pending');
  });
});

describe('formatBibliographyItem', () => {
  it('formats a book as a Chicago bibliography entry', () => {
    expect(formatBibliographyItem(BOOK)).toBe('Doe, Jane. The Frontier Line. University of Chicago Press, 1999.');
  });

  it('formats a journal article as a Chicago bibliography entry', () => {
    expect(formatBibliographyItem(ARTICLE)).toBe('Roe, Richard. “Omission as Method.” Journal of Maps 4, no. 2 (2011): 101–20.');
  });
});

describe('parseLocator', () => {
  it('takes a page label out of the value', () => {
    expect(parseLocator('p. 12')).toEqual({ label: 'page', locator: '12' });
    expect(parseLocator('pp. 12–14')).toEqual({ label: 'page', locator: '12–14' });
  });

  it('leaves anything else as the locator text', () => {
    expect(parseLocator('Sondaj A, pl. 3')).toEqual({ label: undefined, locator: 'Sondaj A, pl. 3' });
    expect(parseLocator(undefined)).toEqual({ label: undefined, locator: undefined });
  });
});

describe('cslItemFor', () => {
  const entry = { id: 'tc:tc:bibliography_entry:bibliography_entry-000001', csl: 'csl/doe-1999.json' };

  it('reads the CSL-JSON an entry points to and gives it the entry id', () => {
    const files: Record<string, string> = {
      'csl/doe-1999.json': JSON.stringify({ type: 'book', title: 'The Frontier Line', author: [{ family: 'Doe', given: 'Jane' }] }),
    };
    const item = cslItemFor(entry, (p) => files[p] ?? null);
    expect(item).toMatchObject({ id: entry.id, title: 'The Frontier Line' });
  });

  it('accepts a file holding a one-item array, the form reference managers export', () => {
    const files: Record<string, string> = { 'csl/doe-1999.json': JSON.stringify([{ id: 'x', type: 'book', title: 'T' }]) };
    expect(cslItemFor(entry, (p) => files[p] ?? null).title).toBe('T');
  });

  it('reports a clear error naming the entry and the missing file', () => {
    expect(() => cslItemFor(entry, () => null)).toThrow(/bibliography_entry-000001/);
    expect(() => cslItemFor(entry, () => null)).toThrow(/csl\/doe-1999\.json/);
  });

  it('reports a clear error for an entry with no csl at all', () => {
    expect(() => cslItemFor({ id: entry.id }, () => null)).toThrow(/no CSL file/);
  });

  it('reports a clear error for a file that is not CSL-JSON', () => {
    expect(() => cslItemFor(entry, () => 'not json')).toThrow(/bibliography_entry-000001.*not valid CSL-JSON/);
    expect(() => cslItemFor(entry, () => '{"title":"no type"}')).toThrow(/type/);
  });
});
