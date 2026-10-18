import type { IndexEntry } from './index-data.js';
import { comparator, DEFAULT_SORT, SORT_KEYS, type SortKey } from './order.js';

/*
 * Filtering and sorting the collection (spec 004 US2, contracts/collection-pages.md "Query string").
 * Pure: the index and a view in, the entries to show out; the page and the browser script both call
 * it, so a shared address means the same view. Facets combine with AND, the values of one facet
 * with OR. A date range matches every record whose possible years overlap it, and no undated one.
 */
export type Witness = 'held' | 'institutional';

export interface Filters {
  /** Cartographer ids. */
  cartographer: string[];
  /** First and last year of the range; null leaves that end open. */
  from: number | null;
  to: number | null;
  /** Place ids of type region or country. */
  region: string[];
  /** Room ids. */
  room: string[];
  witness: Witness | null;
  sort: SortKey;
}

const WITNESSES: readonly Witness[] = ['held', 'institutional'];

const values = (params: URLSearchParams, key: string): string[] => [...new Set(params.getAll(key).filter((v) => v !== ''))].sort();
const year = (value: string | null): number | null => (value !== null && /^-?\d{1,6}$/.test(value) ? Number(value) : null);

/** The view an address means. An unknown key, or a value that is not understood, is ignored. */
export function parseQuery(query: string | URLSearchParams): Filters {
  const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
  const witness = params.get('witness');
  const sort = params.get('sort');
  return {
    cartographer: values(params, 'cartographer'),
    from: year(params.get('from')),
    to: year(params.get('to')),
    region: values(params, 'region'),
    room: values(params, 'room'),
    witness: WITNESSES.includes(witness as Witness) ? (witness as Witness) : null,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_SORT,
  };
}

/** The address of a view: a fixed key order, the default sort left out, nothing at all for the whole collection. */
export function serialise(filters: Filters): string {
  const params = new URLSearchParams();
  for (const id of filters.cartographer) params.append('cartographer', id);
  if (filters.from !== null) params.set('from', String(filters.from));
  if (filters.to !== null) params.set('to', String(filters.to));
  for (const id of filters.region) params.append('region', id);
  for (const id of filters.room) params.append('room', id);
  if (filters.witness !== null) params.set('witness', filters.witness);
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort);
  return params.toString();
}

const overlaps = (entry: IndexEntry, from: number | null, to: number | null): boolean =>
  entry.from !== null && entry.to !== null && (from === null || entry.to >= from) && (to === null || entry.from <= to);

export function applyFilters(entries: readonly IndexEntry[], filters: Filters): IndexEntry[] {
  const cartographers = new Set(filters.cartographer);
  const regions = new Set(filters.region);
  const rooms = new Set(filters.room);
  const dated = filters.from !== null || filters.to !== null;
  return entries
    .filter(
      (e) =>
        (cartographers.size === 0 || e.makers.some((m) => cartographers.has(m.id))) &&
        (!dated || overlaps(e, filters.from, filters.to)) &&
        (regions.size === 0 || e.regions.some((r) => regions.has(r))) &&
        (rooms.size === 0 || e.rooms.some((r) => rooms.has(r))) &&
        (filters.witness === null || e.witness === filters.witness),
    )
    .sort(comparator(filters.sort));
}
