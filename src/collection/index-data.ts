import { parseDate } from '../registry/dates.js';
import type { PublicRecord } from '../registry/project.js';
import { roomsOf } from '../rooms/membership.js';
import { list } from '../registry/values.js';
import { comparator, DEFAULT_SORT } from './order.js';

/*
 * The filter index of the collection (spec 004 contracts/collection-pages.md): one small entry per
 * public map, and nothing else about it. Pure: public records in, plain data out. Rooms come from
 * the one membership module (ADR 0015); regions are the covered places of type region or country.
 */
export interface IndexEntry {
  id: string;
  slug: string;
  title: string;
  makers: { id: string; name: string }[];
  /** A reader's label for the date, or null when the map is undated. */
  date_label: string | null;
  /** First and last year the date can mean; null when the map is undated. BCE years are negative. */
  from: number | null;
  to: number | null;
  uncertain: boolean;
  regions: string[];
  rooms: string[];
  witness: string;
}

export interface DateInterval {
  from: number;
  to: number;
  uncertain: boolean;
  label: string;
}

const yearOf = (ms: number): number => new Date(ms).getUTCFullYear();

/** The years an EDTF value can mean, with a label for the reader; null when there is no usable date. */
export function dateInterval(value: unknown): DateInterval | null {
  const parsed = parseDate(value);
  if (!parsed || !Number.isFinite(parsed.earliest) || !Number.isFinite(parsed.latest)) return null;
  const from = yearOf(parsed.earliest);
  const to = yearOf(parsed.latest);
  const bce = (year: number) => (year < 0 ? `${-year} BCE` : String(year));
  let label: string;
  if (parsed.precision === 'decade' || parsed.precision === 'century') label = `${from}s`;
  else if (parsed.precision === 'range') label = `${bce(from)}–${bce(to)}`;
  else label = bce(from);
  return { from, to, uncertain: parsed.uncertain, label: parsed.uncertain ? `${label} (uncertain)` : label };
}


export function buildIndex(records: readonly PublicRecord[]): IndexEntry[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  return records
    .filter((r) => r.family === 'map')
    .map((map): IndexEntry => {
      const interval = dateInterval(map.date_published);
      return {
        id: map.id,
        slug: String(map.slug),
        title: String(map.title),
        // an unresolved attribution to a workshop is not an exact maker in any list (FR-011)
        makers: (map.attribution === 'unresolved' ? [] : list(map.makers))
          .map((id) => byId.get(id))
          .filter((m): m is PublicRecord => m !== undefined)
          .map((m) => ({ id: m.id, name: String(m.title) })),
        date_label: interval?.label ?? null,
        from: interval?.from ?? null,
        to: interval?.to ?? null,
        uncertain: interval?.uncertain ?? false,
        regions: list(map.coverage).filter((id) => ['region', 'country'].includes(String(byId.get(id)?.place_type))),
        rooms: roomsOf(map, records).map((room) => `tc:tc:room:${room}`),
        witness: String(map.witness_kind ?? map.record_scope ?? 'unlocated'),
      };
    })
    .sort(comparator(DEFAULT_SORT));
}
