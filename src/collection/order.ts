import type { IndexEntry } from './index-data.js';

/*
 * The three orders of the collection list (spec 004 US2.3): by date (undated last), by title, by
 * maker (a map with no maker last). Every order ends in the title and then the id, so the order is
 * total, stable and the same on every machine.
 */
export type SortKey = 'date' | 'title' | 'maker';
export const SORT_KEYS: readonly SortKey[] = ['date', 'title', 'maker'];
export const DEFAULT_SORT: SortKey = 'date';

const collator = new Intl.Collator('en', { sensitivity: 'base' });

const byTitleThenId = (a: IndexEntry, b: IndexEntry): number => collator.compare(a.title, b.title) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** A missing value sorts after every present one. */
const lastIfMissing = <T>(a: T | null, b: T | null, compare: (x: T, y: T) => number): number =>
  a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : compare(a, b);

export function comparator(key: SortKey): (a: IndexEntry, b: IndexEntry) => number {
  switch (key) {
    case 'title':
      return byTitleThenId;
    case 'maker':
      return (a, b) => lastIfMissing(a.makers[0]?.name ?? null, b.makers[0]?.name ?? null, (x, y) => collator.compare(x, y)) || byTitleThenId(a, b);
    case 'date':
      return (a, b) => lastIfMissing(a.from, b.from, (x, y) => x - y) || lastIfMissing(a.to, b.to, (x, y) => x - y) || byTitleThenId(a, b);
  }
}
