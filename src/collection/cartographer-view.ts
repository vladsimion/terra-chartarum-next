import type { PublicRecord } from '../registry/project.js';
import { routeSection } from '../registry/routes.js';
import { dateInterval } from './index-data.js';
import type { Referrer } from './where-used.js';

/*
 * What a cartographer's pages show (spec 004 US3, FR-011, FR-012), decided from the public records
 * before any component runs. Pure: records in, plain data out. A held cartographer is not in the
 * public projection, so it has no profile and no map can link to it. An unresolved attribution is
 * never counted as the work of the cartographer: a workshop's unresolved maps are listed apart.
 */
export interface CartographerView {
  id: string;
  name: string;
  slug: string;
  kind: 'person' | 'workshop';
  kindLabel: 'Person' | 'Workshop';
  variantNames: string[];
  roles: string[];
  /** Life dates for a person, "Active …" for a workshop; null when none are recorded. */
  dates: string | null;
  /** Public maps attributed with certainty. */
  maps: Referrer[];
  /** Public maps attributed to this cartographer without an individual maker (a workshop). */
  unresolved: Referrer[];
  /** Public essays that use any of those maps. */
  essays: Referrer[];
  /** Bibliography entry ids. */
  bibliography: string[];
}

export interface CartographerCard {
  id: string;
  name: string;
  href: string;
  kind: string;
  count: string;
}

const ROLE_LABELS: Record<string, string> = { cartographer: 'Cartographer', engraver: 'Engraver', publisher: 'Publisher' };
const collator = new Intl.Collator('en', { sensitivity: 'base' });
const inTitleOrder = (a: Referrer, b: Referrer): number => collator.compare(a.title, b.title) || (a.id < b.id ? -1 : 1);
const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export const cartographerHref = (slug: string): string => `/${routeSection('cartographer')}/${slug}/`;

export function cartographerView(cartographer: PublicRecord, records: readonly PublicRecord[]): CartographerView {
  const kind = cartographer.kind === 'workshop' ? 'workshop' : 'person';
  const mapReferrer = (m: PublicRecord): Referrer => ({ id: m.id, title: String(m.title), href: `/${routeSection('map')}/${String(m.slug)}/` });
  const attributed = records.filter((r) => r.family === 'map' && list(r.makers).includes(cartographer.id));
  const maps = attributed.filter((m) => m.attribution !== 'unresolved').map(mapReferrer).sort(inTitleOrder);
  const unresolved = attributed.filter((m) => m.attribution === 'unresolved').map(mapReferrer).sort(inTitleOrder);
  const used = new Set(attributed.map((m) => m.id));
  const essays = records
    .filter((r) => r.family === 'essay' && list(r.maps).some((id) => used.has(id)))
    .map((e): Referrer => ({ id: e.id, title: String(e.title), href: `/${routeSection('essay')}/${String(e.slug)}/` }))
    .sort(inTitleOrder);

  const active = typeof cartographer.active === 'string' ? (dateInterval(cartographer.active)?.label ?? cartographer.active) : null;
  const lifeDates = typeof cartographer.life_dates === 'string' && cartographer.life_dates.trim() !== '' ? cartographer.life_dates : null;
  return {
    id: cartographer.id,
    name: String(cartographer.title),
    slug: String(cartographer.slug),
    kind,
    kindLabel: kind === 'workshop' ? 'Workshop' : 'Person',
    variantNames: list(cartographer.names),
    roles: list(cartographer.roles).map((role) => ROLE_LABELS[role] ?? role),
    dates: kind === 'workshop' ? (active ? `Active ${active}` : null) : lifeDates,
    maps,
    unresolved,
    essays,
    bibliography: list(cartographer.bibliography),
  };
}

/** The list of released cartographers by name, each with what the collection holds of theirs. */
export function cartographerCards(records: readonly PublicRecord[]): CartographerCard[] {
  return records
    .filter((r) => r.family === 'cartographer')
    .map((c) => cartographerView(c, records))
    .sort((a, b) => collator.compare(a.name, b.name) || (a.id < b.id ? -1 : 1))
    .map((v) => {
      const own = v.kind === 'workshop' ? v.unresolved : v.maps;
      const count = own.length === 0 ? 'No public maps yet' : v.kind === 'workshop' ? `${plural(own.length, 'map')} attributed to the workshop` : plural(own.length, 'map');
      return { id: v.id, name: v.name, href: cartographerHref(v.slug), kind: [v.kindLabel, v.roles.join(', ')].filter((s) => s !== '').join(' · '), count };
    });
}
