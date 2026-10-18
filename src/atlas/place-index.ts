import type { PublicRecord } from '../registry/project.js';
import { isObject } from '../registry/values.js';
import { normalise } from './rank.js';
import { yearBounds } from './time.js';

/*
 * Place search (spec 005 US7, FR-009, research R5): a build-time index of public places by every
 * historic and modern name, and an exact-or-prefix search over it. Pure. A name valid at the chosen
 * year ranks before one that is not, so the name a place had then is the one found. No fuzzy
 * matching and no link from a place to layers (ADR 0004).
 */
export interface PlaceName {
  name: string;
  /** The name as `normalise` writes it: lower case, no diacritics, one space. */
  norm: string;
  kind: string;
  language: string;
  valid_from?: string;
  valid_to?: string;
}

export interface IndexedPlace {
  slug: string;
  title: string;
  location: { lon: number; lat: number };
  names: PlaceName[];
}

export interface PlaceIndex {
  places: IndexedPlace[];
}

export interface PlaceResult {
  slug: string;
  title: string;
  /** The name that matched. */
  name: string;
  kind: string;
  location: { lon: number; lat: number };
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The public places that can be marked on a map, by title. */
export function buildPlaceIndex(records: readonly PublicRecord[]): PlaceIndex {
  const places: IndexedPlace[] = [];
  for (const record of records) {
    if (record.family !== 'place' || !isObject(record.location)) continue;
    const { lon, lat } = record.location;
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;
    const names = (Array.isArray(record.names) ? record.names : []).filter(isObject).map((n): PlaceName => {
      const entry: PlaceName = { name: str(n.name), norm: normalise(str(n.name)), kind: str(n.kind), language: str(n.language) };
      if (typeof n.valid_from === 'string') entry.valid_from = n.valid_from;
      if (typeof n.valid_to === 'string') entry.valid_to = n.valid_to;
      return entry;
    });
    places.push({ slug: str(record.slug), title: str(record.title), location: { lon, lat }, names });
  }
  return { places: places.sort((a, b) => a.title.localeCompare(b.title)) };
}

/** 0 when the name was in use at `year`, 1 when it says nothing about when, 2 when it was not. */
function validity(name: PlaceName, year: number): 0 | 1 | 2 {
  if (name.valid_from === undefined && name.valid_to === undefined) return 1;
  const from = name.valid_from === undefined ? null : yearBounds(name.valid_from);
  const to = name.valid_to === undefined ? null : yearBounds(name.valid_to);
  if ((name.valid_from !== undefined && !from) || (name.valid_to !== undefined && !to)) return 1;
  return (!from || year >= from.min) && (!to || year <= to.max) ? 0 : 2;
}

/** The places whose name starts with the query, exact matches first, then names valid at `year`, then by title. */
export function searchPlaces(index: PlaceIndex, query: string, year: number): PlaceResult[] {
  const q = normalise(query);
  if (q === '') return [];
  const hits: { place: IndexedPlace; name: PlaceName; rank: [number, number] }[] = [];
  for (const place of index.places) {
    let best: { name: PlaceName; rank: [number, number] } | null = null;
    for (const name of place.names) {
      if (!name.norm.startsWith(q)) continue;
      const rank: [number, number] = [name.norm === q ? 0 : 1, validity(name, year)];
      if (!best || rank[0] < best.rank[0] || (rank[0] === best.rank[0] && rank[1] < best.rank[1])) best = { name, rank };
    }
    if (best) hits.push({ place, ...best });
  }
  return hits
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || normalise(a.place.title).localeCompare(normalise(b.place.title)))
    .map(({ place, name }) => ({ slug: place.slug, title: place.title, name: name.name, kind: name.kind, location: place.location }));
}
