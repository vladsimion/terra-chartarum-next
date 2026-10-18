import { envelopeState, yearBounds, type EnvelopeState } from './time.js';
import type { AtlasIndex, AtlasState, FacetSelection, IndexLayer, Lens } from './types.js';

/*
 * The Atlas view and what changes it (spec 005 FR-003, FR-004). Typed state and pure reducers, no
 * DOM: the page keeps one of these, and the map, the lists and the address all derive from it.
 */

const envelopeOf = (layer: IndexLayer): string => `${layer.envelope.from}/${layer.envelope.to}`;
const find = (index: AtlasIndex, slug: string): IndexLayer | undefined => index.layers.find((l) => l.slug === slug);

/** The midpoint year of the layers' combined envelopes, or null when none can be read. */
function midpoint(layers: readonly IndexLayer[]): number | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const layer of layers) {
    const start = yearBounds(layer.envelope.from);
    const end = yearBounds(layer.envelope.to);
    if (start && end) {
      starts.push(start.min);
      ends.push(end.max);
    }
  }
  return starts.length === 0 ? null : Math.round((Math.min(...starts) + Math.max(...ends)) / 2);
}

/** The year the Atlas opens on (research R2): inside the first collection with defaults, else inside the catalogue, else 1000. */
export function defaultYear(index: AtlasIndex): number {
  const collection = index.collections.find((c) => c.default_layers.length > 0);
  const defaults = collection ? index.layers.filter((l) => collection.default_layers.includes(l.slug)) : [];
  return midpoint(defaults) ?? midpoint(index.layers) ?? 1000;
}

export function initialState(index: AtlasIndex): AtlasState {
  return { year: defaultYear(index), lens: 'theme', active: [], relevantOnly: false, facets: {} };
}

export function activate(state: AtlasState, slug: string, index: AtlasIndex): AtlasState {
  if (state.active.includes(slug) || !find(index, slug)) return state;
  return { ...state, active: [...state.active, slug] };
}

export function deactivate(state: AtlasState, slug: string): AtlasState {
  if (!state.active.includes(slug)) return state;
  const { [slug]: _removed, ...facets } = state.facets;
  const next: AtlasState = { ...state, active: state.active.filter((s) => s !== slug), facets };
  if (state.focused === slug) delete next.focused;
  return next;
}

/** A selection on one property of an active layer; an empty category selection clears the property. */
export function setFacet(state: AtlasState, slug: string, property: string, selection: FacetSelection): AtlasState {
  if (!state.active.includes(slug)) return state;
  if (selection.kind === 'category' && selection.values.length === 0) return clearFacet(state, slug, property);
  return { ...state, facets: { ...state.facets, [slug]: { ...state.facets[slug], [property]: selection } } };
}

export function clearFacet(state: AtlasState, slug: string, property: string): AtlasState {
  const { [property]: _removed, ...rest } = state.facets[slug] ?? {};
  const { [slug]: _layer, ...others } = state.facets;
  return { ...state, facets: Object.keys(rest).length > 0 ? { ...others, [slug]: rest } : others };
}

/** Each layer has its own reset: the others keep their selections. */
export function resetFacets(state: AtlasState, slug: string): AtlasState {
  const { [slug]: _layer, ...others } = state.facets;
  return { ...state, facets: others };
}

/** The inspector shows an active layer; focusing anything else changes nothing. */
export function focus(state: AtlasState, slug: string): AtlasState {
  return state.active.includes(slug) ? { ...state, focused: slug } : state;
}

/** Changing the year never removes a layer (FR-004): `activeLayers` marks the ones it leaves out of range. */
export function setYear(state: AtlasState, year: number): AtlasState {
  return { ...state, year };
}

/** Discovery only: the active set, the focus and the year stay as they are. */
export function setLens(state: AtlasState, lens: Lens, collection: string | undefined, index: AtlasIndex): AtlasState {
  const next: AtlasState = { ...state, lens };
  if (lens === 'collection' && collection !== undefined && index.collections.some((c) => c.slug === collection)) next.collection = collection;
  else delete next.collection;
  return next;
}

export function toggleRelevant(state: AtlasState): AtlasState {
  return { ...state, relevantOnly: !state.relevantOnly };
}

/** The layers of a collection's `default_layers` that are in the index; the action is offered only when there is one. */
function defaultsOf(collectionSlug: string, index: AtlasIndex): string[] {
  const collection = index.collections.find((c) => c.slug === collectionSlug);
  return collection ? collection.default_layers.filter((slug) => find(index, slug)) : [];
}

export const canActivateDefaults = (collectionSlug: string, index: AtlasIndex): boolean => defaultsOf(collectionSlug, index).length > 0;

/** Adds a collection's default layers after those already active; a collection is never a layer itself. */
export function activateDefaults(state: AtlasState, collectionSlug: string, index: AtlasIndex): AtlasState {
  return defaultsOf(collectionSlug, index).reduce((next, slug) => activate(next, slug, index), state);
}

export interface ActiveLayer {
  slug: string;
  layer: IndexLayer;
  range: EnvelopeState;
}

/** The active layers in activation order, each with whether the year is inside its envelope. */
export function activeLayers(state: AtlasState, index: AtlasIndex): ActiveLayer[] {
  const out: ActiveLayer[] = [];
  for (const slug of state.active) {
    const layer = find(index, slug);
    if (layer) out.push({ slug, layer, range: envelopeState(envelopeOf(layer), state.year) });
  }
  return out;
}

/** The catalogue as listed: every public layer, or with the relevance toggle on only those whose envelope covers the year. */
export function catalogue(state: AtlasState, index: AtlasIndex): IndexLayer[] {
  return state.relevantOnly ? index.layers.filter((l) => envelopeState(envelopeOf(l), state.year) === 'in_range') : index.layers;
}
