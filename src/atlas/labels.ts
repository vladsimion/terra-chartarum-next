import { THEME_LABELS, THEME_VALUES } from '../registry/schemas/atlas-values.js';
import type { IndexLayer } from './types.js';

/* How a layer reads in a list: its role, or "Present-day reference" for modern reference geometry. */
const ROLE: Record<string, string> = { historical: 'Historical', context: 'Context', evidence: 'Evidence', 'map-overlay': 'Map overlay' };

export const kindOf = (layer: Pick<IndexLayer, 'provenance' | 'role'>): string => (layer.provenance === 'modern_reference' ? 'Present-day reference' : (ROLE[layer.role] ?? layer.role));

/** The theme as a reader sees it; an unknown value is shown as it is. */
export const themeLabel = (theme: string): string => ((THEME_VALUES as readonly string[]).includes(theme) ? THEME_LABELS[theme as keyof typeof THEME_LABELS] : theme);

/** A room name as a reader sees it: "map" is "Map". */
export const roomLabel = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);
