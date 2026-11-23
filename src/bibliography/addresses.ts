import { activate, activateDefaults, initialState, setLens, setYear } from '../atlas/view-state.js';
import { buildIndex as atlasIndex } from '../atlas/index-data.js';
import { viewUrl } from '../atlas/view-url.js';
import type { PublicRecord } from '../registry/project.js';
import { DERIVED_ASSETS } from '../registry/schemas/atlas-values.js';

/*
 * Where a layer is on the site (spec 006): a layer has no page of its own, it opens in the Atlas with
 * the layer on the map. The address comes from the shared view-address module and nothing else, so an
 * "Open in Atlas" link and a citation's URL cannot differ (spec 005 FR-012).
 */
export function layerAddress(records: readonly PublicRecord[]): (slug: string) => string {
  const atlas = atlasIndex(records);
  return (slug) => viewUrl(activate(initialState(atlas), slug, atlas), atlas);
}

const NETWORK_ASSET: (typeof DERIVED_ASSETS)[number] = 'derived:place-roles';
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';

/**
 * "See on the map" on an edition page (spec 012 T062, FR-014; contracts/pages.md "Edition" item 7):
 * the network collection in the Atlas, on the year the edition was made, marked at its production
 * place. Null while there is nothing public to open: no public network layer, no public collection
 * holding it, or no public production place with a location.
 */
export function editionMapLink(entry: PublicRecord, records: readonly PublicRecord[]): string | null {
  const roles = Array.isArray(entry.place_roles) ? entry.place_roles.filter(isObject) : [];
  const made = roles.find((r) => r.role === 'produced_at');
  const place = made && records.find((r) => r.id === made.place && r.family === 'place');
  if (!place || !isObject(place.location) || typeof place.slug !== 'string') return null;

  const network = records.find((r) => r.family === 'layer' && r.asset === NETWORK_ASSET);
  if (!network || typeof network.slug !== 'string') return null;
  const atlas = atlasIndex(records);
  const collection = atlas.collections.find((c) => c.members.includes(network.slug as string));
  if (!collection) return null;

  let state = setLens(initialState(atlas), 'collection', collection.slug, atlas);
  state = activateDefaults(state, collection.slug, atlas);
  if (!state.active.includes(network.slug)) state = activate(state, network.slug, atlas);
  const year = typeof made.valid_from === 'string' ? /^-?\d{4}/.exec(made.valid_from)?.[0] : undefined;
  if (year !== undefined) state = setYear(state, Number(year));
  return viewUrl({ ...state, place: place.slug }, atlas);
}
