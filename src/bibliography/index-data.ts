import type { CslItem } from '../essays/citations.js';
import type { PublicRecord } from '../registry/project.js';
import { BIBLIOGRAPHY_SECTIONS } from '../registry/schemas/bibliography-section.js';
import { citationIndex } from './cited-in.js';
import { publicEntries } from './entry-public.js';
import { normalise, type IndexEntry } from './filter.js';

export { applyFilters, normalise, parseQuery, serialise, type Filters, type IndexEntry } from './filter.js';

/*
 * The bibliography's search index and filters (spec 006 FR-008, contracts/bibliography-pages.md):
 * one small entry per public bibliography entry, and nothing else about it. Pure: public records and
 * the entries' CSL items in, plain data out. The browser script and the build tests run the same
 * `applyFilters`, so what a reader sees and what is tested cannot differ.
 */

interface CslName {
  family?: string;
  given?: string;
  literal?: string;
}

const nameOf = (n: CslName): string => n.literal ?? n.family ?? '';
const fullName = (n: CslName): string => normalise(n.literal ?? [n.family, n.given].filter(Boolean).join(' '));

function yearOf(item: CslItem): string {
  const issued = item.issued as { 'date-parts'?: unknown[][]; raw?: string; literal?: string } | undefined;
  const part = issued?.['date-parts']?.[0]?.[0];
  if (part !== undefined && part !== null) return String(part);
  return /\d{4}/.exec(issued?.raw ?? issued?.literal ?? '')?.[0] ?? '';
}

const keywordsOf = (item: CslItem): string[] => {
  const raw = typeof item.keyword === 'string' ? item.keyword : Array.isArray(item.keyword) ? item.keyword.join(',') : '';
  return [...new Set(raw.split(/[,;]/).map(normalise).filter((k) => k !== ''))];
};

const sectionRank = (section: string): number => (BIBLIOGRAPHY_SECTIONS as readonly string[]).indexOf(section);

export function buildIndex(records: readonly PublicRecord[], cslFor: (entryId: string) => CslItem): IndexEntry[] {
  const cited = citationIndex(records);
  return publicEntries(records)
    .map((entry): IndexEntry => {
      const item = cslFor(entry.id);
      const authors = ((item.author as CslName[] | undefined) ?? []).filter((a) => typeof a === 'object');
      return {
        slug: String(entry.slug),
        title: typeof item.title === 'string' && item.title.trim() !== '' ? item.title : String(entry.title),
        author: authors[0] ? nameOf(authors[0]) : '',
        authors: authors.map(fullName),
        year: yearOf(item),
        section: String(entry.section),
        keywords: keywordsOf(item),
        essays: [...new Set((cited.get(entry.id) ?? []).filter((c) => c.citing.family === 'essay').map((c) => c.citing.slug))].sort(),
      };
    })
    .sort((a, b) => sectionRank(a.section) - sectionRank(b.section) || a.author.localeCompare(b.author, 'en') || a.year.localeCompare(b.year) || a.slug.localeCompare(b.slug, 'en'));
}
