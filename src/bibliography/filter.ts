import { BIBLIOGRAPHY_SECTIONS } from '../registry/schemas/bibliography-section.js';

/*
 * The bibliography's filters (spec 006 FR-008, contracts/bibliography-pages.md): the shape of a
 * search-index entry, and choosing, reading and writing a view. Everything here is safe to ship to
 * the browser: no citation library, no registry code. The page script and the build tests run the
 * same `applyFilters`, so what a reader sees and what is tested cannot differ.
 */
export interface IndexEntry {
  slug: string;
  /** The title as the citation gives it. */
  title: string;
  /** The first author as a reader would read it (a family name, or an organisation). */
  author: string;
  /** Every author, normalised for matching. */
  authors: string[];
  /** The year, or empty when the item has none. */
  year: string;
  section: string;
  /** The CSL `keyword` field, split and normalised. */
  keywords: string[];
  /** Slugs of the public essays that cite the entry, by either route. */
  essays: string[];
}

export interface Filters {
  /** Any of these sections; none means all. */
  sections: string[];
  /** Entries cited by any of these essays; none means all. */
  essays: string[];
  /** Words that must each match the author, title, year or a keyword. */
  q: string;
}

/** Lower case, no diacritics, one space between words: how both the data and a query are compared. */
export const normalise = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The entries that match, in the index's order. Every search word must match the author, title, year or a keyword. */
export function applyFilters(entries: readonly IndexEntry[], filters: Filters): IndexEntry[] {
  const words = normalise(filters.q).split(' ').filter((w) => w !== '');
  return entries.filter((e) => {
    if (filters.sections.length > 0 && !filters.sections.includes(e.section)) return false;
    if (filters.essays.length > 0 && !e.essays.some((s) => filters.essays.includes(s))) return false;
    if (words.length === 0) return true;
    const fields = [...e.authors, normalise(e.title), e.year, ...e.keywords];
    return words.every((w) => fields.some((f) => f.includes(w)));
  });
}

/** Read a query string. A key or value the index does not know is ignored. */
export function parseQuery(params: URLSearchParams, entries: readonly IndexEntry[]): Filters {
  const known = new Set(entries.flatMap((e) => e.essays));
  const wanted = new Set(params.getAll('section'));
  return {
    sections: BIBLIOGRAPHY_SECTIONS.filter((s) => wanted.has(s)),
    essays: [...new Set(params.getAll('essay'))].filter((s) => known.has(s)).sort(),
    q: (params.get('q') ?? '').trim(),
  };
}

/** The canonical query string: sections in section order, essays sorted, then q; empty for no filters. */
export function serialise(filters: Filters): string {
  const params = new URLSearchParams();
  for (const section of BIBLIOGRAPHY_SECTIONS.filter((s) => filters.sections.includes(s))) params.append('section', section);
  for (const essay of [...filters.essays].sort()) params.append('essay', essay);
  if (filters.q.trim() !== '') params.set('q', filters.q.trim());
  return params.toString();
}
