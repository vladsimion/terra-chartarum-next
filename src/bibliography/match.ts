import type { CslItem } from '../essays/citations.js';

/*
 * Deciding whether an imported item is a work the registry already has (spec 006 FR-012, research
 * R1). In order: the DOI, the ISBN (ISBN-10 converted to ISBN-13), then a weak key of the first
 * author's family name, the year and the first six words of the title. The first rule that matches
 * decides, a work with nothing to go on matches nothing, and two works with different DOIs never match
 * on the weak key, because two different works must never be merged. Pure: items in, a verdict out.
 */
export type MatchRule = 'doi' | 'isbn' | 'weak';

export interface Match {
  /** The existing entry's id. */
  id: string;
  rule: MatchRule;
}

export interface Known {
  id: string;
  item: CslItem;
}

/** A DOI in lower case without the resolver's address, or null when the text is not a DOI. */
export function normaliseDoi(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const doi = value.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '').trim().toLowerCase();
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : null;
}

/** The check digit of the first twelve digits of an ISBN-13. */
const isbn13Check = (twelve: string): string => String((10 - (twelve.split('').reduce((sum, d, i) => sum + Number(d) * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10);

/** Every ISBN in the text, as ISBN-13 without hyphens; text that is not an ISBN is ignored. */
export function isbn13s(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const out: string[] = [];
  for (const part of value.split(/[;,\n]|\s{2,}/)) {
    const text = part.replace(/^isbn[-: ]*/i, '').replace(/[-\s]/g, '').toUpperCase();
    if (/^\d{13}$/.test(text)) out.push(text);
    else if (/^\d{9}[\dX]$/.test(text)) out.push(`978${text.slice(0, 9)}${isbn13Check(`978${text.slice(0, 9)}`)}`);
  }
  return [...new Set(out)];
}

/** Lower case, no diacritics, punctuation as a space, one space between words. */
const fold = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const yearOf = (item: CslItem): string | null => {
  const part = (item.issued as { 'date-parts'?: unknown[][] } | undefined)?.['date-parts']?.[0]?.[0];
  return part === undefined || part === null ? null : String(part);
};

/** author family name (or an organisation's whole name) | year | first six title words; null when there is no author or no year. */
export function weakKey(item: CslItem): string | null {
  const first = (item.author as { family?: string; literal?: string }[] | undefined)?.[0];
  const author = fold(first?.family ?? first?.literal ?? '');
  const year = yearOf(item);
  if (author === '' || year === null || typeof item.title !== 'string') return null;
  const words = fold(item.title).split(' ').slice(0, 6).join(' ');
  return words === '' ? null : `${author}|${year}|${words}`;
}

const differentDois = (a: string | null, b: string | null): boolean => a !== null && b !== null && a !== b;

/** The existing entry this item is, by the first rule that finds one; null when it is a new work. */
export function matchItem(item: CslItem, known: readonly Known[]): Match | null {
  const doi = normaliseDoi(item.DOI);
  if (doi !== null) {
    const found = known.find((k) => normaliseDoi(k.item.DOI) === doi);
    if (found) return { id: found.id, rule: 'doi' };
  }
  const isbns = isbn13s(item.ISBN);
  if (isbns.length > 0) {
    const found = known.find((k) => isbn13s(k.item.ISBN).some((n) => isbns.includes(n)));
    if (found) return { id: found.id, rule: 'isbn' };
  }
  const key = weakKey(item);
  if (key !== null) {
    // two different DOIs are two different works, however alike their authors, years and titles (an article and its replication data)
    const found = known.find((k) => weakKey(k.item) === key && !differentDois(doi, normaliseDoi(k.item.DOI)));
    if (found) return { id: found.id, rule: 'weak' };
  }
  return null;
}
