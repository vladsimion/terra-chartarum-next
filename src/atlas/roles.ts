import type { FacetSelection } from './types.js';

/*
 * How a place role is drawn and said on the Atlas (spec 012 FR-005 to FR-007, contracts/
 * network-layer.md "Drawing"; ADR 0021 "no pin without its role"). Each role has its own shape;
 * an attributed production place has a dashed outline and a former holding is hollow, so none is
 * told by colour alone (ADR 0004). The legend and the facet say the same in words. Pure.
 */
export type RoleSymbol = 'made' | 'made-attributed' | 'kept' | 'formerly';

export interface RoleSymbolStyle {
  label: string;
  /** The symbol in words, for a reader who cannot see it. */
  description: string;
  shape: 'square' | 'circle';
  outline: 'solid' | 'dashed';
  filled: boolean;
}

/** The symbols, in the order the legend lists them. */
export const ROLE_SYMBOLS: Record<RoleSymbol, RoleSymbolStyle> = {
  made: { label: 'Made here', description: 'filled square', shape: 'square', outline: 'solid', filled: true },
  'made-attributed': { label: 'Made here, attributed', description: 'filled square with a dashed outline: scholars attribute it, the book does not say', shape: 'square', outline: 'dashed', filled: true },
  kept: { label: 'A copy is kept here', description: 'filled circle', shape: 'circle', outline: 'solid', filled: true },
  formerly: { label: 'Formerly kept here', description: 'hollow circle', shape: 'circle', outline: 'solid', filled: false },
};

const ORDER = Object.keys(ROLE_SYMBOLS) as RoleSymbol[];

/** The symbol of a feature with a place role, or null for one without (other layers draw as before). */
export function symbolOf(properties: Record<string, unknown>): RoleSymbol | null {
  if (properties.role === 'produced_at') return properties.basis === 'attributed' ? 'made-attributed' : 'made';
  if (properties.role === 'held_at') return properties.formerly === true ? 'formerly' : 'kept';
  return null;
}

/** The legend lines for the roles among `drawn`, and only those. */
export function roleLegend(drawn: readonly Record<string, unknown>[]): { label: string; description: string }[] {
  const present = new Set(drawn.map(symbolOf));
  return ORDER.filter((s) => present.has(s)).map((s) => ({ label: ROLE_SYMBOLS[s].label, description: ROLE_SYMBOLS[s].description }));
}

const VALUE_LABELS: Record<string, Record<string, string>> = {
  role: { produced_at: 'Made here', held_at: 'Copies kept here' },
  basis: { stated: 'Stated in the book', attributed: 'Attributed by scholarship' },
};

/** A facet value in words: the role and basis facets speak; any other value is shown as it is. */
export function roleValueLabel(property: string, value: string): string {
  return VALUE_LABELS[property]?.[value] ?? value;
}

/**
 * The selection a network layer opens with: production places only (FR-006). Read from the features
 * the map already loaded, so adding a layer still requests nothing but its own file (spec 005
 * FR-006). A place-role feature names its `edition`; another layer's own `role` property is left
 * alone. Copies are one checkbox away, labelled "Copies kept here". Null for any other layer.
 */
export function defaultRoleSelection(features: readonly Record<string, unknown>[]): Record<string, FacetSelection> | null {
  const produced = features.some((p) => p.role === 'produced_at' && typeof p.edition === 'string');
  return produced ? { role: { kind: 'category', values: ['produced_at'] } } : null;
}
