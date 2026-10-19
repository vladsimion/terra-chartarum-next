import { THEME_LABELS, THEME_VALUES } from '../registry/schemas/atlas-values.js';
import type { IndexLayer } from './types.js';

/* How a layer reads in a list: its role, or "Present-day reference" for modern reference geometry. */
const ROLE: Record<string, string> = { historical: 'Historical', context: 'Context', evidence: 'Evidence', 'map-overlay': 'Map overlay' };

export const kindOf = (layer: Pick<IndexLayer, 'provenance' | 'role'>): string => (layer.provenance === 'modern_reference' ? 'Present-day reference' : (ROLE[layer.role] ?? layer.role));

/** The theme as a reader sees it; an unknown value is shown as it is. */
export const themeLabel = (theme: string): string => ((THEME_VALUES as readonly string[]).includes(theme) ? THEME_LABELS[theme as keyof typeof THEME_LABELS] : theme);

/** A room name as a reader sees it: "map" is "Map". */
export const roomLabel = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

const TRANSFORMATION: Record<string, string> = {
  polynomial1: 'Polynomial, order 1',
  polynomial2: 'Polynomial, order 2',
  polynomial3: 'Polynomial, order 3',
  helmert: 'Helmert',
  projective: 'Projective',
  'thin-plate-spline': 'Thin-plate spline',
};

/** A georeferencing transformation as a reader sees it; an unknown value is shown as it is. */
export const transformationLabel = (value: string): string => TRANSFORMATION[value] ?? value;

/** A confidence value as a reader sees it: "probable" is "Probable". */
export const confidenceLabel = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
