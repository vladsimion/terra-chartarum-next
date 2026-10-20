import type { FacetSummary } from './build/convert-assets.js';
import { defaultYear } from './view-state.js';
import type { AtlasIndex, AtlasState, FacetSelection, Lens } from './types.js';

/*
 * The Atlas view address (spec 005 FR-012, contracts/view-address.md): the query string of /atlas/.
 * This module reads and writes it, and nothing else does; an essay's "Open in Atlas" link calls
 * `viewUrl`. Defaults are left out and the parameters come in a fixed order, so one state is always
 * one address. Nothing is read from or written to storage or cookies.
 */
export interface SlugTable {
  layers: { slug: string; history: string[] }[];
  collections: { slug: string; history: string[] }[];
}

/** What did not read as written. Each item is shown as plain text and never says whether a slug was held or never existed. */
export interface ViewReport {
  renamed: { from: string; to: string }[];
  skipped: string[];
  dropped: string[];
}

/** Shown when the Atlas is opened from the old site's address (`?from=legacy`). */
export const LEGACY_NOTICE = 'The Atlas address from the old site could not be restored, so the Atlas opened on its usual view.';

const LENSES: readonly Lens[] = ['theme', 'collection', 'room'];
const RANGE = /^(-?\d+(?:\.\d+)?)?\.\.(-?\d+(?:\.\d+)?)?$/;

// ---- writing ----

/** A value in a facet, safe against the delimiters `| ; :` and against `..` reading as a range. */
const pieceOf = (text: string): string => encodeURIComponent(text).replace(/\./g, '%2E');

/** The whole parameter value, percent-encoded once more, leaving `:` and `;` readable. */
const urlEncode = (text: string): string => encodeURIComponent(text).replace(/%3A/g, ':').replace(/%3B/g, ';');

function facetText(facets: Readonly<Record<string, FacetSelection>>): string {
  return Object.keys(facets)
    .sort()
    .flatMap((property) => {
      const selection = facets[property] as FacetSelection;
      if (selection.kind === 'category') return selection.values.length > 0 ? [`${encodeURIComponent(property)}:${selection.values.map(pieceOf).join('|')}`] : [];
      const low = Number.isFinite(selection.min) ? String(selection.min) : '';
      const high = Number.isFinite(selection.max) ? String(selection.max) : '';
      return low === '' && high === '' ? [] : [`${encodeURIComponent(property)}:${low}..${high}`];
    })
    .join(';');
}

/** The query string (no `?`) of a state: `y`, `l`, `hide`, `f`, `lens`, `c`, `rel`, then `facet.<slug>` in activation order. */
export function serialiseView(state: AtlasState, index: AtlasIndex): string {
  const parts: string[] = [];
  if (state.year !== defaultYear(index)) parts.push(`y=${state.year}`);
  if (state.active.length > 0) parts.push(`l=${state.active.map(encodeURIComponent).join(',')}`);
  const hidden = state.active.filter((slug) => state.hidden?.includes(slug));
  if (hidden.length > 0) parts.push(`hide=${hidden.map(encodeURIComponent).join(',')}`);
  if (state.focused && state.active.includes(state.focused)) parts.push(`f=${encodeURIComponent(state.focused)}`);
  if (state.lens !== 'theme') parts.push(`lens=${state.lens}`);
  if (state.lens === 'collection' && state.collection) parts.push(`c=${encodeURIComponent(state.collection)}`);
  if (state.relevantOnly) parts.push('rel=1');
  for (const slug of state.active) {
    const text = facetText(state.facets[slug] ?? {});
    if (text !== '') parts.push(`facet.${encodeURIComponent(slug)}=${urlEncode(text)}`);
  }
  return parts.join('&');
}

/** The address of a state: what "Copy this view" copies and an essay's "Open in Atlas" link points at. */
export function viewUrl(state: AtlasState, index: AtlasIndex, path = '/atlas/'): string {
  const query = serialiseView(state, index);
  return query === '' ? path : `${path}?${query}`;
}

// ---- reading ----

function resolver(entries: SlugTable['layers']) {
  const live = new Set(entries.map((e) => e.slug));
  const retired = new Map(entries.flatMap((e) => e.history.map((old) => [old, e.slug] as const)));
  return (slug: string, report: ViewReport): string | null => {
    if (live.has(slug)) return slug;
    const current = retired.get(slug);
    if (current) {
      report.renamed.push({ from: slug, to: current });
      return current;
    }
    report.skipped.push(slug);
    return null;
  };
}

/** One entry `property:value|value` or `property:min..max`; null when it does not read. */
function readFacet(entry: string): [string, FacetSelection] | null {
  const colon = entry.indexOf(':');
  if (colon <= 0) return null;
  try {
    const property = decodeURIComponent(entry.slice(0, colon));
    const rest = entry.slice(colon + 1);
    const range = RANGE.exec(rest);
    if (range) {
      if (range[1] === undefined && range[2] === undefined) return null;
      return [property, { kind: 'range', min: range[1] === undefined ? Number.NEGATIVE_INFINITY : Number(range[1]), max: range[2] === undefined ? Number.POSITIVE_INFINITY : Number(range[2]) }];
    }
    if (rest.includes('..')) return null;
    const values = rest.split('|').filter((v) => v !== '').map(decodeURIComponent);
    return values.length > 0 ? [property, { kind: 'category', values }] : null;
  } catch {
    return null;
  }
}

/** Read an address (with or without the `?`). Whatever does not resolve is left out and reported; the rest loads. */
export function parseView(search: string, index: AtlasIndex, slugs: SlugTable): { state: AtlasState; report: ViewReport } {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const report: ViewReport = { renamed: [], skipped: [], dropped: [] };
  const layer = resolver(slugs.layers);
  const collection = resolver(slugs.collections);
  const state: AtlasState = { year: defaultYear(index), lens: 'theme', active: [], relevantOnly: false, facets: {} };

  // The archive's redirect sends every old Atlas address here (spec 008 FR-018). No old parameter is
  // translated, so say so; `from` is never written back, because the address is the only saved state.
  if (params.get('from') === 'legacy') report.dropped.push(LEGACY_NOTICE);

  const year = params.get('y');
  if (year !== null) {
    if (/^-?\d+$/.test(year)) state.year = Number(year);
    else report.dropped.push('The year in the address could not be read, so the Atlas opened on its usual year.');
  }

  for (const raw of (params.get('l') ?? '').split(',').filter((s) => s !== '')) {
    const slug = layer(raw, report);
    if (slug && !state.active.includes(slug)) state.active.push(slug);
  }

  for (const raw of (params.get('hide') ?? '').split(',').filter((s) => s !== '')) {
    const slug = layer(raw, report);
    if (!slug) continue;
    if (!state.active.includes(slug)) report.dropped.push('A layer to hide in the address is not one of the layers on the map, so it was left out.');
    else if (!state.hidden?.includes(slug)) state.hidden = [...(state.hidden ?? []), slug];
  }
  if (state.hidden) state.hidden = state.active.filter((slug) => state.hidden?.includes(slug));

  const focused = params.get('f');
  if (focused) {
    const slug = layer(focused, report);
    if (slug && state.active.includes(slug)) state.focused = slug;
    else if (slug) report.dropped.push('The layer to inspect is not one of the layers on the map, so no layer is being inspected.');
  }

  const lens = params.get('lens');
  if (lens !== null) {
    if ((LENSES as readonly string[]).includes(lens)) state.lens = lens as Lens;
    else report.dropped.push('The way of browsing in the address is not one the Atlas has, so it is browsing by theme.');
  }
  const chosen = params.get('c');
  if (chosen && state.lens === 'collection') {
    const slug = collection(chosen, report);
    if (slug) state.collection = slug;
  }

  if (params.get('rel') === '1') state.relevantOnly = true;

  for (const [key, value] of params) {
    if (!key.startsWith('facet.')) continue;
    const slug = layer(key.slice('facet.'.length), report);
    if (!slug) continue;
    if (!state.active.includes(slug)) {
      report.dropped.push('A filter in the address is for a layer that is not on the map, so it was left out.');
      continue;
    }
    const selections: Record<string, FacetSelection> = {};
    for (const entry of value.split(';').filter((e) => e !== '')) {
      const read = readFacet(entry);
      if (read) selections[read[0]] = read[1];
      else report.dropped.push('A filter in the address could not be read, so it was left out.');
    }
    if (Object.keys(selections).length > 0) state.facets[slug] = selections;
  }

  return { state, report };
}

/**
 * Check facet selections against what each layer declares (the build's facet summaries). A property
 * the layer does not have, a value it does not have, or a selection of the wrong kind is dropped and
 * reported; a layer whose facets are not known loses its selections.
 */
export function resolveFacets(state: AtlasState, summaries: Readonly<Record<string, readonly FacetSummary[]>>): { state: AtlasState; dropped: string[] } {
  const dropped: string[] = [];
  const facets: AtlasState['facets'] = {};
  for (const [slug, selections] of Object.entries(state.facets)) {
    const known = summaries[slug];
    const kept: Record<string, FacetSelection> = {};
    for (const [property, selection] of Object.entries(selections)) {
      const summary = known?.find((s) => s.property === property);
      if (!summary || summary.kind !== selection.kind) {
        dropped.push('A filter in the address does not match the layer’s filters, so it was left out.');
      } else if (selection.kind === 'category' && summary.kind === 'category') {
        const values = selection.values.filter((v) => summary.values.some((s) => s.value === v));
        if (values.length < selection.values.length) dropped.push('A filter in the address names a value the layer does not have, so it was left out.');
        if (values.length > 0) kept[property] = { kind: 'category', values };
      } else {
        kept[property] = selection;
      }
    }
    if (Object.keys(kept).length > 0) facets[slug] = kept;
  }
  return { state: { ...state, facets }, dropped };
}
