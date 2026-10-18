import type { ExpressionSpecification } from 'maplibre-gl';
import type { FacetSelection } from './types.js';

/*
 * A layer's facets (spec 005 US3, FR-014): which of its features a reader's selection keeps. The
 * rule is written twice, as a test on a feature's properties (for the counts and the tests) and as
 * the map's filter expression, and a spec keeps them in step. Selections belong to one layer; this
 * module never sees another layer's.
 */
const present = (value: unknown): boolean => value !== undefined && value !== null && value !== '';

/** A selection that narrows nothing: no chosen category. */
const empty = (selection: FacetSelection): boolean => selection.kind === 'category' && selection.values.length === 0;

/** Whether a feature stays, given one layer's selections (all of them must match). */
export function matchesFacets(properties: Record<string, unknown>, selections: Readonly<Record<string, FacetSelection>>): boolean {
  return Object.entries(selections).every(([property, selection]) => {
    if (empty(selection)) return true;
    const value = properties[property];
    if (selection.kind === 'category') return present(value) && selection.values.includes(String(value));
    return typeof value === 'number' && Number.isFinite(value) && value >= selection.min && value <= selection.max;
  });
}

/** The same rule as a MapLibre filter, or null when nothing is selected. */
export function facetExpression(selections: Readonly<Record<string, FacetSelection>>): ExpressionSpecification | null {
  const parts: ExpressionSpecification[] = [];
  for (const [property, selection] of Object.entries(selections)) {
    if (empty(selection)) continue;
    if (selection.kind === 'category') {
      parts.push(['in', ['get', property], ['literal', selection.values]]);
    } else {
      const value: ExpressionSpecification = ['to-number', ['get', property], Number.NaN];
      if (Number.isFinite(selection.min)) parts.push(['>=', value, selection.min]);
      if (Number.isFinite(selection.max)) parts.push(['<=', value, selection.max]);
    }
  }
  return parts.length === 0 ? null : ['all', ...parts];
}
