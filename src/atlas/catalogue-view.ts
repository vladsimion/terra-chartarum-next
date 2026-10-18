import { ROOM_IDS } from '../registry/families.js';
import { THEME_LABELS, THEME_VALUES } from '../registry/schemas/atlas-values.js';
import { roomLabel } from './labels.js';
import { rank } from './rank.js';
import type { AtlasIndex, AtlasState, IndexLayer } from './types.js';
import { canActivateDefaults, catalogue } from './view-state.js';

/*
 * What the catalogue lists (spec 005 US2): the layers grouped by the lens, or the ranked matches of
 * a search, narrowed by the relevance toggle. Pure, and read-only: discovery never changes the
 * active set (FR-003).
 */
export interface CatalogueGroup {
  id: string;
  heading: string;
  layers: IndexLayer[];
  /** The collection this group is, in the collection lens. */
  collection?: string;
  /** True when "activate defaults" has a layer to add. */
  canActivateDefaults: boolean;
}

export interface CatalogueView {
  mode: 'browse' | 'search';
  groups: CatalogueGroup[];
  /** Layers listed. In the room lens a layer in several rooms is counted in each; use the search or theme lens for one count per layer. */
  count: number;
}

const group = (id: string, heading: string, layers: IndexLayer[], extra: Partial<CatalogueGroup> = {}): CatalogueGroup => ({ id, heading, layers, canActivateDefaults: false, ...extra });

export function catalogueView(state: AtlasState, index: AtlasIndex, query: string): CatalogueView {
  const visible = new Set(catalogue(state, index).map((l) => l.slug));
  const layers = index.layers.filter((l) => visible.has(l.slug));

  if (query.trim() !== '') {
    const found = rank(index, query).filter((l) => visible.has(l.slug));
    return { mode: 'search', groups: [group('search', 'Search results', found)], count: found.length };
  }

  let groups: CatalogueGroup[];
  if (state.lens === 'collection') {
    const chosen = state.collection ? index.collections.filter((c) => c.slug === state.collection) : index.collections;
    groups = chosen.map((c) => group(`collection:${c.slug}`, c.title, layers.filter((l) => l.collections.includes(c.slug)), { collection: c.slug, canActivateDefaults: canActivateDefaults(c.slug, index) }));
    const loose = layers.filter((l) => l.collections.length === 0);
    if (!state.collection && loose.length > 0) groups.push(group('collection:none', 'Not in a collection', loose));
  } else if (state.lens === 'room') {
    groups = ROOM_IDS.map((room) => group(`room:${room}`, roomLabel(room), layers.filter((l) => l.rooms.includes(room)))).filter((g) => g.layers.length > 0);
    const loose = layers.filter((l) => l.rooms.length === 0);
    if (loose.length > 0) groups.push(group('room:none', 'In no room', loose));
  } else {
    groups = THEME_VALUES.map((theme) => group(`theme:${theme}`, THEME_LABELS[theme], layers.filter((l) => l.theme === theme))).filter((g) => g.layers.length > 0);
  }
  return { mode: 'browse', groups, count: groups.reduce((sum, g) => sum + g.layers.length, 0) };
}
