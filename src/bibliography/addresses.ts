import { activate, initialState } from '../atlas/view-state.js';
import { buildIndex as atlasIndex } from '../atlas/index-data.js';
import { viewUrl } from '../atlas/view-url.js';
import type { PublicRecord } from '../registry/project.js';

/*
 * Where a layer is on the site (spec 006): a layer has no page of its own, it opens in the Atlas with
 * the layer on the map. The address comes from the shared view-address module and nothing else, so an
 * "Open in Atlas" link and a citation's URL cannot differ (spec 005 FR-012).
 */
export function layerAddress(records: readonly PublicRecord[]): (slug: string) => string {
  const atlas = atlasIndex(records);
  return (slug) => viewUrl(activate(initialState(atlas), slug, atlas), atlas);
}
