import type { PublicRecord } from '../registry/project.js';
import { routeSection } from '../registry/routes.js';

/*
 * Where a map is used (spec 004 US4): the public records that refer to it, derived on every build
 * and never stored. Essays list it in `maps[]`; layers and places point at it through `relations[]`;
 * a place the map covers is listed too. Pure: it reads the public projection only, so a held essay,
 * layer or place cannot appear. Only essays have pages today; layers and places link when the Atlas
 * and place pages exist.
 */
export interface Referrer {
  id: string;
  title: string;
  /** The referrer's page, or null when it has none yet. */
  href: string | null;
}

export interface WhereUsed {
  essays: Referrer[];
  layers: Referrer[];
  places: Referrer[];
}

const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const collator = new Intl.Collator('en', { sensitivity: 'base' });
const inTitleOrder = (a: Referrer, b: Referrer): number => collator.compare(a.title, b.title) || (a.id < b.id ? -1 : 1);

export function whereUsed(map: PublicRecord, records: readonly PublicRecord[]): WhereUsed {
  const refer = (record: PublicRecord, href: string | null): Referrer => ({ id: record.id, title: String(record.title), href });
  const relatesTo = (record: PublicRecord) => list(record.relations).includes(map.id);

  const essays = records
    .filter((r) => r.family === 'essay' && list(r.maps).includes(map.id))
    .map((r) => refer(r, `/${routeSection('essay')}/${String(r.slug)}/`));
  const layers = records.filter((r) => r.family === 'layer' && relatesTo(r)).map((r) => refer(r, null));

  const covered = new Set(list(map.coverage));
  const places = records.filter((r) => r.family === 'place' && (covered.has(r.id) || relatesTo(r))).map((r) => refer(r, null));

  return { essays: essays.sort(inTitleOrder), layers: layers.sort(inTitleOrder), places: places.sort(inTitleOrder) };
}
