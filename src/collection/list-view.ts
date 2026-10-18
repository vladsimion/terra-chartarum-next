import type { PublicRecord } from '../registry/project.js';
import { routeSection } from '../registry/routes.js';
import { buildIndex, type IndexEntry } from './index-data.js';
import { recordView } from './record-view.js';

/*
 * What the collection list page shows: one item per public map in the default order, and the choices
 * the filter form offers. Pure: public records in, plain data out. A facet lists only values some
 * public map has, so a filter can never lead to a held record or to an empty choice.
 */
export interface ListItem {
  id: string;
  href: string;
  title: string;
  makers: string[];
  dateLabel: string;
  witnessLabel: string;
  /** Only when reproduction is cleared; credit and licence travel with it (FR-005). */
  thumbnail: { url: string; alt: string; attribution: string; licence: string | null } | null;
}

export interface Choice {
  id: string;
  label: string;
}

export interface Facets {
  cartographers: Choice[];
  regions: Choice[];
  rooms: Choice[];
}

const byLabel = (a: Choice, b: Choice): number => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

export function listItems(records: readonly PublicRecord[], index: readonly IndexEntry[] = buildIndex(records)): ListItem[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  return index.map((entry) => {
    const view = recordView(byId.get(entry.id)!, records);
    const shown = view.image.decision === 'show' ? view.image.images[0] : undefined;
    return {
      id: entry.id,
      href: `/${routeSection('map')}/${entry.slug}/`,
      title: entry.title,
      makers: entry.makers.map((m) => m.name),
      dateLabel: entry.date_label ?? 'Date unknown',
      witnessLabel: view.witness.label,
      thumbnail: shown ? { url: shown.stillUrl, alt: shown.alt, attribution: shown.attribution, licence: shown.licence } : null,
    };
  });
}

export function facets(records: readonly PublicRecord[], index: readonly IndexEntry[]): Facets {
  const titleOf = (id: string) => String(records.find((r) => r.id === id)?.title ?? id);
  const unique = (ids: string[]): Choice[] => [...new Set(ids)].map((id) => ({ id, label: titleOf(id) })).sort(byLabel);
  return {
    cartographers: [...new Map(index.flatMap((e) => e.makers).map((m) => [m.id, { id: m.id, label: m.name }])).values()].sort(byLabel),
    regions: unique(index.flatMap((e) => e.regions)),
    rooms: unique(index.flatMap((e) => e.rooms)),
  };
}
